---
markup: occlusion
title: 同角色、同版本的真实错误经验
import:
  io: io.mq.md
  core: ../state.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  hash: lib/hash.mq.md
  document: lib/document.mq.md
---

错误经验来自实际失败与后续调用，不是一份额外工具目录。当前文稿、真实状态和冻结测试始终优先，缓存不会授予权限或代替用户确认。历史材料按任务、角色、函数段、框架与实际接口源码隔离；测试者不能读取作者的错误、实现或成功片段。

## location

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信的当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 当前现场的私有经验文件 |

Use `context`。

接口摘要由官方手册边界从实际源码计算，不维护另一份参数表。角色与函数段参与身份计算，同一模型也不能因此读取另一个角色的材料。目标和已确认框架参与隔离，用户修改范围后不会把旧成功片段当成新规则。文件位于私有目录，不在工作区树或普通下载入口展示。

本函数只决定缓存位置，不改变业务状态，不执行历史代码，也不为缺失资料生成解释。接口版本不一致时经验自然分开；模型应阅读当前函数的参数和返回表，不能用旧经验覆盖当前契约。读取缓存不会使一个失败网页变成来源，不会让尚未确认的方案得到执行权。

规划阶段尚未分配正式函数段时，当前框架槽位也参与隔离。第一项职责与第二项职责即便使用同一接口，也不能互相取得成功片段；这避免模型把已经写过的业务内容复制到下一项。目标、框架摘要、角色、槽位、函数段与接口版本共同确定参考材料的范围，模型只能获得当前现场对应的一份缓存。这里的摘要不是最终验收版本，它只用于阻止不同上下文之间的意外复用。

当用户修改了规划或接口，旧缓存仍属于旧身份，新现场从空记录开始。单纯切换模型不应扩大角色上下文，旧模型和新模型都只能读取本角色被授权的材料。身份生成只使用实际状态与已安装源码，不读取模型自报的目标版本，也不接受模型传入别人的经验文件。

We **state = access(core.status(context=`context`),"value")**.
We **api = io.api_path(context=`context`)**.
We **manual = io.native(context=`context`,operation="runtime_handbook",payload=table.put(in=None,at="path",value=`api`))**.
We **identity = json.stringify(value=access(`state`,"goal")) + json.stringify(value=json.get(value=`state`,key="outline_sha256")) + json.stringify(value=json.get(value=`context`,key="unit_id")) + json.stringify(value=json.get(value=`context`,key="outline_id")) + access(`context`,"role") + `api` + access(access(`manual`,"value"),"api_sha256")**.
Return *(".agent/recovery/" + hash.sha256(text=`identity`) + ".json")*.

## entries

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信的当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 至多六项同现场经验 |

Use `context`。

读取缓存不重放调用。文件不存在时没有可参考经验；旧缓存不可解析时也不能据此证明成功，仍依据当前真实错误修复。缓存只是减少重复试错的材料，完整审计继续保存在原运行记录。目录身份由根程序计算，模型不能传另一个路径或角色来扩大上下文。

每项经验只保留必要错误摘要和自己的调用片段，不含供应商凭据、完整系统请求或其他智能体的对话。六项上限用于控制上下文增长，不会删除原始运行证据。读到后续成功记录也不等于整个业务已经完成，阶段门禁仍读取源码摘要、独立测试与真实用户决定。

We **read = io.native(context=`context`,operation="runtime_recovery_read",payload=table.put(in=None,at="path",value=location(context=`context`)))**.
1. access(`read`,"ok")
  Return *access(`read`,"value")*.
Return *table.empty_list()*.


## append

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信的当前调用现场 |
| record | map | 实际失败或后续成功的受限摘要 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已原子保存的经验记录 |

Use `context`, `record`。

只追加当前角色的真实观察，最多保留最近六项。缓存采用原子替换，断线不会产生半份可引用记录。参数中的文字始终作为数据，不解释为文件名、代码或权限；路径仍由当前接口版本和根现场确定，不由调用者选择任意位置。

业务完成状态不保存在这里。用户可在执行记录中核对原始请求、校验结果与退出证据，缓存只是同一角色下轮恢复的摘要。删除较早的上下文摘要不删除那次实际审计，不允许作者借此更改冻结测试或抹掉已披露的限制。

保存失败时返回的记录仍含当前原因和建议，并明确标记尚未持久化。界面可以展示这次真实观察，下一轮也能使用当次反馈；但不能承诺跨运行恢复仍有这份缓存。写入成功只表示有限参考材料已经保存，不表示修复得到验证，不会自动调整任务状态或取消失败记录。

We **records = table.append(list=entries(context=`context`),item=`record`)**.
1. table.len(xs=`records`) > 6
  We **records = table.slice(list=`records`,start=(table.len(xs=`records`) - 6))**.
