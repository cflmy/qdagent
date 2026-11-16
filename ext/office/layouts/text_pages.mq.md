---
markup: occlusion
title: PPT 固定文字页面的实际渲染
import:
  draw: drawing.mq.md
---

这里消费已校验记录，不重新决定输入预算。

## text

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| section | map | required | 已通过预检的当前内容块 |
| templates | map | required | 可信声明模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `section`, `templates`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

本函数只使用固定的页面坐标与字号。所有字段来自预检后的规范记录，不向模型开放 x、y、宽高、颜色或 XML。文字先转义，不自动缩字，不依赖模板引擎猜测布局。更改物理区域后必须回到对应构造函数调整预算并重新测试，而不是靠渲染时裁剪修饰结果。

Return *draw.box(id=2,content=access(`section`,"heading"),x=760000,y=550000,w=10600000,h=1100000,size=3000,bold=1,color="45533B",templates=`templates`) + draw.box(id=3,content=access(`section`,"body"),x=850000,y=2150000,w=10400000,h=3700000,size=2200,bold=0,color="35372E",templates=`templates`)*.

## cover

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| section | map | required | 已通过预检的当前内容块 |
| templates | map | required | 可信声明模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `section`, `templates`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

本函数只使用固定的页面坐标与字号。所有字段来自预检后的规范记录，不向模型开放 x、y、宽高、颜色或 XML。文字先转义，不自动缩字，不依赖模板引擎猜测布局。更改物理区域后必须回到对应构造函数调整预算并重新测试，而不是靠渲染时裁剪修饰结果。

封面使用独立的大题目区与较小副标题，强调留白而非空正文框。题目预算单独约束，不能因为文档标题允许一百字就让封面超出区域。

Return *draw.box(id=2,content=access(`section`,"heading"),x=950000,y=1500000,w=10300000,h=2500000,size=4400,bold=1,color="45533B",templates=`templates`) + draw.box(id=3,content=access(`section`,"body"),x=1000000,y=4500000,w=10000000,h=1400000,size=2000,bold=0,color="8D7956",templates=`templates`)*.

## focus

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| section | map | required | 已通过预检的当前内容块 |
| templates | map | required | 可信声明模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `section`, `templates`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

本函数只使用固定的页面坐标与字号。所有字段来自预检后的规范记录，不向模型开放 x、y、宽高、颜色或 XML。文字先转义，不自动缩字，不依赖模板引擎猜测布局。更改物理区域后必须回到对应构造函数调整预算并重新测试，而不是靠渲染时裁剪修饰结果。

重点句使用固定的大字号，适合短结论。它不添加引号、署名或虚构来源，不改变原句含义；引文需要使用另一个带来源的实际布局。

Return *draw.box(id=2,content=access(`section`,"heading"),x=760000,y=550000,w=10600000,h=1100000,size=3000,bold=1,color="45533B",templates=`templates`) + draw.box(id=3,content=access(`section`,"body"),x=1000000,y=2500000,w=10300000,h=2600000,size=3200,bold=1,color="66734C",templates=`templates`)*.

## quote

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| section | map | required | 已通过预检的当前内容块 |
| templates | map | required | 可信声明模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `section`, `templates`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

本函数只使用固定的页面坐标与字号。所有字段来自预检后的规范记录，不向模型开放 x、y、宽高、颜色或 XML。文字先转义，不自动缩字，不依赖模板引擎猜测布局。更改物理区域后必须回到对应构造函数调整预算并重新测试，而不是靠渲染时裁剪修饰结果。

引文和出处是两个独立文本框，出处不会挤进引文正文。该分离只是版式，不能证明引用真实，正文来源仍由业务验证与用户审阅判断。

Return *draw.box(id=2,content=access(`section`,"heading"),x=760000,y=550000,w=10600000,h=1100000,size=3000,bold=1,color="45533B",templates=`templates`) + draw.box(id=3,content=access(`section`,"quotation"),x=1000000,y=2200000,w=10000000,h=2700000,size=3400,bold=0,color="45533B",templates=`templates`) + draw.box(id=4,content=access(`section`,"source"),x=1100000,y=5300000,w=9800000,h=650000,size=1500,bold=0,color="8D7956",templates=`templates`)*.

## columns

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| section | map | required | 已通过预检的当前内容块 |
| templates | map | required | 可信声明模板 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | text | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `section`, `templates`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

本函数只使用固定的页面坐标与字号。所有字段来自预检后的规范记录，不向模型开放 x、y、宽高、颜色或 XML。文字先转义，不自动缩字，不依赖模板引擎猜测布局。更改物理区域后必须回到对应构造函数调整预算并重新测试，而不是靠渲染时裁剪修饰结果。

左右栏宽度相同，标题、正文分别定位，列间保留固定间距。不能用一侧未完成的内容撑满另一侧，也不能让长标题进入对方区域。

Both columns share the same fixed width, font size and vertical origin. Their headings and bodies occupy separate boxes; one column cannot borrow the budget of the other. A renderer change must be accompanied by new limits and physical rendering evidence.

Return *draw.box(id=2,content=access(`section`,"heading"),x=760000,y=550000,w=10600000,h=1100000,size=3000,bold=1,color="45533B",templates=`templates`) + draw.box(id=3,content=access(`section`,"left_heading"),x=850000,y=2050000,w=4800000,h=700000,size=2200,bold=1,color="66734C",templates=`templates`) + draw.box(id=4,content=access(`section`,"left"),x=850000,y=2900000,w=4800000,h=3000000,size=2000,bold=0,color="35372E",templates=`templates`) + draw.box(id=5,content=access(`section`,"right_heading"),x=6500000,y=2050000,w=4800000,h=700000,size=2200,bold=1,color="66734C",templates=`templates`) + draw.box(id=6,content=access(`section`,"right"),x=6500000,y=2900000,w=4800000,h=3000000,size=2000,bold=0,color="35372E",templates=`templates`)*.
