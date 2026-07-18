---
card_id: "oadm-ai-dataset-admission-construction-2b03e1149f"
semantic_key: "oadm:ai-dataset:admission-construction"
card_type: "governance-rule"
title: "AI 数据集准入与构建原则"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s5-2-1-p080-p081","oadm-span-s5-2-2-p081-p082"]
section_ids: ["5.2.1","5.2.2"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "3f29ebde69c59806bc214287dbf691513fd5d74b09dee026adfb0b820fb1c63e"
---

# AI 数据集准入与构建原则

## 核心结论

作者要求数据集先满足质量、Owner、安全隐私标签和来源合规，再按责任唯一、边界一致、类别与目的归一、可追溯更新等原则构建。

## 关键要素

- 原始数据必须有质量、权属、安全和合法来源基础。
- 每个数据集由唯一责任人承担生命周期责任。
- 密级、权限、隐私、类别和使用目的决定颗粒边界。
- 混合不同等级时按来源规则采用就高原则。

## 适用场景

- AI 数据集注册前置门禁
- 训练与测试数据集拆分

## 不适用边界

- 这些规则是书中治理建议，尚未映射为项目政策。
- 就高原则的适用性需由本组织安全与法务确认。

## 与其他卡片或术语的候选关系

- `oadm:ai-dataset:responsibility-triad`（候选关系，尚未晋升）
- `oadm:ai-dataset:classification-versioning`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：5.2.1 筛选高质量、合规的 AI 数据集；5.2.2 AI 数据集构建
- 页码：PDF pp.80–82
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 数据质量阈值、认证机制和标签体系需组织化定义。
