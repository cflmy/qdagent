---
markup: occlusion
title: 前后端协议与只读 View 验收
import:
  dialogue: ../pages/api/dialogue.mq.md
  begin: ../pages/api/chat.mq.md
  pull: ../pages/api/chat_pull.mq.md
  stop: ../pages/api/chat_stop.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

本测试不调用模型，不依赖网络回答，也不改写真实会话。请把 fs-root 指到本工程专用
.marqdo/acceptance，先安装同一份 ABI 动态库与 worker。每条结论来自真实函数和文件，
不是返回固定通过标志。失败保留阶段名与诊断，供开发者直接定位调用边界。

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 所有协议和渲染断言都成立时才返回成功 |

测试故意包含答区分隔符、Markdown 结构和不能执行的文件写操作。会话正文应该能读到
这些内容，而不应造成档案截断、HTML 注入或任意文件写入。读者看到的是官方渲染器的片段，
最终结果和执行授权保持分开；未知的模型请求不在这项离线测试的证明范围内。

本套件从真实端点函数开始，读取它们实际写出的会话与响应。除了模型选择 none 外，没有替换业务处理函数。测试会初始化专用档案，因此在错误的 fs-root 调用必须直接拒绝，而不能“为了测试方便”覆盖当前工作区的会话。

| 案例 | 真实动作 | 必须成立的断言 |
|---|---|---|
| 隔离运行根 | sys.cwd 检查专用 acceptance 后缀 | 非专用目录不进行任何档案重置 |
| 真实 begin | 提交测试问题与 client_gen=73 | 响应身份仍为 73，不被内部回合号替换 |
| 首次 pull | 使用同一代数完成检索式回答 | done=True，片段包含官方 mq-document |
| 重复 pull | 再读取已完成的同一检索式回合 | reply 与第一次一致，不能从空 NDJSON 丢掉正文 |
| 过期 stop | 请求第 72 代 | 返回失败，job.json 字节不变 |
| 回答中含分隔词 | 写入普通“答”和后续正文 | 稳定索引不能被回答内容误导 |
| 回答含文件操作意图 | 通过官方只读 View 展示写文件调用 | must-not-exist 仍不存在 |
| 长答案改成短答案 | 再调用 set_answer 写较短正文 | 上一版尾部不会残留在档案中 |

为什么同时检查 reply、page_html 和真实文件：文本正确不代表前端拿到了官方渲染片段；HTML 中有内容也不代表存档边界正确；一次错误返回还不保证旧请求没有偷偷修改新作业。每项证据对应不同层，缺少其中一项都可能掩盖曾经出现的前后端配合问题。

第 73 代是这份隔离协议样例的固定身份，不是正式客户端永久使用的号码。真实客户端在自己的直接事件入口递增代数，服务端保存并在 pull、stop 中比对。固定代数让回归可重复，也让“旧停止不改新回合”具有清楚的比较对象。测试数据不能被复用为生产任务身份。

只读测试用的文件写调用仍是合法 Marqdo 展示素材。预期不是让解析器完全看不懂它，而是让阅读面解释其语义却不执行副作用。这样才能同时保留代码即文档的阅读价值和明确执行授权的边界；把所有内容转成普通字符串虽然没有副作用，却不能证明官方语法展示可用。

本套件不评估模型质量、浏览器排版美观或多用户隔离。它证明当前最小对话协议和官方阅读面的关键边界；失败会留下实际文件和阶段代码，便于直接定位源码函数，而不是用一个固定“通过”表隐藏未运行的步骤。

测试使用真实文件检查副作用是否发生，因此 must-not-exist 必须在干净验收根中不存在。如果维护者手工创建了同名文件，断言会失败，这是保留现场而非覆盖文件的刻意选择；应先确认它只属于专用测试，再明确清理。正式数据根中的同名文件不应被本套件触碰。

重复运行时，current.json 由套件自己的初始化移除，档案重新写种子，随后 begin 建立新的稳定边界。旧传输则由真实 reset_job 先停止；这比仅把完成标记删掉更接近正常用户重新提问的恢复过程。每次失败都应查看对应阶段，而不是因为先前某轮已经通过就忽略本轮诊断。

| 模型格式边界 | 实际输入与观察 | 要防止的回归 |
|---|---|---|
| 普通编号清单 | 输入不是合法条件的数字加点清单 | 取消或轮询不能因模型格式错误永久失去界面 |
| 模型自带波浪号围栏 | 原文同时包含开始与结束标记 | 不用不兼容的围栏包裹规则截断答文 |
| 模型自带反引号围栏 | 原文中继续出现代码围栏 | 预览仍保留内容，不让其重新进入语法解析 |
| 原文文件 | current-answer.txt 与输入逐字比较 | 展示转义不能篡改实际模型输出 |
| 预览可见数字 | HTML 中仍有正常的数字加点文字 | 不把反斜线和字符实体作为乱码贴到页面 |
| 后续恢复 | 用完整普通段落再次 set_answer | 历史里不能残留上次原文预览说明 |

这些输入不是让模型配合生成的“理想回答”，而是刻意违反当前语法约定的真实边界样例。测试需要证明系统既能解释合法 Marqdo，又能在模型暂时给出不合法内容时继续提供可读结果。只给提示词增加格式要求并不能构成保证，因为模型仍可能忽略它或在半个流式片段中尚未完成表达式。

预览不承担语法修复。它不能把普通清单猜成条件分支，更不能替模型补出一个会执行的函数。当前实现只把控制标记转成普通可见文字，并保留未经改写的原文；因此测试分别检查了展示结果与原始文件，而不是只看函数是否返回 ok。

