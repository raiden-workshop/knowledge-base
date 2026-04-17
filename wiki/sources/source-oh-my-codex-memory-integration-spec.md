---
title: "oh-my-codex Memory Integration Specification"
type: source
status: active
created_at: 2026-04-09
updated_at: 2026-04-09
source_refs:
  - ../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/oh-my-codex-memory-integration-spec.md
related:
  - ../concepts/concept-strict-integration-mode.md
  - ../concepts/concept-formal-memory-authority.md
  - ../syntheses/synthesis-codex-native-memory-governance-baseline.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - architecture
  - integration
---

# oh-my-codex Memory Integration Specification

## Source Snapshot

- Source kind: `spec`
- Raw copy: [integration-spec](../../raw/domains/codex-native-memory-governance/repos/codex-memory-kit/docs/oh-my-codex-memory-integration-spec.md)
- Last updated in source: `2026-04-04`
- Status in source: `Accepted`

## Why It Matters

- This is the normative contract for the integration model
- It specifies required behavior, prohibited behavior, and compliance checks

## Key Claims

- Formal long-term memory must have exactly one authority source
- `.omx/**` data is runtime or `worker-run` by default
- `project_memory_*` write operations must not directly create formal memory in strict integration mode
- Overlay should prefer formal memory outputs over local runtime scratch artifacts

## Related Pages

- [concept-strict-integration-mode](../concepts/concept-strict-integration-mode.md)
- [concept-formal-memory-authority](../concepts/concept-formal-memory-authority.md)
- [synthesis-codex-native-memory-governance-baseline](../syntheses/synthesis-codex-native-memory-governance-baseline.md)
