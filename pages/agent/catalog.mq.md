---
markup: occlusion
title: 工具契约也是可调用能力目录
import:
  plugins: ../control/plugins.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
---

使用已有 ToolSpecV1 注册和参数校验。基础工具不再是空白名单；拓展工具随持久开关变化。
可信目录决定源码、函数、效果和文件根，模型只能选择已登记身份并提供命名参数。

## specification

| 参数 | 类型 | 说明 |
|---|---|---|
| definition | map | 可信工具定义，不能由模型提供 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 可交给原有智能体库注册的 ToolSpecV1 |

Use `definition`。字段描述只使用现有校验器支持的类型，不混入它不支持的 Schema 组合。
required 为空时是真正的空列表，未给的可选参数由目标函数默认值处理。执行元数据与参数
Schema 分开，避免模型通过 arguments 改写源码、文件根或权限。

A definition has two audiences. The model reads the identifier, description and parameter schema; the host reads the source path, function, effect and root kind. These host fields cannot be overridden by the argument object. A missing optional parameter stays absent so the target's documented default is used. An empty required list is a real list, not an empty string interpreted as a field name. For example, list_files can omit path, while write_file requires both path and text. Unsupported schema keywords should fail at the existing native registration boundary instead of being silently ignored.

We **properties = [从真实字段开始](table.empty_map())**.
We **fields = [读取登记字段](text.str_split(s=access(`definition`, "fields"), sep=","))**.
- [把简明定义转换为 Schema](for fields as field)
  1. `field` != ""
    We **pair = [名称与类型](text.str_split(s=`field`, sep=":"))**.
    We **property = [只声明支持的属性类型](table.put(in=None, at="type", value=access(`pair`, 2)))**.
    We **properties = [登记实际参数名](table.put(in=`properties`, at=access(`pair`, 1), value=`property`))**.
We **required = [可选字段不伪造必填值](table.empty_list())**.
1. access(`definition`, "required") != ""
  We **required = [明确必填字段](text.str_split(s=access(`definition`, "required"), sep=","))**.

`schema` =

| type | properties | required | additionalProperties |
|---|---|---|---|
| "object" | `properties` | `required` | False |

We **spec = [绑定参数契约](table.put(in=`definition`, at="input_schema", value=`schema`))**.
We **spec = [沿用已有注册版本](table.put(in=`spec`, at="schema", value="ToolSpecV1"))**.
We **spec = [明确可用状态](table.put(in=`spec`, at="availability", value="ready"))**.
We **spec = [与任务进程上界保持一致](table.put(in=`spec`, at="timeout_ms", value=900000))**.
Return *spec*.

## tools

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 当前允许模型选择的真实工具契约 |

Use `principal`="local"。身份只能来自宿主认证上下文。

根流程的工具也是已安装插件中的函数，而非浏览器里的静态按钮。skill_intent 只产生一个真实待答问题，不授予基本方案权限；skill_outline 生成可用 View 阅读的函数骨架，等待用户确认。skill_refine 汇总已授权的独立单元与案例，具体并发数和子模型来自用户设置，主模型不能临时扩大。skill_integrate 必须检查源码与试运行证据才产生待验收入口。skill_status 只恢复状态，读取它不会替用户点击确认。

这些模型工具的参数以根入口的官方契约为准，宿主投影移除可信 context 后交给提供方。可信任务根和身份仍由执行器注入；用户输入、历史工具参数、模型声称的阶段都不能覆盖它们。普通文件工具与根流程共享工作区，但无权编辑会话私有阶段记录。模型即使记住上一阶段的工具名，执行前门禁仍按当前真实状态检查。停用根插件会保留现有资料，并阻止继续执行，不能把停用当作绕过必经步骤的方式。

