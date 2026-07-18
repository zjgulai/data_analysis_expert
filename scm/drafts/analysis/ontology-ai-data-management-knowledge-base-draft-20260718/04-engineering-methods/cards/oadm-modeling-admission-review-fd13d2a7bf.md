---
card_id: "oadm-modeling-admission-review-fd13d2a7bf"
semantic_key: "oadm:engineering:modeling-admission-review"
card_type: "quality-gate"
title: "形式化建模前的准入审核与测试增强循环"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s6-1-3-p100-p101"]
section_ids: ["6.1.3"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2c"
review_status: "pending"
version: 1
content_hash: "85aefccb832c1b8598190e2097e5f760dfa0883cfaca428755b94fe7dc153349"
---

# 形式化建模前的准入审核与测试增强循环

## 核心结论

作者要求知识制品在进入建模前同时满足描述清晰、逻辑正确、内容完备和极简表达，并由工程师初审、专家复核和实例测试持续增强。

## 关键要素

- 术语和语义模板应无歧义。
- 对象、规则和行动分类应符合业务逻辑。
- 内容需覆盖从 Agent 意图到事实、事理和行动。
- 测试误判应反向驱动知识补充。

## 适用场景

- 建立本体建模准入门槛
- 审核访谈与知识提炼成果

## 不适用边界

- 准入通过只说明适合建模，不代表模型已通过技术和业务验收。
- 书中尺蠖识别示例未在本项目复现。

## 与其他卡片或术语的候选关系

- `oadm:engineering:knowledge-preprocessing-29-sentences`（候选关系，尚未晋升）
- `oadm:engineering:scenario-validation-loop`（候选关系，尚未晋升）

## SCM 候选映射

M2-C 仅完成来源内工程方法萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：6.1.3 基于逻辑正确、描述清晰、内容完备的审核
- 页码：PDF pp.100–101
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 具体 Checklist 阈值需由实施组织定义。
