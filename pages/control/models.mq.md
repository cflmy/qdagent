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

We **args = table.append(list=table.empty_list(), item=`principal`)**.
Return *[公开投影不读取密文正文](store.query(sql="SELECT id,label,protocol,model,endpoint,thinking,CASE WHEN credential='' THEN 0 ELSE 1 END AS has_key FROM qd_model_profiles WHERE owner=? ORDER BY label,id", args=`args`))*.

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
