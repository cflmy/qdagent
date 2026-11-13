package app

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Server struct {
	store      *Store
	auth       *auth
	supervisor *supervisor
	frontend   string
	revision   string
}

func New(root, frontend string) (*Server, error) {
	root, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	s, err := openStore(root)
	if err != nil {
		return nil, err
	}
	a, err := newAuth(s)
	if err != nil {
		s.close()
		return nil, err
	}
	return &Server{s, a, newSupervisor(s), frontend, "qdagent-react-go-0.4.1"}, nil
}
func (s *Server) Close() { s.supervisor.shutdown(); s.store.close() }
func (s *Server) Handler() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"ok": true, "runtime": "go", "worker": "python", "tools": "marqdo-call"})
	})
	m.HandleFunc("GET /build-info", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"revision": s.revision, "frontend": "react-typescript", "server": "go", "agent": "python"})
	})
	m.HandleFunc("GET /login", s.auth.login)
	m.HandleFunc("GET /oidc/callback", s.auth.callback)
	m.HandleFunc("POST /api/logout", s.auth.protect(func(w http.ResponseWriter, r *http.Request, i identity) { s.auth.logout(w, r) }))
	m.HandleFunc("GET /api/me", s.auth.protect(func(w http.ResponseWriter, r *http.Request, i identity) {
		writeJSON(w, 200, map[string]string{"name": i.Name})
	}))
	m.HandleFunc("GET /api/tasks", s.auth.protect(s.tasks))
	m.HandleFunc("POST /api/tasks", s.auth.protect(s.createTask))
	m.HandleFunc("GET /api/tasks/{id}", s.auth.protect(s.task))
	m.HandleFunc("PATCH /api/tasks/{id}", s.auth.protect(s.renameTask))
	m.HandleFunc("POST /api/tasks/{id}/runs", s.auth.protect(s.startRun))
	m.HandleFunc("GET /api/runs/{id}", s.auth.protect(s.getRun))
	m.HandleFunc("GET /api/runs/{id}/events", s.auth.protect(s.stream))
	m.HandleFunc("POST /api/runs/{id}/stop", s.auth.protect(s.stopRun))
	m.HandleFunc("GET /api/models", s.auth.protect(s.models))
	m.HandleFunc("POST /api/models", s.auth.protect(s.saveModel))
	m.HandleFunc("DELETE /api/models/{id}", s.auth.protect(s.deleteModel))
	m.HandleFunc("GET /api/plugins", s.auth.protect(s.plugins))
	m.HandleFunc("PATCH /api/plugins/{id}", s.auth.protect(s.togglePlugin))
	m.HandleFunc("GET /api/knowledge", s.auth.protect(s.knowledge))
	m.HandleFunc("GET /api/tasks/{id}/files", s.auth.protect(s.files))
	m.HandleFunc("GET /api/tasks/{id}/preview", s.auth.protect(s.preview))
	m.HandleFunc("GET /api/tasks/{id}/download", s.auth.protect(s.download))
	m.HandleFunc("POST /api/tasks/{id}/uploads", s.auth.protect(s.upload))
	m.Handle("/reader-assets/", http.StripPrefix("/reader-assets/", http.FileServer(http.Dir(filepath.Join(s.store.root, "pages/public/generated")))))
	m.HandleFunc("GET /favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/svg+xml")
		http.ServeFile(w, r, filepath.Join(s.frontend, "favicon.svg"))
	})
	m.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" && r.Method != "HEAD" {
			writeError(w, 405, "method_not_allowed", "不支持此操作")
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/") {
			writeError(w, 404, "route_not_found", "接口不存在")
			return
		}
		p := strings.TrimPrefix(r.URL.Path, "/")
		if p != "" && fs.ValidPath(p) {
			if info, e := os.Stat(filepath.Join(s.frontend, p)); e == nil && !info.IsDir() {
				if strings.HasPrefix(p, "assets/") {
					w.Header().Set("Cache-Control", "public,max-age=31536000,immutable")
				}
				http.ServeFile(w, r, filepath.Join(s.frontend, p))
				return
			}
		}
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, filepath.Join(s.frontend, "index.html"))
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "same-origin")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		defer func() {
			if recover() != nil {
				log.Print("request handler recovered")
				writeError(w, 500, "internal_error", "服务遇到错误，请重试")
			}
		}()
		m.ServeHTTP(w, r)
	})
}
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if d.Decode(v) != nil {
		writeError(w, 400, "invalid_json", "请求格式或字段无效")
		return false
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		writeError(w, 400, "invalid_json", "请求只能包含一个对象")
		return false
	}
	return true
}
func (s *Server) tasks(w http.ResponseWriter, r *http.Request, i identity) {
	v, e := s.store.tasks(i.Principal)
	if e != nil {
		writeError(w, 500, "database_error", "任务目录读取失败")
		return
	}
	writeJSON(w, 200, map[string]any{"tasks": v})
}
func (s *Server) createTask(w http.ResponseWriter, r *http.Request, i identity) {
	var v struct {
		Title string `json:"title"`
	}
	if !decode(w, r, &v) {
		return
	}
	t, e := s.store.createTask(i.Principal, v.Title)
	if e != nil {
		writeError(w, 400, "create_task_failed", "任务创建失败，请稍后重试")
		return
	}
	writeJSON(w, 201, t)
}
func (s *Server) owned(w http.ResponseWriter, r *http.Request, i identity) (Task, bool) {
	t, e := s.store.task(i.Principal, r.PathValue("id"))
	if e != nil {
		writeError(w, 404, "task_not_found", "任务不存在或不属于当前账号")
		return t, false
	}
	return t, true
}
func (s *Server) task(w http.ResponseWriter, r *http.Request, i identity) {
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	rows, e := s.store.db.Query(`SELECT m.turn,m.question,m.answer,COALESCE(r.id,''),COALESCE(r.status,'succeeded') FROM qd_messages m LEFT JOIN qd_runs r ON r.task_id=m.task_id AND r.turn=m.turn WHERE m.task_id=? ORDER BY m.turn`, t.ID)
	if e != nil {
		writeError(w, 500, "database_error", "历史读取失败")
		return
	}
	defer rows.Close()
	messages := []map[string]any{}
	for rows.Next() {
		var turn int
		var q, a, id, status string
		if rows.Scan(&turn, &q, &a, &id, &status) == nil {
			messages = append(messages, map[string]any{"turn": turn, "question": q, "answer": a, "run_id": id, "status": status})
		}
	}
	writeJSON(w, 200, map[string]any{"task": t, "messages": messages})
}
func (s *Server) renameTask(w http.ResponseWriter, r *http.Request, i identity) {
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	var v struct {
		Title string `json:"title"`
	}
	if !decode(w, r, &v) {
		return
	}
	v.Title = strings.TrimSpace(v.Title)
	if v.Title == "" || len([]rune(v.Title)) > 120 {
		writeError(w, 400, "invalid_title", "请输入 1–120 字的名称")
		return
	}
	if _, e := s.store.db.Exec(`UPDATE qd_tasks SET title=? WHERE id=? AND owner=?`, v.Title, t.ID, i.Principal); e != nil {
		writeError(w, 500, "database_error", "名称保存失败")
		return
	}
	t.Title = v.Title
	writeJSON(w, 200, t)
}
func (s *Server) startRun(w http.ResponseWriter, r *http.Request, i identity) {
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	var v struct {
		Question  string `json:"question"`
		Model     string `json:"model"`
		Knowledge string `json:"knowledge"`
	}
	if !decode(w, r, &v) {
		return
	}
	v.Question = strings.TrimSpace(v.Question)
	if v.Question == "" || len(v.Question) > 64000 {
		writeError(w, 400, "invalid_question", "请输入任务，最多 64000 字节")
		return
	}
	if v.Knowledge != "" && !fs.ValidPath(v.Knowledge) {
		writeError(w, 400, "invalid_knowledge", "知识来源无效")
		return
	}
	run, e := s.supervisor.start(i.Principal, t.ID, v.Model, v.Question, v.Knowledge)
	if e != nil {
		writeError(w, 409, "run_rejected", e.Error())
		return
	}
	writeJSON(w, 202, run)
}
func (s *Server) getRun(w http.ResponseWriter, r *http.Request, i identity) {
	run, e := s.store.run(i.Principal, r.PathValue("id"))
	if e != nil {
		writeError(w, 404, "run_not_found", "任务不存在")
		return
	}
	events, e := s.store.runEvents(run.ID, 0)
	if e != nil {
		writeError(w, 500, "database_error", "事件读取失败")
		return
	}
	writeJSON(w, 200, map[string]any{"run": run, "events": events})
}
func (s *Server) stopRun(w http.ResponseWriter, r *http.Request, i identity) {
	run, e := s.store.run(i.Principal, r.PathValue("id"))
	if e != nil {
		writeError(w, 404, "run_not_found", "任务不存在")
		return
	}
	s.supervisor.stop(run.ID)
	writeJSON(w, 202, map[string]bool{"ok": true})
}
func (s *Server) models(w http.ResponseWriter, r *http.Request, i identity) {
	models, e := s.store.models(i.Principal)
	if e != nil {
		writeError(w, 500, "database_error", "模型目录读取失败")
		return
	}
	preferred := ""
	if len(models) > 0 {
		preferred = models[0].ID
		for _, m := range models {
			if m.Notice == "" {
				preferred = m.ID
				break
			}
		}
	}
	if wanted := os.Getenv("QDAGENT_DEFAULT_MODEL"); wanted != "" {
		for _, m := range models {
			if m.ID == wanted && m.Notice == "" {
				preferred = wanted
				break
			}
		}
	}
	writeJSON(w, 200, map[string]any{"models": models, "default_model": preferred})
}
func validEndpoint(raw string) bool {
	u, e := url.Parse(raw)
	return e == nil && u.Scheme == "https" && u.Hostname() != "" && u.User == nil && u.RawQuery == "" && u.Fragment == "" && (u.Port() == "" || u.Port() == "443") && !strings.ContainsAny(raw, "\r\n\t ")
}
func (s *Server) saveModel(w http.ResponseWriter, r *http.Request, i identity) {
	var v struct {
		Label    string `json:"label"`
		Protocol string `json:"protocol"`
		Model    string `json:"model"`
		Endpoint string `json:"endpoint"`
		APIKey   string `json:"api_key"`
		Thinking bool   `json:"thinking"`
	}
	if !decode(w, r, &v) {
		return
	}
	v.Label = strings.TrimSpace(v.Label)
	v.Model = strings.TrimSpace(v.Model)
	v.Endpoint = strings.TrimRight(strings.TrimSpace(v.Endpoint), "/")
	if v.Label == "" || len(v.Label) > 240 || v.Model == "" || len(v.Model) > 200 || len(v.APIKey) > 8192 || strings.ContainsAny(v.APIKey, "\r\n") || (v.Protocol != "openai" && v.Protocol != "ollama" && v.Protocol != "local") {
		writeError(w, 400, "invalid_model", "请填写有效名称、模型与协议")
		return
	}
	if v.Protocol == "local" {
		if v.Endpoint != "" || v.APIKey != "" {
			writeError(w, 400, "invalid_model", "本机模型复用管理员服务地址，请留空地址和密钥")
			return
		}
	} else if !validEndpoint(v.Endpoint) {
		writeError(w, 400, "invalid_endpoint", "远程模型必须使用公开 HTTPS 地址")
		return
	}
	id := "custom-" + randomID()
	credential := ""
	if v.APIKey != "" {
		key, e := s.store.masterKey()
		if e != nil {
			writeError(w, 503, "encryption_unavailable", "模型加密密钥暂不可用")
			return
		}
		credential, e = modelCrypt(key, v.APIKey, i.Principal, id, true)
		if e != nil {
			writeError(w, 500, "encryption_error", "模型凭据保存失败")
			return
		}
	}
	_, e := s.store.db.Exec(`INSERT INTO qd_model_profiles(id,owner,label,protocol,model,endpoint,credential,thinking) VALUES(?,?,?,?,?,?,?,?)`, id, i.Principal, v.Label, v.Protocol, v.Model, v.Endpoint, credential, v.Thinking)
	if e != nil {
		writeError(w, 500, "database_error", "模型保存失败")
		return
	}
	writeJSON(w, 201, map[string]string{"id": id})
}
func (s *Server) deleteModel(w http.ResponseWriter, r *http.Request, i identity) {
	id := r.PathValue("id")
	if !strings.HasPrefix(id, "custom-") {
		writeError(w, 400, "builtin_model", "共享模型不能删除")
		return
	}
	res, e := s.store.db.Exec(`DELETE FROM qd_model_profiles WHERE id=? AND owner=?`, id, i.Principal)
	if e != nil {
		writeError(w, 500, "database_error", "删除失败")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeError(w, 404, "model_not_found", "模型不存在")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
func (s *Server) pluginCatalog(owner string) []map[string]any {
	standard := []string{}
	if entries, e := os.ReadDir(filepath.Join(s.store.root, "lib")); e == nil {
		for _, f := range entries {
			if strings.HasSuffix(f.Name(), ".mq.md") && !f.IsDir() {
				standard = append(standard, f.Name())
			}
		}
	}
	out := []map[string]any{{"id": "stdlib", "name": "标准库", "description": "文件、数组、文本、数据与 Marqdo 运行基础能力", "version": "CLI 内建", "builtin": true, "enabled": true, "available": true, "modules": standard}}
	defs := [][4]string{{"ai", "模型与智能体", "模型决策、子任务与可追溯执行", "libagent.so"}, {"web", "网页与阅读渲染", "官方 View 与文档组件", "libweb.so"}, {"net", "网络与实时连接", "HTTP 读取与网络能力", "libweb.so"}, {"data", "数据与存储", "SQLite 与数据处理", "libweb.so"}, {"security", "身份与权限", "身份与安全工具", "libweb.so"}, {"quantum", "量子计算", "量子线路与模拟", "libquantum.so"}, {"linalg", "线性代数", "矩阵与线性运算", "liblinalg.so"}, {"engineering", "工程工具", "构建与工程能力", "libengineering.so"}, {"qdagent", "任务运行与持久流", "工具收据与进程适配", "libqdagent_transport.so"}, {"office", "办公文档与演示", "生成可编辑文档、PPT 与源稿", ""}}
	vb, _ := os.ReadFile(filepath.Join(s.store.root, "ext/VERSION"))
	version := strings.TrimSpace(string(vb))
	for _, d := range defs {
		path := filepath.Join(s.store.root, "ext/native", d[3])
		if d[3] == "" {
			path = filepath.Join(s.store.root, "ext", d[0], "index.mq.md")
		}
		_, err := os.Stat(path)
		v := version
		if b, e := os.ReadFile(filepath.Join(s.store.root, "ext", d[0], "VERSION")); e == nil {
			v = strings.TrimSpace(string(b))
		}
		out = append(out, map[string]any{"id": d[0], "name": d[1], "description": d[2], "version": v, "builtin": false, "enabled": s.store.pluginEnabled(owner, d[0]), "available": err == nil})
	}
	return out
}
func (s *Server) plugins(w http.ResponseWriter, r *http.Request, i identity) {
	writeJSON(w, 200, map[string]any{"plugins": s.pluginCatalog(i.Principal)})
}
func (s *Server) togglePlugin(w http.ResponseWriter, r *http.Request, i identity) {
	id := r.PathValue("id")
	var v struct {
		Enabled bool `json:"enabled"`
	}
	if !decode(w, r, &v) {
		return
	}
	found := false
	for _, p := range s.pluginCatalog(i.Principal) {
		if p["id"] == id {
			if p["builtin"] == true {
				writeError(w, 400, "builtin_required", "标准库始终启用")
				return
			}
			found = true
		}
	}
	if !found {
		writeError(w, 404, "plugin_not_found", "插件未登记")
		return
	}
	if _, e := s.store.db.Exec(`INSERT INTO qd_plugins(owner,id,enabled) VALUES(?,?,?) ON CONFLICT(owner,id) DO UPDATE SET enabled=excluded.enabled`, i.Principal, id, v.Enabled); e != nil {
		writeError(w, 500, "database_error", "插件设置保存失败")
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}
func (s *Server) knowledge(w http.ResponseWriter, r *http.Request, i identity) {
	out := []map[string]string{}
	root := filepath.Join(s.store.root, "kb")
	_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, e error) error {
		if e != nil {
			return nil
		}
		if len(out) >= 100 {
			return fs.SkipAll
		}
		if !d.IsDir() && d.Type()&os.ModeSymlink == 0 && strings.HasSuffix(d.Name(), ".md") {
			rel, _ := filepath.Rel(root, path)
			out = append(out, map[string]string{"id": filepath.ToSlash(rel), "name": strings.TrimSuffix(d.Name(), ".md")})
		}
		return nil
	})
	writeJSON(w, 200, map[string]any{"sources": out})
}
func (s *Server) workspace(t Task) string {
	return filepath.Join(s.store.root, "data/workspaces", t.ID)
}
func (s *Server) files(w http.ResponseWriter, r *http.Request, i identity) {
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	root := s.workspace(t)
	out := []map[string]any{}
	_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, e error) error {
		if e != nil {
			return nil
		}
		rel, _ := filepath.Rel(root, path)
		if rel != "." && d.IsDir() && strings.HasPrefix(d.Name(), ".") {
			return fs.SkipDir
		}
		if len(out) >= 500 {
			return fs.SkipAll
		}
		if !d.IsDir() && d.Type()&os.ModeSymlink == 0 {
			info, e := d.Info()
			if e == nil {
				out = append(out, map[string]any{"path": filepath.ToSlash(rel), "name": d.Name(), "size": info.Size(), "modified_ms": info.ModTime().UnixMilli()})
			}
		}
		return nil
	})
	var plan any
	var artifacts any
	var children []map[string]any
	readBoundedJSON(filepath.Join(root, ".agent/children.json"), &children)
	readBoundedJSON(filepath.Join(root, ".agent/plan.json"), &plan)
	readBoundedJSON(filepath.Join(root, ".agent/artifacts.json"), &artifacts)
	writeJSON(w, 200, map[string]any{"files": out, "plan": plan, "artifacts": artifacts, "children": children})
}
func readBoundedJSON(path string, v any) {
	f, e := os.Open(path)
	if e == nil {
		defer f.Close()
		_ = json.NewDecoder(io.LimitReader(f, 2<<20)).Decode(v)
	}
}
func safeOpen(root, rel string) (*os.File, error) {
	if !fs.ValidPath(rel) || strings.HasPrefix(rel, ".agent/") {
		return nil, errors.New("无效文件路径")
	}
	dir, e := os.OpenRoot(root)
	if e != nil {
		return nil, e
	}
	defer dir.Close()
	f, e := dir.Open(rel)
	if e != nil {
		return nil, e
	}
	info, e := f.Stat()
	if e != nil || !info.Mode().IsRegular() {
		f.Close()
		return nil, errors.New("不是普通文件")
	}
	return f, nil
}

