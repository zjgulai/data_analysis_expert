---
card_id: "oadm-ai-dataset-classification-versioning-97124ce95e"
semantic_key: "oadm:ai-dataset:classification-versioning"
card_type: "governance-rule"
title: "AI 数据集多维分类、统一 ID 与版本"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s5-2-4-p084-p086","oadm-span-s5-2-5-p086-p087"]
section_ids: ["5.2.4","5.2.5"]
fact_reason_action_class: "fact"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "f3ba20497a5d3cd647914f5e7c70780dd0a0dfe2b024210dba1669f727f6cbd3"
---

# AI 数据集多维分类、统一 ID 与版本

## 核心结论

作者以内容、渠道、来源、权限、安全、隐私、用途和阶段分类数据集，并要求注册全局唯一不可修改 ID，以名称和版本号记录文件集合与内容变化。

## 关键要素

- 分类必须服务管理差异、取值正交且与数据集边界相关。
- 资产 ID 与物理存储建立可追溯映射。
- 文件增删和文件内容修改应区分版本层级。

## 适用场景

- 设计数据集注册表
- 建立版本差异和影响追溯

## 不适用边界

- 书中的分类值和版本规则是指导建议，不是已生效项目标准。
- ID 稳定不等于存储位置永久不变，映射应支持迁移。

## 与其他卡片或术语的候选关系

- `oadm:ai-dataset:admission-construction`（候选关系，尚未晋升）
- `oadm:data-asset:ai-directory-hierarchy`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：5.2.4 厘清差异规范管理的多维 AI 数据集分类；5.2.5 支撑 AI 数据集治理与追溯的统一 ID 及版本标识
- 页码：PDF pp.84–87
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 大版本和小版本规则需与现有发布制度对齐。
