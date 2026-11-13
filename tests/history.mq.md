---
markup: occlusion
title: 旧档案损坏时继续阅读新回答
import:
  dialogue: ../pages/api/dialogue.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
---

只在 acceptance 根构造一份旧格式损坏档案。此前真实历史可能已经含有普通清单或不完整
表达式，新的合法回答不能因此一起失去阅读面。本测试不修改用户历史，也不把自动展示
回退说成历史迁移；原始档案保留，新回答通过官方临时文档继续按语法展示。

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 旧文字保留、当前链接按语法展示、历史前缀未被重写 |

边界同时检查三个对象：浏览器将得到的 HTML、档案中的历史前缀、单独保留的当前原文。
仅检查“返回了一个页面”不够，因为粗暴转义整个档案虽然可能可见，却会让新的合法函数
或链接失去语法展示；直接改写全部历史则会破坏原始材料，隐藏真正的修订需求。

| 动作 | 真实路径 | 断言目的 |
|---|---|---|
| 初始化坏历史 | 专用 session.mq.md | 明确模拟先前已存在的不可编译记录 |
| 移除专用旧索引 | acceptance 的 current.json | 让 begin_turn 从当前真实档案建立新边界 |
| 新增问题 | dialogue.begin_turn | 旧失败不应阻塞新的占位阅读 |
| 写入合法链接 | dialogue.set_answer | 新片段仍保留官方链接语义 |
| 检查旧前缀 | 从原生 fs 再次读 session | 临时展示不能悄悄覆盖全部旧记录 |
| 检查当前原文 | current-answer.txt | 转义与临时文档不能篡改模型实际输出 |

这里没有通过修改 Marqdo 解析器来放宽语法。回退发生在 qdagent 选择阅读文档的边界：
旧档案作为明确的原文预览，新答文仍单独进入官方语法渲染。若这些尝试也失败，应该返回
真实错误而不是无界重试；这项成功仅证明给定坏历史样例可以恢复可读，不保证任意文件损坏
都能自动处理。文件编码、磁盘错误与缺失插件仍保留原始诊断。

检查临时阅读结果时，需要确认的是当前链接已经成为可跳转的官方链接。如果仅看到链接标题文字，可能是实现把新回答也转成了字面文本；那样虽然避免了编译失败，却无法满足前端复用 View 语法展示的目标。因此测试检查实际 href，而不是在源码字符串中搜索一个地址。

检查历史保留时，比较的是档案仍以原始坏历史作为前缀。新问题和新回答本来就应该追加，但先前那段不能被自动转义、删除或改写成一个看似正确的条件分支。临时渲染文件可以使用安全展示形式，用户历史真相与模型原文则各自保留。

这个样例也验证了运行根隔离。只要当前目录不是专用 acceptance 根，函数就先返回错误；即使开发者误在正式工程运行，也不会为了构造坏历史而清空用户记录。它没有隐藏的清理步骤，也不删除诊断文件，失败现场仍能由原生 fs 阅读。

本样例使用新的合法超链接作为语义证据，因为它能在最终 HTML 中得到清楚的可跳转目标。测试不访问该远端地址，不需要网络才能验证链接排版；只读渲染负责产生结构，而实际跳转仍由读者决定。

旧历史中的编号内容故意保持不可编译，以确认实现没有通过偷偷“修好”样例来绕过预览分支。验收结束后仍能在真实档案中看到原始编号；只有专用临时文档包含适合阅读的转义版本。

We **cwd = [确认隔离根](sys.cwd())**.
1. not [只允许专用测试根](text.ends_with(text=`cwd`, suffix="/.marqdo/acceptance"))
  Return *[拒绝修改用户历史](result.error(code="test.root", message="use acceptance root", operation="run"))*.
We **history = "---\nmarkup: occlusion\ntitle: 旧档案样例\n---\n\n## 旧回合\n\n1. 旧版本留下的普通编号内容。\n"**.
We **_ = [写入专用旧历史](fs.write_text(path="data/dialogue/proj/session.mq.md", text=`history`))**.
1. fs.exists(path="data/dialogue/proj/current.json")
  We **_ = [清除专用旧索引](fs.remove_file(path="data/dialogue/proj/current.json"))**.
We **opened = [新问题应仍能阅读](dialogue.begin_turn(question="这是新的问题。"))**.
1. json.get(value=`opened`, key="ok") == False
  Return *opened*.
We **answer = "阅读[项目文档](https://example.org/manual)以了解当前能力。"**.
We **rendered = [当前链接仍使用正式语法](dialogue.set_answer(answer=`answer`))**.
1. json.get(value=`rendered`, key="ok") == False
  Return *rendered*.
1. not [旧内容仍然可见](text.contains(text=access(`rendered`, "html"), sub="旧版本留下的普通编号内容")) or not [链接确实被官方渲染](text.contains(text=access(`rendered`, "html"), sub="href=\"https://example.org/manual\""))
  Return *[历史或当前语义丢失](result.error(code="test.history_preview", message="history or current link missing", operation="run"))*.
We **stored = [读取未迁移的真实档案](fs.read_text(path="data/dialogue/proj/session.mq.md"))**.
1. not [原始历史前缀保留](text.starts_with(text=`stored`, prefix=`history`)) or fs.read_text(path="data/dialogue/proj/current-answer.txt") != `answer`
  Return *[展示回退篡改了原始材料](result.error(code="test.history_raw", message="history or answer changed", operation="run"))*.
Return *[旧历史与当前语法分别可读](result.ok(value="legacy history preview / current semantic link / original preserved"))*.
