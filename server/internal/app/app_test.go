package app

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testServer(t *testing.T) *Server {
	t.Helper()
	root := t.TempDir()
	t.Setenv("QDAGENT_DEV_OWNER", "test-owner")
	for _, name := range []string{"libagent.so", "libweb.so", "libllm.so", "libqdagent_transport.so", "qdagent-worker"} {
		p := filepath.Join(root, "ext/native", name)
		os.MkdirAll(filepath.Dir(p), 0700)
		os.WriteFile(p, []byte("fixture"), 0600)
	}
	front := filepath.Join(root, "frontend/dist")
	os.MkdirAll(front, 0700)
	os.WriteFile(filepath.Join(front, "index.html"), []byte("frontend"), 0600)
	os.WriteFile(filepath.Join(front, "favicon.svg"), []byte("<svg/>"), 0600)
	s, e := New(root, front)
	if e != nil {
		t.Fatal(e)
	}
	s.supervisor.workflow = nil // Generic transport tests use a minimal installed runtime. Root protocol has dedicated real-CLI tests.
	t.Cleanup(s.Close)
	return s
}
func request(s *Server, method, path, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, "http://127.0.0.1:7964"+path, strings.NewReader(body))
	r.RemoteAddr = "127.0.0.1:1234"
	r.Header.Set("Origin", "http://127.0.0.1:7964")
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, r)
	return w
}
func TestModelEncryptionCompatibleAndOwnerBound(t *testing.T) {
	key := bytes.Repeat([]byte{0x19}, 32)
	sealed, e := modelCrypt(key, "private-value", "owner-a", "profile", true)
	if e != nil {
		t.Fatal(e)
	}
	opened, e := modelCrypt(key, sealed, "owner-a", "profile", false)
	if e != nil || opened != "private-value" {
		t.Fatal("roundtrip failed")
	}
	if _, e = modelCrypt(key, sealed, "owner-b", "profile", false); e == nil {
		t.Fatal("cross-owner decryption allowed")
	}
	if _, e = modelCrypt(key, sealed, "owner-a", "other", false); e == nil {
		t.Fatal("cross-profile decryption allowed")
	}
}
func TestTaskIsolationAndCSRF(t *testing.T) {
	s := testServer(t)
	w := request(s, "POST", "/api/tasks", `{"title":"工程任务"}`)
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body.String())
	}
	var task Task
	json.Unmarshal(w.Body.Bytes(), &task)
	if request(s, "GET", "/api/tasks/"+task.ID, "").Code != 200 {
		t.Fatal("cannot restore created task")
	}
	s.auth.dev = "another-owner"
	if request(s, "GET", "/api/tasks/"+task.ID, "").Code != 404 {
		t.Fatal("another owner read task")
	}
	r := httptest.NewRequest("POST", "http://127.0.0.1:7964/api/tasks", strings.NewReader(`{"title":"forged"}`))
	r.RemoteAddr = "127.0.0.1:1234"
	r.Header.Set("Origin", "https://other.invalid")
	out := httptest.NewRecorder()
	s.Handler().ServeHTTP(out, r)
	if out.Code != 403 {
		t.Fatal("foreign origin accepted")
	}
	if request(s, "PATCH", "/api/plugins/stdlib", `{"enabled":false}`).Code != 400 {
		t.Fatal("stdlib disabled")
	}
}
func TestSafeOpenRejectsTraversalAndExternalSymlink(t *testing.T) {
	root := t.TempDir()
	outside := t.TempDir()
	os.WriteFile(filepath.Join(outside, "secret"), []byte("private"), 0600)
	os.Symlink(filepath.Join(outside, "secret"), filepath.Join(root, "link"))
	if f, e := safeOpen(root, "../secret"); e == nil {
		f.Close()
		t.Fatal("traversal accepted")
	}
	if f, e := safeOpen(root, "link"); e == nil {
		f.Close()
		t.Fatal("external symlink accepted")
	}
}
func TestPublicHealthFaviconAndAuthenticatedAPI(t *testing.T) {
	s := testServer(t)
	if request(s, "GET", "/favicon.ico", "").Code != 200 {
		t.Fatal("favicon missing")
	}
	s.auth.dev = ""
	if request(s, "GET", "/api/models", "").Code != 401 {
		t.Fatal("anonymous models exposed")
	}
	if request(s, "GET", "/healthz", "").Code != 200 {
		t.Fatal("health requires login")
	}
}
func TestModelSaveDoesNotExposeCredential(t *testing.T) {
	s := testServer(t)
	key := filepath.Join(s.store.root, "key")
	os.WriteFile(key, []byte(hex.EncodeToString(bytes.Repeat([]byte{1}, 32))), 0600)
	t.Setenv("QDAGENT_MODEL_KEY_FILE", key)
	w := request(s, "POST", "/api/models", `{"label":"配置","protocol":"openai","model":"example","endpoint":"https://example.com/v1","api_key":"fixture-secret","thinking":false}`)
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body.String())
	}
	w = request(s, "GET", "/api/models", "")
	if w.Code != 200 || strings.Contains(w.Body.String(), "fixture-secret") || strings.Contains(w.Body.String(), "credential") {
		t.Fatal("private credential exposed")
	}
}
func TestStreamEmitsBeforeWorkerCompletesAndPersists(t *testing.T) {
	s := testServer(t)
	installNativeFixture(t, s.store.root, `journal.write(json.dumps({'kind':'text_delta','data':{'text':'第一段'}})+'\n');journal.flush()
time.sleep(1.2)
print(json.dumps({'ok':True,'result':{'answer':'第一段完成','status':'answer_only'}}),flush=True)
`)
	task, e := s.store.createTask("test-owner", "stream-test")
	if e != nil {
		t.Fatal(e)
	}
	run, e := s.supervisor.start("test-owner", task.ID, "builtin-local", "hello", "")
	if e != nil {
		t.Fatal(e)
	}
	server := httptest.NewServer(s.Handler())
	defer server.Close()
	started := time.Now()
	response, e := server.Client().Get(server.URL + "/api/runs/" + run.ID + "/events")
	if e != nil {
		t.Fatal(e)
	}
	defer response.Body.Close()
	buf := make([]byte, 4096)
	var collected string
	seenEarly := false
	for {
		n, e := response.Body.Read(buf)
		collected += string(buf[:n])
		if strings.Contains(collected, "第一段") && time.Since(started) < time.Second {
			seenEarly = true
		}
		if e == io.EOF {
			break
		}
		if e != nil {
			t.Fatal(e)
		}
	}
	if !seenEarly || !strings.Contains(collected, "event: complete\ndata: {\"answer\":\"第一段完成\",\"status\":\"answer_only\"}") {
		t.Fatal("stream buffered until completion", collected)
	}
	saved, e := s.store.run("test-owner", run.ID)
	if e != nil || saved.Answer != "第一段完成" || saved.Status != "answer_only" {
		t.Fatal("completion not durable", saved, e)
	}
}
func TestOriginIsBoundToLoginEntry(t *testing.T) {
	s := testServer(t)
	s.auth.origins["https://agent.qdqc.com"] = true
	r := httptest.NewRequest("GET", "http://internal/login", nil)
	r.RemoteAddr = "172.18.0.1:1234"
	r.Header.Set("X-Forwarded-Host", "agent.qdqc.com")
	r.Header.Set("X-Forwarded-Proto", "https")
	origin, e := s.auth.origin(r)
	if e != nil || origin != "https://agent.qdqc.com" {
		t.Fatal(origin, e)
	}
	r.Header.Set("X-Forwarded-Host", "attacker.invalid")
	if _, e = s.auth.origin(r); e == nil {
		t.Fatal("unregistered callback origin accepted")
	}
}

