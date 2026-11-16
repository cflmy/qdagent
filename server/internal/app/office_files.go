package app

import (
	"path"
	"strings"
)

// Office support parts stay on disk for audit, while the tree shows actual
// deliverables and their manuscripts. Other workspace directories are unaffected.
func officeFileVisibility(artifacts any) (map[string]bool, map[string]bool) {
	visible, roots := map[string]bool{}, map[string]bool{}
	entries, _ := artifacts.([]any)
	for _, value := range entries {
		entry, ok := value.(map[string]any)
		if !ok {
			continue
		}
		kind, _ := entry["kind"].(string)
		if kind != "docx" && kind != "pptx" && kind != "pdf" {
			continue
		}
		file, _ := entry["path"].(string)
		if !strings.HasPrefix(file, "artifacts/") || path.Clean(file) != file {
			continue
		}
		roots[path.Dir(file)] = true
		visible[file] = true
		if source, ok := entry["source"].(string); ok && path.Clean(source) == source {
			visible[source] = true
		}
	}
	return visible, roots
}
func hiddenOfficePart(relative string, directory bool, visible, roots map[string]bool) bool {
	for root := range roots {
		if relative == root || !strings.HasPrefix(relative, root+"/") {
			continue
		}
		if visible[relative] {
			return false
		}
		if directory {
			for file := range visible {
				if strings.HasPrefix(file, relative+"/") {
					return false
				}
			}
		}
		return true
	}
	return false
}
