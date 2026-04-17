---
title: "Codex-native memory governance baseline"
type: synthesis
status: active
created_at: 2026-04-09
updated_at: 2026-04-11
source_refs:
  - ../sources/source-codex-memory-kit-readme.md
  - ../sources/source-oh-my-codex-memory-integration-executive-summary.md
  - ../sources/source-adr-001-oh-my-codex-memory-integration.md
  - ../sources/source-oh-my-codex-memory-integration-spec.md
  - ../sources/source-oh-my-codex-memory-integration-design.md
related:
  - ../entities/entity-codex-memory-kit.md
  - ../entities/entity-oh-my-codex.md
  - ../concepts/concept-codex-native-memory-governance.md
  - ../concepts/concept-strict-integration-mode.md
  - ../concepts/concept-formal-memory-authority.md
  - ../concepts/concept-verification-evidence-gate.md
  - ../syntheses/synthesis-upstream-integration-rollout.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - architecture
  - governance
---

# Codex-native memory governance baseline

## Current Thesis

- `codex-memory-kit` should be understood as a governance layer that complements Codex App native execution/runtime features
- `oh-my-codex` may participate as workflow/runtime/team orchestration, but must not become a second formal memory authority
- The core invariant is one formal long-term memory authority rooted in `~/.codex/memory/`

## Supporting Picture

- Repository-level positioning narrows scope to governance, promotion, verification, and authority control
- The ADR converts that positioning into an accepted architectural decision
- The specification turns the decision into normative constraints on writes, overlay behavior, and team execution
- The design document explains the conflict model that makes those constraints necessary
- The merged workspace now preserves the archived repo snapshot, retained JS reference modules, tests, and patch artifacts as traceable governance support material

## Stable Baseline Conclusions

- Runtime data, telemetry, notepads, and local project-memory replicas are not durable truth by default
- Promotion into formal memory must be explicit and gated
- Overlay order matters because reading a local replica as truth recreates a second authority even without direct writes
- The domain is about governance boundaries, not about rebuilding a whole alternative agent runtime
- Archived implementation and patch artifacts may remain as reviewable support material without changing the governance-first scope

## Open Questions

- How much of the verification evidence gate should remain local versus move upstream
- Which review and implementation documents should be treated as next-tier canonical sources
- When this workspace grows further, which helper should come after the current `hot.md` and `reports/` layer

## Related Pages

- [entity-codex-memory-kit](../entities/entity-codex-memory-kit.md)
- [entity-oh-my-codex](../entities/entity-oh-my-codex.md)
- [concept-codex-native-memory-governance](../concepts/concept-codex-native-memory-governance.md)
- [concept-strict-integration-mode](../concepts/concept-strict-integration-mode.md)
- [concept-formal-memory-authority](../concepts/concept-formal-memory-authority.md)
- [concept-verification-evidence-gate](../concepts/concept-verification-evidence-gate.md)
- [synthesis-upstream-integration-rollout](./synthesis-upstream-integration-rollout.md)
