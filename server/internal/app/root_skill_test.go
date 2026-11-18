package app

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
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
