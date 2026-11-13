---
markup: occlusion
title: Web 文件范围宿主 ABI 回归
import:
  fs: lib/fs.mq.md
  engineering: ext/engineering/index.mq.md
  result: lib/result.mq.md
---

外部代码仅在已登记 Web 宿主机制的测试中使用。Node 的 File/Blob 实现检查范围读取；产品上传业务仍是 Marqdo，不在测试中另写一套业务状态机。

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 实际宿主资产的范围读取与事件元数据断言 |

先用原生 fs 复制当前已经安装的桥接为 Node 模块，再运行宿主附带的测试。测试使用真实五十 MiB File，只读取最后三十二字节，核对 data_url、偏移、总数和实际片段长度；错误范围应返回失败，旧的不带范围文本读取保持可用。它不上传用户文件，也不访问网络。

The callback stub implements only the documented packed WASM call result, allowing the host's FileReader and Blob range mechanism to be observed independently of application behavior. Actual client state persistence is tested separately in Chromium with official WASM. The event test confirms that data_id and DOM id are different fields; the browser task fixture then exercises the real Marqdo handler with conflicting values. No test can pass by assigning a desired final application state.

We **_ = fs.copy_file(src="pages/public/generated/marqdo-bridge.js", dest=".marqdo/browser-abi.mjs")**.

`argv` =

| argument |
|---|
| "node" |
| "--test" |
| "ext/web/native/browser-files.test.mjs" |

Return *[只测试宿主缺口机制](engineering.checked(argv=`argv`, timeout_ms=30000, max_output=3000))*.
