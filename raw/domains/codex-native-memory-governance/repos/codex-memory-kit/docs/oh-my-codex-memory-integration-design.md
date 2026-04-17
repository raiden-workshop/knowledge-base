# oh-my-codex 与当前记忆系统集成设计

状态：`Accepted`
文档状态：`Aligned`
实施状态：`Reference runtime implemented; upstream draft PRs open`

最后更新：`2026-04-04`

## 1. 背景

本设计文档用于定义 `oh-my-codex` 接入当前 Codex App 全局记忆系统时的边界、冲突点和最终契约。

当前已经存在一套正式记忆系统，根目录为：

- `~/.codex/memory/`

该系统的核心原则是：

- 正式长期记忆只存在于 `global` 和 `workspace`
- `worker-run` 只保存临时执行状态
- 长期记忆必须经过提炼和治理，而不是由执行线程直接写入

`oh-my-codex` 提供了另一套偏工作流产品化的能力：

- `deep-interview -> ralplan -> team/ralph` 的工作流
- `.omx/state/**` 驱动的模式状态与团队运行时
- `.omx/notepad.md`
- `.omx/project-memory.json`
- AGENTS overlay、HUD、notifications、hooks、MCP server

本设计的目标不是把两套系统并列运行，而是将 `oh-my-codex` 收编为：

- 工作流层
- 执行层
- 团队编排层
- 运行时上下文层

而不是新的正式长期记忆层。

## 2. 设计目标

- 保留 `oh-my-codex` 在工作流和并行编排上的优势
- 保持当前记忆系统作为唯一正式长期记忆权威源
- 避免 `.omx/` 与 `~/.codex/memory/` 双写、双真相源
- 保证多 worker 协作不会直接污染 workspace/global truth
- 让 overlay、runtime context、workflow artifacts 可以为正式记忆提炼提供输入

## 3. 非目标

- 本文档不实施任何代码改动
- 本文档不要求完整复刻 `oh-my-codex` 的原生 memory/notepad 语义
- 本文档不试图把多 worker 运行时直接升级为共享长期记忆协议
- 本文档不将 telemetry、HUD、通知、状态板视为正式记忆

## 4. 当前系统分层

### 4.1 当前正式记忆系统

当前记忆系统采用以下层级：

- `global`
- `workspace`
- `worker-run`
- `archive`

职责拆分：

- `global`：跨项目 durable truth
- `workspace`：项目级 durable truth
- `worker-run`：当前线程/当前 run 的临时状态
- `archive`：归档、追溯、非热路径

### 4.2 oh-my-codex 相关层

`oh-my-codex` 的核心能力分为：

- 工作流：`deep-interview`、`ralplan`、`ralph`、`team`
- 状态：`.omx/state/**`
- 运行时上下文：`.omx/notepad.md`、overlay
- 项目记忆：`.omx/project-memory.json`
- 团队执行：`tmux + worktree + mailbox/task state`
- 遥测：HUD、logs、notifications、hooks

## 5. 核心冲突

### 5.1 双真相源冲突

如果保留 `.omx/project-memory.json` 作为项目长期记忆，同时继续使用 `~/.codex/memory/workspaces/<key>/memories/**`，系统会出现两个项目真相源：

- `.omx/project-memory.json`
- `workspace memories`

这是本设计必须消除的第一冲突。

### 5.2 绕过晋升治理冲突

当前记忆系统要求：

- `worker-run -> workspace`
- `workspace -> global`

必须经过提炼、筛选、候选治理和确认。

而 `oh-my-codex` 的 `project_memory_write` / `project_memory_add_*` 是直接落盘模型，天然绕过候选治理。

### 5.3 多 worker 直接写长期记忆冲突

`omx team` 允许多个 worker 并行工作。如果这些 worker 直接写正式记忆，就会出现：

- 并发写入
- 未确认观察直接进入项目真相
- 难以区分 run-local observation 与 durable fact

这与当前记忆系统“worker-run 只产生观察，不直接产生长期真相”的原则冲突。

### 5.4 Overlay 读取源冲突

`oh-my-codex` 当前 overlay 优先读取：

