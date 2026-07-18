---
card_id: "oadm-safe-dynamic-action-loop-e794577c2f"
semantic_key: "oadm:agent-action:safe-dynamic-action-loop"
card_type: "quality-gate"
title: "动态 Action 的执行前校验与反馈闭环"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-4-2-p146-p147"]
section_ids: ["7.4.2"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "fb2dff85d8cd24f122183fe2d995e9d182ec6b79f610ad7b4819ad6dec9d0dc7"
---

# 动态 Action 的执行前校验与反馈闭环

## 核心结论

作者要求 Action 明确目标系统、协议、输入和凭证，执行前检查合规、可行与安全，执行后根据成功、失败或异常码选择重试、降级或终止。

## 关键要素

- Action 定义结构化且可调用。
- 报文适配目标协议。
- 任何前置校验失败均不得发出。
- 结果反馈更新任务状态。

## 适用场景

- 设计 Agent 工具调用门禁
- 控制物理设备和业务 API 执行

## 不适用边界

- 真实执行需要认证、授权、审计和回滚。
- 本批没有进行任何外部系统调用。

## 与其他卡片或术语的候选关系

- `oadm:agent-action:risk-routed-execution`（候选关系，尚未晋升）
- `oadm:agent-architecture:five-component-stack`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.4.2 动态 Action 关联机制
- 页码：PDF pp.146–147
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 重试、降级和终止策略需逐 Action 定义。
