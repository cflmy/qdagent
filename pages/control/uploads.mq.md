---
markup: occlusion
title: 有序分块上传与完整文件发布
import:
  fs: lib/fs.mq.md
  bytes: lib/bytes.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  uuid: lib/uuid.mq.md
  result: lib/result.mq.md
  number: ../api/request.mq.md
---

文件上限 50 MiB，单块最多 256 KiB。所有文件操作仍用 Marqdo 原生 fs/bytes；受信任 runner 的既有会话控制锁串行化每一步。片段只放在临时目录，全部字节确认后才移入 uploads，不能把未完成文件提供为成功附件。

## begin

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| name | text | required | 显示文件名 |
| total | any | required | 实际文件字节数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Result，上传身份、零偏移和预期总数 |

Use `name` and `total`。先规范字节数，超过 50 MiB 或非整数就拒绝；空文件允许直接完成。上传身份来自密码学随机 UUID，文件名只是经过清理的显示标签，不能指定服务器路径。临时文件与元数据写在当前任务文件根，工作根由服务端会话决定。

A new upload has no published attachment. The client must keep the returned id and send exactly the next expected byte offset. The native control lock surrounds each operation, so two chunk requests cannot both claim the same offset. Creating a new upload never overwrites an earlier file with the same display name. An abandoned upload remains a private partial file and is not reported as completed.

We **size = number.generation(value=`total`)**.
1. not access(`size`,"ok") or access(`size`,"value") > 52428800
  Return *[单文件不能超出 50 MiB](result.error(code="qdagent.upload_size", message="文件上限 50 MiB，大小必须是非负整数", operation="begin"))*.
We **safe = re.replace(text=`name`, pattern="[^A-Za-z0-9._\u4e00-\u9fff-]", with="_")**.
We **safe = re.find(text=`safe`, pattern="^.{0,100}")**.
1. not `safe`
  We **safe = "attachment"**.
We **id = uuid.v4()**.
We **_ = fs.make_dirs(path=".uploads")**.
We **_ = fs.write_bytes(path=(".uploads/" + `id` + ".part"), data=bytes.from_text(text=""))**.

`state` =

| upload_id | name | offset | total |
|---|---|---|---|
| `id` | `safe` | 0 | `size`[^value] |

We **_ = fs.write_json(path=(".uploads/" + `id` + ".json"), value=`state`)**.
Return *[只有真实身份和进度](result.ok(value=`state`))*.

## state

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| upload_id | text | required | 本任务上传身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Result，当前实际元数据 |

Use `upload_id`。身份只能是标准 UUID，不接受路径或任意文件名。这里只在已经授权的任务工作根中调用，另一个任务即使猜到身份也没有同一个根。元数据不存在时明确失败，不能把一个用户提供的偏移当作服务端事实。The state is read under the existing session control lock. Filesystem errors remain errors, and the client cannot replace the expected total after the upload has begun.

1. not re.is_match(text=`upload_id`, pattern="^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$") or not fs.exists(path=(".uploads/" + `upload_id` + ".json"))
  Return *[只能操作本任务真实上传](result.error(code="qdagent.upload_missing", message="上传不存在，请重新选择文件", operation="state"))*.
Return *[读取实际确认进度](result.ok(value=fs.read_json(path=(".uploads/" + `upload_id` + ".json"))))*.

## chunk

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| upload_id | text | required | 真实上传身份 |
| offset | any | required | 本块起始字节 |
| data_url | text | required | 有界 Base64 字节 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Result，只有已落盘后才增加的确认进度 |

Use `upload_id`, `offset` and `data_url`。每块先检查表示长度，解码后再次检查 256 KiB 上限及总大小。客户端偏移、元数据偏移与实际临时文件长度必须同时一致；乱序、重复和超过总数都会拒绝。先追加真实字节，再保存确认位置，不把浏览器读取进度当成上传成功。

This function runs inside the session control lock. A second request cannot append concurrently between the offset check and the write. A process crash between append and metadata commit leaves a detectable mismatch, rather than allowing a blind retry to duplicate bytes. The UI reports failure and asks for a fresh upload; it never silently retries a potentially completed mutation.

The Base64 payload is small enough for the existing Marqdo JSON call boundary and normal HTTP request limits. No large aggregate string is passed to a child. Each chunk uses fs.append_bytes in the authorized workspace, and there is no shell concatenation or Python file writer. Nothing becomes a published attachment until finish verifies the complete byte count.

The next offset is returned only after both the append and metadata write have completed.

We **opened = state(upload_id=`upload_id`)**.
1. not access(`opened`,"ok")
  Return *opened*.
