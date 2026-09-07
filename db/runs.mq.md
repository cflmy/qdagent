## schema

`fields` =

| 字段 | 类型 | 可空 | 唯一 |
|------|------|------|------|
| id | integer | false | |
| slug | text | false | true |
| title | text | false | |
| summary | text | true | |
| body | text | true | |
| created_at | text | true | |

**`fields`**

## seed

欢迎笔记：正文本身就是一份 .mq.md，可被 marqdo view 打开。

`rows` =

| slug | title | summary | body |
|------|-------|---------|------|
| welcome | 欢迎使用求道 | 笔记即程序：每次执行沉淀为 .mq.md | "---\ntitle: 欢迎使用求道\ndescription: qdagent seed note\n---\n\n# 任务\n\n建立求道智能体的第一份笔记。\n\n# 结果\n\n这是一份 Marqdo 源文件，不是聊天记录。\n\n- 在笔记库浏览与检索\n- 用 marqdo view data/runs 看结构\n- 用 marqdo run 求道-询问.mq.md 再沉淀一次\n" |

**`rows`**
