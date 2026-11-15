---
markup: occlusion
title: OCR 提交、恢复与识别材料保存
import:
  io: ext/root-skill/runtime/io.mq.md
  observations: ext/root-skill/runtime/observations.mq.md
  fs: lib/fs.mq.md
  hash: lib/hash.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  re: lib/re.mq.md
  result: lib/result.mq.md
---

云端任务的生命周期由本文稿控制，令牌与 HTTPS 由固定传输边界承担。

## recognize

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信角色与当前工作区 |
| path | text | required | 当前上传目录中的图片或 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 任务状态，完成时包含识别文字路径 |

Use `context`, `path`。

The supplied file is the only material sent to the configured PaddleOCR endpoint. The model does not choose a remote URL, a token or another task's workspace. Native path checks confine the read to the current uploads directory, reject symlink escapes and enforce the fifty MiB bound. The transport uses multipart upload as described by the official asynchronous API. The API credential is read from a private Docker secret and is never returned in a result or event. Downloading a completed result uses no credential, accepts only public Baidu BOS destinations, pins the checked network address and does not follow redirects. This prevents a result link from redirecting the service credential or reading an internal resource. Unsupported result shapes fail explicitly; they are not silently converted into an empty successful document.

The content digest and current role identify a saved job. Calling this function again for the same unchanged material resumes the existing job instead of submitting another chargeable request. Each invocation performs at most one submission or status query and remains inside the root workflow's bounded call loop. A large job can outlast that loop; its pending observation is preserved for a later continuation. A failed job remains failed, with the original material available for inspection. Replacing the material creates a new content identity, so old recognition cannot be presented as a fresh reading. Successful text is saved as inert Markdown along with the raw JSONL result. Neither the recognized document nor its links can define system instructions, advance a human gate or edit an independent test. The complete output stays in the task workspace while the next model request receives only a bounded excerpt and provenance.

识别是外部服务的观察，不是对文字真实性的保证。调用前应确认这是用户授权的材料；不扫描目录，不自动把其他文件上传。排队和执行中的记录不会写成识别完成，失败也不会自动生成替代文字。原文件、内容摘要与实际任务身份一起保留，便于用户核对识别偏差。测试角色既没有本函数，也不能从原生边界取得这个能力。插件开关在公开入口检查，关闭后不能恢复轮询。完成时正文和原始结果都先保存，之后才写成功事件，因此文件写入失败不会制造完整成功。

1. not re.find(text=`path`,pattern="^uploads/[^\\r\\n]+$")
  Return *result.error(code="ocr.path",message="只能识别当前上传目录中的材料",operation="recognize")*.
任务结果的保存不等于业务已经完成。识别只提供接下来编写文稿所需的材料，仍然需要经过独立契约验证和最终人工审阅。若远端一直排队，根流程会保存未完成状态，恢复时可以继续同一任务。调用次数、云服务配额与实际识别质量都不是模型可以自行声明通过的检查。原始结果只供调试与核对，不能以一段成功 HTTP 响应替代真正可读文字。

We **sha256 = fs.file_hash(path=`path`)**.
We **scope = observations.location(context=`context`)**.
We **identity = hash.sha256(text=(`path` + `sha256` + `scope`))**.
We **directory = "evidence/ocr/" + `identity`**.
We **job_path = `directory` + "/job.json"**.
We **_ = fs.make_dirs(path=`directory`)**.
An OCR job is resumed through its saved identity, never through a result address supplied by a model. A later retry can recover its actual state without changing the original evidence. Pending work is preserved when the role reaches its model budget, so continuation does not create a new upload merely because generation stopped.

We **response = None**.
We **event = table.put(in=table.put(in=None,at="id",value=access(`context`,"unit_id")),at="file",value=`path`)**.
We **_ = io.event(context=`context`,kind="ocr_start",data=`event`)**.
1. fs.exists(path=`job_path`)
  We **job = fs.read_json(path=`job_path`)**.
  1. access(`job`,"state") == "done" or access(`job`,"state") == "failed"
    We **_ = observations.save(context=`context`,record=`job`)**.
    We **_ = io.event(context=`context`,kind="ocr_end",data=table.put(in=table.put(in=`job`,at="id",value=access(`context`,"unit_id")),at="status",value=access(`job`,"state")))**.
    1. access(`job`,"state") == "failed"
      Return *result.error(code="ocr.failed",message=access(`job`,"message"),operation="recognize")*.
    Return *result.ok(value=`job`)*.
  We **response = io.native(context=`context`,operation="runtime_ocr_poll",payload=table.put(in=None,at="job_id",value=access(`job`,"job_id")))**.
2. else
  We **response = io.native(context=`context`,operation="runtime_ocr_submit",payload=table.put(in=None,at="path",value=`path`))**.
1. not access(`response`,"ok")
  We **_ = io.event(context=`context`,kind="ocr_end",data=table.put(in=table.put(in=`event`,at="status",value="failed"),at="result",value=`response`))**.
  Return *response*.
We **job = access(`response`,"value")**.
We **job = table.put(in=table.put(in=table.put(in=`job`,at="identity",value=`identity`),at="file",value=`path`),at="sha256",value=`sha256`)**.
1. access(`job`,"state") == "done"
  We **text = access(`job`,"text")**.
  We **_ = fs.atomic_write(path=(`directory` + "/text.md"),text=`text`)**.
  We **_ = fs.atomic_write(path=(`directory` + "/result.jsonl"),text=access(`job`,"raw"))**.
  We **job = table.delete(map=table.delete(map=`job`,key="raw"),key="text")**.
  We **job = table.put(in=table.put(in=`job`,at="path",value=(`directory` + "/text.md")),at="excerpt",value=re.find(text=`text`,pattern="(?s)^.{0,3000}"))**.
We **_ = fs.atomic_write(path=`job_path`,text=json.stringify(value=`job`))**.
We **_ = observations.save(context=`context`,record=`job`)**.
We **_ = io.event(context=`context`,kind="ocr_end",data=table.put(in=table.put(in=`job`,at="id",value=access(`context`,"unit_id")),at="status",value=access(`job`,"state")))**.
1. access(`job`,"state") == "failed"
  Return *result.error(code="ocr.failed",message=access(`job`,"message"),operation="recognize")*.
Return *result.ok(value=`job`)*.
