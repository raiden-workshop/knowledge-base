# ADR-001: oh-my-codex 接入当前记忆系统的权威边界

状态：`Accepted`
文档状态：`Aligned`
实施状态：`Reference runtime implemented; upstream draft PRs open`

日期：`2026-04-04`

## 背景

当前环境已经存在一套正式的 Codex App 全局记忆系统，根目录为：

- `~/.codex/memory/`

这套系统已经定义了清晰的作用域与责任边界：

- `global`：跨项目 durable truth
- `workspace`：项目级 durable truth
- `worker-run`：当前线程或当前 run 的临时状态

与此同时，`oh-my-codex` 自带了另一套偏 workflow/runtime 的本地状态与记忆设施，包括：

- `.omx/state/**`
- `.omx/notepad.md`
- `.omx/project-memory.json`
- AGENTS overlay
- team runtime / mailbox / task state

如果直接把两套系统并列使用，会出现以下问题：

- 项目长期记忆出现双真相源
- 多 worker 可能直接写长期记忆
- overlay 可能读取到副本而不是真正权威上下文
- telemetry 与正式记忆之间的边界变模糊

## 决策

我们决定：

- 将 `oh-my-codex` 定位为工作流层、执行层、团队编排层和运行时层
- 将当前 `~/.codex/memory/` 保持为唯一正式长期记忆权威源
- 将 `.omx/**` 默认全部视为 `worker-run` 数据
- 禁止 `oh-my-codex` 直接将 `.omx/project-memory.json` 作为正式项目记忆权威源
- 禁止 team worker 直接写 formal memory
- 将正式长期记忆的提炼与晋升继续交给现有 memory pipeline

本 ADR 的落地模式统一称为：

- `strict integration mode`

一句话描述本决策：

`oh-my-codex` 是执行前端，不是正式记忆后端。

## 决策细化

### 1. 权威源

唯一正式长期记忆权威源是：

- `~/.codex/memory/global/**`
- `~/.codex/memory/workspaces/<workspace-key>/**`

### 2. worker-run 边界

以下内容默认归入 `worker-run`：

- `.omx/state/**`
- `.omx/context/**`
- `.omx/plans/**`
- `.omx/specs/**`
- `.omx/interviews/**`
- `.omx/notepad.md`
- `.omx/logs/**`

### 3. memory write 边界

`project_memory_write`、`project_memory_add_note`、`project_memory_add_directive` 不再允许按“正式项目记忆”语义直接落盘。

### 4. overlay 边界

运行时 overlay 必须优先读取当前正式记忆系统输出，而不是 `oh-my-codex` 的本地 project memory 副本。

### 5. team 边界

team worker 只产生：

- observation
- handoff
- task state
- scratch
- workflow artifacts

team worker 不产生：

- workspace active memory
- global active memory

## 结果

### 正面结果

- 消除了双真相源
- 保留了 `oh-my-codex` 在 workflow/team/runtime 方面的价值
- 多 worker 与正式长期记忆治理解耦
- overlay 可统一到当前正式记忆系统热路径

### 代价

- 不能直接沿用 `oh-my-codex` 的原生 `project-memory` 语义
- 需要额外的兼容适配层
- 后续实施时需要补 strict mode、路径解析和测试

## 被否决的备选方案

### 备选方案 A

保留两套长期记忆系统并列运行。

否决原因：

- 双真相源不可接受
- 一旦内容漂移，很难定义谁说了算

### 备选方案 B

完全抛弃当前正式记忆系统，改由 `oh-my-codex` 接管记忆。

否决原因：

- 会破坏当前已经建立的 `global / workspace / worker-run` 治理模型
- 会把长期记忆治理退化成 run-local 直写

### 备选方案 C

允许 team worker 直接写 workspace memory，只做后置审计。

否决原因：

- 并发写长期记忆风险太高
- worker-run observation 和 durable truth 的边界会立刻失效

## 后续影响

后续若实施本 ADR，需要遵循：

- 先统一读取路径
- 再收口写入路径
- 最后接入 leader-only 的提炼触发

关联文档：

- [oh-my-codex 与当前记忆系统集成设计](./oh-my-codex-memory-integration-design.md)
- [oh-my-codex Memory Integration Specification](./oh-my-codex-memory-integration-spec.md)
- [oh-my-codex 与当前记忆系统集成开发计划](./oh-my-codex-memory-integration-development.md)
- [oh-my-codex Memory Integration Review Checklist](./oh-my-codex-memory-integration-review-checklist.md)
