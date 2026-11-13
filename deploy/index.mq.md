---
markup: occlusion
title: Docker 中的求道运行入口
import:
  site: ../pages/index.mq.md
  store: ../ext/qdagent/store.mq.md
  auth: ext/security/auth.mq.md
  oidc: ext/security/oidc.mq.md
  db: ext/data/db.mq.md
  web: ext/web/web.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

镜像内置 Marqdo、Python 与 Node，应用仍通过 marqdo call 启动。只有 7964 对外监听，SQLite 与用户工作文件写入专用数据卷；源码和浏览器产物在镜像中只读。主机源码、Docker socket 与身份密钥不会暴露给智能体的工作目录。

回调使用 /oidc/callback 路径模式，从当次登录入口及反向代理转发的来源动态生成。QDAGENT_OIDC_REDIRECT_ORIGINS 明确列出允许来源：远程 https://agent.qdqc.com，以及本机 http://127.0.0.1:7964、http://localhost:7964。每个完整回调都须在身份站登记，未知来源拒绝。数据库存储认证会话、任务归属、插件偏好、对话与真实执行事件。

## config

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 只交给原生认证资源的运行配置，禁止打印 |

配置函数只在启动器内部使用，密钥从 Docker secret 挂载文件读取。它不能作为公开端点或模型工具，返回值不得打印进日志。固定 issuer 与已验证的身份端点，回调只使用允许列表内的当次来源；本机 HTTP 仅用于既定的 loopback 开发地址。

A missing credential fails startup instead of creating an unauthenticated fallback. The browser never receives this record. The image contains no credential literal and the versioned example contains public settings only. Each allowlisted origin has its own registered callback; the selected login URI is saved for the later code exchange.


The issuer and provider endpoints are pinned to the supplied identity service. The login origin is resolved from Host/TLS or forwarded host and protocol, then checked against the exact allowlist. The selected absolute callback is saved in the login session, so token exchange never switches to a newly supplied origin. Reverse proxies must overwrite forwarded origin headers rather than preserving client-supplied values. The credential is read only by the trusted startup process and is never copied into the generated page, model registry, database schema or image context.


We **origins = sys.env_get(name="QDAGENT_OIDC_REDIRECT_ORIGINS")**.
1. not `origins`
  We **origins = "https://agent.qdqc.com,http://127.0.0.1:7964,http://localhost:7964"**.
We **entries = text.str_split(s=`origins`, sep=",")**.
- [只接受明确的 HTTPS 或本机开发来源](for entries as entry)
  We **entry = text.str_trim(s=`entry`)**.
  1. not re.is_match(text=`entry`, pattern="^https://[A-Za-z0-9.-]+(:[0-9]+)?$|^http://(127[.]0[.]0[.]1|localhost):7964$")
    Return *[来源配置不可含通配符或任意路径](result.error(code="qdagent.redirect_origins", message="请配置明确 HTTPS 来源或本机开发来源", operation="config"))*.
We **issuer = "https://id.cflmy.cn"**.
We **client_id = sys.env_get(name="QDAGENT_OIDC_CLIENT_ID")**.
1. not `client_id`
  We **client_id = "app_e18ec1c40109417bb34b56c0c1749fe8"**.
We **secret_path = sys.env_get(name="QDAGENT_OIDC_SECRET_FILE")**.
1. not `secret_path`
  We **secret_path = ".secrets/oidc_client_secret"**.
We **secret = text.str_trim(s=fs.read_text(path=`secret_path`))**.
1. `secret` == ""
  Return *[没有密钥拒绝启动](result.error(code="qdagent.oidc_secret", message="OIDC secret 未配置", operation="config"))*.
We **callback = "/oidc/callback"**.
We **secure = False**.

`out` =

| issuer | client_id | client_secret | redirect_uri | redirect_origins | secure |
|---|---|---|---|---|---|
| `issuer` | `client_id` | `secret` | `callback` | `origins` | `secure` |

Return *out*.


## serve

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 阻塞监听唯一受保护的 7964 端口 |

先准备 SQLite，再读取镜像中预先装配的页面，绑定原生认证与 OIDC 资源之后才开始监听。无本地密码用户、无开放注册，也没有认证失败时自动退化为匿名的路径。API 与其他页面在服务端检查登录，静态资源同样位于保护范围。

