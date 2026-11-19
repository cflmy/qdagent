---
markup: occlusion
title: 知识制品证据工作流
description: 官方 Marqdo 知识身份、proof-deps、Lean compose 与 replay 的严格边界。
import:
  io: ../../agent/io.mq.md
  table: lib/table.mq.md
  result: lib/result.mq.md
---

证据分为结构来源、抽象证明和真实执行/实验三层。依赖审计不是完整调用者定理；Lean Int 的 model_proved 也不是动态运行时正确性。所有具体目标、证书及权限来自真实源码和受控收据。知识图索引是可以重建的派生数据，不替代源码。

## dependencies
    + `target`

| 参数 | 类型 | 说明 |
|---|---|---|
| target | text | 显式语义根 |

Use `target`。

We **args = table.put(in=None,at="kind",value="proof_deps")**.
Return *io.native(operation="runtime_knowledge_proof",payload=table.put(in=`args`,at="target",value=`target`))*.

## compose
    + `target`

| 参数 | 类型 | 说明 |
|---|---|---|
| target | text | 显式语义根 |

Use `target`。

We **args = table.put(in=None,at="kind",value="compose")**.
Return *io.native(operation="runtime_knowledge_prove",payload=table.put(in=`args`,at="target",value=`target`))*.

## replay
    + `target`
    + `certificate`

| 参数 | 类型 | 说明 |
|---|---|---|
| target | text | 当前语义根 |
| certificate | text | 真实签发的证书路径 |

Use `target`, `certificate`。

We **args = table.put(in=None,at="kind",value="replay")**.
We **args = table.put(in=`args`,at="target",value=`target`)**.
Return *io.native(operation="runtime_knowledge_prove",payload=table.put(in=`args`,at="certificate",value=`certificate`))*.
