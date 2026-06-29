---
title: "B22 T8-15 Decision Governance Panels Draft"
date: "2026-06-28"
status: "governance_panels_extracted_and_smoke_verified"
scope: "T8-15 behavior-preserving decision governance and OMS/WMS usage policy panel split"
debt_ids:
  - "T8"
depends_on:
  - "32-b21-t8-14-scenario-board-panels-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B22 T8-15 决策治理面板拆分

## 1. 批次目标

B22 继续 T8：把 `DecisionReceiptGovernance` 与 `OmsWmsUsagePolicyPanel` 从 `src/main.tsx` 移到 `src/panels/decisionLoopPanels.tsx`。`DecisionPanel` 继续持有 `receiptSummary`、`usagePolicy`、`usagePolicyReceipt`、`recordOmsWmsUsagePolicyChoice` 和刷新状态。

本批只处理展示层归属，不改 `server/index.mjs`，不调整 OMS/WMS owner gate 或 usage policy API 契约，不扩大认证或写入边界。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B21 抽取后 | 891 | 1932 |
| B22 抽取后 | 890 | 1932 |

抽取前图谱显示：

| Symbol | 直接依赖 | 调用方 | B22 判断 |
|---|---|---|---|
| `DecisionReceiptGovernance` | `ExportButton`、`Badge`、`humanizeOperationalLabel` | `DecisionPanel` | 是回执治理展示壳，适合下沉到 `decisionLoopPanels.tsx`，导出通过 `onExport` 注入。 |
| `OmsWmsUsagePolicyPanel` | `Badge`、`humanizeBoundary`、`humanizeOperationalLabel` | `DecisionPanel` | 是 OMS/WMS 使用策略展示壳，写入动作继续通过 `onRecord` 注入。 |

抽取后图谱确认 `DecisionPanel` 的直接 panel callee 包含 `DecisionReceiptGovernance` 与 `OmsWmsUsagePolicyPanel`，二者 qualified name 均在 `src.panels.decisionLoopPanels`。

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除本地 `DecisionReceiptGovernance`、`OmsWmsUsagePolicyPanel` 与相关类型主体；保留 API hooks 和 mutation handlers。 |
| `src/panels/decisionLoopPanels.tsx` | 新增两个治理展示组件，并导出 `DecisionReceiptSummary`、`OmsWmsUsagePolicyPayload`、`OmsWmsUsagePolicyPacket`、`OmsWmsUsagePolicyChoice`。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/decisionLoopPanels.tsx` | `DecisionReceiptGovernance` | OMS/WMS owner gate 回执治理统计、packet 卡片和最近回执条。 |
| `src/panels/decisionLoopPanels.tsx` | `OmsWmsUsagePolicyPanel` | 来源字段使用策略包、边界事实、责任人选择按钮和回执展示。 |
| `src/panels/decisionLoopPanels.tsx` | `DecisionReceiptSummary` | 回执治理展示契约，服务 inbox 与 governance 两个视图。 |
| `src/panels/decisionLoopPanels.tsx` | `OmsWmsUsagePolicy*` types | usage policy 展示与 `onRecord` 回调契约。 |
| `src/main.tsx` | `recordOmsWmsUsagePolicyChoice` | 保持在 `DecisionPanel`，继续由本地 API 写入 decision log。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `OwnerDecisionPacketPanel` | 已在 panel 文件内，后续只需随治理视图一起稳定契约。 |
| `DecisionPanel` 状态层 | 仍聚合多个 API hooks 与 mutation handlers，需等展示组件继续下沉后再拆状态容器。 |
| `RoleWorkbenchesPanel` | 属于角色工作台模块，和 decision loop 拆分主线不同批处理。 |
| 父仓库既有 dirty/untracked | 来源跨批次，继续只记录与本批可归属的原型文件。 |

## 6. 行数变化

| 文件 | B21 后 | B22 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 5117 | 4867 | -250 |
| `src/panels/decisionLoopPanels.tsx` | 671 | 925 | +254 |
| `src/shared/ui.tsx` | 379 | 379 | 0 |

## 7. 边界不变量

| 不变量 | B22 状态 |
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
| `npm run build` | 通过；40 modules transformed；JS 产物 `index-C88xJeGv.js`；CSS 产物 `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false`；OMS/WMS usage policy pack 生成本地 review decision |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T121500-b22-t8-15-governance-panels/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T121500-b22-t8-15-governance-panels/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T121500-b22-t8-15-governance-panels/governance_workbench.post-b22-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T121500-b22-t8-15-governance-panels/governance_workbench.final-restored.sqlite` |
| SQLite 最终计数 | `recommendation_cards=15`、`agent_traces=61`、`agent_runs=81`、`action_tasks=15`、`decision_logs=144`、`trace_reviews=13`、`annotations=27` |
| SQLite 记录 | `annotation_b22_t8_15_governance_panels_20260628`、`decision_b22_t8_15_governance_panels_20260628` |

## 10. 下一批建议

B23 继续 T8：拆 `DecisionPanel` 的剩余状态容器边界，优先将纯默认值和治理 payload factory 下沉到 panel helper 或 `src/panels/decisionLoopModels.ts`，继续保留 API mutation handlers 行为不变。
