---
title: "B23 T8-16 Decision Loop Models Draft"
date: "2026-06-28"
status: "decision_loop_models_extracted_and_smoke_verified"
scope: "T8-16 behavior-preserving decision loop model and fallback payload extraction"
debt_ids:
  - "T8"
depends_on:
  - "33-b22-t8-15-decision-governance-panels-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B23 T8-16 决策闭环模型抽取

## 1. 批次目标

B23 继续 T8：把 `DecisionPanel` 内联的治理 fallback payload 和相关类型契约下沉到 `src/panels/decisionLoopModels.ts`。`DecisionPanel` 继续持有 `useApi`、刷新键、busy 状态和所有 mutation handlers。

本批只处理纯模型和默认值，不改 `server/index.mjs`，不调整 API 路由，不移动写入函数。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B22 抽取后 | 890 | 1932 |
| B23 抽取后 | 894 | 1942 |

抽取后图谱确认：

| Symbol | 直接依赖 | 调用方 | B23 判断 |
|---|---|---|---|
| `createEmptyDecisionReceiptSummary` | 无 | `DecisionPanel` | 纯 fallback factory，可独立放入模型文件。 |
| `createEmptyOmsWmsUsagePolicyPayload` | 无 | `DecisionPanel` | 纯 fallback factory，可独立放入模型文件。 |
| `DecisionPanel` | `useApi`、factory、展示 panel | `App` | 仍是状态和 API 行为拥有者，行为不变。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除 receipt summary / OMS-WMS usage policy 的内联 fallback payload；改为调用模型 factory。 |
| `src/panels/decisionLoopPanels.tsx` | 从 `decisionLoopModels.ts` 导入并 re-export 治理类型；保留展示组件。 |
| `src/panels/decisionLoopModels.ts` | 新增治理类型契约与 `createEmptyDecisionReceiptSummary` / `createEmptyOmsWmsUsagePolicyPayload`。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/decisionLoopModels.ts` | `DecisionReceiptSummary` | decision inbox 与 governance 面板共用的回执摘要契约。 |
| `src/panels/decisionLoopModels.ts` | `OmsWmsUsagePolicyPayload` | OMS/WMS 使用策略包 API payload 契约。 |
| `src/panels/decisionLoopModels.ts` | `OmsWmsUsagePolicyPacket` / `OmsWmsUsagePolicyChoice` | usage policy 责任人选择回调契约。 |
| `src/panels/decisionLoopModels.ts` | `createEmptyDecisionReceiptSummary` | `useApi` fallback factory。 |
| `src/panels/decisionLoopModels.ts` | `createEmptyOmsWmsUsagePolicyPayload` | `useApi` fallback factory。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `DecisionPanel` mutation handlers | 仍是行为边界和 API 写入拥有者，后续按函数族单独拆。 |
| `ScenarioDiagnosticPayload` | 与 AIP 场景诊断结果强绑定，下一批再判断是否进入模型文件。 |
| `OwnerDecisionPacket` 静态配置 | 当前仍在 `main.tsx`，后续可随 owner decision model 一起拆。 |
| 父仓库既有 dirty/untracked | 来源跨批次，继续只记录与本批可归属的原型文件。 |

## 6. 行数变化

| 文件 | B22 后 | B23 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 4867 | 4843 | -24 |
| `src/panels/decisionLoopPanels.tsx` | 925 | 862 | -63 |
| `src/panels/decisionLoopModels.ts` | 0 | 119 | +119 |
| `src/shared/ui.tsx` | 379 | 379 | 0 |

## 7. 边界不变量

| 不变量 | B23 状态 |
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
| `npm run build` | 通过；41 modules transformed；JS 产物 `index-BYI9nyC-.js`；CSS 产物 `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false`；decision receipt summary 和 OMS/WMS usage policy API 均可读取 |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T124500-b23-t8-16-decision-loop-models/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T124500-b23-t8-16-decision-loop-models/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T124500-b23-t8-16-decision-loop-models/governance_workbench.post-b23-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T124500-b23-t8-16-decision-loop-models/governance_workbench.final-restored.sqlite` |
| SQLite 最终计数 | `recommendation_cards=15`、`agent_traces=61`、`agent_runs=81`、`action_tasks=15`、`decision_logs=145`、`trace_reviews=13`、`annotations=28` |
| SQLite 记录 | `annotation_b23_t8_16_decision_loop_models_20260628`、`decision_b23_t8_16_decision_loop_models_20260628` |

## 10. 下一批建议

B24 继续 T8：评估 `DecisionPanel` 内的 owner decision 静态配置与 `ScenarioDiagnosticPayload` 是否进入 `decisionLoopModels.ts`，优先抽无行为副作用的静态契约，继续不移动 API mutation handlers。
