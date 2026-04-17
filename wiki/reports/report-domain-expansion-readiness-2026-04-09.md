---
title: "Domain Expansion Readiness Report 2026-04-09"
type: report
status: active
created_at: 2026-04-09
updated_at: 2026-04-09
source_refs: []
related:
  - ../index.md
  - ../overview.md
  - ../hot.md
  - ../domains/domain-codex-native-memory-governance.md
  - ./report-lint-2026-04-09.md
  - ./report-source-priority-2026-04-09.md
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - maintenance
  - domain-planning
---

# Domain Expansion Readiness Report 2026-04-09

## Purpose

- This report decides when the independent workspace should admit a second domain
- The goal is to keep the cross-project shell deliberate instead of letting adjacent projects drift into the founding domain

## Current Judgment

- The workspace is now structurally ready for multiple domains
- The knowledge graph is not yet usage-ready for a second domain
- The right next move is to use the current founding domain in real work and collect repeated cross-project questions first

## Domain Admission Rule

Admit a new domain only when all of the following are true:

1. Repeated questions appear that clearly do not belong inside `Codex-native memory governance`
2. The new topic has at least a small coherent source bundle instead of one isolated document
3. The topic is likely to be reused by more than one worker or more than one project
4. The topic can be described by a short domain registry page without borrowing the founding domain's thesis
5. The expected benefit of canonicalization is higher than the cost of another permanent domain surface

## Candidate Backlog

These are candidates inferred from the current `<projects-root>` workspace layout.
This is an operational inference, not a confirmed roadmap.

### Candidate A: `memory system`

- Why it is plausible:
  - It is adjacent to the founding domain and already intersects with formal memory authority questions
  - It could become the first strong second domain if recurring tasks shift from governance posture to memory-system implementation itself
- Why it is not admitted yet:
  - The current knowledge graph already captures the governance layer without needing a separate implementation domain
  - No repeated cross-project query pattern has yet forced a split

### Candidate B: `codexpulse`

- Why it is plausible:
  - It appears to be a separate project with its own likely product or telemetry surface
- Why it is not admitted yet:
  - The current workspace has no canonical source bundle for it
  - No stable relation to the founding domain has been defined

### Candidate C: `Release Check`

- Why it is plausible:
  - It appears to be a standalone operational project
- Why it is not admitted yet:
  - The current workspace has no seed sources and no repeated query evidence

### Candidate D: `Return Management`

- Why it is plausible:
  - It appears to be another project-scale topic rather than a support artifact
- Why it is not admitted yet:
  - The current workspace has no seed sources and no repeated query evidence

## Recommended Expansion Sequence

1. Stay with one domain until repeated usage shows a real boundary problem
2. If a new recurring topic emerges, write a new report first instead of creating canonical pages immediately
3. If the report confirms a real domain need, add a `wiki/domains/domain-<slug>.md` page
4. Seed sources into `raw/`
5. Only then create new canonical source, entity, concept, and synthesis pages

## What Not To Do

- Do not add a second domain because another project directory exists
- Do not mix implementation-heavy material into the founding domain if it really deserves its own domain
- Do not create empty domain registry pages just to make the workspace look more multi-domain

## Recommendation

- Treat the workspace as a cross-project shell with one mature domain
- Use this report as the gate before adding a second domain
- Re-run this report after real usage reveals a stable second cluster of questions