- `.omx/notepad.md`
- `.omx/project-memory.json`

而当前记忆系统已经存在独立的热路径：

- `runtime/active_context.md`
- `memories/MEMORY.md`
- `instructions/*/GUIDE.md`

如果不改读取优先级，运行时 agent 看到的是旧路径或副本，而不是正式记忆系统提炼后的真相。

## 6. 设计决策

采用 `strict integration mode`。

其定义如下：

- 正式长期记忆唯一权威源：`~/.codex/memory/`
- `.omx/**` 默认全部归类为 `worker-run` 数据
- `oh-my-codex` 负责流程、执行、协调、编排、临时上下文
- 正式长期记忆晋升只能走现有记忆系统管线

下文中如无特殊说明：

- `正式长期记忆` = formal long-term memory
- `权威源` = authority source
- `worker-run 数据` = 当前线程或当前 run 的临时执行数据

一句话描述：

`oh-my-codex` 是执行前端，不是正式记忆后端。

## 7. 权威源与写权限

### 7.1 权威源

唯一正式长期记忆权威源：

- `~/.codex/memory/global/**`
- `~/.codex/memory/workspaces/<workspace-key>/**`

### 7.2 非权威运行时源

以下路径可保留，但不具备正式长期记忆权威性：

- `.omx/state/**`
- `.omx/context/**`
- `.omx/plans/**`
- `.omx/specs/**`
- `.omx/interviews/**`
- `.omx/notepad.md`
- `.omx/logs/**`
- `.omx/team/**`

### 7.3 写权限约束

允许直接写：

- 当前 workspace 下 `.omx/**`

禁止直接写：

- `~/.codex/memory/global/**/memories/**`
- `~/.codex/memory/workspaces/*/memories/**`

允许触发正式记忆提炼：

- leader
- 单 worker 模式下的主执行线程

禁止触发正式记忆晋升：

- team worker
- notification hook
- telemetry sidecar
- HUD watcher

## 8. 数据分类映射

| oh-my-codex 数据 | 当前体系归属 | 是否直接作为长期记忆 | 说明 |
|---|---|---|---|
| `.omx/state/*-state.json` | `worker-run` | 否 | 执行状态机 |
| `.omx/state/team/**` | `worker-run` | 否 | team mailbox/task/heartbeat |
| `.omx/context/*.md` | `worker-run` | 否 | 任务 intake 快照 |
| `.omx/plans/*.md` | `worker-run artifact` | 否 | 计划产物，可后续提炼 |
| `.omx/specs/*.md` | `worker-run artifact` | 否 | spec 产物，可后续提炼 |
| `.omx/interviews/*.md` | `worker-run artifact` | 否 | 访谈记录，可后续提炼 |
| `.omx/notepad.md` `PRIORITY` | `worker-run hot context` | 否 | 临时热上下文 |
| `.omx/notepad.md` `WORKING MEMORY` | `worker-run scratch` | 否 | 临时笔记 |
| `.omx/notepad.md` `MANUAL` | `worker-run scratch` | 否 | 不自动视为 durable truth |
| `.omx/project-memory.json` | 冲突来源 | 否 | 不允许作为权威记忆源 |
| `.omx/logs/*.jsonl` | telemetry/archive | 否 | 排除出长期记忆 |
| HUD/metrics/session files | telemetry/runtime | 否 | 排除出长期记忆 |
| notifications/hooks/OpenClaw | telemetry/ops | 否 | 排除出长期记忆 |

## 9. MCP 工具契约

### 9.1 保留

以下能力与当前体系兼容，应保留：

- `state_read`
- `state_write`
- `state_clear`
- `state_list_active`
- `state_get_status`

原因：

- 这些工具操作的是执行状态，不是正式长期记忆

### 9.2 语义降级后保留

以下能力可以保留，但语义必须改为 run-local：

- `notepad_read`
- `notepad_write_priority`
- `notepad_write_working`
- `notepad_write_manual`
- `notepad_prune`
- `notepad_stats`

解释：

- `notepad` 只作为 `worker-run scratchpad`
- 不直接构成 workspace/global truth

