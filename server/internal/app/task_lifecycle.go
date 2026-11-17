package app

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func (s *Store) migrateTaskLifecycle() error {
	rows, err := s.db.Query(`PRAGMA table_info(qd_tasks)`)
	if err != nil {
		return err
	}
	columns := map[string]bool{}
	for rows.Next() {
		var index, nullable, primary int
		var name, kind string
		var defaultValue any
		if err = rows.Scan(&index, &name, &kind, &nullable, &defaultValue, &primary); err != nil {
			rows.Close()
			return err
		}
		columns[name] = true
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, name := range []string{"archived_ms", "deleted_ms"} {
		if !columns[name] {
			if _, err = s.db.Exec(`ALTER TABLE qd_tasks ADD COLUMN ` + name + ` INTEGER NOT NULL DEFAULT 0`); err != nil {
				return err
			}
		}
	}
	return nil
}

// A tombstone records the user's delete before filesystem cleanup. Interrupted cleanup
// resumes at startup; it never restores a task which the user has already deleted.
func (s *Store) purgeDeletedTask(id string) error {
	if !validID(id) {
		return errors.New("invalid task identity")
	}
	var deleted int64
	if err := s.db.QueryRow(`SELECT deleted_ms FROM qd_tasks WHERE id=?`, id).Scan(&deleted); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return err
	}
	if deleted == 0 {
		return errors.New("task was not marked for deletion")
	}
	root, err := os.OpenRoot(filepath.Join(s.root, "data"))
	if err != nil {
		return err
	}
	defer root.Close()
	for _, name := range []string{"workspaces/", "sessions/"} {
		if err = root.RemoveAll(name + id); err != nil {
			return err
		}
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, query := range []string{
		`DELETE FROM qd_run_events WHERE run_id IN (SELECT id FROM qd_runs WHERE task_id=?)`,
		`DELETE FROM qd_messages WHERE task_id=?`, `DELETE FROM qd_runs WHERE task_id=?`,
		`DELETE FROM qd_tasks WHERE id=? AND deleted_ms>0`,
	} {
		if _, err = tx.Exec(query, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
func (s *Store) finishDeletedTasks() error {
	rows, err := s.db.Query(`SELECT id FROM qd_tasks WHERE deleted_ms>0`)
	if err != nil {
		return err
	}
	ids := []string{}
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, id := range ids {
		if err = s.purgeDeletedTask(id); err != nil {
			log.Printf("task cleanup deferred for %s: %v", id, err)
		}
	}
	return nil
}
func (s *Server) archiveTask(w http.ResponseWriter, r *http.Request, i identity) {
	var input struct {
		Archived *bool `json:"archived"`
	}
	if !decode(w, r, &input) {
		return
	}
	if input.Archived == nil {
		writeError(w, 400, "archive_value", "请明确是否归档")
		return
	}
	s.supervisor.mu.Lock()
	defer s.supervisor.mu.Unlock()
	task, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	var active int
	if err := s.store.db.QueryRow(`SELECT count(*) FROM qd_runs WHERE task_id=? AND status='running'`, task.ID).Scan(&active); err != nil {
		writeError(w, 500, "database_error", "无法确认任务状态")
		return
	}
	if active != 0 {
		writeError(w, 409, "task_running", "请先停止或等待当前执行结束，再归档")
		return
	}
	stamp := int64(0)
	if *input.Archived {
		stamp = time.Now().UnixMilli()
	}
	if !*input.Archived && task.Archived != 0 {
		changed, e := s.store.db.Exec(`UPDATE qd_tasks SET archived_ms=0 WHERE id=? AND owner=? AND deleted_ms=0 AND (
		 EXISTS(SELECT 1 FROM qd_accounts WHERE principal=? AND admin_role IN ('super_admin','operator') AND role_expires>?)
		 OR COALESCE((SELECT task_limit FROM qd_account_limits WHERE principal=?),(SELECT task_limit FROM qd_access_policy WHERE id=1))=-1
		 OR (SELECT count(*) FROM qd_tasks WHERE owner=? AND archived_ms=0 AND deleted_ms=0) < COALESCE((SELECT task_limit FROM qd_account_limits WHERE principal=?),(SELECT task_limit FROM qd_access_policy WHERE id=1)))`, task.ID, i.Principal, i.Principal, time.Now().Unix(), i.Principal, i.Principal, i.Principal)
		if e != nil {
			writeError(w, 503, "restore_failed", "暂时无法恢复任务")
			return
		}
		if n, _ := changed.RowsAffected(); n != 1 {
			writeError(w, 409, "task_limit_reached", errTaskLimit.Error())
			return
		}
		task.Archived = 0
		writeJSON(w, 200, task)
		return
	}
	if _, err := s.store.db.Exec(`UPDATE qd_tasks SET archived_ms=? WHERE id=? AND owner=? AND deleted_ms=0`, stamp, task.ID, i.Principal); err != nil {
		writeError(w, 500, "database_error", "归档状态保存失败")
		return
	}
	task.Archived = stamp
	writeJSON(w, 200, task)
}
func (s *Server) deleteTask(w http.ResponseWriter, r *http.Request, i identity) {
	s.supervisor.mu.Lock()
	defer s.supervisor.mu.Unlock()
	task, ok := s.owned(w, r, i)
	if !ok {
		return
	}
	if task.Archived == 0 {
		writeError(w, 409, "archive_required", "请先归档任务，再永久删除")
		return
	}
	changed, err := s.store.db.Exec(`UPDATE qd_tasks SET deleted_ms=? WHERE id=? AND owner=? AND archived_ms>0 AND deleted_ms=0 AND NOT EXISTS(SELECT 1 FROM qd_runs WHERE task_id=? AND status='running')`, time.Now().UnixMilli(), task.ID, i.Principal, task.ID)
	if err != nil {
		writeError(w, 500, "database_error", "删除请求未保存")
		return
	}
	count, _ := changed.RowsAffected()
	if count != 1 {
		writeError(w, 409, "task_running", "任务状态已变化，请刷新后重试")
		return
	}
	if err = s.store.purgeDeletedTask(task.ID); err != nil {
		writeJSON(w, 202, map[string]any{"deleted": true, "cleanup_pending": true})
		return
	}
	writeJSON(w, 200, map[string]any{"deleted": true, "cleanup_pending": false})
}
