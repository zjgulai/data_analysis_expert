---
card_id: "oadm-minimal-ontology-retrieval-bc8ea50e30"
semantic_key: "oadm:agent-engineering:minimal-ontology-retrieval"
card_type: "method"
title: "最小必要本体与混合检索调用"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-1-3-p131-p133"]
section_ids: ["7.1.3"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "95750b652ff37dfb1c281df0b0c43bd43a7973a51e46ef3711191e6bb67df145"
---

# 最小必要本体与混合检索调用

## 核心结论

作者主张只加载当前决策必需的本体片段，并按任务风险在图查询、图向量、记忆增强和 Skills 封装之间选择或混合调用。

## 关键要素

- SPARQL 类图查询适合高确定性规则任务。
- 图向量检索适合模糊表达初筛。
- 记忆增强提供时序和个性化上下文。
- Skills 封装支持模块化与渐进式披露。

## 适用场景

- 降低本体注入上下文规模
- 组合语义召回与逻辑复核

## 不适用边界

- 向量相似不等于逻辑关系成立。
- 历史调用记忆需防止错误经验放大。

## 与其他卡片或术语的候选关系

- `oadm:agent-engineering:intent-ontology-activation`（候选关系，尚未晋升）
- `oadm:agent-engineering:explicit-ontology-embedding`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.1.3 本体检索与调用
- 页码：PDF pp.131–133
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 四种机制的性能与准确率未进行基准测试。
