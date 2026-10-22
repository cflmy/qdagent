---
title: Vector RAG treated as the knowledge source of truth
type: AntiPattern
status: stable
capability: retrieval
---

# AntiPattern — Vector RAG as Source of Truth

不要把 embedding + top-k 向量检索当作 Engineering Knowledge 的**真相源**。

设计明确（`doc/next/002.md §19`）：向量检索若要引入，只能作为
*evidence retrieval tool*，而**不是** source of truth。

## Why forbidden

- 向量相似 ≠ 工程正确（语义近的代码未必是该用的能力）
- 丢失层级检索（Catalog → Module → Capability → Symbol 的精度）
- 不可解释：为什么命中这一条？无 Capability / Decision / Failure 边
- 与 EKC 的 Capability 图形成第二真相源（违反架构红线 §7.3）

## Use instead

```text
层级检索：Task → Catalog → Repository → Module → Capability → Symbol → Source
证据检索（可选补充）：marqdo reuse 的 lexical/symbol/capability/graph 候选集
```

```text
qdagent: 调 resolver.reuse（Marqdo EKC 层级检索），禁止自建向量库作为主检索
```
