---
card_id: "oadm-fact-mechanism-action-landing-d10e3b9509"
semantic_key: "oadm:agent:fact-mechanism-action-landing"
card_type: "method"
title: "Agent 从明事实、懂事理到会行动的落地链"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s5-5-1-p093-p094","oadm-span-s5-5-2-p094-p094","oadm-span-s5-5-3-p094-p095"]
section_ids: ["5.5.1","5.5.2","5.5.3"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "765c7ee7b59064262d0adc208372a7556fbafee8b9d37352c67674fe7f7b5877"
---

# Agent 从明事实、懂事理到会行动的落地链

## 核心结论

作者提出 Agent 先整合多源事实还原状态，再依据规则、活动前置条件与效果规划行动，最后调用 IT 工具、与人协作并服从权限边界。

## 关键要素

- 事实阶段整合历史、实时和多模态状态。
- 事理阶段用规则、流程和查询补全从现状到行动的逻辑。
- 行动阶段把语义动作转成接口调用并比较实际与预期效果。
- 权限规则区分自主、需审批和禁止动作。

## 适用场景

- 设计端到端 Agent 业务闭环
- 定义人机审批和工具执行边界

## 不适用边界

- 书中汽车售后场景是作者示例，未在本项目验证。
- 语义到行动必须经过身份、权限、审计和失败恢复控制。

## 与其他卡片或术语的候选关系

- `oadm:modeling:fact-mechanism-action`（候选关系，尚未晋升）
- `oadm:semantic-framework:seven-plus-one`（候选关系，尚未晋升）
- `oadm:ontology-llm:representation-reasoning-validation`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：5.5.1 基于事实的推演：本体驱动 AI Agent 还原当前状态并推演下一步变化；5.5.2 事理上下文：本体使 AI Agent 对齐从当前事实到未来行动的事理逻辑；5.5.3 语义到行动：本体驱动 AI Agent 对接传统 IT 与人，落实具体业务操作
- 页码：PDF pp.93–95
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 自动执行等级和人工确认点必须按场景风险另行设计。
