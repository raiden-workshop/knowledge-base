# oh-my-codex Memory Integration Specification

状态：`Accepted`
文档状态：`Aligned`
实施状态：`Reference runtime implemented; upstream draft PRs open`

最后更新：`2026-04-04`

## 1. Purpose

This document defines the normative integration contract for using `oh-my-codex` with the existing Codex App global memory system.

This specification is intentionally narrower than the design document:

- it defines required behavior
- it defines prohibited behavior
- it defines compliance checks

It does not define implementation details beyond what is needed to preserve system invariants.

## 2. Normative Language

The key words `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` in this document are to be interpreted as requirement levels.

## 3. Scope

This specification applies to:

- `oh-my-codex` workflow execution
- `.omx/**` runtime artifacts
- `oh-my-codex` MCP state and memory tools
- team execution with multiple workers
- AGENTS overlay context injection

This specification does not change the authority model of the existing memory system rooted at:

- `~/.codex/memory/`

In this document, `strict integration mode` means:

- `oh-my-codex` remains a workflow and runtime layer
- formal long-term memory remains exclusively owned by `~/.codex/memory/`

## 4. Authority Model

### 4.1 Formal Long-Term Memory

Formal long-term memory `MUST` have exactly one authority source:

- `~/.codex/memory/global/**`
- `~/.codex/memory/workspaces/<workspace-key>/**`

No `oh-my-codex` file under `.omx/**` may act as a second long-term memory authority.

### 4.2 Runtime and Worker-Run Data

All `.omx/**` data `MUST` be treated as runtime or `worker-run` data by default.

This includes:

- `.omx/state/**`
- `.omx/context/**`
- `.omx/plans/**`
- `.omx/specs/**`
- `.omx/interviews/**`
- `.omx/notepad.md`
- `.omx/logs/**`
- `.omx/team/**`

## 5. Core Invariants

The following invariants `MUST` hold:

1. There is exactly one formal long-term memory authority.
2. Worker-run artifacts do not become formal long-term memory without explicit extraction and promotion.
3. Team workers do not directly write formal long-term memory.
4. Telemetry is not formal long-term memory.
5. Overlay context prefers formal memory outputs over local runtime scratch artifacts.

## 6. File Classification Rules

### 6.1 Files That MUST Be Treated as Worker-Run Data

The following `MUST` be treated as worker-run data:

- `.omx/state/*-state.json`
- `.omx/state/team/**`
- `.omx/context/*.md`
- `.omx/plans/*.md`
- `.omx/specs/*.md`
- `.omx/interviews/*.md`
- `.omx/notepad.md`

### 6.2 Files That MUST NOT Be Treated as Formal Memory

The following `MUST NOT` be treated as formal long-term memory:

- `.omx/project-memory.json`
- `.omx/logs/**`
- HUD state files
- metrics files
- notification payloads
- hook event dumps
- pane capture output

### 6.3 Files That MAY Be Used as Extraction Inputs

The following `MAY` be used as inputs to later extraction or summarization:

- `.omx/plans/*.md`
- `.omx/specs/*.md`
- `.omx/interviews/*.md`
- `.omx/notepad.md`

These files are inputs only. They are not promoted automatically.

## 7. Write Permission Rules

### 7.1 Allowed Writes

`oh-my-codex` workers and runtime `MAY` write:

- current workspace `.omx/**`

### 7.2 Forbidden Writes

`oh-my-codex` workers and runtime `MUST NOT` directly write:

- `~/.codex/memory/global/**/memories/**`
- `~/.codex/memory/workspaces/*/memories/**`

### 7.3 Promotion Trigger Authority

Formal memory extraction or promotion `MUST` be triggered only by:

- the leader
- the main single-thread execution owner
- the external memory pipeline

Team workers `MUST NOT` trigger promotion directly.

## 8. MCP Tool Contract

### 8.1 State Tools

The following state tools `MAY` remain active as execution-state tools:

- `state_read`
- `state_write`
- `state_clear`
- `state_list_active`
- `state_get_status`

These tools operate on runtime state and do not violate the memory authority model.

### 8.2 Notepad Tools

The following notepad tools `MAY` remain active:

- `notepad_read`
- `notepad_write_priority`
- `notepad_write_working`
- `notepad_write_manual`
- `notepad_prune`
- `notepad_stats`

Their meaning `MUST` be interpreted as run-local scratch or hot context only.

### 8.3 Project Memory Tools

The following project memory write operations `MUST NOT` directly write formal memory:

- `project_memory_write`
- `project_memory_add_note`
- `project_memory_add_directive`

In strict integration mode, these operations `SHOULD` either:

- be rejected explicitly, or
- be downgraded to run-local intake artifacts

### 8.4 Project Memory Read Behavior

`project_memory_read` `SHOULD` be redefined to return a summary view built from the formal workspace memory node, not from `.omx/project-memory.json`.

Recommended sources:

- workspace `instructions/repo/GUIDE.md`
- workspace `memories/MEMORY.md`
- workspace `runtime/active_context.md`

## 9. Overlay Contract

The AGENTS overlay `MUST` prioritize formal memory outputs over `oh-my-codex` local memory files.

Recommended read order:

1. `.omx/state/*-state.json`
2. workspace `runtime/active_context.md`
3. workspace `memories/MEMORY.md`
4. workspace `instructions/repo/GUIDE.md`
5. shared guides under `~/.codex/memory/instructions/**`
6. `.omx/notepad.md` priority section as a temporary supplement

`.omx/project-memory.json` `MUST NOT` be the primary overlay source in strict integration mode.

## 10. Team Execution Contract

In team mode:

- workers `MAY` write runtime artifacts
- workers `MUST NOT` write formal memory
- leader `MAY` decide whether a completed phase deserves extraction
- leader `MUST` gate extraction behind verification or phase completion

Recommended extraction trigger points:

- after a verified major phase
- after team terminal completion
- after explicit user instruction to retain or promote a conclusion

## 11. Telemetry Exclusion Contract

The following categories `MUST` be treated as telemetry or archive data:

- BuddyPulse
- HUD output
- raw logs
- status boards
- notifications
- hook payloads
- hook event dumps
- pane capture output

Telemetry `MUST NOT` be loaded as formal long-term memory by default.

## 12. Compliance Checks

An implementation is compliant with this specification only if all of the following are true:

- there is no active formal write path from `project_memory_write` to `.omx/project-memory.json` as project truth
- durable overlay context is primarily sourced from `~/.codex/memory/**`
- team workers cannot write formal memory paths
- state and notepad tools remain usable as runtime facilities
- telemetry remains excluded from formal memory

## 13. References

- [Design: oh-my-codex 与当前记忆系统集成设计](./oh-my-codex-memory-integration-design.md)
- [ADR-001: oh-my-codex 接入当前记忆系统的权威边界](./adr-001-oh-my-codex-memory-integration.md)
- [Development Plan: oh-my-codex 与当前记忆系统集成开发计划](./oh-my-codex-memory-integration-development.md)
- [Review Checklist: oh-my-codex Memory Integration Review Checklist](./oh-my-codex-memory-integration-review-checklist.md)
