# oh-my-codex Upstream First Integration Status

状态：`Active`
文档状态：`Aligned`
实施状态：`Six draft PRs open; reviewer packet posted`

最后更新：`2026-04-04`

## 1. 目的

本文档记录当前在本机 upstream clone `/tmp/oh-my-codex` 上已经完成的第一批真实接入、验证范围、当前已知非阻塞问题，以及下一步建议。

它不是 reference runtime 的设计文档，而是第一批 upstream patch 的实施状态说明。

截至 `2026-04-04` 晚些时候，这份文档也补充记录了后续拆出的第二到第六批 upstream patch：

- 第一批：strict formal-memory adapter
- 第二批：notify/tmux wider-suite 稳定性修复
- 第三批：strict-memory prompt/documentation surfaces 对齐
- 第四批：strict-memory session-end refresh bridge
- 第五批：team-complete leader-side refresh bridge
- 第六批：team/runtime verification evidence gate

## 2. 已完成的 upstream 接入范围

本轮只覆盖最核心的两条上游读取/写入路径：

- `src/mcp/memory-server.ts`
- `src/hooks/agents-overlay.ts`

为减少侵入性，还新增了一层共享 adapter：

- `src/integration/formal-memory.ts`

这批改动在 strict mode 下实现了以下行为：

- `project_memory_read` 改为读取 formal workspace memory summary，而不是 `.omx/project-memory.json`
- `project_memory_write` 改为显式 deny
- `project_memory_add_note` 改为 downgrade 到 `.omx/memory-intake.jsonl`
- `project_memory_add_directive` 改为 downgrade 到 `.omx/memory-intake.jsonl`
- `agents-overlay` 改为优先读取 formal memory summary
- compaction 提示语改为强调 run-local notepad 和 external refresh pipeline

## 3. 新增与修改的 upstream 文件

当前本机 clone `/tmp/oh-my-codex` 的变更面如下：

- 修改：`/tmp/oh-my-codex/src/mcp/memory-server.ts`
- 修改：`/tmp/oh-my-codex/src/hooks/agents-overlay.ts`
- 修改：`/tmp/oh-my-codex/src/hooks/__tests__/agents-overlay.test.ts`
- 新增：`/tmp/oh-my-codex/src/integration/formal-memory.ts`
- 新增：`/tmp/oh-my-codex/src/integration/__tests__/formal-memory.test.ts`
- 新增：`/tmp/oh-my-codex/src/mcp/__tests__/memory-server-strict-mode.test.ts`

当前 git 交付状态：

- branch：`codex/strict-formal-memory-adapter`
- commit：`f9c84a558a91d75450cf6813f6d5d2a0e71e9d5d`

## 4. 已通过的验证

本机 clone 上已完成：

- `npm install`
- `npm run build`
- 在干净本地 clone 上通过 `git apply --check`

以下定向测试已通过：

- `node --test dist/integration/__tests__/formal-memory.test.js`
- `node --test dist/mcp/__tests__/memory-server.test.js`
- `node --test dist/mcp/__tests__/memory-server-strict-mode.test.js`
- `node --test dist/hooks/__tests__/agents-overlay.test.js`

这组测试当前覆盖：

- strict mode 配置解析
- formal memory 读取与 shared-guide fallback
- intake queue downgrade
- upstream `memory-server` strict read/write/add_note/add_directive 行为
- upstream `agents-overlay` strict formal-memory 优先读取

## 5. 更宽回归的结果

额外跑过一轮更宽的 hooks + mcp 测试集：

- `node --test $(find dist/mcp/__tests__ dist/hooks/__tests__ -name '*.test.js' | sort)`

结果：

- `744` 个测试里 `737` 个通过
- `7` 个失败

这 7 个失败都位于 `notify-hook` / `notify-fallback watcher` / `tmux target healing` 相关测试，当前没有证据显示它们和本轮 strict-memory 改动直接相关。

失败分布：

- `dist/hooks/__tests__/notify-fallback-watcher.test.js`
- `dist/hooks/__tests__/notify-hook-team-leader-nudge.test.js`
- `dist/hooks/__tests__/notify-hook-tmux-heal.test.js`

当前判断：

- 这些失败不在本轮修改文件或直接依赖链上
- 本轮变更的直接受影响区域已经被定向测试验证通过
- 如果后续要提交 upstream patch，建议把这组 wider-suite failure 作为单独 baseline 问题处理，不和 strict-memory patch 混在同一 review 里

### 2026-04-04 再定性结果

