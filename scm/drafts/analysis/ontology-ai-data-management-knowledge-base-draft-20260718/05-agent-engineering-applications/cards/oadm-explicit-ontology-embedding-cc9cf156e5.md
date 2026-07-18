---
card_id: "oadm-explicit-ontology-embedding-cc9cf156e5"
semantic_key: "oadm:agent-engineering:explicit-ontology-embedding"
card_type: "method"
title: "保留显式逻辑结构的本体嵌入策略"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-1-4-p133-p134"]
section_ids: ["7.1.4"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "b7df2f8a406d3505019478f79ce447d0e83c7d599f7b7bff4183a8523d0552b3"
---

# 保留显式逻辑结构的本体嵌入策略

## 核心结论

作者默认推荐以结构化 Prompt 把本体规则、因果和约束转成模型上下文，仅在明确的高频、延迟或一致性需求下考虑微调和合成数据增训。

## 关键要素

- Prompt 嵌入无须训练且便于追溯。
- 指令微调用于少数高频标准任务。
- 数据增训可补数据稀缺但会放大本体缺陷。
- 阈值和约束不应退化为模糊文本。

## 适用场景

- 将本体片段注入 Agent 推理
- 评估微调前的低成本方案

## 不适用边界

- Prompt 可解释不代表推理必然遵从。
- 微调与增训需单独评估通用能力退化。

## 与其他卡片或术语的候选关系

- `oadm:agent-engineering:minimal-ontology-retrieval`（候选关系，尚未晋升）
- `oadm:engineering:controlled-ai-ontology-modeling`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.1.4 本体嵌入 AI 模型
- 页码：PDF pp.133–134
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 作者对 Prompt 可靠性的判断未在本项目验证。
