# codex-memory-kit

## 中文

`codex-memory-kit` 现在只保留一件核心事情：

**补 Codex App 原生机制不足的长期记忆治理层。**

这些能力优先直接使用 Codex App 原生机制：

- thread / history / resume / compaction
- `AGENTS.md` 分层指令
- subagents / worktrees
- approvals / sandbox / network controls
- harness / agent loop

本仓库当前保留的是：

- formal long-term memory 的 scope 和 authority 规则
- `global / workspace / worker-run` 的边界
- strict integration mode
- candidate / promotion / audit / verification evidence gate
- formal memory read path、workspace resolver、overlay、refresh / promotion control

一句话说，它现在是一个 **Codex-native memory governance layer**。

### 快速开始

```bash
git clone <repo-url>
cd codex-memory-kit
npm install
npm test
```

### 怎么用

1. 在 Codex 原生线程、subagents、worktrees 上直接工作
2. 用本仓库的规则和代码保护 formal memory authority
3. 通过 verification / promotion / refresh gate 管理长期记忆沉淀

### 不分享的内容

- 个人 `/Users/<you>/.codex/memory/` 原始记忆树
- token、SSH key、浏览器 cookie
- 运行时临时状态

## English

`codex-memory-kit` now keeps one core responsibility:

**a supplemental memory-governance layer for what Codex App does not natively govern well enough.**

Those should stay native to Codex App:

- thread history, resume, fork, and compaction
- layered `AGENTS.md` instructions
- subagents and worktrees
- approvals, sandbox, and network controls
- the Codex harness / agent loop

What remains in this repo:

- formal long-term memory scope and authority rules
- `global / workspace / worker-run` boundaries
- strict integration mode
- candidate / promotion / audit / verification evidence gates
- formal memory read path, workspace resolution, overlay, and refresh / promotion control

In short: this repository is now a **Codex-native memory governance layer**.

### Quick Start

```bash
git clone <repo-url>
cd codex-memory-kit
npm install
npm test
```

## Documentation

- [Docs Index](./docs/README.md)
- [Raiden Lab Repository Map](./docs/raiden-lab-repository-map.md)