We **current = access(`opened`,"value")**.
We **position = number.generation(value=`offset`)**.
1. not access(`position`,"ok") or access(`position`,"value") != access(`current`,"offset") or table.len(xs=`data_url`) > 360000 or not re.is_match(text=`data_url`, pattern="^data:[^,]*;base64,")
  Return *[顺序或表示不匹配](result.error(code="qdagent.upload_offset", message="上传偏移或分块无效，请重新上传", operation="chunk"))*.
We **part = ".uploads/" + `upload_id` + ".part"**.
1. access(fs.stat(path=`part`),"size") != access(`current`,"offset")
  Return *[不重放不确定的追加](result.error(code="qdagent.upload_offset", message="临时文件与进度不一致，请重新上传", operation="chunk"))*.
We **data = bytes.from_base64(text=re.replace(text=`data_url`, pattern="^data:[^,]*;base64,", with=""))**.
We **count = bytes.len(data=`data`)**.
We **next = access(`current`,"offset") + `count`**.
1. `count` == 0 or `count` > 262144 or `next` > access(`current`,"total")
  Return *[拒绝超过声明范围的字节](result.error(code="qdagent.upload_chunk", message="分块不能大于 256 KiB 或超过文件总大小", operation="chunk"))*.
We **_ = fs.append_bytes(path=`part`, data=`data`)**.
We **current = table.put(in=`current`, at="offset", value=`next`)**.
We **_ = fs.write_json(path=(".uploads/" + `upload_id` + ".json"), value=`current`)**.
Return *[确认已经写入的真实字节](result.ok(value=`current`))*.

## finish

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| upload_id | text | required | 真实上传身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Result，完整文件的工作区相对路径和实际大小 |

Use `upload_id`。只有元数据和实际临时文件都达到最初声明的总数时才发布。目标使用 UUID 与清理后的文件名，移动在同一工作文件系统内完成；已有目标不会被覆盖。客户端只有取得这个返回结果才显示“已上传”，否则任务不能引用一个尚未完整保存的附件。

The temporary metadata remains available to make a repeated finish observation safe. If the part has already moved and the exact generated destination exists with the expected size, return that same completed identity. Never append another copy or choose a new name during a retry. A partial file cannot pass the size and acknowledged-offset checks.

This function publishes ordinary user bytes. It does not evaluate a Marqdo program, install a plugin or interpret an image or PDF. The existing registered tools decide how the agent can read material later. The server's session owner and native filesystem root remain unchanged throughout begin, chunk and finish.

We **opened = state(upload_id=`upload_id`)**.
1. not access(`opened`,"ok")
  Return *opened*.
We **current = access(`opened`,"value")**.
1. access(`current`,"offset") != access(`current`,"total")
  Return *[文件还未收齐](result.error(code="qdagent.upload_incomplete", message="文件尚未完整上传", operation="finish"))*.
We **part = ".uploads/" + `upload_id` + ".part"**.
We **path = "uploads/" + `upload_id` + "-" + access(`current`,"name")**.
1. fs.exists(path=`part`)
  1. access(fs.stat(path=`part`),"size") != access(`current`,"total") or fs.exists(path=`path`)
    Return *[不覆盖或发布不完整文件](result.error(code="qdagent.upload_size", message="实际文件大小或目标不符合预期", operation="finish"))*.
  We **_ = fs.make_dirs(path="uploads")**.
  We **_ = fs.move(src=`part`, dest=`path`)**.
1. not fs.exists(path=`path`) or access(fs.stat(path=`path`),"size") != access(`current`,"total")
  Return *[没有真实完整文件](result.error(code="qdagent.upload_size", message="完整文件尚未保存", operation="finish"))*.
We **current = table.put(in=`current`, at="path", value=`path`)**.
Return *[完整文件才成为附件](result.ok(value=`current`))*.

## step

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| action | text | required | begin、chunk 或 finish |
| name | text | "" | 文件名 |
| total | any | 0 | 文件总数 |
| upload_id | text | "" | 上传身份 |
| offset | any | 0 | 分块偏移 |
| data_url | text | "" | 有界文件片段 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 固定上传操作的实际结果 |

Use `action`, `name`="", `total`=0, `upload_id`="", `offset`=0 and `data_url`=""。操作名只在这三个固定函数之间分派，不是任意函数调用或文件路径。此入口由可信 runner 在当前工作目录调用，HTTP 请求不能替换源文件或扩大文件效果。既有单次小文件兼容入口另行保留，浏览器的大文件一律走分块。

1. `action` == "begin"
  Return *[创建本任务上传](begin(name=`name`, total=`total`))*.
1. `action` == "chunk"
  Return *[追加确认顺序的字节](chunk(upload_id=`upload_id`, offset=`offset`, data_url=`data_url`))*.
1. `action` == "finish"
  Return *[收齐后发布](finish(upload_id=`upload_id`))*.
Return *[不存在任意上传操作](result.error(code="qdagent.upload_action", message="未知上传操作", operation="step"))*.
