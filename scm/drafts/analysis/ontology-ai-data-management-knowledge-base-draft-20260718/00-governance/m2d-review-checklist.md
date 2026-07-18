---
title: M2-D 第 7–8 章 Agent 工程与应用场景复核清单
doc_type: checklist
module: scm
topic: ontology-ai-data-management-m2d
status: draft
created: 2026-07-18
updated: 2026-07-18
owner: self
source: human+ai
---

# M2-D 第 7–8 章 Agent 工程与应用场景复核清单

## 批次范围

- PDF 第 7–8 章，物理页 PDF p.128–178。
- 33 个三级正文小节、2 个章末小结，共 35 条来源记录。
- 新增 23 张知识卡、16 个受控术语、46 条候选关系。
- 本批不执行 SCM crosswalk、importer 改造、数据库写入或外部调用。

## 内容复核

- [x] 标题、页码、图表锚点与 PDF 文本层对应。
- [x] Agent 意图、本体调用、增强推理、行动路由、五组件架构和平台路径分别建卡。
- [x] 六类应用模式与穿刺验证、小切口、存量转译策略分别建卡。
- [x] 作者案例、效率数字、准确率与业务收益标记为未独立核验。
- [x] 作者对标准、数据库产品、MCP、Graph RAG 与 ReAct 的判断未冒充官方结论。
- [x] PDF p.130、132、133、139、145、149、160、163、168、170、175 已视觉复核。
- [ ] 其余含图表来源段保持 `pending`，后续按跨批关系和应用评审需要补充。

## 工程复核

- [x] 23 张卡片、16 个术语和 46 条关系使用稳定语义键生成 ID。
- [x] 内容哈希与实体 ID 分离，连续重跑产物字节一致。
- [x] 关系主体、客体和来源 span 全部可解析，M2-D 卡片孤儿数为 0。
- [x] M2-A 至 M2-D 聚合为 71 张卡、60 个术语、106 条关系，语义键与关系 ID 无重复。
- [x] 附件 SHA-256 和 211 页页数复核通过。
- [x] SQLite 前后哈希保持 `cb91dd0d63dad2d62d73f7da5c7058254b08ac36feb139921a38121dcf61cc99`。
- [x] 未持久化完整原文、临时整页图片或个人绝对路径。

## 证据边界

- `evidence_level=published-book-derived-candidate`
- `relation_status=candidate`
- `review_status=pending`
- `author_examples_independently_verified=false`
- `author_metrics_independently_verified=false`
- `official_standards_verified=false`
- `scm_crosswalk_performed=false`
- `importer_modified=false`
- `database_write=false`
- `provider_call=false`
- `production_unchanged=true`
