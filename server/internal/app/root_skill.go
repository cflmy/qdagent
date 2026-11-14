package app

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// This host projects state and authenticates human responses. Stage transitions
// and the acceptance rules remain in the installed root-skill Marqdo document.
type rootRuntime struct{ store *Store }

func (r *rootRuntime) invoke(ctx context.Context, member string, c map[string]any, args map[string]any) (map[string]any, error) {
	args["context"] = c
	raw, _ := json.Marshal(args)
	command := exec.CommandContext(ctx, env("MARQDO_BIN", "marqdo"), "call", filepath.Join(r.store.root, "ext/root-skill/index.mq.md"), member, "--args-json", "-", "--effects", "plugin,fs.read,fs.write,process.exec,environment.read", "--fs-root", c["workspace"].(string), "--json")
	command.Stdin = bytes.NewReader(raw)
	command.Dir = r.store.root
	command.Env = append(os.Environ(), "MARQDO_LIB="+filepath.Join(r.store.root, "lib"), "MARQDO_EXT="+filepath.Join(r.store.root, "ext"))
	output, err := command.Output()
	if err != nil {
		return nil, errors.New("根 SKILL 调用失败，请检查已安装插件与源码诊断")
	}
	var envelope struct {
		OK     bool `json:"ok"`
		Result struct {
			OK    bool           `json:"ok"`
			Value map[string]any `json:"value"`
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		} `json:"result"`
	}
	if json.Unmarshal(output, &envelope) != nil || !envelope.OK {
		return nil, errors.New("根 SKILL 返回格式无效")
	}
	if !envelope.Result.OK {
		return nil, fmt.Errorf("%s：%s", envelope.Result.Error.Code, envelope.Result.Error.Message)
	}
	return envelope.Result.Value, nil
}
func (r *rootRuntime) snapshot(task string) (map[string]any, error) {
	if !validID(task) {
		return nil, errors.New("invalid task")
	}
	path := filepath.Join(r.store.root, "data/sessions", task, "data/dialogue/proj/root-skill.json")
	file, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer file.Close()
	var state map[string]any
	err = json.NewDecoder(io.LimitReader(file, 2<<20)).Decode(&state)
	return state, err
}
func (s *Server) workflow(w http.ResponseWriter, r *http.Request, i identity) {
	task, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	if s.supervisor.workflow == nil {
		writeError(w, 503, "workflow_unavailable", "根 SKILL 未准备好")
		return
	}
	state, err := s.supervisor.workflow.snapshot(task.ID)
	if err != nil {
		writeError(w, 500, "workflow_read", "根流程读取失败")
		return
	}
	writeJSON(w, 200, map[string]any{"workflow": state})
}
func (s *Server) respondWorkflow(w http.ResponseWriter, r *http.Request, i identity) {
	task, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	var input struct {
		Revision      int64             `json:"revision"`
		Action        string            `json:"action"`
		Answer        string            `json:"answer"`
		Choice        string            `json:"choice"`
		Concurrency   *int              `json:"concurrency"`
		ExpectedUnits *int              `json:"expected_units"`
		ChildModel    string            `json:"child_model"`
		TestModel     string            `json:"test_model"`
		UnitModels    map[string]string `json:"unit_models"`
		AcceptStubs   bool              `json:"accept_stubs"`
		Model         string            `json:"model"`
	}
	if !decode(w, r, &input) {
		return
	}
	if len(input.Answer) > 16000 || len(input.Choice) > 1000 {
		writeError(w, 400, "response_too_large", "回答过长，请分次补充")
		return
	}
	current, err := s.supervisor.workflow.snapshot(task.ID)
	if err != nil || current == nil {
		writeError(w, 409, "workflow_missing", "请先提交任务以开始意图澄清")
		return
	}
	settings, _ := current["settings"].(map[string]any)
	if settings == nil {
		settings = map[string]any{"concurrency": float64(2), "child_model": "inherit", "unit_models": map[string]any{}}
	}
	if input.Concurrency != nil {
		if *input.Concurrency < 1 || *input.Concurrency > 8 {
			writeError(w, 400, "concurrency", "并发数需在 1–8 之间")
			return
		}
		settings["concurrency"] = *input.Concurrency
	}
	if input.ExpectedUnits != nil {
		if *input.ExpectedUnits < 0 || *input.ExpectedUnits > 8 {
			writeError(w, 400, "expected_units", "业务函数数量需在 1–8 之间，0 表示不限制")
			return
		}
		settings["expected_units"] = *input.ExpectedUnits
	}
	if input.ChildModel != "" {
		settings["child_model"] = input.ChildModel
	}
	if input.TestModel != "" {
		settings["test_model"] = input.TestModel
	}
	if input.UnitModels != nil {
		known := map[string]bool{}
		if units, ok := current["units"].([]any); ok {
			for _, raw := range units {
				if unit, ok := raw.(map[string]any); ok {
					if id, ok := unit["id"].(string); ok {
						known[id] = true
					}
				}
			}
		}
		for id := range input.UnitModels {
			if !known[id] {
				writeError(w, 400, "unit_model", "模型设置包含未声明的单元")
				return
			}
		}
		settings["unit_models"] = input.UnitModels
	}
	models := []string{}
	if id, ok := settings["test_model"].(string); ok {
		models = append(models, id)
	}
	if id, ok := settings["child_model"].(string); ok {
		models = append(models, id)
	}
	switch selections := settings["unit_models"].(type) {
	case map[string]string:
		for _, id := range selections {
			models = append(models, id)
		}
	case map[string]any:
		for _, raw := range selections {
			if id, ok := raw.(string); ok {
				models = append(models, id)
			}
		}
	}
	for _, id := range models {
		if id != "" && id != "inherit" {
			if _, err = s.store.resolveModel(i.Principal, id); err != nil {
				writeError(w, 400, "child_model", "子模型不存在或不属于当前账号")
				return
			}
		}
	}
	if input.Model == "" {
		input.Model = "builtin-local"
	}
	if _, err = s.store.resolveModel(i.Principal, input.Model); err != nil {
		writeError(w, 400, "model_unavailable", "请选择当前账号可用的主模型")
		return
	}
	s.supervisor.mu.Lock()
	var active int
	s.store.db.QueryRow(`SELECT count(*) FROM qd_runs WHERE task_id=? AND status='running'`, task.ID).Scan(&active)
	if active != 0 {
		s.supervisor.mu.Unlock()
		writeError(w, 409, "workflow_busy", "请等当前动作结束后再回应")
		return
	}
	c, err := s.store.taskContext(i.Principal, task.ID)
	if err != nil {
		s.supervisor.mu.Unlock()
		writeError(w, 500, "workflow_context", "任务上下文读取失败")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 35*time.Second)
	state, err := s.supervisor.workflow.invoke(ctx, "respond", c, map[string]any{"revision": input.Revision, "action": input.Action, "answer": input.Answer, "choice": input.Choice, "settings": settings, "accept_stubs": input.AcceptStubs})
	cancel()
	s.supervisor.mu.Unlock()
	if err != nil {
		writeError(w, 409, "workflow_response", err.Error())
		return
	}
	result := map[string]any{"workflow": state}
	if state["phase"] == "complete" {
		status := "succeeded"
		if state["delivery_status"] != "accepted" {
			status = "incomplete"
		}
		_, _ = s.store.db.Exec(`UPDATE qd_runs SET status=? WHERE task_id=? AND status='waiting_user' AND id=(SELECT id FROM qd_runs WHERE task_id=? ORDER BY created_ms DESC LIMIT 1)`, status, task.ID, task.ID)
		_, _ = s.store.db.Exec(`UPDATE qd_tasks SET status=? WHERE id=?`, map[bool]string{true: "succeeded", false: "incomplete"}[state["delivery_status"] == "accepted"], task.ID)
	} else {
		text := "用户回应根流程：" + input.Action
		if input.Choice != "" {
			text += "；选择：" + input.Choice
		}
		if input.Answer != "" {
			text += "；补充：" + input.Answer
		}
		run, runErr := s.supervisor.startInternal(i.Principal, task.ID, input.Model, text, "", true)
		if runErr != nil {
			result["resume_error"] = runErr.Error()
		} else {
			result["run"] = run
		}
	}
	writeJSON(w, 200, result)
}