实际案例与工程验收也有不同含义。工具返回一个合法值，只能说明这次调用得到了该结果；语法校验不能证明文稿内容可信，单元案例不能覆盖所有业务输入。根流程把这些证据分别保存，最终让用户在右侧阅读完整实现和说明，再作出验收决定。对于空实现，描述中应直接写明尚未接通，不能用一个正常返回值暗示外部功能已经完成。继续开发时先检查真实资料与既有诊断，再决定是修复自己的单元还是请求用户调整已确认的边界，不能通过重复执行掩盖不确定的副作用。

这个目录说清“可以做什么”，实际工作由各自源码完成。文件工具只得到当前任务工作根，
手册与纯函数控制器使用工程根，但不开放任意服务器路径。网络工具属于可关闭的 net，
不是借标准库不可关闭这一点绕过用户开关。所有目标最终都通过 marqdo call 运行。

The registry is a contract, not an execution transcript. A listed tool is available to request, while
a successful task still needs an observed CLI result. The dispatcher validates the same specification,
checks the current plugin state again, records the actual arguments and runs only the registered file
and function. Generated text cannot add an executable or broaden a permission.

The standard tools deliberately cover a useful starting environment. Listing and reading establish
what exists; writing creates a real artifact; searching finds existing evidence; running a Marqdo
function verifies that the artifact works. Reading a library teaches the actual parameter contract,
and pure library calls reuse the language rather than replacing it with handwritten external code.
The optional network tool returns data for inspection, never a page to execute in the assistant UI.

| 工具 | 适合的任务 | 完成证据 |
|---|---|---|
| list_files | 先了解当前工作目录 | 原生目录读取的条目 |
| read_file | 基于实际内容修改 | 真实文件的有界文本 |
| write_file | 创建或更新任务材料 | 原子写入完成，结果保留目标路径 |
| search_files | 从已有材料定位 | 命中文件与真实片段 |
| run_marqdo | 验证所写的 .mq.md | 子调用退出、返回值及错误 |
| read_library | 先学已存在的能力 | 标准库或拓展源码 |
| call_library | 计算与数据转换 | 既有纯函数实际返回 |
| http_get | 用户启用后的网络读取 | 实际 HTTP 状态和正文 |

Changing a switch removes an optional tool from the next model context. A request already generated
under an older context is checked again before invocation, so changing the panel cannot leave a hidden
authorized path. Built-in tools remain available, and missing native artifacts are reported rather
than replaced by a simulated success.

The same definitions support discoverability, authorization and execution receipts. Availability alone is not evidence that any action occurred; the event log records the later invocation.

The engineering tools extend the existing workspace workflow: file_info establishes size and type before reading, patch_file requires one exact observed match, and check_marqdo checks the real contract and narrative ratio before execution. None accepts an executable or an arbitrary command. All three are Marqdo functions in the trusted tool module, and the dispatcher supplies their root, effects and receipt identity independently of model arguments. A successful check is distinct from a successful run; stale patches and malformed source remain explicit failures.

The planning tools create a durable agreement rather than simulated progress. plan_task names the goal, acceptance criteria and a short list of string steps. read_plan restores it, and update_plan requires a real evidence file before marking a step completed. Reading or writing a plan does not itself perform the user's substantive task. The runner checks unfinished plan steps before certifying a final successful workflow.

The office tool accepts structured headings and bodies, producing an editable document and a readable Markdown manuscript. It uses fixed declaration templates, native filesystem operations and ZIP packaging. render_pdf=true additionally invokes the registered layout boundary immediately after generating a fresh safe office package. The model cannot submit an arbitrary uploaded binary to a generic converter or select another executable. The delivered manifest records real files and digests, with authenticated preview and download handled separately.

Delegation is another actual tool operation. A parent supplies a small self-contained goal and material, while the host injects the model identity, owner, depth, work directory and smaller role-specific tool list. The first implementation has one level and at most three sequential children per parent run, each with eight decisions. A reviewer may assess supplied text directly. A writer that only promises future work cannot be marked complete. The parent reads the handoff and verifies its own acceptance conditions.

These definitions are shared by discovery and execution, so adding a public tool means documenting its schema, fixed source, effect class and root kind together. A new optional plugin still needs an installed entry and a current enabled state. Neither a long model answer nor a plugin directory creates authority or a successful receipt.

