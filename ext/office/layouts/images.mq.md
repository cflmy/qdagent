---
markup: occlusion
title: 图片的真实文件与像素校验
import:
  io: ext/root-skill/runtime/io.mq.md
  sys: lib/sys.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

像素解码属于格式 I/O；何种图片适合版式由 Marqdo 明确决定。

## inspect

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| path | text | required | 当前任务 uploads 内的实际 PNG |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | map | 成功返回实际值；失败保留版式、字段与范围诊断 |

Use `path`。

布局是实际函数，输入是内容字段，不是 XML、HTML 或任意样式。范围属于当前固定字号、区域大小与行距的内容预算，不是任意办公应用的像素保证。失败时保留原文并指出字段，调用者应精炼内容、拆页或选择合适布局，不可通过裁掉结论、补无意义文字或缩小到不可读字号来绕过。

所有构造函数先检查内容，生成器在写入任何版本目录前还会调用相同函数复核整份请求。模型手工拼记录或修改旧源稿不能绕过检查。通过内容预算只是结构就绪，真实排版、事实核对和用户审阅仍独立进行。

图片不是模型自报的宽高记录。受限 ABI 只读文件并完整解码 PNG，返回实际像素、字节数与摘要；文件根固定来自当前任务进程。随后 Marqdo 校验宽至少六百四十、高至少三百六十、单边不超过四千零九十六、总像素不超过一千二百万，比例在零点四至二点五之间。

仅接受静态 PNG，拒绝伪装扩展名、坏像素、损坏校验和、动画、目录逃逸和符号链接逃逸。不下载网络图片、不自动拉伸、不用一个空框补缺图。输入上限四 MiB，整份请求的图片总量另由生成预检约束，避免写到一半才发现超出压缩包预算。

The width and height in the returned record come from decoded pixels, never from caller claims. A small or very narrow image is a content mismatch, not an invitation to stretch it. The original file remains untouched; its bytes and digest are later compared before and after embedding.

We **context = table.put(in=None,at="workspace",value=sys.cwd())**.
We **observed = io.native(context=`context`,operation="runtime_office_image",payload=table.put(in=None,at="path",value=`path`))**.
1. not access(`observed`,"ok")
  Return *observed*.
We **info = access(`observed`,"value")**.
We **width = access(`info`,"width")** and **height = access(`info`,"height")**.
1. `width` < 640 or `height` < 360 or `width` > 4096 or `height` > 4096 or `width` * `height` > 12000000
  Return *result.error(code="office.image_dimensions",message=("图文版式需要至少 640×360、单边最多 4096、总像素最多 12000000；实际 " + str(`width`) + "×" + str(`height`)),operation="image")*.
1. `width` * 10 < `height` * 4 or `width` * 2 > `height` * 5
  Return *result.error(code="office.image_ratio",message="图片比例需在 0.4 至 2.5 之间，请提供合适构图，不自动拉伸",operation="image")*.
Return *observed*.
