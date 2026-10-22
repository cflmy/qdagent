---
title: Skill — Implement gateway EFI
type: Marqdo Skill
status: stable
capability: openai-gateway
---

# Skill — Implement OpenAI gateway EFI

Steps in execution order. First run `qdagent preflight` for the gateway task —
the EKC Context Pack cites Constraint `openai-gateway-efi` + Policy
`policies/openai-gateway-efi.mq.md`. Then REUSE `gateway/openai.mq.md` and
`agent/qdagent.mq.md`, ADAPT only the thin HTTP adapter (keep Agent logic in
Marqdo), call `gateway.precheck` before any upstream / Agent turn so a deny
short-circuits, verify with `qdagent verify`, and finally record a Knowledge
Candidate and learn it into EKC.

## Authored knowledge

| kind | path |
|------|------|
| Policy (L6) | `policies/openai-gateway-efi.mq.md` |
| Constraint (L4) | `knowledge/constraints/openai-gateway-efi.md` |


## precheck contract

```text
precheck(message) → { decision: proceed|deny, reason, code }
```

Pure / side-effect free. Never owns an Agent loop.
