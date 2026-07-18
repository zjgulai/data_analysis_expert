---
card_id: "oadm-ontology-runtime-service-8328263439"
semantic_key: "oadm:agent-architecture:ontology-runtime-service"
card_type: "platform"
title: "按意图加载、可版本化的本体运行时服务"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-4-3-p147-p147"]
section_ids: ["7.4.3"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "5a5bc29a494626e1fafd16a657b4da7501006c482b35dbd83c218cf54dd003e2"
---

# 按意图加载、可版本化的本体运行时服务

## 核心结论

作者把本体从静态文件封装成标准知识接口，支持按任务加载子本体、多版本灰度与回滚，以及基于角色、任务和敏感等级的授权。

## 关键要素

- 存储细节通过服务接口屏蔽。
- 最小子本体减少无关语义。
- 版本可灰度、并行和回滚。
- 敏感知识按上下文授权。

## 适用场景

- 构建 Agent 知识服务层
- 治理本体版本和访问边界

## 不适用边界

- 按需加载需要可靠的意图对齐与缓存策略。
- 访问控制还需结合身份系统和数据权限。

## 与其他卡片或术语的候选关系

- `oadm:agent-engineering:minimal-ontology-retrieval`（候选关系，尚未晋升）
- `oadm:engineering:ontology-lifecycle-operations`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.4.3 本体服务支撑能力
- 页码：PDF p.147
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 服务协议、SLA 和隔离方式尚未选型。