We **payload = table.put(in=table.put(in=None,at="path",value=location(context=`context`)),at="records",value=`records`)**.
We **saved = io.native(context=`context`,operation="runtime_recovery_write",payload=`payload`)**.
Return *table.put(in=`record`,at="saved",value=access(`saved`,"ok"))*.


## failure

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信的当前调用现场 |
| source | text | 当前角色实际提交的调用正文 |
| observed | map | 实际校验或执行错误 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 错误原因、修复方法和同一运行的重复次数 |

Use `context`, `source`, `observed`。

只根据真实失败记录经验，不接受模型自报原因。错误摘要最多一千二百字符，失败片段最多六百字符，完整材料仍在运行审计中。同一运行反复提交相同失败源码才增加重复次数；用户明确继续时重新计数，并可以继续参考已有诊断。没有修改的参数错误不会因为再次请求而获得更大的权限。

源码摘要只用于识别重复，不参与业务完成判断。一个网页失败、一个参数缺失和一次独立测试未通过分别保留真实原因，不应都被解释成转义问题。修复建议来自下面的可读函数，属于当前模型的参考方法，不会修改用户规格、测试预期或任务角色。

每次记录的作用是让下一轮看见具体错误以及已经尝试的片段。模型仍须阅读当前公开文稿、使用其实际参数，不能从错误经验猜测不存在的宿主能力。发生副作用的失败也不能盲目重放；根流程必须先读取已保存的进度，再决定是否还有步骤需要执行。

参数绑定失败时，记录官方诊断中的具体名称与错误类型。缺少参数应阅读当前必填表，未知参数应删除不存在的名称，已知值类型不符则应改用契约允许的值。默认值与嵌套函数不会在检查时执行，所以不能声称已经观察到它们的实际结果。若问题发生在工具启动之后，则需要检查实际退出状态和已保存进度，不能按一次静态错误来处理。

失败正文按原样保留有限片段，显示和交接都不将它重新解码成另一份动作协议。原始诊断可能经过传输包装，本地边界只提取已经存在的官方错误字段；分类、建议与是否继续仍由文稿控制。错误经验不包含认证信息，不合并其他角色的消息，不允许把错误中的任意文件路径作为下一次读取授权。

经验写入是尽力保存。缓存目录不可写、文件损坏或容量超限时，本轮仍把实际诊断交回模型并向用户披露缓存未保存；一次业务成功不能因为附加记录失败而被无故重放。相同无效源码的停止条件由当前运行的独立计数维护，不依赖缓存可写性。用户明确继续会建立新的运行次数，但旧失败的来源仍可核对。

记录中的重复次数只统计同一运行、同一源码摘要的连续失败。模型修改了调用之后，即使新的调用仍不正确，也应保留它新的具体原因；不同错误不能合并成一个模糊失败计数。相反，完全相同的静态错误反复提交不会获得无限轮次。缓存只提供参考，停止重复的门禁在当前运行中独立执行。

错误消息可能提到文件、网址或参数示例，这些都不自动成为真实可用材料。后续作者必须通过当前公开接口取得实际观察，并继续遵守被允许的文件根、插件开关和网络范围。独立测试仍读取冻结规格，不接收作者的失败片段或所谓修复答案。

We **digest = hash.sha256(text=`source`)**.
We **records = entries(context=`context`)**.
We **count = 1**.
1. `records`
  We **last = table.last(list=`records`)**.
  1. json.get(value=`last`,key="source_sha256") == `digest` and json.get(value=`last`,key="run_id") == access(`context`,"run_id") and not json.get(value=`last`,key="followup_succeeded")
    We **count = access(`last`,"count") + 1**.
We **decoded = io.native(context=`context`,operation="runtime_diagnostic",payload=table.put(in=None,at="observed",value=`observed`))**.
We **diagnostic = access(`decoded`,"value")**.
We **cause = re.find(text=access(`diagnostic`,"message"),pattern="(?s)^.{0,1200}")**.
We **record = table.put(in=None,at="cause",value=`cause`)**.
We **record = table.put(in=`record`,at="code",value=json.get(value=`diagnostic`,key="code"))**.
We **record = table.put(in=`record`,at="source_sha256",value=`digest`)**.
We **record = table.put(in=`record`,at="failed_call",value=re.find(text=`source`,pattern="(?s)^.{0,600}"))**.
We **record = table.put(in=`record`,at="run_id",value=access(`context`,"run_id"))**.
We **record = table.put(in=`record`,at="count",value=`count`)**.
We **record = table.put(in=`record`,at="advice",value=advice(context=`context`,observed=json.stringify(value=`diagnostic`)))**.
Return *append(context=`context`,record=`record`)*.

## success

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信的当前调用现场 |
| source | text | 后续实际调用成功的正文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 后续成功片段，或没有待跟进经验 |

Use `context`, `source`。

