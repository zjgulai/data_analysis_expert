---
card_id: "oadm-fact-and-mechanism-carrier-8339594ba8"
semantic_key: "oadm:data-role:fact-and-mechanism-carrier"
card_type: "principle"
title: "数据应同时承载业务事实与事理"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s1-3-3-p018-p020"]
section_ids: ["1.3.3"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2a"
review_status: "pending"
version: 1
content_hash: "3b5abd0dd3707ffcb0275b705713f28c92547b511eb2a7e65c99869521f8dbf7"
---

# 数据应同时承载业务事实与事理

## 核心结论

作者主张面向 AI 的企业数据不能只描述发生了什么，还应表达为什么发生、依何规则运行以及如何行动，使数据成为业务事实与事理的完整载体。

## 关键要素

- 事实回答对象、状态和事件是什么。
- 事理回答原因、规则、约束和机制是什么。
- 多模态、全过程、全要素和全生命周期用于补足表达范围。

## 适用场景

- 设计 AI 可理解的数据资产
- 审查数据集是否只包含结果而缺少规则与上下文

## 不适用边界

- 事理表达需要证据、版本和责任人，不能把模型猜测写成业务规则。
- 并非所有原始数据都应无差别纳入，仍需最小必要和权限控制。

## 与其他卡片的候选关系

- `oadm:modeling:fact-mechanism-action`（候选关系，尚未建模）
- `oadm:governance:four-enterprise-ai-needs`（候选关系，尚未建模）

## SCM 候选映射

M2-A 仅完成来源内萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：1.3.3 数据成为业务事实与事理的完整载体
- 页码：PDF pp.18–20
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 四个维度在不同业务域的具体字段和粒度需要领域建模确定。
