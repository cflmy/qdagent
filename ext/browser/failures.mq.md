---
markup: occlusion
title: 失败来源的记录与有界重试
import:
  fs: lib/fs.mq.md
  hash: lib/hash.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
  observations: ext/root-skill/runtime/observations.mq.md
---

失败地址也是实际观察，但不算已阅读来源。每轮保留具体原因，避免重建上下文后继续反复请求同一个不可达网页。

## path

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前可信单元 |
| url | text | required | 实际请求地址 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 当前单元的失败记录路径 |

Use `context`, `url`。

地址只作为哈希输入，不直接成为文件路径。单元身份来自可信角色现场，记录不扫描其他任务或其他作者。这个路径只保存计数和诊断，不包含浏览凭据、身份 Cookie 或模型配置。工作区根仍由调用进程限制；同名文件没有更改根阶段或授权的能力。

Return *(".agent/browser-failures/" + access(`context`,"unit_id") + "-" + hash.sha256(text=`url`) + ".json")*.

## check

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前可信角色与运行身份 |
| url | text | required | 需要读取的地址 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 可继续尝试或已到达当前运行重试上限 |

Use `context`, `url`。

同一运行中最多对一个连续失败的地址进行两次真实请求。模型重复同一个调用不会产生无限网络开销，也不会改变内网访问防护。用户另一次明确继续会使用新的运行身份，因此环境恢复后仍能重新尝试。计数只约束实际网络重试，不批准引用，也不把旧失败说成这次网站响应。错误中保留原始原因供选择其他候选，而不是要求模型继续修复一段本来正确的调用语法。

达到上限只停止重复访问，不更改其他候选地址的可用性，也不清除已经成功取得的资料。


We **location = path(context=`context`,url=`url`)**.
1. fs.exists(path=`location`)
  We **record = fs.read_json(path=`location`)**.
  1. access(`record`,"run_id") == access(`context`,"run_id") and access(`record`,"attempts") >= 2
    Return *result.error(code="browser.retry_limit",message=("当前运行已两次无法读取此地址：" + `url` + "。请从搜索结果选择其他公开来源。上次原因：" + access(`record`,"message")),operation="browse")*.
Return *result.ok(value=True)*.

## remember

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前可信角色 |
| url | text | required | 实际失败地址 |
| error | map | required | 原生边界的真实错误 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已经保存的失败观察 |

Use `context`, `url`, `error`。

The observation records a failed attempt, never a successful source. Its identity is scoped to the current author's address, while the run identity determines whether the counter continues. A new user continuation can retry after a network change without deleting the previous diagnostic. The saved note is rebuilt into the next request even when the latest successful tool feedback is cleared. External pages and search snippets do not get to supply this note. The transport's actual error remains available for audit. A policy rejection stays a policy rejection; the model cannot request that private destinations be enabled. A timeout stays an unavailable reading; it does not justify inventing page contents. No failed attempt enters the list used to check document citations. The file is written atomically so an interrupted attempt cannot leave partial JSON that silently resets the budget.

错误原因、地址和尝试次数属于当前作者的必要修复材料，不给独立测试者查看。保存后下一轮可以选择另一个候选，不必反复提交同一地址。网站可能在稍后恢复，记录仍然只描述这次运行的观察，不宣称该网站永久不存在。

We **location = path(context=`context`,url=`url`)**.
We **attempts = 1**.
1. fs.exists(path=`location`)
  We **previous = fs.read_json(path=`location`)**.
  1. access(`previous`,"run_id") == access(`context`,"run_id")
    We **attempts = access(`previous`,"attempts") + 1**.
We **_ = fs.make_dirs(path=".agent/browser-failures")**.
We **identity = "browser-" + hash.sha256(text=`url`)**.
We **message = access(access(`error`,"error"),"message")**.

`record` =

| identity | kind | url | message | attempts | run_id |
|---|---|---|---|---|---|
| `identity` | "browser_failure" | `url` | `message` | `attempts` | `context`[^run_id] |

We **_ = fs.atomic_write(path=`location`,text=json.stringify(value=`record`))**.
Return *observations.save(context=`context`,record=`record`)*.
