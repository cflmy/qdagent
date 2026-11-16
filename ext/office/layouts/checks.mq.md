---
markup: occlusion
title: 写入前的文字与结构预算
import:
  table: lib/table.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
  result: lib/result.mq.md
---

文字约束属于 Marqdo 函数；渲染器不能自己发明另一份长度规则。

## text

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| value | any | required | 实际字段值 |
| field | text | required | 诊断中的具体版式和字段 |
| minimum | number | required | 剔除全部空白后的最少有效字符数 |
| maximum | number | required | 最多字符数 |
| lines | number | required | 最多行数 |
| line_width | number | required | 每行最多字符数 |
| allow_tabs | bool | False | 只有自然流动报告允许制表符；固定文本框禁止用于对齐 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回值为 True 的 Result；失败保留版式、字段与范围诊断 |

Use `value`, `field`, `minimum`, `maximum`, `lines`, `line_width`, `allow_tabs`=False。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

空格不能充当内容。先检查实际类型，再剔除全部空白核对最小有效量，并按原值核对最大长度和行数；原值不被截断或改写。预算以字符计数，不用 UTF-8 字节把中文误当成三倍长度。每行单独检查，防止总量合法却把一整段塞到一行。XML 非法控制字符同样在这里拒绝。

固定区域中的制表符不能作为一个普通字符计费，否则少量制表符也可能造成超出边界。分栏应使用真正的双栏布局，报告自然流动时才明确允许制表符。该选择由实际函数决定，不由渲染器私自猜测。

Whitespace-only text is rejected before any output directory exists. Counts describe the actual fixed text box, not a suggestion to the model. Short text should move to a suitable emphasis layout; long text should be rewritten or deliberately split. The function reports the field and actual size so repair can target a concrete cause. It does not edit the input or supply filler.

最小字数剔除空格、制表符与换行，不能靠空白补足内容；最大长度按原值计数并包含换行符。每行仍独立检查，完整使用所有允许行时也不能因忘记计算分隔符而误拒绝合法内容。

1. type(`value`) != "text"
  Return *result.error(code="office.layout_type",message=(`field` + " 必须是文字"),operation="layout")*.
1. not `allow_tabs` and text.contains(text=`value`,sub="\t")
  Return *result.error(code="office.layout_tabs",message=(`field` + " 固定布局不接受制表符对齐，请使用实际分栏布局"),operation="layout")*.
We **clean = text.str_trim(s=`value`)**.
We **count = effective(value=`clean`)**.
1. `count` < `minimum` or len(`value`) > `maximum`
  Return *result.error(code="office.layout_length",message=(`field` + " 需要 " + str(`minimum`) + " 至 " + str(`maximum`) + " 字符，当前有效 " + str(`count`) + "，原始 " + str(len(`value`))),operation="layout")*.
1. re.is_match(text=`value`,pattern="[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x{FFFE}\\x{FFFF}]")
  Return *result.error(code="office.xml_text",message=(`field` + " 含不支持的控制字符"),operation="layout")*.
We **parts = text.str_split(s=`value`,sep="\n")**.
1. len(`parts`) > `lines`
  Return *result.error(code="office.layout_lines",message=(`field` + " 最多 " + str(`lines`) + " 行，当前 " + str(len(`parts`))),operation="layout")*.
- [每一行都必须适合固定区域](for parts as line)
  1. len(`line`) > `line_width`
    Return *result.error(code="office.layout_line_width",message=(`field` + " 每行最多 " + str(`line_width`) + " 字符，当前 " + str(len(`line`))),operation="layout")*.
Return *result.ok(value=True)*.

## record

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| layout | text | required | 已经接通的布局名称 |
| heading | text | required | 已校验标题 |
| body | text | required | 已校验或确定性组合的正文 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 带布局名称、版本、标题和正文的规范记录 |

Use `layout`, `heading`, `body`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

这个纯函数只建立可读结构，版式版本由实现确定为一，不允许调用者用新版本号掩盖不支持的字段。布局记录与普通章节一样进入原生源稿快照。其他布局会添加自己的列、引文、图片和说明，后续校验从那些真实字段重新构造，检查正文没有被另一份值替换。

We **value = table.put(in=table.put(in=table.put(in=None,at="layout",value=`layout`),at="heading",value=`heading`),at="body",value=`body`)**.
Return *table.put(in=`value`,at="layout_version",value=1)*.

## effective

| 参数 | 类型 | 说明 |
|---|---|---|
| value | text | 实际文字，包含正常空格与换行 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | number | 剔除空白后的有效字符数 |

Use `value`。

自动选择布局与实际最小字数必须使用同一种计数。正常英文空格不应使短句被误分配到要求更多正文的版式，空行也不能充当内容。这个纯函数只计数，不改变原文字、换行和标点；真正渲染仍保留原值。

该值只用于选择与下限判断，最大长度仍按原值计入分隔符，并独立检查每一行和行数。不能将有效字数当作像素宽度，固定区域的预算仍属于实际布局函数。所有选择路径共用本函数，避免自动分页、普通 Word 输入与手工构造对同一内容得出不同结论。

Return *len(re.replace(text=`value`,pattern="\\s+",with=""))*.
