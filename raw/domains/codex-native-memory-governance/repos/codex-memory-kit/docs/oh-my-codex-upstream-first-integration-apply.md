# oh-my-codex Upstream First Integration Apply Guide

状态：`Active`
文档状态：`Aligned`
实施状态：`Multiple patches exported, pushed to fork, and draft PRs opened`

最后更新：`2026-04-04`

## 1. Patch 位置

当前已导出的 patch 文件：

- [oh-my-codex-upstream-strict-formal-memory.patch](../patches/oh-my-codex-upstream-strict-formal-memory.patch)
- [0001-strict-formal-memory-adapter.patch](../patches/0001-strict-formal-memory-adapter.patch)
- [oh-my-codex-upstream-strict-memory-refresh-bridge.patch](../patches/oh-my-codex-upstream-strict-memory-refresh-bridge.patch)
- [0002-strict-memory-refresh-bridge.patch](../patches/0002-strict-memory-refresh-bridge.patch)
- [oh-my-codex-upstream-team-complete-memory-refresh.patch](../patches/oh-my-codex-upstream-team-complete-memory-refresh.patch)
- [0003-team-complete-memory-refresh.patch](../patches/0003-team-complete-memory-refresh.patch)
- [oh-my-codex-upstream-team-verification-evidence-gate.patch](../patches/oh-my-codex-upstream-team-verification-evidence-gate.patch)
- [0004-team-verification-evidence-gate.patch](../patches/0004-team-verification-evidence-gate.patch)

这些 patch 对应的是本机 upstream clone 上已经验证过的四条 strict-memory runtime 接入线：

- 第一批：strict formal-memory adapter
- 第四批：session-end refresh bridge
- 第五批：team-complete refresh bridge
- 第六批：team verification evidence gate

其中：

- `oh-my-codex-upstream-strict-formal-memory.patch` 是工作树 diff 版
- `0001-strict-formal-memory-adapter.patch` 是基于真实 commit `f9c84a5` 导出的 format-patch 版
- `oh-my-codex-upstream-strict-memory-refresh-bridge.patch` 是第四批相对 `origin/main` 的工作树 diff 版
- `0002-strict-memory-refresh-bridge.patch` 是第四批 commit `7e1b309` 的 format-patch 版
- `oh-my-codex-upstream-team-complete-memory-refresh.patch` 是第五批相对第四批 commit `7e1b309` 的增量 diff
- `0003-team-complete-memory-refresh.patch` 是第五批 commit `5586da0` 的 format-patch 版
- `oh-my-codex-upstream-team-verification-evidence-gate.patch` 是第六批相对第五批 commit `5586da0` 的增量 diff
- `0004-team-verification-evidence-gate.patch` 是第六批 commit `8b89da5` 的 format-patch 版

## 2. Patch 范围

第一批 patch 只覆盖以下上游文件：

- `src/mcp/memory-server.ts`
- `src/hooks/agents-overlay.ts`
- `src/hooks/__tests__/agents-overlay.test.ts`
- `src/integration/formal-memory.ts`
- `src/integration/__tests__/formal-memory.test.ts`
- `src/mcp/__tests__/memory-server-strict-mode.test.ts`

目标是把最核心的 strict-memory 约束先接进：

- upstream MCP memory server
- upstream AGENTS overlay

第四批 patch 主要覆盖：

- `src/cli/index.ts`
- `src/cli/__tests__/formal-memory-refresh.test.ts`

目标是把 strict-memory refresh bridge 以 opt-in、best-effort、worker-skip 方式接进 `postLaunch`。

第五批 patch 主要覆盖：

- `src/integration/formal-memory-refresh.ts`
- `src/cli/index.ts`
- `src/team/runtime-cli.ts`
- `src/team/__tests__/runtime-cli.test.ts`

目标是把 refresh helper 抽成共享模块，并把 leader-side refresh 扩到 `runtime-cli` 的 `phase=complete` 路径。

第六批 patch 主要覆盖：

- `src/team/state.ts`
- `src/team/team-ops.ts`
- `src/team/runtime.ts`
- `src/team/runtime-cli.ts`
- `src/team/__tests__/runtime.test.ts`
- `src/team/__tests__/runtime-cli.test.ts`

目标是把 upstream 已有的 `team-verify` 结论落成 team-level `verification-state.json` artifact，并把 team-complete refresh 真正 gate 到 verified evidence 上。

## 3. 应用方式

如果只应用第一批，在目标 `oh-my-codex` clone 根目录执行：

```bash
git apply <archive-root>/patches/oh-my-codex-upstream-strict-formal-memory.patch
```

如果更偏好使用 `git am` 导入第一批 commit 级 patch：

```bash
git am <archive-root>/patches/0001-strict-formal-memory-adapter.patch
```

如果需要先检查第一批是否可干净应用：

```bash
git apply --check <archive-root>/patches/oh-my-codex-upstream-strict-formal-memory.patch
```

当前这一步已经在一份干净本地 clone 上验证通过。

如果要继续应用第四批 session-end refresh bridge：

```bash
git apply <archive-root>/patches/oh-my-codex-upstream-strict-memory-refresh-bridge.patch
```

或：

```bash
git am <archive-root>/patches/0002-strict-memory-refresh-bridge.patch
```

