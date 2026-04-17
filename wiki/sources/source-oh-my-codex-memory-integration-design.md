---
title: "oh-my-codex Memory Integration Design"
type: source
status: active
created_at: 2026-04-09
updated_at: 2026-04-09
source_refs:
  - ../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/oh-my-codex-memory-integration-design.md
related:
  - ../entities/entity-oh-my-codex.md
  - ../concepts/concept-codex-native-memory-governance.md
  - ../concepts/concept-strict-integration-mode.md
  - ../concepts/concept-formal-memory-authority.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - architecture
  - integration
---

# oh-my-codex Memory Integration Design

## Source Snapshot

- Source kind: `design`
- Raw copy: [integration-design](../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/oh-my-codex-memory-integration-design.md)
- Last updated in source: `2026-04-04`
- Status in source: `Accepted`

## Why It Matters

- This source explains the conflict model behind the later ADR and specification
- It is the best early source for understanding why direct project-memory writes and overlay precedence would break the authority model

## Key Claims

- The design goal is to keep `oh-my-codex` as workflow/runtime/team orchestration rather than a second durable-memory system
- The core conflicts are dual truth sources, bypassed promotion governance, direct worker writes, and overlay source drift
- `strict integration mode` resolves these conflicts by preserving one formal authority and classifying `.omx/**` as runtime data

## Related Pages

- [entity-oh-my-codex](../entities/entity-oh-my-codex.md)
- [concept-codex-native-memory-governance](../concepts/concept-codex-native-memory-governance.md)
- [concept-strict-integration-mode](../concepts/concept-strict-integration-mode.md)
- [concept-formal-memory-authority](../concepts/concept-formal-memory-authority.md)
