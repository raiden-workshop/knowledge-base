# Knowledge Base Worker-First 收录开发计划

状态：`Active`
文档状态：`Aligned`
实施状态：`Planned; no code yet`

最后更新：`2026-04-17`

上位约束：

- [Knowledge Base Worker-First 收录设计](./knowledge-base-worker-ingest-design.md)

## 1. 目的

本文档把上位设计拆成可执行的改造项，供后续实现时直接落地。

本文档只定义实现边界、模块拆分、命令契约、测试矩阵与 done 标准，不在本轮实现任何代码。

## 2. 当前现状

当前仓库已经具备：

- `kb query`：查询 canonical 页面
- `kb add`：手工新增 page scaffold
- `kb maintain`：检查 canonical 健康度
- `kb_core.py`：页面解析与查询复用内核

当前仓库尚未具备：

- 通用 ingest 命令
- 针对 URL / PDF / 图片的统一收录入口
- 待审草稿层
- apply / reject 专用命令
- 面向 ingest 的独立测试面

当前产品入口也尚未具备：

- 面向终端用户的口语驱动收录体验

因此，后续实现必须补的是“worker-first 收录基础设施”，而不是继续扩充 `kb add` 的手工入口。

## 3. 目标实现面

目标实现面固定如下：

- `kb`：新增 `ingest` 与 `ingest-review`
- `kb_ingest_core.py`：新增收录、提取、bundle 生成与重复检测内核
- `tests/test_kb_ingest.py`：新增 ingest 主测试面
- `raw/domains/<domain>/ingest/<ingest-id>/`：保存原件、提取稿与 manifest
- `output/ingest-drafts/<ingest-id>/wiki/...`：保存待审草稿

边界固定如下：

- `kb_core.py` 不接收收录职责，继续只管 canonical 解析与检索
- worker 入口不在仓库里实现为另一个服务；当前 Codex worker 直接调用 CLI 即可
- `wiki/` 不承接 draft
- `kb query` 不读取 draft

## 4. 模块拆分

建议按以下模块拆分实现。

`kb`

- 增加 `ingest` 子命令
- 增加 `ingest-review` 子命令
- 复用已有参数风格、错误输出风格与 `--json` 形态

`kb_ingest_core.py`

- 解析输入类型
- 规范化 URL 与文件路径
- 执行采集，并统一先调用本地 `markitdown`
- 生成 `ingest-id`
- 计算 hash
- 生成 `manifest.json`
- 生成或读取 `extracted.md`
- 做重复检测
- 校验 draft bundle 的 apply 前置条件

`kb_core.py`

- 保持不承接 ingest 提取逻辑
- 仅为 worker 的“查已有 canonical 页面”提供查询支持

`tests/test_kb_ingest.py`

- 专门覆盖 ingest 生命周期、bundle 结构、duplicate 判定、review/apply 行为与 draft 隔离

worker 侧流程

- 不在仓库里沉淀为常驻程序
- 以后由当前 Codex worker 按设计文档中的固定步骤执行

## 5. 命令与数据契约

命令契约固定如下。

`./kb ingest <target> [--domain] [--industry] [--category] [--title] [--allow-duplicate] [--json]`

职责：

- 接收 URL 或本地文件路径
- 优先调用本地 `markitdown` 生成 Markdown 提取稿
- 落 ingest bundle
- 返回 ingest 状态与 ingest id

`./kb ingest-review <ingest-id> [--json] [--apply|--reject]`

职责：

- 查看待审状态
- apply 或 reject

`manifest.json` 至少包含以下字段：

- `ingest_id`
- `target_type`
- `domain`
- `source_title`
- `source_locator`
- `content_hash`
- `duplicate_status`
- `relation_type`
- `related_pages`
- `review_status`
- `extraction_mode`
- `extractor_name`
- `extractor_version`

字段取值固定如下：

- `relation_type`：`new | supplement | conflict | duplicate`
- `review_status`：`accepted | rejected | blocked_duplicate | needs_browser_capture | ready_for_review`

draft bundle 契约固定如下：

