---
markup: occlusion
title: 模型配置、思考投影与用户隔离
import:
  models: ../pages/control/models.mq.md
  store: ../ext/qdagent/store.mq.md
  provider: ../ext/qdagent/model-client.mq.md
  trace: ../pages/agent/trace.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
  test: capabilities.mq.md
---

使用专用内部身份和明确的伪凭据，不创建 OIDC 用户，也不访问真实供应商。所有数据库、加密、协议解析和组件渲染仍是生产函数，不能通过测试脚本代替它们预先写入成功。

## run

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 密文存储、公开投影、归属和真实字段渲染通过 |

保存后检查 SQLite 确实有一条密文记录，且不等于测试凭据；可信服务解密后必须与原值一致。公开清单不能包含凭据正文或密文字段，另一个身份不能解析这份配置。跨用户删除也不能移除它，自己的删除才使记录消失。测试只使用显式的 fixture 密钥，绝不读取或打印部署主密钥。

Provider decoding uses an OpenAI-compatible response fixture containing a normal final decision and an optional reasoning_content field. The returned thought is display data, not an instruction to execute a tool. A model card must include the decision, a data-id, an initial collapsed accessibility state and safely rendered Markdown thought. Without a thought, thinking_html must be empty rather than a visible placeholder.

The fixture distinguishes provider text from the assistant's own hidden reasoning: it contains only a short artificial rendering sample. The HTML assertion checks actual emphasis output from the existing component renderer, not an expected hand-written card. The state browser regression separately verifies that expansion survives later polling with real WASM callbacks and business data-id metadata.

The local profile option only selects a model name at the administrator-owned Ollama address. It cannot specify another private host or attach an arbitrary credential. Remote profiles remain subject to the native public HTTPS/DNS guard. Tests of encryption integrity, private-address denial and redirects are part of the native plugin build and run before installation.

This regression can run as the non-root container user. SQLite and all dedicated task material stay in the data volume, while application source is read-only. Passing a host-only test is not used as a substitute for that runtime check. It does not claim that an external paid provider or a particular local model returned a successful completion.

The ciphertext assertion alone would be insufficient: a function could store an unrelated random string and appear encrypted. The trusted resolver must also recover the exact fixture value, while a different owner must be denied before receiving a configuration. The public-list assertion independently proves that neither plaintext nor ciphertext is sent as a browser field. Native AES-GCM tests additionally reject altered owner/profile authenticated data and verify fresh nonces.

The deletion checks use the newly generated id, avoiding confusion with fixtures left by an earlier run. A foreign delete must leave that exact row in SQLite; the owner later removes it. These are bound production queries, so a duplicate display label cannot redirect the operation to another profile. The test does not clear a whole table or reset the application's settings database.

The model card assertion checks the rendered emphasis and actual delegated identity together. A string containing the right words is not enough if it lacks the button's business identity or bypasses the safe Markdown renderer. The no-thought case checks an empty result field that the client uses to hide its region. It does not fabricate a successful inference or request a model's private text to make the test pass.

The fixture uses only a disposable test credential and never logs a deployment key or decrypted configuration record.

The ordinary task-completion sample is intentionally a scalar string. It catches accidental map-only projection when a task ends with Markdown rather than a structured decision. Such records are common in existing sessions, so model thinking support must preserve their original display and leave the thought region empty. This assertion complements the structured provider case rather than replacing it.

We **owner = "model-settings-acceptance"**.
We **saved = models.save(label="验收模型", model="fixture", endpoint="https://api.example.org/v1", api_key="fixture-not-a-real-credential", thinking=True, principal=`owner`)**.
We **_ = test.assert(condition=access(`saved`,"ok"), message="cannot save profile")**.
We **id = access(`saved`,"value")**.
We **args = table.append(list=table.empty_list(), item=`id`)**.
We **rows = store.query(sql="SELECT credential FROM qd_model_profiles WHERE id=?", args=`args`)**.
We **cipher = access(access(`rows`,1),"credential")**.
We **_ = test.assert(condition=`cipher` != "" and `cipher` != "fixture-not-a-real-credential", message="credential is not encrypted")**.
We **public = json.stringify(value=models.list(principal=`owner`))**.
We **_ = test.assert(condition=not text.contains(text=`public`, sub="fixture-not-a-real-credential") and not text.contains(text=`public`, sub=`cipher`), message="credential exposed by public list")**.
We **private = models.resolve(selection=`id`, principal=`owner`)**.
We **_ = test.assert(condition=access(access(`private`,"value"),"api_key") == "fixture-not-a-real-credential", message="credential roundtrip failed")**.
We **denied = models.resolve(selection=`id`, principal="model-settings-other")**.
We **_ = test.assert(condition=not access(`denied`,"ok"), message="cross-owner model accepted")**.
We **_ = models.remove(id=`id`, principal="model-settings-other")**.
We **rows = store.query(sql="SELECT id FROM qd_model_profiles WHERE id=?", args=`args`)**.
We **_ = test.assert(condition=table.len(xs=`rows`) == 1, message="cross-owner delete accepted")**.
We **response = provider.decode(protocol="openai", body="{\"choices\":[{\"message\":{\"content\":\"{\\\"type\\\":\\\"final\\\",\\\"message\\\":\\\"完成\\\"}\",\"reasoning_content\":\"这是 **接口返回字段** 的渲染夹具。\"}}]}")**.
We **_ = test.assert(condition=access(`response`,"ok"), message="provider decode failed")**.
We **details = table.put(in=None, at="decision", value=access(`response`,"value"))**.
We **details = table.put(in=`details`, at="thinking", value=access(`response`,"thinking"))**.

`event` =

| seq | kind | title | status | details | at_ms |
|---|---|---|---|---|---|
| 1 | "model" | "模型决策 1" | "running" | "fixture" | 1 |

`finish` =

| status | details | at_ms |
|---|---|---|
| "succeeded" | `details` | 2 |

We **card = trace.card(event=`event`, finished=`finish`)**.
We **html = access(`card`,"html")**.
We **_ = test.assert(condition=text.contains(text=`html`, sub="data-id=\"1\"") and text.contains(text=`html`, sub="aria-expanded=\"false\"") and text.contains(text=`html`, sub="<strong>接口返回字段</strong>"), message="model detail or thought rendering missing")**.
We **empty = trace.card(event=`event`)**.
We **_ = test.assert(condition=access(`empty`,"thinking_html") == "", message="empty thought placeholder returned")**.
We **plain_finish = table.put(in=`finish`, at="details", value="普通任务的文本结束记录")**.
We **plain = trace.card(event=`event`, finished=`plain_finish`)**.
We **_ = test.assert(condition=access(`plain`,"thinking_html") == "" and text.contains(text=access(`plain`,"output"), sub="普通任务的文本结束记录"), message="plain completion record cannot render")**.
We **local = models.save(label="本机模型", model="fixture", endpoint="", protocol="local", principal=`owner`)**.
We **_ = test.assert(condition=access(`local`,"ok"), message="local model-name configuration failed")**.
We **_ = models.remove(id=access(`local`,"value"), principal=`owner`)**.
We **_ = models.remove(id=`id`, principal=`owner`)**.
Return *[只返回验收结果](result.ok(value="encrypted credential / owner isolation / custom model / provider thought Markdown / empty thought hidden"))*.
