package app

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	_ "github.com/mattn/go-sqlite3"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Task struct {
	Archived int64  `json:"archived_ms"`
	ID       string `json:"id"`
	Title    string `json:"title"`
	Status   string `json:"status"`
	Created  int64  `json:"created_ms"`
}
type Model struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Group    string `json:"group,omitempty"`
	Protocol string `json:"protocol"`
	Model    string `json:"model"`
	Endpoint string `json:"endpoint,omitempty"`
	Thinking bool   `json:"thinking"`
	Builtin  bool   `json:"builtin"`
	HasKey   bool   `json:"has_key"`
	Notice   string `json:"notice,omitempty"`
}
type Store struct {
	db   *sql.DB
	root string
}

func openStore(root string) (*Store, error) {
	if err := os.MkdirAll(filepath.Join(root, "data"), 0700); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite3", filepath.Join(root, "data/qdagent.sqlite3")+"?_busy_timeout=5000&_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(8)
	s := &Store{db: db, root: root}
	schema := []string{
		`CREATE TABLE IF NOT EXISTS qd_tasks(id TEXT PRIMARY KEY,owner TEXT NOT NULL,title TEXT NOT NULL,context TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'ready',created_ms INTEGER NOT NULL)`,
		`CREATE INDEX IF NOT EXISTS qd_tasks_owner ON qd_tasks(owner,created_ms)`,
		`CREATE TABLE IF NOT EXISTS qd_plugins(owner TEXT NOT NULL,id TEXT NOT NULL,enabled INTEGER NOT NULL,PRIMARY KEY(owner,id))`,
		`CREATE TABLE IF NOT EXISTS qd_model_profiles(id TEXT PRIMARY KEY,owner TEXT NOT NULL,label TEXT NOT NULL,protocol TEXT NOT NULL,model TEXT NOT NULL,endpoint TEXT NOT NULL,credential TEXT NOT NULL,thinking INTEGER NOT NULL DEFAULT 0)`,
		`CREATE TABLE IF NOT EXISTS qd_messages(task_id TEXT NOT NULL,turn INTEGER NOT NULL,question TEXT NOT NULL,answer TEXT NOT NULL,PRIMARY KEY(task_id,turn))`,
		`CREATE TABLE IF NOT EXISTS qd_model_health(id TEXT PRIMARY KEY,notice TEXT NOT NULL,updated_ms INTEGER NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS qd_runs(id TEXT PRIMARY KEY,task_id TEXT NOT NULL,owner TEXT NOT NULL,model TEXT NOT NULL,status TEXT NOT NULL,answer TEXT NOT NULL DEFAULT '',question TEXT NOT NULL,created_ms INTEGER NOT NULL,finished_ms INTEGER,turn INTEGER NOT NULL)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS qd_runs_one_active ON qd_runs(task_id) WHERE status='running'`,
		`CREATE TABLE IF NOT EXISTS qd_run_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,run_id TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,created_ms INTEGER NOT NULL)`,
		`CREATE INDEX IF NOT EXISTS qd_run_events_run ON qd_run_events(run_id,seq)`,
		`CREATE TABLE IF NOT EXISTS qd_http_sessions(hash TEXT PRIMARY KEY,principal TEXT NOT NULL,name TEXT NOT NULL,expires INTEGER NOT NULL)`,
		`CREATE TABLE IF NOT EXISTS qd_http_logins(state TEXT PRIMARY KEY,nonce TEXT NOT NULL,verifier TEXT NOT NULL,redirect TEXT NOT NULL,expires INTEGER NOT NULL)`,
	}
	for _, q := range schema {
		if _, err = db.Exec(q); err != nil {
			db.Close()
			return nil, err
		}
	}
	if err = s.migrateTaskLifecycle(); err != nil {
		db.Close()
		return nil, err
	}
	if err = s.migrateAccess(); err != nil {
		db.Close()
		return nil, err
	}
	// A server restart cannot silently resume or repeat a potentially mutating task.
	_, err = db.Exec(`UPDATE qd_runs SET status='interrupted',finished_ms=? WHERE status='running'`, time.Now().UnixMilli())
	if err != nil {
		return nil, err
	}
	if err = s.finishDeletedTasks(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}
func randomID() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
func digest(v string) string                        { h := sha256.Sum256([]byte(v)); return hex.EncodeToString(h[:]) }
func (s *Store) tasks(owner string) ([]Task, error) { return s.archivedTasks(owner, false) }
func (s *Store) archivedTasks(owner string, archived bool) ([]Task, error) {
	rows, err := s.db.Query(`SELECT id,title,status,created_ms,archived_ms FROM qd_tasks WHERE owner=? AND deleted_ms=0 AND (archived_ms>0)=? ORDER BY created_ms DESC`, owner, archived)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Task{}
	for rows.Next() {
		var t Task
		if err = rows.Scan(&t.ID, &t.Title, &t.Status, &t.Created, &t.Archived); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}
func (s *Store) task(owner, id string) (Task, error) {
	var t Task
	err := s.db.QueryRow(`SELECT id,title,status,created_ms,archived_ms FROM qd_tasks WHERE id=? AND owner=? AND deleted_ms=0`, id, owner).Scan(&t.ID, &t.Title, &t.Status, &t.Created, &t.Archived)
	return t, err
}
func validID(id string) bool {
	if len(id) < 1 || len(id) > 80 {
		return false
	}
	for _, r := range id {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '-' || r == '_') {
			return false
		}
	}
	return true
}
func (s *Store) createTask(owner, title string) (Task, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		title = "新任务"
	}
	if len([]rune(title)) > 120 {
		return Task{}, errors.New("任务名称最多 120 字")
	}
	t := Task{ID: randomID(), Title: title, Status: "idle", Created: time.Now().UnixMilli()}
	created, err := s.db.Exec(`INSERT INTO qd_tasks(id,owner,title,status,created_ms)
	 SELECT ?,?,?,?,? WHERE
	 EXISTS(SELECT 1 FROM qd_accounts WHERE principal=? AND admin_role IN ('super_admin','operator') AND role_expires>?)
	 OR COALESCE((SELECT task_limit FROM qd_account_limits WHERE principal=?),(SELECT task_limit FROM qd_access_policy WHERE id=1))=-1
	 OR (SELECT count(*) FROM qd_tasks WHERE owner=? AND archived_ms=0 AND deleted_ms=0) <
	 COALESCE((SELECT task_limit FROM qd_account_limits WHERE principal=?),(SELECT task_limit FROM qd_access_policy WHERE id=1))`, t.ID, owner, t.Title, t.Status, t.Created, owner, time.Now().Unix(), owner, owner, owner)
	if err != nil {
		return t, err
	}
	if n, _ := created.RowsAffected(); n != 1 {
		return Task{}, errTaskLimit
	}
	_, err = s.taskContext(owner, t.ID)
	if err != nil {
		_, _ = s.db.Exec(`DELETE FROM qd_tasks WHERE id=? AND owner=?`, t.ID, owner)
	}
	return t, err
}
func (s *Store) taskContext(owner, id string) (map[string]any, error) {
	t, err := s.task(owner, id)
	if err != nil {
		return nil, err
	}
	if !validID(id) {
		return nil, errors.New("无效任务身份")
	}
	root := filepath.Join(s.root, "data/sessions", id)
	workspace := filepath.Join(s.root, "data/workspaces", id)
	for _, p := range []string{workspace, filepath.Join(root, "ext/native"), filepath.Join(root, "data/dialogue/proj")} {
		if err = os.MkdirAll(p, 0700); err != nil {
			return nil, err
		}
	}
	for _, name := range []string{"libagent.so", "libweb.so", "libllm.so", "libqdagent_transport.so"} {
		dst := filepath.Join(root, "ext/native", name)
		if _, err = os.Stat(dst); err == nil {
			continue
		}
		src := filepath.Join(s.root, "ext/native", name)
		if err = os.Link(src, dst); err != nil {
			in, e := os.Open(src)
			if e != nil {
				return nil, e
			}
			out, e := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0755)
			if e != nil {
				in.Close()
				return nil, e
			}
			_, e = io.Copy(out, in)
			in.Close()
			out.Close()
			if e != nil {
				return nil, e
			}
		}
	}
	c := map[string]any{"id": id, "title": t.Title, "owner": owner, "project": s.root, "root": root, "workspace": workspace, "created_ms": t.Created, "bundle": "0.4.0"}
	c["admin_role"] = s.accountRole(owner)
	c["knowledge_scope"] = publicKnowledgeScope
	data, _ := json.Marshal(c)
	if err = atomicWrite(filepath.Join(root, "context.json"), data, 0600); err != nil {
		return nil, err
	}
	_, err = s.db.Exec(`UPDATE qd_tasks SET context=? WHERE id=? AND owner=?`, string(data), id, owner)
	return c, err
}
func atomicWrite(path string, b []byte, mode os.FileMode) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), ".qd-*")
	if err != nil {
		return err
	}
	name := tmp.Name()
	defer os.Remove(name)
	if err = tmp.Chmod(mode); err == nil {
		_, err = tmp.Write(b)
	}
	if err == nil {
		err = tmp.Sync()
	}
	closeErr := tmp.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	return os.Rename(name, path)
}
func (s *Store) masterKey() ([]byte, error) {
	path := os.Getenv("QDAGENT_MODEL_KEY_FILE")
	if path == "" {
		path = filepath.Join(s.root, ".marqdo/secrets/model_key")
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, errors.New("模型加密密钥不可用")
	}
	key, err := hex.DecodeString(strings.TrimSpace(string(b)))
	if err != nil || len(key) != 32 {
		return nil, errors.New("模型加密密钥格式无效")
	}
	return key, nil
}
func modelCrypt(key []byte, value, owner, id string, seal bool) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	g, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	aad := []byte(owner + "\n" + id)
	if seal {
		nonce := make([]byte, g.NonceSize())
		if _, err = rand.Read(nonce); err != nil {
			return "", err
		}
		return base64.StdEncoding.EncodeToString(g.Seal(nonce, nonce, []byte(value), aad)), nil
	}
	b, err := base64.StdEncoding.DecodeString(value)
	if err != nil || len(b) < g.NonceSize() {
		return "", errors.New("模型密文无效")
	}
	plain, err := g.Open(nil, b[:g.NonceSize()], b[g.NonceSize():], aad)
	if err != nil {
		return "", errors.New("模型凭据验证失败")
	}
	return string(plain), nil
}

