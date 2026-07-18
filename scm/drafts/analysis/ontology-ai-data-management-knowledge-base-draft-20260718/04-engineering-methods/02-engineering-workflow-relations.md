---
title: 第 6 章工程方法候选关系
doc_type: relation-map
module: scm
topic: ontology-ai-data-management-m2c
status: draft
created: 2026-07-18
updated: 2026-07-18
owner: self
source: human+ai
---

# 第 6 章工程方法候选关系

以下关系均为来源内候选关系，状态为 `candidate/pending`；没有 SCM crosswalk。

| 主体 | 关系 | 客体 | 理由 | 来源小节 |
|---|---|---|---|---|
| `oadm:engineering:knowledge-preprocessing-29-sentences` | `REQUIRES` | `oadm:semantic-framework:seven-plus-one` | 29 句话是作者对 7+1 维度的自然语言细化。 | 6.1.1、6.1.2 |
| `oadm:engineering:knowledge-preprocessing-29-sentences` | `DEFINES` | `oadm:term:twenty-nine-sentences` | 预处理方法定义了 29 句话的用途和输入方式。 | 6.1.1、6.1.2 |
| `oadm:engineering:modeling-admission-review` | `REQUIRES` | `oadm:engineering:knowledge-preprocessing-29-sentences` | 准入审核作用于显性与隐性知识对齐后的描述集。 | 6.1.3 |
| `oadm:engineering:modeling-admission-review` | `DEFINES` | `oadm:term:modeling-admission` | 该质量关口定义了建模前的准入条件。 | 6.1.3 |
| `oadm:engineering:controlled-ai-ontology-modeling` | `REQUIRES` | `oadm:semantic-standard:w3c-stack` | 受控建模以作者列举的语义标准栈作为输出约束。 | 6.2.1 |
| `oadm:engineering:dual-model-validation` | `REQUIRES` | `oadm:engineering:controlled-ai-ontology-modeling` | 双模型审核接收生成模型产生的本体初稿。 | 6.2.2 |
| `oadm:engineering:dual-model-validation` | `DEFINES` | `oadm:term:dual-model-collaboration` | 该方法明确生成者与审计者的协同闭环。 | 6.2.2 |
| `oadm:engineering:scenario-validation-loop` | `REQUIRES` | `oadm:engineering:dual-model-validation` | 专家可视化与场景测试承接模型协同校验结果。 | 6.2.3、6.2.4 |
| `oadm:engineering:scenario-validation-loop` | `DEFINES` | `oadm:term:golden-test-case` | 场景验证由专家黄金用例建立关键路径预期。 | 6.2.4 |
| `oadm:engineering:ontology-asset-registration` | `REQUIRES` | `oadm:engineering:scenario-validation-loop` | 作者要求完成建模、校验和测试后再注册入库。 | 6.3.1 |
| `oadm:engineering:ontology-asset-registration` | `CONSUMES` | `oadm:term:semantic-database` | 通过审查的本体资产进入专用语义数据库。 | 6.3.1 |
| `oadm:engineering:ontology-lifecycle-operations` | `REQUIRES` | `oadm:engineering:ontology-asset-registration` | 双重运维与运营管理作用于已注册发布的资产。 | 6.3.2、6.3.3 |
| `oadm:engineering:ontology-lifecycle-operations` | `DEFINES` | `oadm:term:dual-layer-operations` | 生命周期运维同时覆盖数据层和语义层。 | 6.3.2 |
| `oadm:engineering:ontology-lifecycle-operations` | `DEFINES` | `oadm:term:build-use-optimize-reuse` | 建用优复描述作者的资产运营循环。 | 6.3.3 |
| `oadm:engineering:ontology-tooling-platform` | `APPLICABLE_TO` | `oadm:engineering:five-loop-method` | 平台能力承载五环中的建模、审核、入库和服务环节。 | 6.4.1、6.4.2、6.4.3、6.6 |
| `oadm:engineering:ontology-tooling-platform` | `DEFINES` | `oadm:term:ontology-tooling-platform` | 三个小节共同定义平台能力边界。 | 6.4.1、6.4.2、6.4.3 |
| `oadm:implementation:point-line-surface` | `PART_OF` | `oadm:engineering:five-loop-method` | 点线面是五环方法的实施扩展环节。 | 6.5.1、6.5.2、6.5.3、6.6 |
| `oadm:implementation:point-line-surface` | `DEFINES` | `oadm:term:point-line-surface` | 三个阶段共同定义点线面路径。 | 6.5.1、6.5.2、6.5.3 |
| `oadm:implementation:federated-cross-domain-integration` | `PART_OF` | `oadm:implementation:point-line-surface` | 联邦跨域整合是“面”阶段的实现机制。 | 6.5.3 |
| `oadm:implementation:federated-cross-domain-integration` | `REQUIRES` | `oadm:term:bridge-ontology` | 桥接本体承载跨域核心概念和映射。 | 6.5.3 |
| `oadm:implementation:federated-cross-domain-integration` | `REQUIRES` | `oadm:term:federated-query` | 联邦查询负责拆分并合并跨域问题。 | 6.5.3 |
| `oadm:implementation:federated-cross-domain-integration` | `REQUIRES` | `oadm:enterprise-architecture:semantic-layer` | 跨域映射依赖统一的企业级语义对齐基准。 | 6.5.3 |
| `oadm:implementation:legacy-asset-evolution` | `APPLICABLE_TO` | `oadm:knowledge-platform:lake-kb-ontology-triad` | 三阶段演进用于连接存量数据湖、知识图谱和本体体系。 | 6.5.4 |
| `oadm:implementation:legacy-asset-evolution` | `REQUIRES` | `oadm:implementation:point-line-surface` | 存量资产连接贯穿点线面增量扩展。 | 6.5.4 |
