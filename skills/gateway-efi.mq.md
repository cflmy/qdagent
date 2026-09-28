---
title: Skill — Implement gateway EFI
type: Marqdo Skill
status: stable
capability: openai-gateway
---

# Skill — Implement OpenAI gateway EFI

## Steps

1. Run `qdagent preflight` for the gateway task.
2. REUSE `gateway/openai.mq.md` and `agent/qdagent.mq.md`.
3. ADAPT thin HTTP adapter only; keep Agent logic in Marqdo.
4. Call `gateway.precheck` before any upstream / Agent turn — deny short-circuits.
5. Verify with `qdagent verify`.
6. Record Knowledge Candidate; learn into EKC.

## precheck contract

```text
precheck(message) → { decision: proceed|deny, reason, code }
```

Pure / side-effect free. Never owns an Agent loop.