// sharedModelPrefix 标记共享模型的对外身份；实际配置身份追加在其后。
const sharedModelPrefix = "shared-"

const (
	// smartModelOwner 持有固定的 smart/default 智能模型位。
	smartModelOwner = "agent-development"
	// smartModelGroup 是智能模型及同账户其它模型的展示分组。
	smartModelGroup = "智能模型"
	// sharedModelOwner 是额外共享模型的目录账户，其配置整体对外开放。
	sharedModelOwner = "shared-catalog"
	// sharedModelGroup 是无可识别前缀时的回退分组。
	sharedModelGroup = "共享模型"
)

// sharedModelSelection 判断选择是否落在管理员开放的共享槽位上。
// builtin-smart 是固定的智能模型位，shared-* 是按配置身份暴露的其它共享模型，二者共用同一份每日额度。
func sharedModelSelection(selection string) bool {
	return selection == "builtin-smart" || strings.HasPrefix(selection, sharedModelPrefix)
}

// sharedGroupName 从公开名称派生界面分组。分组只是展示归类，不参与权限判定；
// 配置的公开名称形如“供应商 · 型号”时取前半部分。
func sharedGroupName(label string) string {
	if index := strings.Index(label, " · "); index > 0 {
		return strings.TrimSpace(label[:index])
	}
	return sharedModelGroup
}

