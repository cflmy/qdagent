package app

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLargeBinaryPreviewOnlyReturnsMetadataAndRetainsOwnership(t *testing.T) {
	s := testServer(t)
	created := request(s, "POST", "/api/tasks", `{"title":"large preview"}`)
	var task Task
	json.Unmarshal(created.Body.Bytes(), &task)
	root := s.workspace(task)
	os.MkdirAll(filepath.Join(root, "uploads"), 0700)
	os.WriteFile(filepath.Join(root, "uploads/large.pdf"), []byte("%PDF-1.4\n"+strings.Repeat(" ", 1024*1024)), 0600)
	response := request(s, "GET", "/api/tasks/"+task.ID+"/preview?path=uploads/large.pdf", "")
	if response.Code != 200 || !strings.Contains(response.Body.String(), `"kind":"binary"`) {
		t.Fatal(response.Code, response.Body.String())
	}
	if len(response.Body.Bytes()) > 512 {
		t.Fatal("binary bytes entered metadata response")
	}
	os.WriteFile(filepath.Join(root, "uploads/large.txt"), []byte(strings.Repeat("x", 1024*1024)), 0600)
	if request(s, "GET", "/api/tasks/"+task.ID+"/preview?path=uploads/large.txt", "").Code != 200 {
		t.Fatal("large text did not enter the bounded file reader")
	}
	s.auth.dev = "another-owner"
	if request(s, "GET", "/api/tasks/"+task.ID+"/download?path=uploads/large.pdf", "").Code != 404 {
		t.Fatal("preview bypassed task ownership")
	}
}

func TestOpaqueViewerCanLoadPublicAssetsButCannotReadPrivateAPIs(t *testing.T) {
	s := testServer(t)
	os.MkdirAll(filepath.Join(s.frontend, "assets"), 0700)
	os.WriteFile(filepath.Join(s.frontend, "assets/viewer.js"), []byte("export {};"), 0600)
	os.WriteFile(filepath.Join(s.frontend, "file-viewer.html"), []byte("<html></html>"), 0600)
	asset := request(s, "GET", "/assets/viewer.js", "")
	if asset.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatal("isolated preview cannot load its public module")
	}
	document := request(s, "GET", "/file-viewer.html", "")
	policy := document.Header().Get("Content-Security-Policy")
	if !strings.Contains(policy, "form-action 'none'") {
		t.Fatal("viewer lacks network and document confinement")
	}
	// The sandboxed frame has an opaque origin, so "self" matches nothing:
	// the worker/module policy must name the serving host explicitly or the
	// isolated PDF worker can never be loaded.
	if !strings.Contains(policy, "127.0.0.1") || !strings.Contains(policy, "worker-src") {
		t.Fatalf("viewer policy must name the serving host for worker/module loads: %s", policy)
	}
	if request(s, "GET", "/api/models", "").Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("asset CORS policy leaked into account APIs")
	}
}
