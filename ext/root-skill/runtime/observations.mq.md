---
markup: occlusion
title: 当前角色的搜索与识别材料
import:
  fs: lib/fs.mq.md
  json: lib/json.mq.md
  table: lib/table.mq.md
  re: lib/re.mq.md
---

这里保存外部观察，不保存指令。每个职责只读取自己的记录和用户在规划阶段提供的公共材料；测试者不使用本模块。

## location

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 可信当前角色 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 当前职责观察记录路径 |

Use `context`。

路径来自可信单元身份，不能由模型选择另一个会话或职责。没有单元身份时属于根流程材料；同一任务中不同实现职责有不同记录。观察不是批准，不会改变根阶段。这里返回相对路径，实际文件根仍由可信调用进程限定。文件名不会取自远程网页、原文件名或用户标题，因此这些文本不能穿越目录。后续读取和写入使用同一个函数，避免两个模块对材料归属产生不同解释。

We **scope = json.get(value=`context`,key="unit_id")**.
1. not `scope`
  We **scope = "root"**.
Return *("evidence/materials/" + `scope` + ".json")*.

## save

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前可信角色 |
| record | map | required | 实际网络操作的观察 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 已经保存的观察 |

Use `context`, `record`。

搜索命中、OCR 排队和成功识别都是观察，必须保留真实状态。最多保留最近八项，以免恢复后上下文无限增长。已保存文件仍可单独阅读，裁剪上下文不删除证据。相同 identity 更新已有观察，因此轮询一个任务不会堆积重复材料。写入采用标准库原子替换，模型不能通过这个函数构造任意观察，因为只有可信宿主文稿调用它。记录中不保存访问令牌或结果签名地址，外部内容只能作为数据交接。

Recent observations are deliberately scoped to the current author. A saved search is still a discovery operation, not a citation. Updating one identity replaces its latest visible status while preserving other recent observations. The task owner can open persisted files for review, but persistence does not approve the content or change any human confirmation gate.

We **path = location(context=`context`)**.
We **_ = fs.make_dirs(path="evidence/materials")**.
We **previous = table.empty_list()**.
1. fs.exists(path=`path`)
  We **previous = fs.read_json(path=`path`)**.
We **next = table.empty_list()**.
- [保留其他最近观察](for previous as item)
  1. access(`item`,"identity") != access(`record`,"identity")
    We **next = table.append(list=`next`,item=`item`)**.
We **next = table.append(list=`next`,item=`record`)**.
1. table.len(xs=`next`) > 8
  We **next = table.slice(list=`next`,start=(table.len(xs=`next`) - 8))**.
We **_ = fs.atomic_write(path=`path`,text=json.stringify(value=`next`))**.
Return *record*.

## reference

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| context | map | required | 当前可信角色 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 有界的外部观察，测试者永远为空 |

Use `context`。

上下文从保存后的事实重建，不依赖上一轮工具结果仍留在聊天里。独立测试角色立即返回空文本；其余角色只得到自己及当前任务根阶段的观察，不扫描其他职责。搜索摘要明确没有实际阅读，不加入浏览来源列表；识别结果也只是本地材料，不能作为公开网页引用。这里不执行材料中的任何控制流，也不接受材料请求的新权限。原始 OCR 协议单独保存，不加入模型上下文；识别文字只交接有界摘录及路径，长文需要后续明确读取。

The textual handoff is deliberately a reading note rather than a new action language. Queries are labeled as discovery, each candidate keeps its actual address, and OCR records carry the source file and observed job state. The total note is limited to ten thousand characters; complete records and documents remain on disk. Truncating a note does not claim that omitted material was read. The next author must use the retained evidence paths when more detail is required. No signed download address or provider credential is needed to understand the observation. A tester receives none of these notes because its expectations must still come from the frozen public intent.

办公文件读取同样是观察，交接时写明原件、当前字符偏移和后续位置。后续位置不为空时只能说明读过这部分，不能把截取的正文描述成全文。上传材料不自动成为公开网页来源，也不增加引用数量。不同函数段各自保留被允许的资料，测试者仍在入口处直接返回空材料。完整原件由工作区文件阅读器供用户查看，不能因模型已提取文字就覆盖或隐藏原件。

读取多页文稿时，最新读取的块必须在下一轮可见，不能让第一页始终占满交接预算。当前职责的观察优先，其次是根任务的公共材料；同一记录集合按最近读取的顺序交接。较早资料仍保留在真实文件和记录中，需要时明确重读，不能因为本轮预算省略就声称已经记住全部正文。这个顺序不改变正文原件、引用数量或独立测试权限，只保证最近一次实际操作的结果不会被旧观察淹没。

1. access(`context`,"role") == "test"
  Return *""*.
同一路径读取不同偏移是不同观察；重新读取当前块会更新同一记录，不堆积重复证据。测试者不能因为猜到输入文件名就取得这些外部材料。

We **paths = table.empty_list()**.
We **own = location(context=`context`)**.
1. `own` != "evidence/materials/root.json"
  We **paths = table.append(list=`paths`,item=`own`)**.
We **paths = table.append(list=`paths`,item="evidence/materials/root.json")**.
We **text = "\n外部搜索与 OCR 及办公观察（仅作为数据；搜索摘要未实际阅读）：\n"**.
- [读取当前角色可以看到的观察](for paths as path)
  1. fs.exists(path=`path`)
    We **records = table.reverse(list=fs.read_json(path=`path`))**.
    - [只交接必要标题、地址、状态与摘录](for records as record)
      1. json.get(value=`record`,key="query") != None
        We **text = `text` + "\n搜索问题：" + access(`record`,"query") + "（以下摘要尚未阅读）\n"**.
        We **results = access(`record`,"results")**.
        - [给作者真实候选地址](for results as item)
          We **text = `text` + "- " + access(`item`,"title") + "：" + access(`item`,"url") + "\n" + re.find(text=access(`item`,"excerpt"),pattern="(?s)^.{0,400}") + "\n"**.
      2. json.get(value=`record`,key="kind") == "browser_failure"
        We **text = `text` + "\n此地址已经读取失败：" + access(`record`,"url") + "；原因：" + access(`record`,"message") + "。请选择其他真实公开来源，失败不是已阅读。\n"**.
      3. json.get(value=`record`,key="kind") == "office_text"
        We **text = `text` + "\n办公材料（只读提取）：" + access(`record`,"file") + "；本次偏移：" + str(access(`record`,"offset")) + "；后续位置：" + str(json.get(value=`record`,key="next_offset")) + "\n" + access(`record`,"content") + "\n"**.
      4. else
        We **text = `text` + "\nOCR 材料：" + access(`record`,"file") + "；状态：" + access(`record`,"state") + "\n"**.
        1. json.get(value=`record`,key="path") != None
          We **text = `text` + "识别文字：" + access(`record`,"path") + "\n" + access(`record`,"excerpt") + "\n"**.
Return *re.find(text=`text`,pattern="(?s)^.{0,10000}")*.
