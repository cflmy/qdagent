---
markup: occlusion
title: 已确认办公产物的交付接口
import:
  io: ../runtime/io.mq.md
  core: ../state.mq.md
  flow: ../policy.mq.md
  delivery: ../delivery.mq.md
  document: lib/document.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
  call: ../../../pages/control/call.mq.md
---

方案落地的当前可调用文稿。真实产物、工程整合与用户验收保持独立。

## section

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 章节或页标题 |
| body | text | required | 有来源的正文或精炼要点 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 一个实际内容章节 |

Use `heading`, `body`。

组织实际材料形成章节。报告按段落组织，演示按页组织，不把网页布局、模板处理或转换依赖写成内容。外部事实需有真实来源，不能用示例文字冒充已经研究。这个纯函数只形成原生记录。

`value` =

| heading | body |
|---|---|
| `heading` | `body` |

Return *value*.

## office

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| kind | text | required | docx 或 pptx |
| title | text | required | 实际文档题目 |
| sections | list | required | 由 section 形成的实际章节 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实办公插件返回的文件证据 |

Use `kind`, `title`, `sections`。

仅在方案落地阶段调用已经安装且用户启用的办公插件。可信上下文不属于模型参数，源文件、函数和效果由此明确调用给出，文档内容不是可执行命令。实际文件归当前任务工作区；生成失败不能声称已经创建。

kind 只能选择插件实际支持的 docx 或 pptx，title 用作可读题目，sections 包含真实标题与正文。不要把“计划写什么”当作已经完成的章节，也不要把整份可执行源码当作办公正文传入。内容中的引文、数字和来源仍需用户检查；文件容器有效不意味着事实正确或版式已通过人工验收。插件关闭时本函数明确失败，不静默换一种文件格式。

生成操作由固定文稿进入固定插件函数，当前模型不决定项目目录、动态库路径或进程参数。返回应含任务工作区内的实际文件路径与校验信息，前端按文件列表展示。需要多个产物时分别调用，随后通过 finish 形成统一的工程说明。已有文件的生成证据保留在执行事件中，不能由聊天中相同的文件名代替。

We **context = io.current()**.
We **permit = flow.authorize(context=`context`,phase="implement",role="deliver")**.
1. not access(`permit`,"ok")
  Return *permit*.
We **permit = io.require(context=`context`,id="office")**.
1. not access(`permit`,"ok")
  Return *permit*.
We **args = table.put(in=None,at="kind",value=`kind`)**.
We **args = table.put(in=`args`,at="title",value=`title`)**.
We **args = table.put(in=`args`,at="sections",value=`sections`)**.
We **args = table.put(in=`args`,at="context",value=`context`)**.
Return *call.invoke(file=(access(`context`,"project") + "/ext/office/index.mq.md"),function="create",arguments=`args`,root=access(`context`,"project"),effects="plugin,fs.read,fs.write,process.exec,environment.read,random.read")*.

## finish

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| narrative | text | required | 解释真实业务组合、输入、来源、结果与限制 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际整合成功后进入用户验收 |

Use `narrative`。

只整合源码、独立测试和公开规格都仍然有效的单元。把用户交流、业务说明和可调用逻辑写入实际工程入口；未接通项保持可见，最终由用户决定接受还是返工。整合会调用官方检查和真实入口冒烟，不把模型叙述当作证据。

传入 narrative 时要说明用户实际得到什么、调用时传入什么、各单元如何协作、没有实现哪些内容。不要只写“所有步骤已完成”，也不要重写另一份业务控制流。固定工程说明另有可阅读的文稿来源，随实际入口一起呈现；它描述的是执行边界和证据限制，不是替模型补造完成内容。用户确认针对当前源码摘要，审阅期间文件变化必须重新验证和提交。

本次调用成功后仍处于用户审阅阶段，不等于用户已经验收。检查失败会返回真实诊断，调用者需要修复失效单元或说明缺口。最终结果的业务可用性由用户判断，独立案例只覆盖明确声明的输入规则，不能据此推断所有输入或外部研究都正确。

组合说明分为业务叙述与真实工程机制。业务叙述由当前角色依据实际材料填写；附带的工程说明只陈述根文稿确实执行的依赖传递、独立测试、摘要检查和用户验收。它不为模型补造研究结论、外部操作或未发生的产物，也不能代替用户对业务内容的判断。

这一操作只提交本次审阅版本，用户的最终选择另有独立记录。

例如，两个独立函数各自返回固定正文时，说明应该明确它们都忽略输入，统一入口只是收集各自真实返回，不增加外部研究或格式转换。若工程包含依赖，应解释依赖值由前置函数实际产生，而不是从聊天猜测。存在尚未接通的外部能力时，说明应明确这项缺口及其影响，用户可以据此返工或接受有限范围。叙述需要覆盖来源与限制，但无需复制所有测试输入，更不应夹带密钥或私有模型配置。调用返回的路径用于打开真实工程入口，文件存在本身仍不是验收决定。

We **context = io.current()**.
We **permit = flow.authorize(context=`context`,phase="implement",role="deliver")**.
1. not access(`permit`,"ok")
  Return *permit*.
We **notes = io.native(context=`context`,operation="runtime_document",payload=table.put(in=None,at="path",value=(access(`context`,"project") + "/ext/root-skill/runtime/engineering.mq.md")))**.
We **explanation = `narrative` + "\n" + document.section(text=access(access(`notes`,"value"),"source"),title="assembly")**.
We **args = table.put(in=table.put(in=None,at="context",value=`context`),at="narrative",value=`explanation`)**.
We **integrated = call.invoke(file=(access(`context`,"project") + "/ext/root-skill/delivery.mq.md"),function="integrate",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,process.exec,environment.read")**.
1. not access(`integrated`,"ok")
  Return *integrated*.
Return *result.ok(value=table.put(in=None,at="path",value="solution/index.mq.md"))*.

## one

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | any | required | 一个实际的原生值 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 只含一个值的原生列表 |

Use `value`。

Marqdo 调用中的列表使用原生构造或 Markdown 数据表，不把 JSON 数组文本当成列表。one 可形成一个业务单元、一条案例或一级取值路径；它不解释值中的文本，不访问文件，也不改变任何阶段。

Return *table.append(list=table.empty_list(),item=`value`)*.

## pair

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| first | any | required | 第一个实际值 |
| second | any | required | 第二个实际值 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 有序的两个原生值 |

Use `first`, `second`。

用于形成两个选项、案例、业务单元或两级字段路径。它返回真正的列表，不是看起来像数组的一段字符串。更多值可以用 append 继续追加。所有值都保持自身类型，嵌套记录也不会被预先编码成文本。

Return *table.append(list=table.append(list=table.empty_list(),item=`first`),item=`second`)*.

## append

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| values | list | required | 已有的原生列表 |
| item | any | required | 要追加的实际值 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 保留已有顺序的新列表 |

Use `values`, `item`。

组合更多选项或案例时从已有列表追加，避免重复手写长参数或给结构化值二次编码。此函数不原地修改已有列表，不替换用户确认，不执行列表里的材料。单元和案例的数量边界由其实际提交函数检查。

Return *table.append(list=`values`,item=`item`)*.
