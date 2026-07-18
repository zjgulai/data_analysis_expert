---
card_id: "oadm-inference-result-traceability-0d0557615e"
semantic_key: "oadm:inference-asset:traceability"
card_type: "governance-rule"
title: "推理结果与过程日志的全链路追溯"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s5-3-3-p089-p090"]
section_ids: ["5.3.3"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "73838631e27313c7c5aca14c84b3afb7ede7780b03d280c0dfe03fc05027b490"
---

# 推理结果与过程日志的全链路追溯

## 核心结论

作者要求每次推理实例同时保留结果和过程日志，并关联业务本体、任务 ID、推理时间、依赖数据版本、评价结论和行动轨迹。

## 关键要素

- 结果记录决策产物和评估结论。
- 日志记录数据路径、步骤、异常与时间戳。
- 日志、结果、任务和来源版本形成可复现链路。

## 适用场景

- Agent 审计与问题排查
- 推理结果转为作业或分析资产

## 不适用边界

- 日志留存必须受隐私、最小必要和留存周期约束。
- 可追溯不等于推理逻辑正确，仍需结果评估。

## 与其他卡片或术语的候选关系

- `oadm:inference-asset:fact-mechanism-result`（候选关系，尚未晋升）
- `oadm:ontology-llm:representation-reasoning-validation`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：5.3.3 支撑 AI 输出可控、可解释、可审计的推理结果数据
- 页码：PDF pp.89–90
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 日志粒度、敏感字段脱敏和保留期限需组织政策确定。
