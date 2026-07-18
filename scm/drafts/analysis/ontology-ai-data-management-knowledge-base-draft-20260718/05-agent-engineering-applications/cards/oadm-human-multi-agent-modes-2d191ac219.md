---
card_id: "oadm-human-multi-agent-modes-2d191ac219"
semantic_key: "oadm:agent-decision:human-multi-agent-modes"
card_type: "decision-pattern"
title: "人机协同与多 Agent 联合决策模式"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-2-3-p138-p140"]
section_ids: ["7.2.3"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "d13aa8466b0e19ad788e6451835e620570ab7efc818eee8b7ab578a5a2b1493b"
---

# 人机协同与多 Agent 联合决策模式

## 核心结论

作者区分人在关键风险节点裁决的人机协同决策，以及识别、评估、推荐、报文 Agent 串联的自主联合决策，并用本体定义角色、接口和介入点。

## 关键要素

- 人负责价值判断、风险把控和最终确认。
- 不同 Agent 分担识别、评估、推荐和报文。
- 本体提供标准化交互契约。
- 两种模式均需及时、有效和合规。

## 适用场景

- 设计人在环中的决策流程
- 拆分多 Agent 决策职责

## 不适用边界

- 多 Agent 增加协调和责任追踪复杂度。
- 核心风险决策不得仅因模型一致而自动通过。

## 与其他卡片或术语的候选关系

- `oadm:agent-reasoning:fact-mechanism-goal`（候选关系，尚未晋升）
- `oadm:agent-action:risk-routed-execution`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.2.3 基于感知、推理和目标的综合决策
- 页码：PDF pp.138–140
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 各 Agent 的仲裁、超时和冲突处理未在来源中完备定义。
