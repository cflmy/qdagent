---
markup: occlusion
title: 整份文件统一执行布局预检
import:
  ppt: presentation.mq.md
  word: word.mq.md
  checks: checks.mq.md
  images: images.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

所有写入共用一个预检；版式构造函数就是参数与内容约束的唯一来源。

## ppt

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| section | map | required | 当前记录的实际布局字段 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `section`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

这里从实际布局记录重新调用对应函数，没有第二份长度或字段 Schema。手工拼出的记录也要经过同一字段预算；布局名称必须属于当前格式，不能把 Word 提示块塞入 PPT，也不能将未知名称当成旧版正文。每种布局自己描述参数，读取不到必填值会保留具体诊断。

版式版本由生成器决定，外部数据不能通过换版本号打开未实现功能。正文有时由双栏或引文的多个字段确定性组合，后续还会核对原记录中的正文是否与组合一致；这样通用编辑不会悄悄只修改源稿却让实际页面保留旧内容。

The concrete constructors remain the source of all field rules. This function only supplies values from the record to the correct ordinary function. There is no independent schema for a host or model to keep in sync. Cover titles, ordinary prose, short emphasis, side-by-side comparison, quotations and pictures each have their own documented constraints. Choosing a different name cannot preserve an incompatible version or bypass required fields. The returned canonical body is derived by the same function used at construction time. Later validation compares that body with the recorded manuscript, preventing a partial edit from changing only one representation of the content.

We **layout = json.get(value=`section`,key="layout")**.
1. `layout` == "ppt.cover"
  Return *ppt.cover(heading=json.get(value=`section`,key="heading"),body=json.get(value=`section`,key="body"))*.
2. `layout` == "ppt.focus"
  Return *ppt.focus(heading=json.get(value=`section`,key="heading"),body=json.get(value=`section`,key="body"))*.
2. `layout` == "ppt.text"
  Return *ppt.title_body(heading=json.get(value=`section`,key="heading"),body=json.get(value=`section`,key="body"))*.
2. `layout` == "ppt.columns"
  Return *ppt.two_columns(heading=json.get(value=`section`,key="heading"),left_heading=json.get(value=`section`,key="left_heading"),left=json.get(value=`section`,key="left"),right_heading=json.get(value=`section`,key="right_heading"),right=json.get(value=`section`,key="right"))*.
2. `layout` == "ppt.quote"
  Return *ppt.quotation(heading=json.get(value=`section`,key="heading"),quotation=json.get(value=`section`,key="quotation"),source=json.get(value=`section`,key="source"))*.
2. `layout` == "ppt.image"
  Return *ppt.image_text(heading=json.get(value=`section`,key="heading"),body=json.get(value=`section`,key="body"),image=json.get(value=`section`,key="image"),alt=json.get(value=`section`,key="alt"))*.
Return *result.error(code="office.layout_unknown",message="该格式没有这个已接通布局，请阅读对应布局函数",operation="layout")*.

## word

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| section | map | required | 当前记录的实际布局字段 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `section`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

这里从实际布局记录重新调用对应函数，没有第二份长度或字段 Schema。手工拼出的记录也要经过同一字段预算；布局名称必须属于当前格式，不能把 Word 提示块塞入 PPT，也不能将未知名称当成旧版正文。每种布局自己描述参数，读取不到必填值会保留具体诊断。

版式版本由生成器决定，外部数据不能通过换版本号打开未实现功能。正文有时由双栏或引文的多个字段确定性组合，后续还会核对原记录中的正文是否与组合一致；这样通用编辑不会悄悄只修改源稿却让实际页面保留旧内容。

Short emphasis, shaded notices, flowing reports and verified illustrations are separate ordinary functions. They share safe XML text handling but do not share a single arbitrary minimum length. Changing one style does not grant its budget to another. A plain Word record is classified into one of these real functions before writing, so compatibility cannot bypass control-character or content checks.

We **layout = json.get(value=`section`,key="layout")**.
1. `layout` == "word.focus"
  Return *word.focus(heading=json.get(value=`section`,key="heading"),body=json.get(value=`section`,key="body"))*.
2. `layout` == "word.report"
  Return *word.report_chapter(heading=json.get(value=`section`,key="heading"),body=json.get(value=`section`,key="body"))*.
2. `layout` == "word.notice"
  Return *word.notice(heading=json.get(value=`section`,key="heading"),body=json.get(value=`section`,key="body"))*.
2. `layout` == "word.image"
  Return *word.illustrated(heading=json.get(value=`section`,key="heading"),body=json.get(value=`section`,key="body"),image=json.get(value=`section`,key="image"),caption=json.get(value=`section`,key="caption"))*.
Return *result.error(code="office.layout_unknown",message="该格式没有这个已接通布局，请阅读对应布局函数",operation="layout")*.

## legacy

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| kind | text | required | docx 或 pptx |
| section | map | required | 没有布局字段的既有普通章节 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `kind`, `section`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

已有普通章节保持兼容，但不被宣传为新布局的审美保证。它只接受原先的标题与正文预算，不能夹带图片字段然后静默忽略。需要新的多栏、引文或图文能力，应明确调用相应布局函数；兼容入口不构成绕过新布局预算的别名。这个分支只读取旧结构，不改写旧文件，也不修改当前正文。

Ordinary Word paragraphs retain their historical flow behavior. An untyped PPT record is interpreted through the actual title-body constructor and receives its current limits; it cannot use the former larger text allowance as a bypass. Specialized content must declare a specialized layout.

