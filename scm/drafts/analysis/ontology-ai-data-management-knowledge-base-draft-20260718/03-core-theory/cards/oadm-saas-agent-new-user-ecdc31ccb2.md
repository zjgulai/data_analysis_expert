---
card_id: "oadm-saas-agent-new-user-ecdc31ccb2"
semantic_key: "oadm:enterprise-architecture:saas-agent-new-user"
card_type: "model"
title: "AI Agent 作为 SaaS 新用户"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s4-4-5-p072-p073"]
section_ids: ["4.4.5"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "d9579198076d4d4736ba179a45e57adb20363bbc38bb7917dce83a64bf23e841"
---

# AI Agent 作为 SaaS 新用户

## 核心结论

作者提出用本体把 SaaS 字段、规则、权限和接口映射为业务语义，使 Agent 可经 API、MCP 或自然语言调用现有系统，而非重构或替代 SaaS。

## 关键要素

- 实体元数据映射为本体资源。
- 规则和权限元数据升级为可推理语义。
- Agent 以语义上下文理解并调用 SaaS 工具。

## 适用场景

- 存量 SaaS 的 Agent 化接入
- 跨系统任务编排

## 不适用边界

- 非侵入接入仍需接口、身份、权限和审计改造。
- Agent 是新用户不代表拥有人的全部权限。

## 与其他卡片或术语的候选关系

- `oadm:enterprise-architecture:semantic-layer`（候选关系，尚未晋升）
- `oadm:ontology-llm:technology-integration-matrix`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：4.4.5 本体与 SaaS
- 页码：PDF pp.72–73
- 证据等级：`published-book-derived-candidate`

## 不确定项

- MCP、API 与 UI 自动化的适配方式需逐系统核验。
