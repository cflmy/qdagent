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

A missing anchor stops installation instead of silently publishing an incompatible runtime. Test and production install the same adapter. No synthetic width calculation, drag loop or business state machine is introduced in JavaScript. The Marqdo source remains the reviewable authority for when a gesture begins, what bounds apply, when it ends and which safe browser effect is returned. Coordinate transport alone never grants access to a document or starts a task.

We **path = "pages/public/generated/marqdo-bridge.js"**.
We **source = fs.read_text(path=`path`)**.
We **anchor = "    if (ev.code != null) args.code = String(ev.code);"**.
We **addition = "    if (ev.clientX != null) args.client_x = Number(ev.clientX);\n    args.viewport_width = typeof innerWidth === \"number\" ? innerWidth : 1600;\n    if (ev.type === \"pointerdown\" && t.getAttribute?.(\"data-pointer-capture\") === \"true\" && t.setPointerCapture && ev.pointerId != null) {\n      t.setPointerCapture(ev.pointerId);\n      ev.preventDefault();\n    }"**.
1. not text.contains(text=`source`,sub=`addition`)
  We **_ = fs.text_patch(path=`path`,find=`anchor`,replace=(`addition` + "\n" + `anchor`))**.
Return *[业务仍由 Marqdo 决定](result.ok(value=True))*.
