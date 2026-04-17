---
title: "Codex-native memory governance"
type: concept
status: active
created_at: 2026-04-09
updated_at: 2026-04-11
source_refs:
  - ../sources/source-codex-memory-kit-readme.md
  - ../sources/source-oh-my-codex-memory-integration-executive-summary.md
  - ../sources/source-oh-my-codex-memory-integration-design.md
related:
  - ../entities/entity-codex-memory-kit.md
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

# Codex-native memory governance

## Summary

- This concept positions the repository as a governance layer that fills long-term memory gaps around authority, promotion, and verification
- It assumes Codex App already owns native execution/runtime capabilities and should remain the default for those surfaces
- The merged workspace now keeps the archived repository snapshot as a traceable artifact home for governance docs, retained modules, tests, and patch sets

## Stable Claims

- The project should supplement Codex App rather than recreate its native loop and runtime
- Formal memory needs explicit scope, authority, and promotion controls
- Governance is most valuable at the boundary between runtime artifacts and durable truth
- Upstream rollout should preserve that narrow scope instead of reopening a wider custom runtime surface
- Preserved implementation modules and patch artifacts are reference surfaces for governance and review, not a signal to revive the deleted local runtime

## Why It Exists

- Native workflow execution alone does not define a durable memory authority model
- Without governance, runtime artifacts and local project-memory replicas can drift into second-truth systems
- The merged repository needs one place where durable governance rules and archived implementation artifacts stay legible together

## Related Pages

- [entity-codex-memory-kit](../entities/entity-codex-memory-kit.md)
- [concept-strict-integration-mode](./concept-strict-integration-mode.md)
- [concept-formal-memory-authority](./concept-formal-memory-authority.md)
- [concept-verification-evidence-gate](./concept-verification-evidence-gate.md)
- [synthesis-upstream-integration-rollout](../syntheses/synthesis-upstream-integration-rollout.md)
