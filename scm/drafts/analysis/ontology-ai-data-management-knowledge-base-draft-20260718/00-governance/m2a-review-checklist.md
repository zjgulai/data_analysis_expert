---
title: M2-A 战略认知篇内容萃取复核清单
doc_type: checklist
module: scm
topic: ontology-ai-data-management-m2a
status: draft
created: 2026-07-18
updated: 2026-07-18
owner: self
source: human+ai
---

# M2-A 战略认知篇内容萃取复核清单

## 批次范围

- PDF 第 1–3 章，物理页 PDF p.8–52。
- 32 个三级正文小节、3 个章末小结，共 35 条来源记录。
- 12 张用于验证 schema、稳定 ID、页级引用和证据边界的知识卡。
- 本批不执行 SCM crosswalk、关系入库、importer 改造或数据库写入。

## 内容复核

- [x] 标题、章节和页码与 PDF 文本层对应。
- [x] 每条摘要明确以“作者”作为主张主体，未写成项目事实。
- [x] Palantir 内容标记为 `author_example`，未宣称项目侧独立核验。
- [x] 12 张卡片均包含核心结论、关键要素、场景、边界、候选关系、来源和不确定项。
- [x] 关键框架页面 PDF p.11、14、21、25、35、40、45、51 已视觉复核。
- [ ] 其余带图表小节仍为 `pending`，后续随对应章节卡片扩展时复核。

## 工程复核

- [x] `card_id` 仅由稳定语义键生成，不依赖文件或数组排序。
- [x] `content_hash` 由规范化种子内容生成，内容变化会更新哈希但不改变 ID。
- [x] 每张卡至少关联一个 `source_span_id`，且引用可解析。
- [x] 生成结果连续两次运行字节一致。
- [x] 附件 SHA-256 与 M1 源清单一致，页数仍为 211。
- [x] SQLite 批次前后 SHA-256 一致。
- [x] 制品扫描未发现个人绝对路径、完整原文或整页图像。

## 证据边界

- `evidence_level=published-book-derived-candidate`
- `review_status=pending`
- `scm_applicability=not_assessed_in_m2a`
- `database_write=false`
- `provider_call=false`
- `production_unchanged=true`