后续又补做了一轮更细的基线对比，结论比“有 7 个失败”更清楚：

- 在带 patch 的 branch `/tmp/oh-my-codex@codex/strict-formal-memory-adapter` 上，重新 build 后执行  
  `node --test $(find dist/mcp/__tests__ dist/hooks/__tests__ -name '*.test.js' | sort)`  
  当前复现的是 `4` 个失败，不再是之前记录的 `7` 个失败
- 在干净基线 `/tmp/oh-my-codex-main@main` 上执行同一命令，复现的是 `3` 个失败
- 两边都失败的重叠项包括：
  - `notify-fallback-watcher.test.js` 里的 `runs leader nudge checks from the fallback watcher so stale alerts do not wait for a leader turn`
  - `notify-hook-tmux-heal.test.js` 里的 `falls back to current tmux pane and heals stale session target`
- 失败集合本身会漂移：
  - clean `main` 会失败 `suggests reusing the team when follow-up tasks are pending and worker panes are still reusable`
  - patched branch 这一轮改成失败 `sends immediate all-workers-idle nudge for active team (leader context)` 与 `heals a stale HUD pane target back to the canonical codex pane`
- 把 3 个问题文件单独拿出来跑时，两边都是 `73/73` 全绿
- 再把整套宽测试改成 `--test-concurrency=1` 后，原来的几条失败全部消失，转而变成另一条 `notify-fallback-watcher` 并发语义测试失败：
  - `globally debounces Ralph continue steer across concurrent watcher instances`

当前最稳的定性是：

- 这不是 strict formal-memory patch 引入的稳定功能回归
- 这是 `notify-fallback-watcher` / `notify-hook team leader nudge` / `notify-hook tmux heal` 一带原本就存在的时序型、并发型、跨套件波动问题
- 失败现象主要围绕：
  - fake tmux 未留下预期日志，表现为 `ENOENT tmux.log`
  - pane/heal 解析偶发落到 `target_not_found`
  - leader action / idle guidance 在 `done_waiting_on_leader`、`all_workers_idle`、`launch a new team` 之间漂移
- 这些问题更像测试稳定性或 shared runtime state 争用，而不是 memory-server / agents-overlay patch 面的问题

### 2026-04-04 稳定性修复分支结果

在独立稳定性分支 `/tmp/oh-my-codex-main@codex/notify-hook-test-isolation` 上，后续又单独修了这组 wider-suite 波动，修法分成两层：

- 对 `notify-fallback-watcher`、`notify-hook-team-leader-nudge`、`notify-hook-tmux-heal` 的测试 helper 做更严格的 child env 隔离，不再直接继承整包父进程环境
- 为 notify-hook / tmux 相关外部命令增加 `OMX_NOTIFY_HOOK_COMMAND_TIMEOUT_MS` override，并仅在稳定性测试里拉高 timeout，默认运行时行为保持不变

同时补到了 `notify-hook-team-dispatch` 的同类测试路径，因为第一轮修复后 wider suite 剩余的 2 条失败也落在同样的 tmux log / timeout 症状上。

最终结果：

- 定向问题文件：`73/73` 通过
- `notify-hook-team-dispatch.test.js`：`19/19` 通过
- 更宽 hooks + mcp 测试集：`738/738` 全绿
- 独立稳定性分支：`/tmp/oh-my-codex-main@codex/notify-hook-test-isolation`
- 独立 draft PR：`https://github.com/Yeachan-Heo/oh-my-codex/pull/1228`

对应命令：

- `node --test dist/hooks/__tests__/notify-fallback-watcher.test.js dist/hooks/__tests__/notify-hook-team-leader-nudge.test.js dist/hooks/__tests__/notify-hook-tmux-heal.test.js`
- `node --test dist/hooks/__tests__/notify-hook-team-dispatch.test.js`
- `node --test $(find dist/mcp/__tests__ dist/hooks/__tests__ -name '*.test.js' | sort)`

这说明最开始那组 wider-suite failure 已经不再只是“baseline 波动”，而是已经在独立分支上获得了可重复的稳定修复。

## 6. 当前阻塞与非阻塞项

### 非阻塞

- `memory-server` strict mode 语义与文案已对齐
- `agents-overlay` strict mode 读取源已切换
- 本机 upstream clone 可正常 build
- 直接受影响的测试全部通过
- 已经形成真实 commit，且已导出 patch artifact 与 format-patch artifact

### 仍未完成

