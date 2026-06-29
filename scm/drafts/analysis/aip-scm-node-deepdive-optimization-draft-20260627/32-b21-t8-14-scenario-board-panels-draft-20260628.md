---
title: "B21 T8-14 Scenario Board Panels Draft"
date: "2026-06-28"
status: "scenario_board_panels_extracted_and_smoke_verified"
scope: "T8-14 behavior-preserving AIP scenario board panel split"
debt_ids:
  - "T8"
depends_on:
  - "30-b20-t8-13-decision-inbox-panels-draft-20260628.md"
  - "31-b20-worktree-ownership-cleanup-register-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B21 T8-14 场景诊断面板拆分

## 1. 批次目标

B21 继续 T8：把 `AipScenarioBoard` 从 `src/main.tsx` 移到 `src/panels/decisionLoopPanels.tsx`，并把场景诊断结果、matrix receipt、场景导出按钮统一归到决策闭环展示面板文件。`DecisionPanel` 继续持有 `useApi`、`runScenarioDiagnostic`、`runAllScenarioDiagnostics`、`diagnostic`、`matrixResults` 和刷新状态。

本批只处理展示层归属，不改 `server/index.mjs`，不调整诊断 API 契约，不扩大认证或写入边界。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B20 抽取后 | 890 | 1913 |
| B21 抽取后 | 891 | 1932 |

抽取前图谱显示 `AipScenarioBoard` 的直接 caller 为 `DecisionPanel`，callee 为 `AgentRunList`、`ExportButton`、`AgentTracePanel`、`Badge`、`RefPills`、`humanizeBoundary`、`humanizeOperationalLabel`。

抽取后图谱确认：

| Symbol | 直接依赖 | 调用方 | B21 判断 |
|---|---|---|---|
| `AipScenarioBoard` | `AgentRunList`、`ExportButton`、`AgentTracePanel`、`Badge`、`RefPills`、`humanizeBoundary`、`humanizeOperationalLabel` | `DecisionPanel` | 适合放入 `decisionLoopPanels.tsx`，继续通过 props 接收运行函数和导出函数。 |
| `DecisionPanel` | `AipScenarioBoard`、`DecisionInboxPanel`、`DecisionRunsPanel`、`DecisionAuditPanel`、`OwnerDecisionPacketPanel`、`DecisionReceiptGovernance`、`OmsWmsUsagePolicyPanel` | `App` | 仍是状态与 API 调用拥有者，后续继续按展示面板拆分。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除本地 `AipScenarioBoard` 主体；保留场景诊断 state、API 调用和 mutation handlers。 |
| `src/panels/decisionLoopPanels.tsx` | 新增 `AipScenarioBoard` 与本地 `ScenarioDiagnosticPayload` 展示契约；复用已有 `DecisionInboxScenario`。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/decisionLoopPanels.tsx` | `AipScenarioBoard` | 三大供应链场景卡片、单场景诊断按钮、矩阵诊断按钮、场景导出入口。 |
| `src/panels/decisionLoopPanels.tsx` | `ScenarioDiagnosticPayload` | 展示层使用的诊断结果契约，承接 scenario、trace、run、nextAction、boundary。 |
| `src/main.tsx` | `runScenarioDiagnostic` | 保持在 `DecisionPanel`，继续由本地 API 写入 run/trace 台账。 |
| `src/main.tsx` | `runAllScenarioDiagnostics` | 保持在 `DecisionPanel`，继续串行运行本地场景诊断。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `DecisionReceiptGovernance` | 回执治理和来源覆盖策略仍在 `main.tsx`，下一批单独拆。 |
| `OmsWmsUsagePolicyPanel` | OMS/WMS 策略包展示与回执动作需和治理面板一起处理。 |
| `DecisionPanel` 状态层 | 仍聚合多个 API hooks 与 mutation handlers，需等展示面板继续下沉后再切状态容器。 |
| 父仓库既有 dirty/untracked | 来源跨批次，继续只记录与本批可归属的原型文件。 |

## 6. 行数变化

| 文件 | B20 后 | B21 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 5233 | 5117 | -116 |
| `src/panels/decisionLoopPanels.tsx` | 542 | 671 | +129 |
| `src/shared/ui.tsx` | 379 | 379 | 0 |

## 7. 边界不变量

| 不变量 | B21 状态 |
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
| `npm run build` | 通过；40 modules transformed；JS 产物 `index-BkjCW_9B.js`；CSS 产物 `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false`；场景矩阵诊断生成 3 条本地 run |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T113500-b21-t8-14-scenario-board-panels/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T113500-b21-t8-14-scenario-board-panels/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T113500-b21-t8-14-scenario-board-panels/governance_workbench.post-b21-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T113500-b21-t8-14-scenario-board-panels/governance_workbench.final-restored.sqlite` |
| SQLite 最终计数 | `recommendation_cards=15`、`agent_traces=61`、`agent_runs=81`、`action_tasks=15`、`decision_logs=143`、`trace_reviews=13`、`annotations=26` |
| SQLite 记录 | `annotation_b21_t8_14_scenario_board_panels_20260628`、`decision_b21_t8_14_scenario_board_panels_20260628` |

## 10. 下一批建议

B22 继续 T8：拆 `DecisionReceiptGovernance` 与 `OmsWmsUsagePolicyPanel`，把治理回执展示和 OMS/WMS 策略包从 `main.tsx` 下沉到 `decisionLoopPanels.tsx`，继续保留写入函数在 `DecisionPanel`。
