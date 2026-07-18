---
title: 第 9–10 章治理与未来企业候选关系
doc_type: relation-map
module: scm
topic: ontology-ai-data-management-m2e
status: draft
created: 2026-07-18
updated: 2026-07-18
owner: self
source: human+ai
---

# 第 9–10 章治理与未来企业候选关系

以下关系均为 `candidate/pending`，没有 SCM crosswalk。

| 主体 | 关系 | 客体 | 理由 | 来源小节 |
|---|---|---|---|---|
| `oadm:agent-governance:ontology-blockchain-layered-governance` | `DEFINES` | `oadm:term:carbon-silicon-governance` | 框架以人员与 Agent 的协同权责为治理对象。 | 9.1.1、9.1.2、9.1.3、9.1.4 |
| `oadm:agent-governance:ontology-blockchain-layered-governance` | `REQUIRES` | `oadm:agent-governance:tri-pillar-risk-governance` | 高阶框架需要按风险分配本体、AI 与人类的职责。 | 9.1.1、9.1.2、9.1.3、9.1.4、9.3.1 |
| `oadm:enterprise-evolution:semantic-handshake-old-new-worlds` | `PART_OF` | `oadm:agent-governance:ontology-blockchain-layered-governance` | 新旧世界交互解释治理框架的系统上下文。 | 9.1.1、9.1.2、9.1.3 |
| `oadm:enterprise-evolution:semantic-handshake-old-new-worlds` | `REQUIRES` | `oadm:implementation:legacy-asset-evolution` | 语义握手延续存量系统的渐进演进与非侵入连接。 | 9.1.3 |
| `oadm:agent-trust:six-proof-accountability-system` | `PART_OF` | `oadm:agent-governance:ontology-blockchain-layered-governance` | 六类证明是作者治理框架中的候选可信底座。 | 9.2.1、9.2.2、9.2.3、9.2.4、9.2.5、9.2.6 |
| `oadm:agent-trust:six-proof-accountability-system` | `DEFINES` | `oadm:term:six-proof-system` | 该卡系统化定义六类证明。 | 9.2.1、9.2.2、9.2.3、9.2.4、9.2.5、9.2.6 |
| `oadm:agent-trust:hybrid-identity-asset-provenance` | `PART_OF` | `oadm:agent-trust:six-proof-accountability-system` | 身份与资产是六类证明的前两类。 | 9.2.1、9.2.2 |
| `oadm:agent-trust:hybrid-identity-asset-provenance` | `DEFINES` | `oadm:term:hybrid-did` | 混合身份模式以 DID 标识人员和 Agent。 | 9.2.1 |
| `oadm:agent-trust:hybrid-identity-asset-provenance` | `DEFINES` | `oadm:term:digital-asset-provenance-chain` | 资产证明以哈希与凭证描述来源和权属。 | 9.2.2 |
| `oadm:agent-trust:hybrid-identity-asset-provenance` | `REQUIRES` | `oadm:engineering:ontology-asset-registration` | 可信资产凭证需要先有受控资产标识与登记。 | 9.2.2 |
| `oadm:agent-trust:dynamic-authorization-contract-control` | `PART_OF` | `oadm:agent-trust:six-proof-accountability-system` | 授权与合约是六类证明的控制部分。 | 9.2.3、9.2.4 |
| `oadm:agent-trust:dynamic-authorization-contract-control` | `DEFINES` | `oadm:term:verifiable-permission-chain` | 权限凭证显式承载授权条件和时效。 | 9.2.3 |
| `oadm:agent-trust:dynamic-authorization-contract-control` | `DEFINES` | `oadm:term:smart-contract-collaboration` | 协作规则被表达为候选智能合约流水线。 | 9.2.4 |
| `oadm:agent-trust:dynamic-authorization-contract-control` | `REQUIRES` | `oadm:agent-action:safe-dynamic-action-loop` | 自动执行仍需执行前校验、反馈与终止门禁。 | 9.2.3、9.2.4 |
| `oadm:agent-trust:traceability-contribution-accountability` | `PART_OF` | `oadm:agent-trust:six-proof-accountability-system` | 追溯与贡献构成六类证明的证据和激励部分。 | 9.2.5、9.2.6 |
| `oadm:agent-trust:traceability-contribution-accountability` | `DEFINES` | `oadm:term:operation-hash-chain` | 操作哈希链是来源提出的追溯结构。 | 9.2.5 |
| `oadm:agent-trust:traceability-contribution-accountability` | `DEFINES` | `oadm:term:contribution-proof` | 贡献证明表达人员与 Agent 的候选价值计量。 | 9.2.6 |
| `oadm:agent-trust:traceability-contribution-accountability` | `REQUIRES` | `oadm:inference-asset:traceability` | 责任闭环依赖可关联到推理和行动依据的来源轨迹。 | 9.2.5 |
| `oadm:agent-trust:six-proof-accountability-system` | `EVIDENCED_BY` | `oadm:agent-trust:industry-exploration-evidence-boundary` | 作者以行业项目作为概念例证，但该证据仍待外部核验。 | 9.2.7 |
| `oadm:agent-trust:industry-exploration-evidence-boundary` | `APPLICABLE_TO` | `oadm:governance:four-transition-challenges` | 证据边界防止把趋势案例误作已验证转型能力。 | 9.2.7 |
| `oadm:agent-governance:tri-pillar-risk-governance` | `DEFINES` | `oadm:term:tri-pillar-agent-governance` | 来源明确三支柱及其分层职责。 | 9.3.1 |
| `oadm:agent-governance:tri-pillar-risk-governance` | `GOVERNS` | `oadm:agent-decision:human-multi-agent-modes` | 三支柱治理决定自主决策与人工介入的风险边界。 | 9.3.1 |
| `oadm:ontology-governance:dynamic-connection-strength` | `REQUIRES` | `oadm:agent-governance:tri-pillar-risk-governance` | 动态治理持续校准三支柱之间的连接。 | 9.3.2 |
| `oadm:ontology-governance:dynamic-connection-strength` | `DEFINES` | `oadm:term:dynamic-ontology-governance` | 该卡定义感知、校准、响应和反馈的动态治理。 | 9.3.2 |
| `oadm:ontology-governance:dynamic-connection-strength` | `DEFINES` | `oadm:term:connection-strength` | 作者用连接强度描述三方变化传导。 | 9.3.2 |
| `oadm:ontology-governance:dynamic-connection-strength` | `REQUIRES` | `oadm:engineering:ontology-lifecycle-operations` | 持续校准需要版本、变更和运行反馈闭环。 | 9.3.2 |
| `oadm:ontology-modeling:multimodal-dynamic-modeling` | `DEFINES` | `oadm:term:multimodal-ontology` | 该趋势将多种信号纳入统一语义结构。 | 9.3.3 |
| `oadm:ontology-modeling:multimodal-dynamic-modeling` | `REQUIRES` | `oadm:engineering:controlled-ai-ontology-modeling` | 多模态候选必须经过受控验证再进入本体。 | 9.3.3 |
| `oadm:ontology-modeling:multimodal-dynamic-modeling` | `APPLICABLE_TO` | `oadm:application:knowledge-parsing-autonomous-reasoning` | 多模态本体可为现场识别和规则纠偏提供语义锚点。 | 9.3.3 |
| `oadm:ontology-ai:modeler-user-coevolution` | `DEFINES` | `oadm:term:ai-ontology-modeler` | 来源描述大模型承担候选建模与自校验角色。 | 9.3.4 |
| `oadm:ontology-ai:modeler-user-coevolution` | `DEFINES` | `oadm:term:human-ai-shared-memory` | 本体被设想为业务人员与 Agent 的共同记忆载体。 | 9.3.5 |
| `oadm:ontology-ai:modeler-user-coevolution` | `REQUIRES` | `oadm:ontology-engineering:ai-assisted-modeling` | 双向演进延展了受控的 AI 辅助建模能力。 | 9.3.4、9.3.5 |
| `oadm:ontology-engineering:continuous-tool-ecosystem` | `REQUIRES` | `oadm:engineering:ontology-tooling-platform` | 持续集成和双视图需要端到端工具平台。 | 9.3.6 |
| `oadm:ontology-engineering:continuous-tool-ecosystem` | `REQUIRES` | `oadm:engineering:ontology-lifecycle-operations` | 运行反馈和变更回归依赖生命周期运营。 | 9.3.6 |
| `oadm:enterprise-model:triple-world-digital-twin` | `DEFINES` | `oadm:term:triple-world-model` | 该卡定义物理、逻辑、智能三个数字世界。 | 10.1.1 |
| `oadm:enterprise-model:triple-world-digital-twin` | `REQUIRES` | `oadm:enterprise-model:ontology-world-model-fusion` | 三重世界需用双模型连接物理现实和业务逻辑。 | 10.1.1、10.1.3 |
| `oadm:enterprise-learning:physical-logical-dual-learning` | `DEFINES` | `oadm:term:physical-logical-dual-learning` | 该卡定义 AI 面向物理和逻辑的双重学习。 | 10.1.2 |
| `oadm:enterprise-learning:physical-logical-dual-learning` | `REQUIRES` | `oadm:agent-governance:tri-pillar-risk-governance` | 持续学习需人类监督、价值治理与明确边界。 | 10.1.2 |
| `oadm:enterprise-model:ontology-world-model-fusion` | `DEFINES` | `oadm:term:world-model` | 融合架构区分现实因果引擎和业务逻辑内核。 | 10.1.3 |
| `oadm:enterprise-operating-model:intelligent-native-enterprise` | `DEFINES` | `oadm:term:intelligent-native-enterprise` | 该卡概括智能原生企业的作者定义。 | 10.2.1 |
| `oadm:enterprise-operating-model:intelligent-native-enterprise` | `REQUIRES` | `oadm:application:three-stage-landing-strategy` | 未来形态仍需通过验证、小切口和资产化逐步落地。 | 10.2.1 |
| `oadm:enterprise-organization:agent-centered-network` | `PART_OF` | `oadm:enterprise-operating-model:intelligent-native-enterprise` | Agent 组织网络是智能原生企业的组织形态。 | 10.2.2 |
| `oadm:enterprise-organization:agent-centered-network` | `REQUIRES` | `oadm:agent-decision:human-multi-agent-modes` | 组织网络需要明确人机和多 Agent 决策职责。 | 10.2.2 |
| `oadm:enterprise-governance:four-dimensional-business-ontology` | `DEFINES` | `oadm:term:four-dimensional-integration` | 业务本体统一知识、数据、流程与 IT。 | 10.2.3 |
| `oadm:enterprise-governance:four-dimensional-business-ontology` | `DEFINES` | `oadm:term:persuasion-boundary` | 流程治理需覆盖 Agent 语言影响与说服责任。 | 10.2.3 |
| `oadm:enterprise-governance:four-dimensional-business-ontology` | `DEFINES` | `oadm:term:ontology-clone-governance` | IT 维度按共享本体版本治理 Agent 分身。 | 10.2.3 |
| `oadm:enterprise-governance:four-dimensional-business-ontology` | `GOVERNS` | `oadm:enterprise-organization:agent-centered-network` | 四维业务本体规定 Agent 组织的职责、权限和行动边界。 | 10.2.3 |
| `oadm:enterprise-governance:four-dimensional-business-ontology` | `REQUIRES` | `oadm:enterprise-architecture:semantic-layer` | 四维融合需要统一企业语义层承载业务关系和规则。 | 10.2.3 |