- 第五、第六批当前仍是 stacked patch，review 时需要和前一批的依赖关系一起看
- verification evidence gate 目前只收口到 team-complete refresh，还没有继续扩到更宽的 promotion/runtime surface

### 已解决的 GitHub 发布路径

后续又补查了一轮 GitHub 认证路径，当前结论是：

- 已通过 `gh auth login --web` 完成 GitHub CLI 登录
- 当前活跃 GitHub 账号为 `k08847672-web`
- 已创建 fork：`k08847672-web/oh-my-codex`
- 已将本地 branch `codex/strict-formal-memory-adapter` 推到 fork
- 已基于该 branch 对 upstream 打开 draft PR：
  `https://github.com/Yeachan-Heo/oh-my-codex/pull/1220`

这意味着第一批 patch 现在已经从“仅本地提交”推进到“远端可 review 的 draft PR”。

稳定性修复分支当前也已经具备同样的远端 review 路径：

- branch：`codex/notify-hook-test-isolation`
- commit：`754b266`
- fork branch：`k08847672-web:codex/notify-hook-test-isolation`
- draft PR：`https://github.com/Yeachan-Heo/oh-my-codex/pull/1228`

第三批 prompt/documentation surface 对齐分支当前也已经具备独立远端 review 路径：

- branch：`codex/strict-memory-prompt-surfaces`
- commit：`dbab288`
- fork branch：`k08847672-web:codex/strict-memory-prompt-surfaces`
- draft PR：`https://github.com/Yeachan-Heo/oh-my-codex/pull/1233`

第四批 session-end refresh bridge 分支当前也已经具备独立远端 review 路径：

- branch：`codex/strict-memory-refresh-bridge`
- commit：`7e1b309`
- fork branch：`k08847672-web:codex/strict-memory-refresh-bridge`
- draft PR：`https://github.com/Yeachan-Heo/oh-my-codex/pull/1235`
- 定向验证：
  - `npm run build`
  - `node --test dist/cli/__tests__/formal-memory-refresh.test.js dist/cli/__tests__/index.test.js dist/cli/__tests__/lifecycle-notifications.test.js`
- 更宽 `dist/cli/__tests__` 回归仍存在一组与本批无关的 baseline 失败，主要位于 `ask/autoresearch/explore/session/team` 的既有环境与打包路径
- patch artifact：
  - [oh-my-codex-upstream-strict-memory-refresh-bridge.patch](../patches/oh-my-codex-upstream-strict-memory-refresh-bridge.patch)
  - [0002-strict-memory-refresh-bridge.patch](../patches/0002-strict-memory-refresh-bridge.patch)

第五批 team-complete leader-side refresh 分支当前也已经具备远端 review 路径：

- branch：`codex/team-complete-memory-refresh`
- commit：`5586da0`
- fork branch：`k08847672-web:codex/team-complete-memory-refresh`
- draft PR：`https://github.com/Yeachan-Heo/oh-my-codex/pull/1236`
- 定向验证：
  - `npm run build`
  - `node --test dist/cli/__tests__/formal-memory-refresh.test.js dist/team/__tests__/runtime-cli.test.js dist/cli/__tests__/index.test.js`
- 本批实现：
  - 抽出共享 `src/integration/formal-memory-refresh.ts`
  - 保持第四批 `postLaunch` session-end refresh bridge
  - 新增 `runtime-cli` 在 `phase=complete` 时的 leader-side best-effort refresh
  - 新 gate：`OMX_STRICT_MEMORY_REFRESH_ON_TEAM_COMPLETE=1`
- 注意：
  - 这条 PR 是堆叠在 `#1235` 之上的；相对 `main` 的 diff 会包含第四批内容
  - patch artifact：
    - [oh-my-codex-upstream-team-complete-memory-refresh.patch](../patches/oh-my-codex-upstream-team-complete-memory-refresh.patch)
    - [0003-team-complete-memory-refresh.patch](../patches/0003-team-complete-memory-refresh.patch)

第六批 team/runtime verification evidence gate 分支当前也已经具备远端 review 路径：

- branch：`codex/team-verification-evidence-gate`
- commit：`8b89da5`
- fork branch：`k08847672-web:codex/team-verification-evidence-gate`
- draft PR：`https://github.com/Yeachan-Heo/oh-my-codex/pull/1238`
- 定向验证：
  - `npm run build`
  - `node --test dist/team/__tests__/runtime-cli.test.js`
  - `node --test --test-name-pattern "monitorTeam keeps phase in team-verify when completed code tasks lack verification evidence" dist/team/__tests__/runtime.test.js`
