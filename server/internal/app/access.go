package app

// Authentication and resource accounting only. Agent policy and prompts remain in Marqdo.
import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const publicKnowledgeScope = "public"

var errTaskLimit = errors.New("已达到未归档任务上限，请先归档已有任务")
var errSmartLimit = errors.New("智能模型今日请求额度已用尽；额度于北京时间零点重置，本机 Qwen 4B 不限额")

type AccessPolicy struct {
	TaskLimit       int `json:"task_limit"`
	SmartDailyLimit int `json:"smart_daily_limit"`
}
type AccountUsage struct {
	Role            string `json:"role"`
	CanManage       bool   `json:"can_manage"`
	CanAudit        bool   `json:"can_audit"`
	TaskLimit       int    `json:"task_limit"`
	ActiveTasks     int    `json:"active_tasks"`
	SmartDailyLimit int    `json:"smart_daily_limit"`
	SmartUsed       int    `json:"smart_used"`
	SmartRemaining  int    `json:"smart_remaining"`
	ContextBytes    int    `json:"context_bytes"`
	ResetsAt        string `json:"resets_at"`
}

func manageRole(role string) bool { return role == "super_admin" || role == "operator" }
func verifiedRole(isAdmin bool, role string) string {
	if isAdmin && (manageRole(role) || role == "auditor") {
		return role
	}
	return ""
}
func (s *Store) migrateAccess() error {
	for _, query := range []string{
		`CREATE TABLE IF NOT EXISTS qd_accounts(principal TEXT PRIMARY KEY,name TEXT NOT NULL,admin_role TEXT NOT NULL DEFAULT '',role_expires INTEGER NOT NULL DEFAULT 0,updated_ms INTEGER NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS qd_access_policy(id INTEGER PRIMARY KEY CHECK(id=1),task_limit INTEGER NOT NULL,smart_daily_limit INTEGER NOT NULL)`,
		`INSERT OR IGNORE INTO qd_access_policy VALUES(1,3,50)`,
		`CREATE TABLE IF NOT EXISTS qd_account_limits(principal TEXT PRIMARY KEY,task_limit INTEGER NOT NULL,smart_daily_limit INTEGER NOT NULL,updated_by TEXT NOT NULL,updated_ms INTEGER NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS qd_model_usage(request_id TEXT PRIMARY KEY,owner TEXT NOT NULL,model TEXT NOT NULL,day TEXT NOT NULL,created_ms INTEGER NOT NULL,context_bytes INTEGER NOT NULL DEFAULT 0)`,
		`CREATE INDEX IF NOT EXISTS qd_model_usage_owner_day ON qd_model_usage(owner,day,model)`,
		`CREATE TABLE IF NOT EXISTS qd_access_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,target TEXT NOT NULL,operation TEXT NOT NULL,payload TEXT NOT NULL,created_ms INTEGER NOT NULL)`,
	} {
		if _, err := s.db.Exec(query); err != nil {
			return err
		}
	}
	// Databases created before token metering need the context-bytes column.
	var columns int
	if err := s.db.QueryRow(`SELECT count(*) FROM pragma_table_info('qd_model_usage') WHERE name='context_bytes'`).Scan(&columns); err != nil {
		return err
	}
	if columns == 0 {
		if _, err := s.db.Exec(`ALTER TABLE qd_model_usage ADD COLUMN context_bytes INTEGER NOT NULL DEFAULT 0`); err != nil {
			return err
		}
	}
	return nil
}
func (s *Store) syncIdentity(principal, name, role string, expires int64) error {
	_, err := s.db.Exec(`INSERT INTO qd_accounts(principal,name,admin_role,role_expires,updated_ms) VALUES(?,?,?,?,?) ON CONFLICT(principal) DO UPDATE SET name=excluded.name,admin_role=excluded.admin_role,role_expires=excluded.role_expires,updated_ms=excluded.updated_ms`, principal, name, role, expires, nowMS())
	return err
}
func (s *Store) accountRole(owner string) string {
	var role string
	_ = s.db.QueryRow(`SELECT admin_role FROM qd_accounts WHERE principal=? AND role_expires>?`, owner, time.Now().Unix()).Scan(&role)
	return role
}
func quotaDay(now time.Time) (string, string) {
	local := now.In(time.FixedZone("Asia/Shanghai", 8*3600))
	next := time.Date(local.Year(), local.Month(), local.Day()+1, 0, 0, 0, 0, local.Location())
	return local.Format("2006-01-02"), next.Format(time.RFC3339)
}
func (s *Store) accessPolicy() (AccessPolicy, error) {
	var p AccessPolicy
	err := s.db.QueryRow(`SELECT task_limit,smart_daily_limit FROM qd_access_policy WHERE id=1`).Scan(&p.TaskLimit, &p.SmartDailyLimit)
	return p, err
}
func (s *Store) accountUsage(owner string) (AccountUsage, error) {
	p, err := s.accessPolicy()
	if err != nil {
		return AccountUsage{}, err
	}
	err = s.db.QueryRow(`SELECT task_limit,smart_daily_limit FROM qd_account_limits WHERE principal=?`, owner).Scan(&p.TaskLimit, &p.SmartDailyLimit)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return AccountUsage{}, err
	}
	role := s.accountRole(owner)
	day, reset := quotaDay(time.Now())
	u := AccountUsage{Role: role, CanManage: manageRole(role), CanAudit: manageRole(role) || role == "auditor", TaskLimit: p.TaskLimit, SmartDailyLimit: p.SmartDailyLimit, ResetsAt: reset}
	if u.CanManage {
		u.TaskLimit = -1
		u.SmartDailyLimit = -1
	}
	if err = s.db.QueryRow(`SELECT count(*) FROM qd_tasks WHERE owner=? AND archived_ms=0 AND deleted_ms=0`, owner).Scan(&u.ActiveTasks); err != nil {
		return u, err
	}
	if err = s.db.QueryRow(`SELECT count(*) FROM qd_model_usage WHERE owner=? AND day=? AND model='builtin-smart'`, owner, day).Scan(&u.SmartUsed); err != nil {
		return u, err
	}
	if err = s.db.QueryRow(`SELECT COALESCE(sum(context_bytes),0) FROM qd_model_usage WHERE owner=? AND day=?`, owner, day).Scan(&u.ContextBytes); err != nil {
		return u, err
	}
	u.SmartRemaining = -1
	if u.SmartDailyLimit >= 0 {
		u.SmartRemaining = u.SmartDailyLimit - u.SmartUsed
		if u.SmartRemaining < 0 {
			u.SmartRemaining = 0
		}
	}
	return u, nil
}
func (s *Server) requireManager(w http.ResponseWriter, i identity) bool {
	if !manageRole(s.store.accountRole(i.Principal)) {
		writeError(w, 403, "administrator_required", "此操作仅允许统一身份站的超级管理员或运维管理员执行")
		return false
	}
	return true
}
func (s *Server) account(w http.ResponseWriter, r *http.Request, i identity) {
	u, err := s.store.accountUsage(i.Principal)
	if err != nil {
		writeError(w, 503, "usage_unavailable", "暂时无法读取用量")
		return
	}
	writeJSON(w, 200, map[string]any{"name": i.Name, "access": u})
}
func validLimits(p AccessPolicy) bool {
	return p.TaskLimit >= -1 && p.TaskLimit <= 10000 && p.SmartDailyLimit >= -1 && p.SmartDailyLimit <= 100000
}
func (s *Server) adminAccess(w http.ResponseWriter, r *http.Request, i identity) {
	role := s.store.accountRole(i.Principal)
	if !manageRole(role) && role != "auditor" {
		writeError(w, 403, "administrator_required", "仅管理员或审计员可查看管理页面")
		return
	}
	policy, err := s.store.accessPolicy()
	if err != nil {
		writeError(w, 503, "policy_unavailable", "暂时无法读取权限配置")
		return
	}
	rows, err := s.store.db.Query(`SELECT principal,name FROM qd_accounts ORDER BY updated_ms DESC LIMIT 200`)
	if err != nil {
		writeError(w, 503, "accounts_unavailable", "暂时无法读取用户")
		return
	}
	type user struct{ owner, name string }
	var users []user
	for rows.Next() {
		var v user
		if err = rows.Scan(&v.owner, &v.name); err != nil {
			rows.Close()
			writeError(w, 503, "accounts_unavailable", "暂时无法读取用户")
			return
		}
		users = append(users, v)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		writeError(w, 503, "accounts_unavailable", "暂时无法读取用户")
		return
	}
	out := []map[string]any{}
	for _, user := range users {
		usage, e := s.store.accountUsage(user.owner)
		if e != nil {
			writeError(w, 503, "usage_unavailable", "暂时无法读取用量")
			return
		}
		out = append(out, map[string]any{"id": digest(user.owner), "name": user.name, "access": usage})
	}
	writeJSON(w, 200, map[string]any{"policy": policy, "users": out, "read_only": role == "auditor", "timezone": "Asia/Shanghai"})
}
func (s *Server) updateAccess(w http.ResponseWriter, r *http.Request, i identity) {
	if !s.requireManager(w, i) {
		return
	}
	var input struct {
		TaskLimit       *int `json:"task_limit"`
		SmartDailyLimit *int `json:"smart_daily_limit"`
	}
	if !decode(w, r, &input) {
		return
	}
	if input.TaskLimit == nil || input.SmartDailyLimit == nil {
		writeError(w, 400, "missing_limits", "请同时提供任务上限和每日模型请求上限")
		return
	}
	p := AccessPolicy{TaskLimit: *input.TaskLimit, SmartDailyLimit: *input.SmartDailyLimit}
	if !validLimits(p) {
		writeError(w, 400, "invalid_limits", "额度必须在允许范围内，-1 表示不限额，0 表示停止新增")
		return
	}
	tx, err := s.store.db.Begin()
	if err != nil {
		writeError(w, 503, "policy_unavailable", "暂时无法保存配置")
		return
	}
	defer tx.Rollback()
	target := r.PathValue("account")
	raw, _ := json.Marshal(p)
	if target == "" {
		_, err = tx.Exec(`UPDATE qd_access_policy SET task_limit=?,smart_daily_limit=? WHERE id=1`, p.TaskLimit, p.SmartDailyLimit)
	} else {
		rows, e := tx.Query(`SELECT principal FROM qd_accounts`)
		if e != nil {
			writeError(w, 503, "accounts_unavailable", "暂时无法读取用户")
			return
		}
		var owner string
		for rows.Next() {
			var candidate string
			if rows.Scan(&candidate) == nil && digest(candidate) == target {
				owner = candidate
				break
			}
		}
		rows.Close()
		if owner == "" {
			writeError(w, 404, "account_missing", "用户不存在")
			return
		}
		_, err = tx.Exec(`INSERT INTO qd_account_limits(principal,task_limit,smart_daily_limit,updated_by,updated_ms) VALUES(?,?,?,?,?) ON CONFLICT(principal) DO UPDATE SET task_limit=excluded.task_limit,smart_daily_limit=excluded.smart_daily_limit,updated_by=excluded.updated_by,updated_ms=excluded.updated_ms`, owner, p.TaskLimit, p.SmartDailyLimit, i.Principal, nowMS())
	}
	if err == nil {
		_, err = tx.Exec(`INSERT INTO qd_access_audit(actor,target,operation,payload,created_ms) VALUES(?,?,?,?,?)`, i.Principal, target, "set_limits", string(raw), nowMS())
	}
	if err == nil {
		err = tx.Commit()
	}
	if err != nil {
		writeError(w, 503, "policy_save_failed", "配置未保存，请重试")
		return
	}
	writeJSON(w, 200, p)
}

