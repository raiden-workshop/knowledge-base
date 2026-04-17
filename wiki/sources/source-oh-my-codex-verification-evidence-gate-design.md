---
title: "oh-my-codex Verification Evidence Gate Design"
type: source
status: active
created_at: 2026-04-09
updated_at: 2026-04-09
source_refs:
  - ../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/oh-my-codex-verification-evidence-gate-design.md
related:
  - ../concepts/concept-verification-evidence-gate.md
  - ../concepts/concept-formal-memory-authority.md
  - ../syntheses/synthesis-upstream-integration-rollout.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - verification
  - architecture
---

# oh-my-codex Verification Evidence Gate Design

## Source Snapshot

- Source kind: `design`
- Raw copy: [verification-evidence-gate-design](../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/oh-my-codex-verification-evidence-gate-design.md)
- Last updated in source: `2026-04-04`
- Status in source: `Accepted`

## Why It Matters

- This source explains how verification becomes evidence-based without promoting runtime verification artifacts into formal memory
- It is the key source for understanding why `verified` should be supported by a structured artifact instead of a loose parameter

## Key Claims

- Verification evidence should live as runtime data in `.omx/state/verification-state.json`
- Workers may append evidence but must not unilaterally mark the state as `verified`
- Refresh and promotion should prefer the verification artifact over bare caller parameters

## Related Pages

- [concept-verification-evidence-gate](../concepts/concept-verification-evidence-gate.md)
- [concept-formal-memory-authority](../concepts/concept-formal-memory-authority.md)
- [synthesis-upstream-integration-rollout](../syntheses/synthesis-upstream-integration-rollout.md)
