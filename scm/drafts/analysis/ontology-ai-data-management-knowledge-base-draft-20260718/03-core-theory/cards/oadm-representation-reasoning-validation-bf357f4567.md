---
card_id: "oadm-representation-reasoning-validation-bf357f4567"
semantic_key: "oadm:ontology-llm:representation-reasoning-validation"
card_type: "method"
title: "本体增强推理的表示—推理—验证三阶段"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s4-2-2-p063-p064"]
section_ids: ["4.2.2"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "72e01c99d4993eb8ed4581e5ea4529ad84c640970aeeb5c16c1822a6486f0001"
---

# 本体增强推理的表示—推理—验证三阶段

## 核心结论

作者把可信推理分为表示、推理与验证，对应本体帮助 AI 看清现实、依据规则决策、触发行动并用结果反馈校验。

## 关键要素

- 表示阶段决定可调用哪些事实和知识。
- 推理阶段形成逐步有依据的结论。
- 验证阶段检查合理性、一致性、合规性和行动效果。

## 适用场景

- 设计可追溯 Agent 推理管线
- 定义推理前、中、后的质量门禁

## 不适用边界

- 阶段划分不意味着验证只能发生在最后。
- 本体中的错误规则也会系统性放大，需独立校验。

## 与其他卡片或术语的候选关系

- `oadm:ontology-llm:three-connections`（候选关系，尚未晋升）
- `oadm:agent:fact-mechanism-action-landing`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：4.2.2 本体增强 AI 推理的核心机理
- 页码：PDF pp.63–64
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 验证指标与失败恢复策略需按场景定义。
