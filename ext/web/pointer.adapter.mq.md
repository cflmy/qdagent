---
markup: occlusion
title: 指针坐标与捕获的浏览器 ABI 适配
import:
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
---



## install

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 通用指针坐标与显式捕获 |

官方桥接不提供指针坐标，拖拽分隔条存在实际 ABI 缺口。本适配仅传 clientX、视口宽度，并为显式声明 data-pointer-capture 的元素启用标准指针捕获。宽度、比例、边界、区域与持久化全部由 Marqdo 客户端决定。

The installer patches one known metadata anchor idempotently. Pointer coordinates remain numeric host observations rather than application commands. Capture keeps later events associated with the same native handle after the pointer leaves it, and the browser releases capture at gesture completion. This adapter does not understand a workspace, document, provider, credential, task process or permission. It does not choose a panel or write user preferences. Source remains in this project's copied extension; adjacent Marqdo source does not change.

The mount host also binds declared event listeners before awaiting any asynchronous boot effect. This avoids leaving visible controls inert while an initial network fetch is in flight. The host only changes scheduling; the application still owns all state, requests and actions. Ready status is applied before the initial fetch so a later genuine response is not overwritten by a generic bridge message.

A missing anchor stops installation instead of silently publishing an incompatible runtime. Test and production install the same adapter. No synthetic width calculation, drag loop or business state machine is introduced in JavaScript. The Marqdo source remains the reviewable authority for when a gesture begins, what bounds apply, when it ends and which safe browser effect is returned. Coordinate transport alone never grants access to a document or starts a task.

We **path = "pages/public/generated/marqdo-bridge.js"**.
We **source = fs.read_text(path=`path`)**.
We **anchor = "    if (ev.code != null) args.code = String(ev.code);"**.
We **addition = "    if (ev.clientX != null) args.client_x = Number(ev.clientX);\n    args.viewport_width = typeof innerWidth === \"number\" ? innerWidth : 1600;\n    if (ev.type === \"pointerdown\" && t.getAttribute?.(\"data-pointer-capture\") === \"true\" && t.setPointerCapture && ev.pointerId != null) {\n      t.setPointerCapture(ev.pointerId);\n      ev.preventDefault();\n    }"**.
1. not text.contains(text=`source`,sub=`addition`)
  We **_ = fs.text_patch(path=`path`,find=`anchor`,replace=(`addition` + "\n" + `anchor`))**.
We **source = fs.read_text(path=`path`)**.
We **boot_anchor = "  if (result.value && !Array.isArray(result.value)) {\n    await applyEffects(exports, result.value, { onError });\n  }\n\n  const n = wireEvents(exports, result.value, { onError });\n  const srcLabel = opts.sourceUrl || \"(inline)\";\n  markReady(opts, \x60marqdo-wasm ${ver} · wired ${n} handler(s)\\nsource: ${srcLabel}\x60);"**.
We **boot_replacement = "  const n = wireEvents(exports, result.value, { onError });\n  const srcLabel = opts.sourceUrl || \"(inline)\";\n  markReady(opts, \x60marqdo-wasm ${ver} · wired ${n} handler(s)\\nsource: ${srcLabel}\x60);\n\n  if (result.value && !Array.isArray(result.value)) {\n    await applyEffects(exports, result.value, { onError });\n  }"**.
1. not text.contains(text=`source`,sub=`boot_replacement`)
  We **_ = fs.text_patch(path=`path`,find=`boot_anchor`,replace=`boot_replacement`)**.
Return *[业务仍由 Marqdo 决定](result.ok(value=True))*.
