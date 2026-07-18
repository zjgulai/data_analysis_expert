---
card_id: "oadm-ai-directory-hierarchy-5252a8be5d"
semantic_key: "oadm:data-asset:ai-directory-hierarchy"
card_type: "model"
title: "面向 AI 的数据资产目录层级"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s5-1-3-p076-p080"]
section_ids: ["5.1.3"]
fact_reason_action_class: "fact"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "3d8968e3c4c36a099da69148ab7a21d6fff618da5d054117109e78a594273011"
---

# 面向 AI 的数据资产目录层级

## 核心结论

作者以 AI 业务数据或本体作为任务锚点，在其下管理训练数据集和由事实数据、事理模型、推理结果组成的推理资产，并继续细化到底层原子记录。

## 关键要素

- L3 是 AI 任务或决策范围的管理锚点。
- L4 区分训练数据资产与推理数据资产。
- L5 细化到文件、Chunk、字段、三元组、单条事理和推理实例。

## 适用场景

- 设计 AI 数据资产目录 schema
- 建立任务到数据、规则和结果的追溯

## 不适用边界

- 层级是作者框架，不应直接覆盖现有目录而不做映射。
- AI 业务数据与 AI 业务本体必须区分是否完成本体建模。

## 与其他卡片或术语的候选关系

- `oadm:data-asset:three-catalogs`（候选关系，尚未晋升）
- `oadm:inference-asset:fact-mechanism-result`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：5.1.3 面向 AI 的数据资产目录
- 页码：PDF pp.76–80
- 证据等级：`published-book-derived-candidate`

## 不确定项

- L3-L5 与项目现有资产粒度的映射尚未评估。
