---
title: "B6 RBAC Additive Migration Review Draft"
date: "2026-06-27"
status: "migration_scripts_verified_on_disposable_copy"
scope: "RBAC/action-tiering additive schema review"
debt_ids:
  - "D-P1-07"
  - "T6"
depends_on:
  - "15-b5-rbac-action-tiering-model-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B6 RBAC 增量迁移评审包

## 1. 批次目标

B6 将 B5 的 RBAC/action tiering 模型落成可评审、可重复执行、可回滚的 SQLite additive schema 草案。验证只发生在 disposable SQLite copy；主库本批只写治理记录，不创建 RBAC 业务表，不实现登录，不接外部身份源，不打开 provider call，不接生产库，不做 ERP/OMS/WMS 写回。

## 2. 可改文件范围

| 类型 | 范围 |
|---|---|
| 允许 | B6 文档、B6 apply/rollback SQL、本地 SQLite 治理记录、一次性验收快照 |
| 暂不允许 | `src/main.tsx`、`server/index.mjs`、生产配置、外部身份源配置 |
| 运行验证 | disposable SQLite copy、`npm run check`、`npm run build`、`smoke:*` |

## 3. 迁移脚本

| 文件 | 用途 |
|---|---|
| `migrations/20260627_b6_rbac_action_tiering.apply.sql` | 创建 `action_tier_policy`、`rbac_roles`、`rbac_role_bindings`、`rbac_policy_rules`、`permission_audit_log`，并登记 `schema_migrations`。 |
| `migrations/20260627_b6_rbac_action_tiering.rollback.sql` | 删除 B6 新增表、索引和 B6 迁移登记；保留共享 `schema_migrations` 账本。 |

## 4. Schema 设计

| Table | 设计意图 | 当前种子策略 |
|---|---|---|
| `action_tier_policy` | 固化 L0-L5 动作分级、审批、审计和边界开关。 | 6 条 tier；L0-L2 当前允许，L3-L5 保持关闭。 |
| `rbac_roles` | 固化 B5 角色、责任范围、默认 tier 上限。 | 9 个角色；8 个当前启用，`admin_local_config` 在 L3 gate 前保持 disabled。 |
| `rbac_role_bindings` | 未来承载 actor 到 role/scope 的绑定。 | 0 条；当前无登录/身份源。 |
| `rbac_policy_rules` | 固化 role/resource/tier 权限规则。 | 17 条最小策略，覆盖指标、标签、KPI、推荐卡、动作任务、轨迹、导出评审。 |
| `permission_audit_log` | 未来记录权限判定与本地写动作审计。 | 0 条；当前无运行时拦截。 |

所有外部写入字段均带约束：`provider_calls=0`、`erp_writeback=0`、`production_writes=0`。

## 5. Disposable Copy 验证结果

验证副本：

```text
/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T174500-b6-rbac-action-tiering-migration/governance_workbench.b6-disposable.sqlite
```

验证步骤：

| 步骤 | 命令/检查 | 结果 |
|---|---|---|
| 1 | `sqlite3 disposable < 20260627_b6_rbac_action_tiering.apply.sql` | 通过 |
| 2 | `PRAGMA foreign_key_check;` | 空输出 |
| 3 | 重复 apply | 通过，计数未膨胀 |
| 4 | `sqlite3 disposable < 20260627_b6_rbac_action_tiering.rollback.sql` | 通过 |
| 5 | rollback 后查 RBAC 表 | 0 张 |
| 6 | rollback 后查 B6 migration row | 0 条 |
| 7 | reapply | 通过 |

reapply 后计数：

| 表 | 行数 |
|---|---:|
| `action_tier_policy` | 6 |
| `rbac_roles` | 9 |
| `rbac_policy_rules` | 17 |
| `rbac_role_bindings` | 0 |
| `permission_audit_log` | 0 |
| `schema_migrations` B6 row | 1 |

边界计数：

| 字段 | 合计 |
|---|---:|
| `provider_calls` | 0 |
| `erp_writeback` | 0 |
| `production_writes` | 0 |
| `is_currently_allowed` | 3 |
| `controlled_file_export` | 1 |

`controlled_file_export=1` 只表示 L3 设计字段存在；L3 的 `is_currently_allowed=0`，未开放。

## 6. 主库状态

主库未执行 B6 apply。验证后查询主库：

```sql
SELECT name
FROM sqlite_master
WHERE type='table'
  AND name IN (
    'schema_migrations',
    'rbac_roles',
    'rbac_role_bindings',
    'rbac_policy_rules',
    'action_tier_policy',
    'permission_audit_log'
  )
ORDER BY name;
```

结果为空输出。也就是说，本批没有把 RBAC schema 写入主 SQLite；主库只会登记 B6 annotation、decision log 和治理任务状态。

## 7. SQLite 治理登记

| 记录 | 目标状态 |
|---|---|
| `annotation_b6_rbac_additive_migration_review_20260627` | `migration_scripts_verified_on_disposable_copy` |
| `decision_b6_rbac_additive_migration_review_20260627` | `migration_scripts_verified_on_disposable_copy` |
| `aip_20260627_t6_rbac_action_ladder_review` | `rbac_additive_schema_verified_on_disposable_copy` |

## 8. 验收

1. B6 apply/rollback SQL 存在且可重复执行。
2. disposable copy 完成 apply、重复 apply、rollback、reapply。
3. `PRAGMA foreign_key_check` 为空输出。
4. 主 SQLite 不创建 B6 RBAC 表。
5. 既有边界保持：`productionWrites=false` / `providerCalls=false` / `erpWriteback=false`。
6. `src/main.tsx` 与 `server/index.mjs` 在 B6 不发生本批次编辑。
7. 回归脚本通过：`npm run check`、`npm run build`、`npm run smoke:api`、`npm run smoke:readonly`、`npm run smoke:ui`。

## 9. 下一批建议

B7 进入 T8 代码拆分前的 baseline package：固定 codebase-memory 依赖图、当前 `src/main.tsx`/`server/index.mjs` 行数、API/UI smoke 基线和首个可拆分边界。B7 仍不做大块重构；只为 T8-1 的第一小块行为保持拆分准备证据。
