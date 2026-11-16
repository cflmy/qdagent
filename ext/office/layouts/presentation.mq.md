---
markup: occlusion
title: PPT 内置版式：每种布局都是可校验函数
import:
  checks: checks.mq.md
  table: lib/table.mq.md
---

本文件的函数直接代表实际布局。先调用合适函数构造内容，再把返回值放入 presentation.create 的 slides。不要把无效 Result 当作页面。

## cover

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 封面题目 2～30 字符，最多 1 行、每行 30 字符 |
| body | text | required | 封面副标题 4～80 字符，最多 2 行、每行 40 字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `body`。

封面用大字号题目与独立副标题区形成清楚的阅读起点。封面不是正文页，不塞章节内容。

本布局的字段预算：封面题目 2～30 字符，最多 1 行、每行 30 字符；封面副标题 4～80 字符，最多 2 行、每行 40 字符。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

We **checked = checks.text(value=`heading`,field="ppt.cover.heading",minimum=2,maximum=30,lines=1,line_width=30)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`body`,field="ppt.cover.body",minimum=4,maximum=80,lines=2,line_width=40)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **value = checks.record(layout="ppt.cover",heading=`heading`,body=`body`)**.
Return *value*.

## focus

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 页标题 2～32 字符，最多 1 行、每行 32 字符 |
| body | text | required | 重点句 1～49 字符，最多 2 行、每行 24 字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `body`。

重点句页用于一个简短结论或关键词，不冒充带来源的引文。很短的内容应选择这个大字号布局，不用空白正文框填充一页。

本布局的字段预算：页标题 2～32 字符，最多 1 行、每行 32 字符；重点句 1～49 字符，最多 2 行、每行 24 字符。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

We **checked = checks.text(value=`heading`,field="ppt.focus.heading",minimum=2,maximum=32,lines=1,line_width=32)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`body`,field="ppt.focus.body",minimum=1,maximum=49,lines=2,line_width=24)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **value = checks.record(layout="ppt.focus",heading=`heading`,body=`body`)**.
Return *value*.

## title_body

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 页标题 2～32 字符，最多 1 行、每行 32 字符 |
| body | text | required | 正文 12～185 字符，最多 6 行、每行 30 字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `body`。

标题正文页用于一个明确主题和简短说明，固定大标题、分隔线与正文区。正文至少十二个有效字符，避免把只含一个词的材料放入大面积正文框；关键词或短引文应选择更合适的版式。

本布局的字段预算：页标题 2～32 字符，最多 1 行、每行 32 字符；正文 12～185 字符，最多 6 行、每行 30 字符。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

We **checked = checks.text(value=`heading`,field="ppt.text.heading",minimum=2,maximum=32,lines=1,line_width=32)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`body`,field="ppt.text.body",minimum=12,maximum=185,lines=6,line_width=30)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **value = checks.record(layout="ppt.text",heading=`heading`,body=`body`)**.
Return *value*.

## two_columns

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 页标题 2～32 字符，最多 1 行、每行 32 字符 |
| left_heading | text | required | 左栏标题 2～14 字符，最多 1 行、每行 14 字符 |
| left | text | required | 左栏正文 12～101 字符，最多 6 行、每行 16 字符 |
| right_heading | text | required | 右栏标题 2～14 字符，最多 1 行、每行 14 字符 |
| right | text | required | 右栏正文 12～101 字符，最多 6 行、每行 16 字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `left_heading`, `left`, `right_heading`, `right`。

双栏页用于对比两项内容，两边各有独立标题和正文区，不能让一栏为空而假装完成对比。每栏独立校验，不能用另一栏的字数补足；渲染时保持两栏相同宽度、固定间距和一致字号。

本布局的字段预算：页标题 2～32 字符，最多 1 行、每行 32 字符；左栏标题 2～14 字符，最多 1 行、每行 14 字符；左栏正文 12～101 字符，最多 6 行、每行 16 字符；右栏标题 2～14 字符，最多 1 行、每行 14 字符；右栏正文 12～101 字符，最多 6 行、每行 16 字符。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

Each column has an independent width, line count and visible minimum. The total character ceiling includes line separators, so filling all six legal lines does not cause an off-by-one rejection. Combining fields into a body does not create another source of content: validation reconstructs the same body from the actual left and right fields. A partial edit which changes only that derived body is rejected before writing.

