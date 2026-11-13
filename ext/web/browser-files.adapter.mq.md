---
markup: occlusion
title: Web 插件的有界文件读取 ABI
import:
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
---

实际缺口：原有浏览器宿主的 read_file 只能整包读取，50 MiB 的 Base64 无法可靠进入 Marqdo 调用链。本地 Web 插件升级同一 read_file 效果 ABI，增加 offset 与 length；只补 Blob.slice 和读取元数据，不把上传业务放进 JavaScript。

## install

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 本工程浏览器宿主已安装有界读取适配 |

这是已有 Web 插件浏览器宿主的兼容升级，不修改 Marqdo 源码。省略 length 的旧效果保持原义，显式范围单次最多一 MiB；qdagent 客户端固定使用 256 KiB。返回 offset、read_size 与 total 供 Marqdo 回调核对，实际上传、归属、顺序、完成和界面状态都继续由 .mq.md 函数负责。

The adapter uses the existing host effect ABI and official callback lifecycle. It reads only the file explicitly chosen in the native input, never a filesystem path supplied by a model. A range must be an integer inside that file; no shell, network request or business retry is added to the host. The registered Web package owns this local runtime asset and its version documents the extra fields. Existing bridge functionality is retained.

Patching is reproducible and checks the original anchor or the complete installed replacement. A missing anchor stops installation instead of guessing which script to modify. The generated site uses a content hash for the bridge URL so browsers receive the updated host mechanism with the matching Marqdo client.

The browser callback reports the original total size separately from the selected range length. That distinction matters for the last short chunk and for fifty MiB files: the WASM receives only a small Base64 range while still verifying the total and offset. Default whole-file behavior remains available to existing callers that omit range fields, but qdagent's upload flow never uses it for large files. The adapter is confined to this project's packaged bridge and is installed before the image context is prepared.

We **path = "pages/public/generated/marqdo-bridge.js"**.
We **source = fs.read_text(path=`path`)**.
We **old = "  const file = input.files[Number(spec.index) || 0];\n  try {"**.
We **replacement = "  const file = input.files[Number(spec.index) || 0];\n  try {\n    const offset = Number(spec.offset || 0);\n    const length = spec.length == null ? file.size - offset : Number(spec.length);\n    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || offset > file.size || length < 0 || (spec.length != null && length > 1048576)) throw new Error(\"invalid bounded file range\");\n    const part = file.slice(offset, Math.min(offset + length, file.size));"**.
1. not text.contains(text=`source`, sub=`replacement`)
  1. not text.contains(text=`source`, sub=`old`)
    Return *[宿主漂移时停止](result.error(code="qdagent.browser_abi", message="read_file anchor missing", operation="install"))*.
  We **source = text.replace(text=`source`, old=`old`, new=`replacement`)**.
  We **source = text.replace(text=`source`, old="r.readAsDataURL(file);", new="r.readAsDataURL(part);")**.
  We **source = text.replace(text=`source`, old="body = await file.text();", new="body = await part.text();")**.
  We **source = text.replace(text=`source`, old="size: file.size,\n      type:", new="size: file.size,\n      offset,\n      read_size: part.size,\n      total: file.size,\n      type:")**.
  We **_ = [只安装本地宿主机制](fs.atomic_write(path=`path`, text=`source`))**.
Return *[兼容效果 ABI 已安装](result.ok(value=True))*.
