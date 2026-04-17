# oh-my-codex Upstream Review Notes

状态：`Active`
文档状态：`Aligned`
实施状态：`Reviewer packet ready`

最后更新：`2026-04-04`

## 1. Review Order

建议 reviewer 按这个顺序看：

1. [#1220](https://github.com/Yeachan-Heo/oh-my-codex/pull/1220)
2. [#1228](https://github.com/Yeachan-Heo/oh-my-codex/pull/1228)
3. [#1233](https://github.com/Yeachan-Heo/oh-my-codex/pull/1233)
4. [#1235](https://github.com/Yeachan-Heo/oh-my-codex/pull/1235)
5. [#1236](https://github.com/Yeachan-Heo/oh-my-codex/pull/1236)
6. [#1238](https://github.com/Yeachan-Heo/oh-my-codex/pull/1238)

其中：

- `#1220`、`#1228`、`#1233`、`#1235` 是独立切分
- `#1236` 是 stacked follow-up，应在 `#1235` 之后看
- `#1238` 是继续堆叠在 `#1236` 之上的 verification-evidence-gate follow-up，应最后看

## 2. Fast Context

这组 PR 的主线不是“新增一套 memory system”，而是：

- 保留现有 strict formal-memory 约束
- 让 `oh-my-codex` 更明确地区分 formal memory 与 `.omx` runtime/local compatibility state
- 逐步把 refresh bridge 从 read-path 扩到 session-end、team-complete，再收口到 verified evidence gate

## 3. PR-by-PR Notes

### [#1220](https://github.com/Yeachan-Heo/oh-my-codex/pull/1220) `strict formal-memory adapter`

这条 PR 要 reviewer 重点确认：

- `project_memory_read` 在 strict mode 下是否真的改为 formal workspace memory summary
- `project_memory_write` 是否真的显式拒绝
- `project_memory_add_note` / `project_memory_add_directive` 是否真的 downgrade 到 `.omx/memory-intake.jsonl`
- `agents-overlay` 是否真的优先读 formal memory，而不是 `.omx/project-memory.json`

建议重点看这些文件：

- `/tmp/oh-my-codex/src/mcp/memory-server.ts`
- `/tmp/oh-my-codex/src/hooks/agents-overlay.ts`
- `/tmp/oh-my-codex/src/integration/formal-memory.ts`

建议 reviewer 暂时忽略：

- notify/tmux wider-suite 的旧波动
- team/runtime 更深层 refresh hook

### [#1228](https://github.com/Yeachan-Heo/oh-my-codex/pull/1228) `notify/tmux stability`

这条 PR 不是功能扩展，而是把 wider-suite 的时序/环境波动收住。

这条 PR 要 reviewer 重点确认：

- child env 隔离是否足够窄，不会影响默认运行时
- timeout override 是否只在稳定性场景增强，而不是改变生产默认行为
- wider hooks + mcp suite 是否确实从波动收敛到稳定

建议重点看：

- notify fallback watcher 相关测试 helper
- notify hook / tmux heal / dispatch 的测试与 timeout 注入点

建议 reviewer 暂时忽略：

- strict-memory runtime 本体逻辑

### [#1233](https://github.com/Yeachan-Heo/oh-my-codex/pull/1233) `prompt/docs surfaces`

这条 PR 的价值是把 prompt/docs 文案和 strict runtime 行为对齐，防止人和代码读出两套语义。

这条 PR 要 reviewer 重点确认：

- `AGENTS.md`、template、note skill 是否都把 `.omx/notepad.md` 表述为 run-local scratch
- `project-memory` 是否都不再被说成 formal authority
- overlay compaction 文案是否与 strict mode 真实行为一致

建议重点看：

- `/tmp/oh-my-codex-surfaces/AGENTS.md`
- `/tmp/oh-my-codex-surfaces/templates/AGENTS.md`
- `/tmp/oh-my-codex-surfaces/skills/note/SKILL.md`
- `/tmp/oh-my-codex-surfaces/src/hooks/agents-overlay.ts`
- `/tmp/oh-my-codex-surfaces/src/mcp/memory-server.ts`

建议 reviewer 暂时忽略：

- deeper runtime hook 还没到这条 PR

### [#1235](https://github.com/Yeachan-Heo/oh-my-codex/pull/1235) `session-end refresh bridge`

这条 PR 是第一次把 strict-memory refresh 从 read-path 扩到 runtime hook，但切口很窄。

这条 PR 要 reviewer 重点确认：

- 是否只有 strict mode + `OMX_STRICT_MEMORY_REFRESH_ON_EXIT=1` 时才会调度 refresh
- 是否会跳过 `OMX_TEAM_WORKER`
- 是否采用 detached / best-effort，不阻塞 `postLaunch`
- spawn 失败是否只是 warning/skip，而不是破坏退出路径

建议重点看：

- `/tmp/oh-my-codex-refresh/src/cli/index.ts`
- `/tmp/oh-my-codex-refresh/src/cli/__tests__/formal-memory-refresh.test.ts`

建议 reviewer 暂时忽略：

- 更宽 `dist/cli/__tests__` 里已有的环境/打包基线失败
- team-complete follow-up，那是 `#1236`

### [#1236](https://github.com/Yeachan-Heo/oh-my-codex/pull/1236) `team-complete refresh`

这条 PR 是 stacked follow-up。最重要的是不要把它当成“和 `#1235` 完全无关的独立 diff”来看。

这条 PR 要 reviewer 重点确认：

- refresh helper 抽成共享模块后，`#1235` 的 session-exit 逻辑语义是否保持不变
- `runtime-cli` 只在 `phase=complete` 时调度 leader-side refresh
- 新 gate `OMX_STRICT_MEMORY_REFRESH_ON_TEAM_COMPLETE=1` 是否把 team-complete refresh 保持为 opt-in
- team worker 进程是否仍然会跳过 refresh

建议重点看：

- `/tmp/oh-my-codex-team-refresh/src/integration/formal-memory-refresh.ts`
- `/tmp/oh-my-codex-team-refresh/src/cli/index.ts`
- `/tmp/oh-my-codex-team-refresh/src/team/runtime-cli.ts`
- `/tmp/oh-my-codex-team-refresh/src/team/__tests__/runtime-cli.test.ts`

建议 reviewer 的最佳阅读方式：

- 先读 `#1235`
- 再基于 `7e1b309..5586da0` 看 `#1236` 的增量

### [#1238](https://github.com/Yeachan-Heo/oh-my-codex/pull/1238) `team verification evidence gate`

这条 PR 是沿着 `#1236` 再往前收一层：不是新增第二套 verify 机制，而是把 upstream 已有的 `team-verify` / structured task evidence 结果持久化成 team-level artifact，并让 refresh 真正依赖这个 artifact。

这条 PR 要 reviewer 重点确认：

- `monitorTeam` 是否在 phase 演进时稳定写出 `verification-state.json`
- artifact 是否准确区分 `pending` / `verified` / `failed`
- `runtime-cli` 是否在 shutdown cleanup 之前就先读取 verification state，避免 artifact 被删掉
- team-complete refresh 是否只会在 verified artifact 已满足时调度
- 这条 gate 是否只是收紧 `#1236`，而没有改宽默认 refresh 行为

建议重点看：

- `/tmp/oh-my-codex-team-refresh/src/team/state.ts`
- `/tmp/oh-my-codex-team-refresh/src/team/team-ops.ts`
- `/tmp/oh-my-codex-team-refresh/src/team/runtime.ts`
- `/tmp/oh-my-codex-team-refresh/src/team/runtime-cli.ts`
- `/tmp/oh-my-codex-team-refresh/src/team/__tests__/runtime.test.ts`
- `/tmp/oh-my-codex-team-refresh/src/team/__tests__/runtime-cli.test.ts`

建议 reviewer 的最佳阅读方式：

- 先读 `#1236`
- 再基于 `5586da0..8b89da5` 看 `#1238` 的单 commit 增量

## 4. What To Ignore

这轮 review 里，以下问题不建议混进 strict-memory patch 结论：

- `ask/autoresearch/explore/session/team` 的环境敏感 CLI baseline 失败
- cargo/native packaging 可用性问题
- notify/tmux wider-suite 以外的独立基线问题
- 更宽的 verification/promotion runtime surface 扩展

## 5. Patch Artifacts

如果 reviewer 更偏好 patch 而不是 GitHub diff，可直接看：

- [0001-strict-formal-memory-adapter.patch](../patches/0001-strict-formal-memory-adapter.patch)
- [0002-strict-memory-refresh-bridge.patch](../patches/0002-strict-memory-refresh-bridge.patch)
- [0003-team-complete-memory-refresh.patch](../patches/0003-team-complete-memory-refresh.patch)
- [0004-team-verification-evidence-gate.patch](../patches/0004-team-verification-evidence-gate.patch)

对于 stacked 的 follow-up，也可以直接看增量工作树 patch：

- [oh-my-codex-upstream-team-complete-memory-refresh.patch](../patches/oh-my-codex-upstream-team-complete-memory-refresh.patch)
- [oh-my-codex-upstream-team-verification-evidence-gate.patch](../patches/oh-my-codex-upstream-team-verification-evidence-gate.patch)

## 6. Related Docs

- [oh-my-codex Upstream First Integration Status](oh-my-codex-upstream-first-integration-status.md)
- [oh-my-codex Upstream First Integration Apply Guide](oh-my-codex-upstream-first-integration-apply.md)
- [README](README.md)
