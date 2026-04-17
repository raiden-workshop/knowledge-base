# oh-my-codex 与当前记忆系统集成开发计划

状态：`Active`
文档状态：`Aligned`
实施状态：`Governance layer kept; upstream draft PRs open`

最后更新：`2026-04-07`

## 1. 目的

本文档记录这次集成在本仓库中的当前保留实现、已经删减掉的本地 runtime 面、以及继续向真实 `oh-my-codex` 接入时的推荐顺序。

需要特别说明的是：

- 当前仓库已经不再把自己定位成一套本地 multi-agent / harness / MCP runtime
- 当前仓库只保留补原生不足的 memory governance layer
- upstream 接入线仍然保留，因为它服务于 formal memory authority 的真实落地

## 2. 当前保留范围

当前本地保留的重点：

- strict mode 配置与路径解析
- formal memory 读取链路
- overlay 主读取顺序
- formal memory 写路径 guard
- permission gate
- human-in-the-loop checkpoint
- error recovery policy
- verification-state runtime store
- team 写路径与 refresh 权限约束
- `project_memory_*` 兼容层
- memory intake queue
- promotion audit trail
- final promotion gate
- governance facade

当前本地已删除的范围：

- mock memory server / mock state server / unified mock MCP server
- mock MCP CLI / stdio transport
- Feishu bridge
- skills loader
- subagent role model
- observability baseline
- worktree runtime
- hook policy 这类围绕自建 runtime surface 的策略面

## 3. 当前已实现的模块

### 3.1 Strict mode 与 formal memory 读取

已实现文件：

- [src/contracts/strict-integration-mode.js](../src/contracts/strict-integration-mode.js)
- [src/integration/workspace-resolver.js](../src/integration/workspace-resolver.js)
- [src/integration/external-memory.js](../src/integration/external-memory.js)
- [src/integration/project-memory-view.js](../src/integration/project-memory-view.js)
- [src/overlay/build-overlay-context.js](../src/overlay/build-overlay-context.js)

### 3.2 Governance policy 与 team contract

已实现文件：

- [src/policy/path-guard.js](../src/policy/path-guard.js)
- [src/policy/permission-gate.js](../src/policy/permission-gate.js)
- [src/policy/hitl-checkpoints.js](../src/policy/hitl-checkpoints.js)
- [src/policy/error-recovery.js](../src/policy/error-recovery.js)
- [src/policy/legacy-memory-bypass.js](../src/policy/legacy-memory-bypass.js)
- [src/team/team-contract.js](../src/team/team-contract.js)

### 3.3 Runtime governance

已实现文件：

- [src/runtime/agent-startup-context.js](../src/runtime/agent-startup-context.js)
- [src/runtime/guarded-action-runner.js](../src/runtime/guarded-action-runner.js)
- [src/runtime/leader-refresh-trigger.js](../src/runtime/leader-refresh-trigger.js)
- [src/runtime/verification-state.js](../src/runtime/verification-state.js)
- [src/runtime/memory-intake-queue.js](../src/runtime/memory-intake-queue.js)
- [src/runtime/promotion-audit-trail.js](../src/runtime/promotion-audit-trail.js)
- [src/runtime/promotion-gate.js](../src/runtime/promotion-gate.js)
- [src/runtime/project-memory-commands.js](../src/runtime/project-memory-commands.js)
- [src/runtime/state-store.js](../src/runtime/state-store.js)
- [src/runtime/runtime-facade.js](../src/runtime/runtime-facade.js)

## 4. 与最新定位的对应关系

| 方向 | 当前状态 | 说明 |
|---|---|---|
| 长期记忆治理 | 保留 | 这是仓库核心 |
| verification / promotion / refresh gate | 保留 | 这是补原生不足的关键 |
| formal memory authority | 保留 | 这是集成主线 |
| 自建多代理执行面 | 收口 | 交还给 Codex 原生 |
| 自建执行底座 | 收口 | 交还给 Codex 原生 |
| 自建桥接/模拟运行面 | 收口 | 不再作为本地产品面 |

## 5. 当前验证基线

当前应重点验证：

- strict mode
- formal memory 读取与 fallback
- write guard
- legacy source block
- refresh trigger
- HITL
- error recovery
- intake queue
- promotion gate
- audit trail
- verification state
- governance facade

主要测试文件位于：

- [test](../test)

## 6. 上游接入状态

本机 upstream clone `/tmp/oh-my-codex` 仍保留 6 条 draft PR 主线：

1. `#1220` strict formal-memory adapter
2. `#1228` notify/tmux 稳定性修复
3. `#1233` strict-memory prompt/docs surfaces 对齐
4. `#1235` session-end refresh bridge
5. `#1236` team-complete refresh bridge
6. `#1238` verification evidence gate

## 7. 继续推进时的建议顺序

1. 先推动这 6 条 upstream PR review
2. 根据反馈继续收口 verification evidence gate 的真实 runtime 边界
3. 不再恢复本地 mock MCP / 自建 runtime 产品面

## 8. 风险提醒

- 当前本地仓库已经删掉大量自建 runtime 面，如果后续有人仍按旧文档理解，需要及时纠偏
- upstream 接入虽然推进到了 verification evidence gate，但真实主线尚未 merge
- `project_memory_*` 的 non-strict 兼容路径仍然存在，真实接入时要谨慎处理默认值

## 9. 结论

这份开发计划现在服务于一个更窄也更稳定的目标：

- 用本地代码守住 formal memory authority
- 用 verification / promotion / refresh gate 补 Codex 原生不足
- 把 multi-agent / harness 底座交还给 Codex 原生

关联文档：

- [oh-my-codex 与当前记忆系统集成设计](./oh-my-codex-memory-integration-design.md)
- [ADR-001: oh-my-codex 接入当前记忆系统的权威边界](./adr-001-oh-my-codex-memory-integration.md)
- [oh-my-codex Memory Integration Specification](./oh-my-codex-memory-integration-spec.md)
- [oh-my-codex Memory Integration Review Checklist](./oh-my-codex-memory-integration-review-checklist.md)
