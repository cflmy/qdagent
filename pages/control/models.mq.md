---
markup: occlusion
title: 用户自定义模型设置
import:
  store: ../../ext/qdagent/store.mq.md
  provider: ../../ext/qdagent/model-client.mq.md
  table: lib/table.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  uuid: lib/uuid.mq.md
  result: lib/result.mq.md
  sys: lib/sys.mq.md
---

设置按认证用户隔离。SQLite 只保存 AES-256-GCM 密文，独立主密钥通过 Docker secret 提供。公开清单不读取凭据正文，模型调用使用本地 ABI 保护公开 HTTPS 边界，禁止私网目标、代理绕行和重定向携带密钥。

## list

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| principal | text | "local" | 认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 无密钥的当前用户清单 |

Use `principal`="local"。SQL 只投影公开字段和是否配置密钥，不读取密文正文。固定的本机模型保留，用户自己的选项放在独立列表中。列表刷新不重建正在填写的配置表单。列出模型并不保证供应商当前可用，实际请求仍可能返回配额、模型或网络错误。

The owner is independently bound in every query. An opaque profile id cannot grant another user access, and the browser never receives a decryptable credential. Listing is a local read, not a provider discovery request.

每个已登录用户都可以选择管理员明确开放的共享智能模型和本机 Qwen。共享清单只判断固定账户是否存在 smart/default 配置，不返回那个账户的配置身份、端点或凭据。共享项采用固定的 builtin 身份，用户不能删除；个人配置仍只由自己的主体查询。没有共享配置时只列出本机与个人选项，本机服务是否在线由实际请求结果说明。

The administrator may also open further models from the dedicated shared catalog account, and the models already configured under the development account next to smart/default belong to the same shared surface. Each of them keeps its own opaque profile identity behind the shared- prefix, so the public label and provider model name still come from that one administrator-owned row. They are listed as built-in entries and share the single daily quota; the browser never receives the account, endpoint or credential, and no user can delete them through the personal delete path.

A shared entry also carries a presentation group so the picker can show one entry per provider instead of one long list. The group is derived from the public label or from the trusted account, never from client input, and it grants nothing: resolution still re-reads the account that owns the profile.

The administrator's shared model is an intentional service capability available to authenticated users. Listing it performs no provider request and does not copy or expose a credential. The server resolves a fixed model name against a fixed administrative owner, independently of any client-supplied id. Personal profiles retain their existing owner checks and deletion rules. A shared identity remains stable even when an administrator rotates its underlying credential or replaces the profile.

The local entry identifies the configured Ollama model rather than promising that Ollama is currently running. Its network address comes only from the administrator environment and cannot be changed through this shared option. Inference remains subject to the user's task and plugin authorization. Public labels are presentation data and never grant access to arbitrary model profiles.

We **args = table.append(list=table.empty_list(), item=`principal`)**.
We **entries = store.query(sql="SELECT id,label,protocol,model,endpoint,thinking,CASE WHEN credential='' THEN 0 ELSE 1 END AS has_key FROM qd_model_profiles WHERE owner=? ORDER BY label,id",args=`args`)**.
We **local = table.put(in=None,at="id",value="builtin-local")**.
We **local = table.put(in=`local`,at="label",value="本机 Qwen")**.
We **local = table.put(in=`local`,at="model",value="qwen3.5:4b-q4_K_M")**.
We **entries = table.append(list=`entries`,item=`local`)**.
We **shared_args = table.append(list=table.empty_list(),item="agent-development")**.
We **shared = store.query(sql="SELECT id FROM qd_model_profiles WHERE owner=? AND model='smart/default' ORDER BY id LIMIT 1",args=`shared_args`)**.
1. table.len(xs=`shared`) > 0
  We **item = table.put(in=None,at="id",value="builtin-smart")**.
  We **item = table.put(in=`item`,at="label",value="共享智能模型")**.
  We **item = table.put(in=`item`,at="model",value="smart/default")**.
  We **item = table.put(in=`item`,at="group",value="智能模型")**.
  We **entries = table.append(list=`entries`,item=`item`)**.
