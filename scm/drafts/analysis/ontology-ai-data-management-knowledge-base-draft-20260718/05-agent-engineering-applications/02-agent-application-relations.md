---
title: 第 7–8 章 Agent 与应用候选关系
doc_type: relation-map
module: scm
topic: ontology-ai-data-management-m2d
status: draft
created: 2026-07-18
updated: 2026-07-18
owner: self
source: human+ai
---

# 第 7–8 章 Agent 与应用候选关系

以下关系均为 `candidate/pending`，没有 SCM crosswalk。

| 主体 | 关系 | 客体 | 理由 | 来源小节 |
|---|---|---|---|---|
| `oadm:agent-engineering:intent-ontology-activation` | `REQUIRES` | `oadm:semantic-framework:seven-plus-one` | 意图到本体的桥接需要可区分的标准语义维度。 | 7.1.2、7.2.2 |
| `oadm:agent-engineering:intent-ontology-activation` | `DEFINES` | `oadm:term:intent-ontology-alignment` | 该链路定义了任务语义与知识结构对齐。 | 7.1.2 |
| `oadm:agent-engineering:minimal-ontology-retrieval` | `REQUIRES` | `oadm:agent-engineering:intent-ontology-activation` | 检索边界由已对齐的任务意图确定。 | 7.1.3 |
| `oadm:agent-engineering:minimal-ontology-retrieval` | `DEFINES` | `oadm:term:minimal-necessary-ontology` | 来源把最小必要本体作为调用原则。 | 7.1.3 |
| `oadm:agent-engineering:minimal-ontology-retrieval` | `DEFINES` | `oadm:term:graph-vector-retrieval` | 图向量召回是四类本体调用机制之一。 | 7.1.3 |
| `oadm:agent-engineering:minimal-ontology-retrieval` | `DEFINES` | `oadm:term:memory-augmented-ontology-call` | 记忆增强为本体调用加入时序与个性化。 | 7.1.3 |
| `oadm:agent-engineering:minimal-ontology-retrieval` | `DEFINES` | `oadm:term:ontology-skill` | Skills 封装将本体逻辑模块化并渐进披露。 | 7.1.3 |
| `oadm:agent-engineering:explicit-ontology-embedding` | `REQUIRES` | `oadm:agent-engineering:minimal-ontology-retrieval` | 嵌入作用于已检索的任务相关本体片段。 | 7.1.4 |
| `oadm:agent-engineering:explicit-ontology-embedding` | `DEFINES` | `oadm:term:ontology-embedding` | 本体嵌入把符号逻辑转为模型上下文或训练信号。 | 7.1.4 |
| `oadm:agent-reasoning:fact-mechanism-goal` | `REQUIRES` | `oadm:inference-asset:fact-mechanism-result` | 综合推理消费事实与事理并产生可追溯结果。 | 7.2.1、7.2.2、7.2.3 |
| `oadm:agent-reasoning:fact-mechanism-goal` | `REQUIRES` | `oadm:semantic-framework:seven-plus-one` | 7+1 为推理提供领域规则与权限边界。 | 7.2.2 |
| `oadm:agent-reasoning:constraint-strength-traceability` | `PART_OF` | `oadm:agent-reasoning:fact-mechanism-goal` | 约束强度和溯源是事实事理目标推理的治理机制。 | 7.2.2 |
| `oadm:agent-reasoning:constraint-strength-traceability` | `DEFINES` | `oadm:term:constraint-strength` | 来源要求按场景风险配置约束强弱。 | 7.2.2 |
| `oadm:agent-decision:human-multi-agent-modes` | `REQUIRES` | `oadm:agent-reasoning:fact-mechanism-goal` | 两类决策模式均消费感知、推理和目标。 | 7.2.3 |
| `oadm:agent-action:risk-routed-execution` | `REQUIRES` | `oadm:agent-decision:human-multi-agent-modes` | 决策模式决定行动执行的自动化与介入程度。 | 7.3.1、7.3.2、7.3.3 |
| `oadm:agent-action:risk-routed-execution` | `APPLICABLE_TO` | `oadm:agent:fact-mechanism-action-landing` | 三类行动方式细化了从事理决策到实际行动的落地。 | 7.3.1、7.3.2、7.3.3 |
| `oadm:agent-action:execution-event-bus` | `PART_OF` | `oadm:agent-action:risk-routed-execution` | 执行事件总线承载业务协同执行模式。 | 7.3.3 |
| `oadm:agent-action:execution-event-bus` | `DEFINES` | `oadm:term:execution-event-bus` | 来源以统一任务和状态语义定义多 Agent 执行总线。 | 7.3.3 |
| `oadm:agent-architecture:five-component-stack` | `REQUIRES` | `oadm:agent-action:execution-event-bus` | 五组件能力栈通过编排和反馈连接事实、推理与行动。 | 7.4.1、7.4.2、7.4.3、7.4.4、7.4.5 |
| `oadm:agent-architecture:five-component-stack` | `DEFINES` | `oadm:term:dynamic-fact-association` | 动态事实关联是五组件之一。 | 7.4.1 |
| `oadm:agent-architecture:five-component-stack` | `REQUIRES` | `oadm:term:dynamic-action-association` | 能力栈需要受控的动态行动出口。 | 7.4.2 |
| `oadm:agent-action:safe-dynamic-action-loop` | `PART_OF` | `oadm:agent-architecture:five-component-stack` | 执行前校验和反馈属于动态 Action 组件。 | 7.4.2 |
| `oadm:agent-action:safe-dynamic-action-loop` | `DEFINES` | `oadm:term:dynamic-action-association` | 该闭环定义动态 Action 的安全执行方式。 | 7.4.2 |
| `oadm:agent-architecture:ontology-runtime-service` | `PART_OF` | `oadm:agent-architecture:five-component-stack` | 本体运行时服务是五组件中的知识中枢。 | 7.4.3 |
| `oadm:agent-architecture:ontology-runtime-service` | `DEFINES` | `oadm:term:ontology-as-a-service` | 来源把本体封装为按需、版本化、授权的服务。 | 7.4.3 |
| `oadm:agent-platform:four-module-implementation` | `REQUIRES` | `oadm:agent-architecture:five-component-stack` | 实施路径承接五组件架构并落实平台模块。 | 7.5.1、7.5.2、7.5.3、7.5.4、7.5.5 |
| `oadm:agent-platform:four-module-implementation` | `REQUIRES` | `oadm:engineering:ontology-tooling-platform` | 四模块路径复用第 6 章端到端工具平台能力。 | 7.5.1、7.5.2、7.5.3、7.5.4、7.5.5 |
| `oadm:agent-platform:four-module-implementation` | `DEFINES` | `oadm:term:semantic-middleware` | 语义中间件是模块协同的统一枢纽。 | 7.5.5 |
| `oadm:application:scenario-portfolio-selection` | `APPLICABLE_TO` | `oadm:application:three-stage-landing-strategy` | 场景选择规则决定后续三阶段落地对象。 | 8.1.1、8.1.2、8.1.3 |
| `oadm:implementation:point-line-surface` | `REQUIRES` | `oadm:application:scenario-portfolio-selection` | 点线面实施路径需要先筛选高价值且可结构化的场景。 | 8.1.2、8.1.3 |
| `oadm:application:intelligent-workflow-automation` | `APPLICABLE_TO` | `oadm:agent-action:risk-routed-execution` | 智能流程根据审批风险选择自动或人工执行。 | 8.2.1 |
| `oadm:application:intelligent-workflow-automation` | `REQUIRES` | `oadm:agent-action:safe-dynamic-action-loop` | API 流程执行需要 Action 前置条件和反馈门禁。 | 8.2.1 |
| `oadm:application:autonomous-operations` | `REQUIRES` | `oadm:agent-engineering:minimal-ontology-retrieval` | 产品配置用渐进 Skills 与压缩控制知识上下文。 | 8.2.2 |
| `oadm:application:integrated-multidimensional-decision` | `REQUIRES` | `oadm:agent-reasoning:fact-mechanism-goal` | 多维决策整合事实、规则和供需业务目标。 | 8.2.3 |
| `oadm:application:cross-domain-dynamic-collaboration` | `REQUIRES` | `oadm:implementation:federated-cross-domain-integration` | 跨领域协同依赖语义映射和领域间连接。 | 8.2.4 |
| `oadm:application:knowledge-parsing-autonomous-reasoning` | `REQUIRES` | `oadm:agent-reasoning:constraint-strength-traceability` | 多模态纠偏需要显式规则和逐步依据。 | 8.2.5 |
| `oadm:application:multi-scene-pdca` | `REQUIRES` | `oadm:agent-action:execution-event-bus` | 统筹与环节 Agent 通过统一任务和状态交互。 | 8.2.6 |
| `oadm:application:multi-scene-pdca` | `DEFINES` | `oadm:term:multi-agent-pdca` | 该模式定义多 Agent 的计划执行检查处理闭环。 | 8.2.6 |
| `oadm:application:three-stage-landing-strategy` | `REQUIRES` | `oadm:application:scenario-portfolio-selection` | 三阶段策略从已筛选的高价值场景开始。 | 8.3.1、8.3.2、8.3.3 |
| `oadm:application:three-stage-landing-strategy` | `REQUIRES` | `oadm:application:penetration-validation-strategy` | 穿刺验证是三阶段的技术可行性入口。 | 8.3.1 |
| `oadm:application:penetration-validation-strategy` | `DEFINES` | `oadm:term:penetration-validation` | 来源以最小原型和真实小样本定义穿刺式验证。 | 8.3.1 |
| `oadm:application:one-plus-four-operating-model` | `PART_OF` | `oadm:application:three-stage-landing-strategy` | 1+4 组织支撑小切口价值落地阶段。 | 8.3.2 |
| `oadm:application:one-plus-four-operating-model` | `DEFINES` | `oadm:term:one-plus-four-organization` | 总体组和四专业小队构成 1+4 组织协同。 | 8.3.2 |
| `oadm:application:legacy-knowledge-ai-translation` | `PART_OF` | `oadm:application:three-stage-landing-strategy` | 存量转译是三阶段的资产沉淀环节。 | 8.3.3 |
| `oadm:application:legacy-knowledge-ai-translation` | `DEFINES` | `oadm:term:ai-translation` | 来源定义 AI 初转译、专家校验和语义连接流程。 | 8.3.3 |
| `oadm:application:legacy-knowledge-ai-translation` | `REQUIRES` | `oadm:implementation:legacy-asset-evolution` | 知识转译延续存量资产渐进演进与非侵入连接。 | 8.3.3、8.3.4 |
