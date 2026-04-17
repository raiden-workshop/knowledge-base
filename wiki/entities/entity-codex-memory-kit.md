---
title: "codex-memory-kit"
type: entity
status: active
created_at: 2026-04-09
updated_at: 2026-04-11
source_refs:
  - ../sources/source-codex-memory-kit-readme.md
  - ../sources/source-raiden-workshop-repository-map.md
  - ../sources/source-oh-my-codex-memory-integration-executive-summary.md
related:
  - ../concepts/concept-codex-native-memory-governance.md
  - ../syntheses/synthesis-codex-native-memory-governance-baseline.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - tooling
  - governance
---

# codex-memory-kit

## Summary

- `codex-memory-kit` is the repository-level embodiment of this domain's current governance model
- It is positioned as a supplement to Codex App native mechanisms, not as a replacement runtime or second memory backend

## Current Role

- Defines authority and scope rules for formal long-term memory
- Preserves the existing `~/.codex/memory/` tree as the only formal authority
- Adds governance around refresh, promotion, verification, and workspace resolution
- Carries the local planning and reviewer packet that stages the same governance model into upstream `oh-my-codex` patches
- Serves as the current main public repository inside the wider planned `raiden-workshop` repo layout
- Preserves the archived raw snapshot, retained modules, tests, and patch artifacts that reviewers or implementers still need after consolidation

## Boundaries

- Should not duplicate Codex App native thread/worktree/harness capabilities
- Should not turn workflow telemetry or `.omx/**` artifacts into automatic durable truth
- Should not treat the preserved raw snapshot as permission to reopen the deleted broader local runtime surface

## Related Pages

- [concept-codex-native-memory-governance](../concepts/concept-codex-native-memory-governance.md)
- [synthesis-codex-native-memory-governance-baseline](../syntheses/synthesis-codex-native-memory-governance-baseline.md)
