---
markup: occlusion
title: 50 MiB 上传的真实字节边界
import:
  service: ../pages/control/service.mq.md
  sessions: ../pages/control/sessions.mq.md
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  bytes: lib/bytes.mq.md
  hash: lib/hash.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

只在专用验收身份下写入真实文件，内容由 Marqdo 原生文本和字节库生成。不会预先建立成功标记，也不使用 Python 或 Shell 构造文件。

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 精确 50 MiB 的实际文件长度和摘要通过 |

创建独立会话，通过与浏览器相同的服务上传 Base64 表示，实际经过 marqdo call JSON 标准输入和工作目录 fs.write_bytes。最终读取真实文件元数据与 SHA-256；返回零退出或一个路径不足以证明字节保存正确。

The test intentionally uses the exact upper boundary rather than a tiny file with a changed constant. The web plugin separately tests that its middleware and parser allow the small upload envelopes while all normal API limits stay unchanged. This test proves the actual bounded Marqdo calls, ordered control lock and filesystem path, without issuing a fake authenticated public HTTP request.

After checking the file size and digest, remove only this test's known workspace artifact. The session registry remains a legitimate internal acceptance record and cannot authenticate as an OIDC user. No user file, production account or existing upload is removed. A server failure remains a failure rather than being retried with a smaller file and reported as fifty MiB support.

The loop sends two hundred independent 256 KiB chunks, and every acknowledgement comes from the normal service and native session lock. The test uses a single repeated chunk to keep request sizes bounded while still writing fifty MiB of real data. Its final digest is computed from the expected complete byte sequence, independently of the returned upload cursor. A wrong order or duplicated chunk therefore cannot pass by merely reporting the desired length.

We **created = sessions.create(title="50 MiB 边界验收", principal="upload-size-acceptance")**.
1. not access(`created`,"ok")
  Return *created*.
We **ctx = access(`created`,"value")**.
We **chunk = text.repeat(text=text.repeat(text="a", n=1024), n=256)**.
We **expected = hash.sha256(text=text.repeat(text=`chunk`, n=200))**.
We **encoded = bytes.to_base64(data=bytes.from_text(text=`chunk`))**.
We **begun = service.upload(action="begin", name="50-MiB.bin", data_url="", total=52428800, session=access(`ctx`,"id"), principal="upload-size-acceptance")**.
1. not access(`begun`,"ok")
  Return *begun*.
We **id = access(access(`begun`,"value"),"upload_id")**.
We **steps = table.range(start=0, end=200)**.
- [每块都走真实服务和控制锁](for steps as step)
  We **uploaded = service.upload(action="chunk", name="", data_url=("data:application/octet-stream;base64," + `encoded`), upload_id=`id`, offset=(`step` * 262144), session=access(`ctx`,"id"), principal="upload-size-acceptance")**.
  1. not access(`uploaded`,"ok")
    Return *uploaded*.
We **uploaded = service.upload(action="finish", name="", data_url="", upload_id=`id`, session=access(`ctx`,"id"), principal="upload-size-acceptance")**.
1. not access(`uploaded`,"ok")
  Return *uploaded*.
We **path = access(`ctx`,"workspace") + "/" + access(access(`uploaded`,"value"),"path")**.
We **stat = fs.stat(path=`path`)**.
We **actual = fs.file_hash(path=`path`)**.
1. access(`stat`,"size") != 52428800 or `actual` != `expected`
  Return *[真实文件不符合边界](result.error(code="test.upload_size", message="size or SHA-256 mismatch", operation="run"))*.
We **_ = fs.remove_file(path=`path`)**.
Return *[实际 50 MiB 字节和摘要一致](result.ok(value="52428800 bytes / SHA-256 / Marqdo stdin / workspace write"))*.