We **checked = checks.text(value=`heading`,field="ppt.columns.heading",minimum=2,maximum=32,lines=1,line_width=32)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`left_heading`,field="ppt.columns.left_heading",minimum=2,maximum=14,lines=1,line_width=14)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`left`,field="ppt.columns.left",minimum=12,maximum=101,lines=6,line_width=16)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`right_heading`,field="ppt.columns.right_heading",minimum=2,maximum=14,lines=1,line_width=14)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`right`,field="ppt.columns.right",minimum=12,maximum=101,lines=6,line_width=16)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **value = checks.record(layout="ppt.columns",heading=`heading`,body=(`left_heading` + "\n" + `left` + "\n" + `right_heading` + "\n" + `right`))**.
We **value = table.put(in=`value`,at="left_heading",value=`left_heading`)**.
We **value = table.put(in=`value`,at="left",value=`left`)**.
We **value = table.put(in=`value`,at="right_heading",value=`right_heading`)**.
We **value = table.put(in=`value`,at="right",value=`right`)**.
Return *value*.

## quotation

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 页标题 2～32 字符，最多 1 行、每行 32 字符 |
| quotation | text | required | 引文 10～68 字符，最多 3 行、每行 22 字符 |
| source | text | required | 来源或署名 2～40 字符，最多 1 行、每行 40 字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `quotation`, `source`。

引文页使用较大字号突出一段已经核对的原文，并单独保留来源。来源字段不能省略，文字预算和正文页不同；不能把一整篇文章塞进引文区，也不能由函数替模型编造出处。

本布局的字段预算：页标题 2～32 字符，最多 1 行、每行 32 字符；引文 10～68 字符，最多 3 行、每行 22 字符；来源或署名 2～40 字符，最多 1 行、每行 40 字符。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

We **checked = checks.text(value=`heading`,field="ppt.quote.heading",minimum=2,maximum=32,lines=1,line_width=32)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`quotation`,field="ppt.quote.quotation",minimum=10,maximum=68,lines=3,line_width=22)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`source`,field="ppt.quote.source",minimum=2,maximum=40,lines=1,line_width=40)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **value = checks.record(layout="ppt.quote",heading=`heading`,body=(`quotation` + "\n— " + `source`))**.
We **value = table.put(in=`value`,at="quotation",value=`quotation`)**.
We **value = table.put(in=`value`,at="source",value=`source`)**.
Return *value*.

## image_text

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 页标题 2～32 字符，最多 1 行、每行 32 字符 |
| body | text | required | 图片旁正文 12～84 字符，最多 5 行、每行 16 字符 |
| image | text | required | 当前任务 uploads 内的 PNG 路径 1～240 字符，最多 1 行、每行 240 字符；真实 PNG ≥640×360、单边≤4096、总像素≤1200万、比例0.4～2.5 |
| alt | text | required | 图片替代说明 4～80 字符，最多 2 行、每行 60 字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `body`, `image`, `alt`。

图文页左图右文。图片必须来自当前任务实际上传的 PNG，不能用网络地址、占位文件名或文本伪装图片。此函数先校验参数形态，生成器在创建任何目录前还会读取实际文件、完整解码、核对像素尺寸和纵横比，再复制到包内；不能由模型自报宽高。

本布局的字段预算：页标题 2～32 字符，最多 1 行、每行 32 字符；图片旁正文 12～84 字符，最多 5 行、每行 16 字符；当前任务 uploads 内的 PNG 路径 1～240 字符，最多 1 行、每行 240 字符；图片替代说明 4～80 字符，最多 2 行、每行 60 字符。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

We **checked = checks.text(value=`heading`,field="ppt.image.heading",minimum=2,maximum=32,lines=1,line_width=32)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`body`,field="ppt.image.body",minimum=12,maximum=84,lines=5,line_width=16)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`image`,field="ppt.image.image",minimum=1,maximum=240,lines=1,line_width=240)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`alt`,field="ppt.image.alt",minimum=4,maximum=80,lines=2,line_width=60)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **value = checks.record(layout="ppt.image",heading=`heading`,body=`body`)**.
We **value = table.put(in=`value`,at="image",value=`image`)**.
We **value = table.put(in=`value`,at="alt",value=`alt`)**.
Return *value*.
