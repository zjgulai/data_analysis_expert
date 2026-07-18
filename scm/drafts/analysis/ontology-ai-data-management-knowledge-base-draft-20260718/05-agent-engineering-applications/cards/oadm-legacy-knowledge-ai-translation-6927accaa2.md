---
card_id: "oadm-legacy-knowledge-ai-translation-6927accaa2"
semantic_key: "oadm:application:legacy-knowledge-ai-translation"
card_type: "migration-path"
title: "存量知识资产的 AI 转译与语义连接"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s8-3-3-p175-p177","oadm-span-s8-3-4-p177-p178"]
section_ids: ["8.3.3","8.3.4"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "7c510f323c55be95680296059f40faf828c89c629b3134100007836aeeda684d"
---

# 存量知识资产的 AI 转译与语义连接

## 核心结论

作者把权威知识、一线经验和业务数据整理为半结构化素材，由 AI 初步转译为本体，再经专家校验和数据语义连接形成可复用语义库，并主张尽量保留事实数据在源系统。

## 关键要素

- 知识供给需权威、场景贴合且可追溯。
- AI 转译结果必须由本体建模师校验。
- 数据工程师按语义规则连接实例。
- 共建、常态收集和统一标准保障复用。

## 适用场景

- 把存量文档和经验转为 Agent 知识
- 非侵入式连接现有事实数据

## 不适用边界

- 转译不等于事实正确或版权许可充分。
- 本批不执行数据搬迁、语义库写入或外部调用。

## 与其他卡片或术语的候选关系

- `oadm:implementation:legacy-asset-evolution`（候选关系，尚未晋升）
- `oadm:application:three-stage-landing-strategy`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：8.3.3 基于存量知识资产的 AI 转译；8.3.4 实施落地的典型问题
- 页码：PDF pp.175–178
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 自动转译质量、审核成本和数据映射覆盖率需实测。
