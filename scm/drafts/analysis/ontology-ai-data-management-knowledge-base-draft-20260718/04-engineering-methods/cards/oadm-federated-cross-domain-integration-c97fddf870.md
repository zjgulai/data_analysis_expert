---
card_id: "oadm-federated-cross-domain-integration-c97fddf870"
semantic_key: "oadm:implementation:federated-cross-domain-integration"
card_type: "architecture"
title: "桥接本体与联邦查询的跨域整合"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s6-5-3-p124-p126"]
section_ids: ["6.5.3"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2c"
review_status: "pending"
version: 1
content_hash: "2a7ddcc80116e312e3492ba8b71451e8d43918c6240bdb58003de90ea5e3e7b8"
---

# 桥接本体与联邦查询的跨域整合

## 核心结论

作者提出以顶层核心概念作为对齐基准，通过概念、属性和规则映射连接自治领域模型，再由联邦查询拆分并合并跨域问题。

## 关键要素

- 先从高频场景识别跨域交互点。
- 映射需要处理同名异义和粒度差异。
- 桥接本体承载通用概念与冲突约束。
- 联邦查询避免强制合并全部模型。

## 适用场景

- 连接多个自治领域本体
- 设计跨域语义查询

## 不适用边界

- 联邦方案仍需解决身份、权限、一致性和性能问题。
- 外部上层本体的适用性需按官方定义核验。

## 与其他卡片或术语的候选关系

- `oadm:implementation:point-line-surface`（候选关系，尚未晋升）
- `oadm:enterprise-architecture:semantic-layer`（候选关系，尚未晋升）

## SCM 候选映射

M2-C 仅完成来源内工程方法萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：6.5.3 横轴整合：跨领域贯通
- 页码：PDF pp.124–126
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 书中跨域农业示例未做技术实现验证。