We **heading = json.get(value=`section`,key="heading")** and **body = json.get(value=`section`,key="body")**.
1. json.get(value=`section`,key="image") != None or json.get(value=`section`,key="left") != None or json.get(value=`section`,key="quotation") != None
  Return *result.error(code="office.layout_required",message="专用字段必须选择明确布局，不能作为普通正文忽略",operation="layout")*.
1. `kind` == "pptx"
  Return *ppt.title_body(heading=`heading`,body=`body`)*.
We **checked = checks.text(value=`body`,field="word.body",minimum=1,maximum=10000,lines=50,line_width=10000,allow_tabs=True)**.
1. not access(`checked`,"ok")
  Return *checked*.
1. checks.effective(value=`body`) < 20
  Return *word.focus(heading=`heading`,body=`body`)*.
2. checks.effective(value=`body`) < 40
  Return *word.notice(heading=`heading`,body=`body`)*.
Return *word.report_chapter(heading=`heading`,body=`body`)*.

## rebuild

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| kind | text | required | 实际文件格式 |
| section | map | required | 待写入的一个章节或页面 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `kind`, `section`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

记录若缺少布局则进入明确的兼容入口；一旦声明布局，就不能退回兼容入口逃过新规则。源稿中的版本、派生正文和原图摘要都会核对。图片的实际读取仍发生在这里，任何一个字段失败都直接返回，外层不会先生成前几页再报告后面缺图。

这一步不创建目录、不写源稿、不打包。有效结果是当前函数重新构造的规范记录，附带真实图片尺寸与摘要；后续渲染器只能消费已经核对的记录，不再自己决定文字上限或接受外部 HTML。

A record read from a snapshot is still checked against the current implementation. Its old image digest does not authorize a different upload with the same path. Reconstructing the fields also detects edits which changed a derived body but left columns or quotation fields untouched. Such failures leave the old version intact and identify the repair: build a complete new layout record with the real constructor. No state is marked complete and no output directory is allocated by this operation.

1. json.get(value=`section`,key="ok") == False
  Return *section*.
We **layout = json.get(value=`section`,key="layout")**.
1. `layout` == None
  Return *legacy(kind=`kind`,section=`section`)*.
1. json.get(value=`section`,key="layout_version") != 1
  Return *result.error(code="office.layout_version",message="不支持该布局版本，请重新调用实际布局函数",operation="layout")*.
We **value = None**.
1. `kind` == "pptx"
  We **value = ppt(section=`section`)**.
2. else
  We **value = word(section=`section`)**.
1. json.get(value=`value`,key="ok") == False
  Return *value*.
1. json.get(value=`section`,key="body") != access(`value`,"body")
  Return *result.error(code="office.layout_derived",message="派生正文与布局字段不同，请用布局函数更新完整记录",operation="layout")*.
1. json.get(value=`value`,key="image") != None
  We **read = images.inspect(path=access(`value`,"image"))**.
  1. not access(`read`,"ok")
    Return *read*.
  We **image = access(`read`,"value")**.
  We **old = json.get(value=`section`,key="image_info")**.
  1. `old` != None and access(`old`,"sha256") != access(`image`,"sha256")
    Return *result.error(code="office.image_changed",message="源图已改变，旧图文版式不能直接沿用，请明确创建新的布局记录",operation="layout")*.
  We **value = table.put(in=`value`,at="image_info",value=`image`)**.
Return *value*.

## preflight

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| kind | text | required | 实际文件格式 |
| title | text | required | 整份文件标题 |
| sections | list | required | 全部章节或页面 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `kind`, `title`, `sections`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

这一函数是所有创建、修订和根流程交付都必须经过的统一入口。先核对整份内容、所有版式和全部图片，再返回已经规范化的列表；直到这个结果成功才分配版本目录。失败时不会生成部分 Office、源稿或交付登记。

图片以实际解码后的字节数累加，最多六 MiB，为固定八 MiB 包预算留出 XML 与关系文件余量。同一个图重复使用也按实际包内复制数量计费，不能通过引用相同路径绕过总量限制。内容不可用时应明确调整请求，不扩大所有资源上限。

The normalized list is produced only after every item succeeds. Its image total counts copies which will actually be embedded, including repeat references. The title is checked against the cover layout before the cover is written. Validation errors are preserved, rather than replaced by a later successful item. This ordering is shared by direct creation, structured replacement and root delivery.

1. `kind` != "docx" and `kind` != "pptx"
  Return *result.error(code="office.kind",message="只支持 docx 或 pptx",operation="preflight")*.
We **checked = checks.text(value=`title`,field="document.title",minimum=1,maximum=100,lines=1,line_width=100)**.
1. not access(`checked`,"ok")
  Return *checked*.
1. len(`sections`) < 1 or len(`sections`) > 20
  Return *result.error(code="office.input",message="需要一至二十个实际内容块",operation="preflight")*.
1. `kind` == "pptx"
  We **cover = ppt.cover(heading=`title`,body="求道 · 可编辑演示文稿")**.
  1. json.get(value=`cover`,key="ok") == False
    Return *cover*.
We **normalized = table.empty_list()** and **image_bytes = 0**.
- [全部有效之前不创建任何输出目录](for sections as section)
  We **value = rebuild(kind=`kind`,section=`section`)**.
  1. json.get(value=`value`,key="ok") == False
    Return *value*.
  We **image = json.get(value=`value`,key="image_info")**.
  1. `image` != None
    We **image_bytes = `image_bytes` + access(`image`,"bytes")**.
  1. `image_bytes` > 6291456
    Return *result.error(code="office.images_large",message="本次全部图片最多六 MiB，请缩减或分批交付",operation="preflight")*.
  We **normalized = table.append(list=`normalized`,item=`value`)**.
Return *result.ok(value=`normalized`)*.
