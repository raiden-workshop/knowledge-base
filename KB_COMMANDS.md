# KB Commands

命令入口固定为：

```bash
cd /Users/wz/project/knowledge-base
./kb <command> ...
```

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

