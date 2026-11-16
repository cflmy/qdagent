---
markup: occlusion
title: 根任务负责的 SKILL 路由
import:
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

路由的结果是一份真实可调用的文稿，不是业务工具别名或供应商 JSON 动作。主任务先拆分用户意图并选择工作方式，再调用本函数绑定受限 SKILL。子智能体只接收自己这一项的文稿和冻结规格，不得到根任务全部待办或其他智能体的上下文。

## resolve

| 参数 | 类型 | 说明 |
|---|---|---|
| mode | text | text、select、code、research 或 document，表示这项意图的工作方式 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际文稿、函数和可读名称；未知方式明确拒绝 |

Use `mode`。

固定正文适用于用户已经给出精确字符串的任务，不能拿它包装尚未研究的文章。输入取值与业务运算使用现有编写文稿，但进入的函数不同。真实研究与资料写作使用文档 SKILL，网页来源需要由浏览器实际取得，不能根据搜索摘要编造已读事实。路由选择保留在待办和用户确认的框架中，后续实现不能自己换成更宽的模式。

这里只选择本仓库已经接入的普通函数，不接收任意路径、导入、ABI 名称或效果列表。实际加载由当前角色读取这份文稿的官方手册；文稿内部调用的搜索、浏览、OCR 和办公插件仍各自检查开关与任务权限。路由成功说明找到了对应开发方法，不代表外部服务可用、代码已经实现或测试已经通过。未知模式会把问题交回主任务，而不是退到拥有全局能力的通用智能体。

根任务展示路由是为了让用户看懂怎样分工。表里的 document 是实际源码位置，function 是实际函数，不再维护另一份参数 Schema。新增工作方式应先实现真正的文稿、明确权限与独立测试，再修改这个普通组合函数。受限上下文、函数段所有权和人工确认规则不会因为增加一种 SKILL 而改变。

主任务负责选择与交接，子任务负责自己的实现和证据。页面所显示的 SKILL 名称来自同一个路由返回，而不是前端再根据标题猜测。

We **document = "ext/root-skill/calls/implement.mq.md"**.
We **function = ""** and **label = ""**.
1. `mode` == "text"
  We **document = "ext/root-skill/calls/implement-text.mq.md"**.
  We **function = "write_text"** and **label = "精确正文"**.
2. `mode` == "select"
  We **function = "select"** and **label = "输入取值"**.
2. `mode` == "code"
  We **function = "code"** and **label = "业务编程"**.
2. `mode` == "research" or `mode` == "document"
  We **document = "ext/root-skill/calls/implement-document.mq.md"**.
  We **function = "write_document"** and **label = "资料研究"**.
  1. `mode` == "document"
    We **label = "文档写作"**.
2. else
  Return *result.error(code="root.route",message="没有对应的已接入 SKILL，请选择真实的工作方式",operation="resolve")*.

`route` =

| mode | document | function | label |
|---|---|---|---|
| `mode` | `document` | `function` | `label` |

Return *result.ok(value=`route`)*.

## bind

| 参数 | 类型 | 说明 |
|---|---|---|
| unit | map | 规划者正在填写的一个实际函数职责 |
| intents | any | 用户确认的意图清单；旧任务可能尚无清单 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已核对 intent_id 和工作方式的职责；不允许猜测多意图归属 |

Use `unit`, `intents`。

关联在保存职责草稿时就检查，不能等到发表才发现一组无法交接的函数。只有一个意图时可以直接归属它；有多个意图时优先使用明确的 intent_id，未填写则只尝试与函数身份完全相同的意图。没有确切匹配就返回诊断，请主任务填写真实归属，不根据标题相似度、数组位置或一次模型自信判断自动分配。一个意图可以拆成多个函数，所有函数仍要保留已确认的开发方法。

本函数不加载文稿、不读私有文件、不改变原意图。参数来自根流程已保存的真实状态，用户范围与程序角色不会被一个返回值扩大。未知关联和更换工作方式都属于规划错误，必须在用户确认框架之前修正；不能让草稿数量满足后把模型锁进无法修订的发表现场。旧任务没有意图清单时沿用其已有框架确认边界，不反向伪造历史清单。

保存后的规范身份是后续跨轮交接的依据。函数显示名称可读、意图名称可读，而 intent_id 只负责稳定联系；用户改标题不会悄悄失去关联，多个同名标题也不会因此被合并。最终发表还会检查整份方案覆盖全部确认意图，并对实际源码计算摘要。关联检查本身不表示职责语义已经充分，也不能替代用户审阅输入、返回和验收条件。

例如一个已确认意图需要两个函数时，两者可以分别叫 first 和 second，但 intent_id 都指向同一项已确认意图。函数身份是代码段的边界，意图身份是用户目标的边界，不能把第二个函数的新名称当成另一个已经批准的意图。发生这种错误时，诊断直接列出当前真实可用身份和方式，避免模型把归属错误误判为字符串转义问题。

1. not `intents`
  Return *result.ok(value=`unit`)*.
We **id = json.get(value=`unit`,key="intent_id")**.
1. not `id`
  We **id = access(`unit`,"id")**.
  1. table.len(xs=`intents`) == 1
    We **id = access(table.first(list=`intents`),"id")**.
