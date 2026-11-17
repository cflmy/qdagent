---
markup: occlusion
title: 办公主题与原生动效
import:
  json: lib/json.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

设计来源与 MIT 许可见 SOURCES.md。

## sage

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实结果；失败保留诊断 |

竹影纸笺用于纸感叙述。

风格只改变表现，不重写已经验证的正文、不缩小字号、不放宽布局函数的内容预算。使用固定字体和明确区域，可编辑文字、图片与来源全部保留。模板从已安装资源读取，不接受模型传入 CSS、XML、脚本或网络模板地址。未知风格明确失败，不能静默换一种颜色。文件有效、预览成功与用户最终验收分别记录。

每份变体拥有独立身份、排版进程和源稿，失败不会把另一种风格记为完成。PDF 是静态的，实际 PPTX 保留原生转场；网页预览另有入场动画，并尊重减少动态效果的设备设置。修改主题时必须重新检查真实排版，不能把一次边界测试当作未来内容的免检资格。

Return *json.parse(text="{\"id\": \"sage\", \"label\": \"竹影纸笺\", \"background\": \"FCF9F3\", \"ink\": \"35372E\", \"heading\": \"45533B\", \"accent\": \"66734C\", \"soft\": \"EEF2E7\", \"transition\": \"fade\", \"tagline\": \"纸感叙述\"}")*.

## paper

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实结果；失败保留诊断 |

留白画廊用于清晰提案。

风格只改变表现，不重写已经验证的正文、不缩小字号、不放宽布局函数的内容预算。使用固定字体和明确区域，可编辑文字、图片与来源全部保留。模板从已安装资源读取，不接受模型传入 CSS、XML、脚本或网络模板地址。未知风格明确失败，不能静默换一种颜色。文件有效、预览成功与用户最终验收分别记录。

每份变体拥有独立身份、排版进程和源稿，失败不会把另一种风格记为完成。PDF 是静态的，实际 PPTX 保留原生转场；网页预览另有入场动画，并尊重减少动态效果的设备设置。修改主题时必须重新检查真实排版，不能把一次边界测试当作未来内容的免检资格。

Return *json.parse(text="{\"id\": \"paper\", \"label\": \"留白画廊\", \"background\": \"FAFBFE\", \"ink\": \"202B3E\", \"heading\": \"17263E\", \"accent\": \"4366ED\", \"soft\": \"ECF0FF\", \"transition\": \"fade\", \"tagline\": \"清晰提案\"}")*.

## midnight

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实结果；失败保留诊断 |

极夜星图用于科技发布。

风格只改变表现，不重写已经验证的正文、不缩小字号、不放宽布局函数的内容预算。使用固定字体和明确区域，可编辑文字、图片与来源全部保留。模板从已安装资源读取，不接受模型传入 CSS、XML、脚本或网络模板地址。未知风格明确失败，不能静默换一种颜色。文件有效、预览成功与用户最终验收分别记录。

每份变体拥有独立身份、排版进程和源稿，失败不会把另一种风格记为完成。PDF 是静态的，实际 PPTX 保留原生转场；网页预览另有入场动画，并尊重减少动态效果的设备设置。修改主题时必须重新检查真实排版，不能把一次边界测试当作未来内容的免检资格。

Return *json.parse(text="{\"id\": \"midnight\", \"label\": \"极夜星图\", \"background\": \"101B32\", \"ink\": \"D8E4F2\", \"heading\": \"F3F7FF\", \"accent\": \"6EE7DB\", \"soft\": \"1C304B\", \"transition\": \"push\", \"tagline\": \"科技发布\"}")*.

## coral

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实结果；失败保留诊断 |

日落编辑部用于暖调书刊。

风格只改变表现，不重写已经验证的正文、不缩小字号、不放宽布局函数的内容预算。使用固定字体和明确区域，可编辑文字、图片与来源全部保留。模板从已安装资源读取，不接受模型传入 CSS、XML、脚本或网络模板地址。未知风格明确失败，不能静默换一种颜色。文件有效、预览成功与用户最终验收分别记录。

每份变体拥有独立身份、排版进程和源稿，失败不会把另一种风格记为完成。PDF 是静态的，实际 PPTX 保留原生转场；网页预览另有入场动画，并尊重减少动态效果的设备设置。修改主题时必须重新检查真实排版，不能把一次边界测试当作未来内容的免检资格。

Return *json.parse(text="{\"id\": \"coral\", \"label\": \"日落编辑部\", \"background\": \"FCF4EB\", \"ink\": \"45342E\", \"heading\": \"703D31\", \"accent\": \"BD5B40\", \"soft\": \"F4DFD0\", \"transition\": \"wipe\", \"tagline\": \"暖调书刊\"}")*.

## select

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| theme | text | "sage" | 受信主题身份 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 真实结果；失败保留诊断 |

Use `theme`="sage"。

