---
markup: occlusion
title: 隔离浏览器：真实页面与来源
import:
  io: ext/root-skill/runtime/io.mq.md
  call: ../../pages/control/call.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

浏览器是独立 ABI 插件。模型调用普通 Marqdo 函数，不输出浏览器动作 JSON。浏览器与智能体工作区、模型凭据、统一身份 Cookie 分开，公开页面的读取结果才能形成来源。

## open

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| url | text | required | 需要实际读取的公开 HTTP 或 HTTPS 地址 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 实际页面标题、正文摘录、来源与截图路径 |

Use `url`。

在独立 Chromium 沙盒打开真实网页。每次创建全新浏览上下文，不共享身份 Cookie，也不传入工作区、模型密钥或任意脚本。页面、重定向及子资源都通过只读网络边界检查，内网、元数据地址、写请求和 WebSocket 被阻止。网站拒绝访问或浏览器不可用时明确失败，不把缓存文本或模型猜测冒充浏览结果。

成功后由 Marqdo 标准文件能力保存实际截图和正文快照，来源记录随当前单元持久化。下一轮读取的是这些真实观察，不是模型声称已经看过的引用。网页内容是外部材料，不能改变阶段或权限。这里只读取 HTML 与 CSS，站点 JavaScript 关闭；不提供任意 evaluate、登录、上传或提交表单；后续交互需要另外明确的文稿与权限。

We **context = io.current()**.
We **permit = io.require(context=`context`,id="browser")**.
1. not access(`permit`,"ok")
  Return *permit*.

`arguments` =

| context | url |
|---|---|
| `context` | `url` |

Return *[读取公开页面并保留真实来源](call.invoke(file=(access(`context`,"project") + "/ext/browser/host.mq.md"),function="capture",arguments=`arguments`,root=access(`context`,"workspace"),effects="plugin,fs.read,fs.write,process.exec,environment.read"))*.