- 本批实现：
  - 新增 team-level `verification-state.json` artifact
  - `monitorTeam` 在 phase 演进时同步写出 verification state
  - `runtime-cli` 在 shutdown cleanup 前预读 verification state
  - team-complete refresh 只在 verification artifact 达到 `verified` 时调度
- 注意：
  - 这条 PR 是堆叠在 `#1236` 之上的；相对 `main` 的 diff 会包含第四批和第五批内容
  - patch artifact：
    - [oh-my-codex-upstream-team-verification-evidence-gate.patch](../patches/oh-my-codex-upstream-team-verification-evidence-gate.patch)
    - [0004-team-verification-evidence-gate.patch](../patches/0004-team-verification-evidence-gate.patch)

### 2026-04-04 组合测试残留再定性

在第六批落地后，曾出现过一次组合命令的残留失败：

- `node --test dist/team/__tests__/runtime.test.js dist/team/__tests__/runtime-cli.test.js`

当时失败表现为：

- `runtime-cli.test.js` 里的已有用例 `does not auto-shutdown merely because monitorTeam reaches complete`
- 报错类型为 `ERR_MODULE_NOT_FOUND`
- 目标模块为 `dist/team/runtime.js`

后续又补做了三轮复验：

- `node --test dist/team/__tests__/runtime-cli.test.js`
- `node --test dist/team/__tests__/runtime.test.js dist/team/__tests__/runtime-cli.test.js`
- `node --test dist/team/__tests__/runtime-cli.test.js dist/team/__tests__/runtime.test.js`
- `node --test --test-concurrency=1 dist/team/__tests__/runtime.test.js dist/team/__tests__/runtime-cli.test.js`

当前结果：

- 上述几组命令当前都已通过
- 残留失败目前未能稳定复现
- 失败点位于 `runtime-cli.test.js` 里原本就存在的动态 import 路径，不在第六批新增的 verification gate 代码路径上

当前最稳的定性是：

- 这不是第六批 verification evidence gate 的稳定功能回归
- 更像是 Node test runner / ESM 动态 import / 大套件并发执行下的一次性环境型波动
- 目前应将其记为 `non-reproducible transient test residual`，而不是阻塞 `#1238` 的逻辑问题

### Reviewer 导航已补充

为降低 reviewer 在 6 条 PR 之间来回找上下文的成本，后续又补了 reviewer packet，并发了三条导航 comment：

- 根 PR `#1220` 的整体 review-order comment：
  `https://github.com/Yeachan-Heo/oh-my-codex/pull/1220#issuecomment-4187142900`
- stacked follow-up `#1236` 的增量 review comment：
  `https://github.com/Yeachan-Heo/oh-my-codex/pull/1236#issuecomment-4187142948`
- stacked follow-up `#1238` 的增量 review comment：
  `https://github.com/Yeachan-Heo/oh-my-codex/pull/1238#issuecomment-4187803939`

这些 comment 的作用分别是：

- 在 `#1220` 上用最短路径说明整组 strict-memory PR stack 的阅读顺序和主线
- 在 `#1236` 上明确提醒 reviewer：先看 `#1235`，再只看增量 diff
- 在 `#1238` 上明确提醒 reviewer：先看 `#1235` 和 `#1236`，再看 verification gate 的单 commit 增量

## 7. 推荐下一步

推荐按这个顺序继续：

1. 先推动前四条独立 draft PR 的 review  
   目标是分别验证 strict formal-memory adapter、notify/tmux 稳定性、prompt/docs 对齐、session-end refresh bridge 这四块能否独立合入。

2. 再根据 `#1235` 的反馈继续收口两条 stacked PR  
   顺序是 `#1236` 再 `#1238`，确认 team-complete refresh 与 verification evidence gate 是否继续保留 stacked 方式，还是等前一批先合入后再重开独立 PR。

3. 如果继续深入，再把 verification artifact 往更宽的 runtime/promotion gate 扩展  
   优先考虑继续沿 compatibility adapter 和 best-effort hooks 扩展，而不是直接大面积改 team/runtime。

推荐 review 顺序：

1. `#1220`
2. `#1228`
3. `#1233`
4. `#1235`
5. `#1236`
6. `#1238`

## 8. 关联文档

- [oh-my-codex Memory Integration Executive Summary](oh-my-codex-memory-integration-executive-summary.md)
- [oh-my-codex 与当前记忆系统集成开发计划](oh-my-codex-memory-integration-development.md)
- 当前本地仓库已删去 mock MCP runtime，保留 formal memory governance layer
