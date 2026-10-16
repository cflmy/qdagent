---
title: OpenAI /v1 gateway must use EFI
type: Constraint
status: stable
capability: openai-gateway
policy: policies/openai-gateway-efi.mq.md
---

# Constraint

OpenAI-compatible `/v1` traffic must go through Engineering First Information:

```text
HTTP framing → gateway/openai.precheck → agent/qdagent (efi) → Marqdo Agent
```

## Required

- REUSE `gateway/openai.mq.md` · `agent/qdagent.mq.md` · `agent/preflight.mq.md`
- Product Preflight Context Pack before upstream / Agent turn
- Authored policy: `policies/openai-gateway-efi.mq.md` (stable)

## Forbidden

- New Python Agent loop
- Second EKC / vector-as-truth
- `bypass eng_preflight` / `QDAGENT_V1_EFI=0` thick path (returns 410)
