---
card_id: "oadm-risk-routed-execution-5fd5f72377"
semantic_key: "oadm:agent-action:risk-routed-execution"
card_type: "action-pattern"
title: "按风险路由的三类决策—行动方式"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-3-1-p141-p141","oadm-span-s7-3-2-p141-p143","oadm-span-s7-3-3-p143-p144"]
section_ids: ["7.3.1","7.3.2","7.3.3"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "15657e58dbb58e4283d364f10f6b08bddd330c3f3b3952ba1795df1132198f78"
---

# 按风险路由的三类决策—行动方式

## 核心结论

作者按规则确定性、风险和协同复杂度在指令直驱、人工介入、多 Agent 业务协同之间路由，使自动化程度与安全责任相匹配。

## 关键要素

- 低风险且后果可控可直接下发指令。
- 高风险或法规要求触发分层人工审核。
- 跨系统复杂流程由主子 Agent 协同执行。
- 反馈用于重试、调整或更新候选规则。

## 适用场景

- 定义 Agent 自动执行等级
- 配置审批和协同执行边界

## 不适用边界

- 风险分类需结合真实业务后果和法规。
- 人工修正只能作为待审优化建议。

## 与其他卡片或术语的候选关系

- `oadm:agent-decision:human-multi-agent-modes`（候选关系，尚未晋升）
- `oadm:agent-action:execution-event-bus`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.3.1 指令直驱型；7.3.2 人工介入型；7.3.3 业务协同执行型
- 页码：PDF pp.141–144
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 三种方式间的自动切换条件需工程化定义。
