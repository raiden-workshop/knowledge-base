# Start Here

先认这 4 件事：

1. 正式工作根只有 `/Users/wz/project/knowledge-base`
2. 当前只跑 Phase 1：独立仓库 + 分域基础
3. 当前唯一 founding domain 是 `codex-native-memory-governance`
4. 飞书机器人还没接入，不要在这里实现机器人逻辑

## 你应该先读

1. `AGENTS.md`
2. `README.md`
3. `wiki/hot.md`
4. `wiki/domains/domain-codex-native-memory-governance.md`
5. `wiki/index.md`
6. `wiki/overview.md`
7. `wiki/log.md`

## 你应该怎么理解这个仓库

- `wiki/` 是正式知识层
- `raw/domains/<domain>/...` 是原始资料层
- `wiki/reports/` 是治理与检查层，不是正式事实
- `output/` 是临时层，不是正式事实
- `kb_core.py` 是后续机器人与自动化应该复用的检索内核

## 当前默认动作

- 查知识：优先 `./kb query`
- 做文件入库：优先 `./kb ingest /absolute/path/to/file`
- 文件型收录会先自动走本地 `markitdown` 转成 Markdown；弱文本 PDF 在本机存在 `ocrmypdf` 时会自动补一次本地 OCR fallback
- 做离线提取：优先 `./kb extract /absolute/path/to/file`
- 做 PDF 或文件型离线提取：优先 `./kb extract /absolute/path/to/file`
- 做维护：优先 `./kb maintain`
- 补索引：优先 `./kb reindex --write`
- 新增 canonical：补齐 `domain / industries / categories`

## 当前不要做

- 不要把旧 `codex-enhanced-system/knowledge-base` 当正式写入入口
- 不要跳过 domain registry 直接加新域
- 不要把 reports、logs、output 当成 canonical truth
- 不要开始飞书机器人接入
