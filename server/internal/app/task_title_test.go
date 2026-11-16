package app

import (
	"strings"
	"testing"
)

func TestFirstInputNamesPlaceholderTasksAndPreservesManualTitles(t *testing.T) {
	s := testServer(t)
	task, err := s.store.createTask("test-owner", "新任务")
	if err != nil {
		t.Fatal(err)
	}
	title, err := s.store.nameFirstInput("test-owner", task.ID, "帮我制作一个天上的星星的科普PPT\n\n附件：private-path")
	if err != nil || title != "制作一个天上的星星的科普PPT" {
		t.Fatal(title, err)
	}
	if strings.Contains(title, "private-path") {
		t.Fatal("attachment metadata entered title")
	}
	s.store.db.Exec(`UPDATE qd_tasks SET title=? WHERE id=?`, "手动保存的名称", task.ID)
	title, err = s.store.nameFirstInput("test-owner", task.ID, "另一个需求")
	if err != nil || title != "手动保存的名称" {
		t.Fatal(title, err)
	}
	s.store.db.Exec(`UPDATE qd_tasks SET title=? WHERE id=?`, "新任务", task.ID)
	s.store.db.Exec(`INSERT INTO qd_messages(task_id,turn,question,answer) VALUES(?,0,'first','done')`, task.ID)
	title, err = s.store.nameFirstInput("test-owner", task.ID, "后来的输入")
	if err != nil || title != "新任务" {
		t.Fatal("later turn replaced manual title", title, err)
	}
	if _, err = s.store.nameFirstInput("another-owner", task.ID, "unowned"); err == nil {
		t.Fatal("cross-owner naming was allowed")
	}
}

func TestInputTitleTruncatesUnicodeWithoutBreakingCharacters(t *testing.T) {
	actual := inputTitle("请帮我" + strings.Repeat("星", 40))
	if actual != strings.Repeat("星", 28)+"…" {
		t.Fatal(actual)
	}
}
