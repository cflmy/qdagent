package app

import "strings"

// Input naming is local display formatting; it does not generate a model prompt.
func inputTitle(input string) string {
	line := strings.TrimSpace(strings.SplitN(input, "\n", 2)[0])
	line = strings.TrimSpace(strings.TrimLeft(line, "#> "))
	for _, prefix := range []string{"请你", "请帮我", "麻烦帮我", "帮我", "请"} {
		if strings.HasPrefix(line, prefix) {
			line = strings.TrimSpace(strings.TrimPrefix(line, prefix))
			break
		}
	}
	line = strings.Join(strings.Fields(line), " ")
	runes := []rune(line)
	if len(runes) > 28 {
		line = string(runes[:28]) + "…"
	}
	return line
}

func (s *Store) nameFirstInput(owner, id, input string) (string, error) {
	task, err := s.task(owner, id)
	if err != nil {
		return "", err
	}
	if task.Title != "新任务" && task.Title != "文件工作区" {
		return task.Title, nil
	}
	title := inputTitle(input)
	if title == "" {
		return task.Title, nil
	}
	// The conditional write preserves a concurrent manual rename and later turns.
	_, err = s.db.Exec(`UPDATE qd_tasks SET title=? WHERE id=? AND owner=? AND title=? AND NOT EXISTS(SELECT 1 FROM qd_messages WHERE task_id=?)`, title, id, owner, task.Title, id)
	if err != nil {
		return "", err
	}
	current, err := s.task(owner, id)
	return current.Title, err
}