The API gate denies anonymous calls; the page gate redirects anonymous browsers to login. The local Web ABI variant validates state, login age, PKCE, RS256 signature, issuer, audience, expiry, nonce and userinfo subject. It injects the verified principal into each endpoint and rejects cross-origin mutations. Application services use SQLite ownership before reading a task directory. Image creation and health checks never fabricate an authenticated user.

Only runtime data directories are writable. View export and client generation happen before the image is built, so startup does not modify source. The login session store shares the SQLite database but uses its own native table. OIDC session-cookie Secure follows the actual HTTPS login callback; HttpOnly and SameSite remain enforced by the existing session resource.


The listener is opened only after all resource bindings have completed. Authentication has an empty local credential list and registration is disabled, so there is no default password account. Protect the exact homepage, the API prefix and the static prefix explicitly; the general native authentication implementation is retained. The API gate fails without a signed-in session, while the native endpoint adapter replaces any request-supplied principal with the verified subject. SQLite ownership checks then apply independently to task selection and plugin preferences. A healthy process proves readiness of this host, not that a human has completed the provider login.

The three access gates are explicit application policy, not a replacement of the native authentication source. Public health contains no task or credential data. Startup must abort if page preparation fails rather than listening with a partially configured resource.

We **config = [只在内存中加载认证配置](config())**.
1. json.get(value=`config`, key="ok") == False
  Return *config*.
We **url = [初始化持久 SQLite](store.initialize())**.
We **database = [复用原生数据库资源](db.db(url=`url`))**.
We **app = [只读镜像使用已构建阅读面](site.prepare(root="pages", port=7964, host="0.0.0.0", build_page=False))**.
1. json.get(value=`app`, key="ok") == False
  Return *app*.
We **app = table.put(in=`app`, at="db", value=`database`)**.
We **app = [没有本地密码入口](auth.attach(app=`app`, users=table.empty_list(), session_ttl=28800, login_path="/login", login_redirect="/", logout_redirect="/login", register=False, default_role="user"))**.
We **app = table.put(in=`app`, at="cookie_secure", value=access(`config`,"secure"))**.
We **app = [接入唯一身份提供商](oidc.attach(app=`app`, issuer=access(`config`,"issuer"), client_id=access(`config`,"client_id"), client_secret=access(`config`,"client_secret"), redirect_uri=access(`config`,"redirect_uri"), redirect_origins=access(`config`,"redirect_origins"), authorize_url="https://id.cflmy.cn/oauth2/authorize", token_url="https://id.cflmy.cn/oauth2/token", userinfo_url="https://id.cflmy.cn/oauth2/userinfo", callback_path="/oidc/callback"))**.
We **app = [API 不返回匿名数据](auth.gate(app=`app`, path="/api", roles="user,admin,superadmin,member", on_deny="forbid"))**.
We **app = [整个用户站点需要登录](auth.gate(app=`app`, path="/", roles="user,admin,superadmin,member", match="exact", on_deny="redirect"))**.
We **app = [静态资源同样需要登录](auth.gate(app=`app`, path="/static", roles="user,admin,superadmin,member", on_deny="forbid"))**.
We **security = table.put(in=None, at="X-Content-Type-Options", value="nosniff")**.
We **security = table.put(in=`security`, at="X-Frame-Options", value="DENY")**.
We **security = table.put(in=`security`, at="Referrer-Policy", value="same-origin")**.
We **middleware = table.put(in=None, at="security", value=`security`)**.
We **middleware = table.put(in=`middleware`, at="body_limit", value=1048576)**.
We **middleware = table.put(in=`middleware`, at="cache_control", value="no-store")**.
We **app = table.put(in=`app`, at="middleware", value=`middleware`)**.
We **runtime = fs.read_json(path="pages/data/runtime.json")**.
We **runtime = table.put(in=`runtime`, at="authentication_required", value=True)**.
We **_ = fs.write_json(path="pages/data/runtime.json", value=`runtime`)**.
Return *[实际运行受保护站点](web.listen(app=`app`))*.

