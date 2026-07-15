---
title: "B26 T8-19 Governance Panels Draft"
date: "2026-06-29"
status: "governance_panels_extracted_and_smoke_verified"
scope: "T8-19 behavior-preserving risk threshold and finance governance display panel extraction"
debt_ids:
  - "T8"
depends_on:
  - "36-b25-t8-18-governance-models-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B26 T8-19 治理展示组件抽取

## 1. 批次目标

B26 继续 T8：把 `RiskThresholdGovernancePanel` 和 `FinanceCostGovernancePanel` 从 `src/main.tsx` 移到 `src/panels/governancePanels.tsx`。`main.tsx` 继续持有 `useApi` 调用、refresh key、busy 状态和本地 review 写入函数。

本批只做展示组件归位，不改 `server/index.mjs`，不调整 API 路由，不移动 mutation handlers。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B25 抽取后 | 895 | 1967 |
| B26 抽取后 | 897 | 1980 |

抽取前后图谱确认：

| Symbol | 直接依赖 | 调用方 | B26 判断 |
|---|---|---|---|
| `RiskThresholdGovernancePanel` | `Badge`、`DataTable`、`RefPills`、`humanizeBoundary`、`humanizeOperationalLabel`、`sourceEvidenceTone` | `CurrentRiskRadarPanel` → `App` | 展示组件可移动到 panel 文件；record handlers 继续由上游注入。 |
| `FinanceCostGovernancePanel` | `Badge`、`DataTable`、`RefPills`、`humanizeBoundary`、`humanizeOperationalLabel`、`sourceEvidenceTone` | `RoleWorkbenchesPanel` → `App` | 展示组件可移动到 panel 文件；财务 review 写入仍留在主文件。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除两个治理展示组件实现；导入 `governancePanels.tsx` 的组件；保留调用点和 handlers。 |
| `src/panels/governancePanels.tsx` | 新增两个治理展示组件。 |
| `src/panels/governanceModels.ts` | 本批不编辑。 |
| `src/panels/decisionLoopPanels.tsx` | 本批不编辑。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/governancePanels.tsx` | `RiskThresholdGovernancePanel` | 风险阈值版本、owner choice、值域 review、场景绑定和复核台账展示。 |
| `src/panels/governancePanels.tsx` | `FinanceCostGovernancePanel` | 财务成本证据、policy summary、owner choice、对账 gate 和复核台账展示。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `recordThresholdReview` / `recordThresholdValueReview` / `recordFinanceReview` | 本地 SQLite 写入边界，后续按行为函数族单独评估。 |
| `CurrentRiskRadarPanel` / `RoleWorkbenchesPanel` | 仍持有多个 API hook、局部状态和跨区域编排，先不继续拆。 |
| `server/index.mjs` 的治理 API | 本批只移动前端展示组件。 |
| 父仓库既有 dirty/untracked | 来源跨批次，继续只记录与本批可归属的原型文件。 |

## 6. 行数变化

| 文件 | B25 后 | B26 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 4440 | 3995 | -445 |
| `src/panels/governancePanels.tsx` | 0 | 469 | +469 |
| `src/panels/governanceModels.ts` | 292 | 292 | 0 |
| `src/panels/decisionLoopPanels.tsx` | 843 | 843 | 0 |
| `src/shared/ui.tsx` | 379 | 379 | 0 |

## 7. 边界不变量

| 不变量 | B26 状态 |
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
| `npm run build` | 通过；43 modules transformed；JS 产物 `index-BPfrGgUf.js`；CSS 产物 `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false`；风险阈值、阈值 owner choice、阈值值域 review、财务成本 governance 均通过本地 smoke 路径 |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T000000-b26-t8-19-governance-panels/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T000000-b26-t8-19-governance-panels/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T000000-b26-t8-19-governance-panels/governance_workbench.post-b26-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T000000-b26-t8-19-governance-panels/governance_workbench.final-restored.sqlite` |
| SQLite 最终计数 | `recommendation_cards=15`、`agent_traces=61`、`agent_runs=81`、`action_tasks=15`、`decision_logs=148`、`trace_reviews=13`、`annotations=31` |
| SQLite 记录 | `annotation_b26_t8_19_governance_panels_20260629`、`decision_b26_t8_19_governance_panels_20260629` |

## 10. 下一批建议

B27 继续 T8：先用依赖图评估 `CurrentRiskRadarPanel` 或 `RoleWorkbenchesPanel` 内部的本地 review handler 是否能按行为函数族抽到 helper；若图谱显示 hook/state 编排仍过密，则转向其它无副作用模型或展示组件。
