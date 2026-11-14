---
markup: occlusion
title: 基本方案的当前可调用文稿
import:
  io: ../runtime/io.mq.md
  core: ../state.mq.md
  flow: ../policy.mq.md
  result: lib/result.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  plan: ../planning.mq.md
  call: ../../../pages/control/call.mq.md
  knowledge: ../runtime/knowledge.mq.md
---

基本方案的当前可调用文稿。先建立业务函数边界，确认后才能开展实现。

## reuse

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| query | text | required | 准备复用的标准库能力与业务用途 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 官方知识预检的真实候选与诊断 |

Use `query`。

不知道已经有哪些函数时，先查询实际安装的标准库。结果来自官方知识编译器生成的可重建投影，不是另一套工具 Schema。检索只给出候选，不能代替阅读参数表，也不会发表框架或获得用户批准。查询失败时保留诊断，缺少候选时说明能力范围，不伪造已经接通的插件。可在下一次调用中据此形成单元职责，具体实现仍由确认后的受限作者完成。

Return *[查找可以复用的真实文稿](knowledge.reuse(context=io.current(),query=`query`))*.

## text_unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 小写字母数字下划线组成的唯一身份 |
| title | text | required | 单元的可读名称 |
| content | text | required | 用户明确要求返回的精确字符串本身 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已保存的固定正文职责草稿 |

Use `id`, `title`, `content`。

把精确正文直接放进 content，不再用一句带引号的叙述猜测字符串的边界。这个契约定义函数忽略所有输入，逐字返回原文，不包成 map、不做转换。正文随实际方案显示，用户确认后才成为独立测试依据；它不是现有实现的返回，也不来自作者自检。

每次只保存一个真实职责，后续轮次会看到已保存的草稿。用户要求一个函数就只保存一项，不额外建立占位或工程管理职责。全部所需职责保存完，再调用 publish。固定返回的测试模板仅依据确认的原文构造不同输入案例，不读取实现来产生预期，正文中的引号如果是实际内容也必须原样保留。

Return *plan.define(context=io.current(),id=`id`,title=`title`,purpose=("忽略任何输入，逐字返回下列用户指定的固定正文。下列正文是返回值本体，不附加引号、标签或结构包装：\n\n" + core.prose(content=`content`)),mode="text",constant_text=`content`)*.

## select_unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 小写字母数字下划线组成的唯一身份 |
| title | text | required | 单元的可读名称 |
| purpose | text | required | 本单元完整的输入、返回、业务规则与限制 |
| depends_on | any | None | 前面已声明的依赖身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已保存的实际取值职责草稿 |

Use `id`, `title`, `purpose`, `depends_on`=None。

职责说明实际输入的结构、取值路径与缺失字段行为，不能把字段名称当成固定返回。本函数直接保存一个职责，后续轮次仍能看到；相同身份修订已有草稿。一次只定义当前职责，尚未实现也未经用户批准。用户只需要一个函数就只保存一项，不额外建立占位或工程管理职责。全部职责定义完以后，再调用 publish 发表实际框架。

Return *plan.define(context=io.current(),id=`id`,title=`title`,purpose=`purpose`,mode="select",depends_on=`depends_on`)*.

## code_unit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 小写字母数字下划线组成的唯一身份 |
| title | text | required | 单元的可读名称 |
| purpose | text | required | 本单元完整的输入、返回、业务规则与限制 |
| depends_on | any | None | 前面已声明的依赖身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已保存的业务运算职责草稿 |

Use `id`, `title`, `purpose`, `depends_on`=None。

职责完整说明输入、业务运算、边界与返回。内部实现留到用户确认后，不在规划阶段执行。本函数直接保存一个职责，后续轮次仍能看到；相同身份修订已有草稿。一次只定义当前职责，尚未实现也未经用户批准。用户只需要一个函数就只保存一项，不额外建立占位或工程管理职责。全部职责定义完以后，再调用 publish 发表实际框架。

Return *plan.define(context=io.current(),id=`id`,title=`title`,purpose=`purpose`,mode="code",depends_on=`depends_on`)*.

## publish

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| title | text | required | 工程题目 |
| goal | text | required | 已对齐的目标 |
| acceptance | text | required | 可观察的整体业务验收 |
| artifact_kind | text | "" | 需要办公文件时明确为 docx 或 pptx，否则留空 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已保存真实框架，等待用户审阅 |

Use `title`, `goal`, `acceptance`, `artifact_kind`=""。

使用前几轮已经保存的职责草稿发表，不重新传入职责、列表或变量。框架描述的是程序边界，不冒充业务完成。源码中的空实现明确显示尚未接通，用户确认绑定这份文件的实际摘要，后续测试规格也与同一版本绑定。没有职责草稿时明确拒绝，应先定义真实业务职责。

保存职责与发表框架分别留下真实记录，不能以其中一个替代另一个。

这次调用在任务工作区写入实际 plan.mq.md，检查身份、数量、依赖顺序与工程叙述，生成带源码摘要的确认请求。调用成功后停止，等待用户审阅；不开始实现，不替用户确认。题目、目标和整体验收会写在文稿前部，每个职责则带自己的输入、返回与完整规则，独立测试者不用读取其他职责补背景。

草稿的声明顺序就是依赖顺序，只能引用前面已经声明的身份。用户只需要一个函数时不能为了填满参数再添加占位职责；本接口没有这样的数量要求。一到八个真实职责都可以发表，具体数量必须符合已确认的业务范围。模型不能传入文件根、用户身份或额外效果。所有业务输入作为原生值交给固定文稿函数，既没有业务工具别名路由，也没有供应商动作 JSON。

We **context = io.current()**.
We **permit = flow.authorize(context=`context`,phase="outline",role="outline")**.
1. not access(`permit`,"ok")
  Return *permit*.
We **units = json.get(value=access(core.status(context=`context`),"value"),key="draft_units")**.

`args` =

| context | title | goal | acceptance | units | artifact_kind |
|---|---|---|---|---|---|
| `context` | `title` | `goal` | `acceptance` | `units` | `artifact_kind` |

We **planned = call.invoke(file=(access(`context`,"project") + "/ext/root-skill/planning.mq.md"),function="outline",arguments=`args`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,process.exec,environment.read")**.
1. not access(`planned`,"ok")
  Return *planned*.
Return *result.ok(value=table.put(in=None,at="path",value="solution/plan.mq.md"))*.
