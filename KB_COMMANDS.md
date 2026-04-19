# KB Commands

命令入口固定为：

```bash
cd /Users/wz/project/knowledge-base
./kb <command> ...
```

`./kb ingest ...` 是把资料正式收进知识库的主入口。

`./kb extract ...` 复用同一个本地 `markitdown` 运行环境，但它只负责单独提取，不直接生成 canonical draft。

如果你已经习惯了 `./kb-with-markitdown`，它只是一个可选的薄封装，不是必需步骤。

常用别名：

- `search` / `ask` = `query`
- `new` = `add`
- `note` = `log`
- `check` / `lint` = `maintain`
- `drift` = `drift-review`
- `update-index` = `reindex`
- `remove` = `delete`
- `distill` = `distill-memory`

## `query`

查询 canonical page，默认不含 report。

```bash
./kb query "formal memory"
./kb query "formal memory" --domain codex-native-memory-governance --category architecture
./kb query governance --industry ai --json
./kb query review --include-reports --no-dedupe
```

要点：

- 支持 `--domain`
- 支持 `--industry`
- 支持 `--category`
- `--json` 会输出 `domain / industries / categories`
- 结果默认保守去重；`--no-dedupe` 可保留镜像结果
- 当前检索复用 `kb_core.py`，后续机器人必须走同一内核

## `add`

新增 canonical page scaffold。

```bash
./kb add source --slug my-doc --title "My Doc" --domain codex-native-memory-governance --import-from /tmp/my-doc.md
./kb add concept --slug formal-memory-boundary --title "Formal memory boundary" --source-ref wiki/sources/source-my-doc.md --category architecture
```

要点：

- 默认 `domain` 是 `codex-native-memory-governance`
- 可重复传 `--industry` / `--category`
- `source --import-from` 默认把 raw 放到对应的 `raw/domains/<domain>/inbox/`
- 新增 canonical page 会自动补进 `wiki/index.md`

## `log`

给 `wiki/log.md` 追加结构化记录。

```bash
./kb log ingest --summary "add source-my-doc" --note "Added wiki/sources/source-my-doc.md"
```

## `extract` / `extract-offline`

对本地文件执行离线 `MarkItDown` 提取，并先写中间产物，不直接写正式 wiki。

```bash
./kb extract /absolute/path/to/file.pdf
./kb extract /absolute/path/to/file.docx --json
./kb extract /absolute/path/to/file.md --request-id extract-my-doc --json
```

当前约束：

- 只支持本地文件路径
- 默认只使用本地 `MarkItDown` 基础转换能力
- 不允许 `llm_client`
- 不允许 `markitdown-ocr`
- 不允许 Azure Document Intelligence
- 不会直接更新 `wiki/index.md`、`wiki/log.md` 或 canonical page

运行产物：

- `artifacts/extract/<request_id>/request.json`
- `artifacts/extract/<request_id>/result.json`
- `artifacts/extract/<request_id>/content.md`

返回规则：

- `succeeded`：提取成功
- `low_confidence`：提取结果过空或接近空，需要人工复查
- `failed`：提取失败，会保留失败产物

依赖说明：

- 当前机器需要可用的 `markitdown` Python 包或 `markitdown` CLI
- 若依赖缺失，命令会显式失败并返回 `markitdown unavailable`

本地运行环境示例：

```bash
cd /Users/wz/project/knowledge-base
python3.11 -m venv output/runtime-markitdown
output/runtime-markitdown/bin/pip install 'markitdown[pdf]'
./kb extract /absolute/path/to/file.pdf --json
```

如果你把文档交给 `knowledge-base` worker 并要求“整理到知识库”，主入口应当是 `./kb ingest`。如果你只是想先单独验证本地 `markitdown` 的提取效果，再使用 `./kb extract`。两者都会自动识别本地运行环境，不需要你手工记 `PATH`。`./kb-with-markitdown` 只是可选兼容层。前提仍然是该 worker 真的在 `/Users/wz/project/knowledge-base` 里执行，并且按这个仓库约定读取了 `README.md` / `KB_COMMANDS.md`。

## `ingest`

把 URL 或本地文件收进 ingest bundle，并生成待审 source draft。

```bash
./kb ingest /absolute/path/to/file.pdf --domain codex-native-memory-governance
./kb ingest https://example.com/page --domain codex-native-memory-governance --json
```

当前固定行为：

- 文件型收录会先自动调用本地 `markitdown`
- 转换结果会落到本次 bundle 的 `extracted.md`
- `manifest.json` 会记录 `extraction_mode / extractor_name / extractor_version`
- 如果本地 `markitdown` 不可用或转换失败，命令会显式失败
- URL 正文过弱时仍会进入 `needs_browser_capture`

## `maintain`

做轻量维护检查。

```bash
./kb maintain
./kb maintain --json
./kb maintain --write-report
```

当前会检查：

- canonical frontmatter 是否包含 `domain / industries / categories`
- `industries / categories` 是否真的是 string list
- page 的 `domain` 是否存在于 `wiki/domains/`
- domain page 的 frontmatter domain 是否与 registry slug 一致
- `source` 页的 raw 引用是否仍在对应 `raw/domains/<domain>/...`
- `source_refs / related`、内部链接、`wiki/index.md`、guide surface 是否健康

## `drift-review`

看哪些页面可能需要复核，而不是把它们直接算成维护错误。

```bash
./kb drift-review
./kb drift-review --json
./kb drift-review --write-report
```

## `reindex`

同步 `wiki/index.md`。

```bash
./kb reindex
./kb reindex --write
./kb reindex --write --prune
```

## `delete`

安全删除到 `output/trash/`。

```bash
./kb delete wiki/sources/source-old-doc.md
./kb delete wiki/sources/source-old-doc.md --with-raw
```

## `distill-memory`

把稳定结论蒸馏到 workspace memory candidates，然后触发全局 memory refresh。

```bash
./kb distill-memory wiki/concepts/concept-formal-memory-authority.md
```
