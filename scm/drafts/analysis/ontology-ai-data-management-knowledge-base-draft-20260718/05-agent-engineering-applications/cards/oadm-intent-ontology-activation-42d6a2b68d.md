---
card_id: "oadm-intent-ontology-activation-42d6a2b68d"
semantic_key: "oadm:agent-engineering:intent-ontology-activation"
card_type: "method"
title: "意图—本体—模型的动态激活链"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-1-1-p128-p130","oadm-span-s7-1-2-p130-p131"]
section_ids: ["7.1.1","7.1.2"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "51901891bd8dddcd74cf6153ab5bca9e769a7a04e8b19b3b882618f998d92e18"
---

# 意图—本体—模型的动态激活链

## 核心结论

作者要求先把业务目标拆成聚焦且独立的 Agent 意图，再以固定映射、规则映射或本体自主推理确定所需知识边界，使任务语义能够按需激活本体。

## 关键要素

- 意图按业务目标、子任务和执行颗粒度设计。
- 对齐方式从硬编码逐步走向动态自主。
- 本体模块需边界清晰，减少调用冲突。
- 执行反馈用于修正意图与本体映射。

## 适用场景

- 设计 Agent 任务路由
- 建立意图到知识模块的映射

## 不适用边界

- 本体自主推理对齐是作者前瞻方案，未验证其稳定性。
- 意图拆分不应替代业务责任边界设计。

## 与其他卡片或术语的候选关系

- `oadm:agent-engineering:minimal-ontology-retrieval`（候选关系，尚未晋升）
- `oadm:semantic-framework:seven-plus-one`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.1.1 AI Agent 意图设计；7.1.2 意图与本体对齐
- 页码：PDF pp.128–131
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 各对齐范式的成熟度和维护成本需按系统实测。
