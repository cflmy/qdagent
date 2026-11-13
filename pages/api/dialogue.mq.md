---
markup: occlusion
title: Markdown 对话与同构阅读
import:
  store: ../../ext/qdagent/store.mq.md
  ui: ../agent/ui.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

对话档案现在是 session.md，模型可以正常使用 Markdown 的清单、强调与围栏。
不再把模型回复送入 Marqdo 编译器，也不要求模型学会 Marqdo 才能说话。
执行仍由登记工具中的 marqdo call 完成；阅读不会执行回复里的函数或命令。

## seed

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 空对话的普通 Markdown |

空档案是说明，不包含伪造的模型回答或已完成任务。旧的 .mq.md 档案会复制导入，
原始文件保持原样，后续对话只写新的 Markdown 文件。

Return *"# 求道\n\n在当前任务中提问，或让智能体使用已登记工具完成工作。\n"*.

## ensure

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 实际 Markdown 档案，首次才建立 |

会话根由显式 CLI 文件根指定。新旧档案分开，不能用新格式直接覆盖用户旧记录。
导入仅保留旧材料的文字，不解释其中的 Marqdo 语句；同一个旧格式表达式即使无法编译，
也不会阻塞普通 Markdown 阅读或新的任务执行。

A new session starts with explanatory text, not a fabricated assistant turn. When a legacy session.mq.md exists, import its text once into a different file. Later edits affect session.md only. A malformed legacy expression can therefore remain readable without preventing new conversations. This operation does not try to reconstruct execution receipts from old prose; those receipts have their own event and effect records.

We **_ = [建立会话数据目录](fs.make_dirs(path="data/dialogue/proj"))**.
1. fs.exists(path="data/dialogue/proj/session.md")
  Return *[读取 Markdown 原文](fs.read_text(path="data/dialogue/proj/session.md"))*.
We **source = [首次对话说明](seed())**.
1. fs.exists(path="data/dialogue/proj/session.mq.md")
  We **source = "# 历史对话\n\n" + fs.read_text(path="data/dialogue/proj/session.mq.md")**.
We **_ = [另存新的 Markdown 档案](fs.atomic_write(path="data/dialogue/proj/session.md", text=`source`))**.
Return *source*.

## append_turn

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| question | text | required | 用户本轮问题 |
| answer | text | "正在处理任务…" | 当前回答或占位 |
| scrub | bool | False | 保留既有调用兼容，不改写 Markdown |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 追加本轮后的真实档案 |

Use `question`, `answer`="正在处理任务…" and `scrub`=False。
边界保存在 current-markdown.json，不再从模型文字中寻找“答”。模型可以自由写同样的词，
后续流或最终结果始终替换当前完整答区。序号来自已有索引，显示标题不是任务身份。
The answer remains ordinary Markdown. No sanitizer rewrites its programming syntax; the existing
Markdown renderer owns safe HTML output, while execution remains a separate registered action.

The stored prefix is an explicit boundary rather than a marker searched inside generated text. A question or answer may contain headings, the word 求道, or a fenced example without changing which answer gets replaced. Refreshing the reader does not append another turn.

We **source = [保留之前的对话](ensure())**.
We **turn = 1**.
1. fs.exists(path="data/dialogue/proj/current-markdown.json")
  We **previous = [读取稳定索引](fs.read_json(path="data/dialogue/proj/current-markdown.json"))**.
  We **turn = access(`previous`, "turn") + 1**.
We **prefix = `source` + "\n\n## 第 " + str(`turn`) + " 轮\n\n### 你\n\n" + `question` + "\n\n### 求道\n\n"**.

`current` =

| turn | prefix | question |
|---|---|---|
| `turn` | `prefix` | `question` |

We **_ = [保存独立 Markdown 边界](fs.atomic_write(path="data/dialogue/proj/current-markdown.json", text=json.stringify(value=`current`)))**.
We **_ = [保留原始答文](fs.atomic_write(path="data/dialogue/proj/current-answer.txt", text=`answer`))**.
We **next = `prefix` + `answer` + "\n"**.
We **_ = [更新 Markdown 档案](fs.atomic_write(path="data/dialogue/proj/session.md", text=`next`))**.
1. fs.exists(path="context.json")
  We **row = table.put(in=`current`, at="answer", value=`answer`)**.
  We **_ = [本轮消息落入 SQLite](store.record(context=fs.read_json(path="context.json"), kind="message", value=`row`))**.
Return *next*.

## replace_last_answer

| 参数 | 类型 | 说明 |
|---|---|---|
| answer | text | 当前完整 Markdown 回答 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 已保存的完整档案 |

Use `answer`。较短答案也会完整替换较长答案，不能留下旧尾部。
没有当前索引时只返回已有档案，不猜测旧材料边界；原文单独保留，供结果追查。
此函数只操作当前会话，不接受别的任务文件路径。

