---
markup: occlusion
title: 上传游标和模型选择的真实 WASM 回归
import:
  composer: composer-ui.mq.md
  panels: ../pages/control/panels.mq.md
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
  re: lib/re.mq.md
  engineering: ext/engineering/index.mq.md
  result: lib/result.mq.md
---

基于真实组件和正式客户端，只替换网络与原生文件选择的环境边界。实际回调、分块阶段、上传确认、模型选择与详情展开状态都由官方 WASM 执行。

## prepare

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前客户端生成的隔离输入栏测试页 |

先沿用两会话、详情展开和居中浮层的已有回归，再触发真实上传入口。原生文件事件被明确的五字节元数据替代，范围读取回调每次提供两字节、最后一字节；客户端仍须等待服务端形态的确认才能读取下一片。这个夹具证明浏览器状态机，不能证明真实网络或文件保存。

The only replaced functions are the transport adapters and the native file-read effect. Direct production callbacks retain their phase and cursor assignments, stale-response checks and modal cleanup. The observation hooks never repair them. The server and native file host have separate real tests, including an exact fifty MiB file and an actual fifty MiB Blob with a tiny last range.

After a genuine finish callback, the official timer invokes the real model form handler with deterministic field metadata. The public response enters on_models, which must persist the opaque profile id, replace only the public choice list and close the overlay. No test handler assigns the selected model itself. The final checker observes that assignment and the earlier detail token.

The generated client and page stay under .marqdo. Credentials in this fixture are explicit test strings, not deployment keys, and no provider request is made. A failure leaves the final DOM for diagnosis. Product source, official WASM and user histories are never replaced by the fixture.

There are three kinds of substitutions, each with a narrow purpose. Native file event metadata supplies a small filename and size; native range-read metadata supplies the actual offset and a deterministic byte fragment; HTTP transport supplies a documented response envelope. None of them assigns the product's acknowledged cursor, upload phase, busy state or selected model. If a direct callback fails to persist one of those values, a later genuine callback sees the wrong state and the final observer refuses to pass.

The five-byte sample deliberately requires three acknowledgements. The first two reads contain two bytes, and the final read contains one. This catches a client that keeps reading a fixed block past the end or treats a local read as an acknowledged server write. The mock server derives its next offset from the actual request's decoded Base64 length rather than returning an arbitrary desired cursor. It remains a transport fixture; the real file host test and exact fifty MiB service test establish the actual byte boundary separately.

The upload source and response epoch are fixed at the real on_file entry. A response still passes through the ordinary URL suffix check, JSON decoder and session comparison. The test does not call on_uploaded as a nested helper, because doing so would change the official WASM's direct-entry persistence semantics and could hide the very bug being checked. All transitions happen through official timers or fetch callbacks.

Model fields likewise enter the unchanged save_model event entry. The fake provider response contains only an opaque public id and component-generated choice markup, never a credential. The real on_models callback must adopt that identity, clear its busy state and schedule selection synchronization after the new button exists. The final observer cannot add the highlight itself. A class applied before set_html is intentionally lost by the real bridge and causes the DOM assertion to fail.

The generator locates function boundaries and intention labels, not fixed product line numbers. A missing replacement boundary should be investigated as a fixture contract change rather than compensated for by writing a passing probe. The fixture source is readable Marqdo, and check can inspect it independently. Failure diagnostics remain local because they may contain generated source, even though the fixture credentials themselves are explicitly artificial.

We **_ = composer.prepare(closed=True)**.
We **client = fs.read_text(path=".marqdo/composer-ui.mq.md")**.
We **client = text.replace(text=`client`, old="  browser: lib/browser.mq.md", new="  bytes: lib/bytes.mq.md\n  browser: lib/browser.mq.md")**.
We **client = re.replace(text=`client`, pattern="(?s)## fixture_overlay_done\\n.*$", with="## fixture_overlay_done\n\n| 返回 | 类型 | 说明 |\n|---|---|---|\n| result | any | 启动真实输入事件 |\n\n只安排产品入口。\n\nReturn *[开始输入回归](browser.after(ms=20, then=\"on_file\"))*.\n")**.
We **section = re.find(text=`client`, pattern="(?s)## on_file\\n.*?## on_file_read")**.
We **changed = text.replace(text=`section`, old="1. \x60upload_busy\x60", new="We **file_name = \"fixture.txt\"** and **file_size = 5**.\n1. \x60upload_busy\x60")**.
We **client = text.replace(text=`client`, old=`section`, new=`changed`)**.
We **section = re.find(text=`client`, pattern="(?s)## on_file_read\\n.*?## _upload_idle")**.
We **changed = text.replace(text=`section`, old="1. not \x60ok\x60", new="We **ok = True** and **offset = \x60upload_offset\x60** and **read_size = 2** and **data_url = \"data:text/plain;base64,YWE=\"**.\n1. \x60upload_total\x60 - \x60upload_offset\x60 == 1\n  We **read_size = 1** and **data_url = \"data:text/plain;base64,YQ==\"**.\n1. not \x60ok\x60")**.
We **client = text.replace(text=`client`, old=`section`, new=`changed`)**.
We **client = re.replace(text=`client`, pattern="Return [*]\\[完整文件才显示完成\\][^\\n]*", with="Return *[完成后观察](_merge(a=_upload_idle(status=\"fixture upload complete\"), b=browser.after(ms=20, then=\"fixture_upload_done\")))*.")**.
We **client = text.replace(text=`client`, old="1. \x60model_saving\x60 or not \x60fields\x60", new="We **fields = json.parse(text=\"{\\\"label\\\":\\\"fixture\\\",\\\"model\\\":\\\"fixture\\\",\\\"endpoint\\\":\\\"https://api.example.org/v1\\\",\\\"protocol\\\":\\\"openai\\\",\\\"api_key\\\":\\\"fixture-only\\\"}\")**.\n1. \x60model_saving\x60 or not \x60fields\x60")**.
We **client = text.replace(text=`client`, old="Return *[同步已建立的模型控件](\x60paint\x60)*.", new="1. \x60model\x60 == \"custom-fixture\"\n  Return *[同步后观察](_merge(a=paint, b=browser.after(ms=20, then=\"fixture_model_done\")))*.\nReturn *[同步已建立的模型控件](\x60paint\x60)*.")**.
We **fixture = fs.read_text(path="tests/fixtures/input-request.mq.md")**.

