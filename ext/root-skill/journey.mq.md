---
markup: occlusion
title: 四阶段的只读审阅记录
import:
  table: lib/table.mq.md
  json: lib/json.mq.md
  fs: lib/fs.mq.md
  hash: lib/hash.mq.md
---

阶段前进不会撤走用户已经读过的内容。这份文稿只保存已经发生的阶段和原始决定，不提供回退执行或替用户批准的入口。网页上的回看使用这些记录，真正返工仍由当前阶段的认证用户操作完成。

## archive

| 参数 | 类型 | 说明 |
|---|---|---|
| previous | map | 刚读到、即将离开的真实状态 |
| next | map | 已通过业务校验、等待版本提交的新状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 带只读阶段记录的新状态，不改变阶段和批准 |

Use `previous`, `next`。

只有阶段确实变化才存档，普通进度更新与重复读取不会产生一份假历史。意图问题、实际用户答复、职责和路由跟随原版本保存，后来的方案不会覆盖旧决定。基本方案和交付入口另存真实文件副本，用户回看时阅读的是那次源码，而不是同名文件的新内容。副本摘要必须与当时的确认摘要相符；不相符时只保留历史描述，不宣称拥有旧源码。

存档不是执行。它没有向模型公开，也不会开放私有工作根或将源字符串重新解释为命令。记录只含页面需要的公开职责、证据摘要和交流，不附测试源码、凭据或子智能体内部消息。独立测试角色的上下文仍从冻结规格构造，不读取本历史。版本比较写入失败时阶段没有推进；同一旧版本生成的副本可被重试，文件名来自真实版本数字，不来自用户路径。

完成后的新目标继续保留这些记录，但不会继承旧目标的批准。每次回看明确显示原阶段和版本；用户需要改变范围时仍须回到当前流程重新确认。文件副本便于核对文稿，记录中的通过状态也只描述那次真实观测，不能使后续修改的代码自动通过。


回看意图时应同时呈现当时的问题、备选项、真实回答和待办。问题摘要是模型对目标的解释，不能代替用户原文；用户选择和自由补充可以并存。基本方案的回看呈现每个函数的职责、依赖、工作方式，以及确认时选择的并发与模型身份。细化阶段则保留各段当时的试运行状态，失败也能被阅读，不能把未通过的历史记录涂成完成。交付阶段保留用户验收范围和明确披露的限制，让下一位协作者知道什么已经证实、什么仍待完善。

用户点击以前的步骤仅改变浏览器正在看的记录。该操作没有写接口，也不会启动模型请求或把根状态移到旧阶段。因此可以在一个仍然执行的任务中回看意图，再返回当前进度，已经填写但尚未发送的用户回答也应保留。完成后四个入口依然可点击，阶段有多次版本时应允许选择，而不是只留下最终的一条绿色状态。

返工与回看必须区分。返工由当前用户明确提出，经过当前版本检查后生成新的方案，之后的实施要重新绑定那份方案。旧阶段记录继续保留，并明确标记为原版本；任何旧验收都不会批准新函数。读取历史的请求同样受所属任务的身份校验，不能因为材料变成历史而开放给其他账号。服务器只提供已有副本，不根据历史说明猜测或合成曾经不存在的源码。

原有会话可能没有阶段副本。网页可以展示仍保留的真实交流、职责和证据，但必须说明这是保留下来的材料，不能称作完整快照。之后真实发生的阶段迁移才建立新记录。历史文件的路径只由固定目录、已知阶段和数字版本形成，存储身份可以用于准确定位，向用户展示时则使用阶段名称、版本和可读文件名。这样审阅体验不要求用户识别超长会话标识。

记录与当前任务的写入仍由同一次版本比较约束。一个子任务不能因为自己先读了旧记录就覆盖其他作者的状态。副本只用于审阅，不加入业务执行入口；它也不成为测试者的新上下文。业务源码与独立测试的隔离因此继续成立，界面获得可读历史不会扩大模型所拥有的材料或权限。

历史记录不控制浏览器当前正在展示的步骤。浏览器在当前记录与只读历史之间切换时，应保留当前待填表单与选择，不应发送执行请求；任务仍按真实状态继续。用户重新打开页面时，服务器从同一私有根状态恢复记录，不需要依赖前端缓存。如果会话包含几个交付周期，记录的版本继续递增，用户可从版本选择器区分原来的方案与新的修订，而不是只看见同一标题。

