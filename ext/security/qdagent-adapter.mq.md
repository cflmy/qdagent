---
markup: occlusion
title: qdagent 的 Web ABI 安全适配
import:
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
  sys: lib/sys.mq.md
  engineering: ext/engineering/index.mq.md
---

这是本工程的拓展升级，Marqdo 仓库保持只读。先把已安装 Web 插件源码复制到独立 .marqdo/web-native，再用完整补丁更新该副本并测试、构建。只补请求身份传递、同源变更和 OIDC 校验缺口；不覆盖原生 auth.go，不创建默认密码用户。

默认本地副本来自 ../marqdo/plugins/web。原生辅助文件在 ext/security/native，使用现有 ABI v2 注册与 libweb 动态库装载方式。上游补齐这些能力后可移除此适配，参数契约、SQLite、任务与 UI 仍留在 .mq.md。

## patch

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 完整安全补丁已应用于本工程副本 |

每个文件先在内存中组合完整补丁，再原子写入，不发布一半认证校验的中间版本。补丁锚点必须存在或已经应用；上游变化时明确失败，不能盲目覆盖认证实现。HTTP 请求字段由已认证 Cookie 得到的主体覆盖，模型与浏览器不能自行选择身份。

The verifier uses the provider's JWKS and checks the complete ID token boundary before accepting userinfo. No default credentials are introduced. The existing general authentication implementation stays untouched; the application uses explicit resource-owned gates for its declared page, API and static routes. Native tests exercise expiry, nonce, audience, signature, spoofed principal and mutation origin. Only after these pass should a rebuilt library be installed into the runtime roots.

There are seven authentication transformation points, an idempotent Cookie adapter and model-host capability registrations. The endpoint adapter runs after request parsing but before invoking an artifact, so a forged principal in either a query or body cannot reach a trusted control service. It also verifies the Origin of state-changing requests against the allowlisted origin of the current request. Read-only requests still need the native authenticated session; changing the HTTP method does not create authority.

The login start adds a fresh nonce alongside the existing PKCE verifier and random state. It stores a wall-clock issue time in the same private session and includes the nonce in the provider request. The nonce contains URL-safe random bytes, not an application identifier or user-supplied value. Login time is bounded independently of the longer signed-in session lifetime.

The callback first retains the existing state comparison. It then checks that nonce and login age exist before exchanging a code. Consuming the stored one-time values prevents a second callback from replaying the same login. An expired or missing value returns a clear failure; there is no fallback to accepting an access token as a logged-in user.

After token exchange, the dedicated verifier accepts only an identified RS256 key from the configured issuer's JWKS. It checks signature, issuer, subject, audience, authorized party, expiration, issued time and nonce. It does not follow a token-selected signing-key URL or accept an unsigned token. The provider's authenticated userinfo subject must match the verified ID token subject before the native code issues a new local session id.

The existing authentication, password, RBAC and session implementation is not replaced. The application provides no password users and binds its actual page, API and static routes through public resource functions. This avoids treating a blanket file rewrite as an authorization policy. A provider login failure cannot enable a local demo account.

Each copied source file is assembled completely in memory. The exact old anchor must be present, or the complete replacement must already be present for an idempotent repeat. A missing anchor indicates upstream drift and stops the operation before a partial write. Do not repair drift by dropping a nonce, issuer, signature or subject check merely to make compilation succeed.

The Go helpers are the narrow ABI exception for missing host request identity and ID token verification. Their tests use disposable in-memory sessions and a local signing-key fixture. They do not create an authenticated account in the deployed SQLite store. Business rules, task ownership, persistence and UI remain readable Marqdo source, and the compiler repository remains unchanged.

Dynamic callback mode uses the existing native path resolver and an explicit origin allowlist. A reverse proxy may provide forwarded host and protocol, but the result must still be an approved HTTPS domain or loopback development origin. The callback selected at login remains stored for code exchange. Cookies issued by the OIDC start and callback follow that saved URI: HTTPS receives Secure, while local HTTP remains usable. The general session and authentication implementation is unchanged. Normalizing the two Cookie call sites happens only in memory, allowing the same complete patch to be applied repeatedly without duplicating nonce parameters.

Uploads now use bounded 256 KiB chunks. The middleware keeps its original one MiB request limit and the endpoint parser keeps its original eight MiB ceiling. The two reverse transformations below remove an earlier local upload-only envelope override; fresh upstream copies already contain the desired original limits. No route receives a broad request-size exception.

The local ABI also fills two host gaps for user-configured models: AES-256-GCM credential storage with owner/profile authenticated data, and public HTTPS requests pinned to validated DNS addresses. The request adapter rejects private and reserved addresses, disables redirects and ambient proxies, retains normal TLS hostname checks, bounds request/response sizes and never returns credential-bearing error bodies. Built-in Ollama keeps its trusted environment-owned local endpoint. No general shell or arbitrary private-network capability is added to the agent tool registry.

