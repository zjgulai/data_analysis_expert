---
title: "B27 T8-20 Governance Review Payloads Draft"
date: "2026-06-29"
status: "governance_review_payloads_extracted_and_smoke_verified"
scope: "T8-20 behavior-preserving governance review decision-log payload extraction"
debt_ids:
  - "T8"
depends_on:
  - "37-b26-t8-19-governance-panels-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B27 T8-20 治理复核请求体抽取

## 1. 批次目标

B27 继续 T8：评估 `CurrentRiskRadarPanel` 与 `RoleWorkbenchesPanel` 的本地 review handlers。图谱和代码显示 handler 同时负责 busy、API POST、receipt、refresh 与错误状态；因此本批只抽出无副作用的 decision log 请求体 builder，保留 fetch 与状态更新在 `src/main.tsx`。

本批不改 `server/index.mjs`，不调整 API 路由，不移动 mutation handlers。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B26 抽取后 | 897 | 1980 |
| B27 抽取后 | 905 | 2010 |

抽取后图谱确认：

| Symbol | 调用方 | B27 判断 |
|---|---|---|
| `buildThresholdReviewDecisionLog` | `recordThresholdReview` | 纯请求体 builder，可独立于 API POST。 |
| `buildThresholdOwnerChoiceDecisionLog` | `recordThresholdOwnerChoice` | 纯请求体 builder，可独立于 busy/receipt 状态。 |
| `buildThresholdValueReviewDecisionLog` | `recordThresholdValueReview` | 纯请求体 builder，可独立于 refresh key。 |
| `buildFinanceReviewDecisionLog` | `recordFinanceReview` | 纯请求体 builder，可独立于财务 review 写入行为。 |
| `buildFinanceOwnerChoiceDecisionLog` | `recordFinanceOwnerChoice` | 纯请求体 builder，可独立于财务 owner choice 状态。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 五个 review handler 改为调用 builder；保留 `api`、busy、receipt、refresh 与 error 状态。 |
| `src/panels/governanceReviewPayloads.ts` | 新增 decision log 请求体类型与五个 builder。 |
| `src/panels/governancePanels.tsx` | 本批不编辑。 |
| `src/panels/governanceModels.ts` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/governanceReviewPayloads.ts` | `DecisionLogRequestPayload` | 本地 decision log POST 请求体契约。 |
| `src/panels/governanceReviewPayloads.ts` | `buildThresholdReviewDecisionLog` | 阈值版本 review 请求体。 |
| `src/panels/governanceReviewPayloads.ts` | `buildThresholdOwnerChoiceDecisionLog` | 阈值 owner choice 请求体。 |
| `src/panels/governanceReviewPayloads.ts` | `buildThresholdValueReviewDecisionLog` | 阈值值域 review 请求体。 |
| `src/panels/governanceReviewPayloads.ts` | `buildFinanceReviewDecisionLog` | 财务成本 review 请求体。 |
| `src/panels/governanceReviewPayloads.ts` | `buildFinanceOwnerChoiceDecisionLog` | 财务 owner choice 请求体。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `recordThresholdReview` / `recordThresholdOwnerChoice` / `recordThresholdValueReview` | 仍持有 API POST、busy、receipt、refresh 与 error 状态，暂不移动。 |
| `recordFinanceReview` / `recordFinanceOwnerChoice` | 同上，仍留在 `RoleWorkbenchesPanel` 内。 |
| `recordRoleReview` | 角色工作台业务文案与角色模型仍在主文件，本批不混入。 |
| 其它 mutation handlers | 需按下一批图谱独立评估。 |

## 6. 行数变化

| 文件 | B26 后 | B27 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 3995 | 3957 | -38 |
| `src/panels/governanceReviewPayloads.ts` | 0 | 107 | +107 |
| `src/panels/governancePanels.tsx` | 469 | 469 | 0 |
| `src/panels/governanceModels.ts` | 292 | 292 | 0 |
| `src/panels/decisionLoopPanels.tsx` | 843 | 843 | 0 |
| `src/shared/ui.tsx` | 379 | 379 | 0 |

## 7. 边界不变量

| 不变量 | B27 状态 |
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
| `npm run build` | 通过；44 modules transformed；JS 产物 `index-C2hYL1rZ.js`；CSS 产物 `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false`；风险阈值、阈值 owner choice、阈值值域 review、财务成本 governance 均通过本地 smoke 路径 |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T010000-b27-t8-20-governance-review-payloads/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T010000-b27-t8-20-governance-review-payloads/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T010000-b27-t8-20-governance-review-payloads/governance_workbench.post-b27-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T010000-b27-t8-20-governance-review-payloads/governance_workbench.final-restored.sqlite` |
| SQLite 最终计数 | `recommendation_cards=15`、`agent_traces=61`、`agent_runs=81`、`action_tasks=15`、`decision_logs=149`、`trace_reviews=13`、`annotations=32` |
| SQLite 记录 | `annotation_b27_t8_20_governance_review_payloads_20260629`、`decision_b27_t8_20_governance_review_payloads_20260629` |

## 10. 下一批建议

B28 继续 T8：优先评估 `recordRoleReview` 是否也能先拆请求体 builder；若角色工作台静态模型和文案仍在主文件，则先抽 `roleWorkbenches` 静态配置与角色类型，继续把行为写入保留在 `main.tsx`。
