---
title: "B3 T7 加法式数据模型迁移评审包"
date: "2026-06-27"
status: "migration_scripts_verified_on_disposable_copy"
batch: "B3"
scope: "T7 additive schema for tag_assignment, metric_field_mapping, kpi_contribution, insight_unit, and related review tables"
boundary: "local SQLite review package only; productionWrites=false; providerCalls=false; erpWriteback=false; actions stop at suggestion_review_replay"
depends_on:
  - "10-current-product-state-execution-register-draft-20260627.md"
  - "12-b2-scei-weight-source-decision-package-draft-20260627.md"
  - "02-tag-engineering-deepdive-draft-20260627.md"
  - "03-metric-engineering-deepdive-draft-20260627.md"
  - "04-metric-system-deepdive-draft-20260627.md"
  - "05-insight-storyline-deepdive-draft-20260627.md"
---

# B3 T7 加法式数据模型迁移评审包

## 1. 批次目标

B3 只处理 T7：把 02/03/04/05 第 7 节提出的增量数据模型落为可评审、可重复执行、可回滚的 SQLite 迁移脚本。主库本批只写治理记录；新增业务表只在 disposable SQLite 副本上验证。

## 2. 当前事实

| 项 | 当前状态 |
|---|---|
| T7 任务 | `aip_20260627_t7_additive_migration_design` 当前为 `pending_review`。 |
| 物理表 | 主库已有 `tags`、`metrics`、`metric_dimensions`、`kpi_tree`、`recommendation_cards`、`agent_traces`、`trace_reviews`。 |
| 缺口 | 无 `tag_assignment`、`metric_field_mapping`、`kpi_contribution`、`insight_unit` 等 P1 评审表。 |
| 本批策略 | 先新增 SQL apply/rollback 与评审包；不直接迁移主库 schema。 |
| 边界 | 只触达本地 SQLite 与草稿文件，不接生产库、不调用 provider、不做 ERP 写回。 |

## 3. 迁移文件

| 文件 | 作用 |
|---|---|
| `migrations/20260627_b3_t7_additive_schema.apply.sql` | 建立 `schema_migrations` 以及标签、指标、KPI、故事线相关增量表和索引。 |
| `migrations/20260627_b3_t7_additive_schema.rollback.sql` | 删除本批新增表、索引和迁移登记，用于 disposable copy 或明确授权的本地回滚。 |

## 4. Additive Schema

| 能力域 | 表 | 来源 | 关键验收 |
|---|---|---|---|
| 标签实例物化 | `tag_assignment` | 02 第 7 节 | 支持标签命中、证据、来源、状态和历史有效期。 |
| 标签属性投影 | `tag_property_projection` | 02 第 7 节 | 支持标签到对象属性的候选/评审/active 契约。 |
| 指标字段血缘 | `metric_field_mapping` | 03 第 7 节 | 支持 source system/table/field、聚合、过滤、confidence、证据和确认状态。 |
| 指标校验 | `metric_validation_log` | 03 第 7 节 | 支持 pass/review/blocked 结果和 JSON 细节。 |
| 维度兼容评审 | `metric_dimension_review` | 03 第 7 节 | 不改存量 `metric_dimensions`，用新表记录 reason 和 reviewer。 |
| KPI 动态贡献 | `kpi_contribution` | 04 第 7 节 | 支持 parent/child/period、贡献、残差、confidence 和证据。 |
| KPI 归因路径 | `kpi_attribution_path` | 04 第 7 节 | 支持 root metric、period、driver chain 和证据。 |
| KPI MECE 检查 | `kpi_mece_check` | 04 第 7 节 | 支持 exhaustive/exclusive、coverage、residual 和 evidence。 |
| KPI 健康分 | `kpi_health` | 04 第 7 节 | 支持 certification、lineage、weight、MECE、freshness 综合分。 |
| 洞察单元 | `insight_unit` | 05 第 7 节 | 支持 page、metric、baseline、threshold/tag、attribution、suggestion 和证据。 |
| 故事模板 | `storyline_template` | 05 第 7 节 | 支持页面级 SCQA JSON 模板和评审状态。 |

## 5. 回滚策略

| 场景 | 做法 |
|---|---|
| 评审脚本验证 | 对 DB 副本执行 apply、rollback、reapply，确认可重复执行。 |
| 主库未迁移 | 本批主库不新增业务表，因此主库回滚只需删除治理记录或恢复备份。 |
| 后续授权迁移 | 先备份 `data/governance_workbench.sqlite`，再执行 apply；若要撤回，执行 rollback 并跑 `smoke:readonly`。 |
| 生产边界 | 本迁移仅适配本地 prototype SQLite；任何生产库 DDL 都要另走授权记录。 |

## 6. 验收 SQL

```sql
SELECT name
FROM sqlite_schema
WHERE type = 'table'
  AND name IN (
    'tag_assignment',
    'metric_field_mapping',
    'kpi_contribution',
    'insight_unit'
  )
ORDER BY name;
```

```sql
SELECT id, boundary, rollback_script
FROM schema_migrations
WHERE id = '20260627_b3_t7_additive_schema';
```

```sql
SELECT name
FROM sqlite_schema
WHERE type = 'table'
  AND name IN ('tag_assignment', 'metric_field_mapping', 'kpi_contribution', 'insight_unit');
```

回滚后第三段查询应返回 0 行；reapply 后第一段应返回 4 行。

## 7. TODO

| # | TODO | 输出 |
|---|---|---|
| 1 | 新增加法式 apply SQL。 | `20260627_b3_t7_additive_schema.apply.sql` |
| 2 | 新增 rollback SQL。 | `20260627_b3_t7_additive_schema.rollback.sql` |
| 3 | 在 disposable SQLite 副本验证 apply/rollback/reapply。 | file-history 中的验证副本与命令输出。 |
| 4 | 写入 SQLite annotation 和 decision log。 | `annotation_b3_t7_additive_migration_review_20260627`、`decision_b3_t7_additive_migration_review_20260627` |
| 5 | 更新 T7 governance task。 | `aip_20260627_t7_additive_migration_design` -> `migration_scripts_verified_on_disposable_copy` |
| 6 | 跑回归。 | `npm run check`、`npm run build`、`npm run smoke:readonly`；若跑 api/ui smoke，验收后恢复快照。 |

## 8. 完成定义

B3 完成的定义是：迁移设计可查、apply/rollback 脚本成对、脚本在副本库上可重复验证、主库业务 schema 未被本批直接迁移、治理任务进入可评审状态，且边界仍保持 `productionWrites=false/providerCalls=false/erpWriteback=false`。
