package app

import (
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestTaskArchiveRestoreAndOwnerBoundDeletion(t *testing.T) {
	s := testServer(t)
	task, err := s.store.createTask("test-owner", "需要保留的任务")
	if err != nil {
		t.Fatal(err)
	}
	workspace := s.workspace(task)
	os.MkdirAll(filepath.Join(workspace, "uploads"), 0700)
	os.WriteFile(filepath.Join(workspace, "uploads", "file.md"), []byte("真实文件"), 0600)
	s.store.db.Exec(`INSERT INTO qd_messages VALUES(?,1,'原问题','原答案')`, task.ID)
	s.store.db.Exec(`INSERT INTO qd_runs(id,task_id,owner,model,status,question,created_ms,turn) VALUES('run-archive',?,'test-owner','model','succeeded','question',1,1)`, task.ID)
	s.store.db.Exec(`INSERT INTO qd_run_events(run_id,kind,payload,created_ms) VALUES('run-archive','final','{}',1)`)
	endpoint := "/api/tasks/" + task.ID
	if got := request(s, "DELETE", endpoint, ""); got.Code != 409 {
		t.Fatal("unarchived task deleted", got.Code)
	}
	s.auth.dev = "another-owner"
	if got := request(s, "PATCH", endpoint+"/archive", `{"archived":true}`); got.Code != 404 {
		t.Fatal("other owner archived", got.Code)
	}
	s.auth.dev = "test-owner"
	if got := request(s, "PATCH", endpoint+"/archive", `{"archived":true}`); got.Code != 200 {
		t.Fatal(got.Code, got.Body.String())
	}
	active, _ := s.store.tasks("test-owner")
	archived, _ := s.store.archivedTasks("test-owner", true)
	if len(active) != 0 || len(archived) != 1 {
		t.Fatal("wrong task catalog", active, archived)
	}
	if got := request(s, "GET", endpoint, ""); got.Code != 200 {
		t.Fatal("archive lost history", got.Code)
	}
	if got := request(s, "GET", endpoint+"/download?path=uploads/file.md", ""); got.Code != 200 || got.Body.String() != "真实文件" {
		t.Fatal("archive lost file", got.Code)
	}
	if _, err = s.supervisor.start("test-owner", task.ID, "builtin-local", "不应执行", ""); err == nil {
		t.Fatal("archived task started")
	}
	if got := request(s, "PATCH", endpoint, `{"title":"不应修改"}`); got.Code != 409 {
		t.Fatal("archived rename", got.Code)
	}
	if got := request(s, "PATCH", endpoint+"/archive", `{"archived":false}`); got.Code != 200 {
		t.Fatal(got.Code)
	}
	restored, _ := s.store.task("test-owner", task.ID)
	if restored.Archived != 0 || restored.Status != "idle" {
		t.Fatal("restore changed execution state", restored)
	}
	request(s, "PATCH", endpoint+"/archive", `{"archived":true}`)
	outside := t.TempDir()
	marker := filepath.Join(outside, "keep")
	os.WriteFile(marker, []byte("must remain"), 0600)
	os.Symlink(outside, filepath.Join(workspace, "outside"))
	if got := request(s, "DELETE", endpoint, ""); got.Code != 200 {
		t.Fatal(got.Code, got.Body.String())
	}
	if _, err = os.Stat(marker); err != nil {
		t.Fatal("deletion traversed a symlink", err)
	}
	for _, path := range []string{workspace, filepath.Join(s.store.root, "data/sessions", task.ID)} {
		if _, err = os.Stat(path); !os.IsNotExist(err) {
			t.Fatal("files retained", path, err)
		}
	}
	for _, path := range []string{endpoint, "/api/runs/run-archive"} {
		if got := request(s, "GET", path, ""); got.Code != 404 {
			t.Fatal("deleted record remained readable", path, got.Code)
		}
	}
	for _, table := range []string{"qd_tasks", "qd_messages", "qd_runs", "qd_run_events"} {
		var n int
		s.store.db.QueryRow("SELECT count(*) FROM " + table).Scan(&n)
		if n != 0 {
			t.Fatal("deleted records remain", table, n)
		}
	}
}
func TestArchiveBlocksActiveRunAndCleanupResumes(t *testing.T) {
	s := testServer(t)
	task, _ := s.store.createTask("test-owner", "active")
	s.store.db.Exec(`INSERT INTO qd_runs(id,task_id,owner,model,status,question,created_ms,turn) VALUES('active-run',?,'test-owner','model','running','question',1,1)`, task.ID)
	if got := request(s, "PATCH", "/api/tasks/"+task.ID+"/archive", `{"archived":true}`); got.Code != 409 {
		t.Fatal("archived active task", got.Code)
	}
	s.store.db.Exec(`UPDATE qd_runs SET status='interrupted'`)
	s.store.db.Exec(`UPDATE qd_tasks SET archived_ms=1,deleted_ms=2 WHERE id=?`, task.ID)
	if _, err := s.store.run("test-owner", "active-run"); err == nil {
		t.Fatal("tombstoned run still readable")
	}
	if err := s.store.finishDeletedTasks(); err != nil {
		t.Fatal(err)
	}
	if _, err := s.store.task("test-owner", task.ID); err == nil {
		t.Fatal("cleanup did not finish")
	}
}
func TestExistingTaskDatabaseMigratesWithoutLosingHistory(t *testing.T) {
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "data"), 0700)
	db, err := sql.Open("sqlite3", filepath.Join(root, "data/qdagent.sqlite3"))
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`CREATE TABLE qd_tasks(id TEXT PRIMARY KEY,owner TEXT NOT NULL,title TEXT NOT NULL,context TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'ready',created_ms INTEGER NOT NULL);INSERT INTO qd_tasks VALUES('legacy','owner','旧任务','{}','succeeded',10)`)
	if err != nil {
		t.Fatal(err)
	}
	db.Close()
	store, err := openStore(root)
	if err != nil {
		t.Fatal(err)
	}
	defer store.db.Close()
	task, err := store.task("owner", "legacy")
	if err != nil || task.Archived != 0 || task.Title != "旧任务" {
		b, _ := json.Marshal(task)
		t.Fatal(string(b), err)
	}
}
