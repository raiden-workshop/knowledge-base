# Worker Handoff

## Official Workspace

- 唯一正式仓库：`/Users/wz/project/knowledge-base`
- 唯一正式 workspace root：`/Users/wz/project/knowledge-base`
- 旧 `codex-enhanced-system/knowledge-base` 只保留迁移说明，不再承载正式内容

## Repository Contract

- Markdown 是唯一 canonical truth
- 允许多 domain，但当前只存在 `codex-native-memory-governance`
- `domain` 负责主归属
- `industries / categories` 负责辅助检索
- 机器人尚未接入，当前只能依赖 `kb` 和 `kb_core.py`

## Read Order

1. `AGENTS.md`
2. `START_HERE.md`
3. `README.md`
4. `wiki/hot.md`
5. `wiki/domains/domain-codex-native-memory-governance.md`
6. `wiki/index.md`
7. `wiki/overview.md`
8. `wiki/log.md`

## Working Rules

- raw 必须进 `raw/domains/<domain>/...`
- canonical page 必须有 `domain / industries / categories`
- canonical 变更同时更新 `wiki/index.md` 和 `wiki/log.md`
- `wiki/reports/` 只放检查与治理结果，不承担正式知识
- 后续如果做机器人，只能复用现有检索内核，不要直接扫描 CLI 文本输出

## Current State

- Sources: `15`
- Entities: `2`
- Concepts: `4`
- Syntheses: `3`
- Domains: `1`
- Reports: `4`

## Next Safe Action

- 日常查询或改动前先跑 `./kb maintain`

