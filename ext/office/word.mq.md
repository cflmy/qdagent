---
markup: occlusion
title: Word 的创建与局部修订手册
import:
  layouts: layouts/word.mq.md
  office: index.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

从本文件开始了解 Word 的实际操作。多文件入口为 index.mq.md，上传读取见 read.mq.md；本手册负责有结构源稿的创建和修订。

## chapter

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| heading | text | required | 可读章节或内容页标题 |
| body | text | required | 完整正文，换行分隔段落或要点 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | chapter 的实际结果，失败保留明确诊断 |

Use `heading`, `body`。

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格和修订痕迹；PNG 图文请使用 illustrated 布局。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

Return *table.put(in=table.put(in=None,at="heading",value=`heading`),at="body",value=`body`)*.

## create

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| title | text | required | 实际文件题目 |
| chapters | list | required | 由 chapter 形成的一至二十项内容 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| theme | text | "sage" | sage、paper、midnight、coral |
| group_id | text | "" | 同一批变体身份 |
| render_pdf | bool | False | 是否同时生成真实 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | create 的实际结果，失败保留明确诊断 |

Use `title`, `chapters`, `context`, `render_pdf`=False, `theme`="sage", `group_id`=""。

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格和修订痕迹；PNG 图文请使用 illustrated 布局。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

创建得到真正可编辑的 Word 文件、Markdown 源稿和受摘要保护的结构快照。先确认用户范围并完成内容核对，再选择格式。返回的身份用于后续 inspect 或局部修订；新文件不覆盖同名旧版本。

Return *[生成真实Word文件](office.create(kind="docx",title=`title`,sections=`chapters`,context=`context`,render_pdf=`render_pdf`,theme=`theme`,group_id=`group_id`))*.

## replace_chapter

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
| result | map | replace_chapter 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `heading`, `body`, `context`, `render_pdf`=False。

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格和修订痕迹；PNG 图文请使用 illustrated 布局。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

修订前重新读取真实快照，并检查它属于 Word 格式。不能把 Word 身份交给 PPT 手册，或把一个上传路径冒充已生成版本。旧版本被修改时拒绝继续，新正文仍受原有长度与字符限制；删除最后一节也会明确失败。

We **read = office.inspect(id=`id`,context=`context`)**.
1. not access(`read`,"ok")
  Return *read*.
1. access(access(`read`,"value"),"kind") != "docx"
  Return *result.error(code="office.format",message="请使用对应文件格式的手册",operation="replace_chapter")*.
Return *[按实际位置生成修订版本](office.replace_section(id=`id`,index=`index`,heading=`heading`,body=`body`,context=`context`,render_pdf=`render_pdf`))*.

## insert_chapter

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
| result | map | insert_chapter 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `heading`, `body`, `context`, `render_pdf`=False。

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格和修订痕迹；PNG 图文请使用 illustrated 布局。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

修订前重新读取真实快照，并检查它属于 Word 格式。不能把 Word 身份交给 PPT 手册，或把一个上传路径冒充已生成版本。旧版本被修改时拒绝继续，新正文仍受原有长度与字符限制；删除最后一节也会明确失败。

We **read = office.inspect(id=`id`,context=`context`)**.
1. not access(`read`,"ok")
  Return *read*.
1. access(access(`read`,"value"),"kind") != "docx"
  Return *result.error(code="office.format",message="请使用对应文件格式的手册",operation="insert_chapter")*.
Return *[按实际位置生成修订版本](office.insert_section(id=`id`,index=`index`,heading=`heading`,body=`body`,context=`context`,render_pdf=`render_pdf`))*.

## remove_chapter

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 上次返回的实际办公版本 |
| index | number | required | 从零开始的内容位置 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| render_pdf | bool | False | 是否同时生成新版本的 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | remove_chapter 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `context`, `render_pdf`=False。

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格和修订痕迹；PNG 图文请使用 illustrated 布局。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

修订前重新读取真实快照，并检查它属于 Word 格式。不能把 Word 身份交给 PPT 手册，或把一个上传路径冒充已生成版本。旧版本被修改时拒绝继续，新正文仍受原有长度与字符限制；删除最后一节也会明确失败。

We **read = office.inspect(id=`id`,context=`context`)**.
1. not access(`read`,"ok")
  Return *read*.
1. access(access(`read`,"value"),"kind") != "docx"
  Return *result.error(code="office.format",message="请使用对应文件格式的手册",operation="remove_chapter")*.
Return *[按实际位置生成修订版本](office.remove_section(id=`id`,index=`index`,context=`context`,render_pdf=`render_pdf`))*.

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

Return *[复用实际布局函数的校验](layouts.report_chapter(heading=`heading`,body=`body`))*.

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

Return *[复用实际布局函数的校验](layouts.notice(heading=`heading`,body=`body`))*.

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

Return *[复用实际布局函数的校验](layouts.illustrated(heading=`heading`,body=`body`,image=`image`,caption=`caption`))*.

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

Return *[使用明确的短结论布局](layouts.focus(heading=`heading`,body=`body`))*.
