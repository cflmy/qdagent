---
markup: occlusion
title: 浏览器键盘事件的 ABI 补充
import:
  fs: lib/fs.mq.md
  text: lib/text.mq.md
  result: lib/result.mq.md
---



## install

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 本工程浏览器宿主增加修饰键与输入法状态 |

官方桥接只传 key 与 code，Marqdo 无法区分 Shift+Enter 换行和中文输入法确认。本地 ABI 适配只补原始事件字段，不实现发送、模型选择或任何业务。判断全部留在客户端 Marqdo on_key。补丁检查唯一锚点并保持幂等，不修改相邻 Marqdo 源码。

The extra booleans are faithful host event data: shift, control, meta and composition. Existing callers that do not declare them remain compatible. No private browser state, credential or arbitrary executable is added. The image build applies this adapter after the existing file-range adapter, and the bridge content hash invalidates stale assets.

This is an explicit host capability gap, not a second application implementation. The Marqdo callback decides when Enter means send and when the browser should retain its native editing behavior. A failed anchor stops installation rather than silently publishing a mismatched runtime.

We **path = "pages/public/generated/marqdo-bridge.js"**.
We **source = fs.read_text(path=`path`)**.
We **anchor = "    if (ev.code != null) args.code = String(ev.code);"**.
We **replacement = `anchor` + "\n    args.shift_key = !!ev.shiftKey;\n    args.ctrl_key = !!ev.ctrlKey;\n    args.meta_key = !!ev.metaKey;\n    args.is_composing = !!ev.isComposing;"**.
1. not text.contains(text=`source`,sub=`replacement`)
  We **_ = [唯一锚点补充宿主事件数据](fs.text_patch(path=`path`,find=`anchor`,replace=`replacement`))**.
Return *[业务仍由 Marqdo 决定](result.ok(value=True))*.
