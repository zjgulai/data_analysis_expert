---
title: "B19 T8-12 Decision Ledger Panels Draft"
date: "2026-06-28"
status: "decision_ledger_panels_extracted_and_smoke_verified"
scope: "T8-12 behavior-preserving decision ledger panel split"
debt_ids:
  - "T8"
depends_on:
  - "28-b18-t8-11-trace-review-panels-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B19 T8-12 决策闭环台账面板拆分

## 1. 批次目标

B19 继续 T8：把 `DecisionPanel` 中的视图切换、运行记录、推荐动作卡、审计台账、Action 任务表和 owner 决策包展示移到 `src/panels/decisionLoopPanels.tsx`。`DecisionPanel` 继续持有 `useApi`、`api` 调用、刷新键、busy 状态与写入函数，因此本批只改变组件归属，不改变 UI 行为。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B18 收口后 | 883 | 1946 |
| B19 抽取后 | 888 | 1968 |

抽取后图谱判断：

| Symbol | 直接依赖 | 调用方 | B19 判断 |
|---|---|---|---|
| `DecisionRunsPanel` | `AgentRunList`、`RecommendationCardList`、`ExportButton`、`RecommendationWorkflowReceipt` | `DecisionPanel` | 运行记录与推荐卡组合壳可独立；创建、复核和转任务动作仍由回调注入。 |
| `DecisionAuditPanel` | `Badge`、`DataTable`、`AgentTracePanel`、`TraceReviewBoard` | `DecisionPanel` | 审计表与证据链复盘组合壳可独立；`reviewTrace` 仍在主状态层。 |
| `OwnerDecisionPacketPanel` | `Badge`、`humanizeBoundary`、`humanizeOperationalLabel` | `DecisionPanel` | owner 决策包是展示与按钮壳；决策写入由 `recordOwnerDecision` 注入。 |
| `DecisionViewTabs` | 本地 view 配置 | `DecisionPanel` | tabs 配置不需要留在巨石主体内。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除局部 view tabs、推荐闭环回执、owner 决策包面板，以及 runs/audit 大块 JSX；保留状态、API hooks、写入函数。 |
| `src/panels/decisionLoopPanels.tsx` | 新增决策闭环展示组件与 owner 决策类型。 |
| `src/panels/agentActivityLists.tsx` | 本批不编辑；复用 `AgentRunList`、`RecommendationCardList` 与相关类型。 |
| `src/panels/traceReviewPanels.tsx` | 本批不编辑；复用 `AgentTracePanel` 与 `TraceReviewBoard`。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/decisionLoopPanels.tsx` | `DecisionViewTabs` | 决策闭环 tab 壳层。 |
| `src/panels/decisionLoopPanels.tsx` | `DecisionRunsPanel` | 运行台账、推荐卡、推荐闭环回执与导出按钮组合。 |
| `src/panels/decisionLoopPanels.tsx` | `DecisionAuditPanel` | 洞察记录、Action 任务表、证据链表与复盘工作台组合。 |
| `src/panels/decisionLoopPanels.tsx` | `OwnerDecisionPacketPanel` | owner 决策包展示与按钮壳。 |
| `src/panels/decisionLoopPanels.tsx` | `OwnerDecisionChoice` / `OwnerDecisionPacket` | owner 决策展示契约。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `DecisionPanel` | 仍是本地状态、API hooks 和写入动作的拥有者，后续再按图谱拆状态层。 |
| `DecisionInboxPanel` | 收件箱仍包含场景、建议卡、行动任务、trace 摘要混合逻辑，适合后续独立拆分。 |
| `AipScenarioBoard` | 场景诊断闭环仍涉及 run/trace/recommendation 生成，先保留。 |
| `DecisionReceiptGovernance` / `OmsWmsUsagePolicyPanel` | 来源字段策略包和回执治理属于下一段治理面板拆分。 |
| `server/index.mjs` | 后端拆分留到后续 T8 批次。 |

## 6. 行数变化

| 文件 | B18 后 | B19 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 5649 | 5432 | -217 |
| `src/panels/decisionLoopPanels.tsx` | 0 | 322 | +322 |

## 7. 边界不变量

| 不变量 | B19 状态 |
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
| `npm run build` | 通过；40 modules transformed；JS 产物 `index-DVWIIQer.js` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false`；本地 API 需先监听 `127.0.0.1:5174` |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T104000-b19-t8-12-decision-ledger-panels/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T104000-b19-t8-12-decision-ledger-panels/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T104000-b19-t8-12-decision-ledger-panels/governance_workbench.post-b19-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T104000-b19-t8-12-decision-ledger-panels/governance_workbench.final-restored.sqlite` |
| SQLite 记录 | `annotation_b19_t8_12_decision_ledger_panels_20260628`、`decision_b19_t8_12_decision_ledger_panels_20260628` |

## 10. 下一批建议

B20 继续 T8：拆 `DecisionPanel` 的 `DecisionInboxPanel` 与场景诊断组合层，优先把 inbox 的只读摘要、建议卡队列、场景队列和 recent trace/runs 小列表移到独立 panel；仍保留 API 写入函数在主状态层。
