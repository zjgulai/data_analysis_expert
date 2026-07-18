---
title: M2-C 第 6 章工程方法内容萃取复核清单
doc_type: checklist
module: scm
topic: ontology-ai-data-management-m2c
status: draft
created: 2026-07-18
updated: 2026-07-18
owner: self
source: human+ai
---

# M2-C 第 6 章工程方法内容萃取复核清单

## 批次范围

- PDF 第 6 章，物理页 PDF p.96–127。
- 17 个三级正文小节、1 个章末小结，共 18 条来源记录。
- 新增 12 张工程方法卡、11 个受控术语、24 条候选关系。
- 本批不执行 SCM crosswalk、importer 改造、数据库写入或外部调用。

## 内容复核

- [x] 章节标题、页码、图表锚点与 PDF 文本层对应。
- [x] 五环工程闭环、29 句话、双模型校验、资产运营、平台和点线面路径分别建卡。
- [x] 第 5 章已有的 W3C 标准栈与 7+1 节点直接复用，没有重复建档。
- [x] 作者方法、质量关口、治理规则、平台能力和实施路径使用不同 claim type。
- [x] 模型能力、周期收益、案例结果及标准适用性保留未独立核验边界。
- [x] PDF p.97、100、104、111、114、118、126 已视觉复核。
- [ ] 其余含图表来源段保持 `pending`，后续按应用卡需求补充复核。

## 工程复核

- [x] 12 张卡片、11 个术语和 24 条关系均采用稳定语义键生成 ID。
- [x] 内容哈希与实体 ID 分离，连续重跑产物字节一致。
- [x] 关系主体、客体和来源 span 全部可解析，M2-C 卡片孤儿数为 0。
- [x] M2-A、M2-B、M2-C 卡片聚合为 48 张，语义键无重复。
- [x] M2-B 术语与关系新增独立批次 manifest，M2-C 聚合为 44 个术语、60 条关系。
- [x] 附件 SHA-256 和 211 页页数复核通过。
- [x] SQLite 前后哈希保持 `cb91dd0d63dad2d62d73f7da5c7058254b08ac36feb139921a38121dcf61cc99`。
- [x] 未持久化完整原文、临时整页图片或个人绝对路径。

## 证据边界

- `evidence_level=published-book-derived-candidate`
- `relation_status=candidate`
- `review_status=pending`
- `author_examples_independently_verified=false`
- `official_standards_verified=false`
- `scm_crosswalk_performed=false`
- `importer_modified=false`
- `database_write=false`
- `provider_call=false`
- `production_unchanged=true`
