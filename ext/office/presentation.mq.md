---
markup: occlusion
title: PPT 的创建与局部修订手册
import:
  layouts: layouts/presentation.mq.md
  office: index.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

从本文件开始了解 PPT 的实际操作。多文件入口为 index.mq.md，上传读取见 read.mq.md；本手册负责有结构源稿的创建和修订。

## slide

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 可读章节或内容页标题 |
| body | text | required | 完整正文，换行分隔段落或要点 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | slide 的实际结果，失败保留明确诊断 |

Use `heading`, `body`。

每次只描述实际正文，不把“准备撰写”当作已经完成。一个内容页只表达一个主题；正文十二至一百八十五字符、最多六行、每行最多三十字符，创建会添加封面，编辑位置不计算封面。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

Return *[使用有明确内容预算的正文页](layouts.title_body(heading=`heading`,body=`body`))*.

## create

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| title | text | required | 实际文件题目 |
| slides | list | required | 由 slide 形成的一至二十项内容 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| theme | text | "sage" | sage、paper、midnight、coral |
| group_id | text | "" | 同一批变体身份 |
| render_pdf | bool | False | 是否同时生成真实 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | create 的实际结果，失败保留明确诊断 |

Use `title`, `slides`, `context`, `render_pdf`=False, `theme`="sage", `group_id`=""。

每次只描述实际正文，不把“准备撰写”当作已经完成。一个内容页只表达一个主题；正文十二至一百八十五字符、最多六行、每行最多三十字符，创建会添加封面，编辑位置不计算封面。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

创建得到真正可编辑的 PPT 文件、Markdown 源稿和受摘要保护的结构快照。先确认用户范围并完成内容核对，再选择格式。返回的身份用于后续 inspect 或局部修订；新文件不覆盖同名旧版本。

Return *[生成真实PPT文件](office.create(kind="pptx",title=`title`,sections=`slides`,context=`context`,render_pdf=`render_pdf`,theme=`theme`,group_id=`group_id`))*.

## replace_slide

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 上次返回的实际办公版本 |
| index | number | required | 从零开始的内容位置 |
| heading | text | required | 完整新标题 |
| body | text | required | 完整新正文 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| render_pdf | bool | False | 是否同时生成新版本的 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | replace_slide 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `heading`, `body`, `context`, `render_pdf`=False。

每次只描述实际正文，不把“准备撰写”当作已经完成。一个内容页只表达一个主题；正文十二至一百八十五字符、最多六行、每行最多三十字符，创建会添加封面，编辑位置不计算封面。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

修订前重新读取真实快照，并检查它属于 PPT 格式。不能把 Word 身份交给 PPT 手册，或把一个上传路径冒充已生成版本。旧版本被修改时拒绝继续，新正文仍受原有长度与字符限制；删除最后一节也会明确失败。

We **read = office.inspect(id=`id`,context=`context`)**.
1. not access(`read`,"ok")
  Return *read*.
1. access(access(`read`,"value"),"kind") != "pptx"
  Return *result.error(code="office.format",message="请使用对应文件格式的手册",operation="replace_slide")*.
Return *[按实际位置生成修订版本](office.replace_section(id=`id`,index=`index`,heading=`heading`,body=`body`,context=`context`,render_pdf=`render_pdf`))*.

## insert_slide

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 上次返回的实际办公版本 |
| index | number | required | 从零开始的内容位置 |
| heading | text | required | 完整新标题 |
| body | text | required | 完整新正文 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| render_pdf | bool | False | 是否同时生成新版本的 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | insert_slide 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `heading`, `body`, `context`, `render_pdf`=False。

每次只描述实际正文，不把“准备撰写”当作已经完成。一个内容页只表达一个主题；正文十二至一百八十五字符、最多六行、每行最多三十字符，创建会添加封面，编辑位置不计算封面。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

修订前重新读取真实快照，并检查它属于 PPT 格式。不能把 Word 身份交给 PPT 手册，或把一个上传路径冒充已生成版本。旧版本被修改时拒绝继续，新正文仍受原有长度与字符限制；删除最后一节也会明确失败。

We **read = office.inspect(id=`id`,context=`context`)**.
1. not access(`read`,"ok")
  Return *read*.
1. access(access(`read`,"value"),"kind") != "pptx"
  Return *result.error(code="office.format",message="请使用对应文件格式的手册",operation="insert_slide")*.
Return *[按实际位置生成修订版本](office.insert_section(id=`id`,index=`index`,heading=`heading`,body=`body`,context=`context`,render_pdf=`render_pdf`))*.

## remove_slide

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 上次返回的实际办公版本 |
| index | number | required | 从零开始的内容位置 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| render_pdf | bool | False | 是否同时生成新版本的 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | remove_slide 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `context`, `render_pdf`=False。

每次只描述实际正文，不把“准备撰写”当作已经完成。一个内容页只表达一个主题；正文十二至一百八十五字符、最多六行、每行最多三十字符，创建会添加封面，编辑位置不计算封面。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

修订前重新读取真实快照，并检查它属于 PPT 格式。不能把 Word 身份交给 PPT 手册，或把一个上传路径冒充已生成版本。旧版本被修改时拒绝继续，新正文仍受原有长度与字符限制；删除最后一节也会明确失败。

We **read = office.inspect(id=`id`,context=`context`)**.
1. not access(`read`,"ok")
  Return *read*.
1. access(access(`read`,"value"),"kind") != "pptx"
  Return *result.error(code="office.format",message="请使用对应文件格式的手册",operation="remove_slide")*.
Return *[按实际位置生成修订版本](office.remove_section(id=`id`,index=`index`,context=`context`,render_pdf=`render_pdf`))*.

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

Return *[复用实际布局函数的校验](layouts.cover(heading=`heading`,body=`body`))*.

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

Return *[复用实际布局函数的校验](layouts.focus(heading=`heading`,body=`body`))*.

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

Return *[复用实际布局函数的校验](layouts.title_body(heading=`heading`,body=`body`))*.

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

Return *[复用实际布局函数的校验](layouts.two_columns(heading=`heading`,left_heading=`left_heading`,left=`left`,right_heading=`right_heading`,right=`right`))*.

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

Return *[复用实际布局函数的校验](layouts.quotation(heading=`heading`,quotation=`quotation`,source=`source`))*.

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

Return *[复用实际布局函数的校验](layouts.image_text(heading=`heading`,body=`body`,image=`image`,alt=`alt`))*.
