# knowledge-base

`/Users/wz/project/knowledge-base` 是知识库的唯一正式仓库与唯一 workspace root。

这个仓库只负责知识库本体，不再作为 `codex-enhanced-system` 的子目录运行。Markdown 是唯一 canonical truth；索引、缓存、日志、报告都只是辅助层，不是正式知识。

## 当前范围

- Phase 1 已落地：独立仓库 + 分域基础
- 离线文档提取基础已落地：`./kb extract <local-file>` 会生成 `artifacts/extract/<request_id>/...` 中间产物
- 文件型 ingest 已统一接入本地 `markitdown`：`./kb ingest` 会先把原件转换成 Markdown，再生成 ingest bundle 与 draft
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
./kb ingest /absolute/path/to/file.pdf --domain codex-native-memory-governance --json
./kb extract /absolute/path/to/file.pdf --json
./kb maintain
./kb reindex --write
```

## 收录默认链路

文件型收录现在固定走这条顺序：

1. `./kb ingest <target>`
2. 保留原件到 `raw/domains/<domain>/ingest/<ingest-id>/`
3. 自动调用本地 `markitdown`
4. 生成 `extracted.md`
5. 基于提取稿生成 draft bundle，再进入 review/apply

约束固定如下：

- 本地文件和可落地为文件的 URL，都先走本地 `markitdown`
- 不调用外部 API
- 不启用 `llm_client`
- 不启用 `markitdown-ocr`
- 不使用 Azure Document Intelligence
- 如果本地 `markitdown` 不可用或转换失败，`ingest` 会显式失败，不会静默回退到旧提取器
- `manifest.json` 会记录 `extraction_mode / extractor_name / extractor_version`

## 离线提取

当前已支持一个最小离线提取入口：

```bash
./kb extract /absolute/path/to/file.pdf --json
```

约束固定如下：

- 只支持本地文件输入
- 默认复用与 `ingest` 相同的本地 `MarkItDown` 基础转换能力
- 不调用外部 API
- 不启用 `llm_client`
- 不启用 `markitdown-ocr`
- 不使用 Azure Document Intelligence

运行结果会先落到：

- `artifacts/extract/<request_id>/request.json`
- `artifacts/extract/<request_id>/result.json`
- `artifacts/extract/<request_id>/content.md`

如果仓库内存在 `output/runtime-markitdown`，`./kb ingest` 和 `./kb extract` 都会自动优先使用它，不需要手工记 `PATH`。

如果当前机器还没有 `markitdown` Python 包、`markitdown` CLI，或者本地运行环境，命令会显式失败，但仍保留请求与失败产物，便于排查。

## 本地运行环境

为了避免把依赖装到系统 Python，建议把 `markitdown` 装在仓库内的本地运行环境里。`./kb` 会自动识别并优先使用这个环境，所以通常不需要手工改 `PATH`。

```bash
cd /Users/wz/project/knowledge-base
python3.11 -m venv output/runtime-markitdown
output/runtime-markitdown/bin/pip install 'markitdown[pdf]'
./kb extract /absolute/path/to/file.pdf --json
```

约定如下：

- 这个运行环境只服务于 `knowledge-base` 的收录与离线提取
- `./kb ingest` 和 `./kb extract` 都会优先使用该环境里的 `markitdown`
- 如果环境里没有 `markitdown`，命令仍会显式失败，不会偷偷联网补救
- 这个环境放在 `output/` 下，属于临时运行产物，不是正式知识

可选的兼容包装命令是 `./kb-with-markitdown`，它只是薄封装，不是必需步骤。

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