`entries` =

| @ | id | label | model |
|---|---|---|---|
| 1 | "custom-fixture" | "夹具模型" | "fixture" |

We **html = panels.models(entries=`entries`)**.
We **literal = text.replace(text=json.stringify(value=`html`), old="\x60", new="\\x60")**.
We **fixture = text.replace(text=`fixture`, old="\"@MODELS@\"", new=`literal`)**.
We **mock = re.find(text=`fixture`, pattern="(?s)## _upload_request\\n.*?## _model_request")**.
We **client = re.replace(text=`client`, pattern="(?s)## _upload_request\\n.*?## _read_upload", with=(`mock` + "\n## _read_upload"))**.
We **mock = re.find(text=`fixture`, pattern="(?s)## _model_request\\n.*$")**.
We **client = re.replace(text=`client`, pattern="(?s)## _model_request\\n.*?## save_model", with=(`mock` + "\n## save_model"))**.
We **client = re.replace(text=`client`, pattern="Return [*]\\[使用本地 Web 宿主有界 ABI\\][^\\n]*", with="Return *[模拟原生文件回调](browser.after(ms=10, then=\"on_file_read\"))*.")**.
We **_ = fs.atomic_write(path=".marqdo/input-ui.mq.md", text=(`client` + "\n" + fs.read_text(path="tests/fixtures/input-hooks.mq.md")))**.
We **html = text.replace(text=fs.read_text(path=".marqdo/composer-ui.html"), old="composer-ui.mq.md", new="input-ui.mq.md")**.
We **_ = fs.atomic_write(path=".marqdo/input-ui.html", text=`html`)**.
Return *[夹具已准备](result.ok(value=".marqdo/input-ui.html"))*.

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| chrome | text | required | 已有浏览器 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实 WASM 状态与公开模型高亮 |

Use `chrome`。只打开隔离文件页，读取实际 DOM 的通过标记、模型高亮和浮层退出状态。浏览器进程退出零不代表完成，任何丢失的直接状态、错误的确认游标或浅合并覆盖都应使标记缺失。失败 DOM 留在忽略目录，不读取真实用户浏览器资料。

The test is intentionally deterministic. It does not create an OIDC account, upload a real user file or call a paid model. Those boundaries have independent native and service checks. Its value is exercising the exact product callbacks under the official WASM/bridge rather than an imitation state machine written in another language.

The final model button must actually carry is-active in the browser DOM, not merely appear in an effect record. The probe also requires the old trace expansion token to survive configuration, catching a broad page replacement that would lose the user's place. Both checks are required; neither a timer completion nor process exit alone establishes success.

We **_ = prepare()**.

`argv` =

| argument |
|---|
| `chrome` |
| "--headless" |
| "--no-sandbox" |
| "--allow-file-access-from-files" |
| "--disable-dev-shm-usage" |
| "--disable-gpu" |
| "--virtual-time-budget=25000" |
| "--dump-dom" |
| "file:///home/cflmy/work/qdagent/.marqdo/input-ui.html" |

We **ran = engineering.checked(argv=`argv`, timeout_ms=35000, max_output=131072)**.
1. not access(`ran`,"ok")
  Return *ran*.
We **html = access(access(`ran`,"value"),"stdout")**.
We **_ = fs.atomic_write(path=".marqdo/input-ui-dom.html", text=`html`)**.
1. not text.contains(text=`html`, sub="input-ui-pass:chunks-model-detail") or not re.is_match(text=`html`, pattern="<button[^>]*class=\"[^\"]*is-active[^\"]*\"[^>]*id=\"model-custom-fixture\"")
  Return *[保存真实失败现场](result.error(code="test.input_ui", message="读取 .marqdo/input-ui-dom.html", operation="run"))*.
Return *[真实输入状态通过](result.ok(value="three chunks / finish / custom model saved / selection highlight / detail preserved"))*.