基本方案和交付文稿的副本按当时摘要验证。实现阶段的逐段结果则保留职责和实际试运行观测，页面不会把当前主文稿伪装成过去精确的实现快照。用户可以继续打开当前源码核对差异；只有实际保留的旧文件才使用“当时的文稿”这一名称。没有独立测试证据的旧任务不会因为能够回看而获得验收权。

副本本身仍是普通 Marqdo 文稿，可以通过官方 View 阅读标题、叙述、参数表与实际逻辑。它不要求另一套历史渲染格式，也不通过手写解析恢复控制流。前端只读展示与根状态机的执行权限保持分离，从而兼顾可追溯性和明确的人工决定边界。
回看记录里的角色、问题与原文仍是数据。它们不会被拼成新的系统提示，也不会把用户曾经选择的一项回答推广为所有未来任务的授权。只读副本依照任务身份访问，下载与 View 预览使用相同的路径约束；历史文件不绕过对私有目录和符号链接的限制。需要恢复执行时，始终读取当前状态、当前源码摘要与冻结测试，再判断下一步。

当用户在同一阶段继续澄清或要求修改框架时，待确认卡片也会成为一个可回看的版本。保留这些不同版本，才能解释任务边界为什么改变；仅保存最后一次摘要不足以证明用户实际确认了什么。

对于没有阶段记录的旧任务，回看只使用仍存在的用户交流和职责，不补造曾经的模型决策。新的迁移记录从本次升级后的真实行为开始，过去没有保存的逐轮源码也不会由当前模型猜写。用户能分别看到“保留下来的材料”和具有副本、摘要的原版本文稿，避免阅读体验改善反而掩盖证据缺口。

We **old_phase = json.get(value=`previous`,key="phase")**.
We **pending_closed = json.get(value=`previous`,key="pending") and not json.get(value=`next`,key="pending")**.
1. not `old_phase` or (`old_phase` == json.get(value=`next`,key="phase") and not `pending_closed`) or `old_phase` == "complete"
  Return *next*.
We **record = table.empty_map()**.

`fields` =

| name |
|---|
| "phase" |
| "revision" |
| "goal" |
| "title" |
| "summary" |
| "acceptance" |
| "pending" |
| "settings" |
| "intent_tasks" |
| "delivery_status" |

- [保存当时真正可见的阶段内容](for fields as field)
  We **record = table.put(in=`record`,at=`field`,value=json.get(value=`previous`,key=`field`))**.
We **units = table.empty_list()**.
We **original_units = json.get(value=`previous`,key="units")**.
1. `original_units`
  - [只保留公开职责与执行证据摘要](for original_units as unit)
    We **public_unit = table.delete(map=table.delete(map=`unit`,key="tests"),key="specification")**.
    We **units = table.append(list=`units`,item=`public_unit`)**.
We **record = table.put(in=`record`,at="units",value=`units`)**.
We **record = table.put(in=`record`,at="history",value=json.get(value=`previous`,key="history"))**.
We **responses = json.get(value=`next`,key="history")**.
1. `responses`
  We **decision = table.last(list=`responses`)**.
  1. json.get(value=`decision`,key="revision") == access(`previous`,"revision")
    We **record = table.put(in=`record`,at="decision",value=`decision`)**.
We **source_path = ""** and **expected = ""**.
1. `old_phase` == "outline"
  We **source_path = "solution/plan.mq.md"**.
  We **expected = json.get(value=`previous`,key="outline_sha256")**.
1. `old_phase` == "review"
  We **delivery = json.get(value=`previous`,key="delivery")**.
  1. `delivery`
    We **source_path = access(`delivery`,"path")**.
    We **expected = access(access(access(`delivery`,"check"),"value"),"sha256")**.
We **original = ""**.
1. `source_path` != "" and fs.exists(path=`source_path`)
  We **original = fs.read_text(path=`source_path`)**.
1. `original` != "" and hash.sha256(text=`original`) == `expected`
  We **path = "solution/history/" + `old_phase` + "-v" + json.stringify(value=access(`previous`,"revision")) + ".mq.md"**.
  We **_ = fs.make_dirs(path="solution/history")**.
  We **_ = fs.atomic_write(path=`path`,text=`original`)**.
  We **record = table.put(in=`record`,at="document",value=table.put(in=table.put(in=None,at="path",value=`path`),at="sha256",value=`expected`))**.
We **records = json.get(value=`previous`,key="stage_history")**.
1. not `records`
  We **records = table.empty_list()**.
Return *table.put(in=`next`,at="stage_history",value=table.append(list=`records`,item=`record`))*.