// Internal agent state stays private. Only an exact registered child deliverable
// can be opened from .agent/children/, and os.Root still confines the final file.
func registeredOpen(root, rel string) (*os.File, error) {
	if !strings.HasPrefix(rel, ".agent/") {
		return safeOpen(root, rel)
	}
	if !strings.HasPrefix(rel, ".agent/children/") || !fs.ValidPath(rel) {
		return nil, errors.New("内部材料不可直接读取")
	}
	var manifest []struct {
		Path   string `json:"path"`
		Source string `json:"source"`
	}
	readBoundedJSON(filepath.Join(root, ".agent/artifacts.json"), &manifest)
	for _, entry := range manifest {
		if rel == entry.Path || rel == entry.Source {
			dir, e := os.OpenRoot(root)
			if e != nil {
				return nil, e
			}
			defer dir.Close()
			f, e := dir.Open(rel)
			if e != nil {
				return nil, e
			}
			info, e := f.Stat()
			if e != nil || !info.Mode().IsRegular() {
				f.Close()
				return nil, errors.New("交付文件不可读取")
			}
			return f, nil
		}
	}
	return nil, errors.New("该内部文件没有登记为交付产物")
}

func (s *Server) preview(w http.ResponseWriter, r *http.Request, i identity) {
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	path := r.URL.Query().Get("path")
	f, e := registeredOpen(s.workspace(t), path)
	if e != nil {
		writeError(w, 404, "file_not_found", "文件不存在或不可读取")
		return
	}
	defer f.Close()
	b, e := io.ReadAll(io.LimitReader(f, 524289))
	if e != nil || len(b) > 524288 {
		writeError(w, 413, "preview_too_large", "文件过大，请下载查看")
		return
	}
	if strings.HasSuffix(path, ".mq.md") {
		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()
		raw, e := s.marqdo(ctx, "pages/agent/previews.mq.md", "show", s.workspace(t), map[string]string{"path": path}, "plugin,fs.read,fs.write,process.exec,random.read")
		if e != nil {
			writeError(w, 422, "view_error", "Marqdo View 暂时无法解析此文件，可下载源码查看")
			return
		}
		var v map[string]any
		if json.Unmarshal(raw, &v) != nil {
			writeError(w, 502, "view_error", "阅读器返回格式无效")
			return
		}
		writeJSON(w, 200, v)
		return
	}
	if !strings.HasSuffix(path, ".md") && !strings.HasSuffix(path, ".txt") && !strings.HasSuffix(path, ".json") && !strings.HasSuffix(path, ".csv") {
		writeJSON(w, 200, map[string]string{"kind": "binary", "filename": path, "source": "", "title": filepath.Base(path)})
		return
	}
	writeJSON(w, 200, map[string]string{"kind": "markdown", "filename": path, "source": string(b), "title": filepath.Base(path)})
}
func (s *Server) download(w http.ResponseWriter, r *http.Request, i identity) {
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	path := r.URL.Query().Get("path")
	f, e := registeredOpen(s.workspace(t), path)
	if e != nil {
		writeError(w, 404, "file_not_found", "文件不存在")
		return
	}
	defer f.Close()
	info, _ := f.Stat()
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": filepath.Base(path)}))
	w.Header().Set("Content-Type", "application/octet-stream")
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}
func (s *Server) upload(w http.ResponseWriter, r *http.Request, i identity) {
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 52<<20)
	if e := r.ParseMultipartForm(1 << 20); e != nil {
		writeError(w, 413, "upload_too_large", "单文件上限为 50 MB")
		return
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}
	in, header, e := r.FormFile("file")
	if e != nil {
		writeError(w, 400, "missing_file", "请选择文件")
		return
	}
	defer in.Close()
	if header.Size > 50<<20 {
		writeError(w, 413, "upload_too_large", "单文件上限为 50 MB")
		return
	}
	name := filepath.Base(strings.ReplaceAll(header.Filename, "\\", "/"))
	if name == "." || name == ".." || name == "" || len(name) > 200 || strings.ContainsAny(name, "\x00\r\n") {
		writeError(w, 400, "invalid_filename", "文件名无效")
		return
	}
	rel := "uploads/" + randomID()[:12] + "-" + name
	root := s.workspace(t)
	if e = os.MkdirAll(filepath.Join(root, "uploads"), 0700); e != nil {
		writeError(w, 500, "upload_failed", "无法保存文件")
		return
	}
	dir, e := os.OpenRoot(root)
	if e != nil {
		writeError(w, 500, "upload_failed", "工作区不可用")
		return
	}
	defer dir.Close()
	out, e := dir.OpenFile(rel, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if e != nil {
		writeError(w, 500, "upload_failed", "无法保存文件")
		return
	}
	n, e := io.Copy(out, io.LimitReader(in, (50<<20)+1))
	closeErr := out.Close()
	if e != nil || closeErr != nil || n > 50<<20 {
		_ = dir.Remove(rel)
		writeError(w, 413, "upload_failed", "文件保存失败或超过上限")
		return
	}
	writeJSON(w, 201, map[string]any{"path": rel, "name": name, "size": n})
}