`patches` =

| @ | file | old | replacement |
|---|---|---|---|
| 1 | "internal/httpx/routes_artifact.go" | "\tvalue, err := plugin.RunArtifactAtRoot(route.File, payload, st.entryDir)" | "\tif !st.qdagentSubject(w,r,payload){return}\n\tvalue, err := plugin.RunArtifactAtRoot(route.File, payload, st.entryDir)" |
| 10 | "plugin.go" | "extern int web_app_oidc(char *args_json, char **out_json, char **err_msg);" | "extern int qdagent_model_secret(char *args_json, char **out_json, char **err_msg);\nextern int qdagent_model_http(char *args_json, char **out_json, char **err_msg);\nextern int web_app_oidc(char *args_json, char **out_json, char **err_msg);" |
| 11 | "plugin.go" | "\tif (host_register((char *)\"web_app_oidc\"" | "\tif (host_register((char *)\"qdagent_model_secret\", (char *)\"operation,value,owner,id\", qdagent_model_secret) != 0) return 1;\n\tif (host_register((char *)\"qdagent_model_http\", (char *)\"url,body,api_key\", qdagent_model_http) != 0) return 1;\n\tif (host_register((char *)\"web_app_oidc\"" |
| 9 | "internal/httpx/listen.go" | "\t\t\teffectiveLimit := qdagentRequestBodyLimit(r.URL.Path, limit)\n\t\t\tif r.ContentLength > effectiveLimit {\n\t\t\t\thttp.Error(w, \"request body too large\", http.StatusRequestEntityTooLarge)\n\t\t\t\treturn\n\t\t\t}\n\t\t\tr.Body = http.MaxBytesReader(w, r.Body, effectiveLimit)" | "\t\t\tif r.ContentLength > limit {\n\t\t\t\thttp.Error(w, \"request body too large\", http.StatusRequestEntityTooLarge)\n\t\t\t\treturn\n\t\t\t}\n\t\t\tr.Body = http.MaxBytesReader(w, r.Body, limit)" |
| 8 | "internal/httpx/routes_artifact.go" | "http.MaxBytesReader(w, r.Body, qdagentArtifactBodyLimit(route.Path))" | "http.MaxBytesReader(w, r.Body, 8<<20)" |
| 2 | "internal/httpx/auth_oidc.go" | "\tsession.SetValue(sid, \"oidc_state\", state)" | "\tnonce, err := oidc.RandomURLString(32)\n\tif err != nil {http.Error(w,\"nonce unavailable\",http.StatusInternalServerError);return}\n\tsession.SetValue(sid,\"oidc_nonce\",nonce)\n\tsession.SetValue(sid,\"oidc_issued\",time.Now().Unix())\n\tsession.SetValue(sid, \"oidc_state\", state)" |
| 3 | "internal/httpx/auth_oidc.go" | "\tappendSetCookie(w, setCookie)\n\tw.Header().Add(\"Set-Cookie\", session.IssueCookie(sid))" | "\tloc += \"&nonce=\"+nonce\n\tappendSetCookie(w, setCookie)\n\tw.Header().Add(\"Set-Cookie\", session.IssueCookie(sid))" |
| 4 | "internal/httpx/auth_oidc.go" | "\tverifier, _ := session.GetValue(sid, \"oidc_verifier\")" | "\tnonceValue,_:=session.GetValue(sid,\"oidc_nonce\"); nonce,_:=nonceValue.(string)\n\tissued,_:=session.GetValue(sid,\"oidc_issued\")\n\tif nonce==\"\"\x7c\x7c!oidc.FreshLogin(issued){http.Error(w,\"oidc: expired login\",http.StatusBadRequest);return}\n\tverifier, _ := session.GetValue(sid, \"oidc_verifier\")" |
| 5 | "internal/httpx/auth_oidc.go" | "\tsession.DelKey(sid, \"oidc_state\")" | "\tsession.DelKey(sid,\"oidc_nonce\")\n\tsession.DelKey(sid,\"oidc_issued\")\n\tsession.DelKey(sid, \"oidc_state\")" |
| 6 | "internal/httpx/auth_oidc.go" | "\tinfo, err := st.oidc.FetchUserInfo(oidcClient(), tok.AccessToken)" | "\tverifiedSubject,verifyErr:=st.oidc.VerifyIDToken(oidcClient(),tok.IDToken,nonce)\n\tif verifyErr!=nil{http.Error(w,verifyErr.Error(),http.StatusBadGateway);return}\n\tinfo, err := st.oidc.FetchUserInfo(oidcClient(), tok.AccessToken)" |
| 7 | "internal/httpx/auth_oidc.go" | "\tusername := info.LocalUsername()" | "\tif info.Sub!=verifiedSubject{http.Error(w,\"oidc: userinfo subject mismatch\",http.StatusBadGateway);return}\n\tusername := info.LocalUsername()" |


`files` =

