---
markup: occlusion
title: 浏览观察的保存与交接
import:
  io: ext/root-skill/runtime/io.mq.md
  core: ext/root-skill/state.mq.md
  proof: ext/root-skill/proof.mq.md
  fs: lib/fs.mq.md
  bytes: lib/bytes.mq.md
  hash: lib/hash.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

本模块是可信宿主实现，不出现在模型的浏览函数文稿中。页面来自浏览器，文件读写来自 Marqdo 标准库，业务阶段仍由根文稿控制。

## capture

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信角色与当前任务根 |
| url | text | required | 公开网页地址 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 保存后的真实来源元数据 |

Use `context`, `url`。

The browser broker runs outside the agent container and never receives the workspace mount, model key, OIDC session or provider configuration. This function sends only a URL. The broker checks the destination before navigation and rechecks each redirect and subresource. A captured page is an observation at one time, not a guarantee of factual reliability. Errors keep their actual meaning and do not create a source record. The start event is therefore separate from the persisted successful end event. If saving fails, no successful capture is reported. The caller can inspect the failure and decide whether to retry within the root document's budget. External text remains data, including any instructions embedded in it. The broker is currently a read-only HTML/CSS reader with site JavaScript disabled; it does not claim to complete login, form submission or arbitrary interactive browsing.

先检查细化阶段和当前角色，再请求浏览器，记录实际开始与结束。取得页面不代表内容的科学事实已经核实，返回只描述真实观察。浏览器不能选择本机文件目录；原生边界只转接固定服务，文件保存由本函数在当前任务根内完成。

截图保持原始 PNG 字节，正文以不可执行的快照保存。网络错误不创建一个成功来源，保存或状态提交失败也不能报告完成。模型只接收有界摘录与可定位的来源，完整正文留在实际文件里；网页内容不作为新增系统指令。

We **state = access(core.status(context=`context`),"value")**.
1. access(`state`,"phase") != "refine" or (access(`context`,"role") != "implement" and access(`context`,"role") != "research")
  Return *result.error(code="browser.scope",message="当前阶段不能浏览网页",operation="capture")*.
We **event = table.put(in=table.put(in=None,at="id",value=access(`context`,"unit_id")),at="url",value=`url`)**.
We **_ = io.event(context=`context`,kind="browser_start",data=`event`)**.
We **page = io.native(context=`context`,operation="runtime_browser_open",payload=table.put(in=None,at="url",value=`url`))**.
1. not access(`page`,"ok")
  We **_ = io.event(context=`context`,kind="browser_end",data=table.put(in=table.put(in=`event`,at="status",value="failed"),at="result",value=`page`))**.
  Return *page*.
We **record = persist(page=access(`page`,"value"),unit_id=access(`context`,"unit_id"))**.
We **saved = remember(context=`context`,record=`record`)**.
1. not access(`saved`,"ok")
  Return *saved*.
We **_ = io.event(context=`context`,kind="browser_end",data=table.put(in=table.put(in=`record`,at="id",value=access(`context`,"unit_id")),at="status",value="succeeded"))**.
Return *result.ok(value=`record`)*.

## persist

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| page | map | required | 实际浏览器返回的页面观察 |
| unit_id | text | required | 当前已确认单元身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 不含大块二进制的来源记录 |

Use `page`, `unit_id`。

The native screenshot stays binary throughout persistence. Standard bytes decoding and filesystem functions write it; neither Python nor a string renderer rewrites image contents. The Markdown snapshot contains an inert fenced copy of the observed body, with a fence long enough to contain any source backticks. This avoids accidentally executing page content when a human opens the saved material. The timestamp and URL identify the actual navigation result, including redirects, and the hash identifies the observed text. The local source identifier cannot be chosen by the website. Screenshot data is deliberately absent from the public metadata and subsequent prompts, which keeps context and event sizes bounded. A reviewer can separately open the screenshot and snapshot from the authenticated task workspace. These files prove what the reader observed; they do not prove that the author interpreted it correctly. A later reread produces a new identifier rather than silently changing an old observation.

