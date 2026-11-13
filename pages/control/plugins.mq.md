---
markup: occlusion
title: 拓展即插件的能力注册表
import:
  store: ../../ext/qdagent/store.mq.md
  fs: lib/fs.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

在工程根调用。固有标准库始终启用，拓展从已安装包与 ABI 产物得到可用状态。
开关控制新的智能体能力调用，不卸载正在提供界面的宿主服务；每次实际工具执行前还会重新
检查开关，不能只把按钮变灰而继续执行。目录存在与能力已安装是两件不同的事。

## catalog

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 真实模块、版本、开关、ABI 可用性与文档位置 |

标准库模块直接从 lib 读取英文单文件，避免中英文别名重复展示。拓展注册记录明确声明
自己的原生产物，缺失时显示不可用，不伪装成已加载。当前身份的覆盖开关存放于 SQLite qd_plugins，
不和某个任务的聊天记录混用；旧任务下一次调用也遵守最新开关。

The catalog answers three different questions: which capability is installed, whether the user permits new calls, and whether the required native artifact actually exists. A directory name answers none of these by itself. The built-in record is assembled from the installed English standard modules, so aliases do not appear as duplicate plugins. It has no persisted off switch. Extension records use stable identities, a documentation entry and explicit ABI names; their readable display names are not lookup paths.

Version reporting follows the installed files. The extension bundle supplies a default version, while a module-local VERSION can identify a qdagent-specific update. For instance, the small net HTTP client adapter is shipped as a local extension update rather than a modification of the Marqdo compiler. Updating that package should update its documentation, callable entry and installation mirror together. Missing binaries remain visible as unavailable; the UI must not describe them as successfully loaded.

The per-principal preference table stores overrides, not a second capability definition. An absent override means the installed default is enabled. An override cannot create an unknown extension, substitute another ABI or disable the built-in standard library. Each new tool invocation reads the current state again, which prevents a stale model prompt from retaining permission after a user changes a switch.

Host management is a separate responsibility from agent authorization. The Web host can continue rendering the settings panel after its agent-facing extension is disabled, and the task transport can continue stopping an existing job. Otherwise users could lose the very interface needed to recover. This does not authorize further model tool calls. Consumers should use require at the actual call boundary and preserve a failed Result instead of merely drawing a disabled button.

When registering a future ABI extension, add a stable identity, its real documentation entry, the native artifacts it needs and the trusted callable adapter that exposes its operations. Keep business behavior in readable .mq.md files. A successful installation check proves the artifact exists; a subsequent observed call proves a particular operation ran.

Use `principal`="local"。覆盖值来自当前身份的 SQLite 记录。

We **settings = [读取此身份的实际偏好](store.preferences(principal=`principal`))**.
We **modules = [读取真实标准库文件](fs.list_dir(path="lib"))**.
We **standard = [标准库清单](table.empty_list())**.
- [只列原始单文件模块](for modules as file)
  1. re.is_match(text=`file`, pattern="^[a-z][a-z0-9_]*[.]mq[.]md$")
    We **standard = [登记固有模块](table.append(list=`standard`, item=`file`))**.

`core` =

| id | name | version | builtin | enabled | available | entry | modules | operations |
|---|---|---|---|---|---|---|---|---|
| "stdlib" | "标准库 · 固有能力" | "CLI 内建" | True | True | True | "lib/" | `standard` | "" |

`installed` =

| @ | id | name | abi | entry | operations |
|---|---|---|---|---|---|
| 1 | "ai" | "模型与智能体" | "libagent.so" | "ext/ai/index.mq.md" | "collect_events,offline_example" |
| 2 | "web" | "网页与阅读渲染" | "libweb.so" | "ext/web/index.mq.md" | "site_playbook,layout_rules,preview_markdown,preview_nodes" |
| 3 | "net" | "网络与实时连接" | "libweb.so" | "ext/net/index.mq.md" | "client_get" |
| 4 | "data" | "数据与存储" | "libweb.so" | "ext/data/index.mq.md" | "memory_cache,transaction_roundtrip" |
| 5 | "security" | "身份与权限" | "libweb.so" | "ext/security/index.mq.md" | "check_permission" |
| 6 | "quantum" | "量子计算" | "libquantum.so" | "ext/quantum/index.mq.md" | "bell_circuit,bell_phi_plus,bell_analysis" |
| 7 | "linalg" | "线性代数" | "liblinalg.so" | "ext/linalg/index.mq.md" | "solve_example" |
| 8 | "engineering" | "工程工具" | "libengineering.so" | "ext/engineering/index.mq.md" | "" |
| 9 | "qdagent" | "任务运行与持久流" | "libqdagent_transport.so" | "ext/qdagent/index.mq.md" | "" |
| 11 | "root-skill" | "根 SKILL · 文档驱动流程" | "libqdagent_transport.so" | "ext/root-skill/index.mq.md" | "" |
| 10 | "office" | "办公文档与演示" | "" | "ext/office/index.mq.md" | "" |

