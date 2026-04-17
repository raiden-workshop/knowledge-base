---
title: "Upstream integration rollout"
type: synthesis
status: active
created_at: 2026-04-09
updated_at: 2026-04-11
source_refs:
  - ../sources/source-oh-my-codex-memory-integration-development.md
  - ../sources/source-oh-my-codex-upstream-review-summary.md
  - ../sources/source-oh-my-codex-verification-evidence-gate-design.md
  - ../sources/source-oh-my-codex-upstream-first-integration-status.md
related:
  - ../entities/entity-codex-memory-kit.md
  - ../entities/entity-oh-my-codex.md
  - ../concepts/concept-codex-native-memory-governance.md
  - ../concepts/concept-strict-integration-mode.md
  - ../concepts/concept-formal-memory-authority.md
  - ../concepts/concept-verification-evidence-gate.md
  - ./synthesis-upstream-reviewer-packet.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - workflow
  - integration
---

# Upstream integration rollout

## Current Thesis

- The governance model is being rolled into upstream `oh-my-codex` through a staged six-PR chain, not a single broad rewrite
- The rollout is intentionally narrow: first harden formal-memory boundaries, then add opt-in refresh bridges, then tighten them with verification evidence
- Review order is part of the design because later PRs stack on earlier semantic guarantees

## Rollout Shape

- Local scope has already been narrowed so the repository keeps governance and deletes broader custom runtime surfaces
- The upstream review sequence starts from the strict formal-memory adapter, then stabilizes notify or tmux test behavior, then aligns prompt or docs surfaces
- Only after those read-path and surface changes does the rollout open runtime refresh paths, first at session end, then at leader-side team completion
- Verification evidence gate is the final tightening layer so refresh depends on evidence rather than a fragile caller flag
- The merged workspace keeps the retained governance modules, tests, and patch artifacts needed to inspect this rollout without reviving the deleted local runtime

## Stable Conclusions

- Upstream work is about enforcing one memory authority, not introducing a second memory subsystem
- Stacked PR ordering matters because `#1236` depends on `#1235`, and `#1238` depends on `#1236`
- Notify or tmux stability belongs in a separate patch line so it does not blur the semantics of the core memory adapter
- Verification artifact design strengthens refresh and promotion governance while keeping evidence in runtime space
- The preserved patch set and retained local modules make the rollout reviewable from the merged workspace itself

## Current Status

- The first integration wave already exists as six draft PRs and reviewer materials, not just as private local planning
- Implementation status, review packet documents, checklist, apply guidance, and review notes now provide enough material for canonical knowledge about rollout shape and review procedure
- The workspace now also preserves the exact patch artifacts and retained local modules that those rollout materials reference

## Open Questions

- Which of the remaining reviewer-support documents deserve canonical source pages next
- How far verification evidence gating should expand beyond the current team-complete refresh path
- Which additional helper or report, if any, should come after the current `hot.md` and reports layer

## Related Pages

- [concept-codex-native-memory-governance](../concepts/concept-codex-native-memory-governance.md)
- [concept-strict-integration-mode](../concepts/concept-strict-integration-mode.md)
- [concept-formal-memory-authority](../concepts/concept-formal-memory-authority.md)
- [concept-verification-evidence-gate](../concepts/concept-verification-evidence-gate.md)
- [synthesis-codex-native-memory-governance-baseline](./synthesis-codex-native-memory-governance-baseline.md)
- [synthesis-upstream-reviewer-packet](./synthesis-upstream-reviewer-packet.md)
