package app

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

type Run struct {
	ID       string `json:"id"`
	Task     string `json:"task_id"`
	Model    string `json:"model"`
	Status   string `json:"status"`
	Answer   string `json:"answer"`
	Question string `json:"question"`
	Created  int64  `json:"created_ms"`
}
type Event struct {
	Seq     int64           `json:"seq"`
	Run     string          `json:"run_id"`
	Kind    string          `json:"kind"`
	Data    json.RawMessage `json:"data"`
	Created int64           `json:"created_ms"`
}
type supervisor struct {
	store   *Store
	mu      sync.Mutex
	active  map[string]context.CancelFunc
	closing bool
	wg      sync.WaitGroup
}

func newSupervisor(s *Store) *supervisor {
	return &supervisor{store: s, active: map[string]context.CancelFunc{}}
}
func (s *Store) run(owner, id string) (Run, error) {
	var r Run
	err := s.db.QueryRow(`SELECT id,task_id,model,status,answer,question,created_ms FROM qd_runs WHERE id=? AND owner=?`, id, owner).Scan(&r.ID, &r.Task, &r.Model, &r.Status, &r.Answer, &r.Question, &r.Created)
	return r, err
}
func (s *Store) runEvents(id string, after int64) ([]Event, error) {
	rows, err := s.db.Query(`SELECT seq,run_id,kind,payload,created_ms FROM qd_run_events WHERE run_id=? AND seq>? ORDER BY seq LIMIT 256`, id, after)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Event{}
	for rows.Next() {
		var e Event
		var raw string
		if err = rows.Scan(&e.Seq, &e.Run, &e.Kind, &raw, &e.Created); err != nil {
			return nil, err
		}
		e.Data = json.RawMessage(raw)
		out = append(out, e)
	}
	return out, rows.Err()
}
func (s *Store) appendEvent(run, kind string, data any) error {
	b, err := json.Marshal(data)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(`INSERT INTO qd_run_events(run_id,kind,payload,created_ms) VALUES(?,?,?,?)`, run, kind, string(b), nowMS())
	return err
}
func (s *supervisor) start(owner, task, model, question, knowledge string) (Run, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closing || len(s.active) >= 8 {
		return Run{}, errors.New("当前任务较多，请稍后重试")
	}
	if !s.store.pluginEnabled(owner, "ai") {
		return Run{}, errors.New("请先启用模型与智能体插件")
	}
	ctxMap, err := s.store.taskContext(owner, task)
	if err != nil {
		return Run{}, err
	}
	config, err := s.store.resolveModel(owner, model)
	if err != nil {
		return Run{}, err
	}
	tx, err := s.store.db.Begin()
	if err != nil {
		return Run{}, err
	}
	defer tx.Rollback()
	var turn int
	if err = tx.QueryRow(`SELECT COALESCE(MAX(turn),0)+1 FROM qd_messages WHERE task_id=?`, task).Scan(&turn); err != nil {
		return Run{}, err
	}
	r := Run{ID: randomID(), Task: task, Model: model, Status: "running", Question: question, Created: nowMS()}
	if _, err = tx.Exec(`INSERT INTO qd_runs(id,task_id,owner,model,status,question,created_ms,turn) VALUES(?,?,?,?,?,?,?,?)`, r.ID, task, owner, model, r.Status, question, r.Created, turn); err != nil {
		return Run{}, errors.New("此任务已有运行中的请求，请停止或新建任务")
	}
	if _, err = tx.Exec(`INSERT INTO qd_messages(task_id,turn,question,answer) VALUES(?,?,?,'')`, task, turn, question); err != nil {
		return Run{}, err
	}
	if _, err = tx.Exec(`UPDATE qd_tasks SET status='running' WHERE id=?`, task); err != nil {
		return Run{}, err
	}
	if err = tx.Commit(); err != nil {
		return Run{}, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	s.active[r.ID] = cancel
	s.wg.Add(1)
	go s.execute(ctx, cancel, r, owner, turn, ctxMap, config, knowledge)
	return r, nil
}
func (s *supervisor) execute(ctx context.Context, cancel context.CancelFunc, r Run, owner string, turn int, c map[string]any, config map[string]any, knowledge string) {
	defer s.wg.Done()
	defer cancel()
	defer func() { s.mu.Lock(); delete(s.active, r.ID); s.mu.Unlock() }()
	_ = s.store.appendEvent(r.ID, "status", map[string]string{"status": "running", "message": "已建立独立任务进程"})
	history := []map[string]string{}
	rows, err := s.store.db.Query(`SELECT question,answer FROM qd_messages WHERE task_id=? AND turn<? ORDER BY turn DESC LIMIT 20`, r.Task, turn)
	if err == nil {
		for rows.Next() {
			var q, a string
			if rows.Scan(&q, &a) == nil {
				history = append(history, map[string]string{"question": q, "answer": a})
			}
		}
		rows.Close()
	}
	c["model_selection"] = r.Model
	c["model"] = r.Model
	c["run_id"] = r.ID
	payload := map[string]any{"run_id": r.ID, "task_id": r.Task, "question": r.Question, "owner": owner, "context": c, "model": config, "history": history, "knowledge": knowledge}
	b, _ := json.Marshal(payload)
	cmd := exec.CommandContext(ctx, env("QDAGENT_PYTHON", "python3"), filepath.Join(s.store.root, "worker/agent.py"))
	cmd.Dir = s.store.root
	cmd.Stdin = bytes.NewReader(b)
	cmd.Env = append(os.Environ(), "PYTHONUNBUFFERED=1", "MARQDO_LIB="+filepath.Join(s.store.root, "lib"), "MARQDO_EXT="+filepath.Join(s.store.root, "ext"))
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		if cmd.Process != nil {
			return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		}
		return nil
	}
	cmd.WaitDelay = 3 * time.Second
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		s.finish(r, turn, "failed", "无法启动执行进程")
		return
	}
	cmd.Stderr = &boundedLog{}
	if err = cmd.Start(); err != nil {
		s.finish(r, turn, "failed", "Python 执行环境暂不可用")
		return
	}
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 4096), 2<<20)
	answer, status := "", "failed"
	seenFinal := false
	for scanner.Scan() {
		var e struct {
			Kind string         `json:"kind"`
			Data map[string]any `json:"data"`
		}
		if json.Unmarshal(scanner.Bytes(), &e) != nil || e.Kind == "" {
			continue
		}
		if e.Kind == "error" {
			if message, ok := e.Data["message"].(string); ok && strings.Contains(message, "预算已用尽") {
				_, _ = s.store.db.Exec(`INSERT INTO qd_model_health(id,notice,updated_ms) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET notice=excluded.notice,updated_ms=excluded.updated_ms`, r.Model, "服务预算已用尽，请联系服务管理员或选择其他模型。", nowMS())
			}
		}
		if e.Kind == "model_end" && e.Data["status"] == "succeeded" {
			_, _ = s.store.db.Exec(`DELETE FROM qd_model_health WHERE id=?`, r.Model)
		}
		if e.Kind == "text_delta" {
			if delta, ok := e.Data["text"].(string); ok && len(answer)+len(delta) <= 512<<10 {
				answer += delta
				_, _ = s.store.db.Exec(`UPDATE qd_runs SET answer=? WHERE id=?`, answer, r.ID)
			}
		}
		if e.Kind == "final" {
			if a, ok := e.Data["answer"].(string); ok {
				answer = a
			}
			if st, ok := e.Data["status"].(string); ok && (st == "succeeded" || st == "answer_only" || st == "incomplete" || st == "failed") {
				status = st
				seenFinal = true
			}
		}
		if err = s.store.appendEvent(r.ID, e.Kind, e.Data); err != nil {
			cancel()
			break
		}
	}
	scanErr := scanner.Err()
	waitErr := cmd.Wait()
	if ctx.Err() != nil {
		status = "cancelled"
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			status = "interrupted"
		}
		_ = s.store.appendEvent(r.ID, "notice", map[string]string{"message": "任务进程已停止；已产生的工具效果和文件保留。"})
	} else if scanErr != nil || !seenFinal || (waitErr != nil && status != "failed") {
		status = "failed"
		_ = s.store.appendEvent(r.ID, "error", map[string]string{"message": "执行进程提前结束，请查看已记录的工具结果。"})
	}
	s.finish(r, turn, status, answer)
}
func (s *supervisor) finish(r Run, turn int, status, answer string) {
	tx, err := s.store.db.Begin()
	if err != nil {
		return
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE qd_runs SET status=?,answer=?,finished_ms=? WHERE id=?`, status, answer, nowMS(), r.ID); err != nil {
		return
	}
	if _, err = tx.Exec(`UPDATE qd_messages SET answer=? WHERE task_id=? AND turn=?`, answer, r.Task, turn); err != nil {
		return
	}
	if _, err = tx.Exec(`UPDATE qd_tasks SET status=? WHERE id=?`, status, r.Task); err != nil {
		return
	}
	if tx.Commit() == nil {
		_ = s.store.appendEvent(r.ID, "status", map[string]string{"status": status})
	}
}
func (s *supervisor) stop(id string) {
	s.mu.Lock()
	cancel := s.active[id]
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}
func (s *supervisor) shutdown() {
	s.mu.Lock()
	s.closing = true
	for _, cancel := range s.active {
		cancel()
	}
	s.mu.Unlock()
	s.wg.Wait()
}

type boundedLog struct{}

func (*boundedLog) Write(b []byte) (int, error) { return len(b), nil } // Provider/worker stderr can contain secrets; never publish it.
func (s *Server) stream(w http.ResponseWriter, r *http.Request, i identity) {
	id := r.PathValue("id")
	if _, err := s.store.run(i.Principal, id); err != nil {
		writeError(w, 404, "run_not_found", "任务不存在")
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, 500, "stream_unavailable", "当前服务不支持事件流")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("X-Accel-Buffering", "no")
	w.Header().Set("Connection", "keep-alive")
	after, _ := strconv.ParseInt(r.URL.Query().Get("after"), 10, 64)
	if v, _ := strconv.ParseInt(r.Header.Get("Last-Event-ID"), 10, 64); v > after {
		after = v
	}
	fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()
	tick := time.NewTicker(150 * time.Millisecond)
	defer tick.Stop()
	ping := time.NewTicker(15 * time.Second)
	defer ping.Stop()
	for {
		events, err := s.store.runEvents(id, after)
		if err != nil {
			return
		}
		for _, e := range events {
			b, _ := json.Marshal(e)
			fmt.Fprintf(w, "id: %d\nevent: update\ndata: %s\n\n", e.Seq, b)
			after = e.Seq
		}
		if len(events) > 0 {
			flusher.Flush()
		}
		run, err := s.store.run(i.Principal, id)
		if err != nil {
			return
		}
		if run.Status != "running" && len(events) < 256 {
			terminal, _ := json.Marshal(map[string]string{"status": run.Status, "answer": run.Answer})
			fmt.Fprintf(w, "event: complete\ndata: %s\n\n", terminal)
			flusher.Flush()
			return
		}
		select {
		case <-r.Context().Done():
			return
		case <-tick.C:
		case <-ping.C:
			fmt.Fprint(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}
func (s *Server) marqdo(ctx context.Context, file, fn, root string, args any, effects string) (json.RawMessage, error) {
	b, _ := json.Marshal(args)
	cmd := exec.CommandContext(ctx, env("MARQDO_BIN", "marqdo"), "call", filepath.Join(s.store.root, file), fn, "--args-json", "-", "--effects", effects, "--fs-root", root, "--json")
	cmd.Stdin = bytes.NewReader(b)
	cmd.Dir = s.store.root
	cmd.Env = append(os.Environ(), "MARQDO_LIB="+filepath.Join(s.store.root, "lib"), "MARQDO_EXT="+filepath.Join(s.store.root, "ext"))
	out, err := cmd.Output()
	if err != nil {
		return nil, errors.New("Marqdo 调用失败，请检查已安装插件")
	}
	var envelope struct {
		OK     bool            `json:"ok"`
		Result json.RawMessage `json:"result"`
	}
	if json.Unmarshal(out, &envelope) != nil || !envelope.OK {
		return nil, errors.New("Marqdo 未返回有效结果")
	}
	return envelope.Result, nil
}
