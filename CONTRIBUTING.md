# Contributing

这个仓库只接受与 `/Users/wz/project/knowledge-base` 相关的正式知识库变更。

## Read First

1. `AGENTS.md`
2. `START_HERE.md`
3. `README.md`
4. `WORKER_HANDOFF.md`
5. `wiki/hot.md`

## Canonical Change Checklist

- 原始资料先进入 `raw/domains/<domain>/...`
- canonical page 必须带：
  - `domain`
  - `industries`
  - `categories`
- `domain` 必须能在 `wiki/domains/` 找到 registry page
- 更新 `wiki/index.md`
- 追加 `wiki/log.md`
- 高层导航变了再更新 `wiki/overview.md` 或 `wiki/hot.md`

## Scope Discipline

- 当前 founding domain 是 `codex-native-memory-governance`
- 可以扩到多 domain，但不要越过 domain registry
- `industries / categories` 不能替代 `domain`
- 报告、缓存、导出都不是正式知识

## Review Expectations

- 变更尽量小
- 明确指出新增或修改的 canonical page
- 明确指出支持该结论的 `source_refs`
- 说明是否跑了 `./kb maintain`、测试或其他验证

## Not In Scope

- 不要在这里接飞书机器人
- 不要把旧 `codex-enhanced-system/knowledge-base` 当正式入口

