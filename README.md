# knowledge-base

`/Users/wz/project/knowledge-base` 是知识库的唯一正式仓库与唯一 workspace root。

这个仓库只负责知识库本体，不再作为 `codex-enhanced-system` 的子目录运行。Markdown 是唯一 canonical truth；索引、缓存、日志、报告都只是辅助层，不是正式知识。

## 当前范围

- Phase 1 已落地：独立仓库 + 分域基础
- 当前 founding domain：`codex-native-memory-governance`
- Phase 2 尚未开始：飞书机器人还没有接入

## 目录约定

- `wiki/`
  - 正式知识页
  - canonical 类型固定为 `sources / entities / concepts / syntheses / domains / reports`
- `raw/domains/<domain>/...`
  - 原始资料按 domain 分桶
  - 当前默认桶：`raw/domains/codex-native-memory-governance/`
- `output/`
  - 临时导出、垃圾箱、非正式产物
- `kb`
  - 仓库内 CLI 入口
- `kb_core.py`
  - 可复用的页面解析与检索内核，后续机器人只能耦合这里，不直接耦合 CLI 文本输出

## Canonical Frontmatter

所有 canonical page 都必须带：

```yaml
domain: codex-native-memory-governance
industries:
  - ai
categories:
  - architecture
```

规则：

- 每页只能属于一个 `domain`
- `industries` 和 `categories` 只做辅助检索，不承担归属
- `domain` 必须能在 `wiki/domains/` 里找到对应 registry page

## 常用命令

```bash
cd /Users/wz/project/knowledge-base

./kb query "formal memory" --domain codex-native-memory-governance --category architecture --json
./kb maintain
./kb reindex --write
```

## 维护原则

- 先存 raw，再写 canonical
- canonical 变更同时更新 `wiki/index.md` 和 `wiki/log.md`
- `kb maintain` 会校验 `domain / industries / categories`、domain registry、一页一域，以及 source raw 路径是否仍在正确的 domain bucket 下
- 不要把 `wiki/reports/`、`output/`、缓存或日志当成正式事实

## 读取顺序

1. `AGENTS.md`
2. `START_HERE.md`
3. `wiki/hot.md`
4. `wiki/domains/domain-codex-native-memory-governance.md`
5. `wiki/index.md`
6. `wiki/overview.md`
7. `wiki/log.md`

