# oh-my-codex Verification Evidence Gate Design

状态：`Accepted`
文档状态：`Aligned`
实施状态：`Implemented in reference runtime`

最后更新：`2026-04-04`

## 1. 背景

当前 reference runtime 与 upstream patch 已经具备：

- `phase=terminal` 的 refresh gate
- `verificationStatus=verified` 的 refresh / promotion gate
- leader-only 的正式记忆 refresh 触发权限

但系统仍然缺一个稳定的 verification evidence source。

当前问题不是“没有 verify team”，而是：

- `verified` 主要还是一个调用参数
- 没有统一的 runtime artifact 来承接验证证据
- refresh 与 promotion 还不能优先读取结构化验证结果

因此，当前最值得补的不是新的 team role，而是一个 evidence-based verify gate。

## 2. 核心决策

采用 `verification-state` 方案，而不是先引入专门的 `team verify`。

一句话描述：

- 先让系统根据验证证据决策
- 再决定是否需要专门的 verify team

其基本原则是：

- 验证先落成 runtime artifact
- `verified` 由 evidence 支撑，而不是只靠调用参数
- worker 可以提交验证观察，但不能最终签署 `verified`
- refresh / promotion 优先读取 verification artifact

## 3. 设计目标

- 在没有独立 verify team 的情况下，也能形成稳定的 verification gate
- 保持现有 `leader-only refresh trigger` 和 `promotion gate` 结构不变
- 不把验证结果直接变成 formal long-term memory
- 允许未来平滑扩展到 peer verify 或 verify subagent

## 4. 非目标

- 本设计不要求新增独立 verify team
- 本设计不要求把 verification artifact 暴露成 mock MCP tool
- 本设计不把验证结果自动晋升为正式长期记忆
- 本设计不改变 formal memory 的 authority model

## 5. 数据模型

verification artifact 默认写到：

- `.omx/state/verification-state.json`

它属于：

- runtime data
- worker-run evidence

而不是：

- workspace truth
- global truth

建议数据结构：

```json
{
  "status": "pending",
  "scope": ["tests", "runtime", "diff-review"],
  "commands": ["npm test"],
  "evidence": [
    {
      "kind": "test",
      "summary": "98/98 passed",
      "command": "npm test",
      "observed_by": "leader",
      "created_at": "2026-04-04T00:00:00Z"
    }
  ],
  "notes": "No blocking findings.",
  "verified_by": "leader",
  "verified_at": "2026-04-04T00:00:00Z",
  "updated_at": "2026-04-04T00:00:00Z"
}
```

## 6. 状态机

允许状态：

- `pending`
- `verified`
- `failed`
- `stale`

语义：

- `pending`：已有验证活动，但尚未形成可晋升结论
- `verified`：验证通过，可作为 refresh / promotion 的正向证据
- `failed`：验证失败，当前不应自动 refresh
- `stale`：旧验证结果已过期，需要重新验证

## 7. 写权限

### 7.1 Worker

worker `MAY`：

- 追加 verification evidence
- 提交验证观察

worker `MUST NOT`：

- 最终把状态标成 `verified`
- 直接触发 formal memory refresh

### 7.2 Leader / Main

leader 或 main `MAY`：

- 追加 verification evidence
- 将 verification state 标为 `verified`
- 将 verification state 标为 `failed` / `stale`
- 在 terminal + verified 条件下触发 refresh 或 promotion

## 8. 与现有 gate 的关系

### 8.1 Refresh Gate

`leader-refresh-trigger` 应优先读取 `.omx/state/verification-state.json`。

推荐优先级：

1. verification artifact 中的 `status`
2. 显式传入的 `verificationStatus`
3. 兼容默认值

这意味着：

- 如果 artifact 明确是 `pending` / `failed` / `stale`，refresh 不应因为调用方传了 `verified` 就直接放行
- artifact 应该成为更可信的 runtime evidence source

### 8.2 Promotion Gate

`promotion-gate` 不直接发明自己的 verification 语义，而是复用 refresh gate 的 resolved verification status。

也就是说：

- promotion 是否允许，本质上仍由 refresh gate 和现有 authority gate 决定
- 只是 verification 输入从“裸参数”升级为“artifact 优先”

## 9. 兼容策略

为了避免一次性打断已有调用，第一阶段采用兼容模式：

- 如果 verification artifact 存在，优先读取 artifact
- 如果 verification artifact 不存在，退回现有 `verificationStatus` 参数
- 如果两者都没有，再使用当前默认值

这样做的目的是：

- 不破坏现有测试和调用面
- 同时给后续 caller 提供正式迁移目标

## 10. 运行时接口建议

reference runtime 应新增 dedicated verification API，而不是只鼓励直接操作通用 `state_*`。

建议接口：

- `readVerificationState()`
- `appendVerificationEvidence()`
- `markVerificationStatus()`
- `resolveVerificationStatus()`

补充接口：

- `markVerified()`
- `markFailed()`
- `markPending()`
- `markStale()`

## 11. 为什么先不做 Verify Team

如果现在直接引入 verify team，会立刻遇到两个问题：

1. 需要先定义新的角色、调度、交接和工作流
2. 即使有 verify team，没有结构化 evidence source，最终仍然只能回写一个脆弱结论

先做 evidence gate 的好处是：

- leader 自验证已经能跑通
- 未来 verify subagent 只要往同一个 artifact 写证据即可
- 从“角色依赖”转成“证据依赖”

## 12. 分阶段落地建议

### Phase A

先补：

- `.omx/state/verification-state.json`
- verification runtime store
- refresh / promotion 读取 artifact

### Phase B

再补：

- dedicated facade API
- dedicated tests
- reserved-state guard，避免 raw `state_write` 绕开 verification policy

### Phase C

最后再考虑：

- peer verify
- verify subagent
- 更显式的 `team-verify -> complete` evidence gate

## 13. 成功标准

只有当以下条件同时成立时，这次设计才算落地成功：

- 没有 verify team 时，leader/main 仍可形成结构化验证证据
- worker 不能把 verification state 直接签成 `verified`
- refresh / promotion 会优先读取 verification artifact
- verification artifact 仍被视为 runtime data，而不是 formal memory
- 兼容路径存在，不会立即打断现有调用

## 14. 关联文档

- [oh-my-codex 与当前记忆系统集成开发计划](oh-my-codex-memory-integration-development.md)
- [oh-my-codex 与当前记忆系统集成设计](oh-my-codex-memory-integration-design.md)
- [oh-my-codex Memory Integration Specification](oh-my-codex-memory-integration-spec.md)
- [oh-my-codex Upstream First Integration Status](oh-my-codex-upstream-first-integration-status.md)