- 路径根固定为 `output/ingest-drafts/<ingest-id>/`
- 草稿页面放在 `wiki/...`
- 必带 `review-summary.md`
- 必带 `log-entry.md`
- 所有 draft frontmatter 的 `status` 固定为 `draft`

apply 契约固定如下：

- 只能对 `ready_for_review` 且校验通过的 ingest 执行
- apply 时把 `status: draft` 变为 `status: active`
- apply 时更新 `wiki/index.md`
- apply 时追加 `wiki/log.md`
- apply 失败时不允许半提交

## 6. 分阶段实施顺序

实施顺序固定如下。

Phase A：ingest 基础设施

- 新增 `kb ingest`
- 新增 `kb_ingest_core.py`
- 打通 URL / 文本类 / Word / PDF / 图片的原件保存与本地 `markitdown` 提取稿保存
- 打通 `manifest.json` 与 ingest id
- 完成重复检测与 review 状态落盘

Phase B：draft 与 review/apply

- 新增 `output/ingest-drafts/<ingest-id>/` 结构
- 新增 `kb ingest-review`
- 打通 apply / reject
- 打通 apply 前校验
- 保证 `wiki/` 与 draft 层严格隔离

Phase C：知识维护治理

- 固化 supplement / conflict / duplicate / reingest 行为
- apply 时支持高层页更新
- 固化 `Change Record` 与 `Historical Notes` 写法
- 扩展 `kb maintain` 对 ingest 与 apply 的检查

Phase D：文档与人工流程对齐

- 在功能真正实现后，再补 README 与命令手册
- 明确 worker 的实际使用说明
- 视确认结果决定是否追加 spec / checklist

## 7. 测试矩阵

必须覆盖以下测试。

输入类型：

- URL 正常正文，经本地 `markitdown` 提取后可直接进入 review
- URL 需要浏览器回退
- TXT / Markdown
- DOCX / ODT
- PDF，经本地 `markitdown` 提取
- 图片，经本地 `markitdown` 提取但不启用 OCR 增强

关系类型：

- `new`
- `supplement`
- `conflict`
- `duplicate`

review 行为：

- `needs_browser_capture` 与 `blocked_duplicate` 不允许直接 apply
- reject 不修改 `wiki/`
- apply 成功后 `wiki/index.md` 与 `wiki/log.md` 正确更新

隔离与治理：

- `kb query` 不读取 draft
- `kb maintain` 能拦住坏 bundle、错误引用和错误 apply
- 高层页冲突更新后，`Historical Notes` 与 `Change Record` 都存在

失败路径：

- 不支持文件类型
- 提取稿为空或过弱
- 浏览器回退失败
- apply 前校验失败

## 8. 风险与回退

主要风险如下。

- URL 内容质量差异大，HTTP 抓取结果不稳定
- 本地 `markitdown` 对扫描件、图片或结构复杂文档可能只产出弱文本
- supplement 与 conflict 的判断可能被过度自动化
- apply 若非原子，容易把 draft 和 canonical 弄混

对应回退策略固定如下：

- 正文弱时优先降级为只产出 `source` 草稿
- 关系类型不稳定时，不直接自动走 conflict apply
- apply 失败时不写入 `wiki/`
- 所有原件与提取稿都保留，确保后续可人工重判

## 9. Done 定义

后续实现只有满足以下条件才算完成：

- `kb ingest` 与 `kb ingest-review` 已实现并可运行
- `kb_ingest_core.py` 已承接 ingest 核心逻辑
- `tests/test_kb_ingest.py` 已覆盖主要输入类型、关系类型与失败路径
- `raw/` ingest bundle 与 `output/` draft bundle 目录结构稳定
- `wiki/` 只接收 apply 后的 active 页面
- `kb query` 与 `kb maintain` 的边界和治理逻辑没有被破坏
- 用户可以在当前对话中只用口语触发完整收录链路

上述条件完成后，README、`KB_COMMANDS.md`、`WORKER_HANDOFF.md` 与相关设计文档必须继续与当前实现保持同步。