风格只改变表现，不重写已经验证的正文、不缩小字号、不放宽布局函数的内容预算。使用固定字体和明确区域，可编辑文字、图片与来源全部保留。模板从已安装资源读取，不接受模型传入 CSS、XML、脚本或网络模板地址。未知风格明确失败，不能静默换一种颜色。文件有效、预览成功与用户最终验收分别记录。

每份变体拥有独立身份、排版进程和源稿，失败不会把另一种风格记为完成。PDF 是静态的，实际 PPTX 保留原生转场；网页预览另有入场动画，并尊重减少动态效果的设备设置。修改主题时必须重新检查真实排版，不能把一次边界测试当作未来内容的免检资格。

1. `theme` == "sage"
  Return *sage()*.
1. `theme` == "paper"
  Return *paper()*.
1. `theme` == "midnight"
  Return *midnight()*.
1. `theme` == "coral"
  Return *coral()*.
Return *result.error(code="office.theme",message="请选择 sage、paper、midnight 或 coral",operation="theme")*.

## xml

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| content | text | required | 已生成并转义的实际 XML |
| theme | text | required | 固定主题 |
| kind | text | required | docx 或 pptx |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 真实结果；失败保留诊断 |

Use `content`, `theme`, `kind`。

风格只改变表现，不重写已经验证的正文、不缩小字号、不放宽布局函数的内容预算。使用固定字体和明确区域，可编辑文字、图片与来源全部保留。模板从已安装资源读取，不接受模型传入 CSS、XML、脚本或网络模板地址。未知风格明确失败，不能静默换一种颜色。文件有效、预览成功与用户最终验收分别记录。

每份变体拥有独立身份、排版进程和源稿，失败不会把另一种风格记为完成。PDF 是静态的，实际 PPTX 保留原生转场；网页预览另有入场动画，并尊重减少动态效果的设备设置。修改主题时必须重新检查真实排版，不能把一次边界测试当作未来内容的免检资格。

颜色只替换确切属性，不对用户正文进行颜色字符串替换。深色 Word 使用便于打印的白底深蓝标题，避免浅色正文消失在纸面。所有区域和字号继续来自原布局。

风格只改变表现，不重写已经验证的正文、不缩小字号、不放宽布局函数的内容预算。使用固定字体和明确区域，可编辑文字、图片与来源全部保留。模板从已安装资源读取，不接受模型传入 CSS、XML、脚本或网络模板地址。未知风格明确失败，不能静默换一种颜色。文件有效、预览成功与用户最终验收分别记录。

每份变体拥有独立身份、排版进程和源稿，失败不会把另一种风格记为完成。PDF 是静态的，实际 PPTX 保留原生转场；网页预览另有入场动画，并尊重减少动态效果的设备设置。修改主题时必须重新检查真实排版，不能把一次边界测试当作未来内容的免检资格。

编辑风格的中文使用已安装的思源宋体，英文使用 Georgia，其他风格保留清晰的无衬线正文。字体变化不改变字号预算，封面轨道和边缘装饰都在正文之前绘制。最长标题与真实排版仍需回归，不能只看短句截图决定模板上限。

主题只从可信声明资源读取，不能通过模型输入替换字体文件或远程加载脚本。原始可编辑文字仍保留，导出 PDF 后应核对完整内容，预览中的动画不影响原件的可访问性。

配色只能命中 XML 颜色属性，正文里的同名颜色字符串不会被替换。这里不读取用户样式，不插入外链资源，也不为长文本自动缩字；布局输入仍先通过对应函数的完整校验。视觉资源升级后应重新比较实际 PDF 与可编辑原件，不能仅根据主题名称宣称排版一致。

主题转换顺序固定：取得已验证主题、按颜色角色转换声明属性，再应用必要字体选择。每个转换都只处理受信生成器的标记，正文已经转义，因此不可能把正文里的颜色名或字体名当作样式操作。未知主题应由上游先拒绝，不能让这里根据内容猜测一个替代样式。

封面与正文有不同的视觉区域，正文的分隔线不能机械地放到封面标题上。封面仅使用对应主题的边缘装饰和眉题，长标题仍沿用原区域；大幅轨道属于背景装饰，不覆盖实际文字。配色需要在真实浅色和深色文件中检查，尤其是副标题，不能只换背景而保留低对比度的旧颜色。

Word 采用适合纸面的配色，PPT 采用适合屏幕的配色，二者共同保持可编辑内容。字体可能因用户设备而替换，范围预算必须留出余量；固定字号不是允许忽略溢出的理由。升级主题后需要同时检查短句、长标题、双栏、图片和上限附近的正文，PDF 只是当前排版引擎的一份真实证据。

任何主题参数都不参与模型路由、正文重写或案例判断。实现者不能为了漂亮而删掉用户的引用、单位、边界和结论；内容确实不适配时应回到规划选择其他布局，而不是让渲染器悄悄改变信息。

