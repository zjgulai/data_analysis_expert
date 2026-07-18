---
card_id: "oadm-business-system-dual-drive-b276acbff6"
semantic_key: "oadm:modeling:business-system-dual-drive"
card_type: "model"
title: "业务逻辑与系统逻辑双轮驱动模型"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s3-1-2-p038-p040"]
section_ids: ["3.1.2"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2a"
review_status: "pending"
version: 1
content_hash: "234a50b92f3d36db8c26463180cecd2d90451ce94ab90bb12e13b863d3746532"
---

# 业务逻辑与系统逻辑双轮驱动模型

## 核心结论

作者区分描述业务应如何运行的业务逻辑和描述 IT 如何实现的系统逻辑，并以连接层、认知层和应用层衔接二者，使 AI 可嵌入现有业务而不要求全面替换系统。

## 关键要素

- 连接层对接数据、事件和系统能力。
- 认知层组织事实、规则、推理与上下文。
- 应用层将认知结果用于业务交互和行动。

## 适用场景

- 在存量 IT 上设计 AI 能力
- 识别业务语义与系统接口之间的断点

## 不适用边界

- 非侵入不等于零改造，接口、事件和权限适配仍需工程投入。
- 三层模型是来源中的概念架构，不能直接替代系统详细设计。

## 与其他卡片的候选关系

- `oadm:modeling:human-machine-bidirectional`（候选关系，尚未建模）
- `oadm:modeling:fact-mechanism-action`（候选关系，尚未建模）

## SCM 候选映射

M2-A 仅完成来源内萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：3.1.2 实现“业务逻辑+系统逻辑”双轮驱动模型
- 页码：PDF pp.38–40
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 现有系统是否具备足够接口和事件能力需要另行盘点。
