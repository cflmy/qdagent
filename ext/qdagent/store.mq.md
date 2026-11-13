---
markup: occlusion
title: SQLite 是任务与身份的持久存储
import:
  plugin: lib/plugin.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  time: lib/time.mq.md
---

任务登记、插件偏好、会话消息与实际事件使用同一份 SQLite。Markdown 与工作文件继续是可阅读的文件；数据库不依赖 Redis 或 PostgreSQL。所有 SQL 值均为绑定参数，可信工程根由宿主选择，不能从模型参数取得。

## initialize

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际 SQLite URL |

初始化在工程根运行，创建可持久化 data 目录。WAL 与原生忙等待支持独立任务进程并发写入，模式声明重复执行保持幂等。认证资源也使用同一数据库中的独立会话表，秘密不进入模式或 SQL 文本。

Schema creation belongs to startup and trusted application services. It never selects a model workspace or executes generated SQL. The tables separate tasks, per-principal plugin preferences, exported conversation records and immutable execution events. Native database failures remain visible.


SQLite is an embedded service dependency, so no database port or additional container is needed. The path is fixed beneath the application data volume. Authentication sessions use the existing native session table; application tables use their own names and bound queries. An image rebuild must not delete this volume. Creating an idempotent schema is distinct from granting a principal access to an existing task. The unique task key is reserved atomically, and the stored owner must be checked before any directory is read or written.

We **_ = [建立唯一持久目录](fs.make_dirs(path="data"))**.
We **_ = [复用已注册数据库 ABI](plugin.load(path="ext/native/libweb.so"))**.
We **url = "sqlite:" + sys.cwd() + "/data/qdagent.sqlite3"**.

`schema` =

| sql |
|---|
| "PRAGMA journal_mode=WAL" |
| "CREATE TABLE IF NOT EXISTS qd_tasks(id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, context TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'ready', created_ms INTEGER NOT NULL)" |
| "CREATE INDEX IF NOT EXISTS qd_tasks_owner ON qd_tasks(owner,created_ms)" |
| "CREATE TABLE IF NOT EXISTS qd_plugins(owner TEXT NOT NULL,id TEXT NOT NULL,enabled INTEGER NOT NULL,PRIMARY KEY(owner,id))" |
| "CREATE TABLE IF NOT EXISTS qd_model_profiles(id TEXT PRIMARY KEY,owner TEXT NOT NULL,label TEXT NOT NULL,protocol TEXT NOT NULL,model TEXT NOT NULL,endpoint TEXT NOT NULL,credential TEXT NOT NULL,thinking INTEGER NOT NULL DEFAULT 0)" |
| "CREATE INDEX IF NOT EXISTS qd_model_profiles_owner ON qd_model_profiles(owner)" |
| "CREATE TABLE IF NOT EXISTS qd_messages(task_id TEXT NOT NULL,turn INTEGER NOT NULL,question TEXT NOT NULL,answer TEXT NOT NULL,PRIMARY KEY(task_id,turn))" |
| "CREATE TABLE IF NOT EXISTS qd_events(task_id TEXT NOT NULL,run_id TEXT NOT NULL,seq INTEGER NOT NULL,event TEXT NOT NULL,PRIMARY KEY(task_id,run_id,seq))" |

- [使用真实 SQLite 模式](for schema as sql)
  We **_ = [只执行可信声明](web_db_exec(url=`url`, sql=`sql`, args=None, txn=None))**.
Return *url*.


## query

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| sql | text | required | 可信 SELECT |
| args | any | None | 绑定值 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实查询行 |

Use `sql` and `args`=None。服务端组织 SQL，用户值只进入占位参数。当前工程的 schema 先准备，再读真实记录；不能靠枚举文件夹推断某个身份拥有任务。The native driver returns rows and a count; callers receive the actual rows and must still verify ownership before exposing a task.


We **url = [准备真实 SQLite](initialize())**.
We **out = [原生参数化查询](web_db_query(url=`url`, sql=`sql`, args=`args`, txn=None))**.
Return *[实际结果行](access(`out`, "rows"))*.


## execute

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| sql | text | required | 可信写入声明 |
| args | any | None | 绑定值 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 原生写入结果 |

