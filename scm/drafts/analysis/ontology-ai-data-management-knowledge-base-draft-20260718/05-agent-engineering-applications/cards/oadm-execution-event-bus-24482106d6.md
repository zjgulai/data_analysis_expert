---
card_id: "oadm-execution-event-bus-24482106d6"
semantic_key: "oadm:agent-action:execution-event-bus"
card_type: "architecture"
title: "本体定义的多 Agent 执行事件总线"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-3-3-p143-p144"]
section_ids: ["7.3.3"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "4a3739dbf48871fae2c28a5c3ef011f59ad65626446154bfcf839667bf6f1e85"
---

# 本体定义的多 Agent 执行事件总线

## 核心结论

作者以统一事件总线传递任务、状态和异常，主 Agent 拆解决策并统筹，子 Agent 执行反馈，形成决策—执行—反馈—优化闭环。

## 关键要素

- 任务消息使用统一语义。
- 主子 Agent 权责和时限清晰。
- 执行状态实时反馈。
- 异常驱动任务重分配或策略调整。

## 适用场景

- 跨系统多 Agent 协同
- 建立执行状态与责任跟踪

## 不适用边界

- 事件总线需要幂等、顺序、重试和死信策略。
- 本批不设计具体消息协议。

## 与其他卡片或术语的候选关系

- `oadm:agent-action:risk-routed-execution`（候选关系，尚未晋升）
- `oadm:agent-architecture:five-component-stack`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.3.3 业务协同执行型
- 页码：PDF pp.143–144
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 来源未给出并发冲突与分布式失败处理细节。