A short replacement must remove the entire previous answer, including its tail. For example, replacing a long numbered explanation with a one-line cancellation leaves exactly that one line after the stored prefix. The current-answer file keeps the same raw Markdown that appears in the archive. Rendering can be repeated later without modifying the text or interpreting its code fences.

We **source = [确认真实档案](ensure())**.
1. not fs.exists(path="data/dialogue/proj/current-markdown.json")
  Return *source*.
We **current = [读取本轮边界](fs.read_json(path="data/dialogue/proj/current-markdown.json"))**.
We **source = access(`current`, "prefix") + `answer` + "\n"**.
We **_ = [保留未改写的模型原文](fs.atomic_write(path="data/dialogue/proj/current-answer.txt", text=`answer`))**.
We **_ = [原子更新档案](fs.atomic_write(path="data/dialogue/proj/session.md", text=`source`))**.
1. fs.exists(path="context.json")
  We **row = table.put(in=`current`, at="answer", value=`answer`)**.
  We **_ = [真实答文同步 SQLite](store.record(context=fs.read_json(path="context.json"), kind="message", value=`row`))**.
Return *source*.

## paint_chat

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | source、html 和稳定 ans_sel |

直接复用 Web Markdown 渲染器与阅读器视觉容器，源文本不进入 Marqdo 解释器。
清单与加粗按 Markdown 显示，原始 HTML 不成为活动标签。历史与本轮答文分别返回，执行区域位于两者之间。稳定容器让页面只替换回答，
不会因为一次回复更新而重新建立工具面板、会话控件或用户展开的执行详情。

The saved prefix already contains previous turns and the latest user question, ending at the assistant label. Return that as history HTML and render current-answer.txt independently. The shell places the stable event region between those two targets, so the user reads question, public actions and answer in order. The complete source archive still includes the answer exactly once; splitting its visual projection does not rewrite history or create a new message. A new session with no current index renders the initial explanation and an empty answer. Both fragments use the same safe Markdown renderer, so code examples remain content and cannot acquire execution permission.

We **source = [读取实际 Markdown](ensure())**.
We **history = `source`** and **answer = ""**.
1. fs.exists(path="data/dialogue/proj/current-markdown.json")
  We **current = [真实的消息边界](fs.read_json(path="data/dialogue/proj/current-markdown.json"))**.
  We **history = access(`current`,"prefix")**.
  We **answer = [独立的当前 Markdown 回复](fs.read_text(path="data/dialogue/proj/current-answer.txt"))**.
We **history_html = [问题之前的完整历史](ui.markdown(source=`history`, id="qd-history-document"))**.
1. `history` == seed()
  We **history_html = ""**.
We **html = [兼容调用仍得到完整档案](ui.markdown(source=`source`))**.
We **answer_html = [经过之后的实际回答](ui.markdown(source=`answer`))**.

`out` =

| source | html | history_html | answer_html | ans_sel |
|---|---|---|---|---|
| `source` | `html` | `history_html` | `answer_html` | "#qd-answer-document" |

Return *out*.

## begin_turn

| 参数 | 类型 | 说明 |
|---|---|---|
| question | text | 本轮原始问题 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 原文与真实占位阅读片段 |

Use `question`。建立本轮边界后立即提供可读占位，让界面能及时显示已接收任务。
占位不是模型输出，也不是某个工具已经完成的声明；真实进度由独立事件日志记录。

We **_ = [追加实际问题](append_turn(question=`question`))**.
Return *[生成阅读片段](paint_chat())*.

## set_answer

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| answer | text | required | 普通 Markdown 回答 |
| scrub | bool | False | 兼容字段，不进行语法改写 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已保存的原文和真实阅读片段 |

Use `answer` and `scrub`=False。模型回复是内容，不是本地脚本。
只有登记工具能形成执行记录；显示了一段命令不会运行它，写了一句完成也不会补造工具结果。
调用后可以直接使用 html 与 ans_sel，不需要知道 Markdown 或 Marqdo 的实现语法。

We **_ = [保存实际回答](replace_last_answer(answer=`answer`))**.
Return *[复用现有 Markdown 排版](paint_chat())*.

## commit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| question | text | required | 用户问题 |
| answer | text | required | 实际 Markdown 回答 |
| scrub | bool | False | 兼容字段 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 一轮完整对话的真实阅读结果 |

Use `question`, `answer` and `scrub`=False。这适合已经得到完整回复的调用方，
不会替代后台任务状态机，也不执行回复中看起来像工具调用的文字。

We **_ = [保存完整回合](append_turn(question=`question`, answer=`answer`, scrub=`scrub`))**.
Return *[阅读保存的真实内容](paint_chat())*.
