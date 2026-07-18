---
card_id: "oadm-dual-model-validation-eff49bdf82"
semantic_key: "oadm:engineering:dual-model-validation"
card_type: "quality-gate"
title: "生成—审核—仲裁的双大模型校验"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s6-2-2-p103-p106"]
section_ids: ["6.2.2"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2c"
review_status: "pending"
version: 1
content_hash: "f8396f7fadf73ea3bf044498e3e03ffccce0f1059fee7353f85b2c41286c83b6"
---

# 生成—审核—仲裁的双大模型校验

## 核心结论

作者以异构双模型分离本体生成和逻辑审计，通过交叉互审、生成方修订或辩护、专家最终仲裁，降低单一模型的盲点。

## 关键要素

- 模型 A 负责语义重构与编码。
- 模型 B 独立检查标准、逻辑和业务覆盖。
- 争议通过反馈和修订形成显式记录。
- 核心规则分歧必须转人工终审。

## 适用场景

- 对 AI 生成本体执行二次审计
- 把模型分歧转成人工决策项

## 不适用边界

- 两个模型一致不等于结论真实或完备。
- 自动通过仅适用于预先定义的低风险一致项。

## 与其他卡片或术语的候选关系

- `oadm:engineering:controlled-ai-ontology-modeling`（候选关系，尚未晋升）
- `oadm:engineering:scenario-validation-loop`（候选关系，尚未晋升）

## SCM 候选映射

M2-C 仅完成来源内工程方法萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：6.2.2 双大模型协同完成本体模型校验与优化
- 页码：PDF pp.103–106
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 异构模型的独立性和仲裁阈值需实施时验证。