浏览器返回的正文、标题、时间和截图属于观察，不是模型生成的事实。根据地址和获取时间生成稳定记录身份，保留正文摘要，文件名不来自网页标题。截图通过 bytes 和 fs 原样保存，不做 UTF-8 转换；正文使用原生文稿围栏，网页中的反引号或标题不会变成执行语句。

模型下一轮只看到摘录、来源和文件路径，不把 PNG 的 Base64 或整份协议加入上下文。完整快照仍可供用户核对。页面相同但获取时间不同会有不同的记录，避免把新观察伪装为旧版本；根状态按来源地址归并当前可用证据。

We **identity = hash.sha256(text=(access(`page`,"url") + access(`page`,"fetched_at")))**.
We **directory = "evidence/browser/" + `unit_id`**.
We **_ = fs.make_dirs(path=`directory`)**.
We **snapshot = `directory` + "/" + `identity` + ".md"**.
We **screenshot = `directory` + "/" + `identity` + ".png"**.
We **fence = io.native(context=table.empty_map(),operation="runtime_fence",payload=table.put(in=None,at="content",value=access(`page`,"text")))**.
We **body = "# 网页快照\n\n来源：" + access(`page`,"url") + "\n\n获取时间：" + access(`page`,"fetched_at") + "\n\n" + access(`fence`,"value") + "\n"**.
We **_ = fs.atomic_write(path=`snapshot`,text=`body`)**.
We **_ = fs.write_bytes(path=`screenshot`,data=bytes.from_base64(text=access(`page`,"screenshot")))**.
We **sha256 = hash.sha256(text=access(`page`,"text"))**.

`record` =

| source_id | url | title | fetched_at | snapshot | screenshot | sha256 | excerpt | sandbox |
|---|---|---|---|---|---|---|---|---|
| `identity` | `page`[^url] | `page`[^title] | `page`[^fetched_at] | `snapshot` | `screenshot` | `sha256` | `page`[^excerpt] | `page`[^sandbox] |

Return *record*.

## remember

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前单元的可信身份 |
| record | map | required | 已经保存的真实来源 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 原子保存后的根状态 |

Use `context`, `record`。

Recording a source is a state operation after successful file persistence. It does not create an approval or a new business responsibility. Updates preserve other units through the same compare-and-swap merge used by authors. Repeating one URL updates that observation rather than increasing the count of independent sources. The limit is explicit so the model cannot fill a role context with unbounded pages.

同一个单元按真实地址更新观察，保留其他来源。最多八个来源限制资源与上下文，超出时明确失败，不能悄悄丢弃旧证据。这个列表只包含当前单元及其获准交接的观察，不扫描其他会话或服务器目录。

保存使用根状态的版本比较，其他单元可以并发写自己的记录。来源文件存在与状态提交是两个事实；只有都成功才向用户报告完整浏览结果。地址、摘要与路径都来自刚才的浏览和文件操作，不接受模型自报一个“已读取”的记录。

We **state = access(core.status(context=`context`),"value")**.
We **item = proof.unit(state=`state`,unit_id=access(`context`,"unit_id"))**.
We **sources = json.get(value=`item`,key="sources")**.
We **updated = table.empty_list()**.
1. `sources`
  - [保留其他实际来源](for sources as source)
    1. access(`source`,"url") != access(`record`,"url")
      We **updated = table.append(list=`updated`,item=`source`)**.
We **updated = table.append(list=`updated`,item=`record`)**.
1. table.len(xs=`updated`) > 8
  Return *result.error(code="browser.source_limit",message="每个单元最多八个来源",operation="remember")*.
Return *proof.save_unit(context=`context`,item=table.put(in=`item`,at="sources",value=`updated`))*.
