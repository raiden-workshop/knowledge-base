---
title: "Knowledge Base Overview"
type: guide
status: active
created_at: 2026-04-09
updated_at: 2026-04-11
source_refs: []
related:
  - domains/domain-codex-native-memory-governance
  - hot
  - index
  - reports/report-drift-review-2026-04-11
  - reports/report-domain-expansion-readiness-2026-04-09
  - reports/report-lint-2026-04-09
  - log
---

# Knowledge Base Overview

## Current Scope

- Stage: `v1`
- Workspace role: `independent cross-project knowledge base`
- Active domains: `1`
- Founding domain: `Codex-native memory governance`
- This workspace complements the global memory system and does not replace it
- Canonical knowledge should always be traceable back to explicit source pages

## Current Working Picture

- This workspace was first rebuilt inside `mult-agent`, then migrated into `/Users/wz/project/knowledge-base` as an independent worker space on `2026-04-09`
- The current cross-project shell intentionally contains one mature founding domain instead of pretending to be fully multi-domain already
- `codex-memory-kit` is positioned as a governance layer that complements Codex App native execution/runtime capabilities
- `strict integration mode` keeps `~/.codex/memory/` as the only formal long-term memory authority
- `.omx/**` and related workflow artifacts are treated as `worker-run` or runtime data by default
- Promotion into formal long-term memory remains gated and must not happen through uncontrolled worker writes
- The second seed wave now covers implementation planning, upstream review order, rollout status, and verification evidence gating
- The third seed wave now covers reviewer checklist, patch apply guidance, detailed review notes, and a lightweight hot path
- A lightweight reports layer now exists for manual lint and health snapshots without introducing heavier `state/` governance
- The docs index now sits inside the canonical graph as a short navigation layer for the current document bundle
- A repository-map support source now sits inside the graph to answer repo-boundary questions without changing the main domain thesis
- A naming-convention support source now sits inside the graph for naming-policy questions, again without changing the main domain thesis
- A second lightweight report now ranks the next candidate sources so future ingest can follow an explicit priority order
- A third lightweight report now defines when the cross-project shell is actually ready to admit a second domain
- The full archived `codex-memory-kit` repository now lives under `raw/domains/codex-native-memory-governance/repos/codex-memory-kit/`, including the retained JS reference modules, tests, and exported upstream patch artifacts
- Manual `kb maintain` and `kb drift-review` commands now provide a lightweight health-and-drift review surface without introducing heavier automation
- A dedicated drift-review report can now capture which canonical pages may need refresh after source changes

## What Counts As Canonical

- Domain registry pages under `wiki/domains/`
- Source summaries under `wiki/sources/`
- Entity pages under `wiki/entities/`
- Concept pages under `wiki/concepts/`
- Cross-source syntheses under `wiki/syntheses/`

## Current Gaps

- The cross-project shell still has only one domain; future domains need explicit registry pages and should be added only when recurring usage justifies them
- A second domain backlog exists only as report-layer guidance; no candidate is admitted yet
- No periodic lint or stale-review automation exists yet, even though manual `maintain` and `drift-review` checks now exist
- No `candidates/` or `state/` helpers exist yet; only a minimal `reports/` layer exists for manual health checks
- There is no remaining high-priority canonical expansion item right now; future ingest should be triggered by actual recurring questions
- The raw source snapshot still contains historical standalone-workspace paths inside some copied source documents; use the merged-repo raw snapshot itself as the current local artifact location

## Next Step

- Use this workspace in real cross-project queries before adding a second domain
- Add more concepts only when the current seed pages are no longer enough to answer recurring questions
- Use `wiki/reports/` to record future lint, drift, or stale-review results before introducing heavier automation
- Use the latest drift-review report before refreshing canonical pages whose support sources changed recently
- Use the source-priority report before expanding the canonical graph with new support docs
- Use the domain-expansion-readiness report before adding a second domain
- Prefer freezing or reviewing this baseline before adding more adjacent support sources
- Add new domains deliberately rather than mixing them into the founding domain graph
