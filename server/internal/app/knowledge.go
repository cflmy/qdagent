package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func (s *Server) knowledgeCall(ctx context.Context, fn string, c map[string]any, args map[string]any) (any, error) {
	args["context"] = c
	root, _ := c["workspace"].(string)
	raw, err := s.marqdo(ctx, "ext/knowledge/index.mq.md", fn, root, args, "plugin,fs.read,fs.write,process.exec,environment.read,random.read")
	if err != nil {
		return nil, err
	}
	var result struct {
		OK    bool `json:"ok"`
		Value any  `json:"value"`
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if json.Unmarshal(raw, &result) != nil {
		return nil, errors.New("知识编译返回无效结果")
	}
	if !result.OK {
		return nil, fmt.Errorf("%s：%s", result.Error.Code, result.Error.Message)
	}
	return result.Value, nil
}
func (s *Server) knowledgeContext(i identity) map[string]any {
	return map[string]any{"owner": i.Principal, "admin_role": s.store.accountRole(i.Principal), "knowledge_scope": publicKnowledgeScope, "project": s.store.root, "workspace": filepath.Join(s.store.root, "data"), "id": "knowledge"}
}
func (s *Server) prepareKnowledge(w http.ResponseWriter, r *http.Request, i identity) {
	if !s.requireManager(w, i) {
		return
	}
	if !s.store.pluginEnabled(i.Principal, "knowledge") {
		writeError(w, 403, "plugin_disabled", "知识编译插件已停用")
		return
	}
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	if t.Archived != 0 {
		writeError(w, 409, "task_archived", "请先恢复任务")
		return
	}
	var input struct {
		Title string   `json:"title"`
		Paths []string `json:"paths"`
	}
	if !decode(w, r, &input) {
		return
	}
	var active int
	s.store.db.QueryRow(`SELECT count(*) FROM qd_runs WHERE task_id=? AND status='running'`, t.ID).Scan(&active)
	if active > 0 {
		writeError(w, 409, "task_running", "任务正在执行，请完成当前步骤后继续")
		return
	}
	c, err := s.store.taskContext(i.Principal, t.ID)
	if err != nil {
		writeError(w, 500, "knowledge_context", err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 100*time.Second)
	defer cancel()
	value, err := s.knowledgeCall(ctx, "prepare", c, map[string]any{"title": input.Title, "paths": input.Paths})
	if err != nil {
		writeError(w, 422, "knowledge_prepare", err.Error())
		return
	}
	writeJSON(w, 200, value)
}
func (s *Server) publishKnowledge(w http.ResponseWriter, r *http.Request, i identity) {
	if !s.requireManager(w, i) {
		return
	}
	if !s.store.pluginEnabled(i.Principal, "knowledge") {
		writeError(w, 403, "plugin_disabled", "知识编译插件已停用")
		return
	}
	t, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	if t.Archived != 0 {
		writeError(w, 409, "task_archived", "请先恢复任务")
		return
	}
	c, err := s.store.taskContext(i.Principal, t.ID)
	if err != nil {
		writeError(w, 500, "knowledge_context", err.Error())
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 100*time.Second)
	defer cancel()
	value, err := s.knowledgeCall(ctx, "publish", c, map[string]any{})
	if err != nil {
		writeError(w, 422, "knowledge_publish", err.Error())
		return
	}
	writeJSON(w, 200, value)
}
func (s *Server) knowledgeDocument(w http.ResponseWriter, r *http.Request, i identity) {
	ctx, cancel := context.WithTimeout(r.Context(), 35*time.Second)
	defer cancel()
	raw, err := s.knowledgeCall(ctx, "document", s.knowledgeContext(i), map[string]any{"id": r.PathValue("knowledge")})
	if err != nil {
		writeError(w, 404, "knowledge_missing", "知识不存在、内容已变化或不属于当前账号")
		return
	}
	v, ok := raw.(map[string]any)
	if !ok {
		writeError(w, 500, "knowledge_read", "无法读取知识文稿")
		return
	}
	if r.URL.Query().Get("view") == "1" {
		root, _ := v["root"].(string)
		path := "index.mq.md"
		if r.URL.Query().Get("related") == "decisions.mq.md" {
			if !s.requireManager(w, i) {
				return
			}
			path = "decisions.mq.md"
		}
		out, e := s.marqdo(ctx, "pages/agent/previews.mq.md", "show", root, map[string]string{"path": path}, "plugin,fs.read,fs.write,process.exec,random.read,environment.read")
		if e != nil {
			writeError(w, 422, "view_error", "Marqdo View 暂时无法渲染，可阅读源码")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(out)
		return
	}
	delete(v, "root")
	writeJSON(w, 200, v)
}
func (s *Server) executeKnowledge(w http.ResponseWriter, r *http.Request, i identity) {
	if !s.store.pluginEnabled(i.Principal, "knowledge") {
		writeError(w, 403, "plugin_disabled", "知识编译插件已停用")
		return
	}
	var input struct {
		Function  string `json:"function"`
		Input     any    `json:"input"`
		WriteBack bool   `json:"write_back"`
	}
	if !decode(w, r, &input) {
		return
	}
	if input.WriteBack && !s.requireManager(w, i) {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	value, err := s.knowledgeCall(ctx, "execute", s.knowledgeContext(i), map[string]any{"id": r.PathValue("knowledge"), "function": input.Function, "input": input.Input, "write_back": input.WriteBack})
	if err != nil {
		writeError(w, 422, "knowledge_execution", err.Error())
		return
	}
	writeJSON(w, 200, value)
}

func (s *Server) knowledgeContract(w http.ResponseWriter, r *http.Request, i identity) {
	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	value, err := s.knowledgeCall(ctx, "contract", s.knowledgeContext(i), map[string]any{"id": r.PathValue("knowledge"), "function": r.URL.Query().Get("function")})
	if err != nil {
		writeError(w, 404, "knowledge_contract", "函数契约不存在或不属于当前账号")
		return
	}
	writeJSON(w, 200, value)
}

func (s *Server) knowledgeSource(w http.ResponseWriter, r *http.Request, i identity) {
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	raw, err := s.knowledgeCall(ctx, "document", s.knowledgeContext(i), map[string]any{"id": r.PathValue("knowledge")})
	if err != nil {
		writeError(w, 404, "knowledge_missing", "知识不存在或不属于当前账号")
		return
	}
	value, _ := raw.(map[string]any)
	record, _ := value["record"].(map[string]any)
	sources, _ := record["sources"].([]any)
	index, e := strconv.Atoi(r.URL.Query().Get("index"))
	if e != nil || index < 0 || index >= len(sources) {
		writeError(w, 404, "source_missing", "来源不存在")
		return
	}
	source, _ := sources[index].(map[string]any)
	rel, _ := source["path"].(string)
	root, _ := value["root"].(string)
	f, e := safeOpen(root, rel)
	if e != nil {
		writeError(w, 404, "source_missing", "来源不可读取")
		return
	}
	defer f.Close()
	info, e := f.Stat()
	if e != nil || info.Size() > 50<<20 {
		writeError(w, 413, "source_large", "来源超出上限")
		return
	}
	hash := sha256.New()
	if _, e = io.Copy(hash, f); e != nil || hex.EncodeToString(hash.Sum(nil)) != source["sha256"] {
		writeError(w, 409, "source_changed", "来源摘要已变化")
		return
	}
	f.Seek(0, 0)
	contentType := mime.TypeByExtension(filepath.Ext(rel))
	if contentType == "" {
		contentType = "text/plain; charset=utf-8"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "sandbox; default-src 'none'")
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": readableFileName(rel)}))
	http.ServeContent(w, r, readableFileName(rel), info.ModTime(), f)
}

func (s *Server) verifyKnowledge(w http.ResponseWriter, r *http.Request, i identity) {
	if !s.store.pluginEnabled(i.Principal, "knowledge") {
		writeError(w, 403, "plugin_disabled", "知识插件已停用")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()
	value, err := s.knowledgeCall(ctx, "verify", s.knowledgeContext(i), map[string]any{"id": r.PathValue("knowledge")})
	if err != nil {
		writeError(w, 422, "knowledge_verify", err.Error())
		return
	}
	writeJSON(w, 200, value)
}

// Installed reference documents are readable separately from compiled private knowledge.
func (s *Server) knowledgeReference(w http.ResponseWriter, r *http.Request, i identity) {
	rel := r.URL.Query().Get("path")
	if !fs.ValidPath(rel) || !strings.HasSuffix(rel, ".md") {
		writeError(w, 404, "knowledge_missing", "参考文稿不存在")
		return
	}
	root := filepath.Join(s.store.root, "kb")
	dir, err := os.OpenRoot(root)
	if err != nil {
		writeError(w, 404, "knowledge_missing", "参考文稿不存在")
		return
	}
	defer dir.Close()
	f, err := dir.Open(rel)
	if err != nil {
		writeError(w, 404, "knowledge_missing", "参考文稿不存在")
		return
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil || !info.Mode().IsRegular() || info.Size() > 1<<20 {
		writeError(w, 404, "knowledge_missing", "参考文稿不可读取")
		return
	}
	source, err := io.ReadAll(io.LimitReader(f, (1<<20)+1))
	if err != nil || len(source) > 1<<20 {
		writeError(w, 413, "knowledge_large", "参考文稿超过阅读上限")
		return
	}
	if r.URL.Query().Get("view") == "1" {
		ctx, cancel := context.WithTimeout(r.Context(), 35*time.Second)
		defer cancel()
		cache := filepath.Join(s.store.root, "data", "tmp")
		if e := os.MkdirAll(cache, 0700); e != nil {
			writeError(w, 500, "view_error", "无法准备只读阅读")
			return
		}
		isolated, e := os.MkdirTemp(cache, "reference-view-")
		if e != nil {
			writeError(w, 500, "view_error", "无法准备只读阅读")
			return
		}
		defer os.RemoveAll(isolated)
		name := filepath.Base(rel)
		if e = os.WriteFile(filepath.Join(isolated, name), source, 0600); e != nil {
			writeError(w, 500, "view_error", "无法准备只读阅读")
			return
		}
		out, e := s.marqdo(ctx, "pages/agent/previews.mq.md", "show", isolated, map[string]string{"path": name}, "plugin,fs.read,fs.write,process.exec,random.read,environment.read")
		if e != nil {
			writeError(w, 422, "view_error", "参考文稿暂时无法渲染")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(out)
		return
	}
	writeJSON(w, 200, map[string]any{"source": string(source), "record": map[string]any{
		"id": rel, "name": strings.TrimSuffix(filepath.Base(rel), ".md"), "status": "reference",
	}})
}
