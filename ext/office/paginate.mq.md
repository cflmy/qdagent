---
markup: occlusion
title: 把已核对正文拆成有界演示页面
import:
  table: lib/table.mq.md
  text: lib/text.mq.md
  re: lib/re.mq.md
---

内容规划决定表达什么，本文件只确定性拆分文字页，不生成新的事实。

## slides

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| sections | list | required | 已核对且按方案排序的章节 |

| 返回 | 类型 | 说明 |
|---|---|---|
| result | list | slides 的实际结果，失败保留明确诊断 |

Use `sections`。

这是确定性的文字分页，不让模型在交付时重新编造一份已经完成的研究。每条原始正文按实际换行读取，长行按不超过九十字符拆开，每张内容页最多六行；空行不占一个文字要点。源稿的文字次序保持原样，没有为了符合版式而静默删掉正文。章节标题过长时保留前八十四字符并显示续页号，完整正文仍在 Markdown 源稿和原函数段中。

分页不能代替演示设计。完整长篇报告可能产生过多页面，生成器仍会明确拒绝超过二十张内容页，调用者应在规划阶段确认精炼的逐页内容或拆分交付，而不是在结束时裁掉结论。这里不根据关键词重新总结，不声称会自动绘图、创建图表或保留外来版式。

正常工作流最好让主方案的每个函数段就代表一个简洁章节或演示主题，这样各作者可以并行完成自己的段落。分页只处理物理边界，不能改变已确认的业务职责、事实来源与独立测试。标题从真实章节取得，页面序号只用于可读续页，不作为文件或权限身份。

分页产生的是新列表，不修改各作者的原始正文。页码只帮助人阅读，不能成为单元身份。需要摘要、图示或讲稿时应另行规划真正的业务职责，不能把这个物理拆分误称为模型完成了演示设计。

We **output = table.empty_list()**.
- [每个已验证主题分别拆页](for sections as section)
  We **heading = re.find(text=access(`section`,"heading"),pattern="(?s)^.{1,84}")**.
  We **lines = text.str_split(s=access(`section`,"body"),sep="\n")**.
  We **body = ""** and **count = 0** and **page = 1**.
  - [按原顺序保留每段文字](for lines as line)
    We **chunks = re.find_all(text=`line`,pattern="(?s).{1,90}")**.
    - [长行分割不删正文](for chunks as chunk)
      1. `count` == 6
        We **item = table.put(in=table.put(in=None,at="heading",value=(`heading` + " · " + str(`page`))),at="body",value=`body`)**.
        We **output = table.append(list=`output`,item=`item`)**.
        We **body = ""** and **count = 0** and **page = `page` + 1**.
      1. `body` != ""
        We **body = `body` + "\n"**.
      We **body = `body` + `chunk`** and **count = `count` + 1**.
  1. `body` != ""
    We **item = table.put(in=table.put(in=None,at="heading",value=(`heading` + " · " + str(`page`))),at="body",value=`body`)**.
    We **output = table.append(list=`output`,item=`item`)**.
Return *output*.
