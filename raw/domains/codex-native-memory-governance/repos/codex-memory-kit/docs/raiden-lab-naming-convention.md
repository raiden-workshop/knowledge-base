# Raiden Lab Naming Convention

状态：`Active`
文档状态：`Aligned`
实施状态：`Saved to local memory`

最后更新：`2026-04-07`

## 目的

这份文档固定后续项目与仓库命名规则，避免以后每次起名都重新讨论。

说明：

- 文件名保留 `raiden-lab` 是为了不打断已有链接
- 当前实际 GitHub 组织名已经更新为 `raiden-workshop`

当前约定是：

- 组织名：`raiden-workshop`
- 项目仓库名：优先使用功能型、短而明确的 `kebab-case`

## 命名原则

1. 不使用个人邮箱、用户名、token 痕迹
2. 不用一次性临时代号做长期仓库名
3. 仓库名优先表达功能，组织名表达归属
4. 新项目尽量保持短、清晰、可扩展

## 推荐模式

### 核心系统

- `codex-memory-kit`
- `raiden-memory`
- `raiden-harness`
- `raiden-multi-agent`

### 扩展与集成

- `raiden-feishu-bridge`
- `raiden-mcp-tools`
- `raiden-browser-bridge`
- `raiden-notifications`

### 实验与原型

- `raiden-workshop-notes`
- `raiden-sandbox`
- `raiden-prototypes`

## 当前项目归属

当前公开仓库 `codex-memory-kit` 属于这套命名体系中的核心项目。

推荐对外理解方式：

- 组织：`raiden-workshop`
- 仓库：`codex-memory-kit`

## 后续默认规则

以后如果没有特别说明，默认按下面方式起名：

- 组织名优先：`raiden-workshop`
- 仓库名优先：`raiden-<domain>` 或 `codex-memory-kit`
- 新增集成类仓库优先用功能名，不用个人名