// localModelSettings is the single definition of the builtin local slot: the
// endpoint and the served model both come from the administrator environment,
// so the UI label, the resolved request and the documented default agree.
func localModelSettings() (string, string) {
	ep := os.Getenv("QDAGENT_OLLAMA_URL")
	if ep == "" {
		ep = "http://127.0.0.1:11434"
	}
	model := os.Getenv("QDAGENT_OLLAMA_MODEL")
	if model == "" {
		model = "qwen3.5:4b-q4_K_M"
	}
	return ep, model
}

func (s *Store) models(owner string) ([]Model, error) {
	out := []Model{}
	var shared string
	if s.db.QueryRow(`SELECT id FROM qd_model_profiles WHERE owner=? AND model='smart/default' ORDER BY id LIMIT 1`, smartModelOwner).Scan(&shared) == nil {
		out = append(out, Model{ID: "builtin-smart", Label: "智能模型", Model: "smart/default", Protocol: "openai", Builtin: true, HasKey: true, Group: smartModelGroup})
	}
	sharedRows, err := s.db.Query(`SELECT id,owner,label,protocol,model,endpoint,thinking,credential!='' FROM qd_model_profiles WHERE owner IN (?,?) ORDER BY label,id`, smartModelOwner, sharedModelOwner)
	if err != nil {
		return nil, err
	}
	for sharedRows.Next() {
		var m Model
		var sharedOwner string
		if err = sharedRows.Scan(&m.ID, &sharedOwner, &m.Label, &m.Protocol, &m.Model, &m.Endpoint, &m.Thinking, &m.HasKey); err != nil {
			sharedRows.Close()
			return nil, err
		}
		if sharedOwner == smartModelOwner && m.Model == "smart/default" {
			continue
		}
		m.Group = smartModelGroup
		if sharedOwner == sharedModelOwner {
			m.Group = sharedGroupName(m.Label)
		}
		// 共享条目只公开选择所需的展示字段，端点与账户在解析时才从受信行读取。
		m.Endpoint = ""
		m.ID = sharedModelPrefix + m.ID
		m.Builtin = true
		out = append(out, m)
	}
	if err = sharedRows.Err(); err != nil {
		sharedRows.Close()
		return nil, err
	}
	sharedRows.Close()
	_, localModel := localModelSettings()
	out = append(out, Model{ID: "builtin-local", Label: "本机 Qwen", Model: localModel, Protocol: "ollama", Builtin: true})
	rows, err := s.db.Query(`SELECT id,label,protocol,model,endpoint,thinking,credential!='' FROM qd_model_profiles WHERE owner=? ORDER BY label,id`, owner)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var m Model
		if err = rows.Scan(&m.ID, &m.Label, &m.Protocol, &m.Model, &m.Endpoint, &m.Thinking, &m.HasKey); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	for index := range out {
		_ = s.db.QueryRow(`SELECT notice FROM qd_model_health WHERE id=?`, out[index].ID).Scan(&out[index].Notice)
	}
	return out, nil
}
func (s *Store) resolveModel(owner, id string) (map[string]any, error) {
	selection := id
	if id == "builtin-local" {
		ep, model := localModelSettings()
		return map[string]any{"selection_id": selection, "protocol": "ollama", "model": model, "endpoint": ep, "api_key": "", "builtin": true, "thinking": false}, nil
	}
	if id == "builtin-smart" {
		owner = smartModelOwner
		if err := s.db.QueryRow(`SELECT id FROM qd_model_profiles WHERE owner=? AND model='smart/default' ORDER BY id LIMIT 1`, owner).Scan(&id); err != nil {
			return nil, errors.New("共享模型尚未配置")
		}
	}
	if strings.HasPrefix(id, sharedModelPrefix) {
		// 共享身份不携带账户，只能落在两个受信账户上；配置身份本身全局唯一。
		id = strings.TrimPrefix(id, sharedModelPrefix)
		if err := s.db.QueryRow(`SELECT owner FROM qd_model_profiles WHERE id=? AND owner IN (?,?)`, id, smartModelOwner, sharedModelOwner).Scan(&owner); err != nil {
			return nil, errors.New("共享模型尚未配置")
		}
	}
	var protocol, model, endpoint, credential string
	var thinking bool
	err := s.db.QueryRow(`SELECT protocol,model,endpoint,credential,thinking FROM qd_model_profiles WHERE owner=? AND id=?`, owner, id).Scan(&protocol, &model, &endpoint, &credential, &thinking)
	if err != nil {
		return nil, errors.New("模型不存在或不属于当前账号")
	}
	key := ""
	if credential != "" {
		k, e := s.masterKey()
		if e != nil {
			return nil, e
		}
		key, e = modelCrypt(k, credential, owner, id, false)
		if e != nil {
			return nil, e
		}
	}
	builtin := protocol == "local"
	if builtin {
		protocol = "ollama"
		endpoint = os.Getenv("QDAGENT_OLLAMA_URL")
		if endpoint == "" {
			endpoint = "http://127.0.0.1:11434"
		}
	}
	return map[string]any{"selection_id": selection, "protocol": protocol, "model": model, "endpoint": endpoint, "api_key": key, "thinking": thinking, "builtin": builtin}, nil
}
func (s *Store) pluginEnabled(owner, id string) bool {
	var n int
	err := s.db.QueryRow(`SELECT enabled FROM qd_plugins WHERE owner=? AND id=?`, owner, id).Scan(&n)
	return err == sql.ErrNoRows || err == nil && n != 0
}
func (s *Store) close() { s.db.Close() }
func nullString(v sql.NullString) string {
	if v.Valid {
		return v.String
	}
	return ""
}
func nowMS() int64 { return time.Now().UnixMilli() }
func sqlContext(ctx context.Context, db *sql.DB, q string, args ...any) error {
	_, err := db.ExecContext(ctx, q, args...)
	return err
}
