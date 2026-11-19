---
markup: occlusion
title: 知识编译与证明
description: 按来源与语义作用域查询 Marqdo 知识索引、证明依赖或正式证书
agent_effects: compute
import:
  io: ../../agent/io.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

知识不是普通 RAG。编译产生可寻址函数、引用关系、精确来源摘要和可重建索引。证明依赖和 Lean 证书必须以具体目标为单位，model_proved 不能替代运行时完整正确性。下方只有只读入口；正式 compose/replay 由工作流和独立授权边界承担。

## inspect
    + `symbol`

| 参数 | 类型 | 说明 |
|---|---|---|
| symbol | text | 真实 SymbolId 或确切声明名 |

Use `symbol`。

We **args = table.put(in=None,at="kind",value="inspect")**.
Return *io.native(operation="runtime_knowledge_proof",payload=table.put(in=`args`,at="symbol",value=`symbol`))*.

## run

| 参数 | 类型 | 说明 |
|---|---|---|



We **raw_input = io.input()**.
1. not access(`raw_input`,"ok")
  Return *`raw_input`*.
We **goal = access(`raw_input`,"value")**.
Return *inspect(symbol=`goal`)*.