`definitions` =

| @ | id | description | fields | required | file | function | cli_effects | effect | plugin | root_kind |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | "list_files" | "列出当前任务工作目录的真实文件，path 默认为点。" | "path:string" | "" | "pages/agent/tools.mq.md" | "list_files" | "fs.read" | "read" | "stdlib" | "workspace" |
| 2 | "read_file" | "读取工作目录内 path 文件，先看真实内容再修改。" | "path:string" | "path" | "pages/agent/tools.mq.md" | "read_file" | "fs.read" | "read" | "stdlib" | "workspace" |
| 3 | "write_file" | "创建或更新工作文件，必须给出 path 和实际 text。" | "path:string,text:string" | "path,text" | "pages/agent/tools.mq.md" | "write_file" | "fs.read,fs.write" | "write" | "stdlib" | "workspace" |
| 4 | "search_files" | "在当前工作文件中搜索 query 文字。" | "query:string" | "query" | "pages/agent/tools.mq.md" | "search_files" | "fs.read" | "read" | "stdlib" | "workspace" |
| 5 | "run_marqdo" | "通过 marqdo call 运行工作目录中的 .mq.md，默认非实例函数 run。" | "path:string,function:string,arguments:object" | "path" | "pages/agent/tools.mq.md" | "run_marqdo" | "plugin,fs.read,fs.write,process.exec,environment.read" | "execute" | "stdlib" | "workspace" |
| 6 | "read_library" | "阅读英文标准库模块、已启用拓展或 guide 开发手册。" | "module:string" | "module" | "pages/control/libraries.mq.md" | "read_document" | "plugin,fs.read,fs.write" | "read" | "stdlib" | "project" |
| 7 | "call_library" | "调用 math、table、text、json、hash 等纯计算模块。" | "module:string,function:string,arguments:object" | "module,function" | "pages/control/libraries.mq.md" | "invoke" | "plugin,fs.read,fs.write,process.exec,time.read,random.read,environment.read" | "read" | "stdlib" | "project" |
| 8 | "http_get" | "通过启用的网络插件读取明确 HTTP 或 HTTPS 地址。" | "url:string" | "url" | "ext/net/client.mq.md" | "get" | "network.read" | "read" | "net" | "workspace" |
| 9 | "call_plugin" | "调用已启用拓展入口公开的 operation；先用 read_library 读参数。支持 quantum、web、net、data、security、ai，未登记函数不可执行。" | "plugin:string,operation:string,arguments:object" | "plugin,operation" | "pages/control/plugin_calls.mq.md" | "invoke" | "plugin,fs.read,fs.write,process.exec,environment.read" | "execute" | "stdlib" | "project" |
| 10 | "file_info" | "先检查工作文件的真实类型、大小和修改时间。" | "path:string" | "path" | "pages/agent/tools.mq.md" | "file_info" | "fs.read" | "read" | "stdlib" | "workspace" |
| 11 | "patch_file" | "先读原文，再对唯一匹配片段做精确替换；冲突时拒绝。" | "path:string,find:string,replace:string" | "path,find,replace" | "pages/agent/tools.mq.md" | "patch_file" | "fs.read,fs.write" | "write" | "stdlib" | "workspace" |
| 12 | "check_marqdo" | "按工程规范检查工作目录中 .mq.md 的契约和叙述比例；不执行源码。" | "path:string" | "path" | "pages/agent/tools.mq.md" | "check_marqdo" | "fs.read,process.exec" | "read" | "stdlib" | "workspace" |
| 13 | "plan_task" | "多步骤任务先写目标、acceptance 验收和 steps 字符串数组，例如 [先读取材料,生成文稿,核验文件]；计划会持久保存。" | "goal:string,acceptance:string,steps:array" | "goal,acceptance,steps" | "pages/agent/plan.mq.md" | "create" | "fs.read,fs.write,random.read" | "write" | "stdlib" | "workspace" |
| 14 | "read_plan" | "恢复当前任务的真实计划与证据；读取不会执行步骤。" | "" | "" | "pages/agent/plan.mq.md" | "read" | "fs.read" | "read" | "stdlib" | "workspace" |
| 15 | "update_plan" | "更新 step 序号和 status（running、blocked、completed），完成需 evidence 指向真实文件。" | "step:number,status:string,evidence:string" | "step,status" | "pages/agent/plan.mq.md" | "update" | "fs.read,fs.write" | "write" | "stdlib" | "workspace" |
| 16 | "create_office" | "生成真实可编辑 docx 报告或 pptx 演示；title 题目，sections 为 heading、body 记录数组。每节 PPT 最多八行、七百字，会自动加封面。保留 Markdown 源稿和 SHA256。" | "kind:string,title:string,sections:array,render_pdf:boolean" | "kind,title,sections" | "ext/office/index.mq.md" | "create" | "plugin,fs.read,fs.write,process.exec,environment.read" | "write" | "office" | "project" |
| 17 | "delegate_task" | "委托 researcher、writer 或 reviewer 子智能体；goal 小目标与 inputs 交接文字。继承模型，每轮最多三次、每个子任务八轮，不再派生。" | "role:string,goal:string,inputs:string" | "role,goal" | "pages/agent/delegate.mq.md" | "invoke" | "plugin,fs.read,fs.write,process.exec,time.read,random.read,environment.read,network.write" | "execute" | "ai" | "workspace" |
| 18 | "skill_status" | "恢复根 SKILL 的阶段、用户待确认内容和真实证据。" | "" | "" | "ext/root-skill/index.mq.md" | "status" | "plugin,fs.read,fs.write,environment.read" | "read" | "root-skill" | "workspace" |
| 19 | "skill_intent" | "意图拆解：summary 当前理解，question 向用户提问，choices 二到六个文字选项；用户可以自由输入和多轮澄清。" | "summary:string,question:string,choices:array" | "summary,question,choices" | "ext/root-skill/index.mq.md" | "clarify_intent" | "plugin,fs.read,fs.write,environment.read" | "write" | "root-skill" | "workspace" |
| 20 | "skill_outline" | "基本方案：先形成函数骨架供用户在 View 确认。units 是 id、title、purpose、depends_on 记录数组，依赖须出现在前面。" | "title:string,goal:string,acceptance:string,units:array" | "title,goal,acceptance,units" | "ext/root-skill/index.mq.md" | "outline" | "plugin,fs.read,fs.write,environment.read" | "write" | "root-skill" | "workspace" |
| 21 | "skill_refine" | "用户确认框架之后，按配置请求受限并行细化；必须实际创作、编译校验和试运行才可进入整合。" | "" | "" | "ext/root-skill/index.mq.md" | "refine" | "plugin,fs.read,fs.write,environment.read" | "execute" | "root-skill" | "workspace" |
| 22 | "skill_integrate" | "完整方案：narrative 写明设计、来源、限制、调用和验收。合并已验证单元为 index.mq.md，保留真实交流，独立检查后等待用户验收。" | "narrative:string" | "narrative" | "ext/root-skill/index.mq.md" | "integrate" | "plugin,fs.read,fs.write,environment.read" | "write" | "root-skill" | "workspace" |

The generic call_plugin adapter remains a registered environment tool, but it does not keep optional permissions alive. Its controller reloads the chosen extension's switch, checks the operation against the installed public list and receives context only from the host after schema validation. The actual extension child uses the task workspace root. An unavailable ABI or unregistered entry fails visibly rather than falling back to arbitrary reflection.
We **out = [没有演示工具](table.empty_list())**.
- [只登记真实可用能力](for definitions as definition)
  We **allowed = [核对当前开关](plugins.require(id=access(`definition`, "plugin"), principal=`principal`))**.
  1. `allowed`[^ok]
    We **out = [交给已有工具注册器](table.append(list=`out`, item=specification(definition=`definition`)))**.
Return *out*.
