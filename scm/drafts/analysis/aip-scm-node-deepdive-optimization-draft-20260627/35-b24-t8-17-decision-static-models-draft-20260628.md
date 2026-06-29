---
title: "B24 T8-17 Decision Static Models Draft"
date: "2026-06-28"
status: "decision_static_models_extracted_and_smoke_verified"
scope: "T8-17 behavior-preserving owner decision packet and scenario diagnostic payload extraction"
debt_ids:
  - "T8"
depends_on:
  - "34-b23-t8-16-decision-loop-models-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B24 T8-17 决策静态模型抽取

## 1. 批次目标

B24 继续 T8：把 `ownerDecisionPackets` 静态配置、`OwnerDecisionPacket` / `OwnerDecisionChoice` 类型和 `ScenarioDiagnosticPayload` 契约下沉到 `src/panels/decisionLoopModels.ts`。`DecisionPanel` 继续持有场景诊断、owner decision、阈值、财务和 AI 知识审核相关 mutation handlers。

本批只处理无副作用的静态配置和类型契约，不改 `server/index.mjs`，不调整 API 路由，不移动写入函数。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B23 抽取后 | 894 | 1942 |
| B24 抽取后 | 893 | 1943 |

抽取后图谱确认：

| Symbol | 直接依赖 | 调用方 | B24 判断 |
|---|---|---|---|
| `OwnerDecisionPacketPanel` | `Badge`、`humanizeBoundary`、`humanizeOperationalLabel` | `DecisionPanel` | 展示组件仍由 `DecisionPanel` 调用，静态 packet 数据改由 model 文件提供。 |
| `AipScenarioBoard` | `AgentRunList`、`ExportButton`、`AgentTracePanel`、shared UI | `DecisionPanel` | 诊断 payload 类型泛型化，不改变运行按钮或 API 写入路径。 |
| `DecisionPanel` | `useApi`、factory、展示 panel | `App` | 仍是状态和 API 行为拥有者，行为不变。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除 `ownerDecisionPackets` 静态数组；使用 `ScenarioDiagnosticPayload<AipScenario>` 泛型契约。 |
| `src/panels/decisionLoopPanels.tsx` | 从 `decisionLoopModels.ts` 导入并 re-export owner decision 与 scenario diagnostic 类型；保留展示组件。 |
| `src/panels/decisionLoopModels.ts` | 新增 owner decision 类型、generic scenario diagnostic payload 和 `ownerDecisionPackets` 静态配置。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/decisionLoopModels.ts` | `OwnerDecisionChoice` | 阈值、财务、AI 知识审核和决策闭环共用选择契约。 |
| `src/panels/decisionLoopModels.ts` | `OwnerDecisionPacket` | owner decision 静态包与回调契约。 |
| `src/panels/decisionLoopModels.ts` | `ScenarioDiagnosticPayload<TScenario>` | 场景诊断结果泛型契约，主文件绑定 `AipScenario`，panel 文件绑定 `DecisionInboxScenario`。 |
| `src/panels/decisionLoopModels.ts` | `ownerDecisionPackets` | 决策治理视图的静态 owner packet 配置。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `recordOwnerDecision` / `runScenarioDiagnostic` | 仍是 API 写入边界，后续按行为函数族单独拆。 |
| 阈值与财务 payload fallback | 分属其它模块，后续按模块模型文件处理。 |
| `DecisionPanel` mutation handlers | 行为保持优先，暂不移动。 |
| 父仓库既有 dirty/untracked | 来源跨批次，继续只记录与本批可归属的原型文件。 |

## 6. 行数变化

| 文件 | B23 后 | B24 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 4843 | 4717 | -126 |
| `src/panels/decisionLoopPanels.tsx` | 862 | 843 | -19 |
| `src/panels/decisionLoopModels.ts` | 119 | 265 | +146 |
| `src/shared/ui.tsx` | 379 | 379 | 0 |

## 7. 边界不变量

| 不变量 | B24 状态 |
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
| `npm run build` | 通过；41 modules transformed；JS 产物 `index-CXhYldiJ.js`；CSS 产物 `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false`；owner decision、scenario diagnostic、threshold/finance owner packets 均通过本地 smoke 路径 |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T132000-b24-t8-17-decision-static-models/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T132000-b24-t8-17-decision-static-models/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T132000-b24-t8-17-decision-static-models/governance_workbench.post-b24-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T132000-b24-t8-17-decision-static-models/governance_workbench.final-restored.sqlite` |
| SQLite 最终计数 | `recommendation_cards=15`、`agent_traces=61`、`agent_runs=81`、`action_tasks=15`、`decision_logs=146`、`trace_reviews=13`、`annotations=29` |
| SQLite 记录 | `annotation_b24_t8_17_decision_static_models_20260628`、`decision_b24_t8_17_decision_static_models_20260628` |

## 10. 下一批建议

B25 继续 T8：拆 `DecisionPanel` 的行为函数族前，先评估阈值与财务 governance payload fallback 是否能进入各自模型文件；仍优先处理无副作用数据契约。
