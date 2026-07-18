---
card_id: "oadm-seven-plus-one-framework-4e7856904e"
semantic_key: "oadm:semantic-framework:seven-plus-one"
card_type: "framework"
title: "事理模型的“7+1”语义规范框架"
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
content_hash: "1595df89a4a22ce45d2e6bd89c6de1542d606bec609fbb4df52376176004a06e"
---

# 事理模型的“7+1”语义规范框架

## 核心结论

作者以资源描述、分层约束、业务术语、控制规则、流程行动、权限管控、数据操作七类语义，加目标与评估维度，构成业务事理到 AI 可用语义的工程框架。

## 关键要素

- 七类语义覆盖是什么、如何分类、如何命名、何时触发、怎样执行、谁能执行和如何操作数据。
- 目标与评估明确做什么、做到何种标准和依据什么做。
- 框架强调模型必须适配具体 AI 任务并接受效果验证。

## 适用场景

- 规范业务专家输出事理描述
- 审查本体是否覆盖决策和行动所需语义

## 不适用边界

- 7+1 是作者工程框架，不是 W3C 官方统一套件。
- 29 种表达范式将在后续第 6 章萃取，本批未展开。

## 与其他卡片或术语的候选关系

- `oadm:semantic-standard:w3c-stack`（候选关系，尚未晋升）
- `oadm:semantic-standard:role-map`（候选关系，尚未晋升）
- `oadm:agent:fact-mechanism-action-landing`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：5.4.1 RDF：定义业务资源，支撑 AI 理解；5.4.2 OWL：统一跨域概念，消除语义歧义；5.4.3 SKOS：统一基础术语，筑牢语义基础；5.4.4 SWRL：定义跨域逻辑，支撑 AI 自主决策；5.4.5 OWL-S：串联流程逻辑，搭建任务框架；5.4.6 ODRL：定义操作权限，筑牢安全边界；5.4.7 SPARQL：定义数据操作，支撑 AI 执行；5.4.8 目标与评估：明确任务及业务效果，支撑 AI 迭代优化
- 页码：PDF pp.90–93
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 各维度的必选、可选及验证规则需在工程阶段定义。
