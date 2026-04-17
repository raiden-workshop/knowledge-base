# Knowledge Base Workspace Guide

## Purpose

- 正式仓库与正式 workspace root 只有 `/Users/wz/project/knowledge-base`
- 这是独立知识库仓库，不再从属于 `codex-enhanced-system/knowledge-base`
- Markdown 是唯一 canonical truth
- 全局 memory system 仍然是长期行为规则与热路径上下文的权威，这个仓库只补知识层

## Current Stage

- 当前只完成 Phase 1：独立仓库 + 分域基础
- 当前 founding domain：`codex-native-memory-governance`
- 未来允许多 domain，但现在还没有接飞书机器人

## Read Order

1. `START_HERE.md`
2. `README.md`
3. `wiki/hot.md`
4. `wiki/domains/domain-codex-native-memory-governance.md`
5. `wiki/index.md`
6. `wiki/overview.md`
7. `wiki/log.md`

## Directory Rules

- `raw/domains/<domain>/...`
  - 原始资料分域保存
  - 当前默认桶：`raw/domains/codex-native-memory-governance/`
- `wiki/`
  - canonical pages
- `wiki/domains/`
  - domain registry
- `wiki/reports/`
  - 治理与健康检查，不是正式知识
- `output/`
  - 临时导出、trash、非正式产物
- `kb`
  - CLI 入口
- `kb_core.py`
  - 可复用的页面解析与检索内核

## Canonical Rules

- canonical page 类型固定为：
  - `sources`
  - `entities`
  - `concepts`
  - `syntheses`
  - `domains`
  - `reports`
- 所有 canonical page 都必须带：
  - `domain: string`
  - `industries: string[]`
  - `categories: string[]`
- 每页只能属于一个 `domain`
- `industries / categories` 只做辅助检索，不承担所有权
- `domain` 必须能在 `wiki/domains/` 找到对应 registry page

## Working Rules

- 先存 raw，再写 canonical
- canonical 变更同时更新 `wiki/index.md` 和 `wiki/log.md`
- `source` 页的 raw 引用必须落在该页自己的 `raw/domains/<domain>/...`
- 不要把 `wiki/reports/`、`output/`、缓存、日志当成 canonical truth
- 不要直接耦合 CLI 文本输出；后续程序化接入必须复用 `kb_core.py`

## Query And Maintenance

- 查询优先用 `./kb query`
- 过滤统一用 `--domain`、`--industry`、`--category`
- 维护优先用 `./kb maintain`
- 扩域前先补或更新 domain registry，再写其他 canonical page

## Out Of Scope

- 不要把旧 `codex-enhanced-system/knowledge-base` 当正式入口
- 不要在本阶段实现飞书机器人

