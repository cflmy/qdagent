---
markup: occlusion
title: 模型决策、配置与大文件输入
import:
  models: ../../tests/model-settings.mq.md
  browser: ../../tests/input-ui.mq.md
  upload: ../../tests/upload-size.mq.md
---

本轮仍遵守 Marqdo 源码只读、业务通过 marqdo call、文件通过 fs/bytes 的边界。仅有两个真实宿主缺口由本地插件补齐：Web read_file 的字节范围，以及模型凭据加密和受保护的公网 HTTPS 请求。

## verify_models

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实配置和投影边界检查 |

标准模型按钮使用管理员配置的 Ollama 服务。用户可新增本机模型名、公开 HTTPS 的 Ollama 或 OpenAI 兼容服务；本机选项不允许覆盖服务地址。远程凭据使用独立 Docker secret 主密钥做 AES-256-GCM 加密，SQL 只存密文，公开列表只返回是否配置。删除和调用始终按认证身份核验。

模型请求通过可信工程中的 models.decide，再返回真实 decision 和接口提供的 thinking、reasoning_content 或 reasoning。执行记录不再只保存 final 这个词。思考按安全 Markdown 渲染，没有字段就不显示空区域，结果展示不能替代工具调用证据。决策和工具详情均使用 data-id；DOM id 不再误当业务身份。

自定义公网请求由 ABI 校验 DNS 并连接已验证地址，拒绝私网、保留地址、代理和重定向。模型配置不作为智能体工具暴露，密钥不进入提示词、作业或日志。原始模型是否支持思考或 JSON 动作协议，以真实服务响应为准，保存配置不代表已经推理成功。

Return *[配置和实际接口字段投影](models.run())*.

## verify_browser

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| chrome | text | required | 已有 Chromium 绝对路径 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 官方 WASM 中的输入和模型选择状态 |

Use `chrome`。隔离浏览器回归使用正式组件和客户端，只替换网络与文件选择边界。先验证两会话和步骤展开，再验证多块确认、完整发布和保存自定义模型。新按钮需要在 set_html 完成后的独立回调中高亮；一次性 interval 与任务轮询的 after 分开，避免一个效果覆盖另一个。

阅读器原导出页中的可执行知识、未运行提示和完整源码属于静态模块，而对话的实际执行记录已经来自任务事件，因此装配时移除这些无关区块。正常回复更新只替换历史和当前答文，不重建步骤父节点。没有思考内容也不添加占位卡片。

Return *[真实回调状态验证](browser.run(chrome=`chrome`))*.

## verify_large_file

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实五十 MiB 文件的长度与 SHA-256 验收 |

单文件上限为 50 MiB，每块 256 KiB。浏览器宿主 Blob.slice 只读取下一片，客户端等待真实确认后推进游标；服务端会话控制锁串行验证偏移、总数与实际文件长度，收齐后才移动到 uploads。空文件走开始和完成，乱序、重复及不完整文件不能发布。

原来的整包调用链无法可靠传递五十 MiB Base64，不能只修改显示常量。分块后继续使用原有一 MiB middleware 和八 MiB JSON parser 上限，没有全局或上传路由的大请求例外。所有写入仍由 Marqdo fs/bytes 完成。私有临时分块不被加入模型参考，完整文件才成为附件。

五十 MiB 回归创建专用内部任务，真实发送两百片并检查最终文件摘要，不伪造 OIDC 登录。浏览器宿主自己的 Node/Blob ABI 测试位于 ext/web/native，只检查宿主机制；应用业务状态仍由官方 WASM 回归验证。

Return *[真实文件边界](upload.run())*.
