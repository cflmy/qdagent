---
markup: occlusion
title: 主任务当前这一段的框架填写
import:
  io: ../runtime/io.mq.md
  core: ../state.mq.md
  plan: ../planning.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

根文稿已经选好当前用户意图、SKILL 和函数身份。直接填写这一段业务边界即可，不传 id、intent_id、mode、源码路径或权限。当前文稿的真实函数就是工具，下一轮由根程序选择下一份文稿。

## define

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| title | text | required | 这一段的可读业务名称 |
| purpose | text | "" | 完整职责、输入、返回、规则、验收与边界；非固定正文必须填写 |
| content | any | None | 仅当当前意图方式是 text 时填写精确返回字符串 |
| depends_on | any | None | 前面已保存的函数身份列表；可用 one 构造 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真正保存的函数职责、规范身份和意图关联 |

Use `title`, `purpose`="", `content`=None, `depends_on`=None。

只填写当前分配的函数段，不创建另一份工程，也不重新命名用户意图。根程序已选择意图及开发方式，所以不要传 id、intent_id 或 mode。固定正文只在 content 放用户原文，忽略输入且逐字返回；研究、写作和代码方式只填写完整 purpose，不能把未知文章伪装为常量。依赖用实际已保存的函数身份，未知依赖不能靠标题猜测。

函数成功后返回实际保存的职责，下一轮材料会包含它。未覆盖的意图继续分配，所有职责完整之后自动切到发表文稿，仍必须由真实用户确认。这里不创建实现、不冻结测试、不访问网页，也不把已保存草稿称为已完成业务。上下文来自私有调用现场，模型无法通过参数选择另一个意图或更宽的 SKILL。

例如同一意图需要两个函数时，根程序会分配两个不同的身份，再分别调用本函数填写内容。模型不需要根据上一次临时变量重建关联，也不能因为名字相似而覆盖前一段。若用户要求调整已发表框架，应通过真实用户返工重新规划，而不是在本轮临时扩大数量。保存的职责仍须交给用户阅读，内容语义不充分不会因为身份正确而自动获得批准。

当前材料已经显示函数身份与所负责的意图，直接填业务内容即可，不需要把这些系统身份复制进参数。即使模型在说明里写了另一个身份，也不会改变根程序分配。用户提出新目标时应回到意图确认，不能用本函数把一个未经确认的目标悄悄插入框架。

一次分配只接纳一次保存。若模型在同一段回复中重复调用，不覆盖第一份已经保存的职责，而是明确返回这一现场已经用过。下一轮根程序从真实状态分配另一个段落，用户已经看到的标题、职责和关联不会因为模型多写了一次调用而悄悄改变。需要修订整个框架时仍通过用户的真实返工入口处理，旧阶段继续可以阅读。

We **context = io.current()**.
We **intent = json.get(value=`context`,key="outline_intent")**.
1. access(`context`,"role") != "outline" or not `intent` or not json.get(value=`context`,key="outline_id")
  Return *result.error(code="root.outline_slot",message="当前没有根任务分配的框架段",operation="define")*.
We **state = access(core.status(context=`context`),"value")**.
We **drafts = json.get(value=`state`,key="draft_units")**.
1. `drafts`
  - [同一个分配现场只创建一次，重复调用不能覆盖已保存内容](for drafts as unit)
    1. access(`unit`,"id") == access(`context`,"outline_id")
      Return *result.error(code="root.outline_slot_used",message="这一段已经保存，请结束本次回复，由根任务分配下一段",operation="define")*.
We **mode = access(`intent`,"mode")**.
1. `mode` == "text"
  1. `content` == None
    Return *result.error(code="root.fixed_content",message="固定正文必须在 content 中填写精确字符串",operation="define")*.
  We **purpose = "忽略任何输入，逐字返回下列用户指定的固定正文。正文是返回值本体，不添加引号、标签或结构包装：\n\n" + core.prose(content=`content`)**.
2. else
  1. `purpose` == "" or `content` != None
    Return *result.error(code="root.outline_purpose",message="当前方式需要完整 purpose，不能填写固定正文 content",operation="define")*.
Return *plan.define(context=`context`,id=access(`context`,"outline_id"),title=`title`,purpose=`purpose`,mode=`mode`,constant_text=`content`,depends_on=`depends_on`,intent_id=access(`intent`,"id"))*.

## one

| 参数 | 类型 | 说明 |
|---|---|---|
| value | text | 前面实际保存的一个函数身份，如 u0 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 供 depends_on 使用的原生列表 |

Use `value`。

仅把已经明确的身份构造成原生列表，不启动对应函数，也不证明依赖已经就绪。身份在下一轮材料中可读，禁止用用户任务标题或尚未保存的名字替代它。框架发表还会检查依赖顺序、未知身份与循环，用户批准后才影响运行材料交接。

Return *[构造当前职责的明确依赖](table.append(list=table.empty_list(),item=`value`))*.