We **spec = select(theme=`theme`)**.
We **value = `content`**.
We **pairs = json.parse(text="[[\"8D7956\", \"accent\"], [\"35372E\", \"ink\"], [\"45533B\", \"heading\"], [\"556B3A\", \"heading\"], [\"66734C\", \"accent\"], [\"EEF2E7\", \"soft\"], [\"FCF9F3\", \"background\"]]")**.
- [只改变真实 XML 属性，不替换用户正文](for pairs as pair)
  We **old = table.at(xs=`pair`,i=0)** and **key = table.at(xs=`pair`,i=1)**.
  We **color = access(`spec`,`key`)**.
  1. `kind` == "docx" and `theme` == "midnight"
    We **print_colors = json.parse(text="{\"ink\":\"202B3E\",\"heading\":\"173E69\",\"accent\":\"237C8C\",\"soft\":\"EAF3F7\",\"background\":\"FFFFFF\"}")**.
    We **color = access(`print_colors`,`key`)**.
  We **attributes = json.parse(text="[\"val\",\"w:color\",\"w:fill\"]")**.
  - [正文已经转义，无法伪造颜色属性](for attributes as attribute)
    We **value = text.replace(text=`value`,old=(`attribute` + "=\"" + `old` + "\""),new=(`attribute` + "=\"" + `color` + "\""))**.
1. `theme` == "coral"
  We **value = text.replace(text=`value`,old="typeface=\"Aptos\"",new="typeface=\"Georgia\"")**.
  We **value = text.replace(text=`value`,old="w:ascii=\"Aptos\"",new="w:ascii=\"Georgia\"")**.
  We **value = text.replace(text=`value`,old="w:eastAsia=\"Microsoft YaHei\"",new="w:eastAsia=\"Noto Serif CJK SC\"")**.
1. `theme` == "coral"
  We **value = text.replace(text=`value`,old="typeface=\"Microsoft YaHei\"",new="typeface=\"Noto Serif CJK SC\"")**.
1. `theme` != "sage"
  We **value = text.replace(text=`value`,old="val=\"9B7742\"",new=("val=\"" + access(`spec`,"accent") + "\""))**.
Return *value*.

## slide

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| templates | map | required | 控制器已读取的固定声明模板 |
| layout | text | "ppt.text" | 已校验布局身份；封面使用边缘轨道和主题眉题 |
| content | text | required | 实际布局的完整 XML |
| theme | text | required | 固定主题 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 真实结果；失败保留诊断 |

Use `content`, `theme`, `templates`, `layout`="ppt.text"。

风格只改变表现，不重写已经验证的正文、不缩小字号、不放宽布局函数的内容预算。使用固定字体和明确区域，可编辑文字、图片与来源全部保留。模板从已安装资源读取，不接受模型传入 CSS、XML、脚本或网络模板地址。未知风格明确失败，不能静默换一种颜色。文件有效、预览成功与用户最终验收分别记录。

每份变体拥有独立身份、排版进程和源稿，失败不会把另一种风格记为完成。PDF 是静态的，实际 PPTX 保留原生转场；网页预览另有入场动画，并尊重减少动态效果的设备设置。修改主题时必须重新检查真实排版，不能把一次边界测试当作未来内容的免检资格。

装饰使用可编辑的原生几何，位于页面边缘并排在正文形状之前。留白采用细线网格、深色采用边带、暖调采用页角和短强调线。原生转场分别为淡入、推入和擦除；不是把 PDF 静态画面描述为动画。坐标不能由模型扩张，修改装饰仍要验证最长标题不会相互遮盖。

风格只改变表现，不重写已经验证的正文、不缩小字号、不放宽布局函数的内容预算。使用固定字体和明确区域，可编辑文字、图片与来源全部保留。模板从已安装资源读取，不接受模型传入 CSS、XML、脚本或网络模板地址。未知风格明确失败，不能静默换一种颜色。文件有效、预览成功与用户最终验收分别记录。

每份变体拥有独立身份、排版进程和源稿，失败不会把另一种风格记为完成。PDF 是静态的，实际 PPTX 保留原生转场；网页预览另有入场动画，并尊重减少动态效果的设备设置。修改主题时必须重新检查真实排版，不能把一次边界测试当作未来内容的免检资格。

We **spec = access(access(`templates`,"theme_catalog"),`theme`)**.
We **value = xml(content=`content`,theme=`theme`,kind="pptx")**.
We **ornaments = access(`spec`,"ornaments")**.
1. `layout` == "ppt.cover"
  We **ornaments = access(`spec`,"cover_ornaments")**.
  1. `theme` == "midnight"
    We **ornaments = access(`spec`,"ornaments") + `ornaments`**.
We **value = text.replace(text=`value`,old="</p:grpSpPr>",new=("</p:grpSpPr>" + `ornaments`))**.
Return *text.replace(text=`value`,old="</p:sld>",new=("<p:transition spd=\"med\">" + access(`spec`,"motion") + "</p:transition></p:sld>"))*.
