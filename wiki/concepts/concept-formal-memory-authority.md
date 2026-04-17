---
title: "Formal memory authority"
type: concept
status: active
created_at: 2026-04-09
updated_at: 2026-04-09
source_refs:
  - ../sources/source-adr-001-oh-my-codex-memory-integration.md
  - ../sources/source-oh-my-codex-memory-integration-spec.md
  - ../sources/source-oh-my-codex-memory-integration-design.md
related:
  - ../concepts/concept-strict-integration-mode.md
  - ../syntheses/synthesis-codex-native-memory-governance-baseline.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - governance
  - memory
---

# Formal memory authority

## Summary

- Formal memory authority defines who owns durable truth, where it lives, and which paths are allowed to promote or write it

## Stable Claims

- Formal long-term memory has exactly one authority source rooted in `~/.codex/memory/`
- Runtime artifacts may feed extraction later, but they are not durable truth by default
- Promotion is gated to explicit leaders, main execution owners, or the external memory pipeline
- Team workers must not directly write workspace/global durable memory

## Practical Meaning

- Files like `.omx/project-memory.json`, `.omx/notepad.md`, logs, HUD state, and notifications are not canonical memory
- Any conclusion that enters formal memory must go through an explicit extraction and promotion path
- Verification artifacts may gate refresh or promotion decisions, but they remain runtime evidence rather than durable truth

## Related Pages

- [concept-strict-integration-mode](./concept-strict-integration-mode.md)
- [concept-verification-evidence-gate](./concept-verification-evidence-gate.md)
- [synthesis-codex-native-memory-governance-baseline](../syntheses/synthesis-codex-native-memory-governance-baseline.md)