We **catalog_args = table.append(list=table.empty_list(),item="agent-development")**.
We **catalog_args = table.append(list=`catalog_args`,item="shared-catalog")**.
We **more = store.query(sql="SELECT id,owner,label,protocol,model,endpoint,thinking,CASE WHEN credential='' THEN 0 ELSE 1 END AS has_key FROM qd_model_profiles WHERE owner IN (?,?) ORDER BY label,id",args=`catalog_args`)**.
- [其它共享模型只投影公开字段](for more as row)
  1. not (access(`row`,"owner") == "agent-development" and access(`row`,"model") == "smart/default")
    We **group = "智能模型"**.
    1. access(`row`,"owner") == "shared-catalog"
      We **parts = text.str_split(s=access(`row`,"label"), sep=" · ")**.
      We **group = "共享模型"**.
      1. table.len(xs=`parts`) > 1
        We **group = access(`parts`,1)**.
    We **item = table.put(in=`row`,at="id",value=("shared-" + access(`row`,"id")))**.
    We **item = table.put(in=`item`,at="group",value=`group`)**.
    We **item = table.delete(map=`item`,key="owner")** and **item = table.delete(map=`item`,key="endpoint")**.
    We **entries = table.append(list=`entries`,item=`item`)**.
Return *[公开清单不包含凭据](`entries`)*.

## save

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| label | text | required | 名称 |
| model | text | required | 供应商模型名 |
| endpoint | text | required | 公开 HTTPS API 根 |
| protocol | text | "openai" | openai 或 ollama |
| api_key | text | "" | 仅在保存请求内传递的密钥 |
| thinking | any | False | 请求接口返回思考文本 |
| principal | text | "local" | 认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | Result，只返回新配置身份 |

Use `label`, `model`, `endpoint`, `protocol`="openai", `api_key`="", `thinking`=False and `principal`="local"。自定义端点使用公开 HTTPS，标准 443 端口，不能含用户名、密码、查询或片段。网络 ABI 在实际连接时重新检查 DNS 的所有结果并连接已验证地址，拒绝私网和保留地址；关闭环境代理及自动重定向。内置 Ollama 仍使用管理员环境配置的本机地址。

The credential is encrypted before the bound SQLite insert. A random nonce and owner/profile authenticated data protect its integrity. Neither plaintext nor master key is stored in the model row, job record, prompt or trace. Each save creates an immutable profile id so adding another model cannot switch a running job to another endpoint. Form responses never echo the secret.

The thinking switch requests provider support, not an invented transcript. Some models ignore it or return no thinking field. Their actual final message and tool calls remain separately visible and validated. A custom model cannot grant itself tools or bypass current AI plugin authorization.

The local protocol only stores a model name and the thinking preference. Its endpoint and key must be empty, so selecting another installed local model cannot redefine the administrator's network target. Remote profiles continue to require a public HTTPS URL and the native DNS guard at request time. A readable protocol label from the form is normalized before these checks.

1. `protocol` == "OpenAI 兼容"
  We **protocol = "openai"**.
1. `protocol` == "Ollama"
  We **protocol = "ollama"**.
1. `protocol` == "本机 Ollama"
  We **protocol = "local"**.
We **label = text.str_trim(s=`label`)** and **model = text.str_trim(s=`model`)**.
We **endpoint = re.replace(text=text.str_trim(s=`endpoint`), pattern="/+$", with="")**.
1. `label` == "" or `model` == "" or table.len(xs=`label`) > 80 or table.len(xs=`model`) > 200
  Return *[需要名称和模型](result.error(code="qdagent.model_fields", message="请填写名称和模型标识", operation="save"))*.
1. (`protocol` != "openai" and `protocol` != "ollama" and `protocol` != "local") or table.len(xs=`api_key`) > 8192 or re.is_match(text=`api_key`, pattern="[\\r\\n]")
  Return *[要求明确的 HTTPS 地址](result.error(code="qdagent.model_config", message="请选择协议和公开 HTTPS API 地址，密钥须为单行", operation="save"))*.
1. `protocol` == "local"
  1. `endpoint` != "" or `api_key` != ""
    Return *[本机只复用管理员配置](result.error(code="qdagent.model_config", message="本机 Ollama 的地址和 API Key 请留空", operation="save"))*.
2. not re.is_match(text=`endpoint`, pattern="^https://[^\\s/?#@:]+(:443)?(/[^\\s?#]*)?$")
  Return *[远程必须为公开 HTTPS](result.error(code="qdagent.model_config", message="远程模型需要公开 HTTPS API 根地址", operation="save"))*.
We **id = "custom-" + uuid.v4()**.
We **credential = ""**.
We **_ = [加载已有加密 ABI](store.initialize())**.
1. `api_key` != ""
  We **credential = [原生 AES-GCM 仅保存密文](qdagent_model_secret(operation="seal", value=`api_key`, owner=`principal`, id=`id`))**.
We **enabled = 0**.
1. `thinking` == True or `thinking` == "on" or `thinking` == "true"
  We **enabled = 1**.

`args` =

| value |
|---|
| `id` |
| `principal` |
| `label` |
| `protocol` |
| `model` |
| `endpoint` |
| `credential` |
| `enabled` |

