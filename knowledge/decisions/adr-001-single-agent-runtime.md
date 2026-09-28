---
title: ADR-001 Single Agent Runtime
type: Decision
status: stable
capability: agent-runtime
---

# Decision

Marqdo `ext/ai/agent` is the **only** Agent Runtime for qdagent.

Python under `scripts/legacy/` may provide HTTP transport compatibility only.
It must not own context construction, memory, knowledge resolution, LLM orchestration,
run lifecycle, learning, or organization.

## Why

Two agent loops (Marqdo + Python gateway) recreate chat-proxy agents and hide
engineering truth outside `.mq.md`.
