---
title: Skill — Implement gateway EFI
type: Marqdo Skill
status: candidate
capability: openai-gateway
---

# Skill — Implement OpenAI gateway EFI

## Steps

1. Run `qdagent preflight` for the gateway task.
2. REUSE `gateway/openai.mq.md` and `agent/qdagent.mq.md`.
3. ADAPT thin HTTP adapter only; keep Agent logic in Marqdo.
4. Verify with `qdagent verify`.
5. Record Knowledge Candidate; learn into EKC.
