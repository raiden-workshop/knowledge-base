---
title: "ADR-001: oh-my-codex Authority Boundary"
type: source
status: active
created_at: 2026-04-09
updated_at: 2026-04-09
source_refs:
  - ../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/adr-001-oh-my-codex-memory-integration.md
related:
  - ../entities/entity-oh-my-codex.md
  - ../concepts/concept-strict-integration-mode.md
  - ../concepts/concept-formal-memory-authority.md
  - ../syntheses/synthesis-codex-native-memory-governance-baseline.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - architecture
  - governance
---

# ADR-001: oh-my-codex Authority Boundary

## Source Snapshot

- Source kind: `adr`
- Raw copy: [adr-001](../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/adr-001-oh-my-codex-memory-integration.md)
- Decision date: `2026-04-04`
- Status in source: `Accepted`

## Why It Matters

- This source records the accepted architectural decision that eliminates dual truth sources
- It is the strongest short source for why `.omx/project-memory.json` must not become formal project memory

## Key Claims

- `oh-my-codex` is an execution/workflow front-end, not the formal memory backend
- `~/.codex/memory/` remains the only formal long-term memory authority
- Team workers must not directly write formal memory

## Related Pages

- [entity-oh-my-codex](../entities/entity-oh-my-codex.md)
- [concept-strict-integration-mode](../concepts/concept-strict-integration-mode.md)
- [concept-formal-memory-authority](../concepts/concept-formal-memory-authority.md)
- [synthesis-codex-native-memory-governance-baseline](../syntheses/synthesis-codex-native-memory-governance-baseline.md)
