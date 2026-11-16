---
markup: occlusion
title: 按章节与页面生成修订版本
import:
  records: records.mq.md
  package: package.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

编辑按章节或幻灯片进行；原版永不覆盖。所有业务顺序与限制在本文件可读。

## change

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | text | required | 实际旧版本身份 |
| index | number | required | 从零开始的位置 |
| heading | text | required | 替换或新增标题，删除时为空 |
| body | text | required | 替换或新增正文，删除时为空 |
| action | text | required | 可信入口固定为 replace、insert 或 remove |
| templates | map | required | 入口读取的固定声明模板 |
| replacement | any | None | 由布局函数建立的完整新记录，普通文字编辑时留空 |
| render_pdf | bool | False | 是否另生成实际 PDF |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | change 的实际结果，失败保留明确诊断 |

Use `id`, `index`, `heading`, `body`, `action`, `templates`, `render_pdf`=False, `replacement`=None。

本函数是受限任务根内的内部组合，不是中央工具分派器。调用者使用明确的替换、插入或删除函数，模型不传 action。修订前先核对实际源稿与二进制，指定的位置从零开始；插入允许末尾，删除不能使整份文稿为空。无效位置与内容在新版本写入前拒绝，其他章节保持原顺序与正文。

所有路径都来自当前任务的真实登记，显示标题不作为文件身份。操作成功只证明文件事实，不证明正文中的事实正确，也不代替用户最终验收。原版本保持可读，新版本使用新身份；失败保留实际原因，不用一个漂亮的文件名冒充产物。

修订不会直接修改压缩包里的未知 XML，也不从上传文件继承宏、外部关系、嵌入对象或不可信模板。新版本由固定模板重新生成，仍是可编辑 DOCX 或 PPTX，保留新的 Markdown 和结构快照。成功后可以继续对新身份修订，旧身份仍能下载和检查。PDF 仅由新生成的包转换，不把这个函数变成任意上传文件的排版执行器。

布局字段必须随原章节一起保留。普通正文可以直接替换，但双栏或引文的派生内容不能靠单独改 body 更新，应使用完整布局替换入口；这样源稿与实际页面不会出现两套不同正文。

We **read = records.read(id=`id`)**.
1. not access(`read`,"ok")
  Return *read*.
We **old = access(`read`,"value")**.
We **sections = access(`old`,"sections")**.
We **size = table.len(xs=`sections`)**.
1. `index` < 0 or `index` > `size` or (`action` != "insert" and `index` == `size`)
  Return *result.error(code="office.index",message="章节或页面位置超出实际范围",operation="change")*.
We **section = None**.
1. `action` == "replace"
  We **section = table.at(xs=`sections`,i=`index`)**.
We **section = table.put(in=table.put(in=`section`,at="heading",value=`heading`),at="body",value=`body`)**.
1. `replacement` != None
  We **section = `replacement`**.
1. `action` == "replace"
  We **sections = table.set_at(list=`sections`,index=`index`,item=`section`)**.
2. `action` == "insert"
  We **sections = table.insert(list=`sections`,index=`index`,item=`section`)**.
2. `action` == "remove" and `size` > 1
  We **sections = table.remove_at(list=`sections`,index=`index`)**.
2. else
  Return *result.error(code="office.edit",message="至少保留一节正文，且只允许已接通的编辑操作",operation="change")*.
Return *[保留旧文件并生成新的实际版本](package.generate(kind=access(`old`,"kind"),title=access(`old`,"title"),sections=`sections`,templates=`templates`,render_pdf=`render_pdf`))*.
