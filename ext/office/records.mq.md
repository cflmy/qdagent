---
markup: occlusion
title: 办公源稿：版本记录与真实文件绑定
import:
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  re: lib/re.mq.md
  result: lib/result.mq.md
  artifacts: ../../pages/agent/artifacts.mq.md
---

结构快照由 Marqdo 写入并与实际文件绑定；它不是模型的工具协议。

## save

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| artifact | map | required | 刚登记的实际办公产物 |
| kind | text | required | docx 或 pptx |
| title | text | required | 可读题目 |
| sections | list | required | 与二进制完全相同的章节或页面 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | save 的实际结果，失败保留明确诊断 |

Use `artifact`, `kind`, `title`, `sections`。

源稿是后续局部修订的事实源，不是另一套模型动作协议。只在真实文件已生成、重新解包并登记后保存，标题、章节顺序与正文来自生成时的同一份值。私有快照、公开 Markdown 和二进制分别计算摘要，防止修改其中一份后仍沿用旧证据。

所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

快照的路径由新版本身份确定，不由模型提供。登记中的快照摘要来自已经写入的文件，读取时重新核对。这里不解释章节中的代码符号，也不读取网络或启动排版；以后增加图片、表格时必须同时升级结构快照与生成器，不能只改一份说明。写快照失败不宣称修订能力已经建立，旧办公文件仍保留。

The sidecar is written only for a newly generated artifact. Its hash is then recorded in the same owner-scoped manifest as the binary path. Later edits compare the current file bytes, the readable manuscript and this sidecar before creating another version. The caller cannot repair a mismatch by changing a title or selecting a similarly named file. A saved snapshot proves the association of these exact files; it does not certify the claims in their content. Old versions stay addressable, and a failed follow-up operation never changes which bytes the original identifier refers to.

We **id = access(`artifact`,"id")**.
We **snapshot = table.put(in=None,at="kind",value=`kind`)**.
We **snapshot = table.put(in=`snapshot`,at="title",value=`title`)**.
We **snapshot = table.put(in=`snapshot`,at="sections",value=`sections`)**.
We **snapshot = table.put(in=`snapshot`,at="sha256",value=access(`artifact`,"sha256"))**.
We **snapshot = table.put(in=`snapshot`,at="source_sha256",value=fs.file_hash(path=access(`artifact`,"source")))**.
We **path = ".agent/office/" + `id` + ".json"**.
We **_ = fs.make_dirs(path=".agent/office")**.
We **_ = fs.atomic_write(path=`path`,text=json.stringify(value=`snapshot`))**.
We **entry = table.put(in=`artifact`,at="manuscript",value=`path`)**.
We **entry = table.put(in=`entry`,at="manuscript_sha256",value=fs.file_hash(path=`path`))**.
We **next = table.empty_list()**.
We **entries = artifacts.list()**.
- [只更新本次版本的快照联系](for entries as item)
  1. access(`item`,"id") == `id`
    We **item = `entry`**.
  We **next = table.append(list=`next`,item=`item`)**.
We **_ = fs.atomic_write(path=".agent/artifacts.json",text=json.stringify(value=`next`))**.
Return *entry*.

## read

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 当前任务已登记的办公版本身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | read 的实际结果，失败保留明确诊断 |

Use `id`。

读取的是一份确定版本的源稿，不通过标题猜测文件，也不从任意上传内容反向伪造可编辑快照。旧版本尚无结构快照时明确提示重新生成；上传文件的正文读取另用 read.mq.md，它不会声称可以无损保留任意原始排版。

所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

先匹配当前任务的登记，再核对快照路径和三个真实摘要。二进制被修改、Markdown 被修改或快照被修改都会拒绝沿用；调用者应重新确认材料，而不是只改摘要字段。读取不会执行文件中的宏、链接或 Marqdo 表达式，也不会改写原版本。资料损坏时保留诊断与文件，不能用空章节列表替代失败。

快照是任务根中的私有编辑资料，不在普通工作区树展示。返回的记录只用于同一任务的可读检查和修订；其他会话的身份不会因为同名题目而匹配。后续生成仍重新执行格式与内容上限检查，快照存在不表示新的请求天然有效。

A snapshot is an editing convenience, not a second source of permissions. Selection starts with the existing manifest and an exact artifact identity. The derived private path must agree with that record, and all hashes must match current bytes. The returned sections can be passed to the ordinary revision functions, which validate the entire new manuscript before generating files. No part of this lookup evaluates text, imports a document as code or starts a conversion process. Legacy artifacts without a snapshot remain downloadable; they require an explicit read and new creation instead of pretending an exact rich-layout reconstruction has happened. This distinction preserves useful old files while keeping the revision guarantee honest.

1. not re.is_match(text=`id`,pattern="^[0-9a-fA-F-]{36}$")
  Return *result.error(code="office.identity",message="请使用实际办公版本身份",operation="read")*.
We **entries = artifacts.list()**.
- [选择真实登记并核对全部内容](for entries as entry)
  1. access(`entry`,"id") == `id`
    We **path = ".agent/office/" + `id` + ".json"**.
    1. json.get(value=`entry`,key="manuscript") != `path` or not fs.exists(path=`path`)
      Return *result.error(code="office.legacy_source",message="该版本没有结构源稿，请先读取原文并重新创建",operation="read")*.
    1. fs.file_hash(path=`path`) != access(`entry`,"manuscript_sha256") or fs.file_hash(path=access(`entry`,"path")) != access(`entry`,"sha256")
      Return *result.error(code="office.changed",message="办公文件或结构源稿已变化，旧版本不能直接修订",operation="read")*.
    We **snapshot = fs.read_json(path=`path`)**.
    1. fs.file_hash(path=access(`entry`,"source")) != access(`snapshot`,"source_sha256") or access(`snapshot`,"sha256") != access(`entry`,"sha256")
      Return *result.error(code="office.changed",message="正文与已登记版本不一致",operation="read")*.
    Return *result.ok(value=table.put(in=`snapshot`,at="artifact",value=`entry`))*.
Return *result.error(code="office.unknown",message="当前任务没有这个办公版本",operation="read")*.
