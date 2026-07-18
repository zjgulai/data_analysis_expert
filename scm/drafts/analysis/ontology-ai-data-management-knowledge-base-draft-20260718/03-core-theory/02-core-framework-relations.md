---
title: 核心框架候选关系表
doc_type: relation-map
module: scm
topic: ontology-ai-data-management-m2b
status: draft
created: 2026-07-18
updated: 2026-07-18
owner: self
source: human+ai
---

# 核心框架候选关系表

所有关系均为 `candidate/pending`，只表示来源内候选语义，不表示 SCM crosswalk 或已生效治理规则。

| 主体 | 关系 | 客体 | 来源小节 | 理由 |
|---|---|---|---|---|
| `oadm:modeling:human-machine-bidirectional` | `REQUIRES` | `oadm:ontology:human-machine-semantics` | 4.1.1 | 双向适配需要人与机器对同一业务形成一致语义。 |
| `oadm:ontology:semantic-interconnection-reasoning` | `REQUIRES` | `oadm:ontology:human-machine-semantics` | 4.1.1、4.1.3 | 互联和推理均以统一业务意义为前提。 |
| `oadm:ontology:ontology-museum-antipattern` | `CONTRADICTS` | `oadm:ontology:semantic-interconnection-reasoning` | 4.1.3 | 只建模不接入真实推理与行动违背来源所述价值路径。 |
| `oadm:ai-paradigm:symbolic-connectionist-hybrid` | `REQUIRES` | `oadm:modeling:fact-mechanism-action` | 4.1.4 | 混合智能需要可形式化的事实、规则和行动边界。 |
| `oadm:ontology-llm:three-connections` | `PART_OF` | `oadm:ai-paradigm:symbolic-connectionist-hybrid` | 4.2.1 | 三重连接是作者给出的符号与联结融合机制。 |
| `oadm:ontology-llm:representation-reasoning-validation` | `REQUIRES` | `oadm:ontology-llm:three-connections` | 4.2.1、4.2.2 | 三阶段需要人机、模型和内容层面的连接支撑。 |
| `oadm:ontology-llm:technology-integration-matrix` | `APPLICABLE_TO` | `oadm:ontology-llm:representation-reasoning-validation` | 4.2.3 | 技术组合按表示、推理和验证阶段组织。 |
| `oadm:ontology-engineering:ai-assisted-modeling` | `REQUIRES` | `oadm:semantic-standard:w3c-stack` | 4.3.1、4.3.2 | AI 辅助建模以可解析的语义语言和工具验证为基础。 |
| `oadm:enterprise-architecture:semantic-layer` | `REQUIRES` | `oadm:ontology:human-machine-semantics` | 4.4.1 | 架构语义层需要统一、机器可理解的业务语言。 |
| `oadm:enterprise-architecture:entity-ontology-complement` | `REQUIRES` | `oadm:modeling:fact-mechanism-action` | 4.4.2 | 实体事实与本体事理共同支撑决策和行动。 |
| `oadm:enterprise-architecture:knowledge-graph-ontology-complement` | `REQUIRES` | `oadm:enterprise-architecture:entity-ontology-complement` | 4.4.2、4.4.3 | 知识图谱的实例数据与本体规则延续事实和事理互补。 |
| `oadm:knowledge-platform:lake-kb-ontology-triad` | `REQUIRES` | `oadm:enterprise-architecture:knowledge-graph-ontology-complement` | 4.4.3、4.4.4 | 平台分工需要区分实例知识、文档知识和可推理规则。 |
| `oadm:enterprise-architecture:saas-agent-new-user` | `REQUIRES` | `oadm:enterprise-architecture:semantic-layer` | 4.4.1、4.4.5 | Agent 调用 SaaS 需要语义层把系统元数据转为业务上下文。 |
| `oadm:data-asset:ai-directory-hierarchy` | `PART_OF` | `oadm:data-asset:three-catalogs` | 5.1.1、5.1.2、5.1.3 | AI 目录是作者三类数据资产目录之一。 |
| `oadm:inference-asset:fact-mechanism-result` | `PART_OF` | `oadm:data-asset:ai-directory-hierarchy` | 5.1.3、5.3.1、5.3.2、5.3.3 | 推理资产三分法位于 AI 数据资产目录的推理分支。 |
| `oadm:ai-dataset:admission-construction` | `GOVERNS` | `oadm:data-asset:ai-directory-hierarchy` | 5.2.1、5.2.2 | 准入与构建原则治理 AI 目录中的训练数据集。 |
| `oadm:ai-dataset:responsibility-triad` | `GOVERNS` | `oadm:ai-dataset:admission-construction` | 5.2.1、5.2.2、5.2.3 | 角色责任为准入、供给和使用建立问责边界。 |
| `oadm:ai-dataset:classification-versioning` | `GOVERNS` | `oadm:ai-dataset:admission-construction` | 5.2.2、5.2.4、5.2.5 | 分类、标识和版本支撑数据集边界与生命周期追溯。 |
| `oadm:inference-asset:traceability` | `PART_OF` | `oadm:inference-asset:fact-mechanism-result` | 5.3.3 | 结果和日志是推理资产三分法中的结果资产。 |
| `oadm:semantic-framework:seven-plus-one` | `GOVERNS` | `oadm:inference-asset:fact-mechanism-result` | 5.3.2、5.4.1、5.4.8 | 7+1 用于规范推理资产中的事理模型。 |
| `oadm:semantic-standard:role-map` | `PART_OF` | `oadm:semantic-framework:seven-plus-one` | 5.4.1、5.4.2、5.4.3、5.4.4、5.4.5、5.4.6、5.4.7、5.4.8 | 标准角色映射是 7+1 框架的技术解释。 |
| `oadm:agent:fact-mechanism-action-landing` | `REQUIRES` | `oadm:semantic-framework:seven-plus-one` | 5.4.1、5.5.1、5.5.2、5.5.3 | 明事实、懂事理、会行动依赖七类语义和目标评估。 |
| `oadm:agent:fact-mechanism-action-landing` | `CONSUMES` | `oadm:inference-asset:fact-mechanism-result` | 5.3.1、5.3.2、5.3.3、5.5.1、5.5.2、5.5.3 | 落地链使用事实和事理，并生成可追溯推理结果。 |
| `oadm:agent:fact-mechanism-action-landing` | `REQUIRES` | `oadm:ontology-llm:representation-reasoning-validation` | 4.2.2、5.5.1、5.5.2、5.5.3 | 落地链对应表示、推理和行动验证阶段。 |
| `oadm:term:rdf` | `APPLICABLE_TO` | `oadm:semantic-standard:role-map` | 5.4.1 | 作者用 RDF 表达业务资源和事实关联。 |
| `oadm:term:owl` | `APPLICABLE_TO` | `oadm:semantic-standard:role-map` | 5.4.2 | 作者用 OWL 表达分层与属性约束。 |
| `oadm:term:skos` | `APPLICABLE_TO` | `oadm:semantic-standard:role-map` | 5.4.3 | 作者用 SKOS 统一业务术语。 |
| `oadm:term:swrl` | `APPLICABLE_TO` | `oadm:semantic-standard:role-map` | 5.4.4 | 作者用 SWRL 表达业务控制规则。 |
| `oadm:term:owl-s` | `APPLICABLE_TO` | `oadm:semantic-standard:role-map` | 5.4.5 | 作者用 OWL-S 表达流程与行动。 |
| `oadm:term:odrl` | `APPLICABLE_TO` | `oadm:semantic-standard:role-map` | 5.4.6 | 作者用 ODRL 表达权限与使用控制。 |
| `oadm:term:sparql` | `APPLICABLE_TO` | `oadm:semantic-standard:role-map` | 5.4.7 | 作者用 SPARQL 表达数据查询与操作。 |
| `oadm:term:goal-evaluation` | `APPLICABLE_TO` | `oadm:semantic-standard:role-map` | 5.4.8 | 目标与评估补充任务意图、质控和效果。 |
| `oadm:term:fact-data` | `PART_OF` | `oadm:inference-asset:fact-mechanism-result` | 5.3.1 | 事实数据是推理资产三分法之一。 |
| `oadm:term:mechanism-model` | `PART_OF` | `oadm:inference-asset:fact-mechanism-result` | 5.3.2 | 事理模型是推理资产三分法之一。 |
| `oadm:term:inference-result-data` | `PART_OF` | `oadm:inference-asset:fact-mechanism-result` | 5.3.3 | 推理结果数据是推理资产三分法之一。 |
| `oadm:ai-dataset:responsibility-triad` | `DEFINES` | `oadm:term:data-owner` | 5.2.3 | 责任三方框架定义了数据 Owner 的原始数据端到端责任边界。 |