// Called immediately before each provider attempt, including children and retries.
// The single SQL insertion serializes concurrent requests; a repeated identity is denied.
// Shared slots (builtin-smart and shared-*) share one daily limit and are recorded as builtin-smart.
// Bytes measured at the same transport boundary are accumulated later by recordModelBytes.
func (s *Store) consumeModel(owner, model, requestID string) (AccountUsage, error) {
	if !sharedModelSelection(model) {
		day, _ := quotaDay(time.Now())
		if _, err := s.db.Exec(`INSERT INTO qd_model_usage(request_id,owner,model,day,created_ms) VALUES(?,?,?,?,?)`, requestID, owner, model, day, nowMS()); err != nil {
			return AccountUsage{}, errors.New("请求身份已使用或用量记录不可用")
		}
		return s.accountUsage(owner)
	}
	day, _ := quotaDay(time.Now())
	result, err := s.db.Exec(`INSERT INTO qd_model_usage(request_id,owner,model,day,created_ms)
 SELECT ?,?,'builtin-smart',?,? WHERE
 EXISTS(SELECT 1 FROM qd_accounts WHERE principal=? AND admin_role IN ('super_admin','operator') AND role_expires>?)
 OR COALESCE((SELECT smart_daily_limit FROM qd_account_limits WHERE principal=?),(SELECT smart_daily_limit FROM qd_access_policy WHERE id=1))=-1
 OR (SELECT count(*) FROM qd_model_usage WHERE owner=? AND day=? AND model='builtin-smart') <
 COALESCE((SELECT smart_daily_limit FROM qd_account_limits WHERE principal=?),(SELECT smart_daily_limit FROM qd_access_policy WHERE id=1))`,
		requestID, owner, day, nowMS(), owner, time.Now().Unix(), owner, owner, day, owner)
	if err != nil {
		return AccountUsage{}, errors.New("请求身份已使用或用量记录不可用")
	}
	n, _ := result.RowsAffected()
	if n != 1 {
		return AccountUsage{}, errSmartLimit
	}
	return s.accountUsage(owner)
}

