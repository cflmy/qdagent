---
markup: occlusion
title: 独立任务与工作目录
import:
  store: ../../ext/qdagent/store.mq.md
  hash: lib/hash.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  uuid: lib/uuid.mq.md
  time: lib/time.mq.md
  re: lib/re.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

在工程根调用。每个会话拥有独立档案、作业、事件日志和工作目录；切换只改变浏览器正在看的
会话，不终止其他任务，也不共享一个全局“当前回答”。会话身份由原生 UUID 产生，标题只是
展示文字，不能被当作文件路径。工作目录明确展示给用户，基础工具只在该目录执行。

## ensure

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | "default" | 安全的任务身份 |
| title | text | "默认任务" | 首次创建时的可读标题 |
| principal | text | "local" | 宿主认证后的真实身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，value 是真实会话上下文 |

Use `id`="default", `title`="默认任务" and `principal`="local"。只允许简单身份，不允许路径分隔符与父目录。
已有会话保留标题与历史。新会话安装同一版本的 ABI，独立文件根让之前固定在一个目录里的
作业管理也能安全复用，不需要重写 Marqdo 的文件系统或子任务机制。

Each context is stored in its own directory, so creating two tasks does not race on a shared session
index. Native artifacts are installed once for that context. The source entry remains in this project,
while the child call receives the session root explicitly; model tool calls get the narrower workspace root.

The id is an opaque key with a small allowed alphabet. It is never a client-provided filesystem path. Titles can repeat and may contain natural language; they do not affect directory selection. The context names three roots: the engineering project holds trusted source and package settings, the session root holds history and runtime state, and the workspace root holds files the agent may read and write. Keeping these roots distinct prevents a file tool from editing the application simply because the user is chatting with it.

Each session installs the same task runtime. The worker digest detects a changed build and avoids copying unchanged executables on every poll. Installation preserves executable permissions with the native file-copy operation. Source remains in the engineering project, and every child receives an explicit fs-root. A new session therefore reuses Marqdo's existing filesystem and plugin behavior rather than implementing a second virtual workspace.

Existing context data wins over defaults: reopening a task preserves its title and creation time. The default task may import an old archive, but the original archive stays in place and the new Markdown store uses a different filename. An upgrade should not create a new conversation just because the UI was rebuilt. If native installation is missing or the copy fails, preserve that diagnostic; do not return a ready task whose worker cannot run.

For development, create a dedicated named session or use the isolated capabilities test project. Do not point an acceptance run at a user's current workspace. Switching between existing contexts is a read/control operation, whereas creating a context establishes new directories. Neither action should cancel an unrelated task or move its files.


SQLite ownership is reserved before writing any session files. A competing principal cannot claim an existing task merely by guessing its directory name. An old context without an owner can be imported only by the local development identity, preserving historical material without exposing it to the first OIDC user who logs in. Authenticated default tasks receive a stable derived id, so two users do not accidentally share the old global default. The context contains both the owner and the current project path; moving data into a container rebuilds stale absolute paths and refreshes native artifacts without discarding the workspace.

The stored owner is authoritative even if another principal supplies the same task id. A read-only image can refresh runtime copies inside the data volume without writing into program source.