We **_ = [绑定保存加密配置](store.execute(sql="INSERT INTO qd_model_profiles(id,owner,label,protocol,model,endpoint,credential,thinking) VALUES(?,?,?,?,?,?,?,?)", args=`args`))**.
Return *[只公开选择身份](result.ok(value=`id`))*.

## remove

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 自定义模型身份 |
| principal | text | "local" | 认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 自己的配置删除结果 |

Use `id` and `principal`="local"。删除同时绑定拥有者，不会删除固有模型或其他人的记录。旧的对话和执行证据保留，正在运行的任务也不会自动切换到另一个模型。后续请求遇到已删除配置会报告不存在，不能默默回退到本机或另一个供应商。

We **args = table.append(list=table.empty_list(), item=`id`)**.
We **args = table.append(list=`args`, item=`principal`)**.
We **_ = store.execute(sql="DELETE FROM qd_model_profiles WHERE id=? AND owner=?", args=`args`)**.
Return *[删除只影响自己的配置](result.ok(value=`id`))*.

## resolve

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| selection | text | required | 模型身份 |
| principal | text | "local" | 认证身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 私有配置，只交给可信服务，禁止公开输出 |

Use `selection` and `principal`="local"。配置身份和认证拥有者必须同时匹配。密文由原生 ABI 使用同样的拥有者和配置身份解密；改动密文或复制到别人名下都会失败。这个返回值只在请求适配器内存中使用，不能交给 HTTP 页面、模型工具或执行记录。

Built-in Ollama uses the trusted environment endpoint and an empty key. This is a separate existing host configuration, not permission for a custom profile to probe private network addresses. The native public HTTPS guard remains mandatory for every custom provider, including an Ollama server exposed over public TLS.

The resolver must run in the trusted engineering root because SQLite and the native plugin are server resources, not files granted to the agent. The task worker enters it through an explicit marqdo call using its session owner. Only the returned action and optional provider thinking are sent back to the runner; this private configuration record itself is not an execution event.

For a local profile, resolve the administrator's current Ollama environment address after checking profile ownership, set the protocol to Ollama and mark the record as built-in for transport policy. This does not accept a user-supplied private URL. The selected model name and thought preference still come from the immutable profile, allowing several local models to be configured without adding network destinations.

用户自己的模型仍使用本人身份和配置身份解密，固定共享入口不改变这条规则。共享入口只接受两个事先声明的名称，不能选择另一个账户或供应商配置。模型服务出现错误时沿用实际失败，不转换成虚假回答。这个共享入口只选择模型，不会授权文件访问、启用插件或改变当前任务的拥有者。

The shared identifier is a narrow server-side alias. The public list and actual resolver independently check whether its administrator-owned profile exists. If the provider configuration is removed or its credential cannot be decrypted, the request fails explicitly; it cannot fall through to an unrelated local model. Credentials never enter the browser, task history or tool output.

共享选项是管理员明确授权的固定模型身份，不允许浏览器传入共享账户或任意配置 ID。服务仅在实际调用时解析受信任配置，凭据仍只在服务端内存使用。未配置共享模型时返回明确错误。本机选项使用管理员指定的 Ollama 地址，是否已安装由实际运行结果决定。除固定智能模型外，开发账户下同批配置与独立共享目录账户的 shared- 条目都会被解析成各自的管理员配置；解析时从受信账户重新读取配置身份，因此传入别人的配置身份也只会得到“配置不可用”。

1. `selection` == "builtin-local"
  We **selection = "qwen3.5:4b-q4_K_M"**.
1. `selection` == "builtin-smart"
  We **shared_args = table.append(list=table.empty_list(),item="agent-development")**.
  We **shared = store.query(sql="SELECT id FROM qd_model_profiles WHERE owner=? AND model='smart/default' ORDER BY id LIMIT 1",args=`shared_args`)**.
  1. table.len(xs=`shared`) != 1
    Return *[共享模型尚未配置](result.error(code="qdagent.model_missing",message="共享模型暂不可用",operation="resolve"))*.
  Return *[使用管理员授权的固定模型](resolve(selection=access(access(`shared`,1),"id"),principal="agent-development"))*.
1. text.starts_with(text=`selection`, prefix="shared-")
  We **profile = re.replace(text=`selection`, pattern="^shared-", with="")**.
  We **owner_args = table.append(list=table.empty_list(),item=`profile`)**.
  We **owner_args = table.append(list=`owner_args`,item="agent-development")**.
  We **owner_args = table.append(list=`owner_args`,item="shared-catalog")**.
  We **owner_rows = store.query(sql="SELECT owner FROM qd_model_profiles WHERE id=? AND owner IN (?,?)",args=`owner_args`)**.
  1. table.len(xs=`owner_rows`) != 1
    Return *[共享身份必须落在受信账户](result.error(code="qdagent.model_missing",message="共享模型暂不可用",operation="resolve"))*.
  Return *[其它共享模型仍绑定管理员配置](resolve(selection=`profile`, principal=access(access(`owner_rows`,1),"owner")))*.
