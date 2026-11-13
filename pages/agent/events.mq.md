---
markup: occlusion
title: 真实执行事件日志
import:
  store: ../../ext/qdagent/store.mq.md
  fs: lib/fs.mq.md
  time: lib/time.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
---

任务进程是正常事件的唯一写入者；取消先停止该进程，再记录终态。
事件不可变，开始与结束通过 span 身份对应。界面依据真实阶段产生动画，不生成假的百分比，
不把模型内部推理或未执行的计划当作工具证据。

## read

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | 当前任务真实事件 |

文件缺失表示尚未开始，不补演示步骤。原子更新让轮询始终读到完整 JSON。
当前运行根属于一个会话，别的任务没有理由读取这里的日志。

1. fs.exists(path="data/dialogue/proj/events.json")
  Return *[真实已记录事件](fs.read_json(path="data/dialogue/proj/events.json"))*.
Return *[尚无事件](table.empty_list())*.

## append

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| kind | text | required | task、model、tool 或 finish |
| title | text | required | 可公开的操作说明 |
| details | any | None | 实际参数、结果或错误 |
| span | number | 0 | 结束事件对应的开始身份 |
| status | text | "running" | 真实状态 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | number | 新事件的唯一递增序号 |

Use `kind`, `title`, `details`=None, `span`=0 and `status`="running"。
开始时只记录确实进入的阶段；结束时才记录退出、结果和耗时。details 只包含公开的操作信息，
不要求模型输出思维链。没有真实调用就没有工具成功事件，界面也不能替后台补造成功。

A run marker is written before the first start event and is reused by every later event in that run. SQLite stores the task, run and sequence as a composite key; restarting a sequence in another run cannot replace its previous evidence. The JSON file is the current UI projection, while the database preserves earlier runs. Only contexts created by the session manager provide the trusted project path for that write. Neither a model message nor a browser query can choose another database.

We **events = [读取前一版本](read())**.
We **seq = table.len(xs=`events`) + 1**.
We **at = [记录真实墙钟时间](time.now_ms())**.

`event` =

| seq | kind | title | details | span | status | at_ms |
|---|---|---|---|---|---|---|
| `seq` | `kind` | `title` | `details` | `span` | `status` | `at` |

1. fs.exists(path="context.json")
  We **context = fs.read_json(path="context.json")**.
  We **run_id = "pending"**.
  1. fs.exists(path="data/dialogue/proj/job.json")
    We **job = fs.read_json(path="data/dialogue/proj/job.json")**.
    We **run_id = json.get(value=`job`, key="run_id")**.
  1. fs.exists(path="data/dialogue/proj/current-run.id")
    We **run_id = fs.read_text(path="data/dialogue/proj/current-run.id")**.
  We **event = table.put(in=`event`, at="run_id", value=`run_id`)**.
  We **_ = [实际事件同步 SQLite](store.record(context=`context`, kind="event", value=`event`))**.
We **events = [只追加实际事件](table.append(list=`events`, item=`event`))**.
We **_ = [原子发布给轮询](fs.atomic_write(path="data/dialogue/proj/events.json", text=json.stringify(value=`events`)))**.
Return *seq*.

## finish

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| span | number | required | 开始事件身份 |
| details | any | None | 实际结果 |
| status | text | "succeeded" | succeeded、failed 或 cancelled |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | number | 对应结束事件序号 |

Use `span`, `details`=None and `status`="succeeded"。结束是事实，不是模型表达的愿望。
调用者得到实际执行结果后才使用本函数；失败与取消保持各自状态，不能被一个绿色完成动画覆盖。
时间线可以更新已有卡片状态而不重建卡片，所以用户打开的详情不会被下一拍强行折回。

Return *[记录实际结束](append(kind="finish", title="结束", details=`details`, span=`span`, status=`status`))*.