1. not re.is_match(text=`id`, pattern="^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
  Return *[任务身份不是路径](result.error(code="qdagent.session_id", message="无效任务身份", operation="ensure"))*.
1. `id` == "default" and `principal` != "local"
  We **digest = hash.sha256(text=`principal`)**.
  We **id = "u-" + re.find(text=`digest`, pattern="^.{24}") + "-default"**.
We **relative = "data/sessions/" + `id`**.
We **args = table.append(list=table.empty_list(), item=`id`)**.
We **rows = store.query(sql="SELECT owner,context FROM qd_tasks WHERE id=?", args=`args`)**.
1. not `rows` and fs.exists(path=(`relative` + "/context.json"))
  We **legacy = fs.read_json(path=(`relative` + "/context.json"))**.
  1. `principal` != "local" and json.get(value=`legacy`, key="owner") != `principal`
    Return *[旧档案不能被陌生身份认领](result.error(code="qdagent.forbidden", message="任务不属于当前身份", operation="ensure"))*.
We **created = time.now_ms()**.
We **values = table.append(list=`args`, item=`principal`)**.
We **values = table.append(list=`values`, item=`title`)**.
We **values = table.append(list=`values`, item=`created`)**.
We **_ = [SQLite 原子保留任务归属](store.execute(sql="INSERT OR IGNORE INTO qd_tasks(id,owner,title,created_ms) VALUES(?,?,?,?)", args=`values`))**.
We **rows = store.query(sql="SELECT owner,context FROM qd_tasks WHERE id=?", args=`args`)**.
We **row = access(`rows`,1)**.
1. access(`row`,"owner") != `principal`
  Return *[先检查归属再接触目录](result.error(code="qdagent.forbidden", message="任务不属于当前身份", operation="ensure"))*.
We **saved = table.empty_map()**.
1. access(`row`,"context") != "{}"
  We **saved = json.parse(text=access(`row`,"context"))**.
2. fs.exists(path=(`relative` + "/context.json"))
  We **saved = fs.read_json(path=(`relative` + "/context.json"))**.
We **project = sys.cwd()**.
We **digest = fs.file_hash(path="ext/native/qdagent-worker") + fs.file_hash(path="ext/native/libweb.so")**.
1. `saved`
  We **title = access(`saved`,"title")** and **created = access(`saved`,"created_ms")**.
  1. json.get(value=`saved`, key="native_digest") == `digest` and access(`saved`,"project") == `project` and json.get(value=`saved`, key="owner") == `principal`
    Return *[重用已登记上下文](result.ok(value=`saved`))*.
We **root = `project` + "/" + `relative`**.
We **workspace = `project` + "/data/workspaces/" + `id`**.
We **_ = fs.make_dirs(path=(`relative` + "/data/dialogue/proj"))**.
We **_ = fs.make_dirs(path=(`relative` + "/ext/native"))**.
We **_ = fs.make_dirs(path=("data/workspaces/" + `id`))**.

`binaries` =

| name |
|---|
| "libagent.so" |
| "libweb.so" |
| "libllm.so" |
| "libqdagent_transport.so" |
| "qdagent-worker" |

- [只复制已安装 ABI](for binaries as name)
  We **_ = fs.copy_file(src=("ext/native/" + `name`), dest=(`relative` + "/ext/native/" + `name`))**.

`context` =

| id | title | project | root | workspace | created_ms | bundle | native_digest | owner |
|---|---|---|---|---|---|---|---|---|
| `id` | `title` | `project` | `root` | `workspace` | `created` | "0.3.0" | `digest` | `principal` |

1. `id` == "default" and not fs.exists(path=(`relative` + "/data/dialogue/proj/session.mq.md")) and fs.exists(path="pages/data/dialogue/proj/session.mq.md")
  We **_ = fs.copy_file(src="pages/data/dialogue/proj/session.mq.md", dest=(`relative` + "/data/dialogue/proj/session.mq.md"))**.
We **_ = fs.atomic_write(path=(`relative` + "/context.json"), text=json.stringify(value=`context`))**.
We **values = table.append(list=table.empty_list(), item=json.stringify(value=`context`))**.
We **values = table.append(list=`values`, item=`title`)**.
We **values = table.append(list=`values`, item=`id`)**.
We **values = table.append(list=`values`, item=`principal`)**.
We **_ = store.execute(sql="UPDATE qd_tasks SET context=?,title=? WHERE id=? AND owner=?", args=`values`)**.
Return *[任务有明确身份归属](result.ok(value=`context`))*.

## create

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| title | text | "新任务" | 人类可读任务名 |
| principal | text | "local" | 宿主认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 新建会话的 Result |

Use `title`="新任务" and `principal`="local"。标题可以重复，身份始终独立。新任务不会复用另一个任务的提示词、
文件、进程或完成标记。用户可以在界面随时切回来继续工作；切换本身不发送取消请求。

We **id = [原生唯一任务身份](uuid.v4())**.
Return *[建立实际工作目录](ensure(id=`id`, title=`title`, principal=`principal`))*.

## list


| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| principal | text | "local" | 宿主认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 已建立的真实会话及当前作业状态 |

目录中的 context.json 是登记依据，不返回凭空的演示任务。每个作业文件只属于自己的会话，
列表中的状态也从对应作业读取。未开始、进行中、完成或失败是运行状态，不根据模型口头声明推断。

The list is reconstructed from per-session context files instead of a shared mutable current-task pointer. An unfinished job in task A does not make task B busy. Conversely, showing B does not change A's process state. A status label is read from the corresponding job record, not inferred from the assistant's final sentence.

If a process exits unexpectedly, opening or polling that task lets the runner reconcile its transport result. Merely enumerating tasks does not run a model, write a new conversation turn or repeat a tool.


Use `principal`="local"。归属是 SQLite 中的不可覆盖记录，浏览器提交别人的任务身份也无法访问。

We **_ = [每个身份拥有自己的默认任务](ensure(principal=`principal`))**.
We **args = table.append(list=table.empty_list(), item=`principal`)**.
We **rows = [不枚举其他人的目录](store.query(sql="SELECT context,status FROM qd_tasks WHERE owner=? AND context!='{}' ORDER BY created_ms DESC", args=`args`))**.
We **items = table.empty_list()**.
- [只投影当前身份的真实记录](for rows as row)
  We **context = json.parse(text=access(`row`,"context"))**.
  We **context = table.put(in=`context`, at="status", value=access(`row`,"status"))**.
  We **items = table.append(list=`items`, item=`context`)**.
Return *items*.
