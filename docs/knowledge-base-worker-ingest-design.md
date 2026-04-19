# Knowledge Base Worker-First 收录设计

状态：`Accepted`
文档状态：`Aligned`
实施状态：`Planned; no code yet`

最后更新：`2026-04-17`

## 1. 背景

当前知识库已经具备稳定的 canonical 结构、`raw/` 证据层、`wiki/` 真相层，以及 `kb query` / `kb add` / `kb maintain` 等基础能力。

当前缺口不在检索，而在收录入口：

- 现状更偏“人工维护 Markdown”
- 用户需要记住命令和目录规则
- 新资料进入库后，补充、冲突、重复与 review 仍然依赖人工拆解

本设计要解决的是“低摩擦收录”问题：

- 人类只用口语指挥当前 Codex worker
- worker 负责理解意图、执行底层命令、产出待审草稿
- 仓库内 CLI 只负责采集、提取、落盘、校验与 apply

本设计明确不引入外部模型 API。自动派生与 review 的模型能力只由当前 Codex worker 提供。

## 2. 设计目标

- 让知识库收录入口从“记命令”变成“口语指令”
- 保持 Markdown 作为唯一 canonical truth
- 保持 `raw/` 为原始证据层，`wiki/` 为正式知识层
- 让新资料可以稳定落成 `source` 页，并在证据足够时推动高层页更新
- 把补充、冲突、重复和重收录纳入明确治理规则
- 保持 `kb_core.py` 继续聚焦 canonical 解析与检索，不把收录逻辑塞进去

## 3. 非目标

- 本设计不实现飞书机器人、邮件机器人或任何外部消息入口
- 本设计不实现视频、音频、压缩包或批量离线导入
- 本设计不引入向量检索、SQLite 索引服务或独立后台守护进程
- 本设计不把 `output/` 草稿层纳入 canonical query
- 本设计不把 worker 行为固化成仓库内另一套模型调用框架

## 4. 用户入口与交互方式

用户入口固定为当前对话中的 Codex worker，不要求用户记命令。

典型口语指令包括：

- “收录这个链接”
- “把这份 PDF 收进知识库”
- “这篇是对某个概念的补充”
- “这篇和旧结论冲突，按新证据更新”
- “看看刚才那条收录，准备提交”

worker 必须把口语指令归一成四类意图：

- `new`：新增资料
- `supplement`：补充已有知识
- `conflict`：用新证据修正当前结论
- `review`：查看或推进待审草稿

交互原则固定如下：

- worker 自动执行 ingest 与草稿生成，不要求用户手动敲命令
- worker 必须在 apply 前给出 review 摘要
- 用户可以要求修改草稿内容，再决定 apply 或 reject
- 没有明确确认时，worker 不得把 draft 直接提升为 canonical

## 5. Worker 与 CLI 职责边界

worker 和 CLI 的边界固定如下。

worker 负责：

- 识别用户意图
- 选择 domain、title、关系类型和目标高层页
- 调用底层 `kb` 命令
- 阅读提取稿与已有知识图谱
- 生成 `source` 与高层页草稿
- 向用户展示 review 摘要
- 在用户确认后触发 apply

`kb ingest` 负责：

- 接收 URL 或本地文件路径
- 抓取原件或复制原件
- 生成提取稿
- 计算 hash、记录 manifest、做重复检测
- 在 `raw/` 下落完整 ingest bundle

`kb ingest-review` 负责：

- 读取 ingest bundle 与 draft bundle
- 展示待审状态与校验结果
- 在 `--apply` 时把 draft 提升到 `wiki/`
- 在 `--reject` 时标记拒绝但保留证据

`kb maintain` 负责：

- 继续做 canonical 检查
- 增补 ingest bundle 与 apply 前置校验

## 6. 支持输入类型与采集策略

v1 支持以下输入类型：

- URL
- `txt`
- `md`
- `html`
- `rtf`
- `doc`
- `docx`
- `odt`
- `pdf`
- `png`
- `jpg`
- `jpeg`
- `webp`
- `heic`

采集策略固定如下：

- URL：先做 HTTP 采集并落本地原件，再优先走本地 `markitdown`；正文质量不足、需要登录、抓不到主内容或反爬明显时走浏览器回退
- 文本类文件：保留原件，并先走本地 `markitdown` 生成提取稿
- Word 类文件：保留原件，并先走本地 `markitdown` 生成提取稿
- PDF：保留原件，并先走本地 `markitdown` 生成提取稿
- 图片：保留原件，并先走本地 `markitdown`；当前不启用 OCR 增强

保留策略固定为“原件 + 提取稿”双保留：

- 原件永远保存在 `raw/`
- 提取后的统一 Markdown 稿也必须保留在同一个 ingest bundle 中

## 7. 收录生命周期

收录生命周期固定为以下顺序：

1. 用户口语下达收录指令
2. worker 判断这是 `new / supplement / conflict / review`
3. worker 调用 `kb ingest`
4. `kb ingest` 在 `raw/` 下创建 ingest bundle
5. worker 读取 `extracted.md` 并查询现有 canonical 页面
6. worker 生成待审 draft bundle
7. worker 向用户展示 review 摘要与建议动作
8. 用户选择修改、apply 或 reject
9. worker 调用 `kb ingest-review --apply` 或 `--reject`
10. 通过 apply 的内容进入 `wiki/`，并同步 index 与 log

状态流转固定如下：

- `needs_browser_capture`
- `blocked_duplicate`
- `ready_for_review`
- `accepted`
- `rejected`

只有 `ready_for_review` 的 bundle 才允许进入 apply 流。

## 8. 数据落点与目录约定

目录约定固定如下：

