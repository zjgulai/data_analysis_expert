---
card_id: "oadm-constraint-strength-traceability-778b4ec0f4"
semantic_key: "oadm:agent-reasoning:constraint-strength-traceability"
card_type: "governance"
title: "可配置约束强度与逐步推理溯源"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-2-2-p136-p138"]
section_ids: ["7.2.2"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "b6951438faf09b0907aa4c624eaca89f8080492276f6f26aef176748b530f623"
---

# 可配置约束强度与逐步推理溯源

## 核心结论

作者建议每个推理步骤标注所依赖的本体规则，并按安全风险设置强、中、弱约束；推理发现的新规则必须经过专家验证才能进入本体。

## 关键要素

- 强约束用于安全和合规决策。
- 弱约束为探索性建议保留空间。
- 步骤级依据支持解释和排错。
- 新线索先候选、后专家确认。

## 适用场景

- 治理 Agent 自主性边界
- 记录推理证据与规则版本

## 不适用边界

- 约束等级本身需要权威责任人定义。
- 可追溯日志不等于决策正确。

## 与其他卡片或术语的候选关系

- `oadm:agent-reasoning:fact-mechanism-goal`（候选关系，尚未晋升）
- `oadm:engineering:scenario-validation-loop`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.2.2 基于感知+事理的融合推理
- 页码：PDF pp.136–138
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 约束等级的标准化表达尚未在来源中给出完整 schema。
