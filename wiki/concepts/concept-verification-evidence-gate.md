---
title: "Verification evidence gate"
type: concept
status: active
created_at: 2026-04-09
updated_at: 2026-04-11
source_refs:
  - ../sources/source-oh-my-codex-verification-evidence-gate-design.md
  - ../sources/source-oh-my-codex-upstream-review-summary.md
  - ../sources/source-oh-my-codex-upstream-first-integration-status.md
related:
  - ../concepts/concept-formal-memory-authority.md
  - ../concepts/concept-strict-integration-mode.md
  - ../syntheses/synthesis-upstream-integration-rollout.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - verification
  - governance
---

# Verification evidence gate

## Summary

- Verification evidence gate means refresh and promotion decisions are supported by a structured runtime artifact rather than a loose `verified` flag alone

## Stable Claims

- Verification evidence should remain runtime data, not formal memory
- Workers may contribute evidence, but final `verified` authority belongs to leader or main execution ownership
- Refresh and promotion should prefer structured verification state over bare caller parameters
- This gate narrows runtime behavior without broadening the durable-memory authority model
- The evidence gate is already part of the staged upstream integration wave, not just a local design sketch

## Practical Meaning

- `.omx/state/verification-state.json` is treated as evidence, not truth
- The evidence gate lets the system become more auditable before introducing a dedicated verify team
- It is a better fit for the governance model than inventing a second verification memory surface
- Status and rollout material now make the gate reviewable as an active upstream concern rather than only a future refinement

## Related Pages

- [concept-formal-memory-authority](./concept-formal-memory-authority.md)
- [concept-strict-integration-mode](./concept-strict-integration-mode.md)
- [synthesis-upstream-integration-rollout](../syntheses/synthesis-upstream-integration-rollout.md)
