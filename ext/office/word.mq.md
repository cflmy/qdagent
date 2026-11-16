---
markup: occlusion
title: Word 的创建与局部修订手册
import:
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

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格、图片和修订痕迹。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

Return *table.put(in=table.put(in=None,at="heading",value=`heading`),at="body",value=`body`)*.

## create

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| title | text | required | 实际文件题目 |
| chapters | list | required | 由 chapter 形成的一至二十项内容 |
| context | map | required | 可信执行器注入的当前任务根；不是模型参数 |
| render_pdf | bool | False | 是否同时生成真实 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | create 的实际结果，失败保留明确诊断 |

Use `title`, `chapters`, `context`, `render_pdf`=False。

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格、图片和修订痕迹。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

创建得到真正可编辑的 Word 文件、Markdown 源稿和受摘要保护的结构快照。先确认用户范围并完成内容核对，再选择格式。返回的身份用于后续 inspect 或局部修订；新文件不覆盖同名旧版本。

Return *[生成真实Word文件](office.create(kind="docx",title=`title`,sections=`chapters`,context=`context`,render_pdf=`render_pdf`))*.

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

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格、图片和修订痕迹。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

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

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格、图片和修订痕迹。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

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

每次只描述实际正文，不把“准备撰写”当作已经完成。章节按段落阅读，正文中的 Markdown 符号目前按文字保留，不承诺复杂表格、图片和修订痕迹。本手册的标题就是可直接调用的函数，参数和返回紧随标题。所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

修订前重新读取真实快照，并检查它属于 Word 格式。不能把 Word 身份交给 PPT 手册，或把一个上传路径冒充已生成版本。旧版本被修改时拒绝继续，新正文仍受原有长度与字符限制；删除最后一节也会明确失败。

We **read = office.inspect(id=`id`,context=`context`)**.
1. not access(`read`,"ok")
  Return *read*.
1. access(access(`read`,"value"),"kind") != "docx"
  Return *result.error(code="office.format",message="请使用对应文件格式的手册",operation="remove_chapter")*.
Return *[按实际位置生成修订版本](office.remove_section(id=`id`,index=`index`,context=`context`,render_pdf=`render_pdf`))*.