var _ = http.MethodGet

func TestOnlyRegisteredChildDeliverablesCanBeOpened(t *testing.T) {
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, ".agent/children/fixture"), 0700)
	os.WriteFile(filepath.Join(root, ".agent/children/fixture/result.md"), []byte("handoff"), 0600)
	os.WriteFile(filepath.Join(root, ".agent/private.json"), []byte("internal"), 0600)
	if f, e := registeredOpen(root, ".agent/private.json"); e == nil {
		f.Close()
		t.Fatal("private state exposed")
	}
	if f, e := registeredOpen(root, ".agent/children/fixture/result.md"); e == nil {
		f.Close()
		t.Fatal("unregistered handoff exposed")
	}
	os.WriteFile(filepath.Join(root, ".agent/artifacts.json"), []byte(`[{"source":".agent/children/fixture/result.md"}]`), 0600)
	f, e := registeredOpen(root, ".agent/children/fixture/result.md")
	if e != nil {
		t.Fatal(e)
	}
	f.Close()
	if f, e := registeredOpen(root, ".agent/private.json"); e == nil {
		f.Close()
		t.Fatal("registry broadened unrelated state")
	}
}

func TestBudgetDiagnosticKeepsSharedModelVisibleButChoosesHealthyDefault(t *testing.T) {
	s := testServer(t)
	_, e := s.store.db.Exec(`INSERT INTO qd_model_profiles(id,owner,label,protocol,model,endpoint,credential) VALUES('shared-fixture','agent-development','shared','openai','smart/default','https://example.com/v1','')`)
	if e != nil {
		t.Fatal(e)
	}
	_, e = s.store.db.Exec(`INSERT INTO qd_model_health(id,notice,updated_ms) VALUES('builtin-smart','服务预算已用尽',0)`)
	if e != nil {
		t.Fatal(e)
	}
	w := request(s, "GET", "/api/models", "")
	var result struct {
		Default string  `json:"default_model"`
		Models  []Model `json:"models"`
	}
	json.Unmarshal(w.Body.Bytes(), &result)
	if result.Default != "builtin-local" || len(result.Models) != 2 || result.Models[0].Notice == "" {
		t.Fatal("unusable service selected or hidden", w.Body.String())
	}
}

