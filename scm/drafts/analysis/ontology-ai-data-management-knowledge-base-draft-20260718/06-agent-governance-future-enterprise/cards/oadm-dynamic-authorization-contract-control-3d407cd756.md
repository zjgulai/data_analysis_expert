---
card_id: "oadm-dynamic-authorization-contract-control-3d407cd756"
semantic_key: "oadm:agent-trust:dynamic-authorization-contract-control"
card_type: "control-pattern"
title: "动态权限凭证与智能合约执行控制"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s9-2-3-p186-p187","oadm-span-s9-2-4-p187-p188"]
section_ids: ["9.2.3","9.2.4"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2e"
review_status: "pending"
version: 1
content_hash: "da3dcb10c0552c7a7a96a0b2ba02196ed71bdc6a3613e6d86e27f0c51cd41f5f"
---

# 动态权限凭证与智能合约执行控制

## 核心结论

作者将权限条件、有效期、数据范围和审批签名写入可验证凭证，并由智能合约自动激活、回收、冻结和推进协作节点。

## 关键要素

- 授权凭证携带范围与时效。
- 智能锁响应场景变化。
- 关键节点存证，高频交互可离链。
- 越权尝试触发冻结或人工介入。

## 适用场景

- Agent 最小权限控制
- 条件化跨组织协作

## 不适用边界

- 默认通过和自动支付等规则需严格业务审批。
- 智能合约错误可能自动放大，必须可暂停和回滚。

## 与其他卡片或术语的候选关系

- `oadm:agent-action:safe-dynamic-action-loop`（候选关系，尚未晋升）
- `oadm:agent-trust:six-proof-accountability-system`（候选关系，尚未晋升）

## SCM 候选映射

M2-E 仅完成来源内 Agent 治理与未来企业形态萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：9.2.3 授权证明：通过权限凭证链实现 AI 权限管理与智能锁控；9.2.4 合约证明：以智能合约搭建智能协作自动执行流水线
- 页码：PDF pp.186–188
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 授权撤销延迟、密钥管理与合约升级机制需设计。
