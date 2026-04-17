---
title: "Strict integration mode"
type: concept
status: active
created_at: 2026-04-09
updated_at: 2026-04-09
source_refs:
  - ../sources/source-oh-my-codex-memory-integration-executive-summary.md
  - ../sources/source-adr-001-oh-my-codex-memory-integration.md
  - ../sources/source-oh-my-codex-memory-integration-spec.md
  - ../sources/source-oh-my-codex-memory-integration-design.md
related:
  - ../entities/entity-oh-my-codex.md
  - ../concepts/concept-formal-memory-authority.md
  - ../syntheses/synthesis-codex-native-memory-governance-baseline.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - architecture
  - integration
---

# Strict integration mode

## Summary

- `strict integration mode` is the accepted integration contract for using `oh-my-codex` with the existing formal memory system
- Its purpose is to keep workflow/runtime utility without introducing a second durable-memory authority

## Stable Claims

- `~/.codex/memory/` remains the only formal long-term memory authority
- `.omx/**` defaults to runtime or `worker-run` data
- Local project-memory writes must be rejected, downgraded, or treated as non-canonical intake
- Overlay should prefer formal memory outputs over local runtime scratch files
- Runtime refresh bridges should stay narrow, opt-in, and increasingly tied to structured verification evidence

## Risks It Controls

- Dual truth sources
- Unreviewed promotion into durable truth
- Team worker direct writes
- Overlay drift toward local replicas

## Related Pages

- [entity-oh-my-codex](../entities/entity-oh-my-codex.md)
- [concept-formal-memory-authority](./concept-formal-memory-authority.md)
- [concept-verification-evidence-gate](./concept-verification-evidence-gate.md)
- [synthesis-codex-native-memory-governance-baseline](../syntheses/synthesis-codex-native-memory-governance-baseline.md)
- [synthesis-upstream-integration-rollout](../syntheses/synthesis-upstream-integration-rollout.md)
