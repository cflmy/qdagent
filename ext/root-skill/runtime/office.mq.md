---
markup: occlusion
title: 办公交付：只组装当前通过验证的函数段
import:
  routing: ../routing.mq.md
  records: ext/office/records.mq.md
  io: io.mq.md
  core: ../state.mq.md
  flow: ../policy.mq.md
  proof: ../proof.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  hash: lib/hash.mq.md
  result: lib/result.mq.md
  call: ../../../pages/control/call.mq.md
  paginate: ext/office/paginate.mq.md
---

函数段是内容协作边界，办公文件是这些已验证正文的实际交付格式。

## fingerprint

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| state | map | required | 当前真实根状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | fingerprint 的实际结果，失败保留明确诊断 |

Use `state`。

办公交付必须与已批准方案、实际单元和所需格式绑定。这里计算稳定的内容联系，不把标题或一次模型自报成功当作证据。单元记录包含当前源码、冻结测试和真实试运行；任何相关变化都会产生不同身份，旧文件不能继续证明新版方案已经交付。

本函数不读取模型密钥，不执行单元，不启动网络或排版，也不推进阶段。相同内容可以复用已核对的现有产物，避免断线恢复时重复创建同一文件。摘要只能检查版本联系，不能替代正文质量审核或用户验收。

历史任务没有风格设置时保留原来的指纹计算，不因新增默认选项就追溯性否定已经审阅的单版本交付。用户明确选择风格后才把该列表加入联系，既保证新请求的精确性，也让旧记录继续可读。并发数只影响执行资源，不改变正文或文件内容，因此不加入内容指纹。

We **payload = json.stringify(value=json.get(value=`state`,key="outline_sha256")) + json.stringify(value=access(`state`,"units")) + json.stringify(value=json.get(value=`state`,key="artifact_kind"))**.
We **themes = json.get(value=access(`state`,"settings"),key="office_themes")**.
1. `themes` != None
  We **payload = `payload` + json.stringify(value=`themes`)**.
Return *hash.sha256(text=`payload`)*.

## sections

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| state | map | required | 用户确认的真实方案与当前单元 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | sections 的实际结果，失败保留明确诊断 |

Use `context`, `state`。

每个主方案函数段先独立实现和测试，整合时只交接它已经核对的正文。文档与研究单元读取已验证的实际文章文件，固定正文单元读取用户确认过的精确值；支持计算的代码段仍参与就绪检查，但不会被当成一篇已经写好的报告。没有可用正文就明确失败，不能把源码、诊断或聊天承诺写进 Word。

所有单元都要重新通过当前摘要和独立证据核对，不能因为某个正文文件还在就跳过冻结测试。正文顺序沿用主方案的函数段顺序，所以并行完成的先后不改变最终阅读顺序。实际产物的路径来自可信单元记录，模型不能传入另一会话文件或自己拼出外部路径。

每个章节最多一万字符，总章节数与演示页面仍由生成器限制。精确排版由固定模板与可选 PDF 引擎处理，不在这里重写文章。来源和限制保留在原文，不能为了交付简短而静默删除。引用的事实质量仍需用户核对，独立结构规则不是领域专家审核。

Each author still owns only its confirmed function section. Assembly does not ask another model to summarize, rewrite or reinterpret that section. Code-only helper units are checked for readiness but are not exported as prose. An article or research note is read from the artifact path already bound to its independent trial. A fixed text section uses the exact confirmed text. If no eligible content exists, the planner must supply a genuine writing unit rather than export a successful diagnostic as the requested report.

