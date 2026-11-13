---
markup: occlusion
title: 本机二进制响应测试宿主
import:
  fs: lib/fs.mq.md
  web: ext/web/web.mq.md
---
测试只挂一个固定的二进制样本，监听 127.0.0.1:17964，不配置登录、不读取用户数据，不在产品站点目录发现。它验证从 Marqdo 原生字节到实际 HTTP 下载的完整链路。

## serve

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 阻塞的本机隔离测试服务 |

准备固定测试根并复制唯一端点，然后使用现有 Web 插件监听。这个入口不选择系统命令，不添加公开文件服务器，也不挂载生产数据库。测试完成后停止这个专用 Marqdo 进程，正式 7964 服务继续运行。端点只返回已知 bytes，不接受任意服务器文件路径。

The host exercises real endpoint discovery, the Marqdo artifact subprocess and the generic bytes response writer. A client must receive the exact original binary sequence with attachment headers, not a JSON representation of base64. This complements the native writer tests and the owner-scoped application tests. It does not weaken authentication in the production application or create a default user.

We **_ = [隔离测试根](fs.make_dirs(path=".marqdo/bytes-http"))**.
We **_ = [只复制已知端点](fs.copy_file(src="tests/fixtures/artifact-bytes.mq.md",dest=".marqdo/bytes-http/sample.mq.md"))**.
We **app = [仅绑定回环端口](web.prepare(root=".marqdo/bytes-http",host="127.0.0.1",port=17964))**.
Return *[实际启动测试监听](web.listen(app=`app`))*.
