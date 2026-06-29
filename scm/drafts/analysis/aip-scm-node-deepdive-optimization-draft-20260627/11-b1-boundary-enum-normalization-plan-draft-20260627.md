---
title: "B1 边界枚举标准化执行计划"
date: "2026-06-27"
status: "draft_execution_plan"
batch: "B1"
scope: "evidence_level 与 action_boundary 的内容层标准化，不做 schema migration，不改 UI/API 巨石"
boundary: "local SQLite / draft contract only; productionWrites=false; providerCalls=false; erpWriteback=false; actions stop at suggestion_review_replay"
depends_on:
  - "10-current-product-state-execution-register-draft-20260627.md"
  - "07-cross-audit-and-mece-register-draft-20260627.md"
  - "09-codex-execution-handoff-draft-20260627.md"
---

# B1 边界枚举标准化执行计划

## 1. 批次目标

B1 只解决一个问题：把当前本地原型里分散的证据等级和动作边界表达收敛成可审计的兼容契约。它是 W4 之前的可信债补齐工作，不进入 T7 schema migration，也不进入 T8 巨石拆分。

## 2. 当前状态

| 对象 | 当前值 | 风险 |
|---|---|---|
| `ontology_object_instances.evidence_level` | `prototype_seed` 10 条；`system_data_contract_20260627` 1 条 | 07 要求统一为 `seed/real/certified`，当前历史值表达混用。 |
| `decision_logs.action_boundary` | 多种 `*_no_*`、`*_only_*`、`suggestion_review_replay` 表达 | 含义均为本地/只读/无外部写入，但缺少统一分层和兼容映射。 |
| `recommendation_cards.execution_status` | `not_started`、`action_task_created`、`suggestion_review_replay` | T5/T6 新卡已保持 `suggestion_review_replay`；既有 API/UI smoke 历史行仍体现本地动作任务。 |
| B1 governance tasks | `pending_review` | 需要写入契约证据并更新为 review-ready。 |

## 3. 标准枚举

### 3.1 `evidence_level`

| canonical | 含义 | 可驱动动作 |
|---|---|---|
| `seed` | 原型样例、演示数据、历史 `prototype_seed` | 只可用于演示和 UI 验证，不驱动业务建议。 |
| `real` | 本地导出、系统数据契约、真实来源但未完成认证 | 可进入治理评审和 evidence pack，不驱动高风险动作。 |
| `certified` | 已通过 owner / lineage / quality 或等价认证 | 可作为 ChatBI、故事线和建议动作的事实依据。 |

兼容映射：

| historical value | canonical | 处理方式 |
|---|---|---|
| `prototype_seed` | `seed` | 保留历史行；读取和审核时映射到 `seed`。 |
| `seeded_demo` source | `seed` | `source_system=seeded_demo` 等价为 seed 证据。 |
| `system_data_contract_20260627` | `real` | 表示本地 system_data 契约实例，进入评审但不等于 certified。 |
| `L2_browser_dom_verified` 等页面级证据 | `real` | 只读采集/页面证据，需明确来源与新鲜度。 |

### 3.2 `action_boundary`

标准边界采用兼容分层，避免强制把历史字符串改成同一个值；每条动作需要声明四个 no-write flags 和一个动作阶段。

| field | allowed value for B1 | 说明 |
|---|---|---|
| `stage` | `read_only_evidence` / `local_review` / `suggestion_review_replay` / `approved_task_local_only` | B1 允许前三类；`approved_task_local_only` 仅兼容历史 smoke 或本地任务，不代表生产执行。 |
| `productionWrites` | `false` | 生产写入关闭。 |
| `providerCalls` | `false` | provider 调用关闭。 |
| `erpWriteback` | `false` | ERP/OMS/WMS/TMS 写回关闭。 |
| `localSqliteWrites` | `true/false` | 内容开发与 API/UI smoke 可写本地 SQLite；readonly smoke 必须为 false。 |

兼容分类：

| historical pattern | canonical stage |
|---|---|
| `%suggestion_review_replay%` | `suggestion_review_replay` |
| `%read%` 或 `%view%` | `read_only_evidence` |
| `%local%`、`%only%`、`%no_external_write%` | `local_review` |
| `%action_task_created%` / 本地 recommendation workflow | `approved_task_local_only` |
| `%no_production_write%`、`%no_provider_call%`、`%no_erp_writeback%` | 保留 no-write flags |

## 4. TODO

| # | TODO | 输出 | 验收 |
|---|---|---|---|
| 1 | 新增本契约文档 | `11-b1-boundary-enum-normalization-plan-draft-20260627.md` | 有 frontmatter、范围和边界。 |
| 2 | 写入 SQLite contract annotation | `annotations.target_type='boundary_contract'` | 能用 SQL 查询到标准枚举与兼容映射。 |
| 3 | 写入 SQLite decision log | `decision_b1_boundary_enum_normalization_20260627` | `action_boundary=suggestion_review_replay_only_no_production_write_no_provider_call_no_erp_writeback`。 |
| 4 | 更新两个 B1 governance task | task status 进入 `review_ready` / `accepted_with_mapping` | 不把历史值批量改写成完成迁移。 |
| 5 | 验证 | check/build/smoke | 边界仍为 false，readonly smoke 不写 SQLite。 |

## 5. 本批不做

| 不做 | 原因 |
|---|---|
| 不批量更新历史 `evidence_level` 值 | 避免破坏现有 UI/API 读取和历史证据。 |
| 不新增表 | T7 才做 additive migration；B1 是契约与治理内容。 |
| 不修改 `main.tsx` / `server/index.mjs` | 该批目标可在 draft + SQLite 内容层完成。 |
| 不把 smoke 产生的本地动作任务当业务闭环 | smoke 写入仅是验证副作用，验收后清理本轮临时行。 |

## 6. 验收 SQL

```sql
SELECT id, target_type, target_id
FROM annotations
WHERE id='annotation_b1_boundary_enum_contract_20260627';

SELECT id, action_boundary, status
FROM decision_logs
WHERE id='decision_b1_boundary_enum_normalization_20260627';

SELECT id, status, notes
FROM governance_tasks
WHERE id IN (
  'aip_20260627_d_p0_04_evidence_enum_normalization',
  'aip_20260627_boundary_action_enum_normalization'
);
```

## 7. 完成定义

B1 完成的定义是：契约可查、任务状态可查、历史数据无批量误改、`productionWrites=false / providerCalls=false / erpWriteback=false` 仍由 smoke 验证。B1 完成后，下一批才能进入 B2 权重来源决策包或 B3/T7 additive migration 设计。
