---
markup: occlusion
title: 固定版式的 XML 绘制与图片副本
import:
  xml: ../xml.mq.md
  text: lib/text.mq.md
  table: lib/table.mq.md
  fs: lib/fs.mq.md
  math: lib/math.mq.md
  result: lib/result.mq.md
---

只有规范化记录能进入渲染；渲染原语不再决定内容规则。

## paragraphs

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| content | text | required | 已经校验的实际文字 |
| size | number | required | 固定字号的百分之一磅 |
| bold | number | required | 固定为零或一 |
| color | text | required | 固定颜色 |
| templates | map | required | 可信声明模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `content`, `size`, `bold`, `color`, `templates`。

这些是固定布局的内部渲染原语，坐标、字号与颜色由上层实际函数确定，不是模型参数。内容先通过完整预检，这里只转义并写入声明式 OOXML，不能扩大文件根、访问网络或根据内容执行程序。所有布局都保持可编辑文字，图片使用实际包内关系，不把整页渲染成一张不可编辑图片。

版式字段与渲染区域有明确联系，调整字号、行距或区域时必须同时更新相应 Marqdo 构造函数的预算和边界测试。这里没有自动缩小字体或裁掉溢出内容的兜底逻辑；产生错误应明确失败并保留证据，不声称已经完成。

We **output = ""**.
We **lines = text.str_split(s=`content`,sep="\n")**.
- [逐行保留真实可编辑文字](for lines as line)
  We **value = access(`templates`,"layout_paragraph")**.
  We **value = text.replace(text=`value`,old="{{text}}",new=xml.escape(value=`line`))**.
  We **value = text.replace(text=`value`,old="{{size}}",new=str(`size`))**.
  We **value = text.replace(text=`value`,old="{{bold}}",new=str(`bold`))**.
  We **output = `output` + text.replace(text=`value`,old="{{color}}",new=`color`)**.
Return *output*.

## box

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| id | number | required | 固定节点身份 |
| content | text | required | 已校验文字 |
| x | number | required | 固定横坐标 |
| y | number | required | 固定纵坐标 |
| w | number | required | 固定区域宽度 |
| h | number | required | 固定区域高度 |
| size | number | required | 固定字号 |
| bold | number | required | 固定字重 |
| color | text | required | 固定颜色 |
| templates | map | required | 可信模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `id`, `content`, `x`, `y`, `w`, `h`, `size`, `bold`, `color`, `templates`。

这些是固定布局的内部渲染原语，坐标、字号与颜色由上层实际函数确定，不是模型参数。内容先通过完整预检，这里只转义并写入声明式 OOXML，不能扩大文件根、访问网络或根据内容执行程序。所有布局都保持可编辑文字，图片使用实际包内关系，不把整页渲染成一张不可编辑图片。

版式字段与渲染区域有明确联系，调整字号、行距或区域时必须同时更新相应 Marqdo 构造函数的预算和边界测试。这里没有自动缩小字体或裁掉溢出内容的兜底逻辑；产生错误应明确失败并保留证据，不声称已经完成。

文本框禁止自动缩字，以免“文件可打开”掩盖不可读字号。固定宽高不会从标题或正文中读取，用户文字也不会替换模板的几何设置。节点身份只在当前页使用，不作为文件版本或权限身份。

We **value = access(`templates`,"layout_shape")**.
We **value = text.replace(text=`value`,old="{{id}}",new=str(`id`))**.
We **value = text.replace(text=`value`,old="{{name}}",new=("Text " + str(`id`)))**.
We **value = text.replace(text=`value`,old="{{x}}",new=str(`x`))**.
We **value = text.replace(text=`value`,old="{{y}}",new=str(`y`))**.
We **value = text.replace(text=`value`,old="{{w}}",new=str(`w`))**.
We **value = text.replace(text=`value`,old="{{h}}",new=str(`h`))**.
Return *text.replace(text=`value`,old="{{paragraphs}}",new=paragraphs(content=`content`,size=`size`,bold=`bold`,color=`color`,templates=`templates`))*.

## fit

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| info | map | required | 真实解码的像素尺寸 |
| w | number | required | 固定区域最大宽度 |
| h | number | required | 固定区域最大高度 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `info`, `w`, `h`。

这些是固定布局的内部渲染原语，坐标、字号与颜色由上层实际函数确定，不是模型参数。内容先通过完整预检，这里只转义并写入声明式 OOXML，不能扩大文件根、访问网络或根据内容执行程序。所有布局都保持可编辑文字，图片使用实际包内关系，不把整页渲染成一张不可编辑图片。

版式字段与渲染区域有明确联系，调整字号、行距或区域时必须同时更新相应 Marqdo 构造函数的预算和边界测试。这里没有自动缩小字体或裁掉溢出内容的兜底逻辑；产生错误应明确失败并保留证据，不声称已经完成。

图片只做等比例缩放并在区域内居中，绝不把宽图拉成长图或裁去重要区域。像素尺寸来自受限解码，不从模型自报记录读取。返回实际宽高后，Word 与 PPT 各自使用固定的所在区域；不同布局有不同区域，不能共用一个任意百分比。

We **pixel_width = access(`info`,"width")** and **pixel_height = access(`info`,"height")**.
We **width = `w`** and **height = math.floor(value=(`w` * `pixel_height` / `pixel_width`))**.
1. `w` * `pixel_height` > `h` * `pixel_width`
  We **height = `h`** and **width = math.floor(value=(`h` * `pixel_width` / `pixel_height`))**.
Return *table.put(in=table.put(in=None,at="w",value=`width`),at="h",value=`height`)*.

## copy_image

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| root | text | required | 新建包目录 |
| section | map | required | 已通过真实图片检查的记录 |
| number | text | required | 当前内容块固定编号 |
| kind | text | required | word 或 ppt |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `root`, `section`, `number`, `kind`。

这些是固定布局的内部渲染原语，坐标、字号与颜色由上层实际函数确定，不是模型参数。内容先通过完整预检，这里只转义并写入声明式 OOXML，不能扩大文件根、访问网络或根据内容执行程序。所有布局都保持可编辑文字，图片使用实际包内关系，不把整页渲染成一张不可编辑图片。

版式字段与渲染区域有明确联系，调整字号、行距或区域时必须同时更新相应 Marqdo 构造函数的预算和边界测试。这里没有自动缩小字体或裁掉溢出内容的兜底逻辑；产生错误应明确失败并保留证据，不声称已经完成。

先核对输入仍与预检摘要一致，再复制到固定包内媒体名，复制后再次核对。图片在两次操作之间变化会保留失败而不登记交付。目标名由可信序号组成，不使用外部标题和路径，不允许图片选择关系文件。原上传文件保持不变，旧办公版本使用已经嵌入的独立副本。

We **info = access(`section`,"image_info")**.
1. fs.file_hash(path=access(`section`,"image")) != access(`info`,"sha256")
  Return *result.error(code="office.image_changed",message="图片在预检后发生变化",operation="copy")*.
We **directory = `root` + "/" + `kind` + "/media"**.
We **_ = fs.make_dirs(path=`directory`)**.
We **path = `directory` + "/image" + `number` + ".png"**.
We **_ = fs.copy_file(src=access(`section`,"image"),dest=`path`)**.
1. fs.file_hash(path=`path`) != access(`info`,"sha256")
  Return *result.error(code="office.image_changed",message="包内图片与预检摘要不一致",operation="copy")*.
Return *result.ok(value=`path`)*.
