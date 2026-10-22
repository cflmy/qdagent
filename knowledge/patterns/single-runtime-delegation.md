---
title: Single Agent Runtime — delegate, do not reimplement
type: Pattern
status: stable
capability: agent-runtime
---

# Pattern — Single Agent Runtime Delegation

qdagent 的产品逻辑调用 Marqdo Agent Runtime，**绝不**重造第二套 Agent loop。

这是架构红线（`doc/design/qdagent-2.0.md §7`）的核心一条，也是
`doc/next/002.md §3` 反复强调的原则。

## When to apply

凡是涉及"让 LLM 多轮推理 + 调工具 + 写回"的需求：

```text
错误：在 qdagent 里写 prompt + while-loop + tool-dispatch（第二套 runtime）
正确：agent.run task=... efi=True ... → Marqdo ext/ai/agent（唯一 runtime）
```

## Why it works

- 单一 runtime → 单一 prompt 装配点 → 可在 Run 中解释 Context Sources
- 知识沉淀统一进 EKC，不散落在产品侧的对话历史里
- REUSE/ADAPT/CREATE 门闩只在一处生效（agent.run efi=True）
- 复用 Marqdo 的 OKF 飞轮（命中编译知识即 llm_free，推理摊销 RA↑）

## Observed in

`gateway/openai.chat` → `agent/qdagent.build|ask` → `agent.run efi=True`
（产品网关只做 env + auth + precheck，不承载 Agent 逻辑）
