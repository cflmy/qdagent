package app

import "testing"

func TestOfficeTreeKeepsDeliverablesAndSourcesButHidesPackageParts(t *testing.T) {
	artifacts := []any{map[string]any{"path": "artifacts/version/document.pptx", "kind": "pptx", "title": "报告", "source": "artifacts/version/source.md"}, map[string]any{"path": "artifacts/pdf/source.pdf", "kind": "pdf", "source": "artifacts/version/source.md"}}
	visible, roots := officeFileVisibility(artifacts)
	for _, file := range []string{"artifacts/version/document.pptx", "artifacts/version/source.md", "artifacts/pdf/source.pdf", "notes/package/readme.md", "uploads/actual.docx"} {
		if hiddenOfficePart(file, false, visible, roots) {
			t.Fatal("hidden real user file", file)
		}
	}
	for _, file := range []string{"artifacts/version/package/word/document.xml", "artifacts/version/verified/word/document.xml", "artifacts/pdf/source.pptx", "artifacts/pdf/profile/user/registrymodifications.xcu"} {
		if !hiddenOfficePart(file, false, visible, roots) {
			t.Fatal("leaked support part into file tree", file)
		}
	}
	if !hiddenOfficePart("artifacts/version/package", true, visible, roots) {
		t.Fatal("package directory is visible")
	}
	names := recordedFileNames(nil, artifacts)
	if names["artifacts/version/source.md"] != "报告·源稿.md" {
		t.Fatal(names)
	}
}
