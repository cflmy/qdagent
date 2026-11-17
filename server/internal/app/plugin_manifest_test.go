package app

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPluginListAndToggleReadSharedMarqdoInstallationDocument(t *testing.T) {
	s := testServer(t)
	root := s.store.root
	project, e := filepath.Abs("../../..")
	if e != nil {
		t.Fatal(e)
	}
	if e = os.Symlink(filepath.Join(project, "lib"), filepath.Join(root, "lib")); e != nil {
		t.Fatal(e)
	}
	source, e := os.ReadFile(filepath.Join(project, "ext/plugins.mq.md"))
	if e != nil {
		t.Fatal(e)
	}
	path := filepath.Join(root, "ext/plugins.mq.md")
	os.WriteFile(path, source, 0600)
	os.MkdirAll(filepath.Join(root, "ext/browser"), 0700)
	os.WriteFile(filepath.Join(root, "ext/browser/index.mq.md"), []byte("## open\n\n读取实际来源。\n"), 0600)
	response := request(s, "GET", "/api/plugins", "")
	if response.Code != 200 {
		t.Fatal(response.Body.String())
	}
	var body struct {
		Plugins []map[string]any `json:"plugins"`
	}
	if e = json.Unmarshal(response.Body.Bytes(), &body); e != nil {
		t.Fatal(e)
	}
	found := false
	for _, item := range body.Plugins {
		if item["id"] == "browser" {
			found = true
			if item["available"] != true {
				t.Fatal("registered browser absent")
			}
		}
	}
	if !found || len(body.Plugins) != 16 {
		t.Fatal("shared manuscript was not projected")
	}
	if request(s, "PATCH", "/api/plugins/browser", `{"enabled":false}`).Code != 200 || s.store.pluginEnabled("test-owner", "browser") {
		t.Fatal("browser preference not persisted")
	}
	// A new registered extension appears without a Go source change or stale cache.
	source = []byte(strings.Replace(string(source), "| 10 |", "| 13 | \"extra\" | \"新增可读插件\" | \"\" | \"ext/extra/index.mq.md\" | \"新能力\" | \"\" |\n| 10 |", 1))
	os.WriteFile(path, source, 0600)
	response = request(s, "GET", "/api/plugins", "")
	if response.Code != 200 || !strings.Contains(response.Body.String(), "新增可读插件") {
		t.Fatal("installation document edit did not refresh")
	}
}
