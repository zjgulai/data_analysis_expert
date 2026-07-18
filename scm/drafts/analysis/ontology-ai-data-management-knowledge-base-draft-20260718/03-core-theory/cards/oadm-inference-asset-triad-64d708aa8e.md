---
card_id: "oadm-inference-asset-triad-64d708aa8e"
semantic_key: "oadm:inference-asset:fact-mechanism-result"
card_type: "framework"
title: "推理资产的事实—事理—结果三分法"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s5-3-1-p087-p088","oadm-span-s5-3-2-p088-p089","oadm-span-s5-3-3-p089-p090"]
section_ids: ["5.3.1","5.3.2","5.3.3"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2b"
review_status: "pending"
version: 1
content_hash: "b15888055da494a8dd264904e7337bd8949ab222d178b807248d6c684bb628cb"
---

# 推理资产的事实—事理—结果三分法

## 核心结论

作者把 AI 推理数据资产划分为反映当前状态的事实数据、承载规则与边界的事理模型，以及记录决策和过程的推理结果数据。

## 关键要素

- 事实数据为感知和判断提供依据。
- 事理模型为推理提供规则、语法和任务边界。
- 推理结果和日志保留执行痕迹并支持审计与迭代。

## 适用场景

- 设计 Agent 数据资产模型
- 建立输入、规则与输出的全链路追溯

## 不适用边界

- 三类资产不能用单一文档或向量库替代。
- 推理结果被业务采纳后仍需保留原始 AI 侧关联。

## 与其他卡片或术语的候选关系

- `oadm:data-asset:ai-directory-hierarchy`（候选关系，尚未晋升）
- `oadm:inference-asset:traceability`（候选关系，尚未晋升）
- `oadm:modeling:fact-mechanism-action`（候选关系，尚未晋升）

## SCM 候选映射

M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：5.3.1 支撑 AI 实时感知与精准判断的事实数据；5.3.2 支撑 AI 按企业业务规则精准推理的事理模型；5.3.3 支撑 AI 输出可控、可解释、可审计的推理结果数据
- 页码：PDF pp.87–90
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 三类资产的存储和版本协调机制需工程设计。
