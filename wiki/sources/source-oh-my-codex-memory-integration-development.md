---
title: "oh-my-codex Memory Integration Development"
type: source
status: active
created_at: 2026-04-09
updated_at: 2026-04-11
source_refs:
  - ../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/oh-my-codex-memory-integration-development.md
related:
  - ../entities/entity-codex-memory-kit.md
  - ../entities/entity-oh-my-codex.md
  - ../syntheses/synthesis-upstream-integration-rollout.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - workflow
  - integration
---

# oh-my-codex Memory Integration Development

## Source Snapshot

- Source kind: `development-plan`
- Raw copy: [integration-development](../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/oh-my-codex-memory-integration-development.md)
- Archived retained modules: [src](../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/src) and [test](../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/test)
- Last updated in source: `2026-04-07`

## Why It Matters

- This source links the governance model to actual retained modules, deleted runtime surface, and recommended next execution order
- It is the best bridge between abstract architecture and the code or PR work that remains active
- The merged workspace now preserves the exact local implementation surface that this source describes as the kept governance layer

## Key Claims

- The local repository keeps only the governance layer and intentionally deletes its broader custom runtime surface
- Upstream integration remains active because it is needed to make formal memory authority real in `oh-my-codex`
- The recommended next sequence is to push the six upstream PRs through review rather than revive the deleted local runtime

## Related Pages

- [entity-codex-memory-kit](../entities/entity-codex-memory-kit.md)
- [entity-oh-my-codex](../entities/entity-oh-my-codex.md)
- [synthesis-upstream-integration-rollout](../syntheses/synthesis-upstream-integration-rollout.md)
