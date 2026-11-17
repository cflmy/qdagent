package app

import (
	"encoding/json"
	"net/url"
	"os"
	"path/filepath"
	"testing"
)

func TestKnowledgeReferenceReadsOnlyInstalledDocuments(t *testing.T) {
	s := testServer(t)
	root := filepath.Join(s.store.root, "kb")
	os.MkdirAll(root, 0700)
	os.WriteFile(filepath.Join(root, "guide.mq.md"), []byte("## greeting\n\n这是公开参考。\n\nReturn *1*.\n"), 0600)
	response := request(s, "GET", "/api/knowledge/reference?path=guide.mq.md", "")
	if response.Code != 200 {
		t.Fatal(response.Code, response.Body.String())
	}
	var value map[string]any
	if json.Unmarshal(response.Body.Bytes(), &value) != nil || value["source"] == nil {
		t.Fatal(response.Body.String())
	}
	secret := filepath.Join(s.store.root, "data", "private.md")
	os.WriteFile(secret, []byte("private"), 0600)
	os.Symlink(secret, filepath.Join(root, "escape.md"))
	for _, p := range []string{"../data/private.md", "/etc/passwd", "escape.md", "guide.mq.md/../private.md", "guide.js"} {
		got := request(s, "GET", "/api/knowledge/reference?path="+url.QueryEscape(p), "")
		if got.Code != 404 {
			t.Fatalf("reference %q crossed its root: %d", p, got.Code)
		}
	}
}
