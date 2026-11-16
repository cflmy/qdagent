---
markup: occlusion
title: Word 内置内容块：报告、提示与图文
import:
  checks: checks.mq.md
  table: lib/table.mq.md
---

内容块对应真实 Word 段落样式与图片布局；参数通过之后仍需整份生成校验。

## report_chapter

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 章节标题 2～48 字符，最多 1 行、每行 48 字符 |
| body | text | required | 章节正文 40～10000 字符，最多 50 行、每行 10000 字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `body`。

报告章节用于连贯叙述，标题采用正文层级样式，段落可以自然跨页。它不是强行塞进一张纸的海报；保留正常分页、孤行控制和可编辑段落，不以固定页数作虚假保证。

本布局的字段预算：章节标题 2～48 字符，最多 1 行、每行 48 字符；章节正文 40～10000 字符，最多 50 行、每行 10000 字符。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

We **checked = checks.text(value=`heading`,field="word.report.heading",minimum=2,maximum=48,lines=1,line_width=48)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`body`,field="word.report.body",minimum=40,maximum=10000,lines=50,line_width=10000,allow_tabs=True)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **value = checks.record(layout="word.report",heading=`heading`,body=`body`)**.
Return *value*.

## notice

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 提示标题 2～32 字符，最多 1 行、每行 32 字符 |
| body | text | required | 提示内容 20～600 字符，最多 6 行、每行 100 字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `body`。

提示块用有底色与边线的文字突出结论、注意事项或限制。它有比普通报告更小的预算，至少二十字以便交代清楚对象与条件，不能把正文长篇全部涂成提示块。

本布局的字段预算：提示标题 2～32 字符，最多 1 行、每行 32 字符；提示内容 20～600 字符，最多 6 行、每行 100 字符。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

We **checked = checks.text(value=`heading`,field="word.notice.heading",minimum=2,maximum=32,lines=1,line_width=32)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`body`,field="word.notice.body",minimum=20,maximum=600,lines=6,line_width=100)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **value = checks.record(layout="word.notice",heading=`heading`,body=`body`)**.
Return *value*.

## illustrated

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 章节标题 2～48 字符，最多 1 行、每行 48 字符 |
| body | text | required | 图片说明正文 20～1200 字符，最多 12 行、每行 120 字符 |
| image | text | required | 当前任务 uploads 内的 PNG 路径 1～240 字符，最多 1 行、每行 240 字符；真实 PNG ≥640×360、单边≤4096、总像素≤1200万、比例0.4～2.5 |
| caption | text | required | 图题与替代说明 4～100 字符，最多 2 行、每行 60 字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `body`, `image`, `caption`。

图文章节先说明图片的作用，再使用保持比例的图片与独立图题。图片和图题保持关联，不能用缺图、空说明或拉伸后的图形占位。真实 PNG 的读取、像素检查与摘要绑定在整份生成预检中完成，文字与图片均通过后才创建版本目录。

本布局的字段预算：章节标题 2～48 字符，最多 1 行、每行 48 字符；图片说明正文 20～1200 字符，最多 12 行、每行 120 字符；当前任务 uploads 内的 PNG 路径 1～240 字符，最多 1 行、每行 240 字符；图题与替代说明 4～100 字符，最多 2 行、每行 60 字符。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

We **checked = checks.text(value=`heading`,field="word.image.heading",minimum=2,maximum=48,lines=1,line_width=48)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`body`,field="word.image.body",minimum=20,maximum=1200,lines=12,line_width=120)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`image`,field="word.image.image",minimum=1,maximum=240,lines=1,line_width=240)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`caption`,field="word.image.caption",minimum=4,maximum=100,lines=2,line_width=60)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **value = checks.record(layout="word.image",heading=`heading`,body=`body`)**.
We **value = table.put(in=`value`,at="image",value=`image`)**.
We **value = table.put(in=`value`,at="caption",value=`caption`)**.
Return *value*.

## focus

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 短说明标题，2～32字符 |
| body | text | required | 关键词或短结论，1～49字符，最多2行、每行24字符 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `heading`, `body`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

Word 短结论块使用居中、较大字号和强调色，专门容纳关键词与用户明确要求的简短原文。它不要求模型为了凑够报告字数而添加无意义内容，也不把几字材料放进普通长篇正文版式。

这是明确的短内容布局，仍校验标题、长度、行数和控制字符。很长的内容应选择报告或提示块，不能让短结论自己缩字或跨成几页。

We **checked = checks.text(value=`heading`,field="word.focus.heading",minimum=2,maximum=32,lines=1,line_width=32)**.
1. not access(`checked`,"ok")
  Return *checked*.
We **checked = checks.text(value=`body`,field="word.focus.body",minimum=1,maximum=49,lines=2,line_width=24)**.
1. not access(`checked`,"ok")
  Return *checked*.
Return *checks.record(layout="word.focus",heading=`heading`,body=`body`)*.