// recordModelBytes attaches the context size measured by the Marqdo ABI just
// before the provider attempt (the model_start event) to the usage row that
// consumeModel already serialized. The UPDATE only touches a row that exists
// for this run/unit/role/step/attempt identity; a mismatch is ignored so that
// quota identity stays the only authority on what was charged.
func (s *Store) recordModelBytes(runID, unit, role string, step, attempt, bytes int) error {
	if runID == "" || unit == "" || step < 1 || attempt < 1 || bytes <= 0 {
		return nil
	}
	key := fmt.Sprintf("%s:%s:%s:%d:%d", runID, unit, role, step, attempt)
	_, err := s.db.Exec(`UPDATE qd_model_usage SET context_bytes=? WHERE request_id=? AND context_bytes=0`, bytes, key)
	return err
}

type modelPermitInput struct {
	RequestFile string `json:"request_file"`
	ModelID     string `json:"model_id"`
	Unit        string `json:"unit"`
	Role        string `json:"role"`
	Step        int    `json:"step"`
	Attempt     int    `json:"attempt"`
}

// This helper opens only the existing database: it never invokes startup migrations,
// interrupts running tasks, receives prompts, or resolves a model credential.
func AuthorizeModelRequest(root string, in io.Reader, out io.Writer) error {
	var input modelPermitInput
	d := json.NewDecoder(io.LimitReader(in, 8193))
	d.DisallowUnknownFields()
	if err := d.Decode(&input); err != nil {
		return err
	}
	root, err := filepath.Abs(root)
	if err != nil {
		return err
	}
	actual, err := filepath.EvalSymlinks(input.RequestFile)
	if err != nil {
		return errors.New("私有请求不可用")
	}
	base, err := filepath.EvalSymlinks(filepath.Join(root, "data/sessions"))
	if err != nil {
		return errors.New("任务目录不可用")
	}
	rel, err := filepath.Rel(base, actual)
	if err != nil || strings.HasPrefix(rel, "..") {
		return errors.New("私有请求不属于任务目录")
	}
	parts := strings.Split(rel, string(filepath.Separator))
	if len(parts) != 7 || !validID(parts[0]) || parts[1] != "data" || parts[2] != "dialogue" || parts[3] != "proj" || parts[4] != "runtime" || !validID(parts[5]) || parts[6] != "request.json" {
		return errors.New("私有请求路径无效")
	}
	file, err := os.Open(actual)
	if err != nil {
		return errors.New("私有请求不可用")
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		return errors.New("私有请求不是普通文件")
	}
	raw, err := io.ReadAll(io.LimitReader(file, (2<<20)+1))
	if err != nil || len(raw) > 2<<20 {
		return errors.New("私有请求不可用")
	}
	var req struct {
		Context  map[string]any            `json:"context"`
		Model    map[string]any            `json:"model"`
		Children map[string]map[string]any `json:"child_models"`
	}
	if json.Unmarshal(raw, &req) != nil {
		return errors.New("私有请求格式无效")
	}
	get := func(k string) string { v, _ := req.Context[k].(string); return v }
	if !validID(get("id")) || !validID(get("run_id")) || input.Step < 1 || input.Attempt < 1 {
		return errors.New("请求身份无效")
	}
	expected := filepath.Join(root, "data/sessions", get("id"), "data/dialogue/proj/runtime", get("run_id"), "request.json")
	real, e := filepath.EvalSymlinks(input.RequestFile)
	want, e2 := filepath.EvalSymlinks(expected)
	if e != nil || e2 != nil || real != want {
		return errors.New("私有请求不属于当前运行")
	}
	cfg := req.Model
	if input.ModelID != "inherit" && input.ModelID != get("model_selection") {
		cfg = req.Children[input.ModelID]
	}
	selected, _ := cfg["selection_id"].(string)
	if selected == "" {
		return errors.New("模型未获宿主授权")
	}
	database, err := sql.Open("sqlite3", filepath.Join(root, "data/qdagent.sqlite3")+"?_busy_timeout=5000&_journal_mode=WAL")
	if err != nil {
		return err
	}
	defer database.Close()
	s := &Store{db: database, root: root}
	var active int
	if err = database.QueryRow(`SELECT count(*) FROM qd_runs WHERE id=? AND owner=? AND task_id=? AND status='running'`, get("run_id"), get("owner"), get("id")).Scan(&active); err != nil || active != 1 {
		return errors.New("运行已结束或不属于当前用户")
	}
	key := fmt.Sprintf("%s:%s:%s:%d:%d", get("run_id"), input.Unit, input.Role, input.Step, input.Attempt)
	usage, err := s.consumeModel(get("owner"), selected, key)
	if err != nil {
		_ = json.NewEncoder(out).Encode(map[string]any{"ok": false, "code": "model_quota_exceeded", "message": err.Error()})
		return err
	}
	return json.NewEncoder(out).Encode(map[string]any{"ok": true, "model": selected, "usage": usage})
}
