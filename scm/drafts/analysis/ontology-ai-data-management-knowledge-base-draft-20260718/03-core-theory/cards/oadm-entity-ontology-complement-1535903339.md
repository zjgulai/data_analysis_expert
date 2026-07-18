---
card_id: "oadm-entity-ontology-complement-1535903339"
semantic_key: "oadm:enterprise-architecture:entity-ontology-complement"
card_type: "comparison"
title: "实体建模与本体建模互补"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s4-4-2-p069-p070"]
section_ids: ["4.4.2"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "cf181606f8cc216dc3350caa023453ce2396f8399198d5300ca7b62bb3bb2952"
---

# 实体建模与本体建模互补

## 核心结论

作者认为实体建模提供实例事实和 know-what，本体建模提供规则、因果和 know-why/how，二者共同支撑从查询事实到判断并行动。

## 关键要素

- 实体侧记录对象、属性和值。
- 本体侧定义类、关系、规则和状态变化。
- 事实与事理可在图或关系存储中联动。

## 适用场景

- 避免用本体替代业务数据模型
- 设计事实与规则联合查询

## 不适用边界

- 本体与 ERD 的边界会因建模方法和平台而异。
- 共同存储不等于语义自动一致。

## 与其他卡片或术语的候选关系

- `oadm:modeling:fact-mechanism-action`（候选关系，尚未晋升）
- `oadm:enterprise-architecture:knowledge-graph-ontology-complement`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：4.4.2 本体与实体建模
- 页码：PDF pp.69–70
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 具体映射规则和同步机制需另行设计。
