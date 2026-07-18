---
card_id: "oadm-five-component-stack-018338d550"
semantic_key: "oadm:agent-architecture:five-component-stack"
card_type: "architecture"
title: "本体增强 Agent 的五组件能力栈"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s7-4-1-p144-p146","oadm-span-s7-4-2-p146-p147","oadm-span-s7-4-3-p147-p147","oadm-span-s7-4-4-p147-p148","oadm-span-s7-4-5-p148-p149"]
section_ids: ["7.4.1","7.4.2","7.4.3","7.4.4","7.4.5"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "94236b8f30cf3253021ed65e3458e297eed5836e52278cd6c9e16b6739c7b71d"
---

# 本体增强 Agent 的五组件能力栈

## 核心结论

作者用动态事实关联、动态 Action、本体服务、大模型引擎和 Agent 运行框架构成知识—数据—推理—行动闭环。

## 关键要素

- 事实关联提供动态语义上下文。
- Action 机制把决策转成受控执行。
- 本体服务按需提供知识。
- 模型与运行框架负责推理和编排。

## 适用场景

- 规划本体增强 Agent 架构
- 检查能力栈缺口

## 不适用边界

- 五组件是来源架构，不表示仓库已有实现。
- 模型能力、平台性能和兼容性均待验证。

## 与其他卡片或术语的候选关系

- `oadm:agent-action:execution-event-bus`（候选关系，尚未晋升）
- `oadm:agent-architecture:ontology-runtime-service`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：7.4.1 动态事实关联机制；7.4.2 动态 Action 关联机制；7.4.3 本体服务支撑能力；7.4.4 AI 大模型智能引擎；7.4.5 AI Agent 运行支撑框架
- 页码：PDF pp.144–149
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 组件接口和部署拓扑需要后续技术设计。