### 9.3 禁止原语义直写

以下能力不能继续按原语义直接写项目正式记忆：

- `project_memory_write`
- `project_memory_add_note`
- `project_memory_add_directive`

### 9.4 替代语义

`project_memory_read` 不再读取 `.omx/project-memory.json`，而应被重新定义为：

- 当前 workspace 正式记忆的运行时 summary 视图

建议聚合来源：

- `instructions/repo/GUIDE.md`
- `memories/MEMORY.md`
- `runtime/active_context.md`

## 10. Overlay 契约

### 10.1 目标

运行时注入给 agent 的上下文必须优先反映正式记忆系统，而不是 `oh-my-codex` 自带的旧 memory/notepad 视图。

### 10.2 建议读取顺序

建议 overlay 读取顺序固定为：

1. `.omx/state/*-state.json`
2. 当前 workspace `runtime/active_context.md`
3. 当前 workspace `memories/MEMORY.md`
4. 当前 workspace `instructions/repo/GUIDE.md`
5. global shared guides
6. `.omx/notepad.md` `PRIORITY` 段作为临时补充

### 10.3 明确排除

overlay 不应把以下内容当作项目权威上下文：

- `.omx/project-memory.json`
- `.omx/logs/**`
- BuddyPulse
- HUD 指标
- hook event dumps
- notification history
- pane capture 文本
- telemetry snapshot

## 11. Team 模式契约

在 `team` 模式下：

- worker 只允许产出观察、任务状态、handoff、scratch、artifact
- worker 不允许写正式 memory
- leader 负责收敛、验证、决定是否触发记忆提炼

允许 worker 写：

- `.omx/state/**`
- `.omx/context/**`
- `.omx/plans/**`
- `.omx/specs/**`
- `.omx/interviews/**`
- `.omx/notepad.md` 或其他 run-local scratch

禁止 worker 写：

- `~/.codex/memory/workspaces/<key>/memories/**`
- `~/.codex/memory/global/memories/**`

## 12. 记忆提炼触发点

正式记忆提炼由现有 memory pipeline 负责。

在 `strict integration mode` 下，建议触发时机：

- 一个关键阶段完成后
- `team` 进入 terminal phase 后
- 用户明确要求“记住/沉淀/以后默认”后

明确不应触发的时机：

- 每次 worker 心跳
- 每条 mailbox 消息
- 每轮 HUD 刷新
- 每次 notepad 变动

## 13. 遥测排除规则

以下内容统一视为 telemetry 或原始日志，不应直接进入长期记忆：

- BuddyPulse
- HUD
- status boards
- raw logs
- hook event dumps
- notification payloads
- pane capture 文本

这些内容最多作为记忆提炼时的旁证，而不是长期记忆正文。

## 14. 统一分层视角

为了把 `Harness` 视角、当前正式记忆系统、以及多 agent 运行时放进同一张图中，本设计采用四层分工：

### 14.1 Knowledge Layer

职责：

- 保存正式长期记忆
- 维护项目 truth 与跨项目 truth
- 承担 candidate -> active 的治理与晋升

唯一权威源：

- `~/.codex/memory/global/**`
- `~/.codex/memory/workspaces/<workspace-key>/**`

### 14.2 Execution Layer

职责：

- 负责工具调用、工作流执行、错误恢复、浏览器操作、MCP 接入
- 为 agent 提供“身体”和“工具”

适合承载的能力：

- `Skills`
- `Hooks`
- `Browser`
- `MCP Servers`
- `Error Recovery`

### 14.3 Coordination Layer

职责：

- 负责团队分工、上下文隔离、mailbox、worktree、leader/worker 契约
- 让多个 agent 可以协作而不直接共享长期记忆写权限

适合承载的能力：

- `Subagents`
- `Teams`
- `worktree isolation`
- mailbox / handoff / team runtime

### 14.4 Policy Layer

职责：

- 负责权限边界、promotion gate、telemetry 排除、review gate、human-in-the-loop
- 决定“什么可以自动化，什么必须收口”

适合承载的能力：

