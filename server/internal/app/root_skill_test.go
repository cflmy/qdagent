package app

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestRootHTTPHumanAuthorityModelsAndPluginGate(t *testing.T) {
	if _, err := exec.LookPath("marqdo"); err != nil {
		t.Skip("requires installed Marqdo and root ABI")
	}
	project, err := filepath.Abs("../../..")
	if err != nil {
		t.Fatal(err)
	}
	s := testServer(t)
	realMarqdo, _ := exec.LookPath("marqdo")
	quoted, _ := json.Marshal(realMarqdo)
	fixture := filepath.Join(s.store.root, "native-root-fixture")
	program := "#!/usr/bin/env python3\nimport json,os,sys\nif len(sys.argv)>3 and sys.argv[3]=='run':\n json.load(sys.stdin)\n print(json.dumps({'ok':True,'result':{'answer':'测试专用等待状态','status':'waiting_user'}}),flush=True)\nelse: os.execv(" + string(quoted) + ",[" + string(quoted) + "]+sys.argv[1:])\n"
	os.WriteFile(fixture, []byte(program), 0700)
	t.Setenv("MARQDO_BIN", fixture)
	if err = os.RemoveAll(filepath.Join(s.store.root, "ext")); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"ext", "lib", "pages"} {
		if err = os.Symlink(filepath.Join(project, name), filepath.Join(s.store.root, name)); err != nil {
			t.Fatal(err)
		}
	}
	s.supervisor.workflow = &rootRuntime{store: s.store}
	task, err := s.store.createTask("test-owner", "根 SKILL HTTP 验收")
	if err != nil {
		t.Fatal(err)
	}
	c, err := s.store.taskContext("test-owner", task.ID)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if _, err = s.supervisor.workflow.invoke(ctx, "state.mq.md", "begin", c, map[string]any{"user_input": "测试真实用户确认", "message_id": "http-input"}); err != nil {
		t.Fatal(err)
	}
	state, err := s.supervisor.workflow.invoke(ctx, "intent.mq.md", "clarify_intent", c, map[string]any{"summary": "用户确认工程范围", "question": "采用哪种交付？", "choices": []string{"可运行文稿", "补充需求"}})
	if err != nil {
		t.Fatal(err)
	}
	payload := func(model string, concurrency int) string {
		raw, _ := json.Marshal(map[string]any{"revision": state["revision"], "action": "confirm_intent", "choice": "可运行文稿", "model": model, "concurrency": concurrency, "child_model": "inherit"})
		return string(raw)
	}
	path := "/api/tasks/" + task.ID + "/workflow/respond"
	s.auth.dev = "another-owner"
	if got := request(s, http.MethodPost, path, payload("builtin-local", 2)); got.Code != 404 {
		t.Fatal("another owner approved task", got.Code)
	}
	s.auth.dev = "test-owner"
	if got := request(s, http.MethodPost, path, payload("private-model-not-owned", 2)); got.Code != 400 {
		t.Fatal("unowned model accepted", got.Code, got.Body.String())
	}
	if got := request(s, http.MethodPost, path, payload("builtin-local", 9)); got.Code != 400 {
		t.Fatal("unbounded concurrency accepted", got.Code)
	}
	got := request(s, http.MethodPost, path, payload("builtin-local", 2))
	if got.Code != 200 {
		t.Fatal(got.Code, got.Body.String())
	}
	latest, err := s.supervisor.workflow.snapshot(task.ID)
	if err != nil || latest["phase"] != "outline" {
		t.Fatal("human response did not advance", latest, err)
	}
	if got = request(s, http.MethodPost, path, payload("builtin-local", 2)); got.Code != 409 {
		t.Fatal("replayed human response accepted", got.Code, got.Body.String())
	}
	free, err := s.store.createTask("test-owner", "根 SKILL 自由输入验收")
	if err != nil {
		t.Fatal(err)
	}
	fc, err := s.store.taskContext("test-owner", free.ID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.supervisor.workflow.invoke(ctx, "state.mq.md", "begin", fc, map[string]any{"user_input": "自由输入链路", "message_id": "http-free"}); err != nil {
		t.Fatal(err)
	}
	fstate, err := s.supervisor.workflow.invoke(ctx, "intent.mq.md", "clarify_intent", fc, map[string]any{"summary": "自由输入链路", "question": "补充什么细节？", "choices": []string{"先给提纲", "直接成文"}})
	if err != nil {
		t.Fatal(err)
	}
	freePath := "/api/tasks/" + free.ID + "/workflow/respond"
	freeBody, _ := json.Marshal(map[string]any{"revision": fstate["revision"], "action": "answer", "answer": "面向工程用户，兼顾普通读者"})
	if got := request(s, http.MethodPost, freePath, string(freeBody)); got.Code != 200 {
		t.Fatal("free-form answer rejected", got.Code, got.Body.String())
	}
	after, err := s.supervisor.workflow.snapshot(free.ID)
	if err != nil || after["phase"] != "intent" {
		t.Fatal("free answer must not advance the phase", after, err)
	}
	history, _ := after["history"].([]any)
	last, _ := history[len(history)-1].(map[string]any)
	if last["text"] != "面向工程用户，兼顾普通读者" || last["actor"] != "user" {
		t.Fatal("free answer not recorded verbatim", last)
	}
	reread, err := s.supervisor.workflow.snapshot(free.ID)
	if err != nil || reread["revision"] != after["revision"] {
		t.Fatal("refresh must read the same committed revision", reread, err)
	}
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		s.supervisor.mu.Lock()
		active := len(s.supervisor.active)
		s.supervisor.mu.Unlock()
		if active == 0 {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	_, err = s.store.db.Exec(`INSERT INTO qd_plugins(owner,id,enabled) VALUES('test-owner','root-skill',0)`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.supervisor.start("test-owner", task.ID, "builtin-local", "继续", ""); err == nil {
		t.Fatal("disabled root skill bypassed mandatory workflow")
	}
}

func TestRootHTTPStubDisclosureAndPartialAcceptance(t *testing.T) {
	if _, err := exec.LookPath("marqdo"); err != nil {
		t.Skip("requires installed Marqdo and root ABI")
	}
	project, err := filepath.Abs("../../..")
	if err != nil {
		t.Fatal(err)
	}
	s := testServer(t)
	if err = os.RemoveAll(filepath.Join(s.store.root, "ext")); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"ext", "lib", "pages"} {
		if err = os.Symlink(filepath.Join(project, name), filepath.Join(s.store.root, name)); err != nil {
			t.Fatal(err)
		}
	}
	s.supervisor.workflow = &rootRuntime{store: s.store}
	task, err := s.store.createTask("test-owner", "未接通项验收")
	if err != nil {
		t.Fatal(err)
	}
	c, err := s.store.taskContext("test-owner", task.ID)
	if err != nil {
		t.Fatal(err)
	}
	workspace := c["workspace"].(string)
	if err = os.MkdirAll(filepath.Join(workspace, "solution"), 0700); err != nil {
		t.Fatal(err)
	}
	deliveryText := "# 交付\n\n已实现的正文示例。\n"
	if err = os.WriteFile(filepath.Join(workspace, "solution/index.mq.md"), []byte(deliveryText), 0600); err != nil {
		t.Fatal(err)
	}
	unitText := "unit-1-body"
	if err = os.WriteFile(filepath.Join(workspace, "solution/unit-1.txt"), []byte(unitText), 0600); err != nil {
		t.Fatal(err)
	}
	sum := func(text string) string {
		h := sha256.Sum256([]byte(text))
		return hex.EncodeToString(h[:])
	}
	suiteSum := sum("frozen-suite")
	state := map[string]any{
		"revision": 7, "phase": "review", "title": "未接通项验收", "goal": "披露未接通项",
		"intent_confirmed": true, "outline_confirmed": true,
		"units": []any{map[string]any{
			"id": 1, "title": "正文单元", "mode": "document", "status": "ready",
			"path": "solution/unit-1.txt", "sha256": sum(unitText),
			"tests": map[string]any{"sha256": suiteSum, "suite": map[string]any{"kind": "cases"}},
			"trial": map[string]any{"passed": true, "assurance": "independent_cases", "suite_sha256": suiteSum},
		}},
		"delivery": map[string]any{"path": "solution/index.mq.md", "check": map[string]any{
			"ok": true, "value": map[string]any{"sha256": sum(deliveryText), "dependencies": nil}}},
		"pending": map[string]any{"kind": "review", "stubs": []any{map[string]any{"label": "未接通：设备实验"}}},
		"history": []any{},
	}
	raw, _ := json.Marshal(state)
	if err = os.WriteFile(filepath.Join(c["root"].(string), "data/dialogue/proj/root-skill.json"), raw, 0600); err != nil {
		t.Fatal(err)
	}
	path := "/api/tasks/" + task.ID + "/workflow/respond"
	withoutStubs, _ := json.Marshal(map[string]any{"revision": 7, "action": "accept"})
	got := request(s, http.MethodPost, path, string(withoutStubs))
	if got.Code == 200 {
		t.Fatal("acceptance must not silently swallow disclosed stubs")
	}
	after, err := s.supervisor.workflow.snapshot(task.ID)
	if err != nil || after["phase"] != "review" {
		t.Fatal("failed acceptance must keep the review phase", after, err)
	}
	withStubs, _ := json.Marshal(map[string]any{"revision": 7, "action": "accept", "accept_stubs": true})
	got = request(s, http.MethodPost, path, string(withStubs))
	if got.Code != 200 {
		t.Fatal(got.Code, got.Body.String())
	}
	final, err := s.supervisor.workflow.snapshot(task.ID)
	if err != nil || final["phase"] != "complete" || final["delivery_status"] != "partial" {
		t.Fatal("accepted-stubs delivery must be recorded as partial", final, err)
	}
	stored, err := s.store.task("test-owner", task.ID)
	if err != nil {
		t.Fatal(err)
	}
	if stored.Status != "incomplete" {
		t.Fatal("partial delivery must not be reported as a full success", stored.Status)
	}
}

func TestEmptyInputNeverStartsARun(t *testing.T) {
	s := testServer(t)
	task, err := s.store.createTask("test-owner", "空输入")
	if err != nil {
		t.Fatal(err)
	}
	path := "/api/tasks/" + task.ID + "/runs"
	for _, body := range []string{`{"question":""}`, `{"question":"   "}`, `{"question":"` + strings.Repeat("目", 70000) + `"}`} {
		got := request(s, http.MethodPost, path, body)
		if got.Code != 400 || !strings.Contains(got.Body.String(), "invalid_question") {
			t.Fatal("empty or oversized input must be rejected before any run starts", got.Code, got.Body.String())
		}
	}
	var runs int
	if err = s.store.db.QueryRow(`SELECT count(*) FROM qd_runs WHERE task_id=?`, task.ID).Scan(&runs); err != nil {
		t.Fatal(err)
	}
	if runs != 0 {
		t.Fatal("rejected input must not create a run row", runs)
	}
}

func TestInvalidSkillCallRejectedBeforeExecution(t *testing.T) {
	if _, err := exec.LookPath("marqdo"); err != nil {
		t.Skip("requires installed Marqdo and root ABI")
	}
	project, err := filepath.Abs("../../..")
	if err != nil {
		t.Fatal(err)
	}
	s := testServer(t)
	if err = os.RemoveAll(filepath.Join(s.store.root, "ext")); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"ext", "lib", "pages"} {
		if err = os.Symlink(filepath.Join(project, name), filepath.Join(s.store.root, name)); err != nil {
			t.Fatal(err)
		}
	}
	task, err := s.store.createTask("test-owner", "无效调用校验")
	if err != nil {
		t.Fatal(err)
	}
	c, err := s.store.taskContext("test-owner", task.ID)
	if err != nil {
		t.Fatal(err)
	}
	runID := "run-invalid-call"
	c["run_id"] = runID
	c["role"] = "writer"
	dir := filepath.Join(c["root"].(string), "data/dialogue/proj/runtime", runID)
	if err = os.MkdirAll(dir, 0700); err != nil {
		t.Fatal(err)
	}
	private := map[string]any{"context": c, "model": map[string]any{"selection_id": "builtin-local"}}
	raw, _ := json.Marshal(private)
	if err = os.WriteFile(filepath.Join(dir, "request.json"), raw, 0600); err != nil {
		t.Fatal(err)
	}
	api := filepath.Join(project, "ext/root-skill/runtime/value.mq.md")
	args := map[string]any{
		"context": c,
		"args": map[string]any{
			"api":    api,
			"source": "---\nmarkup: occlusion\nimport:\n  api: " + api + "\n---\n\n## act\n\n本次调用由根文稿提供有限接口。\n\n**x = > api.not_a_function(a=1)**.\n",
		},
		"step": 1,
	}
	body, _ := json.Marshal(args)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "marqdo", "call", filepath.Join(s.store.root, "ext/root-skill/runtime/io.mq.md"), "preflight", "--args-json", "-", "--effects", "plugin,fs.read,fs.write,process.exec,environment.read", "--fs-root", c["workspace"].(string), "--json")
	cmd.Stdin = bytes.NewReader(body)
	cmd.Dir = s.store.root
	cmd.Env = append(os.Environ(), "QDAGENT_RUN_REQUEST_FILE="+filepath.Join(dir, "request.json"), "QDAGENT_ACTOR_FILE="+filepath.Join(dir, "actor.json"), "MARQDO_LIB="+filepath.Join(s.store.root, "lib"), "MARQDO_EXT="+filepath.Join(s.store.root, "ext"))
	out, err := cmd.Output()
	if err != nil {
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		// A rejected candidate may surface as a nonzero exit with the official
		// diagnostic on stdout; that is still evidence of a pre-execution refusal.
		if len(out) == 0 {
			t.Fatalf("preflight command failed: %v %s", err, stderr.String())
		}
	}
	var envelope struct {
		OK     bool `json:"ok"`
		Result struct {
			OK               bool           `json:"ok"`
			Value            map[string]any `json:"value"`
			ValidationFailed bool           `json:"validation_failed"`
			Error            struct {
				Message string `json:"message"`
			} `json:"error"`
		} `json:"result"`
	}
	if err = json.Unmarshal(out, &envelope); err != nil {
		t.Fatal(err, string(out))
	}
	if envelope.Result.OK {
		t.Fatalf("an unknown function must be rejected before execution: %s", string(out))
	}
	if !envelope.Result.ValidationFailed {
		t.Fatalf("rejection must be labelled validation_failed: %s", string(out))
	}
	if !strings.Contains(envelope.Result.Error.Message, "not_a_function") {
		t.Fatalf("the diagnostic must name the rejected function: %s", string(out))
	}
}
