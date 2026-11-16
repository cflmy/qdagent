---
markup: occlusion
title: 固定办公模板的安全文字与部件写入
import:
  fs: lib/fs.mq.md
  html: lib/html.mq.md
  text: lib/text.mq.md
---

只接受固定模板中的文字，不让内容成为 XML 节点。

## escape

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | text | required | 只作为正文的内容 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | XML 字符数据 |

Use `value`。用户和模型提供的是文字，不是 XML 程序。已有 HTML 字符转义同时适用于这里的 XML 文本位置；花括号也编码为字符引用，避免正文恰巧包含模板标记时被二次替换。此函数不解析链接，不接受节点片段，也不执行源稿。返回值只放在元素的字符数据位置。

We **safe = [先转义文字](html.escape(text=`value`))**.
Return *[模板标记也是普通文字](text.replace(text=text.replace(text=`safe`,old="{",new="&#123;"),old="}",new="&#125;"))*.

## part

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 本次生成的包目录 |
| path | text | required | 固定内部部件路径 |
| body | text | required | 已生成的 XML 数据 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | any | 部件写入完成 |

Use `root`, `path` and `body`。部件路径只由本模块固定生成，不从用户标题或段落取得。父目录是新建包目录的一部分，外层工作根仍由宿主限定。每个部件使用原子文件写入，任何失败直接保留诊断。这个内部辅助入口不授予网络、进程或文件根以外的能力。

Return *[原子写入包内真实部件](fs.atomic_write(path=(`root` + "/" + `path`), text=`body`))*.
