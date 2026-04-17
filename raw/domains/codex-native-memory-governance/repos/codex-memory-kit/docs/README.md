# Docs Index

当前目录现在聚焦一件事：

- 以正式长期记忆治理为核心的设计、规范、实现和上游集成资料

新的总定位是：

- 默认底座：Codex App 原生 thread、subagents、worktrees、approvals、sandbox、harness
- 本仓库核心：memory governance layer
- 不再保留自建 multi-agent / harness / MCP runtime 的对外产品面

## Canonical Terms

- `正式长期记忆`：当前 Codex App memory system 中的 formal long-term memory
- `权威源`：formal long-term memory 的唯一 authority source
- `worker-run 数据`：当前线程或当前 run 的临时执行数据
- `strict integration mode`：workflow/runtime 可以接入，但正式长期记忆仍由 `~/.codex/memory/` 独占
- `Codex-native`：优先使用 Codex App 原生的 thread、subagents、worktrees、approvals、sandbox 与 harness
- `governance facade`：本仓库对外保留的最小代码入口，用于 formal memory、verification、promotion、refresh 治理

## Core Reading

- [oh-my-codex Memory Integration Executive Summary](./oh-my-codex-memory-integration-executive-summary.md)
- [ADR-001: oh-my-codex 接入当前记忆系统的权威边界](./adr-001-oh-my-codex-memory-integration.md)
- [oh-my-codex Memory Integration Specification](./oh-my-codex-memory-integration-spec.md)
- [oh-my-codex 与当前记忆系统集成设计](./oh-my-codex-memory-integration-design.md)
- [oh-my-codex 与当前记忆系统集成开发计划](./oh-my-codex-memory-integration-development.md)
- [oh-my-codex Verification Evidence Gate Design](./oh-my-codex-verification-evidence-gate-design.md)

## Upstream Integration

- [oh-my-codex Upstream First Integration Status](./oh-my-codex-upstream-first-integration-status.md)
- [oh-my-codex Upstream First Integration Apply Guide](./oh-my-codex-upstream-first-integration-apply.md)
- [oh-my-codex Upstream Review Notes](./oh-my-codex-upstream-review-notes.md)
- [oh-my-codex Upstream Review Summary](./oh-my-codex-upstream-review-summary.md)
- [oh-my-codex Memory Integration Review Checklist](./oh-my-codex-memory-integration-review-checklist.md)

## Naming And Repo Planning

- [Raiden Lab Naming Convention](./raiden-lab-naming-convention.md)
- [Raiden Lab Repository Map](./raiden-lab-repository-map.md)

## Kept Code Surface

当前仓库保留的代码入口主要用于：

- strict integration mode
- formal memory 读取链路
- verification / promotion gate
- refresh / promotion control
- governance facade

主要入口：

- [package.json](../package.json)
- [src](../src)
- [test](../test)

## Reading Order

1. 先看 executive summary
2. 再看 ADR 和规范文档
3. 再看设计与开发计划
4. 再看 verification evidence gate
5. 想对外分享时再看 quickstart / usage
6. 要跟进 upstream 时再看 status / review notes / apply guide

## Current Status

- 文档已按“Codex-native memory governance layer”重新收口定位
- 长期记忆治理、write guard、verification evidence gate、promotion gate 相关实现已经落成
- 本地代码面已经收口为补原生不足的治理层
- 本机 upstream clone 已完成多批 strict-memory 相关验证，并形成 6 条 draft PR
- 当前剩余主线是推动这些 PR review，并决定哪些窄接入约束值得继续 upstream
