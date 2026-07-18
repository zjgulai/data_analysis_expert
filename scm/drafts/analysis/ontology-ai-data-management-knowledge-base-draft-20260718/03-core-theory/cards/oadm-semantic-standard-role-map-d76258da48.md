---
card_id: "oadm-semantic-standard-role-map-d76258da48"
semantic_key: "oadm:semantic-standard:role-map"
card_type: "mapping"
title: "7+1 维度与语义标准的作者映射"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s5-4-1-p090-p092","oadm-span-s5-4-2-p092-p092","oadm-span-s5-4-3-p092-p092","oadm-span-s5-4-4-p092-p092","oadm-span-s5-4-5-p092-p092","oadm-span-s5-4-6-p092-p093","oadm-span-s5-4-7-p093-p093","oadm-span-s5-4-8-p093-p093"]
section_ids: ["5.4.1","5.4.2","5.4.3","5.4.4","5.4.5","5.4.6","5.4.7","5.4.8"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "1d559a2b679c84e580094016533164c83c365e87cda4a7a890209d6e399ba4c5"
---

# 7+1 维度与语义标准的作者映射

## 核心结论

作者分别用 RDF、OWL、SKOS、SWRL、OWL-S、ODRL、SPARQL 对应资源、约束、术语、规则、行动、权限和数据操作，并以目标评估补足任务效果。

## 关键要素

- RDF、OWL、SKOS构成事实、分类与词义基础。
- SWRL 与 OWL-S 表达规则和行动前置条件及效果。
- ODRL 和 SPARQL表达使用控制与数据取用。
- 目标评估不由单一 W3C 语言替代。

## 适用场景

- 生成候选语义技术选型表
- 建立框架维度到实现标准的可审阅关系

## 不适用边界

- 该映射来自本书，采用前必须查证各标准官方规范和生态现状。
- 一个维度可能需要多个标准与非标准控制共同实现。

## 与其他卡片或术语的候选关系

- `oadm:semantic-framework:seven-plus-one`（候选关系，尚未晋升）
- `oadm:semantic-standard:w3c-stack`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：5.4.1 RDF：定义业务资源，支撑 AI 理解；5.4.2 OWL：统一跨域概念，消除语义歧义；5.4.3 SKOS：统一基础术语，筑牢语义基础；5.4.4 SWRL：定义跨域逻辑，支撑 AI 自主决策；5.4.5 OWL-S：串联流程逻辑，搭建任务框架；5.4.6 ODRL：定义操作权限，筑牢安全边界；5.4.7 SPARQL：定义数据操作，支撑 AI 执行；5.4.8 目标与评估：明确任务及业务效果，支撑 AI 迭代优化
- 页码：PDF pp.90–93
- 证据等级：`published-book-derived-candidate`

## 不确定项

- BPMN、SHACL 等可能相关技术不在本批来源映射范围。
