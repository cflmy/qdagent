---
title: Policy — OpenAI gateway must use EFI
type: Marqdo Policy
status: candidate
---

# Policy

If task contains:

```text
openai /v1 gateway
OpenAI 兼容
chat.completions
```

Then:

```text
resolve gateway/openai
resolve agent/qdagent
resolve agent/preflight
```

Never:

```text
create new Python Agent loop
create second EKC
bypass eng_preflight
```
