---
title: Python OpenAI gateway owned the Agent loop
type: Failure
status: stable
capability: openai-gateway
---

# AntiPattern — Thick Python Agent Gateway

Previously `scripts/legacy/openai_v1_gateway.py` did:

```text
read_profile → corpus_hits → build_system → upstream LLM → write_run → organize
```

## Why forbidden

- Second Agent Runtime
- Hidden prompt construction
- Knowledge treated as chat memory injection
- Violates code-as-documentation (truth not in `.mq.md` orchestration)

## Use instead

```text
HTTP → gateway/openai → agent/qdagent.build|ask → agent.preflight (eng_preflight=True) → Marqdo Agent
```