只有真实调用已经成功才登记后续片段，不能根据模型声称修复来写入。片段最多八百字符，来自同一角色、框架与接口版本；测试者和编写者始终分开。没有先前失败时不制造一条经验，已经记录过后续成功时也不反复追加相同说明。

后续一次调用成功，不必然证明原失败目标已经完成。例如搜索成功不能使之前访问失败的网址成为已阅读来源，OCR 排队也不表示识别结束。因此记录只标明 followup_succeeded，不改变单元状态。是否完成仍由根流程对当前职责、源码和独立证据判断，用户最终保留验收权。

We **records = entries(context=`context`)**.
1. not `records`
  Return *table.put(in=None,at="saved",value=False)*.
We **last = table.last(list=`records`)**.
1. json.get(value=`last`,key="followup_succeeded")
  Return *table.put(in=None,at="saved",value=False)*.
We **record = table.put(in=`last`,at="followup_succeeded",value=True)**.
We **record = table.put(in=`record`,at="success_call",value=re.find(text=`source`,pattern="(?s)^.{0,800}"))**.
Return *append(context=`context`,record=`record`)*.

## reference

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信的当前调用现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 当前角色可参考的受限错误材料 |

Use `context`。

经验只是带来源的事实，不能变成另一个工具目录或新的系统权限。当前函数文稿始终优先，历史片段不能让模型选择身份、放宽效果或重复已经保存的步骤。没有后续成功标记时仍然是失败；有标记也只证明记录的那次调用成功，并不代替业务验收。

只交接同一任务、角色、函数段和接口源码版本的最近记录，不附其他智能体的内部过程。字段和数量都受到上限限制，总模型请求仍受现有上下文预算约束。模型应按诊断修订自己的调用，不能复制另一个任务的常量或预期来获得通过。

例如，同一个作者上一轮遗漏了必填正文，下一轮会看到缺少哪个参数及自己当时的片段；独立测试者不会因此得到作者的候选实现。后续成功片段只说明那一次实际调用成功，不能推导整个研究、文档或测试已经完成。历史记录即使带有像指令一样的文字，也仍是只读证据，必须服从当前真实契约与权限。

错误经验不能替代当前用户的确认。用户改变目标后必须重新规划，已经失效的源码批准也不能由历史成功片段恢复。这里只帮助修正调用方式，所有业务完成事实仍从当前状态取得。

We **records = entries(context=`context`)**.
1. not `records`
  Return *""*.
1. table.len(xs=`records`) > 2
  We **records = table.slice(list=`records`,start=(table.len(xs=`records`) - 2))**.
We **reading = "\n同角色、当前框架与接口版本的真实错误经验：\n"**.
- [错误与后续片段分别表明事实](for records as record)
  We **reading = `reading` + "\n错误：" + access(`record`,"cause") + "\n修复方法：" + access(`record`,"advice") + "\n当时的失败调用片段（只读）：\n" + access(`record`,"failed_call") + "\n"**.
  1. json.get(value=`record`,key="followup_succeeded")
    We **reading = `reading` + "后续实际成功的调用片段（不代表原目标已经完成）：\n" + access(`record`,"success_call") + "\n"**.
Return *re.find(text=`reading`,pattern="(?s)^.{0,4000}")*.


## advice

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 当前可信调用现场 |
| observed | text | 实际诊断 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 从实际指令文稿读取的修复方法 |

Use `context`, `observed`。

方法和所有固定提示都在 Marqdo 文稿中。这里根据真实诊断读取对应章节，不把字符串映射成工具或宿主函数。当前接口始终优先，章节只指导如何对照参数表、正确使用数据和保留业务门禁，不替模型填写答案。

来源是已安装的固定指令文件，不接受模型指定任意路径。该文件同样进入模型请求的来源摘要，所以用户可以核对重试依据。读取方法不会重放失败操作、修改用户规格或把错误状态改成通过。

We **read = io.native(context=`context`,operation="runtime_document",payload=table.put(in=None,at="path",value=(access(`context`,"project") + "/ext/root-skill/runtime/instructions.mq.md")))**.
Return *document.section(text=access(access(`read`,"value"),"source"),title=("repair_" + category(observed=`observed`)))*.

## category

| 参数 | 类型 | 说明 |
|---|---|---|
| observed | text | 已经报告的诊断 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 修复章节名称，不是工具身份 |

Use `observed`。

只读取实际错误标签，不解析语言，也不推断下一步已经成功。参数和源码的含义由官方解析器及外部绑定器决定，分类只是帮助模型找到可以阅读的说明。未知问题保留一般执行失败，不自动解除隔离、扩大权限或修改独立测试预期。

未知参数与缺少参数需要不同的修正，语法错误也不能靠更换业务规格解决。阶段已经前进时应读取新现场，而不是把旧调用再提交一遍；网址失败则需要真实来源恢复。任何建议都必须服从当前参数表和实际门禁，章节名称不可能成为模型可执行的宿主操作。