func TestCancellationStopsWorkerDescendants(t *testing.T) {
	s := testServer(t)
	installNativeFixture(t, s.store.root, `import subprocess
path=os.path.join(c['workspace'],'unexpected-child.txt')
subprocess.Popen([sys.executable,'-c','import time,pathlib,sys;time.sleep(1);pathlib.Path(sys.argv[1]).write_text("survived")',path])
journal.write(json.dumps({'kind':'tool_start','data':{'id':'fixture','name':'fake-child'}})+'\n');journal.flush()
time.sleep(20)
`)
	task, e := s.store.createTask("test-owner", "cancel-test")
	if e != nil {
		t.Fatal(e)
	}
	run, e := s.supervisor.start("test-owner", task.ID, "builtin-local", "test", "")
	if e != nil {
		t.Fatal(e)
	}
	deadline := time.Now().Add(3 * time.Second)
	started := false
	for time.Now().Before(deadline) {
		events, _ := s.store.runEvents(run.ID, 0)
		for _, event := range events {
			if event.Kind == "tool_start" {
				started = true
			}
		}
		if started {
			break
		}
		time.Sleep(15 * time.Millisecond)
	}
	if !started {
		t.Fatal("fixture did not start")
	}
	s.supervisor.stop(run.ID)
	for time.Now().Before(deadline) {
		saved, _ := s.store.run("test-owner", run.ID)
		if saved.Status == "cancelled" {
			break
		}
		time.Sleep(15 * time.Millisecond)
	}
	saved, _ := s.store.run("test-owner", run.ID)
	if saved.Status != "cancelled" {
		t.Fatal("stop did not reach terminal", saved.Status)
	}
	time.Sleep(1100 * time.Millisecond)
	if _, e = os.Stat(filepath.Join(s.workspace(task), "unexpected-child.txt")); e == nil {
		t.Fatal("worker descendant survived group cancellation")
	}
}

func installNativeFixture(t *testing.T, root, body string) {
	t.Helper()
	program := `#!/usr/bin/env python3
import os,json,sys,time
c=json.load(sys.stdin)['context']
journal=open(os.path.join(os.path.dirname(os.environ['QDAGENT_RUN_REQUEST_FILE']),'events.ndjson'),'a')
` + body
	path := filepath.Join(root, "native-cli-fixture")
	if err := os.WriteFile(path, []byte(program), 0700); err != nil {
		t.Fatal(err)
	}
	t.Setenv("MARQDO_BIN", path)
}
