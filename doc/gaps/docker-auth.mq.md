---
markup: occlusion
title: Docker 运行边界与认证适配的真实缺口
---

现有 Web 拓展已经提供 OIDC、PKCE 和 SQLite 会话资源。它没有把已认证主体传给 Endpoint，
也未完整验证 ID Token。qdagent 的本地拓展版本在既有 ABI v2 上补齐主体、同源变更、nonce、
登录时效、RS256/JWKS、issuer、audience、过期时间和 userinfo 主体一致性。精确补丁与原生测试
在 ext/security/qdagent-adapter.mq.md 与 ext/security/native；不修改 Marqdo 仓库。

通用 auth.go 保持不变，通过公开资源接口逐一保护本应用的首页、API 和静态路由。
本地密码用户列表为空、注册关闭，登录走统一身份提供商。真实账号登录需要用户在浏览器完成，
自动测试不向生产认证会话表注入测试用户。边界参考
[OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html)。

sys.exec 尚无标准输入接口。原来的 JSON 参数临时文件无法写入只读程序根，因此已登记的
qdagent ABI 以固定 marqdo call 命令和字面 JSON 标准输入补齐此缺口，并继承任务进程组。
它不能执行 Shell、Python 或任意模型给出的可执行文件。标准库提供相同能力后可以移除此适配。

Docker 只发布 7964。程序与环境放在只读镜像，持久数据放在 qdagent-data 卷。
私有 secret 的主机父目录为 0700，文件以只读挂载提供给非 root 服务；构建上下文严格排除它。
参考 [Docker secrets](https://docs.docker.com/compose/how-tos/use-secrets/)。
开发模式用独立 qdagent-code 卷允许修改代码，不挂主机仓库或 Docker socket。

运行数据的规范如下：

| 数据 | 持久位置 |
|---|---|
| 登录、nonce、PKCE 与认证会话 | SQLite 原生 _marqdo_sessions 表 |
| 任务与主体归属 | SQLite qd_tasks 表 |
| 每个主体的插件偏好 | SQLite qd_plugins 表 |
| 对话消息与真实事件 | SQLite qd_messages、qd_events 表 |
| Markdown 档案、工作文件与取消日志 | 同一数据卷内的可阅读文件 |
| 运行定位与健康信息 | 容器临时数据目录；不含客户端秘密 |

容器使用现有宿主 Ollama 服务，通过 host.docker.internal 访问，不新增模型服务的公开端口。
旧宿主档案仍保留原位置，不会被自动分配给第一个 SSO 用户；需要迁移时必须明确已有任务的归属。

动态回调使用原有 OIDC 的路径模式，QDAGENT_OIDC_REDIRECT_ORIGINS 默认允许 https://agent.qdqc.com、http://127.0.0.1:7964、http://localhost:7964。登录时按 Host/TLS 或代理的 X-Forwarded-Proto、X-Forwarded-Host 生成绝对回调，并保存在认证会话；换取令牌时使用保存值，不能临时切换。代理应覆盖而非透传客户端伪造的转发头。

同源变更检查与当前入口匹配，不能仅因为另一个来源也在列表里就接受其请求。OIDC 新会话 Cookie 的 Secure 属性按当次登录的 HTTPS/HTTP 回调决定，HttpOnly 与 SameSite=Lax 保持不变。未知来源及远程明文 HTTP 来源拒绝，只有列出的 loopback HTTP 入口用于本机开发。