We **sections = table.empty_list()**.
We **units = access(`state`,"units")**.
- [所有单元先核对当前独立证据](for units as unit)
  We **own = table.put(in=`context`,at="unit_id",value=access(`unit`,"id"))**.
  1. not proof.ready(context=`own`,item=`unit`)
    Return *result.error(code="root.stale_unit",message="正文所属函数段或独立证据已失效",operation="office")*.
  We **body = None**.
  We **mode = json.get(value=`unit`,key="mode")**.
  1. `mode` == "document" or `mode` == "research"
    We **body = fs.read_text(path=access(access(`unit`,"artifact"),"path"))**.
  2. `mode` == "text"
    We **body = access(`unit`,"constant_text")**.
  1. `body` != None
    We **item = table.put(in=table.put(in=None,at="heading",value=access(`unit`,"title")),at="body",value=`body`)**.
    We **sections = table.append(list=`sections`,item=`item`)**.
1. table.len(xs=`sections`) == 0
  Return *result.error(code="office.no_content",message="方案需要至少一个文档、研究或精确正文函数段，代码段不能冒充办公正文",operation="office")*.
Return *result.ok(value=`sections`)*.

## ready

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| state | map | required | 当前真实状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | ready 的实际结果，失败保留明确诊断 |

Use `context`, `state`。

有办公交付要求时，整合前必须找到同一方案和当前函数段对应的实际办公文件。没有文件、摘要改变或版本失效都会拒绝，不允许只调用 finish 就把制作 PPT 的任务标记为已完成。没有办公要求的普通任务不受这项交付检查影响。

记录中的文件必须仍存在，大小与摘要由真实文件读取。若选择了附带 PDF，同样检查 PDF 的文件事实；一个旧文件名或成功动画不能代替实际内容。检查不会重新执行生成器、重新提交排版或替用户确认，它只是确定当前文件还能证明先前那次交付。

Readiness checks the entire current chain. First, each contributing function must still satisfy its source and independent-test evidence. Then the document version must match that chain. The Office binary, readable manuscript and structured editing snapshot must all still have their recorded hashes. An optional PDF has its own actual-file check. This operation does not rerender a changed file or silently accept a replacement. It returns the original diagnostic so the current author can make an explicit repair. A later user review is a separate decision. A document that opens in an Office viewer is still not proof that its facts or layout meet the business goal. Conversely, a correctly generated file is not discarded just because final approval is still pending.

We **current = sections(context=`context`,state=`state`)**.
1. not access(`current`,"ok")
  Return *current*.
We **receipt = json.get(value=`state`,key="office_delivery")**.
1. not `receipt` or access(`receipt`,"fingerprint") != fingerprint(state=`state`)
  Return *result.error(code="root.office_missing",message="请先组装已验证正文，当前方案尚无有效办公交付",operation="ready")*.
We **artifact = access(`receipt`,"artifact")**.
We **versions = json.get(value=`artifact`,key="variants")**.
1. `versions` == None
  We **versions = table.append(list=table.empty_list(),item=`artifact`)**.
- [所有风格都要保持当前摘要与源稿有效](for versions as version)
  1. not fs.exists(path=access(`version`,"path")) or fs.file_hash(path=access(`version`,"path")) != access(`version`,"sha256")
    Return *result.error(code="office.changed",message="办公文件已变化或不存在",operation="ready")*.
  We **source = records.read(id=access(`version`,"id"))**.
  1. not access(`source`,"ok")
    Return *source*.
  We **pdf = json.get(value=`version`,key="pdf")**.
  1. `pdf` and (not fs.exists(path=access(`pdf`,"path")) or fs.file_hash(path=access(`pdf`,"path")) != access(`pdf`,"sha256"))
    Return *result.error(code="office.changed",message="附带 PDF 已变化或不存在",operation="ready")*.

Return *result.ok(value=`artifact`)*.

## assemble

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| render_pdf | bool | True | 生产环境同时生成 PDF；无引擎开发机可明确关闭 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | assemble 的实际结果，失败保留明确诊断 |

Use `context`, `render_pdf`=True。

只在落地阶段组装用户已确认需要的 Word 或 PPT，不根据文件后缀猜测未经确认的新目标。格式与题目来自已审阅框架，正文来自当前已验证函数段；模型不用把全文重新传一遍，也不能在这一步悄悄改写文章。用户修改范围时应回到框架，而不是在交付工具里发明新正文。

