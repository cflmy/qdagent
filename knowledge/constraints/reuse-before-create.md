---
title: Reuse before Create
type: Constraint
status: stable
capability: reuse-gate
---

# Constraint

Every BUILD task must pass Engineering Preflight.

CREATE is allowed only when `create_allowed: true` after REUSE / ADAPT analysis.

Forbidden: blind code generation without EFI Context Pack.
