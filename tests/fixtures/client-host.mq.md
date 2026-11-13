---
markup: occlusion
title: 隔离浏览器测试宿主
---

这个文件只生成测试页的最小容器与官方桥接引用。它没有业务脚本；所有交互行为来自
当前客户端生成的 .mq.md 测试副本。页面写入 .marqdo 后，正式站点不会加载此宿主。
本地文件访问只用于专用 Chromium 验收，不能作为线上部署策略。

## html

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 最小 HTML 宿主，生成后位于 .marqdo/client-state.html |

测试状态有独立的输出节点，避免官方桥接的“挂载完成”文案覆盖故障证据。
结构容器、输入框和发送停止按钮沿用正式选择器，因此原客户端效果不需要改写。
工作区等完整业务面板不在这项状态测试中触发；只保留模型选择所需的最小节点。

结构容器为空是刻意的：只有正式客户端收到并接受响应后，答案节点才会出现。按钮禁用状态与最终状态行也由真实效果更新，不在 HTML 模板中预先放置通过标记。测试读取最终 DOM 时，同时检查完成标记和可继续发送，避免只凭一个静态标题得出结论。

脚本与 WASM 都引用工程中已有官方产物。路径相对于 .marqdo 测试页计算，不要求复制或改写官方 JavaScript。若产物缺失或不兼容，桥接会把加载错误写入状态节点，验收必须失败。

测试宿主没有产品样式和完整的模型配置内容，因此不能用它判断正式页面的布局完成度。它只提供状态机必须操作的节点：结构区接收官方片段，输入框提供文本，按钮反映忙闲，状态行展示错误或结束。测试观察节点保留跨回调状态摘要，帮助区分尚未完成、取消中和状态未持久化。

把最小布局放在独立函数中，也让测试生成器只读取源码值，不需要维护额外的 HTML 文件或内联 JavaScript。正式页面仍由原有组件拆分与官方 View 装配负责。

三个模型按钮和一个已打开的模型面板用于检查效果合并：选择新模型后，原选项的高亮必须移除，当前选项应高亮，面板应收起。这些节点不负责模型推理，只验证已有事件入口与 DOM 外观合同，防止多份 remove_class 被浅合并覆盖。

| 节点 | 初始状态 | 结束时检查 |
|---|---|---|
| model-none | 带旧选项高亮 | 选择 qwen 后旧高亮应被清理 |
| model-echo | 普通未选状态 | 不应意外成为当前模型 |
| model-qwen | 普通未选状态 | 正式入口选择后应保留高亮 |
| panel-model | 预先打开 | 选择结束应关闭 |
| tab-model | 带面板标签高亮 | 面板关闭后标签也应收束 |
| chat-status | 普通加载文案 | 由真实检查器写入结束状态 |
| structure | 空容器 | 由实际回答效果填充 |

初始打开的面板不是正式产品默认值，而是故意制造一个必须清理的状态。如果测试页面从头到尾都没有浮层，即使关闭效果完全丢失也可能通过。旧模型初始高亮同样用于证明清理真实发生，不能只验证新按钮的 class。

HTML 中没有内联事件或业务程序。唯一脚本引用是工程已经使用的官方桥接，它再加载现有 WASM 与生成的 Marqdo 客户端。源码、渲染资源、浏览器配置和 DOM 诊断各自有明确位置，失败时能够逐层定位，而不是维护一个测试专用 JavaScript 实现。

Return *"<!doctype html><html><head><meta charset=\"utf-8\"><title>qdagent isolated state</title></head><body><output id=\"probe\" aria-label=\"测试状态\"></output><button id=\"model-none\" class=\"is-active\">none</button><button id=\"model-echo\">echo</button><button id=\"model-qwen\">qwen</button><aside id=\"panel-model\" class=\"is-open\"></aside><button id=\"tab-model\" class=\"is-active\">模型</button><h1 class=\"page\">test</h1><div id=\"structure\"><section id=\"qd-conversation\"><section id=\"qd-dialogue\"></section><section id=\"qd-execution\"><section id=\"qd-trace\"></section></section><section id=\"qd-reply\"></section></section></div><button id=\"qd-backdrop\"></button><section id=\"qd-chrome\"></section><section id=\"panel-kb-body\"></section><section id=\"panel-workspace-body\"></section><section id=\"panel-plugins-body\"></section><textarea id=\"chat-input\"></textarea><button id=\"chat-send\">发送</button><button id=\"chat-stop\" disabled>停止</button><div id=\"chat-status\">loading</div><script type=\"module\" src=\"../pages/public/generated/marqdo-bridge.js\" data-mq-wasm=\"../pages/public/generated/marqdo_wasm.wasm\" data-mq-source-url=\"client-state.mq.md\" data-mq-ready=\"#chat-status\"></script></body></html>"*.
