# oh-my-codex Memory Integration Review Checklist

状态：`Active`
文档状态：`Aligned`
实施状态：`Reference runtime implemented; upstream draft PRs open`

用途：后续真正实施前、实施中、实施后用于 review 和验收。

最后更新：`2026-04-04`

术语约定：

- `formal memory` = `正式长期记忆`
- `worker-run` = 当前线程或当前 run 的临时执行数据
- `strict integration mode` = 单一正式长期记忆权威源模式

## 1. 文档前置检查

- [ ] 已阅读设计文档
- [ ] 已阅读规范文档
- [ ] 已阅读开发计划
- [ ] 已阅读 ADR-001
- [ ] 本次改动目标没有超出文档约束

## 2. 权威源检查

- [ ] 当前方案仍然只认 `~/.codex/memory/` 为正式长期记忆权威源
- [ ] 没有新增第二个 formal memory authority
- [ ] `.omx/project-memory.json` 没有继续作为项目正式记忆真相源

## 3. `.omx` 分层检查

- [ ] `.omx/state/**` 被视为 worker-run state
- [ ] `.omx/context/**` 被视为 worker-run context artifact
- [ ] `.omx/plans/**` 被视为 planning artifact，不直接算长期记忆
- [ ] `.omx/specs/**` 被视为 spec artifact，不直接算长期记忆
- [ ] `.omx/interviews/**` 被视为 interview artifact，不直接算长期记忆
- [ ] `.omx/notepad.md` 被视为 scratchpad / hot context
- [ ] `.omx/logs/**` 被视为 telemetry 或 archive

## 4. MCP 工具检查

- [ ] `state_*` 工具仍然可用
- [ ] `state_*` 工具没有越权写 formal memory
- [ ] `notepad_*` 工具仍然可用
- [ ] `notepad_*` 工具的语义已明确为 run-local scratch
- [ ] `project_memory_write` 在 strict mode 下被拒绝或降级
- [ ] `project_memory_add_note` 在 strict mode 下不再直写 formal memory
- [ ] `project_memory_add_directive` 在 strict mode 下不再直写 formal memory
- [ ] `project_memory_read` 返回的是外部正式记忆 summary，而不是 `.omx/project-memory.json`

## 5. Overlay 检查

- [ ] overlay 优先读取 workspace `runtime/active_context.md`
- [ ] overlay 优先读取 workspace `memories/MEMORY.md`
- [ ] overlay 优先读取 workspace `instructions/repo/GUIDE.md`
- [ ] overlay 优先读取 shared guides
- [ ] `.omx/notepad.md` 只作为 temporary supplement
- [ ] `.omx/project-memory.json` 不再是 overlay 主数据源

## 6. Team 模式检查

- [ ] team worker 不能直接写 formal memory
- [ ] team worker 只能写 runtime artifacts
- [ ] leader 才能决定是否触发正式记忆提炼
- [ ] 提炼触发点位于 phase completion 或 terminal completion 之后
- [ ] 没有在 heartbeat、mailbox 或 HUD 刷新时触发正式提炼

## 7. Telemetry 排除检查

- [ ] BuddyPulse 没有被当作正式记忆
- [ ] HUD 输出没有被当作正式记忆
- [ ] raw logs 没有被当作正式记忆
- [ ] notifications 没有被当作正式记忆
- [ ] hooks payload 没有被当作正式记忆
- [ ] pane capture 没有被当作正式记忆

## 8. 写路径检查

- [ ] 当前改动没有引入新的 formal memory 直写路径
- [ ] team worker 无法写 `~/.codex/memory/workspaces/*/memories/**`
- [ ] team worker 无法写 `~/.codex/memory/global/memories/**`
- [ ] 只有 leader 或主执行线程可触发 memory refresh

## 9. 路径解析检查

- [ ] 当前 workspace 已注册时，能够正确解析 workspace node
- [ ] 当前 workspace 未注册时，行为有清晰 fallback
- [ ] 外部 memory root 不存在时，错误行为清晰可诊断

## 10. 测试检查

- [ ] 有针对 strict mode 的单元测试
- [ ] 有针对 memory server 的单元测试
- [ ] 有针对 overlay 读取顺序的测试
- [ ] 有针对 team worker 写权限边界的测试
- [ ] 有针对 telemetry exclusion 的测试或验证步骤

## 11. 回归风险检查

- [ ] 没有破坏 `oh-my-codex` 的 workflow 主路径
- [ ] 没有破坏 `state`/`team` 运行时
- [ ] 没有让 overlay 丢失必要的 hot context
- [ ] 没有让 notepad 完全失去 scratch 价值

## 12. 交付前确认

- [ ] 本次变更仍然符合 ADR-001
- [ ] 本次变更仍然符合规范文档中的 `MUST / MUST NOT`
- [ ] 变更说明中明确区分了 runtime data 与 formal memory
- [ ] 如有新配置项，文档已更新
- [ ] 如有新路径约定，文档已更新

## 13. 最终通过标准

只有当以下条件同时满足时，本次集成改动才可视为通过：

- [ ] 正式长期记忆仍然只有一个权威源
- [ ] `.omx/**` 与 formal memory 的边界清晰
- [ ] team worker 不会污染 formal memory
- [ ] overlay 已切换到当前记忆系统热路径
- [ ] telemetry 与 formal memory 分离
- [ ] 所有必要文档已同步
