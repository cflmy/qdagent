---
markup: occlusion
type: endpoint
path: /sample
method: GET
request: query
response: bytes
title: 二进制响应的固定验收样本
import:
  bytes: lib/bytes.mq.md
  table: lib/table.mq.md
---
此文件仅用于绑定本机回环的隔离测试服务，不读取任何用户文件或配置。已知样本包含非 UTF-8 字节，因此文本响应无法伪装通过完整字节校验。

# main

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| principal | text | "local" | 测试宿主注入的本机身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 固定七字节原生响应记录 |

Use `principal`="local"。测试返回固定原生 bytes，不提供文件路径、身份选择或业务动作参数。只有本机隔离测试可使用这个无认证样本，正式产物下载仍由认证服务与会话所有权控制。这里不读取开发密钥，不模拟登录，也不访问真实用户工作区。

This fixture tests the actual endpoint process and HTTP response adapter together. The known payload contains zero and non-UTF-8 bytes; preserving it detects an accidental JSON wrapper or text conversion. Application ownership is tested independently against the real service. This test fixture is never discovered under the production pages directory.

We **data = [固定已知的二进制样本](bytes.from_base64(text="AAH/UEsKCg=="))**.
We **out = table.put(in=None,at="ok",value=(`principal` == "local"))**.
We **out = table.put(in=`out`,at="filename",value="fixture.bin")**.
We **out = table.put(in=`out`,at="content_type",value="application/octet-stream")**.
Return *[实际 bytes 记录进入响应边界](table.put(in=`out`,at="data",value=`data`))*.
