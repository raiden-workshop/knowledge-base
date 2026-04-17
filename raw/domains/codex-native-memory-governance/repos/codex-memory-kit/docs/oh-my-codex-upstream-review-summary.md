# oh-my-codex Upstream Review Summary

状态：`Active`
文档状态：`Aligned`
实施状态：`Copy-paste summary ready`

最后更新：`2026-04-04`

## 1. One-Paragraph Summary

这一组 upstream PR 的目标不是给 `oh-my-codex` 再加一套独立 memory system，而是在 strict mode 下把 formal memory 与 `.omx` runtime/local compatibility state 的边界做实，并把 refresh hook 只在最窄、最可审计的 runtime path 上逐步打开。

## 2. Review Order

按这个顺序看最省心：

1. [#1220](https://github.com/Yeachan-Heo/oh-my-codex/pull/1220) formal-memory adapter
2. [#1228](https://github.com/Yeachan-Heo/oh-my-codex/pull/1228) notify/tmux stability
3. [#1233](https://github.com/Yeachan-Heo/oh-my-codex/pull/1233) prompt/docs surfaces
4. [#1235](https://github.com/Yeachan-Heo/oh-my-codex/pull/1235) session-end refresh bridge
5. [#1236](https://github.com/Yeachan-Heo/oh-my-codex/pull/1236) team-complete refresh follow-up
6. [#1238](https://github.com/Yeachan-Heo/oh-my-codex/pull/1238) team verification evidence gate

说明：

- `#1220`、`#1228`、`#1233`、`#1235` 是独立切分
- `#1236` 是 stacked follow-up，应该在 `#1235` 之后看
- `#1238` 是继续堆叠在 `#1236` 之上的 evidence-gate follow-up，应最后看

## 3. One-Line Per PR

- [#1220](https://github.com/Yeachan-Heo/oh-my-codex/pull/1220)：strict mode 下把 `project_memory_*` 和 overlay 真正收口到 formal memory / intake queue 语义。
- [#1228](https://github.com/Yeachan-Heo/oh-my-codex/pull/1228)：收敛 notify/tmux tests 的时序和环境波动，不改变默认生产行为。
- [#1233](https://github.com/Yeachan-Heo/oh-my-codex/pull/1233)：把 prompt/docs 文案和 strict-memory runtime 语义对齐。
- [#1235](https://github.com/Yeachan-Heo/oh-my-codex/pull/1235)：只在 strict mode + opt-in gate 下加一个 detached/best-effort 的 session-end refresh bridge。
- [#1236](https://github.com/Yeachan-Heo/oh-my-codex/pull/1236)：在 `#1235` 基础上把同一 refresh helper 扩到 leader-side `team complete` path，仍保持 opt-in。
- [#1238](https://github.com/Yeachan-Heo/oh-my-codex/pull/1238)：把 upstream 已有的 `team-verify` 结果落成 `verification-state.json` artifact，并要求 team-complete refresh 只在 verified evidence 满足时才调度。

## 4. What Reviewers Should Ignore

- 更宽 `ask/autoresearch/explore/session/team` CLI baseline 的环境敏感失败
- cargo/native packaging 可用性问题
- 不属于 notify/tmux 稳定性范围的独立 hooks/mcp baseline
- 更宽的 verification/promotion runtime surface 扩展

## 5. Ready-To-Paste GitHub Comment

```md
Suggested review order: #1220 -> #1228 -> #1233 -> #1235 -> #1236 -> #1238.

High-level intent: these PRs do not add a second memory system. They tighten strict-mode behavior so formal memory remains authoritative, `.omx` stays runtime/local compatibility state, and refresh hooks are introduced only through narrow opt-in runtime bridges.

Notes:
- #1220 is the core strict formal-memory adapter.
- #1228 is test stability only.
- #1233 aligns prompt/docs surfaces with the runtime behavior.
- #1235 adds the first opt-in session-end refresh bridge.
- #1236 is stacked on #1235 and extends the same helper to leader-side team completion.
- #1238 is stacked on #1236 and adds a persisted verification artifact before team-complete refresh can run.
```

## 6. Ready-To-Paste Slack Update

```md
Upstream review order is now stable: #1220 -> #1228 -> #1233 -> #1235 -> #1236 -> #1238.

The main thread is strict-memory boundary hardening, not a new memory subsystem:
- #1220 formal memory adapter
- #1228 notify/tmux stability
- #1233 prompt/docs alignment
- #1235 opt-in session-end refresh bridge
- #1236 stacked team-complete refresh follow-up
- #1238 stacked team verification evidence gate follow-up

If reviewing quickly, ignore wider CLI baseline noise and read #1236 only after #1235, then read #1238 as the final incremental gate.
```

## 7. Related Docs

- [oh-my-codex Upstream Review Notes](oh-my-codex-upstream-review-notes.md)
- [oh-my-codex Upstream First Integration Status](oh-my-codex-upstream-first-integration-status.md)
- [oh-my-codex Upstream First Integration Apply Guide](oh-my-codex-upstream-first-integration-apply.md)
- [README](README.md)