| file |
|---|
| "internal/httpx/routes_artifact.go" |
| "internal/httpx/auth_oidc.go" |
| "internal/httpx/listen.go" |
| "plugin.go" |

- [完整组合一个文件的所有变更](for files as file)
  We **path = ".marqdo/web-native/" + `file`**.
  We **source = fs.read_text(path=`path`)**.
  1. `file` == "internal/httpx/auth_oidc.go"
    We **source = [在内存中规范化已有 Cookie 适配](text.replace(text=`source`, old="st.qdagentCookie(sid, redirectURI)", new="session.IssueCookie(sid)"))**.
    We **source = text.replace(text=`source`, old="st.qdagentCookie(newID, redirectURI)", new="session.IssueCookie(newID)")**.
  - [先验证再替换精确锚点](for patches as patch)
    1. access(`patch`,"file") == `file` and not text.contains(text=`source`, sub=access(`patch`,"replacement"))
      1. not text.contains(text=`source`, sub=access(`patch`,"old"))
        Return *[上游变化停止构建](result.error(code="qdagent.web_patch", message=`file`, operation="patch"))*.
      We **source = text.replace(text=`source`, old=access(`patch`,"old"), new=access(`patch`,"replacement"))**.
  1. `file` == "internal/httpx/auth_oidc.go"
    We **source = [Cookie 安全属性跟随当次回调](text.replace(text=`source`, old="session.IssueCookie(sid)", new="st.qdagentCookie(sid, redirectURI)"))**.
    We **source = text.replace(text=`source`, old="session.IssueCookie(newID)", new="st.qdagentCookie(newID, redirectURI)")**.
  We **_ = [原子发布完整文件](fs.atomic_write(path=`path`, text=`source`))**.
The body-limit reverse patches retain upstream request boundaries now that uploads are chunked. The browser file-range host adapter is installed separately by the Web package; it does not change authentication or add a general HTTP exception.

We **_ = fs.copy_file(src="ext/security/native/qdagent_oidc.go", dest=".marqdo/web-native/internal/oidc/qdagent_oidc.go")**.
We **_ = fs.copy_file(src="ext/security/native/qdagent_oidc_test.go", dest=".marqdo/web-native/internal/oidc/qdagent_oidc_test.go")**.
We **_ = fs.copy_file(src="ext/security/native/qdagent_request.go", dest=".marqdo/web-native/internal/httpx/qdagent_request.go")**.
We **_ = fs.copy_file(src="ext/security/native/qdagent_request_test.go", dest=".marqdo/web-native/internal/httpx/qdagent_request_test.go")**.
We **_ = fs.copy_file(src="ext/security/native/qdagent_model.go", dest=".marqdo/web-native/qdagent_model.go")**.
We **_ = fs.copy_file(src="ext/security/native/qdagent_model_test.go", dest=".marqdo/web-native/qdagent_model_test.go")**.
Return *[只有完整变更可以构建](result.ok(value=True))*.


## install

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 安全回归与实际编译均通过后安装 ABI |

先 patch，再执行真正的原生测试；任何失败都不继续替换运行库。编译产物写入本工程缓存，只在成功后复制到明确的两个安装根。整个流程通过 marqdo call 和已注册工程拓展完成，不修改相邻 Marqdo 源码。The application image is rebuilt after installation; it never compiles or weakens authentication at startup. Keep the existing image running until the new artifact has passed its checks.


The source copy is local to this project. Install only an artifact built from the completed patch and passing tests. The source helpers and exact patch are versioned; the compiled cache can be recreated. Copying the successful binary is an explicit package update, not a reason to edit Marqdo's upstream source or weaken the currently running container. The next image build packages that exact installed artifact. If a test fails, retain its diagnostic and the previous runtime image.

We **patched = patch()**.
1. not access(`patched`,"ok")
  Return *patched*.

`tests` =

| argument |
|---|
| "go" |
| "test" |
| "." |
| "./internal/oidc" |
| "./internal/httpx" |
| "./internal/session" |

We **tested = engineering.checked(argv=`tests`, cwd=(sys.cwd() + "/.marqdo/web-native"), timeout_ms=120000, max_output=4000)**.
1. not access(`tested`,"ok")
  Return *tested*.

`build` =

| argument |
|---|
| "go" |
| "build" |
| "-buildmode=c-shared" |
| "-o" |
| "build/libweb.so" |
| "." |

We **built = engineering.checked(argv=`build`, cwd=(sys.cwd() + "/.marqdo/web-native"), timeout_ms=120000, max_output=4000)**.
1. not access(`built`,"ok")
  Return *built*.
We **_ = fs.copy_file(src=".marqdo/web-native/build/libweb.so", dest="ext/native/libweb.so")**.
We **_ = fs.copy_file(src=".marqdo/web-native/build/libweb.so", dest="pages/ext/native/libweb.so")**.
Return *[实际测试后的 ABI 已安装](result.ok(value=True))*.

