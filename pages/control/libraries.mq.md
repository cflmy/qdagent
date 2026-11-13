---
markup: occlusion
title: 已有库的阅读和纯能力调用
import:
  call: call.mq.md
  plugins: plugins.mq.md
  fs: lib/fs.mq.md
  sys: lib/sys.mq.md
  re: lib/re.mq.md
  text: lib/text.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

智能体通过实际源码学习参数，已有能力形成登记后的工具，不靠过时摘要猜测。
此处不接受任意服务器路径或可执行文件；每个调用仍进入 Marqdo 自己的 CLI 契约边界。

## read_document

| 参数 | 类型 | 说明 |
|---|---|---|
| module | text | 英文标准库名、拓展名或 guide |
| context | any | 执行器注入的可信上下文，默认 None |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | Result，真实手册的有界片段 |

Use `module` and `context`=None。标准库直接阅读单文件，拓展先核对开关，再读自己的 index。
guide 对应实际开发手册。阅读源码不执行函数，也不让模块身份变成任意文件路径。
关闭拓展意味着不再向智能体提供其能力入口，固有标准库始终可读。

Use an English standard module identifier such as fs or table, an enabled extension identifier such as net, or guide for the callable development handbook. Identifiers are validated before forming a path. The returned text is bounded so a large manual cannot silently fill the entire model context. Reading a manual does not enable the extension, register an arbitrary shared library, or grant access to a different file root.

1. not re.is_match(text=`module`, pattern="^[a-z][a-z0-9_-]*$")
  Return *[模块不是路径](result.error(code="qdagent.module", message="无效模块身份", operation="read_document"))*.
We **principal = "local"**.
1. `context`
  We **principal = access(`context`,"owner")**.
We **path = "lib/" + `module` + ".mq.md"**.
1. `module` == "guide"
  We **path = "ext/root-skill/guides/library-development.mq.md"**.
2. not fs.exists(path=`path`)
  We **allowed = [阅读拓展也尊重开关](plugins.require(id=`module`, principal=`principal`))**.
  1. not access(`allowed`, "ok")
    Return *allowed*.
  We **path = access(access(`allowed`, "value"), "entry")**.
We **source = [读真实源码](fs.read_text(path=`path`))**.
Return *[手册也是工具观察](result.ok(value=re.find(text=`source`, pattern="(?s)^.{0,20000}")))*.

## invoke

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| module | text | required | 纯计算或数据模块 |
| function | text | required | 从手册读取的函数名 |
| arguments | any | None | 实际命名参数 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实计算结果或明确拒绝 |

Use `module`, `function` and `arguments`=None。只开放不需要文件、网络与进程权限的模块。
文件和网络使用各自登记工具；模型无法通过这个参数把目标变成 sys.exec 或插件加载。
子调用继续检查函数参数，不把返回错误的 JSON 包装成一份成功观察。

For example, a model can request a text transformation by naming text, its documented function and a JSON argument object. The wrapper chooses the installed standard source and preserves its actual result. Modules with operating-system effects are deliberately outside this pure-function entry; file work uses the dedicated workspace tools.

1. not re.is_match(text=`module`, pattern="^(math|table|text|json|hash|re|path|datetime|stats|time|uuid|encoding|bytes|csv|toml)$")
  Return *[模块不在纯库目录](result.error(code="qdagent.library_denied", message="文件、网络和插件须走登记工具", operation="invoke"))*.
We **raw = [唯一执行入口仍是 call](call.invoke(file=(sys.cwd() + "/lib/" + `module` + ".mq.md"), function=`function`, arguments=`arguments`, root=sys.cwd(), effects="time.read,random.read"))**.
1. text.starts_with(text=json.stringify(value=`raw`), prefix="{") and json.get(value=`raw`, key="ok") == False
  Return *raw*.
Return *[实际纯函数结果](result.ok(value=`raw`))*.
