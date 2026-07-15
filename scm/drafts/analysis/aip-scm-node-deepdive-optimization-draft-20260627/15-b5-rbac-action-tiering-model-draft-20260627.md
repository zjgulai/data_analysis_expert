---
title: "B5 RBAC And Action Tiering Model Draft"
date: "2026-06-27"
status: "draft"
scope: "content-contract"
debt_ids:
  - "D-P1-07"
  - "T6"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B5 RBAC 与动作分级模型

## 1. 批次目标

B5 只完成 RBAC 与 action tiering 的内容契约：定义角色、资源、动作级别、门禁与后续增量表候选。当前批次不实现登录、不接外部身份源、不打开 provider call、不接生产库、不做 ERP/OMS/WMS 写回。

对应债务：`D-P1-07`，现象是无登录、无对象级/动作级/指标级权限；风险是动作开放后无法满足最小权限与审计要求。

## 2. 当前产品事实

| 事实项 | 当前状态 | B5 处理 |
|---|---|---|
| 动作边界 | `productionWrites=false` / `providerCalls=false` / `erpWriteback=false`，动作止于 `suggestion_review_replay` | 保持不变 |
| 本地可写面 | `annotations`、`decision_logs`、`action_tasks`、`recommendation_cards`、`agent_runs`、`agent_traces`、`trace_reviews` 等 SQLite 表 | 仅登记治理记录 |
| RBAC 实现 | 当前无登录、无角色绑定表、无资源级权限表 | 只冻结模型 |
| 外部系统 | 当前批次不连接生产库、provider、ERP/OMS/WMS | 显式禁止 |
| 种子数据 | 需要与认证数据隔离 | 权限模型不得把 seed 当 certified |

## 3. 动作分级

| Tier | 名称 | 允许动作 | 写入目标 | 当前状态 |
|---|---|---|---|---|
| L0 | read_only_evidence | 查询本地 SQLite、查看认证状态、查看轨迹和证据 | 无写入 | 允许 |
| L1 | governed_suggestion | 创建本地注解、建议草案、推荐卡草案 | 仅本地 SQLite | 允许但需审计 |
| L2 | approval_task | 创建或更新审批任务、review replay、trace review | 仅本地 SQLite | 允许但需 owner |
| L3 | controlled_export | 生成受控导出包、记录导出审计 | 仅本地 SQLite 与本地文件 | 待模型验收后开放 |
| L4 | api_assisted_writeback | 调用受控 API 写回 ERP/OMS/WMS | 外部系统 | 当前禁止 |
| L5 | policy_automation | 自动执行策略动作与周期性任务 | 外部系统或自动写目标 | 当前禁止 |

当前产品上限固定为 L2，状态机仍以 `suggestion_review_replay` 收口。L3 只能在 RBAC、审计、导出范围与数据等级全部验收后进入实现评审；L4/L5 不在当前边界内。

## 4. 角色模型

| Role | 责任范围 | 默认 Tier 上限 | 典型资源 |
|---|---|---|---|
| `executive_viewer` | 管理层只读经营态势与故事线 | L0 | KPI、故事线、推荐卡摘要 |
| `supply_chain_owner` | 供应链端到端 owner | L2 | SKU、listing、PO、shipment、库存、推荐卡、审批任务 |
| `inventory_ops_owner` | 库存运营 owner | L2 | inventory_batch、warehouse、库存指标、补货建议 |
| `fulfillment_owner` | 履约 owner | L2 | shipment、warehouse、FBA/FBT 履约指标、异常任务 |
| `finance_owner` | 成本与资金 owner | L2 | 成本指标、财务口径、归因结果 |
| `data_governance_owner` | 指标/标签/血缘/认证治理 | L2 | metrics、tags、lineage、certifications、annotations |
| `ai_operator` | AI 轨迹与建议作业操作人 | L1 | agent_runs、agent_traces、recommendation_cards |
| `audit_reviewer` | 审计与复核 | L2 | trace_reviews、decision_logs、action_tasks |
| `admin_local_config` | 本地原型配置维护；当前未启用 | disabled（L3 gate 通过后再启用） | 本地配置、迁移脚本、受控导出配置；当前不得绑定 actor |

## 5. 资源与权限矩阵