We **version = [读取已安装拓展版本](text.str_trim(s=fs.read_text(path="ext/VERSION")))**.
We **out = [固有能力先展示](table.append(list=table.empty_list(), item=`core`))**.
- [登记已接入包](for installed as item)
  We **id = access(`item`, "id")** and **enabled = True** and **entry_version = `version`**.
  1. json.get(value=`settings`, key=`id`) == False
    We **enabled = False**.
  1. fs.exists(path="ext/" + `id` + "/VERSION")
    We **entry_version = [读取拓展自身版本](text.str_trim(s=fs.read_text(path="ext/" + `id` + "/VERSION")))**.
  We **available = [核验实际 ABI 产物](fs.exists(path="ext/native/" + access(`item`, "abi")))**.
  1. `id` == "root-skill"
    We **available = `available` and fs.exists(path=access(`item`,"entry"))**.
  1. access(`item`,"abi") == ""
    We **available = [组合插件复用内建文件与 ZIP 能力](fs.exists(path=access(`item`,"entry")))**.

  `record` =

  | id | name | version | builtin | enabled | available | entry | modules | operations |
  |---|---|---|---|---|---|---|---|---|
  | `id` | `item`[^name] | `entry_version` | False | `enabled` | `available` | `item`[^entry] | None | `item`[^operations] |

  We **out = [加入实际记录](table.append(list=`out`, item=`record`))**.
Return *out*.

## require

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 登记的插件身份，stdlib 表示固有能力 |
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result；关闭、缺失或未知能力均不能执行 |

Use `id` and `principal`="local"。检查当前持久状态，不接受模型自己提交的 enabled 或 available。
标准库没有可关闭路径；拓展的目录、原生包与授权开关同时成立才可调用。宿主为了保持界面
可操作而加载的 Web 实例，不等于智能体获得了被关闭的 Web 工具权限。

We **entries = [读取当前真实授权](catalog(principal=`principal`))**.
- [按注册身份定位](for entries as entry)
  1. access(`entry`, "id") == `id`
    1. not access(`entry`, "enabled") or not access(`entry`, "available")
      Return *[拒绝关闭或缺失的能力](result.error(code="qdagent.plugin_disabled", message=`id`, operation="require"))*.
    Return *[能力可用](result.ok(value=`entry`))*.
Return *[未知能力不可调用](result.error(code="qdagent.plugin_unknown", message=`id`, operation="require"))*.

## toggle

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 要切换的拓展身份 |
| principal | text | "local" | 宿主认证后的可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，包含切换后的实际开关 |

Use `id` and `principal`="local"。标准库不能停用，未知名称不会凭空登记成插件。切换只修改授权状态，不删除代码、
用户文件或运行记录。已经执行的副作用不回滚；新的工具调用在执行前重新核对本注册表。
不可用包仍保留真实状态，用户能清楚知道它缺少产物，而不是看到一个虚假的已启用能力。

A switch changes authorization for future operations; it is not an uninstall command and it cannot undo a file already written. A running model checks AI authorization before the next decision, and the dispatcher checks an optional tool again before invoking it. If a call has already crossed the execution boundary, its receipt remains part of the task history. Do not delete that receipt when disabling the extension.

The built-in rejection is enforced here as well as by the disabled UI button. A crafted request naming stdlib or a standard-module identity must fail before changing the settings file. Unknown identifiers also fail rather than producing a settings key for a nonexistent plugin. The response reports the actual persisted state; a front-end class change alone is insufficient evidence.

1. `id` == "stdlib" or text.starts_with(text=`id`, prefix="std.")
  Return *[固有能力不可关闭](result.error(code="qdagent.builtin_required", message="标准库是固有能力，不能停用", operation="toggle"))*.
We **entries = [确认已注册能力](catalog(principal=`principal`))**.
- [只更新真实拓展](for entries as entry)
  1. access(`entry`, "id") == `id`
    We **enabled = not access(`entry`,"enabled")**.
    We **args = table.append(list=table.empty_list(), item=`principal`)**.
    We **args = table.append(list=`args`, item=`id`)**.
    We **args = table.append(list=`args`, item=`enabled`)**.
    We **_ = [持久化当前身份偏好](store.execute(sql="INSERT INTO qd_plugins(owner,id,enabled) VALUES(?,?,?) ON CONFLICT(owner,id) DO UPDATE SET enabled=excluded.enabled", args=`args`))**.
    Return *[返回实际提交的偏好](result.ok(value=store.preferences(principal=`principal`)))*.

Return *[未知插件不登记](result.error(code="qdagent.plugin_unknown", message=`id`, operation="toggle"))*.
