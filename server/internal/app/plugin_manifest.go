package app

// Installation metadata comes from the same inert Marqdo table used by the
// runtime permission document. This cache does not register business tools.
import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type installedPlugin struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	ABI         string `json:"abi"`
	Entry       string `json:"entry"`
	Description string `json:"description"`
}
type pluginManifestCache struct {
	mu      sync.Mutex
	mtime   int64
	size    int64
	checked time.Time
	entries []installedPlugin
	err     error
	loaded  bool
}

func (s *Server) installedPlugins() ([]installedPlugin, error) {
	c := &s.pluginsCache
	c.mu.Lock()
	defer c.mu.Unlock()
	file := filepath.Join(s.store.root, "ext/plugins.mq.md")
	info, err := os.Stat(file)
	if err != nil || info.Size() > 65536 {
		return nil, errors.New("plugin installation manuscript missing or oversized")
	}
	if c.loaded && c.mtime == info.ModTime().UnixNano() && c.size == info.Size() && (c.err == nil || time.Since(c.checked) < 2*time.Second) {
		return c.entries, c.err
	}
	c.loaded = true
	c.mtime = info.ModTime().UnixNano()
	c.size = info.Size()
	c.checked = time.Now()
	c.entries, c.err = s.readInstalledPlugins()
	return c.entries, c.err
}
func (s *Server) readInstalledPlugins() ([]installedPlugin, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	args, _ := json.Marshal(map[string]any{"path": "ext/plugins.mq.md", "title": "installed"})
	cmd := exec.CommandContext(ctx, env("MARQDO_BIN", "marqdo"), "call", filepath.Join(s.store.root, "lib/document.mq.md"), "read_table", "--args-json", "-", "--effects", "fs.read", "--fs-root", s.store.root, "--json")
	cmd.Dir = s.store.root
	cmd.Stdin = bytes.NewReader(args)
	cmd.Env = append(os.Environ(), "MARQDO_LIB="+filepath.Join(s.store.root, "lib"), "MARQDO_EXT="+filepath.Join(s.store.root, "ext"))
	output := &entryOutput{}
	cmd.Stdout = output
	cmd.Stderr = &boundedLog{}
	if err := cmd.Run(); err != nil {
		return nil, errors.New("official plugin manuscript reader failed")
	}
	var result struct {
		OK      bool              `json:"ok"`
		Entries []installedPlugin `json:"result"`
	}
	if len(output.data) > 1<<20 || json.Unmarshal(output.data, &result) != nil || !result.OK || len(result.Entries) == 0 || len(result.Entries) > 64 {
		return nil, errors.New("invalid plugin installation manuscript")
	}
	seen := map[string]bool{}
	for _, entry := range result.Entries {
		if !validID(entry.ID) || entry.ID == "stdlib" || seen[entry.ID] || entry.Name == "" || !strings.HasPrefix(entry.Entry, "ext/"+entry.ID+"/") || filepath.Clean(entry.Entry) != entry.Entry || strings.Contains(entry.Entry, "..") || entry.ABI != "" && filepath.Base(entry.ABI) != entry.ABI {
			return nil, errors.New("invalid or duplicate installed plugin")
		}
		seen[entry.ID] = true
	}
	return result.Entries, nil
}