分类不要求模型输出某种固定结构，也不把关键词转换成工具名。它只选择本文稿已经存在的修复说明章节。官方诊断明确缺少必填项时应补全必要业务值；未知名称则应对照手册删除，不得猜测宿主存在更多参数。若来源网络不可达，修复应转向真实可访问来源，并保留此前失败事实，而不是关闭地址限制。无法判断原因时采用一般说明，要求阅读真实错误，不给出未经证实的解决承诺。

错误消息只决定推荐阅读哪个修复章节，没有任何分支会启动浏览器、写文件或调用模型。章节返回文字后仍由根程序构造本角色上下文，再由模型产生新的普通调用文稿。新文稿依然经过完整预检，不能借用修复过程绕过原来的效果限制。

办公布局的诊断直接关联到当前字段与实际模板，不能和网络重试混为一谈。文字预算、派生正文、图片尺寸或比例失败都需要修订内容或选择合适版式，不会因为换一次模型请求而变合法。实际约束仍在对应布局函数中，分类只交接可读修复方法，不维护另一份参数表。

版式字段的具体数值应从本轮函数表读取，不能从历史经验复制旧上限。模板升级后仍需要真实预检与排版，过去一次成功不能替当前版本作证。

官方提示没有实际调用与返回，常见原因是可读标签的括号没有闭合，整句因此仅剩叙述。此时应进入语法修复说明，建议模型重新输出一条完整的直接调用；不能由宿主补括号后悄悄执行。未知变量也需要检查反引号引用和实际赋值，函数名或类型名称不应变成未定义变量。分类只增加这条解释，不把异常当成已成功，也不自动修改模型写出的业务代码。

1. text.contains(text=`observed`,sub="root.formula_operator")
  Return *"formula"*.
1. text.contains(text=`observed`,sub="office.layout") or text.contains(text=`observed`,sub="office.image") or text.contains(text=`observed`,sub="PNG")
  Return *"office_layout"*.
1. text.contains(text=`observed`,sub="unknown_arg") or text.contains(text=`observed`,sub="duplicate_arg")
  Return *"arguments"*.
1. text.contains(text=`observed`,sub="missing_arg") or text.contains(text=`observed`,sub="arg_mismatch")
  Return *"contract"*.
1. text.contains(text=`observed`,sub="unbound") or text.contains(text=`observed`,sub="signature") or text.contains(text=`observed`,sub="syntax") or text.contains(text=`observed`,sub="actual document function call and return") or text.contains(text=`observed`,sub="unknown \x60")
  Return *"syntax"*.
1. text.contains(text=`observed`,sub="slot_used") or text.contains(text=`observed`,sub="root.stage")
  Return *"state"*.
1. text.contains(text=`observed`,sub="network") or text.contains(text=`observed`,sub="TLS") or text.contains(text=`observed`,sub="browser")
  Return *"source"*.
Return *"general"*.

## observe

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信调用现场 |
| source | text | 实际提交的正文 |
| observed | map | 实际返回 |
| succeeded | bool | 真实调用是否成功 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际记录与可读恢复事件 |

Use `context`, `source`, `observed`, `succeeded`。

根流程先判断真实返回，再记录失败或后续成功，不根据模型的结束语来决定。每条事件对应一次实际观察，包含角色、原因、修复方法和必要调用片段，前端能直接展示，用户不必打开多层调试 JSON。没有失败历史的普通成功不会制造一条修复记录。

这里不推进阶段，不取消失败证据，也不替用户批准。后续成功可能属于同一接口中的另一操作，只证明该次调用成功；原职责是否满足仍由根门禁检查。模型看到的经验仍按相同角色和版本隔离，事件不包含凭据或完整私有请求。

成功事件与修复事件可以连续出现，但两者的证明范围不同。前者说明某次调用有了实际返回，后者帮助用户理解为何改变调用；是否通过独立测试仍由冻结规则判断。没有缓存写入权时，事件仍展示当前诊断，页面应明确表示经验尚未保存，不能把可见记录误说成可跨运行复用。

We **record = table.put(in=None,at="saved",value=False)**.
1. `succeeded`
  We **record = success(context=`context`,source=`source`)**.
2. else
  We **record = failure(context=`context`,source=`source`,observed=`observed`)**.
1. json.get(value=`record`,key="cause")
  We **data = table.put(in=`record`,at="id",value=json.get(value=`context`,key="unit_id"))**.
  We **data = table.put(in=`data`,at="role",value=access(`context`,"role"))**.
  We **kind = "recovery"**.
  1. json.get(value=`context`,key="unit_id")
    We **kind = "child_recovery"**.
  We **_ = io.event(context=`context`,kind=`kind`,data=`data`)**.
Return *record*.
