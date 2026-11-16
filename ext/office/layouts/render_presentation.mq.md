---
markup: occlusion
title: 按实际版式组合 PPT 与包内图片
import:
  pages: text_pages.mq.md
  draw: drawing.mq.md
  xml: ../xml.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  math: lib/math.mq.md
  result: lib/result.mq.md
---

只有布局预检返回的记录才会到达实际渲染。

## image

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 当前新建包 |
| section | map | required | 规范图文记录 |
| number | text | required | 实际页号 |
| templates | map | required | 可信模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `root`, `section`, `number`, `templates`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

本函数只使用固定的页面坐标与字号。所有字段来自预检后的规范记录，不向模型开放 x、y、宽高、颜色或 XML。文字先转义，不自动缩字，不依赖模板引擎猜测布局。更改物理区域后必须回到对应构造函数调整预算并重新测试，而不是靠渲染时裁剪修饰结果。

只有预检中实际解码的 PNG 才能复制到固定媒体路径，图片按比例缩放后居中在左侧区域。实际像素和摘要来自原图，替代说明转义到图形属性，模型不能注入外部关系。图片或副本变化就返回失败，不能继续登记。

The image area has a fixed maximum size and a separate text area. Scaling takes the smaller of the horizontal and vertical ratios, so both limits hold together. The picture is centered in the left area without cropping. Body text is never placed over the picture, and alternative text remains an escaped accessibility description. All relationships target fixed package-local media files. No original filename becomes a relationship target or an external URL. The copied bytes must match the preflight digest; a changed image fails rather than quietly replacing what the manuscript describes.

We **copied = draw.copy_image(root=`root`,section=`section`,number=`number`,kind="ppt")**.
1. not access(`copied`,"ok")
  Return *copied*.
We **fit = draw.fit(info=access(`section`,"image_info"),w=6000000,h=4000000)**.
We **value = access(`templates`,"layout_picture")**.
We **value = text.replace(text=`value`,old="{{number}}",new=`number`)**.
We **value = text.replace(text=`value`,old="{{alt}}",new=xml.escape(value=access(`section`,"alt")))**.
We **value = text.replace(text=`value`,old="{{w}}",new=str(access(`fit`,"w")))**.
We **value = text.replace(text=`value`,old="{{h}}",new=str(access(`fit`,"h")))**.
We **value = text.replace(text=`value`,old="{{x}}",new=str(math.floor(value=(800000 + (6000000 - access(`fit`,"w")) / 2))))**.
We **value = text.replace(text=`value`,old="{{y}}",new=str(math.floor(value=(2100000 + (4000000 - access(`fit`,"h")) / 2))))**.
We **heading = draw.box(id=2,content=access(`section`,"heading"),x=760000,y=550000,w=10600000,h=1100000,size=3000,bold=1,color="45533B",templates=`templates`)**.
We **body = draw.box(id=3,content=access(`section`,"body"),x=7350000,y=2300000,w=4200000,h=3500000,size=2000,bold=0,color="35372E",templates=`templates`)**.
Return *result.ok(value=(`heading` + `body` + `value`))*.

## slide

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 当前新建包 |
| section | map | required | 规范页面 |
| number | text | required | 实际页号 |
| templates | map | required | 可信模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `root`, `section`, `number`, `templates`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

本函数只使用固定的页面坐标与字号。所有字段来自预检后的规范记录，不向模型开放 x、y、宽高、颜色或 XML。文字先转义，不自动缩字，不依赖模板引擎猜测布局。更改物理区域后必须回到对应构造函数调整预算并重新测试，而不是靠渲染时裁剪修饰结果。

这个选择只连接已经存在的 Marqdo 渲染函数，不是一套模型动作解释器。未知布局明确失败，不退回某个宽松布局。返回的是实际页面 XML 和关系，图片关系只指向包内固定 PNG；页面模板本身保持固定，所有非模板文字都经过转义。

The route in this function is an ordinary composition of already implemented layout functions. It does not parse a model action language, install a plugin or resolve a caller-supplied renderer. Text pages have no image relationships. Picture pages receive exactly one relationship with an internally generated identity. Cover, comparison, quotation and emphasis preserve their different physical areas. Unknown names fail even if some other layout could display the text. Source metadata and rendered parts therefore keep the same declared layout instead of hiding an unsupported request behind a generic page. The output is still subject to package verification and actual PDF rendering when requested.

We **layout = access(`section`,"layout")**.
We **content = ""** and **image_relation = ""**.
1. `layout` == "ppt.text"
  We **content = pages.text(section=`section`,templates=`templates`)**.
2. `layout` == "ppt.cover"
  We **content = pages.cover(section=`section`,templates=`templates`)**.
2. `layout` == "ppt.focus"
  We **content = pages.focus(section=`section`,templates=`templates`)**.
2. `layout` == "ppt.columns"
  We **content = pages.columns(section=`section`,templates=`templates`)**.
2. `layout` == "ppt.quote"
  We **content = pages.quote(section=`section`,templates=`templates`)**.
2. `layout` == "ppt.image"
  We **image = image(root=`root`,section=`section`,number=`number`,templates=`templates`)**.
  1. not access(`image`,"ok")
    Return *image*.
  We **content = access(`image`,"value")**.
  We **image_relation = "<Relationship Id=\"rIdImage" + `number` + "\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"../media/image" + `number` + ".png\"/>"**.
2. else
  Return *result.error(code="office.layout_unknown",message="没有对应的已验证渲染布局",operation="render")*.
We **xml = access(`templates`,"layout_start") + `content` + access(`templates`,"layout_end")**.
We **relations = text.replace(text=access(`templates`,"slide_rels"),old="</Relationships>",new=(`image_relation` + "</Relationships>"))**.
Return *result.ok(value=table.put(in=table.put(in=None,at="xml",value=`xml`),at="relationships",value=`relations`))*.