1. text.starts_with(text=`selection`, prefix="custom-")
  We **args = table.append(list=table.empty_list(), item=`selection`)**.
  We **args = table.append(list=`args`, item=`principal`)**.
  We **rows = store.query(sql="SELECT protocol,model,endpoint,credential,thinking FROM qd_model_profiles WHERE id=? AND owner=?", args=`args`)**.
  1. table.len(xs=`rows`) != 1
    Return *[身份不匹配不解密](result.error(code="qdagent.model_missing", message="模型配置不存在或不属于当前用户", operation="resolve"))*.
  We **config = access(`rows`,1)**.
  We **key = ""**.
  1. access(`config`,"credential") != ""
    We **key = qdagent_model_secret(operation="open", value=access(`config`,"credential"), owner=`principal`, id=`selection`)**.
  We **config = table.delete(map=`config`, key="credential")**.
  We **config = table.put(in=`config`, at="api_key", value=`key`)**.
  1. access(`config`,"protocol") == "local"
    We **address = sys.env_get(name="QDAGENT_OLLAMA_URL")**.
    1. not `address`
      We **address = "http://127.0.0.1:11434"**.
    We **config = table.put(in=`config`, at="endpoint", value=`address`)**.
    We **config = table.put(in=`config`, at="protocol", value="ollama")**.
    We **config = table.put(in=`config`, at="builtin", value=True)**.
  Return *[私有配置只在内存使用](result.ok(value=`config`))*. 
We **endpoint = sys.env_get(name="QDAGENT_OLLAMA_URL")**.
1. not `endpoint`
  We **endpoint = "http://127.0.0.1:11434"**.

`config` =

| protocol | model | endpoint | api_key | thinking | builtin |
|---|---|---|---|---|---|
| "ollama" | `selection` | `endpoint` | "" | 1 | True |

Return *[复用既有本机配置](result.ok(value=`config`))*.

## decide

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| selection | text | required | 选定模型 |
| messages | list | required | 真实任务消息 |
| principal | text | "local" | 可信会话拥有者 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实动作以及接口返回的思考字段 |

Use `selection`, `messages` and `principal`="local"。先核验归属再调用协议适配器。请求通过 marqdo call 在可信工程根运行，模型自己的工作文件根无法读取配置数据库或主密钥。返回值不含请求头或凭据，错误响应不回传可能回显密钥的供应商正文。

The runner still checks the decision type, tool registry, argument schema and current plugin authorization. Provider thinking is display content and never becomes executable code or evidence that a tool succeeded. A normal Markdown final answer remains distinct from a real tool receipt.

We **resolved = [归属正确才获得配置](resolve(selection=`selection`, principal=`principal`))**.
1. not access(`resolved`,"ok")
  Return *resolved*.
Return *[实际请求不泄露凭据](provider.decide(config=access(`resolved`,"value"), messages=`messages`))*.


## titles

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| principal | text | "local" | 可信登录主体 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 配置身份到公开显示名称的映射 |

Use `principal`="local"。映射只由已有公开模型清单生成，不返回密文或 API Key。浏览器用不透明身份调用模型，用这个名称显示当前选择；二者不能混淆。名称重复不会改变配置归属或执行目标，仍由真实 id 选择下一轮模型。

We **entries = list(principal=`principal`)**.
We **out = table.empty_map()**.
- [只使用公开字段](for entries as entry)
  We **out = table.put(in=`out`,at=access(`entry`,"id"),value=access(`entry`,"label"))**.
Return *out*.


## preferred

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| principal | text | "local" | 可信登录主体 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 初次进入时可用的账号模型；无配置则 none |

Use `principal`="local"。只从这个主体已有的公开配置中选择，不新增凭据、不启用插件、不发送推理请求。优先使用已经配置的 smart/default，否则保留清单第一项。浏览器只在尚未手动选择时采用这个建议；用户明确选择不运行模型后，任务切换不能覆盖其决定。

We **entries = list(principal=`principal`)**.
We **selected = "none"**.
- [默认值仍来自真实账号配置](for entries as entry)
  1. `selected` == "none"
    We **selected = access(`entry`,"id")**.
  1. access(`entry`,"model") == "smart/default"
    Return *access(`entry`,"id")*.
Return *selected*.