Use `sql` and `args`=None。只给可信控制器使用，不把它登记成模型的任意 SQL 工具。唯一键和条件更新由 SQLite 原子执行，不能用先读再写冒充并发控制。失败保留真实诊断，不能将空结果说成完成。


We **url = [唯一工程数据库](initialize())**.
Return *[保留实际数据库结果](web_db_exec(url=`url`, sql=`sql`, args=`args`, txn=None))*.


## preferences

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| principal | text | "local" | 可信身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 此身份的真实插件覆盖值 |

Use `principal`="local"。默认值只用于本机直接开发。Docker 请求的身份由认证宿主覆盖注入，不能由浏览器查询参数选择。没有覆盖值就使用插件安装默认值；不存在标准库停用记录。

Preferences belong to the authenticated principal, while installed packages are shared read-only image assets. Switching a preference never unloads the host or changes another user’s task permissions.


We **args = table.append(list=table.empty_list(), item=`principal`)**.
We **rows = [只读取当前身份偏好](query(sql="SELECT id,enabled FROM qd_plugins WHERE owner=?", args=`args`))**.
We **out = table.empty_map()**.
- [映射真实覆盖值](for rows as row)
  We **out = table.put(in=`out`, at=access(`row`,"id"), value=access(`row`,"enabled") == 1)**.
Return *out*.


## record

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信任务上下文 |
| kind | text | required | event 或 message 或 job |
| value | map | required | 实际记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | SQLite 中的实际写入 |

Use `context`, `kind` and `value`。后台进程运行于任务根，因此数据库 URL 必须来自可信 context.project。模式已由控制器建立，记录只复用既有 ABI。事件按真实 run_id 与序号保存；消息按任务和回合更新；作业状态属于对应任务。Markdown 档案与 JSON 工作日志仍保留，便于原生工具阅读与取消恢复。

This adapter is not a model tool. Context is written by the session manager after ownership checks. The database path is never taken from a question, request query or generated program. Event receipts preserve actual actions rather than private reasoning, and a repeated export upserts the same logical row instead of creating a fake second execution.


The runtime files remain useful projections for cancellation and human-readable development. Persist the corresponding message, event or status row under the same trusted task identity. A new run receives a run marker before its first event so sequence numbers restarting at one do not overwrite a previous run's evidence. Generated text is not a database command, and a record describing success cannot replace the observed tool result. A failed SQLite write remains an application failure rather than being hidden by a later file export.

We **_ = [加载已有数据 ABI](plugin.load(path="ext/native/libweb.so"))**.
We **url = "sqlite:" + access(`context`,"project") + "/data/qdagent.sqlite3"**.
We **args = table.append(list=table.empty_list(), item=access(`context`,"id"))**.
We **sql = ""**.
1. `kind` == "event"
  We **args = table.append(list=`args`, item=access(`value`,"run_id"))**.
  We **args = table.append(list=`args`, item=access(`value`,"seq"))**.
  We **args = table.append(list=`args`, item=json.stringify(value=`value`))**.
  We **sql = "INSERT INTO qd_events(task_id,run_id,seq,event) VALUES(?,?,?,?) ON CONFLICT(task_id,run_id,seq) DO UPDATE SET event=excluded.event"**.
1. `kind` == "message"
  We **args = table.append(list=`args`, item=access(`value`,"turn"))**.
  We **args = table.append(list=`args`, item=access(`value`,"question"))**.
  We **args = table.append(list=`args`, item=access(`value`,"answer"))**.
  We **sql = "INSERT INTO qd_messages(task_id,turn,question,answer) VALUES(?,?,?,?) ON CONFLICT(task_id,turn) DO UPDATE SET answer=excluded.answer"**.
1. `kind` == "job"
  We **args = table.append(list=table.empty_list(), item=access(`value`,"status"))**.
  We **args = table.append(list=`args`, item=access(`context`,"id"))**.
  We **sql = "UPDATE qd_tasks SET status=? WHERE id=?"**.
1. `sql` == ""
  Return *None*.
Return *[真实业务状态落库](web_db_exec(url=`url`, sql=`sql`, args=`args`, txn=None))*.

