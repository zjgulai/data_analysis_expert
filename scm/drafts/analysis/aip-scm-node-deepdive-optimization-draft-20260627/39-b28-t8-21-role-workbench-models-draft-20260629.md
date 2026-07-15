---
title: "B28 T8-21 Role Workbench Models Draft"
date: "2026-06-29"
status: "role_workbench_models_extracted_and_smoke_verified"
scope: "T8-21 behavior-preserving role workbench static model and review payload extraction"
debt_ids:
  - "T8"
depends_on:
  - "38-b27-t8-20-governance-review-payloads-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B28 T8-21 角色工作台模型抽取

## 1. 批次目标

B28 继续 T8：评估 `RoleWorkbenchesPanel`。图谱显示该面板仍绑定 `useApi`、财务治理 panel、shared UI、role review 和财务 review 行为，因此本批只抽出无副作用的 `RoleWorkbench` 类型、`roleWorkbenches` 静态配置和 `recordRoleReview` 请求体 builder。

本批不改 `server/index.mjs`，不调整 API 路由，不移动 mutation handlers。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B27 抽取后 | 905 | 2010 |
| B28 抽取后 | 908 | 2017 |

抽取前后图谱确认：

| Symbol | 调用方 / 使用方 | B28 判断 |
|---|---|---|
| `roleWorkbenches` | `RoleWorkbenchesPanel` | 纯静态配置，可移动到模型文件。 |
| `RoleWorkbench` | `recordRoleReview` 和角色工作台 UI | 纯类型，可移动到模型文件。 |
| `buildRoleReviewDecisionLog` | `recordRoleReview` | 纯请求体 builder，可独立于 API POST。 |
| `RoleWorkbenchesPanel` | `App` | 仍持有 hook、状态、role review 与财务治理编排，暂不移动。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除原地 `RoleWorkbench` 类型和 `roleWorkbenches` 静态数组；`recordRoleReview` 改为调用 builder；保留 API POST 和状态更新。 |
| `src/panels/roleWorkbenchModels.ts` | 新增角色工作台类型、静态配置和 role review 请求体 builder。 |
| `src/panels/governanceReviewPayloads.ts` | 本批不编辑。 |
| `src/panels/governancePanels.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/roleWorkbenchModels.ts` | `RoleWorkbench` | 角色工作台静态模型契约。 |
| `src/panels/roleWorkbenchModels.ts` | `roleWorkbenches` | 六个角色工作台静态配置。 |
| `src/panels/roleWorkbenchModels.ts` | `buildRoleReviewDecisionLog` | 角色 review 本地 decision log 请求体 builder。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `recordRoleReview` | 仍持有 API POST、busy、receipt、refresh 与 error 状态，暂不移动。 |
| `RoleWorkbenchPayload` | 绑定 `WorkbenchModule` 与 `/api/workbench/role-workbenches` payload，仍留主文件。 |
| `RoleWorkbenchesPanel` | 同时编排角色 review 和财务治理视图，后续需单独拆展示组件或 hooks。 |
| 其它 mutation handlers | 继续按下一批图谱独立评估。 |

## 6. 行数变化

| 文件 | B27 后 | B28 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 3957 | 3858 | -99 |
| `src/panels/roleWorkbenchModels.ts` | 0 | 113 | +113 |
| `src/panels/governanceReviewPayloads.ts` | 107 | 107 | 0 |
| `src/panels/governancePanels.tsx` | 469 | 469 | 0 |
| `src/panels/governanceModels.ts` | 292 | 292 | 0 |
| `src/panels/decisionLoopPanels.tsx` | 843 | 843 | 0 |
| `src/shared/ui.tsx` | 379 | 379 | 0 |

## 7. 边界不变量

| 不变量 | B28 状态 |
|---|---|
| `productionWrites` | `false` |
| `providerCalls` | `false` |
| `erpWriteback` | `false` |
| action ceiling | `suggestion_review_replay` |
| 唯一写目标 | 本地 `data/governance_workbench.sqlite` |
| 密钥扫描 | `find ... -name '*.pem'` 输出为空 |

## 8. 回归脚本

```bash
npm run check
npm run build
npm run smoke:api
npm run smoke:readonly
npm run smoke:ui
```

smoke 产生的本地 SQLite 变化归档后恢复，最终以恢复后的 `smoke:readonly` 作为收口证据。

## 9. 本批验收记录

| 检查项 | 结果 |
|---|---|
| `npm run check` | 通过 |
| `npm run build` | 通过；45 modules transformed；JS 产物 `index-impv27HX.js`；CSS 产物 `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false`；角色工作台、风险阈值、财务成本 governance 均通过本地 smoke 路径 |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T020000-b28-t8-21-role-workbench-models/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T020000-b28-t8-21-role-workbench-models/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T020000-b28-t8-21-role-workbench-models/governance_workbench.post-b28-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T020000-b28-t8-21-role-workbench-models/governance_workbench.final-restored.sqlite` |
| SQLite 最终计数 | `recommendation_cards=15`、`agent_traces=61`、`agent_runs=81`、`action_tasks=15`、`decision_logs=150`、`trace_reviews=13`、`annotations=33` |
| SQLite 记录 | `annotation_b28_t8_21_role_workbench_models_20260629`、`decision_b28_t8_21_role_workbench_models_20260629` |

## 10. 下一批建议

B29 继续 T8：优先评估 `RoleWorkbenchesPanel` 是否能抽出纯展示组件；若图谱仍显示 hooks 与财务治理耦合过密，则转向 `RuntimeBusinessRowDesign` 或 `AI Knowledge Quality Review` 的纯请求体 builder。
