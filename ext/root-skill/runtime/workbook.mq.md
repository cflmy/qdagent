---
markup: occlusion
title: 主方案中各个函数段的独立填写
import:
  core: ../state.mq.md
  fs: lib/fs.mq.md
  hash: lib/hash.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

主方案的 ## 函数就是并行单位。作者不取得整个文稿的写权限，只有固定段的提交入口。官方解析器定位段落，原生边界在锁内原子替换；事实源始终是 solution/index.mq.md。

## header

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 主文稿和隔离快照共用的固定导入 |

导入是可信工程约定，不接受模型替换。每个函数段使用同一套标准库，隔离试运行也携带同样的导入，因此测试和实际交付不会调用不同实现。导入变更应让所有受影响函数的摘要失效，其他函数段的正文修改则不影响本段。目录内没有额外工具注册器，公开函数本身就是能力。

独立快照只包含当前函数，导入和函数体共同决定其身份。主方案其他段落不会因为测试而被泄漏。


Return *"---\nmarkup: occlusion\ntitle: 求道可执行文稿\nimport:\n  math: lib/math.mq.md\n  table: lib/table.mq.md\n  text: lib/text.mq.md\n  json: lib/json.mq.md\n  fs: lib/fs.mq.md\n  re: lib/re.mq.md\n  hash: lib/hash.mq.md\n---\n\n"*.

## ensure

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信任务现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已绑定主文稿的根状态 |

Use `context`。

The approved plan is the immutable blueprint. Its working copy keeps exactly the same function identities, and starts with the same visible unconnected bodies. Creating the working document does not approve a new framework or complete a function. A separate generation binds a renewed framework even when its text happens to be identical. This prevents a previous implementation from silently becoming the implementation of a new approval. Initialization happens before parallel authors start; all later writes are section edits against the latest shared document. Legacy implementations are imported only when their recorded file bytes still match. A different canonical digest remains unverified rather than inheriting an old passing receipt. Independent specifications and user decisions are preserved. The operator can still inspect old files, but new edits target the shared workbook. Nothing in the host invents a responsibility or changes a dependency. Those remain the plan's declared boundaries.

旧任务的有效单元可以迁入对应函数，保持人工批准和独立测试。无法核对摘要的旧文件不会冒充成功。工作文稿从细化第一轮开始就可阅读，未完成段仍显示尚未接通，完成的段可以直接查看真实实现。每个单元只保存自己的函数名和段摘要，不用整文件版本互相干扰。

A shared file is not shared authority. The caller still receives exactly one assigned identifier. Installing the working document only establishes a stable place for those function bodies; tests remain frozen separately and the human confirmation still refers to the original blueprint. A missing or corrupt section is an error, not permission to invent a new one.

We **state = access(core.status(context=`context`),"value")**.
We **binding = json.get(value=`state`,key="workbook")**.
1. `binding` and json.get(value=`binding`,key="outline_sha256") == access(`state`,"outline_sha256") and fs.exists(path="solution/index.mq.md")
  Return *result.ok(value=`state`)*.

We **imports = header()**.
We **generation = json.get(value=`state`,key="framework_epoch")**.

`arguments` =

| header | preamble | outline_sha256 | generation | units |
|---|---|---|---|---|
| `imports` | "本工作文稿承接用户确认的主方案。各个函数段分别细化和验证；未接通的段如实保留，最后才连接统一入口。" | `state`[^outline_sha256] | `generation` | `state`[^units] |

We **created = core.native(context=`context`,operation="root_workbook_init",payload=`arguments`)**.
1. not access(`created`,"ok")
  Return *created*.
We **sections = access(access(`created`,"value"),"sections")**.
We **units = table.empty_list()**.
We **previous = access(`state`,"units")**.
- [只绑定框架中已经存在的函数](for previous as item)
  - [匹配当前函数的原生观察](for sections as section)
    1. access(`section`,"id") == access(`item`,"id")
      We **item = table.put(in=table.put(in=`item`,at="path",value="solution/index.mq.md"),at="function",value=access(`section`,"function"))**.
      1. json.get(value=`section`,key="migrated") == True
        1. access(`section`,"sha256") != json.get(value=`item`,key="sha256")
          We **item = table.put(in=`item`,at="status",value="written")**.
        We **item = table.put(in=table.put(in=`item`,at="sha256",value=access(`section`,"sha256")),at="fragment",value=access(`section`,"fragment"))**.
  We **units = table.append(list=`units`,item=`item`)**.
We **binding = table.put(in=table.put(in=None,at="path",value="solution/index.mq.md"),at="outline_sha256",value=access(`state`,"outline_sha256"))**.
Return *core.save(context=`context`,state=table.put(in=table.put(in=`state`,at="units",value=`units`),at="workbook",value=`binding`))*.

## read

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 绑定了当前函数身份的可信现场 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 当前函数段、独立源码与摘要 |

Use `context`。

读取的是主文稿中的真实段落，不是状态中的旧 fragment 缓存。函数范围由官方 AST 确定，因此 Markdown 围栏里的标题不会变成另一个函数。摘要只覆盖固定导入和这一个段，别的作者填写相邻段不会改变它；自己或导入发生变化则使已有验证失效。这个内部函数不出现在测试模型或实现模型的公开 API 中，模型也不能传入另一个函数身份或任意文件路径。读取失败会保留未完成，不回退到猜测的缓存内容。

Return *core.native(context=`context`,operation="root_section_read",payload=table.put(in=None,at="unit_id",value=access(`context`,"unit_id")))*.

## snapshot

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前函数的可信现场 |
| item | map | required | 保存了验证摘要的当前函数记录 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 只包含当前函数的试运行快照 |

Use `context`, `item`。

A snapshot is an execution material, not a second source of truth. It is reconstructed from the actual section and checked against the published section digest before any trial. The path includes the digest so concurrent functions never overwrite one another's trial input. No other implementation, planning conversation or private test enters this file. The trusted runner may execute it inside the existing CoW boundary; models do not receive the snapshot directory. A changed section is rejected rather than updating the expected digest. Keeping this distinction allows all authors to write one real document without giving an isolated test process access to the whole document. The final delivery can read the same canonical fragment and retain exactly what was tested.

快照只服务一次明确版本的验证，主文稿依然是唯一实现。正文材料按原有授权和摘要交接，其他函数不会因为同在一个文件就进入测试环境。文件保存成功也不代表案例通过，调用者仍必须实际执行独立案例并核对结果。

We **selected = read(context=`context`)**.
1. not access(`selected`,"ok")
  Return *selected*.
We **value = access(`selected`,"value")**.
1. access(`value`,"sha256") != access(`item`,"sha256")
  Return *result.error(code="root.section_changed",message="当前函数段已变化，必须重新发表并验证",operation="snapshot")*.
We **_ = fs.make_dirs(path=".agent/root-snapshots")**.
We **path = ".agent/root-snapshots/" + access(`item`,"id") + "-" + access(`value`,"sha256") + ".mq.md"**.
We **_ = fs.atomic_write(path=`path`,text=access(`value`,"source"))**.
Return *result.ok(value=table.put(in=`value`,at="path",value=`path`))*.
