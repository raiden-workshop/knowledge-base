# Raiden Lab Repository Map

状态：`Active`
文档状态：`Aligned`
实施状态：`Saved to local memory`

最后更新：`2026-04-07`

## 目的

这份文档把未来可能出现的仓库做一个统一规划，方便后续拆分和扩展。

说明：

- 文件名保留 `raiden-lab` 是为了不打断已有链接
- 当前实际 GitHub 组织名已经更新为 `raiden-workshop`

## 组织定位

`raiden-workshop` 是一个用于承载三类能力的组织名：

- 记忆系统
- multi-agent 协调系统
- harness / runtime 执行系统

## 仓库命名规则

默认规则：

- 组织名：`raiden-workshop`
- 仓库名：`raiden-<domain>` 或核心项目名 `codex-memory-kit`
- 仓库名尽量短、功能明确、可横向扩展

## 建议仓库分层

### 1. 核心运行时

- `codex-memory-kit`：Codex-native memory governance 主仓库
- `raiden-memory`：记忆系统的实验与实现
- `raiden-harness`：执行层、工具层和 protocol layer
- `raiden-multi-agent`：协作编排、leader/worker、team runtime

### 2. 集成连接层

- `raiden-feishu-bridge`
- `raiden-mcp-tools`
- `raiden-browser-bridge`
- `raiden-notifications`

### 3. 试验与记录

- `raiden-sandbox`
- `raiden-prototypes`
- `raiden-workshop-notes`

## 当前主仓库

当前公开仓库：

- [codex-memory-kit](https://github.com/raiden-workshop/codex-memory-kit)

它是整个 `raiden-workshop` 体系里的主入口项目。

## 使用建议

如果后续要继续拆项目，优先按下面方式落位：

1. 先判断它属于记忆层、协作层还是执行层
2. 再决定是放进 `codex-memory-kit` 还是拆成独立仓库
3. 新仓库统一使用 `raiden-` 前缀，避免个人化命名

## 默认落名策略

以后如果没有特别说明，默认按以下方式处理：

- 核心主仓库继续用 `codex-memory-kit`
- 新增系统仓库优先用 `raiden-<domain>`
- 只有在对外已有明确品牌时，才考虑单独保留业务名
