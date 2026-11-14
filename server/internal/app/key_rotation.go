package app

// RotateModelCredentials is an offline administrator operation. Stop the service,
// back up the database and provision a new secret before invoking it. Key files
// are explicit local inputs; no HTTP route or model function exposes this API.
import (
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"errors"
	"os"
	"strings"
)

func readModelKey(path string) ([]byte, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, errors.New("cannot read model encryption key")
	}
	key, err := hex.DecodeString(strings.TrimSpace(string(raw)))
	if err != nil || len(key) != 32 {
		return nil, errors.New("invalid model encryption key")
	}
	return key, nil
}
func RotateModelCredentials(dbPath, oldFile, newFile string) (int, error) {
	oldKey, err := readModelKey(oldFile)
	if err != nil {
		return 0, err
	}
	newKey, err := readModelKey(newFile)
	if err != nil {
		return 0, err
	}
	if subtle.ConstantTimeCompare(oldKey, newKey) == 1 {
		return 0, errors.New("rotation requires a new key")
	}
	db, err := sql.Open("sqlite3", dbPath+"?_busy_timeout=5000&_foreign_keys=on")
	if err != nil {
		return 0, err
	}
	defer db.Close()
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	var active int
	if err = tx.QueryRow("SELECT count(*) FROM qd_runs WHERE status='running'").Scan(&active); err != nil {
		return 0, err
	}
	if active != 0 {
		return 0, errors.New("active runs must finish before rotation")
	}
	rows, err := tx.Query("SELECT id,owner,credential FROM qd_model_profiles WHERE credential!=''")
	if err != nil {
		return 0, err
	}
	type record struct{ id, owner, cipher string }
	var updates []record
	for rows.Next() {
		var r record
		if err = rows.Scan(&r.id, &r.owner, &r.cipher); err != nil {
			rows.Close()
			return 0, err
		}
		plain, e := modelCrypt(oldKey, r.cipher, r.owner, r.id, false)
		if e != nil {
			rows.Close()
			return 0, errors.New("existing credential cannot be verified; no rows changed")
		}
		r.cipher, e = modelCrypt(newKey, plain, r.owner, r.id, true)
		if e != nil {
			rows.Close()
			return 0, e
		}
		verified, e := modelCrypt(newKey, r.cipher, r.owner, r.id, false)
		if e != nil || verified != plain {
			rows.Close()
			return 0, errors.New("new credential verification failed")
		}
		updates = append(updates, r)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return 0, err
	}
	for _, r := range updates {
		if _, err = tx.Exec("UPDATE qd_model_profiles SET credential=? WHERE id=? AND owner=?", r.cipher, r.id, r.owner); err != nil {
			return 0, err
		}
	}
	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return len(updates), nil
}
