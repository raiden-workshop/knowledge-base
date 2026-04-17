# oh-my-codex Memory Integration Executive Summary

状态：`Active`
文档状态：`Aligned`
实施状态：`Governance layer kept; upstream draft PRs open`

最后更新：`2026-04-07`

## 一句话结论

`oh-my-codex` 可以接入，但只能作为 workflow/runtime/team orchestration 层接入，不能成为第二套正式长期记忆系统。

当前本地仓库也已经按这个原则收口：只保留 **Codex-native memory governance layer**，不再保留自建 multi-agent / harness / MCP runtime。

## 核心边界

- 正式长期记忆唯一权威源仍然是 `~/.codex/memory/`
- `.omx/**` 默认全部视为 `worker-run` 数据
- `oh-my-codex` 保留流程、执行、编排、临时上下文能力
- 正式长期记忆提炼继续走现有 memory pipeline

## 当前本地保留的实现

当前仓库现在只保留补原生不足的治理层：

- `strict integration mode` 配置与路径解析
- formal memory 读取、workspace resolver、overlay 主读取链路
- formal memory 写路径 guard、team 写路径 guard、permission gate、HITL checkpoint
- verification evidence gate、leader-only refresh trigger、error recovery
- memory intake queue、promotion audit trail、final promotion gate
- `project_memory_*` compatibility layer
- governance facade

当前不再保留的本地产品面：

- mock MCP server / stdio transport / CLI
- Feishu bridge
- skills loader / subagent role model / worktree runtime / observability baseline

## 为什么这样收口

因为 Codex App 原生已经提供了这些能力：

- thread / history / resume / compaction
- `AGENTS.md` 分层指令
- subagents / worktrees
- approvals / sandbox / network controls
- harness / agent loop

所以本地仓库不应该再重复造这些底座，而应该只保留：

- 长期记忆治理
- refresh / promotion gate
- verification evidence
- formal memory authority

## 当前验证基线

- `npm test` 当前应以治理层测试为主
- `/tmp/oh-my-codex` 本机 upstream clone 已完成多批真实接入验证
- 当前已形成 6 条 upstream draft PR，并补齐了 review notes、review summary 与 reviewer 导航 comment

## 上游主线

当前 upstream 接入仍然沿这条主线推进：

1. strict formal-memory adapter
2. notify/tmux 稳定性修复
3. strict-memory prompt/docs surfaces 对齐
4. session-end refresh bridge
5. team-complete refresh bridge
6. verification evidence gate

## 当前还没做完的部分

- 真实上游接入还没有走到 reviewer feedback 收敛后的 ready-to-merge 阶段
- 是否继续把 verification evidence gate 扩到更宽 runtime / promotion surface，还需要等 upstream 反馈

## 当前文档包怎么用

如果只想快速理解，按这个顺序看：

1. 本文
2. ADR
3. 规范文档
4. 设计文档
5. 开发计划
6. upstream review summary / review notes
7. review checklist

## 关联文档

- [ADR-001: oh-my-codex 接入当前记忆系统的权威边界](./adr-001-oh-my-codex-memory-integration.md)
- [oh-my-codex Memory Integration Specification](./oh-my-codex-memory-integration-spec.md)
- [oh-my-codex 与当前记忆系统集成设计](./oh-my-codex-memory-integration-design.md)
- [oh-my-codex 与当前记忆系统集成开发计划](./oh-my-codex-memory-integration-development.md)
- [oh-my-codex Memory Integration Review Checklist](./oh-my-codex-memory-integration-review-checklist.md)
- [oh-my-codex Upstream Review Summary](./oh-my-codex-upstream-review-summary.md)
- [oh-my-codex Upstream Review Notes](./oh-my-codex-upstream-review-notes.md)