如果要在第四批之上继续应用第五批 team-complete refresh bridge，推荐直接用增量 patch：

```bash
git apply <archive-root>/patches/oh-my-codex-upstream-team-complete-memory-refresh.patch
```

或：

```bash
git am <archive-root>/patches/0003-team-complete-memory-refresh.patch
```

注意：

- 第五批是堆叠在第四批之上的增量 patch，不应直接跳过第四批单独应用
- 如果 reviewer 只想看 team-complete 这层变化，最清晰的是基于第四批 branch/commit 查看 `7e1b309..5586da0`

如果要在第五批之上继续应用第六批 verification evidence gate，推荐直接用增量 patch：

```bash
git apply <archive-root>/patches/oh-my-codex-upstream-team-verification-evidence-gate.patch
```

或：

```bash
git am <archive-root>/patches/0004-team-verification-evidence-gate.patch
```

注意：

- 第六批是堆叠在第五批之上的增量 patch，不应跳过第五批直接单独应用
- 如果 reviewer 只想看 verification gate 这层变化，最清晰的是基于第五批 branch/commit 查看 `5586da0..8b89da5`

## 4.1 当前远端状态

本机 upstream clone 当前已有本地 branch 和 commit：

- branch：`codex/strict-formal-memory-adapter`
- commit：`f9c84a5`

当前 GitHub 远端状态已经完成推进：

- 已通过 `gh auth login --web` 登录 GitHub CLI
- 当前 GitHub 账号：`k08847672-web`
- 已创建 fork：`https://github.com/k08847672-web/oh-my-codex`
- 已 push branch：`codex/strict-formal-memory-adapter`
- 已创建 upstream draft PR：
  `https://github.com/Yeachan-Heo/oh-my-codex/pull/1220`

后续又补了第四批和第五批 PR：

- 第四批 draft PR：
  `https://github.com/Yeachan-Heo/oh-my-codex/pull/1235`
- 第五批 draft PR：
  `https://github.com/Yeachan-Heo/oh-my-codex/pull/1236`
- 第六批 draft PR：
  `https://github.com/Yeachan-Heo/oh-my-codex/pull/1238`

因此目前有三种可行交付方式：

- 直接 review 当前 draft PR
- 直接使用本地 branch/commit
- 或直接使用本目录下导出的 patch / format-patch artifact

推荐 review 顺序：

1. `#1220`
2. `#1228`
3. `#1233`
4. `#1235`
5. `#1236`
6. `#1238`

其中 `#1236` 和 `#1238` 都应被视为 stacked follow-up，顺序是先看 `#1235`，再看 `#1236`，最后看 `#1238`。

## 4. 应用后验证

第一批应用后验证：

```bash
npm install
npm run build
node --test \
  dist/integration/__tests__/formal-memory.test.js \
  dist/mcp/__tests__/memory-server.test.js \
  dist/mcp/__tests__/memory-server-strict-mode.test.js \
  dist/hooks/__tests__/agents-overlay.test.js
```

第四批应用后验证：

```bash
npm run build
node --test \
  dist/cli/__tests__/formal-memory-refresh.test.js \
  dist/cli/__tests__/index.test.js \
  dist/cli/__tests__/lifecycle-notifications.test.js
```

第五批应用后验证：

```bash
npm run build
node --test \
  dist/cli/__tests__/formal-memory-refresh.test.js \
  dist/team/__tests__/runtime-cli.test.js \
  dist/cli/__tests__/index.test.js
```

第六批应用后验证：

```bash
npm run build
node --test dist/team/__tests__/runtime-cli.test.js
node --test --test-name-pattern "monitorTeam keeps phase in team-verify when completed code tasks lack verification evidence" dist/team/__tests__/runtime.test.js
```

## 5. 当前预期结果

应用后，strict mode 下应满足：

- `project_memory_read` 读取 formal workspace memory summary
- `project_memory_write` 显式 deny
- `project_memory_add_note` downgrade 到 `.omx/memory-intake.jsonl`
- `project_memory_add_directive` downgrade 到 `.omx/memory-intake.jsonl`
- `agents-overlay` 优先读取 formal memory summary
- `postLaunch` 可在 strict mode 下按需触发 session-end refresh
- `runtime-cli` 可在 team `complete` 终态按需触发 leader-side refresh
- `runtime-cli` 只有在 team-level verification artifact 已达到 `verified` 时才会调度 team-complete refresh

## 6. 已知 wider-suite 状态

当前本机 clone 上还额外跑过一轮更宽的 `mcp + hooks` 回归。

结论：

- `744` 个测试中 `737` 个通过
- 剩余 `7` 个失败集中在 `notify-hook` / `notify-fallback watcher` / `tmux heal`
- 当前没有证据表明这些失败和本 patch 直接相关

因此建议：

- 先按本 patch 的定向验证通过与否判断 patch 本身
- 再把 wider-suite failure 当作单独 baseline 问题处理

## 7. 关联文档

- [oh-my-codex Upstream First Integration Status](oh-my-codex-upstream-first-integration-status.md)
- [oh-my-codex Memory Integration Executive Summary](oh-my-codex-memory-integration-executive-summary.md)
- [oh-my-codex 与当前记忆系统集成开发计划](oh-my-codex-memory-integration-development.md)
