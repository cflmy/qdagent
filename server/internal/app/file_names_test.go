package app

import "testing"

func TestReadableFileNamesPreserveStorageIdentity(t *testing.T) {
	for path, want := range map[string]string{
		"uploads/123abc456def-项目说明.pdf":             "项目说明.pdf",
		"uploads/123abc456def-abcdef123456-原文件.txt": "abcdef123456-原文件.txt",
		"solution/123abc456def-业务源码.mq.md":          "123abc456def-业务源码.mq.md",
		"uploads/原文件.txt":                           "原文件.txt",
		"uploads/nothex456def-report.pdf":           "nothex456def-report.pdf",
	} {
		if got := readableFileName(path); got != want {
			t.Errorf("%s: got %q, want %q", path, got, want)
		}
	}
}

func TestRecordedArtifactTitlesDoNotRenameEngineeringEntries(t *testing.T) {
	workflow := map[string]any{"units": []any{map[string]any{"title": "研究/说明", "artifact": map[string]any{"path": "solution/documents/u0.md"}, "specification": map[string]any{"path": "solution/specifications/u0.intent.mq.md"}}}}
	names := recordedFileNames(workflow, []any{map[string]any{"path": "deliverables/random.docx", "title": "用户报告"}})
	for path, want := range map[string]string{"solution/documents/u0.md": "研究-说明.md", "solution/specifications/u0.intent.mq.md": "研究-说明·验收意图.mq.md", "deliverables/random.docx": "用户报告.docx"} {
		if names[path] != want {
			t.Errorf("%s: %q", path, names[path])
		}
	}
	if names["solution/index.mq.md"] != "" {
		t.Fatal("canonical index name replaced")
	}
	if titledFileName("report.md", "报告.md") != "报告.md" {
		t.Fatal("duplicate extension")
	}
}