- `permission gate`
- `leader-only refresh trigger`
- `telemetry exclusion`
- `human-in-the-loop`
- `review / approval checkpoints`

一句话收口：

- `Memory System` 负责真相
- `Harness` 负责执行
- `Multi-Agent Runtime` 负责协作
- `Policy Layer` 负责边界

## 15. 能力接入矩阵

| 组件 | 接入建议 | 目标层 | 长期记忆写权限 | 设计约束 |
|---|---|---|---|---|
| `Skills` | 直接接入 | Execution Layer | 无 | 作为可复用工作流，不直接写正式 memory |
| `Subagents` | 直接接入 | Coordination Layer | 无 | 角色最小权限、只写 run-local artifacts |
| `Teams` | 直接接入 | Coordination Layer | 无 | 依赖 leader/worker 契约 |
| `worktree isolation` | 直接接入 | Coordination Layer | 无 | 只负责执行隔离，不触碰长期记忆 |
| `Observability / logs / HUD` | 直接接入 | telemetry/runtime | 无 | 明确排除出正式长期记忆 |
| `Error Recovery` | 直接接入 | Execution Layer | 无 | 失败信息先留在运行时或 artifact |
| `Human-in-the-Loop` | 直接接入 | Policy Layer | 无 | 用于高风险动作和规则替换 |
| `Hooks` | 有条件接入 | Execution + Policy | 无 | 只允许窄 matcher 与确定性动作 |
| `MCP Servers` | 有条件接入 | Execution Layer | 默认无 | memory-like 写能力必须改走外部 memory pipeline |
| `Plugins` | 有条件接入 | Extension Layer | 默认无 | 统一受 policy wrapper 约束 |
| `CLAUDE.md / GUIDE / overlay` | 有条件接入 | Instruction Layer | 只读 | 统一读取顺序，优先正式 memory 输出 |
| `project memory` 风格能力 | 仅兼容保留 | Integration Adapter | 禁止直接写 active memory | 改造成只读 summary 或 candidate intake |
| worker 直写正式 memory | 禁止接入 | - | 禁止 | 与 scope model 冲突 |
| telemetry 自动晋升 memory | 禁止接入 | - | 禁止 | telemetry 只能做旁证 |
| 宽权限 auto-approve hooks | 禁止接入 | - | 禁止 | 容易绕过 permission gate |

### 15.1 取长补短原则

优先保留：

- `Skills`
- `Subagents`
- `Teams`
- `worktree isolation`
- `Observability`
- `Error Recovery`

优先改造后再吸收：

- `Hooks`
- `MCP memory-like tools`
- `Plugins`
- overlay 读取链路

明确不保留其原始语义：

- 第二套 `project memory`
- worker 直接写正式长期记忆
- telemetry 自动晋升为正式记忆
- 宽权限 auto-approve hooks

一句话策略：

- 先拿执行力和协作力
- 保住正式记忆真相层
- 最后才开放受控写回

## 16. 验收标准

接入完成后，必须满足：

- 正式长期记忆只有一个权威源
- `oh-my-codex` 仍可正常执行 workflow、team、state、notepad
- overlay 看到的是当前记忆系统输出，而不是 `oh-my-codex` 自带 project memory
- 多 worker 运行结束后，正式记忆只通过 leader 或主线程触发的提炼更新
- telemetry 与正式记忆路径彻底分离

## 17. 结论

本设计的最终结论是：

- `oh-my-codex` 可以接入
- 但必须作为工作流与运行时系统接入
- 不能与当前 `~/.codex/memory/` 并列成为第二套正式记忆系统

更直接地说：

- 保留它的流程、团队编排、状态管理
- 收回它的正式记忆主权

关联文档：

- [ADR-001: oh-my-codex 接入当前记忆系统的权威边界](./adr-001-oh-my-codex-memory-integration.md)
- [oh-my-codex Memory Integration Specification](./oh-my-codex-memory-integration-spec.md)
- [oh-my-codex 与当前记忆系统集成开发计划](./oh-my-codex-memory-integration-development.md)
- [oh-my-codex Memory Integration Review Checklist](./oh-my-codex-memory-integration-review-checklist.md)
