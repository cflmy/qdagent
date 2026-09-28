---
title: Do not reimplement EKC
type: Constraint
status: stable
capability: engineering-knowledge
---

# Constraint

qdagent must **call** Marqdo EKC (`marqdo knowledge` / `find` / `reuse` / `verify` / …)
and Agent EFI (`agent.preflight` / `eng_reuse` / `eng_record`).

Do not invent a second catalog, graph, or vector-first knowledge model as source of truth.