有效的已有交付可以复用，恢复时不重复写入。选择不同的 PDF 需求会重新生成一个独立版本，旧文件仍保留。只有真实文件生成、可选 PDF 生成和当前状态保存都成功，才记录为本方案的交付；失败保留具体原因，不能进入最终审阅。

Word 以章节组织原文，PPT 先确定性拆成有界文字页，不截掉过长内容；超过页面限制时明确请用户调整已确认方案。用户可在确认框架时选择一至四种风格，每份独立登记，仍沿用相同正文和内容预算。最后仍需通过工程整合和用户验收，文件容器有效不表示事实全部正确。

The output format is an explicit part of the confirmed framework. The delivery actor cannot change it through this call, choose a different template path or provide an unverified article. The same ordinary Word or presentation handbook is used for direct library calls and root delivery. Restarting a task first checks whether a usable version already exists. Reuse preserves its exact file identity and avoids repeating conversion as a side effect. If generation succeeds but the state compare-and-swap fails, the file remains on disk and the operation reports the conflict; it does not claim that the new user decision was fulfilled.

We **permit = flow.authorize(context=`context`,phase="implement",role="deliver")**.
1. not access(`permit`,"ok")
  Return *permit*.
We **permit = io.require(context=`context`,id="office")**.
1. not access(`permit`,"ok")
  Return *permit*.
We **state = access(core.status(context=`context`),"value")**.
We **kind = json.get(value=`state`,key="artifact_kind")**.
1. `kind` != "docx" and `kind` != "pptx"
  Return *result.error(code="office.unplanned",message="用户尚未确认办公交付格式",operation="assemble")*.
We **existing = ready(context=`context`,state=`state`)**.
1. access(`existing`,"ok") and json.get(value=access(`state`,"office_delivery"),key="render_pdf") == `render_pdf`
  Return *existing*.
We **prepared = sections(context=`context`,state=`state`)**.
1. not access(`prepared`,"ok")
  Return *prepared*.
We **sections = access(`prepared`,"value")**.
1. `kind` == "pptx"
  We **sections = paginate.slides(sections=`sections`)**.
We **created = create(context=`context`,state=`state`,sections=`sections`,render_pdf=`render_pdf`)**.
1. not access(`created`,"ok")
  Return *created*.
Return *store(context=`context`,state=`state`,created=`created`,render_pdf=`render_pdf`)*.

## create

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| state | map | required | 当前已确认方案 |
| sections | list | required | 当前通过验证的实际正文 |
| render_pdf | bool | required | 是否另生成真实 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | create 的实际结果，失败保留明确诊断 |

Use `context`, `state`, `sections`, `render_pdf`。

只把可信方案和已核对正文交给固定办公入口，不接受模型指定文件、函数、模板或效果。控制入口在项目根读取固定模板，生成器在较小任务根写入，实际正文与身份不能改变这些目录。这里的参数对象仅用于普通 Marqdo 函数调用，不是要求模型生成的动作协议。

生成器核对全部章节后才创建目录，真正打包、重新解包并建立摘要联系。若需要 PDF，还调用预装的排版引擎实际加载新文件；没有引擎或转换失败明确返回失败。一个子进程退出零不自动代表有效文件，返回值必须来自生成器检查后的实际登记。

本函数不修改阶段，也不替用户验收。新身份对应新的真实文件，原版继续保留。文件正文仍可能需要审阅，容器格式有效不证明领域事实正确、演示信息密度合适或排版满足所有目标应用。模型只在当前角色范围内取得返回证据，不会收到底层命令、令牌或另一个任务文件。

风格批处理只消费本次确认且通过独立测试的正文，全部变体使用相同输入，并行仅承担表现生成。并发限制沿用用户配置，最多四个。输出分别拥有真实身份和源稿，失败保留已完成文件与具体错误，不自动改变确认过的格式。默认三种风格可在确认框架时选择，不能由宿主另写一套生成业务。

