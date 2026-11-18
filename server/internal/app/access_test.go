package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestAccessRolesAndOrdinaryAPIs(t *testing.T) {
	s := testServer(t)
	if got := request(s, "GET", "/api/me", ""); got.Code != 200 || !strings.Contains(got.Body.String(), `"task_limit":3`) || !strings.Contains(got.Body.String(), `"smart_daily_limit":50`) {
		t.Fatal(got.Code, got.Body.String())
	}
	for _, path := range []string{"/api/tasks/unknown/knowledge/prepare", "/api/tasks/unknown/knowledge/publish"} {
		got := request(s, "POST", path, `{}`)
		if got.Code != 403 {
			t.Fatal(path, got.Code, got.Body.String())
		}
	}
	if got := request(s, "GET", "/api/admin/access", ""); got.Code != 403 {
		t.Fatal(got.Code)
	}
	for _, item := range []struct {
		flag       bool
		role, want string
	}{{false, "super_admin", ""}, {true, "unknown", ""}, {true, "operator", "operator"}, {true, "auditor", "auditor"}} {
		if got := verifiedRole(item.flag, item.role); got != item.want {
			t.Fatal(item, got)
		}
	}
	if err := s.store.syncIdentity("auditor", "审计员", "auditor", time.Now().Add(time.Hour).Unix()); err != nil {
		t.Fatal(err)
	}
	s.auth.dev = ""
	session := strings.Repeat("e", 96)
	s.store.db.Exec(`INSERT INTO qd_http_sessions VALUES(?,?,?,?)`, digest(session), "auditor", "审计员", time.Now().Add(time.Hour).Unix())
	// Direct role predicates protect both HTTP and the model accounting adapter.
	if manageRole(s.store.accountRole("auditor")) {
		t.Fatal("auditor can write")
	}
	for _, method := range []string{"GET", "PUT"} {
		r := httptest.NewRequest(method, "http://127.0.0.1:7964/api/admin/access", strings.NewReader(`{"task_limit":9,"smart_daily_limit":99}`))
		r.Header.Set("Cookie", "qd_session_v2="+session)
		r.Header.Set("Origin", "http://127.0.0.1:7964")
		r.RemoteAddr = "127.0.0.1:1000"
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, r)
		want := 200
		if method == "PUT" {
			want = 403
		}
		if w.Code != want {
			t.Fatal(method, w.Code, w.Body.String())
		}
	}
	if !manageRole("operator") || manageRole("user") {
		t.Fatal("role mapping")
	}
}
func TestConcurrentTaskLimitAndRestore(t *testing.T) {
	s := testServer(t)
	var accepted atomic.Int32
	var wg sync.WaitGroup
	for n := 0; n < 16; n++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := s.store.createTask("limited", "任务"); err == nil {
				accepted.Add(1)
			}
		}()
	}
	wg.Wait()
	if accepted.Load() != 3 {
		t.Fatal("concurrent slots", accepted.Load())
	}
	tasks, _ := s.store.tasks("limited")
	s.auth.dev = "limited"
	got := request(s, "PATCH", "/api/tasks/"+tasks[0].ID+"/archive", `{"archived":true}`)
	if got.Code != 200 {
		t.Fatal(got.Code, got.Body.String())
	}
	if got = request(s, "POST", "/api/tasks", `{"title":"归档释放的名额"}`); got.Code != 201 {
		t.Fatal(got.Code, got.Body.String())
	}
	if got = request(s, "PATCH", "/api/tasks/"+tasks[0].ID+"/archive", `{"archived":false}`); got.Code != 409 {
		t.Fatal("restore bypassed quota", got.Code, got.Body.String())
	}
	if _, err := s.store.createTask("different-owner", "独立额度"); err != nil {
		t.Fatal(err)
	}
}
func TestConcurrentSmartRequestsShareDailyBucket(t *testing.T) {
	s := testServer(t)
	var accepted atomic.Int32
	var wg sync.WaitGroup
	for n := 0; n < 64; n++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			if _, err := s.store.consumeModel("limited", "builtin-smart", fmt.Sprint("request-", n)); err == nil {
				accepted.Add(1)
			}
		}(n)
	}
	wg.Wait()
	if accepted.Load() != 50 {
		t.Fatal("concurrent model budget", accepted.Load())
	}
	u, err := s.store.accountUsage("limited")
	if err != nil || u.SmartRemaining != 0 || u.SmartUsed != 50 {
		t.Fatal(u, err)
	}
	for n := 0; n < 60; n++ {
		if _, err = s.store.consumeModel("limited", "builtin-local", fmt.Sprint("local-", n)); err != nil {
			t.Fatal(err)
		}
	}
	if u, _ = s.store.accountUsage("limited"); u.SmartUsed != 50 {
		t.Fatal("local model used smart budget")
	}
	// Midnight uses the next Asia/Shanghai date bucket, not server UTC midnight.
	day, _ := quotaDay(time.Date(2026, 11, 17, 16, 0, 0, 0, time.UTC))
	if day != "2026-11-18" {
		t.Fatal(day)
	}
	if _, err = s.store.consumeModel("other", "builtin-smart", "other-first"); err != nil {
		t.Fatal(err)
	}
}
func TestAdminLimitsAndAuditedOverrides(t *testing.T) {
	s := testServer(t)
	t.Setenv("QDAGENT_DEV_ADMIN", "1")
	if got := request(s, "PUT", "/api/admin/access", `{"task_limit":2,"smart_daily_limit":7}`); got.Code != 200 {
		t.Fatal(got.Code, got.Body.String())
	}
	if got := request(s, "PUT", "/api/admin/access", `{"task_limit":2}`); got.Code != 400 {
		t.Fatal("missing daily value accepted")
	}
	s.store.syncIdentity("target", "普通用户", "", time.Now().Add(time.Hour).Unix())
	if got := request(s, "PUT", "/api/admin/access/users/"+digest("target"), `{"task_limit":1,"smart_daily_limit":4}`); got.Code != 200 {
		t.Fatal(got.Code, got.Body.String())
	}
	u, err := s.store.accountUsage("target")
	if err != nil || u.TaskLimit != 1 || u.SmartDailyLimit != 4 {
		t.Fatal(u, err)
	}
	var count int
	s.store.db.QueryRow(`SELECT count(*) FROM qd_access_audit`).Scan(&count)
	if count != 2 {
		t.Fatal("audit missing", count)
	}
	// A role assignment is never accepted by this application.
	if got := request(s, "PUT", "/api/admin/access", `{"task_limit":3,"smart_daily_limit":50,"admin_role":"super_admin"}`); got.Code != 400 {
		t.Fatal("client role accepted")
	}
}
func TestModelPermitUsesPrivateRunAndEveryAttempt(t *testing.T) {
	s := testServer(t)
	task, err := s.store.createTask("limited", "额度测试")
	if err != nil {
		t.Fatal(err)
	}
	run := randomID()
	_, err = s.store.db.Exec(`INSERT INTO qd_runs(id,task_id,owner,model,status,question,created_ms,turn) VALUES(?,?,?,'builtin-smart','running','额度测试',0,1)`, run, task.ID, "limited")
	if err != nil {
		t.Fatal(err)
	}
	directory := filepath.Join(s.store.root, "data/sessions", task.ID, "data/dialogue/proj/runtime", run)
	os.MkdirAll(directory, 0700)
	file := filepath.Join(directory, "request.json")
	packet := map[string]any{"context": map[string]any{"id": task.ID, "run_id": run, "owner": "limited", "model_selection": "builtin-local"}, "model": map[string]any{"selection_id": "builtin-local"}, "child_models": map[string]any{"smart-child": map[string]any{"selection_id": "builtin-smart"}}}
	raw, _ := json.Marshal(packet)
	os.WriteFile(file, raw, 0600)
	for attempt := 1; attempt <= 2; attempt++ {
		data, _ := json.Marshal(modelPermitInput{RequestFile: file, ModelID: "smart-child", Unit: "one", Role: "implement", Step: 1, Attempt: attempt})
		var out bytes.Buffer
		if err = AuthorizeModelRequest(s.store.root, bytes.NewReader(data), &out); err != nil {
			t.Fatal(err, out.String())
		}
	}
	if u, _ := s.store.accountUsage("limited"); u.SmartUsed != 2 {
		t.Fatal("child/retry not charged", u)
	}
	duplicate, _ := json.Marshal(modelPermitInput{RequestFile: file, ModelID: "smart-child", Unit: "one", Role: "implement", Step: 1, Attempt: 2})
	if err = AuthorizeModelRequest(s.store.root, bytes.NewReader(duplicate), &bytes.Buffer{}); err == nil {
		t.Fatal("request replay allowed")
	}
	unlisted, _ := json.Marshal(modelPermitInput{RequestFile: file, ModelID: "unlisted", Unit: "one", Role: "implement", Step: 2, Attempt: 1})
	if err = AuthorizeModelRequest(s.store.root, bytes.NewReader(unlisted), &bytes.Buffer{}); err == nil {
		t.Fatal("unlisted model allowed")
	}
	s.store.db.Exec(`UPDATE qd_runs SET status='cancelled' WHERE id=?`, run)
	if err = AuthorizeModelRequest(s.store.root, bytes.NewReader(duplicate), &bytes.Buffer{}); err == nil {
		t.Fatal("stopped run authorized")
	}
}

