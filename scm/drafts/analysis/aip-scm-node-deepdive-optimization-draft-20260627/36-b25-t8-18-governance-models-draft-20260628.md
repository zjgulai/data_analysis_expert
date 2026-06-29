---
title: "B25 T8-18 Governance Models Draft"
date: "2026-06-28"
status: "governance_models_extracted_and_smoke_verified"
scope: "T8-18 behavior-preserving risk threshold and finance governance payload extraction"
debt_ids:
  - "T8"
depends_on:
  - "35-b24-t8-17-decision-static-models-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B25 T8-18 治理模型抽取

## 1. 批次目标

B25 继续 T8：把风险阈值治理和财务成本治理的 payload 类型、证据包类型和空态工厂抽到 `src/panels/governanceModels.ts`。`main.tsx` 继续持有展示组件、API hooks 和本地 review 写入函数。

本批只处理无副作用的数据契约与 fallback 工厂，不改 `server/index.mjs`，不调整 API 路由，不移动 mutation handlers。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B24 抽取后 | 893 | 1943 |
| B25 抽取后 | 895 | 1967 |

抽取前后图谱确认：

| Symbol | 直接依赖 | 调用方 | B25 判断 |
|---|---|---|---|
| `emptyRiskThresholdGovernance` | 无 | `CurrentRiskRadarPanel` → `App` | 可作为纯 fallback 工厂移动到模型文件。 |
| `emptyFinanceCostGovernance` | 无 | `RoleWorkbenchesPanel` → `App` | 可作为纯 fallback 工厂移动到模型文件。 |
| `RiskThresholdGovernancePanel` | shared UI helpers、`Badge`、`DataTable`、`RefPills` | `CurrentRiskRadarPanel` | 展示组件继续留在 `main.tsx`。 |
| `FinanceCostGovernancePanel` | shared UI helpers、`Badge`、`DataTable`、`RefPills` | `RoleWorkbenchesPanel` | 展示组件继续留在 `main.tsx`。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除治理 payload 类型和两个空态工厂；从 `governanceModels.ts` 导入契约。 |
| `src/panels/governanceModels.ts` | 新增风险阈值与财务成本治理类型、证据包类型和空态工厂。 |
| `src/panels/decisionLoopModels.ts` | 本批不编辑。 |
| `src/panels/decisionLoopPanels.tsx` | 本批不编辑。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/governanceModels.ts` | `RiskThresholdVersion` | 阈值版本卡片、review handler 和财务成本阈值复用的治理契约。 |
| `src/panels/governanceModels.ts` | `RiskThresholdScenarioBinding` | 阈值与场景绑定关系契约。 |
| `src/panels/governanceModels.ts` | `ThresholdValueReviewPacket` | 阈值值域 owner review 契约。 |
| `src/panels/governanceModels.ts` | `RiskThresholdGovernancePayload` | `/api/risk-threshold-governance` payload 契约。 |
| `src/panels/governanceModels.ts` | `FinanceCostEvidencePacket` | 财务成本证据包契约。 |
| `src/panels/governanceModels.ts` | `FinanceCostGovernancePayload` | `/api/finance-cost-governance` payload 契约。 |
| `src/panels/governanceModels.ts` | `emptyRiskThresholdGovernance` | 风险阈值治理 API fallback。 |
| `src/panels/governanceModels.ts` | `emptyFinanceCostGovernance` | 财务成本治理 API fallback。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `RiskThresholdGovernancePanel` / `FinanceCostGovernancePanel` | 仍与 shared UI helper 和回调绑定，后续需按展示组件图谱单独拆。 |
| `recordThresholdReview` / `recordThresholdValueReview` / `recordFinanceReview` | 属于本地 review 写入边界，后续按行为函数族单独评估。 |
| `server/index.mjs` 的 API 路由 | 本批目标是前端纯契约抽取，服务端保持不变。 |
| 父仓库既有 dirty/untracked | 来源跨批次，继续只记录与本批可归属的原型文件。 |

## 6. 行数变化

| 文件 | B24 后 | B25 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 4717 | 4440 | -277 |
| `src/panels/governanceModels.ts` | 0 | 292 | +292 |
| `src/panels/decisionLoopModels.ts` | 265 | 265 | 0 |
| `src/panels/decisionLoopPanels.tsx` | 843 | 843 | 0 |
| `src/shared/ui.tsx` | 379 | 379 | 0 |

## 7. 边界不变量

| 不变量 | B25 状态 |
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
| `npm run build` | 通过；42 modules transformed；JS 产物 `index-C5m_3zDG.js`；CSS 产物 `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false`；风险阈值、阈值 owner choice、阈值值域 review、财务成本 governance 均通过本地 smoke 路径 |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T140000-b25-t8-18-governance-models/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T140000-b25-t8-18-governance-models/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T140000-b25-t8-18-governance-models/governance_workbench.post-b25-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T140000-b25-t8-18-governance-models/governance_workbench.final-restored.sqlite` |
| SQLite 最终计数 | `recommendation_cards=15`、`agent_traces=61`、`agent_runs=81`、`action_tasks=15`、`decision_logs=147`、`trace_reviews=13`、`annotations=30` |
| SQLite 记录 | `annotation_b25_t8_18_governance_models_20260628`、`decision_b25_t8_18_governance_models_20260628` |

## 10. 下一批建议

B26 继续 T8：评估 `RiskThresholdGovernancePanel` 与 `FinanceCostGovernancePanel` 是否可以按展示组件边界移动到 panel 文件；API hooks 和 record handlers 继续留在 `main.tsx`，直到行为函数族有更明确的依赖图依据。