We **available = ""**.
- [只接受已确认意图和同一种受限开发方法](for intents as task)
  We **available = `available` + access(`task`,"id") + "（" + access(`task`,"mode") + "） "**.
  1. access(`task`,"id") == `id`
    1. access(`task`,"mode") != access(`unit`,"mode")
      Return *result.error(code="root.intent_binding",message=("意图 " + `id` + " 已确认的方式是 " + access(`task`,"mode") + "，请使用对应单元定义函数，不能擅自改方式"),operation="bind")*.
    Return *result.ok(value=table.put(in=`unit`,at="intent_id",value=`id`))*.
Return *result.error(code="root.intent_binding",message=("intent_id=" + `id` + " 不属于已确认待办。当前可用身份与方式：" + `available` + "。函数 id 和意图 intent_id 不必相同；同一意图的多个函数都填该意图的同一个身份，不能临时创造新意图。"),operation="bind")*.

## missing

| 参数 | 类型 | 说明 |
|---|---|---|
| intents | any | 已确认的意图清单，旧任务允许为空 |
| units | any | 已正确绑定的职责草稿或最终函数清单 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 第一项尚无对应函数的意图，全部覆盖时为 None |

Use `intents`, `units`。

意图覆盖与函数数量是两种不同的约束。两个函数可能都属于同一个意图，这时另一项用户目的仍然没有进入方案。数量达到上限不能使这个遗漏消失，也不能让模型只剩下一个必然失败的发表入口。主任务在选择下一份调用文稿时先核对覆盖，未覆盖则继续允许修订职责，完整覆盖后才收窄到发表。

本函数只比较真实保存的稳定关联，不分析自然语言，也不猜测两个标题是否语义相同。职责在保存时已核对身份和工作方式，发表仍会重新检查，用户最终阅读实际源码确认业务边界。旧任务没有意图清单时不补造范围；新任务遗漏任何一项则返回那项的可读标题，便于主任务继续处理。这个判断既不启动子智能体，也不给未批准的草稿执行权限。

1. not `intents`
  Return *None*.
1. not `units`
  Return *table.first(list=`intents`)*.
- [逐项核对用户确认的目的都有人负责](for intents as task)
  We **found = False**.
  - [一个目的可以由多个实际函数承接](for units as unit)
    1. json.get(value=`unit`,key="intent_id") == access(`task`,"id")
      We **found = True**.
  1. not `found`
    Return *task*.
Return *None*.

## office

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| kind | text | required | 已确认的 docx 或 pptx |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | office 的实际结果，失败保留明确诊断 |

Use `kind`。

根据已经确认的办公格式选择实际手册，Word 使用 word.mq.md，PPT 使用 presentation.mq.md。返回的是源码位置与真实函数，并不建立另一份工具注册表或参数 Schema。每份文稿仍独立描述自己的参数、返回、编辑规则与权限，根流程只进行普通函数组合。

路由不安装组件、不启用插件、不生成内容、不替用户确认。未知格式明确失败，不让模型猜测路径或动态库。需要增加新的办公格式时，先实现可用的函数文稿与验证，再修改本组合函数；不得只增加显示名称或工具别名。上传读取使用相同办公插件的只读文稿，二进制解析不能获得宏执行与网络权限。

This route identifies a real ordinary function in an installed handbook. It is not a tool schema, an alias for a hidden host procedure or evidence that a file already exists. The downstream function remains responsible for content checks, bounded file generation, optional rendering and truthful diagnostics.

We **document = "ext/office/word.mq.md"** and **parameter = "chapters"** and **label = "Word 文档"**.
1. `kind` == "pptx"
  We **document = "ext/office/presentation.mq.md"** and **parameter = "slides"** and **label = "PPT 演示"**.
2. `kind` != "docx"
  Return *result.error(code="root.office_format",message="当前办公 SKILL 支持 docx 与 pptx",operation="office")*.
We **route = table.put(in=None,at="document",value=`document`)**.
We **route = table.put(in=`route`,at="function",value="create")**.
We **route = table.put(in=`route`,at="parameter",value=`parameter`)**.
Return *result.ok(value=table.put(in=`route`,at="label",value=`label`))*.

## office_format

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| intents | any | required | 已确认意图；旧任务允许没有清单 |
| requested | text | required | 规划者填写的格式，允许空字符串 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | office_format 的实际结果，失败保留明确诊断 |

Use `intents`, `requested`。

办公格式应在意图澄清时记录，框架阶段不能悄悄遗忘或改成另一个格式。规划者没有重复填写时沿用用户已确认的意图；重复填写必须与已确认格式一致。旧任务尚无该字段则仍由规划中的明确值约定，再交用户确认实际框架。

当前框架只选择一种主办公格式。若同一任务的已确认意图包含不同格式，明确返回需要分批制作的诊断，不能只留下其中一种，也不能伪造另一份交付。后续支持多格式时应一并升级主方案、交付门禁与用户审阅，不能简单把字符串拼在一起。

这个函数只核对真实字段，不根据自然语言文件名或标题猜测。未知扩展名不能进入工具路径，格式确认也不代表正文已完成、插件已启用或文件已存在。最终交付仍需要当前单元的独立证据和真实文件检查。

We **selected = `requested`**.
1. `intents`
  - [保留已确认的格式决定](for intents as task)
    We **kind = json.get(value=`task`,key="artifact_kind")**.
    1. `kind` != None and `kind` != ""
      1. `selected` != "" and `selected` != `kind`
        Return *result.error(code="root.office_format_conflict",message="已确认格式与框架不同，或一次要求了多种格式；请与用户确认并按独立任务分别制作",operation="office_format")*.
      We **selected = `kind`**.
Return *result.ok(value=`selected`)*.