- `raw/domains/<domain>/ingest/<ingest-id>/`
- `output/ingest-drafts/<ingest-id>/wiki/...`
- `wiki/`

`raw/domains/<domain>/ingest/<ingest-id>/` 至少包含：

- `manifest.json`
- 原件
- `extracted.md`
- 需要时的浏览器补采集产物

`output/ingest-drafts/<ingest-id>/` 至少包含：

- `wiki/sources/...`
- 需要时的 `wiki/concepts/...`
- 需要时的 `wiki/entities/...`
- 需要时的 `wiki/syntheses/...`
- `review-summary.md`
- `log-entry.md`

目录治理规则固定如下：

- `wiki/` 只承接 apply 后的 canonical 页面
- `output/ingest-drafts/` 只承接待审草稿，不作为 query 数据源
- `kb query` 继续只查 `wiki/`
- `manifest.json` 是 ingest 过程的机器可读真相，不是 canonical truth

## 9. 自动派生策略

自动派生采用“最小必要派生”策略。

固定规则如下：

- 每次 ingest 必须生成 1 个 `source` 草稿
- 只有证据足够强时，才额外生成 `concept`、`entity` 或 `synthesis` 草稿
- 不因为“资料很多”就强制全量多页派生
- domain 默认是当前 founding domain：`codex-native-memory-governance`

草稿生成规则固定如下：

- 草稿必须是完整 Markdown 页面，而不是零散摘要
- 草稿 frontmatter 中 `status` 固定为 `draft`
- 草稿必须带完整 `domain / industries / categories`
- `source` 草稿必须引用本次 ingest bundle 中的原件或提取稿

模型使用规则固定如下：

- 不走外部模型 API
- 不做仓库内 SDK 调用
- 自动派生与关系判断由当前 Codex worker 基于提取稿与现有知识图谱完成
- `manifest.json` 必须能说明本次是否真的走了本地 `markitdown`

## 10. Review / Apply 契约

review 和 apply 的契约固定如下。

review 阶段必须展示：

- 资料标题与输入来源
- 识别出的关系类型
- 重复检测结果
- 生成了哪些草稿
- 哪些已有页面会被更新
- apply 后会产生什么 canonical 变化

apply 契约固定如下：

- `kb ingest-review --apply` 只接收已通过 review 的 draft bundle
- apply 时必须把草稿中的 `status: draft` 改为 `status: active`
- apply 时必须同步 `wiki/index.md`
- apply 时必须追加 `wiki/log.md`
- apply 时必须跑 apply 前校验，校验失败则拒绝提交

reject 契约固定如下：

- `kb ingest-review --reject` 不删除原件
- reject 后保留 ingest bundle 与 draft bundle，供后续追溯
- reject 不得修改 `wiki/`

## 11. 补充、冲突、重复与重收录规则

补充规则：

- 新资料补充旧知识时，先新建对应 `source` 页
- 再更新现有 `concept / entity / synthesis` 页的当前结论
- 高层页必须追加 `## Change Record`，记录这次补充的内容、日期和依据 source

冲突规则：

- 冲突时必须先保留新旧两条 source 证据
- 高层页只允许保留一个“当前结论”
- 被替代的旧判断移入 `## Historical Notes`
- 当前采纳的新判断写回主结论区
- `## Change Record` 必须写清切换原因与依据 source

重复规则：

- URL 规范化、文件或正文 hash、标题与 domain 近似命中都可触发重复判断
- 命中重复时默认进入 `blocked_duplicate`
- 未显式放行前不得 apply

重收录规则：

- 对疑似重复的内容，默认先提示再决定
- 如果用户明确要求重收录，允许继续，但必须在 manifest 里记录放行原因

知识维护的总规则固定为：

- `source` 保历史
- `concept / entity / synthesis` 保当前结论

## 12. 失败模式与降级

失败与降级策略固定如下：

- URL 抓不到正文：标记 `needs_browser_capture`
- 浏览器回退后仍无法提取有效文本：保留原件并进入人工 review，不自动派生高层页
- 文件类型不支持：直接失败并说明原因
- 本地 `markitdown` 转换质量过弱：只允许生成 `source` 草稿，不自动更新高层页
- 本地 `markitdown` 不可用或转换失败：本次 ingest 显式失败，不做静默回退
- 关系类型判断不稳定：默认降级为 `new` 或 `supplement` review，不直接走 conflict apply
- apply 校验失败：拒绝进入 `wiki/`

系统不得做的降级包括：

- 不得在提取失败时伪造正文
- 不得在无确认时自动覆盖现有高层结论
- 不得把 draft 混入 canonical

## 13. 验收标准

设计落地成功的标准如下：

- 用户可以仅用口语驱动整个收录流程
- CLI 职责清晰，worker 不与底层文件布局耦死
- URL、文档、PDF、图片都能进入统一 ingest 流
- ingest bundle、draft bundle、canonical 层三者边界清晰
- `source` 与高层页的维护规则足够明确，不需要实现者临时拍脑袋
- 补充、冲突、重复和重收录都有固定治理规则
- 未实现功能不会提前污染现有 README 或命令手册

## 14. 结论

本设计将知识库收录入口固定为“当前 Codex worker 的口语驱动流程”，并把仓库内能力收敛为两层：

- worker：理解意图、派生草稿、组织 review
- CLI：采集、提取、落盘、校验、apply

这种分工既保留了自然语言入口，又避免把模型 API、后台服务或第二套真相系统引入知识库仓库。

后续开发必须以上述边界为准，不得把 `output/`、manifest 或 ingest telemetry 视为 canonical truth。

关联文档：

- [Knowledge Base Worker-First 收录开发计划](./knowledge-base-worker-ingest-development.md)