恢复断言也不能省略。如果系统一旦进入原文预览就永久使用预览模式，那么后续已经合法的函数、链接与表达式仍无法发挥官方 View 的优势。测试在同一个稳定答区内再次提供合法片段，要求真实语法渲染路径恢复，并确认上一次预览说明不再残留。

这项边界与前面的只读副作用测试相辅相成：合法可执行语句需要被看懂但不能执行，非法或未完成语句需要被保留但不能伪装成合法代码。两者都必须由正式会话函数和官方渲染器走完，测试不能用自己拼接的固定 HTML 替代它们。

预览检查发生在同一个当前回合，随后恢复仍使用同一稳定前缀。这样能验证切换显示形式不会改变答区身份，也不会让下一拍把旧尾部或预览说明重新拼回正常答案中。

We **cwd = [确定隔离根](sys.cwd())**.
1. not [只允许测试根](text.ends_with(text=`cwd`, suffix="/.marqdo/acceptance"))
  Return *[拒绝覆盖真实会话](result.error(code="test.root", message="use .marqdo/acceptance", operation="run"))*.
We **_ = [创建会话目录](fs.make_dirs(path="data/dialogue/proj"))**.
We **_ = [初始化本次测试档案](fs.write_text(path="data/dialogue/proj/session.mq.md", text=dialogue.seed()))**.
1. [清理旧测试索引](fs.exists(path="data/dialogue/proj/current.json"))
  We **_ = [移除本次隔离索引](fs.remove_file(path="data/dialogue/proj/current.json"))**.
We **opened = [真实发起一轮](begin.main(q="测试提问", model="none", kb="none", client_gen=73))**.
1. access(`opened`, "gen") != 73
  Return *[代数不一致](result.error(code="test.begin", message=str(`opened`), operation="run"))*.
We **finished = [通过真实拉取完成检索式回合](pull.main(gen=73))**.
1. not access(`finished`, "done") or not [确实返回官方文档](text.contains(text=access(`finished`, "page_html"), sub="mq-document"))
  Return *[对话未使用 View](result.error(code="test.render", message=str(`finished`), operation="run"))*.
We **again = [再次拉取已完成的检索式回合](pull.main(gen=73))**.
1. access(`finished`, "reply") != access(`again`, "reply")
  Return *[已完成回合发生变化](result.error(code="test.repeat_pull", message="retrieval answer lost", operation="run"))*.
We **before = [保留当前作业](fs.read_text(path="data/dialogue/proj/job.json"))**.
We **stale = [旧停止请求必须失败](stop.main(gen=72))**.
1. access(`stale`, "ok") != False or `before` != fs.read_text(path="data/dialogue/proj/job.json")
  Return *[旧停止修改了新回合](result.error(code="test.stale", message=str(`stale`), operation="run"))*.

模型生成的文件写语句只作为源码阅读，不应因为展示而执行。正文里的答区分隔符也必须
原样保留；这类文本不能被用作当前回合的持久身份，否则下一拍就会覆盖错误的位置。

We **answer = "这是一段说明。\n\n答\n\n仍是同一段回答。\n\n**[只展示写入意图](fs.write_text(path=\"must-not-exist\", text=\"unsafe\"))**"**.
We **rendered = [写入并只读渲染](dialogue.set_answer(answer=`answer`))**.
1. [显示意图真的写了文件](fs.exists(path="must-not-exist"))
  Return *[只读边界失效](result.error(code="test.executed", message="view executed answer", operation="run"))*.
We **shortened = [用较短的新回答替换整段](dialogue.set_answer(answer="新回答完整替换旧回答。"))**.
1. [旧答区残留](text.contains(text=access(`shortened`, "source"), sub="仍是同一段回答"))
  Return *[答区发生截断残留](result.error(code="test.boundary", message="stale suffix", operation="run"))*.
We **invalid_input = "1. 这是普通清单，不是合法分支。\n\n~~~text\n保留模型自带围栏\n~~~\n\n\x60\x60\x60text\n保留模型自带反引号围栏\n\x60\x60\x60"**.
We **invalid = [编号清单保留原文预览](dialogue.set_answer(answer=`invalid_input`))**.
1. json.get(value=`invalid`, key="ok") == False
  Return *invalid*.
1. not [明确标注预览](text.contains(text=access(`invalid`, "html"), sub="原文预览")) or not [保留原始清单](text.contains(text=access(`invalid`, "source"), sub="这是普通清单"))
  Return *[错误语法导致阅读丢失](result.error(code="test.preview", message="invalid source was not preserved", operation="run"))*.
1. not [预览恢复可见数字而非乱码](text.contains(text=access(`invalid`, "html"), sub="1. 这是普通清单"))
  Return *[预览不够可读](result.error(code="test.preview_literal", message="visible numbering changed", operation="run"))*.
1. fs.read_text(path="data/dialogue/proj/current-answer.txt") != `invalid_input`
  Return *[模型原文被改写](result.error(code="test.preview_raw", message="original answer changed", operation="run"))*.
We **recovered = [后续合法内容恢复正常阅读](dialogue.set_answer(answer="后续完整段落已恢复。"))**.
1. [预览说明不应残留](text.contains(text=access(`recovered`, "source"), sub="原文预览"))
  Return *[下一拍未恢复正式渲染](result.error(code="test.preview_recovery", message="stale preview", operation="run"))*.
Return *[真实链路通过](result.ok(value="begin/pull/generation/readonly/render/answer-boundary"))*.
