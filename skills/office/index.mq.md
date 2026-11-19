---
markup: occlusion
title: 办公文件生成
description: 创建一份由真实正文构成的可编辑 Word 文档，需要人工批准写入效果
agent_effects: write
import:
  model: ../../agent/model.mq.md
  word: ext/office/word.mq.md
  table: lib/table.mq.md
  json: lib/json.mq.md
  result: lib/result.mq.md
---

当前入口提供最小可验证的 DOCX 生成，真实布局与产物必须来自 ext/office。复杂 PPT、多页面版式、图片及资料准确性应进入独立办公工作流，而不能因为生成一个 ZIP 就被宣布满足所有版式。人工效果批准必须由根会话保存，模型不能自己替用户点击确认。

## run
    + `context`
    + `goal`

| 参数 | 类型 | 说明 |
|---|---|---|
| context | map | 可信写入授权的任务上下文 |
| goal | text | 文档主题与用户要求 |

Use `context`, `goal`。

We **draft = model.ask(context=`context`,prompt=("为以下主题撰写可编辑 Word 文档的完整正文；不要输出 JSON，也不要假装引用已核实来源。主题：" + `goal`),role="chat")**.
1. not access(`draft`,"ok")
  Return *`draft`*.
We **body = json.get(value=access(`draft`,"value"),key="text")**.
We **section = word.chapter(heading=`goal`,body=`body`)**.
We **sections = table.append(list=table.empty_list(),item=`section`)**.
Return *[通过受限 Office 函数创建真正可编辑的文件](word.create(title=`goal`,chapters=`sections`,context=`context`))*.
