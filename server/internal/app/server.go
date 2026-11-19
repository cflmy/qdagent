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
	store        *Store
	auth         *auth
	supervisor   *supervisor
	frontend     string
	revision     string
	pluginsCache pluginManifestCache
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
	return &Server{store: s, auth: a, supervisor: newSupervisor(s), frontend: frontend, revision: "qdagent-conversation-experience-0.15.1"}, nil
}
func (s *Server) Close() { s.supervisor.shutdown(); s.store.close() }
func (s *Server) Handler() http.Handler {
	m := http.NewServeMux()
	m.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]any{"ok": true, "runtime": "go", "worker": "marqdo-document", "tools": "marqdo-call", "transport": "python-wire"})
	})
	m.HandleFunc("GET /build-info", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"revision": s.revision, "frontend": "react-typescript", "server": "go", "agent": "marqdo-document", "transport": "python-wire", "execution": "marqdo-call", "browser": "chromium-isolated"})
	})
	m.HandleFunc("GET /login", s.auth.login)
	m.HandleFunc("GET /oidc/callback", s.auth.callback)
	m.HandleFunc("POST /api/logout", s.auth.protect(func(w http.ResponseWriter, r *http.Request, i identity) { s.auth.logout(w, r) }))
	m.HandleFunc("GET /api/me", s.auth.protect(s.account))
	m.HandleFunc("GET /api/admin/access", s.auth.protect(s.adminAccess))
	m.HandleFunc("PUT /api/admin/access", s.auth.protect(s.updateAccess))
	m.HandleFunc("PUT /api/admin/access/users/{account}", s.auth.protect(s.updateAccess))
	m.HandleFunc("GET /api/tasks", s.auth.protect(s.tasks))
	m.HandleFunc("POST /api/tasks", s.auth.protect(s.createTask))
	m.HandleFunc("GET /api/tasks/{id}", s.auth.protect(s.task))
	m.HandleFunc("PATCH /api/tasks/{id}", s.auth.protect(s.renameTask))
	m.HandleFunc("PATCH /api/tasks/{id}/archive", s.auth.protect(s.archiveTask))
	m.HandleFunc("DELETE /api/tasks/{id}", s.auth.protect(s.deleteTask))
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
	m.HandleFunc("GET /api/knowledge/reference", s.auth.protect(s.knowledgeReference))
	m.HandleFunc("POST /api/tasks/{id}/knowledge/prepare", s.auth.protect(s.prepareKnowledge))
	m.HandleFunc("POST /api/tasks/{id}/knowledge/publish", s.auth.protect(s.publishKnowledge))
	m.HandleFunc("GET /api/knowledge/{knowledge}/contract", s.auth.protect(s.knowledgeContract))
	m.HandleFunc("GET /api/knowledge/{knowledge}/source", s.auth.protect(s.knowledgeSource))
	m.HandleFunc("GET /api/knowledge/{knowledge}/document", s.auth.protect(s.knowledgeDocument))
	m.HandleFunc("POST /api/knowledge/{knowledge}/verify", s.auth.protect(s.verifyKnowledge))
	m.HandleFunc("POST /api/knowledge/{knowledge}/execute", s.auth.protect(s.executeKnowledge))
	m.HandleFunc("GET /api/tasks/{id}/workflow", s.auth.protect(s.workflow))
	m.HandleFunc("POST /api/tasks/{id}/workflow/respond", s.auth.protect(s.respondWorkflow))
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
					// Opaque-origin preview frames may fetch public build assets only.
					w.Header().Set("Access-Control-Allow-Origin", "*")
				}
				if p == "file-viewer.html" {
					// The preview frame is sandboxed without allow-same-origin, so its
					// document origin is opaque and "self" matches nothing. Name this
					// host explicitly so the PDF worker script can still be loaded and
					// instantiated from inside the isolated document.
					host := r.Host
					if host == "" || strings.ContainsAny(host, " ;'\"") {
						host = "127.0.0.1"
					}
					scheme := "http"
					if r.TLS != nil {
						scheme = "https"
					}
					self := scheme + "://" + host
					w.Header().Set("Content-Security-Policy", "default-src 'none'; script-src 'self' blob: "+self+"; style-src 'self' 'unsafe-inline'; img-src data: blob:; media-src blob:; font-src data: blob:; connect-src 'self' blob: "+self+"; worker-src 'self' blob: "+self+"; frame-src blob:; form-action 'none'; base-uri 'none'")
					w.Header().Set("Cache-Control", "no-cache")
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
	v, e := s.store.archivedTasks(i.Principal, r.URL.Query().Get("archived") == "1")
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
		if errors.Is(e, errTaskLimit) {
			writeError(w, 409, "task_limit_reached", e.Error())
			return
		}
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
	s.supervisor.mu.Lock()
	defer s.supervisor.mu.Unlock()
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
	if t.Archived != 0 {
		writeError(w, 409, "task_archived", "任务已归档，请恢复后修改")
		return
	}
	v.Title = strings.TrimSpace(v.Title)
	if v.Title == "" || len([]rune(v.Title)) > 120 {
		writeError(w, 400, "invalid_title", "请输入 1–120 字的名称")
		return
	}
	if _, e := s.store.db.Exec(`UPDATE qd_tasks SET title=? WHERE id=? AND owner=? AND archived_ms=0 AND deleted_ms=0`, v.Title, t.ID, i.Principal); e != nil {
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
		if errors.Is(e, errSmartLimit) {
			writeError(w, 429, "model_quota_exceeded", e.Error())
			return
		}
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
	usage, e := s.store.accountUsage(i.Principal)
	if e != nil {
		writeError(w, 503, "usage_unavailable", "暂时无法读取模型额度")
		return
	}
	writeJSON(w, 200, map[string]any{"models": models, "default_model": preferred, "usage": usage})
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
func (s *Server) pluginCatalog(owner string) ([]map[string]any, error) {
	standard := []string{}
	if entries, e := os.ReadDir(filepath.Join(s.store.root, "lib")); e == nil {
		for _, f := range entries {
			if strings.HasSuffix(f.Name(), ".mq.md") && !f.IsDir() {
				standard = append(standard, f.Name())
			}
		}
	}
	out := []map[string]any{{"id": "stdlib", "name": "标准库", "description": "文件、数组、文本、数据与 Marqdo 运行基础能力", "version": "CLI 内建", "builtin": true, "enabled": true, "available": true, "modules": standard}}
	defs, e := s.installedPlugins()
	if e != nil {
		return nil, e
	}
	vb, _ := os.ReadFile(filepath.Join(s.store.root, "ext/VERSION"))
	version := strings.TrimSpace(string(vb))
	for _, d := range defs {
		path := filepath.Join(s.store.root, "ext/native", d.ABI)
		if d.ABI == "" {
			path = filepath.Join(s.store.root, d.Entry)
		}
		_, err := os.Stat(path)
		if err == nil {
			_, err = os.Stat(filepath.Join(s.store.root, d.Entry))
		}
		v := version
		if b, e := os.ReadFile(filepath.Join(s.store.root, "ext", d.ID, "VERSION")); e == nil {
			v = strings.TrimSpace(string(b))
		}
		out = append(out, map[string]any{"id": d.ID, "name": d.Name, "description": d.Description, "version": v, "builtin": false, "enabled": s.store.pluginEnabled(owner, d.ID), "available": err == nil})
	}
	return out, nil
}
func (s *Server) plugins(w http.ResponseWriter, r *http.Request, i identity) {
	items, err := s.pluginCatalog(i.Principal)
	if err != nil {
		writeError(w, 503, "plugin_manifest_unavailable", "插件安装文稿暂时无法读取，请重试")
		return
	}
	writeJSON(w, 200, map[string]any{"plugins": items})
}
func (s *Server) togglePlugin(w http.ResponseWriter, r *http.Request, i identity) {
	id := r.PathValue("id")
	var v struct {
		Enabled bool `json:"enabled"`
	}
	if !decode(w, r, &v) {
		return
	}
	if id == "stdlib" {
		writeError(w, 400, "builtin_required", "标准库始终启用")
		return
	}
	items, err := s.pluginCatalog(i.Principal)
	if err != nil {
		writeError(w, 503, "plugin_manifest_unavailable", "插件安装文稿暂时无法读取，请重试")
		return
	}
	found := false
	for _, p := range items {
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
	out := []map[string]any{}
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
			out = append(out, map[string]any{"id": filepath.ToSlash(rel), "name": strings.TrimSuffix(d.Name(), ".md"), "status": "reference"})
		}
		return nil
	})

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	compiled, err := s.knowledgeCall(ctx, "list", s.knowledgeContext(i), map[string]any{})
	if err != nil {
		writeError(w, 503, "knowledge_unavailable", "知识服务暂时无法加载，请重试")
		return
	}
	if entries, ok := compiled.([]any); ok {
		for _, entry := range entries {
			if item, ok := entry.(map[string]any); ok {
				out = append(out, item)
			}
		}
	}
	drafts := []map[string]any{}
	tasks, _ := s.store.tasks(i.Principal)
	for _, task := range tasks {
		var compilation map[string]any
		readBoundedJSON(filepath.Join(s.workspace(task), ".agent/knowledge-compilation.json"), &compilation)
		if compilation == nil {
			continue
		}
		phase := "intent"
		document := "solution/plan.mq.md"
		if s.supervisor.workflow != nil {
			state, _ := s.supervisor.workflow.snapshot(task.ID)
			if p, ok := state["phase"].(string); ok {
				phase = p
			}
			if phase == "review" || phase == "complete" {
				document = "solution/index.mq.md"
				if delivery, ok := state["delivery"].(map[string]any); ok {
					if path, ok := delivery["path"].(string); ok && path != "" {
						document = path
					}
				}
			}
		}
		if manageRole(s.store.accountRole(i.Principal)) {
			drafts = append(drafts, map[string]any{"task": task.ID, "title": compilation["title"], "phase": phase, "document": document})
		}
	}
	writeJSON(w, 200, map[string]any{"sources": out, "compilations": drafts, "can_manage": manageRole(s.store.accountRole(i.Principal)), "visibility": "public"})
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
	var artifacts any
	readBoundedJSON(filepath.Join(root, ".agent/artifacts.json"), &artifacts)
	visibleOffice, officeRoots := officeFileVisibility(artifacts)
	_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, e error) error {
		if e != nil {
			return nil
		}
		rel, _ := filepath.Rel(root, path)
		if rel != "." && d.IsDir() && strings.HasPrefix(d.Name(), ".") {
			return fs.SkipDir
		}
		if hiddenOfficePart(filepath.ToSlash(rel), d.IsDir(), visibleOffice, officeRoots) {
			if d.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		if len(out) >= 500 {
			return fs.SkipAll
		}
		if !d.IsDir() && d.Type()&os.ModeSymlink == 0 {
			info, e := d.Info()
			if e == nil {
				out = append(out, map[string]any{"path": filepath.ToSlash(rel), "name": readableFileName(filepath.ToSlash(rel)), "size": info.Size(), "modified_ms": info.ModTime().UnixMilli()})
			}
		}
		return nil
	})
	var plan any
	var children []map[string]any
	readBoundedJSON(filepath.Join(root, ".agent/children.json"), &children)
	readBoundedJSON(filepath.Join(root, ".agent/plan.json"), &plan)
	var workflow map[string]any
	if s.supervisor.workflow != nil {
		workflow, _ = s.supervisor.workflow.snapshot(t.ID)
	}
	names := recordedFileNames(workflow, artifacts)
	for _, file := range out {
		if path, ok := file["path"].(string); ok {
			if name := names[path]; name != "" {
				file["name"] = name
			}
		}
	}
	writeJSON(w, 200, map[string]any{"files": out, "plan": plan, "artifacts": artifacts, "children": children, "workflow": workflow})
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
	textual := strings.HasSuffix(path, ".md") || strings.HasSuffix(path, ".txt") || strings.HasSuffix(path, ".json")
	if !textual {
		writeJSON(w, 200, map[string]string{"kind": "binary", "filename": path, "source": "", "title": filepath.Base(path)})
		return
	}
	previewLimit := 524288
	if strings.HasSuffix(path, ".mq.md") {
		previewLimit = 1 << 20
	}
	b, e := io.ReadAll(io.LimitReader(f, int64(previewLimit+1)))
	if e == nil && len(b) > previewLimit && !strings.HasSuffix(path, ".mq.md") {
		writeJSON(w, 200, map[string]string{"kind": "binary", "filename": path, "source": "", "title": filepath.Base(path)})
		return
	}
	if e != nil || len(b) > previewLimit {
		writeError(w, 413, "preview_too_large", "文件过大，请下载查看")
		return
	}
	if strings.HasSuffix(path, ".mq.md") {
		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()
		raw, e := s.marqdo(ctx, "pages/agent/previews.mq.md", "show", s.workspace(t), map[string]string{"path": path}, "plugin,fs.read,fs.write,process.exec,random.read,environment.read")
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
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": s.downloadFileName(t, path)}))
	w.Header().Set("Content-Type", "application/octet-stream")
	if r.URL.Query().Get("inline") == "1" {
		var sample [512]byte
		n, _ := f.Read(sample[:])
		_, _ = f.Seek(0, 0)
		kind := http.DetectContentType(sample[:n])
		if kind == "image/png" || kind == "image/jpeg" || kind == "image/webp" {
			w.Header().Set("Content-Type", kind)
			w.Header().Set("Content-Disposition", "inline")
		}
	}
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}
func (s *Server) upload(w http.ResponseWriter, r *http.Request, i identity) {
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	if t.Archived != 0 {
		writeError(w, 409, "task_archived", "任务已归档，请恢复后上传文件")
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
	s.supervisor.mu.Lock()
	defer s.supervisor.mu.Unlock()
	latest, stateErr := s.store.task(i.Principal, t.ID)
	if stateErr != nil || latest.Archived != 0 {
		writeError(w, 409, "task_archived", "任务已归档，请恢复后上传文件")
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
