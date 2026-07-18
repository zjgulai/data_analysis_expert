---
card_id: "oadm-lake-kb-ontology-triad-d5e33d6b69"
semantic_key: "oadm:knowledge-platform:lake-kb-ontology-triad"
card_type: "framework"
title: "数据湖—知识库—本体库的互补分工"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s4-4-4-p071-p072"]
section_ids: ["4.4.4"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "8eb3eb6c27dc03f5ad82a8da6dcb464ebb113ffc4db336858a34bcbfe1f3c590"
---

# 数据湖—知识库—本体库的互补分工

## 核心结论

作者将数据湖用于历史事实与训练回溯，知识库用于文档检索和问答，本体库用于显式可推理规则，并以实时事实流补足低延迟决策。

## 关键要素

- 数据湖提供历史可溯的事实原料。
- 知识库主要提供文档与知识检索。
- 本体库提供逻辑有依的规则和语义。
- 实时直连提供低延迟状态。

## 适用场景

- 规划企业 AI 知识平台分层
- 避免将 RAG 知识库误当规则引擎

## 不适用边界

- 实际平台可能复合多种能力，不能只按产品名称分类。
- 实时直连必须服从安全、负载和一致性约束。

## 与其他卡片或术语的候选关系

- `oadm:enterprise-architecture:knowledge-graph-ontology-complement`（候选关系，尚未晋升）
- `oadm:data-asset:ai-directory-hierarchy`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：4.4.4 本体库与数据湖、知识库
- 页码：PDF pp.71–72
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 各层的数据复制、缓存和一致性策略未在来源中展开。
