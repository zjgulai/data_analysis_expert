---
card_id: "oadm-fact-mechanism-goal-1b4a142306"
semantic_key: "oadm:agent-reasoning:fact-mechanism-goal"
card_type: "framework"
title: "事实—事理—目标三位一体的增强推理"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-2-1-p135-p136","oadm-span-s7-2-2-p136-p138","oadm-span-s7-2-3-p138-p140"]
section_ids: ["7.2.1","7.2.2","7.2.3"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "04cfe9d23ba44fb78521d65e7eb2a10acc4f5e68d24dcb20c70853917d3bf006"
---

# 事实—事理—目标三位一体的增强推理

## 核心结论

作者以语义化事实建立情境，用本体事理提供规则与边界，再由业务目标牵引形成及时、有效、合规的综合决策。

## 关键要素

- 事实经语义注册成为可推理实体。
- 7+1 提供理解、约束、规划和权限逻辑。
- 目标决定决策效果和人工介入点。
- 推理依据和执行链需可追溯。

## 适用场景

- 设计高可靠 Agent 推理链
- 分离事实、规则和目标责任

## 不适用边界

- 事实接入和本体逻辑均需独立质量控制。
- 三位一体框架不自动解决冲突与不确定性。

## 与其他卡片或术语的候选关系

- `oadm:inference-asset:fact-mechanism-result`（候选关系，尚未晋升）
- `oadm:agent-reasoning:constraint-strength-traceability`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.2.1 基于事实数据的实时感知；7.2.2 基于感知+事理的融合推理；7.2.3 基于感知、推理和目标的综合决策
- 页码：PDF pp.135–140
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 不同场景对实时性、有效性和合规性的权重需另行设计。