同一批中的多个文件都必须有完整真实证据，不能用默认版本的成功掩盖其他版本失败。读取历史版本时保留精确身份；前端显示名称可以相同，但选择、下载与检查必须始终使用真实身份。用户无需看到内部长标识，也不能仅靠标题匹配版本。

主题选择仅授权表现生成，不能增加正文来源、修改已确认规格或改变独立测试。真实文件和 PDF 分别有摘要，最终审阅重新核对所有变体，避免用户切换到另一个版本时实际内容已经改变。登记锁不会把长时间排版串行化，只有最后写清单时短暂互斥，三个版本可以同时处于生成中。

每个主题由实际参数函数与固定声明资源共同提供。创建时先拒绝未知名字，再按同一份布局契约检查全部内容；父进程只负责有界并发与收集结果，不在宿主另写布局或模型提示。源稿、可编辑文件和预览各自保留身份，用户选择与下载始终定位实际文件。只读切换不会触发再次创作或覆盖原来版本。

We **route = access(routing.office(kind=access(`state`,"artifact_kind")),"value")**.
We **args = table.empty_map()**.
We **args = table.put(in=`args`,at="title",value=access(`state`,"title"))**.

We **args = table.put(in=`args`,at="render_pdf",value=`render_pdf`)**.
We **args = table.put(in=`args`,at="context",value=`context`)**.
We **themes = json.get(value=access(`state`,"settings"),key="office_themes")**.
1. `themes` == None
  We **themes = json.parse(text="[\"paper\",\"midnight\",\"coral\"]")**.
We **args = table.put(in=`args`,at="kind",value=access(`state`,"artifact_kind"))**.
We **args = table.put(in=`args`,at="sections",value=`sections`)**.
We **args = table.put(in=`args`,at="themes",value=`themes`)**.
We **limit = access(access(`state`,"settings"),"concurrency")**.
1. `limit` > 4
  We **limit = 4**.
We **args = table.put(in=`args`,at="concurrency",value=`limit`)**.
Return *call.invoke(file=(access(`context`,"project") + "/ext/office/variants.mq.md"),function="generate",arguments=`args`,root=access(`context`,"project"),effects="plugin,fs.read,fs.write,process.exec,environment.read,random.read")*.

## store

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| state | map | required | 生成前读取的真实状态 |
| created | map | required | 实际生成成功的 Result |
| render_pdf | bool | required | 本版实际采用的 PDF 选项 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | store 的实际结果，失败保留明确诊断 |

Use `context`, `state`, `created`, `render_pdf`。

只有文件真实生成后才提交状态联系。保存遵守根状态的版本比较，若用户或另一进程已改变方案，旧版本不能覆盖新决定；失败明确返回，原生成文件仍可在工作区核对，不能声称已绑定到新方案。

记录包含实际产物、格式选项与对应方案指纹，不存模型自报完成文字。之后 assemble 可以复用仍有效的版本，finish 则重新核对；生成、状态提交、工程整合和用户验收是独立边界。缓存存在不代表批准已经发生，也不能替代当前源码和独立试运行的检查。

这份状态不把新的办公二进制当作可执行代码，不改变冻结测试和各函数段职责。正文的改动应回到用户确认的修改流程，随后重新验证并创建新的办公版本，而不是手动更改旧文件的摘要。

We **receipt = table.put(in=None,at="fingerprint",value=fingerprint(state=`state`))**.
We **receipt = table.put(in=`receipt`,at="render_pdf",value=`render_pdf`)**.
We **receipt = table.put(in=`receipt`,at="artifact",value=access(`created`,"value"))**.
We **saved = core.save(context=`context`,state=table.put(in=`state`,at="office_delivery",value=`receipt`))**.
1. not access(`saved`,"ok")
  Return *saved*.
Return *created*.
