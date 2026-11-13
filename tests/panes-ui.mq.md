---
markup: occlusion
title: 工作台面板调宽和源码交互验收
import:
  harness: harness-ui.mq.md
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  sys: lib/sys.mq.md
  result: lib/result.mq.md
  engineering: ext/engineering/index.mq.md
---



## prepare

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 当前真实处理器的确定性输入夹具 |

基于正式工作台与真实原生 View 的现有回归，只补显式事件输入和观察调度。六组边界数据独立保存为JSON，正式 Marqdo 回调完成尺寸计算、直接入口持久化、存储和源码切换。替换锚点缺失立即失败，不绕过产品逻辑来造一个通过标记。

The fixture preserves the existing two-session workflow and expanded trace, then reaches the real file preview callback before starting any pane checks. Event metadata is the only dimension input substituted: separator id, start coordinate, current coordinate, keyboard key and a fixed test viewport. It never assigns the calculated width on behalf of begin_resize, resize_pane, end_resize or resize_keyboard. Every production handler is invoked as a direct official timer entry so state persistence remains observable.

Expected results are independent test data. Each release callback must clear drag state and persist the current preference. After all gestures, the observer resets only in-memory dimensions to simulate a page refresh and requests the actual localStorage value through the official bridge. The unchanged restore callback must adopt it. A final keyboard step and reset use their own real entrypoints. The original document and tool expansion remain present throughout.

Source view uses the same accepted owner-shaped transport observation as the existing harness test. The raw source is supplied by the actual production reader, inserted through set_text and shown only after the formal source toggle. This test does not execute document code, contact a provider, authenticate a user or assert that a synthetic pointer event establishes real operating-system capture. The generic pointer host adapter transports browser data; this fixture specifically verifies the application state machine.

Only ignored test pages are generated. The product source, installed bridge, persisted user preferences and user files are not overwritten. Chromium uses its disposable default profile, so localStorage belongs to this dedicated acceptance page. The source patches change scheduling, never a business branch or computed width. Keeping those declarations as data makes source drift fail visibly instead of silently retaining a copied implementation.

We **prepared = harness.prepare()**.
1. not access(`prepared`,"ok")
  Return *prepared*.
We **source = fs.read_text(path=".marqdo/harness-ui.mq.md")**.
We **init = "We **fixture_step = 0** and **fixture_id = \"\"** and **fixture_key = \"\"** and **fixture_anchor = 0** and **fixture_target = 0** and **fixture_measured_left = False** and **fixture_measured_right = False** and **fixture_measured_header = False**.\nWe **fixture_steps = json.parse(text=" + json.stringify(value=json.stringify(value=fs.read_json(path="tests/fixtures/panes-cases.json"))) + ")**.\nWe **bindings ="**.
We **source = text.replace(text=`source`,old="We **bindings =",new=`init`)**.
We **patches = fs.read_json(path="tests/fixtures/panes-transitions.json")**.
- [测试锚点必须存在](for patches as patch)
  1. not text.contains(text=`source`,sub=access(`patch`,"find"))
    Return *result.error(code="test.panes_anchor",message=access(`patch`,"find"),operation="prepare")*.
  We **source = text.replace(text=`source`,old=access(`patch`,"find"),new=access(`patch`,"replace"))**.
We **_ = fs.atomic_write(path=".marqdo/panes-ui.mq.md",text=(`source` + "\n" + fs.read_text(path="tests/fixtures/panes-hooks.mq.md")))**.
We **html = text.replace(text=fs.read_text(path=".marqdo/harness-ui.html"),old="harness-ui.mq.md",new="panes-ui.mq.md")**.
We **_ = fs.atomic_write(path=".marqdo/panes-ui.html",text=`html`)**.
Return *result.ok(value=True)*.

## run

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| chrome | text | required | 已安装的Chromium |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 真实DOM、样式和直接入口状态 |

Use `chrome`。真实浏览器执行当前客户端和原生桥接，必须观察尺寸样式、源码模式、通过标记和原有详情展开同时成立。保存截图与DOM便于检查；进程退出零不足以通过。测试中的坐标是明确夹具，不能冒充真实用户手势或OIDC登录。

The acceptance runner checks the actual final document rather than trusting the callback's marker. The body must expose both reference widths as numeric CSS variables, the inspector must carry the source-mode class and the original execution details must still be expanded. This catches a shallow effect merge losing style, a nested call losing assigned state, a storage callback never running, or source mode replacing the conversation. The screenshot is supplementary visual evidence, not a pixel equality claim. Its sidebar and inspector sizes follow the saved design dimensions, and its active divider stays inside the measured column boundary.

Source mode must also leave the inspector usable at the restored reference widths.

A failure keeps the bounded DOM for inspection. The runner opens only a generated local page and never accesses a user's browser profile or external account. Its scope is the deterministic width, storage, keyboard and source workflow. Public deployment is verified separately through the actual build fingerprint.

We **prepared = prepare()**.
1. not access(`prepared`,"ok")
  Return *prepared*.
We **address = "file://" + sys.cwd() + "/.marqdo/panes-ui.html"**.

`argv` =

| argument |
|---|
| `chrome` |
| "--headless" |
| "--no-sandbox" |
| "--allow-file-access-from-files" |
| "--disable-dev-shm-usage" |
| "--disable-gpu" |
| "--run-all-compositor-stages-before-draw" |
| "--disable-background-timer-throttling" |
| "--disable-renderer-backgrounding" |
| "--window-size=1600,1000" |
| "--virtual-time-budget=25000" |
| "--screenshot=/home/cflmy/work/qdagent/.marqdo/panes-ui.png" |
| "--dump-dom" |
| `address` |

We **out = engineering.checked(argv=`argv`,timeout_ms=35000,max_output=786432)**.
1. not access(`out`,"ok")
  Return *out*.
We **html = access(access(`out`,"value"),"stdout")**.
We **_ = fs.atomic_write(path=".marqdo/panes-dom.html",text=`html`)**.
1. not text.contains(text=`html`,sub="panes-ui-pass") or not text.contains(text=`html`,sub="--qd-sidebar: 267px") or not text.contains(text=`html`,sub="--qd-inspector: 496px") or not text.contains(text=`html`,sub="qd-trace-details is-expanded") or not re.is_match(text=`html`,pattern="<aside[^>]*qd-show-source")
  Return *result.error(code="test.panes",message="检查 .marqdo/panes-dom.html",operation="run")*.
Return *result.ok(value="six bounded drags / local restore / keyboard / reset / source / stable trace")*.
