---
title: M3-A SCM Crosswalk owner-delegated 语义评审报告
doc_type: quality-report
module: scm
topic: ontology-ai-data-management-m3a-crosswalk
status: draft
created: 2026-07-18
updated: 2026-07-19
owner: self
source: human+ai
---

# M3-A SCM Crosswalk owner-delegated 语义评审报告

## 结论

用户于 2026-07-19 授权 Codex 作为 AI 代理执行语义评审，记录身份为 `owner-delegated-codex`，授权依据为 `review_authority=user-authorized-2026-07-19`。这不是人类 owner 亲自复核或签字；`human_owner_sign_off=false`。

原候选快照保持不变：6 张 `accept_candidate`、3 张 `reject_candidate`、80 张 `unmapped`。覆盖层完成 13/13 条候选边决策：0 条批准、12 条拒绝、1 条延期；有效卡片结果为 8 张 `rejected`、1 张 `deferred`、80 张 `unmapped`。没有创建 active/certified 映射，所有 `scm_verified_fact=false`。

## 13 条边级决策

| 知识卡 | SCM 目标 | 原候选状态 | owner-delegated 决策 | 置信度 | 理由 |
|---|---|---|---|---|---|
| `oadm-integrated-multidimensional-decision-3b85562879` | `object:forecast_version` | `accept_candidate` | `reject_semantic_mismatch` | `high` | 卡片只提到预测输入，没有描述由 forecast_version 与 period 共同界定的 canonical forecast_version 资产粒度。 |
| `oadm-integrated-multidimensional-decision-3b85562879` | `object:purchase_plan` | `accept_candidate` | `reject_semantic_mismatch` | `high` | 卡片没有描述由 plan_id 与 version 标识的采购或补货计划资产，不能据一般计划语义映射到 purchase_plan。 |
| `oadm-integrated-multidimensional-decision-3b85562879` | `object:inventory_batch` | `accept_candidate` | `reject_semantic_mismatch` | `high` | 卡片中的库存概念不等于由 batch_no、sku 与 warehouse 界定的 inventory_batch；候选目标粒度过细。 |
| `oadm-ontology-asset-registration-5b7e350efb` | `metric:SCM-MECE-L3-104` | `accept_candidate` | `reject_semantic_mismatch` | `high` | 卡片描述本体资产注册，而 SCM-MECE-L3-104 衡量指标晋升状态就绪比例；两者的资产类型与生命周期均不同。 |
| `oadm-ontology-lifecycle-operations-968c388b34` | `metric:SCM-MECE-L3-100` | `accept_candidate` | `reject_semantic_mismatch` | `high` | 卡片描述本体版本运维，不支持 SCM-MECE-L3-100 的 metric_definition_version 覆盖口径、采集或计算证据。 |
| `oadm-ontology-lifecycle-operations-968c388b34` | `metric:SCM-MECE-L3-103` | `accept_candidate` | `reject_semantic_mismatch` | `high` | 卡片没有定义 evidence_level 的赋值或覆盖机制，不能支持 SCM-MECE-L3-103 的指标口径。 |
| `oadm-scenario-validation-loop-65cbb0ff79` | `metric:SCM-MECE-L3-110` | `accept_candidate` | `defer_insufficient_target_model` | `medium` | 卡片与黄金用例验证相关，但 SCM-MECE-L3-110 的分子为支持结论数、分母为已分析规则数；rule grain 以及测试结果转为 evidence 的机制尚未定义。 |
| `oadm-continuous-tool-ecosystem-9eabee007d` | `metric:SCM-MECE-L3-100` | `accept_candidate` | `reject_semantic_mismatch` | `high` | 卡片描述本体 CI 与版本控制，不支持 SCM-MECE-L3-100 的指标定义版本覆盖口径、采集或计算证据。 |
| `oadm-continuous-tool-ecosystem-9eabee007d` | `metric:SCM-MECE-L3-102` | `accept_candidate` | `reject_semantic_mismatch` | `high` | 卡片的工程变更追踪没有给出 SCM-MECE-L3-102 的指标分子、分母或源字段血缘，不能支持该指标。 |
| `oadm-modeling-admission-review-fd13d2a7bf` | `metric:SCM-MECE-L3-104` | `accept_candidate` | `reject_semantic_mismatch` | `high` | 知识制品的建模准入不等于指标 production-ready；卡片自身边界也不覆盖 SCM 指标晋升状态。 |
| `oadm-inference-result-traceability-0d0557615e` | `metric:SCM-MECE-L3-102` | `reject_candidate` | `maintain_reject` | `high` | Agent 推理结果与过程日志追溯不等于指标公式血缘，直接映射会混淆执行可观测性与度量定义治理。 |
| `oadm-ai-dataset-classification-versioning-97124ce95e` | `metric:SCM-MECE-L3-100` | `reject_candidate` | `maintain_reject` | `high` | AI 数据集版本不等于指标定义版本，直接映射会混淆数据资产版本与度量语义版本。 |
| `oadm-dual-model-validation-eff49bdf82` | `metric:SCM-MECE-L3-110` | `reject_candidate` | `maintain_reject` | `high` | 双模型生成、审核与仲裁流程不等于样本证据支持率，直接映射会把流程结构误写成覆盖率度量。 |

## 语义 guardrail

- `DESCRIBES_OBJECT`：卡片必须匹配 canonical object 的身份键与业务粒度；只提到预测、计划或库存概念，不足以映射到更细的对象资产。
- `SUPPORTS_METRIC`：卡片至少直接支持指标口径、采集/源字段或计算证据之一；一般流程、版本管理或工程追踪语义不足以支持指标。

## Open question

`SCM-MECE-L3-110` 仍需定义 rule grain，并澄清“支持结论数 / 已分析规则数”的公式与场景测试结果转 evidence 的机制；在目标模型补齐前保持 `deferred`。

## 质量门禁

- owner review 边覆盖：13/13；缺失 0、重复/重叠 0、未知 0、非法 decision 0。
- 固定合同：accepted references=10/10、considered references=3/3、edge→decision mismatch=0。
- 决策计数：approved=0、rejected=12、deferred=1；reviewed cards=9、not-in-scope cards=80。
- 晋升计数：0；SCM verified=true edges=0、cards=0。
- 历史候选记录保持：非 pending 0、已有历史 reviewer 0、SCM verified=true 0。
- Git scope：固定生成物 3 个；`owner-review-decisions.json` 作为 source input 参与 `scope_input_paths`；未授权路径 0，importer_modified=false。
- SQLite 以 readonly+immutable 打开；基线哈希匹配=true；前后哈希一致=true。

## 机器验证边界

- `automatic_checks_passed=true`
- `owner_review_quality.passed=true`
- `repository_scope.scope_passed=true`
- `database_write_observed=false`

## 本批执行声明

以下项目不是 builder 可直接观察的自动证据，不参与自动通过判定：

- provider call：声明未执行；`verification=not_verified_by_builder`。
- external promotion：声明未执行；`verification=not_verified_by_builder`。
- deploy：声明未执行；`verification=not_verified_by_builder`。
- standalone sync：声明未执行；`verification=not_verified_by_builder`。
