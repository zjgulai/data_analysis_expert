---
card_id: "oadm-ai-dataset-responsibility-triad-02ef1387b5"
semantic_key: "oadm:ai-dataset:responsibility-triad"
card_type: "governance-rule"
title: "数据 Owner—数据集责任人—使用责任人三方边界"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s5-2-3-p082-p084"]
section_ids: ["5.2.3"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "c5aa5abf562934e4b3b0b9eee09a5297244be998b845c40c61e160e1556dc9a1"
---

# 数据 Owner—数据集责任人—使用责任人三方边界

## 核心结论

作者区分原始数据端到端责任、AI 数据集供给与生命周期责任、消费使用责任，并要求原始数据的许可、安全和管理约束沿数据集供给链传递。

## 关键要素

- 数据 Owner 管理原始业务数据、质量、安全和授权。
- 数据集责任人负责采集、清洗、发布、版本和生命周期。
- 使用责任人负责在许可范围内安全、合规使用并按要求删除。

## 适用场景

- 设计 AI 数据集 RACI
- 处理跨 Owner 数据合并和外部数据引入

## 不适用边界

- 角色名称和任命方式属于作者建议，不等于项目现行制度。
- 责任传递不能替代原 Owner 的法定或组织责任。

## 与其他卡片或术语的候选关系

- `oadm:ai-dataset:admission-construction`（候选关系，尚未晋升）
- `oadm:ai-dataset:classification-versioning`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：5.2.3 数据 Owner 与 AI 数据集责任人、AI 数据集使用责任人的关系界定
- 页码：PDF pp.82–84
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 合成数据、公开数据和外部采购的责任边界需结合合同与法规。
