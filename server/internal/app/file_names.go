package app

import (
	"path/filepath"
	"strings"
	"unicode"
)

func readableFileName(path string) string {
	name := filepath.Base(path)
	// Only upload names have this server-owned prefix. Preserve user-authored project names.
	if strings.HasPrefix(filepath.ToSlash(path), "uploads/") && len(name) > 13 && name[12] == '-' {
		for _, c := range name[:12] {
			if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
				return name
			}
		}
		return name[13:]
	}
	return name
}

// Titles are display metadata. The original relative path remains the file identity.
func titledFileName(path, title string) string {
	if base := filepath.Base(path); base == "index.mq.md" || base == "plan.mq.md" {
		return base
	}
	title = strings.TrimSpace(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || strings.ContainsRune(`/\<>:"|?*`, r) {
			return '-'
		}
		return r
	}, title))
	title = strings.Trim(title, ". ")
	if title == "" {
		return readableFileName(path)
	}
	runes := []rune(title)
	if len(runes) > 100 {
		title = string(runes[:100])
	}
	ext := filepath.Ext(path)
	if strings.HasSuffix(strings.ToLower(path), ".mq.md") {
		ext = ".mq.md"
	}
	if !strings.HasSuffix(strings.ToLower(title), strings.ToLower(ext)) {
		title += ext
	}
	return title
}

func artifactFileNames(artifacts any) map[string]string {
	names := map[string]string{}
	if entries, ok := artifacts.([]any); ok {
		for _, entry := range entries {
			if item, ok := entry.(map[string]any); ok {
				path, _ := item["path"].(string)
				title, _ := item["title"].(string)
				if theme, ok := item["theme"].(map[string]any); ok {
					if label, ok := theme["label"].(string); ok && label != "" {
						title += " · " + label
					}
				}
				if path != "" && title != "" {
					names[path] = titledFileName(path, title)
					if kind, _ := item["kind"].(string); kind == "docx" || kind == "pptx" {
						if source, ok := item["source"].(string); ok && source != "" {
							names[source] = titledFileName(source, title+"·源稿")
						}
					}
				}
			}
		}
	}
	return names
}

func (s *Server) downloadFileName(task Task, path string) string {
	var artifacts any
	readBoundedJSON(filepath.Join(s.workspace(task), ".agent/artifacts.json"), &artifacts)
	if name := artifactFileNames(artifacts)[path]; name != "" {
		return name
	}
	return readableFileName(path)
}
