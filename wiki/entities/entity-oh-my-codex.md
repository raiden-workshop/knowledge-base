---
title: "oh-my-codex"
type: entity
status: active
created_at: 2026-04-09
updated_at: 2026-04-09
source_refs:
  - ../sources/source-oh-my-codex-memory-integration-executive-summary.md
  - ../sources/source-adr-001-oh-my-codex-memory-integration.md
  - ../sources/source-oh-my-codex-memory-integration-design.md
related:
  - ../concepts/concept-strict-integration-mode.md
  - ../concepts/concept-formal-memory-authority.md
  - ../syntheses/synthesis-codex-native-memory-governance-baseline.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - tooling
  - integration
---

# oh-my-codex

## Summary

- `oh-my-codex` is treated in this domain as a workflow/runtime/team orchestration system
- Under the accepted integration model, it must not become a second formal long-term memory authority

## Current Role

- Provides workflow, runtime context, team execution, and temporary state artifacts
- Produces inputs that may later be extracted, reviewed, and promoted through the formal memory pipeline
- Receives the governance model through a staged six-PR upstream rollout rather than a single wide patch

## Boundaries

- `.omx/**` defaults to runtime or `worker-run` data
- Team workers and runtime tools must not directly write formal memory
- Local project-memory replicas must not outrank formal workspace/global memory outputs

## Related Pages

- [concept-strict-integration-mode](../concepts/concept-strict-integration-mode.md)
- [concept-formal-memory-authority](../concepts/concept-formal-memory-authority.md)
- [synthesis-codex-native-memory-governance-baseline](../syntheses/synthesis-codex-native-memory-governance-baseline.md)
