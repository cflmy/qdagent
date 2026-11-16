---
markup: occlusion
title: Word 报告、提示块和图文的实际段落
import:
  draw: drawing.mq.md
  xml: ../xml.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

Word 允许正文自然流动；版式控制仍以可编辑段落为单位。

## section

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 当前包目录 |
| section | map | required | 规范章节 |
| number | text | required | 实际章节号 |
| templates | map | required | 可信模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `root`, `section`, `number`, `templates`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

本函数只使用固定的页面坐标与字号。所有字段来自预检后的规范记录，不向模型开放 x、y、宽高、颜色或 XML。文字先转义，不自动缩字，不依赖模板引擎猜测布局。更改物理区域后必须回到对应构造函数调整预算并重新测试，而不是靠渲染时裁剪修饰结果。

普通报告使用自然段落与孤行控制，提示块有固定底色与左边线，图文块把图题跟随图片。正文可自然跨页，不把多页报告伪称一页版式。图片使用内嵌图形且保持宽高比，不含链接式外部图片；图题与图片使用段落关联，避免图题孤立。

Word text is allowed to flow across pages; the paragraph styles preserve readable spacing and widow control rather than forcing an arbitrary amount of prose into a fixed page. A notice applies its own background and border to the actual paragraph. Illustrated content adds the verified picture and caption as linked adjacent paragraphs, preserving their association. This renderer does not invent content, shorten paragraphs or make a document pass by changing its font size. It returns both the body and required image relationship so the caller cannot forget one part of the package. A successful XML operation alone does not establish visual or factual acceptance.

图文正文末段与实际图片相连，图片与图题相连，空间不足时自然移至下一页，避免把图文标题留在上一页。较长报告仍保留自然分页，不把整篇文档强行粘在一页。

Word has a separate short-content style with a deliberately larger centered font. It is chosen for a keyword instead of padding that keyword into a report. Report paragraphs retain natural page flow; notice blocks use their own bounded shaded region. Each keeps its own constructor budget. The renderer consumes that choice and cannot quietly change it to make overflowing input look acceptable.

We **heading = text.replace(text=access(`templates`,"paragraph"),old="{{style}}",new="<w:pPr><w:pStyle w:val=\"Heading1\"/><w:keepNext/></w:pPr>")**.
We **content = text.replace(text=`heading`,old="{{text}}",new=xml.escape(value=access(`section`,"heading")))**.
We **properties = "<w:pPr><w:widowControl/></w:pPr>"**.
1. json.get(value=`section`,key="layout") == "word.notice"
  We **properties = "<w:pPr><w:widowControl/><w:pBdr><w:left w:val=\"single\" w:sz=\"18\" w:color=\"66734C\"/></w:pBdr><w:shd w:val=\"clear\" w:fill=\"EEF2E7\"/><w:ind w:left=\"180\" w:right=\"180\"/></w:pPr>"**.
1. json.get(value=`section`,key="layout") == "word.focus"
  We **properties = "<w:pPr><w:spacing w:before=\"360\" w:after=\"360\"/><w:jc w:val=\"center\"/></w:pPr>"**.
1. json.get(value=`section`,key="layout") == "word.image"
  We **properties = "<w:pPr><w:keepNext/><w:widowControl/></w:pPr>"**.
We **lines = text.str_split(s=access(`section`,"body"),sep="\n")**.
- [按实际段落生成可编辑正文](for lines as line)
  We **paragraph = text.replace(text=access(`templates`,"paragraph"),old="{{style}}",new=`properties`)**.
  1. json.get(value=`section`,key="layout") == "word.focus"
    We **paragraph = text.replace(text=`paragraph`,old="<w:r>",new="<w:r><w:rPr><w:b/><w:color w:val=\"556B3A\"/><w:sz w:val=\"44\"/></w:rPr>")**.
  We **content = `content` + text.replace(text=`paragraph`,old="{{text}}",new=xml.escape(value=`line`))**.
We **relation = ""**.
1. json.get(value=`section`,key="layout") == "word.image"
  We **picture = picture(root=`root`,section=`section`,number=`number`,templates=`templates`)**.
  1. not access(`picture`,"ok")
    Return *picture*.
  We **content = `content` + access(`picture`,"value")**.
  We **relation = "<Relationship Id=\"rIdImage" + `number` + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"media/image" + `number` + ".png\"/>"**.
Return *result.ok(value=table.put(in=table.put(in=None,at="xml",value=`content`),at="relationships",value=`relation`))*.

## picture

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 当前新建包 |
| section | map | required | 预检通过的图文记录 |
| number | text | required | 固定章节号 |
| templates | map | required | 可信模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `root`, `section`, `number`, `templates`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

本函数只使用固定的页面坐标与字号。所有字段来自预检后的规范记录，不向模型开放 x、y、宽高、颜色或 XML。文字先转义，不自动缩字，不依赖模板引擎猜测布局。更改物理区域后必须回到对应构造函数调整预算并重新测试，而不是靠渲染时裁剪修饰结果。

图片区最大约六英寸宽与三点五英寸高，使用实际比例计算，不拉伸、不自动裁切。图题既是可读说明也是替代文本，始终保留。原图复制前后均按预检摘要核对；发生变化时终止版本生成，不能让源稿描述一种图片而包里写入另一种。

The new package contains its own verified copy. The source image remains an upload, and its path cannot become a document relationship. Caption text is literal data in both visible and accessibility positions.

We **copied = draw.copy_image(root=`root`,section=`section`,number=`number`,kind="word")**.
1. not access(`copied`,"ok")
  Return *copied*.
We **fit = draw.fit(info=access(`section`,"image_info"),w=5486400,h=3200400)**.
We **value = access(`templates`,"word_picture")**.
We **value = text.replace(text=`value`,old="{{number}}",new=`number`)**.
We **value = text.replace(text=`value`,old="{{alt}}",new=xml.escape(value=access(`section`,"caption")))**.
We **value = text.replace(text=`value`,old="{{w}}",new=str(access(`fit`,"w")))**.
We **value = text.replace(text=`value`,old="{{h}}",new=str(access(`fit`,"h")))**.
We **caption = text.replace(text=access(`templates`,"paragraph"),old="{{style}}",new="<w:pPr><w:jc w:val=\"center\"/></w:pPr>")**.
Return *result.ok(value=(`value` + text.replace(text=`caption`,old="{{text}}",new=xml.escape(value=access(`section`,"caption")))))*.
