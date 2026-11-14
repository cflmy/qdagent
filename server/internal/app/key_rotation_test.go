package app

import (
	"database/sql"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestOfflineKeyRotationVerifiesEveryOwnerAndRollsBackBadCipher(t *testing.T) {
	dir := t.TempDir()
	old := make([]byte, 32)
	next := make([]byte, 32)
	next[0] = 17
	oldFile, newFile := filepath.Join(dir, "old"), filepath.Join(dir, "next")
	os.WriteFile(oldFile, []byte(hex.EncodeToString(old)), 0600)
	os.WriteFile(newFile, []byte(hex.EncodeToString(next)), 0600)
	file := filepath.Join(dir, "db.sqlite3")
	db, e := sql.Open("sqlite3", file)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	db.Exec("CREATE TABLE qd_runs(status TEXT)")
	db.Exec("CREATE TABLE qd_model_profiles(id TEXT,owner TEXT,credential TEXT)")
	good, _ := modelCrypt(old, "private fixture token", "owner-a", "p", true)
	db.Exec("INSERT INTO qd_model_profiles VALUES('p','owner-a',?),('broken','owner-b','corrupt')", good)
	if _, e = RotateModelCredentials(file, oldFile, newFile); e == nil {
		t.Fatal("corrupt profile accepted")
	}
	var preserved string
	db.QueryRow("SELECT credential FROM qd_model_profiles WHERE id='p'").Scan(&preserved)
	if preserved != good {
		t.Fatal("partial rotation committed")
	}
	db.Exec("DELETE FROM qd_model_profiles WHERE id='broken'")
	db.Exec("INSERT INTO qd_model_profiles VALUES('empty','owner-b','')")
	n, e := RotateModelCredentials(file, oldFile, newFile)
	if e != nil || n != 1 {
		t.Fatalf("rotation failed: count=%d error=%v", n, e)
	}
	db.QueryRow("SELECT credential FROM qd_model_profiles WHERE id='p'").Scan(&preserved)
	plain, e := modelCrypt(next, preserved, "owner-a", "p", false)
	if e != nil || plain != "private fixture token" {
		t.Fatal("new key failed")
	}
	if _, e = modelCrypt(old, preserved, "owner-a", "p", false); e == nil {
		t.Fatal("old key remains valid")
	}
	if _, e = modelCrypt(next, preserved, "owner-b", "p", false); e == nil {
		t.Fatal("owner binding lost")
	}
	db.Exec("INSERT INTO qd_runs VALUES('running')")
	_, e = RotateModelCredentials(file, newFile, oldFile)
	if e == nil || !strings.Contains(e.Error(), "active") {
		t.Fatal("active run was not blocked")
	}
}