func TestContextBytesMeterAtProviderBoundary(t *testing.T) {
	s := testServer(t)
	// The quota row is created by the atomic consume, then the event pump
	// attaches the context size the ABI measured before the provider attempt.
	if _, err := s.store.consumeModel("limited", "builtin-smart", "run1:unit1:writer:2:1"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.store.consumeModel("limited", "builtin-smart", "run1:unit2:research:3:1"); err != nil {
		t.Fatal(err)
	}
	if err := s.store.recordModelBytes("run1", "unit1", "writer", 2, 1, 4096); err != nil {
		t.Fatal(err)
	}
	if err := s.store.recordModelBytes("run1", "unit2", "research", 3, 1, 1024); err != nil {
		t.Fatal(err)
	}
	// Replayed events must not double count, and unknown identities are inert.
	if err := s.store.recordModelBytes("run1", "unit1", "writer", 2, 1, 4096); err != nil {
		t.Fatal(err)
	}
	if err := s.store.recordModelBytes("run1", "ghost", "writer", 9, 1, 999999); err != nil {
		t.Fatal(err)
	}
	u, err := s.store.accountUsage("limited")
	if err != nil || u.ContextBytes != 5120 {
		t.Fatal("context bytes", u.ContextBytes, err)
	}
	if u.SmartUsed != 2 {
		t.Fatal("quota count must stay attempt-based", u.SmartUsed)
	}
}
