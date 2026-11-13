---
markup: occlusion
title: 浏览器文件分块读取
import:
  table: lib/table.mq.md
---

本地 Web 插件为 read_file 宿主效果增加有界字节范围。浏览器只能读取用户在原生 file input 中选择的文件；实际文件保存和任务授权仍由服务端 Marqdo 控制。

## read_chunk

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| sel | text | required | file input 选择器 |
| then | text | required | 直接回调 |
| offset | number | 0 | 从零开始的字节偏移 |
| length | number | 262144 | 最多一 MiB，产品固定 256 KiB |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | read_file 效果，回调含 data_url、offset、read_size、total |

Use `sel`, `then`, `offset`=0 and `length`=262144。调用只构造现有效果 ABI 的数据；宿主使用 Blob.slice，不把整个文件复制到 WASM。回调必须核对偏移和实际字节数，等待服务端确认之后再读取下一块。没有确认不能把本地读取进度当作已上传进度。

A registered native input grants access to the selected file, not to arbitrary local paths. Missing files and invalid ranges become explicit callback errors. This function does not save data, assemble an upload, retry a request or execute file content. The qdagent client keeps its upload identity and workspace epoch separately so a late callback cannot publish into a newly selected session.

`spec` =

| sel | then | offset | length | as |
|---|---|---|---|---|
| `sel` | `then` | `offset` | `length` | "data_url" |

Return *[扩展同一 read_file 效果 ABI](table.put(in=None, at="read_file", value=`spec`))*.