| Resource | L0 read | L1 suggest | L2 approve/replay | L3 export | L4/L5 |
|---|---:|---:|---:|---:|---:|
| `metrics` / `metric_dimensions` / `lineage_edges` | all roles | `data_governance_owner` | `data_governance_owner` | `admin_local_config` | prohibited |
| `tags` / `ontology_objects` / `ontology_object_instances` | all roles | `data_governance_owner` | `data_governance_owner` | `admin_local_config` | prohibited |
| `kpi_tree` / `knowledge_cards` | all roles | `data_governance_owner` | `audit_reviewer` | `admin_local_config` | prohibited |
| `recommendation_cards` | all roles by scope | `ai_operator` / owner role | owner role / `audit_reviewer` | `admin_local_config` | prohibited |
| `action_tasks` | owner role / `audit_reviewer` | owner role | owner role / `audit_reviewer` | `admin_local_config` | prohibited |
| `agent_runs` / `agent_traces` / `trace_reviews` | owner role / `audit_reviewer` | `ai_operator` | `audit_reviewer` | `admin_local_config` | prohibited |
| `decision_logs` | owner role / `audit_reviewer` | `data_governance_owner` | `audit_reviewer` | `admin_local_config` | prohibited |
| `export_jobs` | scoped viewers | prohibited before L3 | prohibited before L3 | `admin_local_config`（当前 disabled） | prohibited |
| provider chat / external API | prohibited | prohibited | prohibited | prohibited | prohibited |
| ERP/OMS/WMS writeback | prohibited | prohibited | prohibited | prohibited | prohibited |

`all roles by scope` 表示角色只能看到自己业务范围内的对象和指标；范围绑定未来由 `rbac_role_bindings` 或上游身份源提供。

L3 未开放前，`admin_local_config` 不得启用或绑定，任何角色均不得通过 L2 approve/replay 访问 `export_jobs`；现有动作状态机继续止于 `suggestion_review_replay`。

## 6. 门禁规则

1. 指标门禁：ChatBI 与建议生成只能使用认证指标或明确标注为 seed/real 的证据，不得把低等级证据包装成 certified。
2. 对象门禁：对象级动作必须绑定 `target_object_type` 与 `target_object_id`，没有对象引用时只能生成注解或治理任务。
3. 动作门禁：L2 以上必须有 owner、approval_required、trace/ref 与 replay_note；当前上限仍是 `suggestion_review_replay`。
4. 外部门禁：`productionWrites`、`providerCalls`、`erpWriteback` 必须保持 false；所有写入只落本地 SQLite。
5. 密钥门禁：任何密钥文件不得进入索引、数据库、导出包或提交范围。
6. 审计门禁：每个本地写动作未来必须记录 actor、role、resource、resource_id、action_type、action_tier、boundary、approval_ref、trace_ref、status、created_at。

## 7. 后续增量表候选

本批次不创建表。后续若进入迁移评审，建议只做 additive schema：

| Table | 用途 |
|---|---|
| `rbac_roles` | 角色定义、Tier 上限、是否启用 |
| `rbac_role_bindings` | actor 到 role/scope 的绑定 |
| `rbac_policy_rules` | role/resource/action/tier 的允许规则 |
| `action_tier_policy` | Tier 与边界、审批、审计要求 |
| `permission_audit_log` | 权限判定与本地写动作审计 |

迁移必须具备 apply/rollback 脚本，并只在 disposable copy 上先验证。

## 8. 可改文件范围

| 类型 | 范围 |
|---|---|
| 允许 | 本文档、本地 SQLite 治理记录、一次性验收快照 |
| 暂不允许 | `src/main.tsx`、`server/index.mjs`、生产配置、外部系统连接配置 |
| 后续评审 | migration apply/rollback 草案、权限拦截测试、组件拆分 |

## 9. 验收

1. 本文档存在，并明确角色、资源、动作分级、门禁、增量表候选。
2. SQLite 有 B5 annotation 与 decision log。
3. 既有 `aip_20260627_t6_rbac_action_ladder_review` 任务状态从 `pending_review` 推进为 `rbac_model_ready`。
4. `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` 保持不变。
5. `src/main.tsx` 与 `server/index.mjs` 在 B5 不发生本批次编辑。
6. 回归脚本通过：`npm run check`、`npm run build`、`npm run smoke:api`、`npm run smoke:readonly`、`npm run smoke:ui`。

## 10. 下一批建议

B6 可以按 B3 的方式做 RBAC additive schema apply/rollback 评审包；仍只在 disposable copy 验证，不直接改主 SQLite schema。之后再进入 T8 代码拆分的首个行为保持小块。
