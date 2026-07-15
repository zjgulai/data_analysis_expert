---
title: "B20 T8-13 Decision Inbox Panels Draft"
date: "2026-06-28"
status: "decision_inbox_panels_extracted_and_smoke_verified"
scope: "T8-13 behavior-preserving decision inbox panel split and worktree ownership cleanup start"
debt_ids:
  - "T8"
depends_on:
  - "29-b19-t8-12-decision-ledger-panels-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B20 T8-13 决策收件箱面板拆分

## 1. 批次目标

B20 继续 T8：把 `DecisionPanel` 中的 `DecisionInboxPanel` 移到 `src/panels/decisionLoopPanels.tsx`，并把跨面板复用的 `GovernanceBoundaryStrip` 移到 `src/shared/ui.tsx`。`DecisionPanel` 继续持有 `useApi`、`api` 调用、刷新键、busy 状态、场景诊断、建议卡复核、转行动任务和 trace review 写入函数。

本批同步启动 worktree 待定项清理：先生成可归属清单，只处理本批与前批可确认的原型产物；对父仓库既有删除态、百度云占位文件和业务资料删除态只登记，不回滚、不删除。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B19 抽取后 | 888 | 1968 |
| B20 抽取后 | 890 | 1913 |

抽取后图谱判断：

| Symbol | 直接依赖 | 调用方 | B20 判断 |
|---|---|---|---|
| `DecisionInboxPanel` | `Badge`、`GovernanceBoundaryStrip`、`humanizeBoundary`、`humanizeOperationalLabel`、`priorityRank` | `DecisionPanel` | inbox 是展示壳与排序逻辑，动作继续通过回调注入。 |
| `GovernanceBoundaryStrip` | `Badge` | `CurrentRiskRadarPanel`、`KpiCanvasInspector`、`DecisionInboxPanel` | 已成为共享 UI helper，适合迁到 `src/shared/ui.tsx`。 |
| `priorityRank` | 本地静态排序 | `DecisionInboxPanel` | 只服务 inbox 队列排序，留在新 panel 文件内。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除本地 `DecisionInboxPanel` 主体；保留 `DecisionPanel` 的状态、API hooks 和写入函数。 |
| `src/panels/decisionLoopPanels.tsx` | 新增 `DecisionInboxPanel`、`DecisionInboxScenario`、`DecisionReceiptSummary` 和 `priorityRank`。 |
| `src/shared/ui.tsx` | 新增共享 `GovernanceBoundaryStrip`。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/decisionLoopPanels.tsx` | `DecisionInboxPanel` | 责任人收件箱展示壳、建议队列、P0/P1 场景队列、最近回执和最近证据链列表。 |
| `src/panels/decisionLoopPanels.tsx` | `DecisionInboxScenario` | inbox 所需的场景展示与回调契约。 |
| `src/panels/decisionLoopPanels.tsx` | `DecisionReceiptSummary` | inbox 所需的回执摘要契约。 |
| `src/shared/ui.tsx` | `GovernanceBoundaryStrip` | 跨风险雷达、KPI canvas 和 inbox 复用的边界 badge 条。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `AipScenarioBoard` | 场景诊断闭环仍涉及 run/trace/recommendation 生成，后续单独拆分。 |
| `DecisionReceiptGovernance` / `OmsWmsUsagePolicyPanel` | 来源字段策略包和回执治理属于下一段治理面板拆分。 |
| `DecisionPanel` 状态层 | 仍是 API hooks 与 mutation handlers 的拥有者，需在更多展示面板抽完后再拆。 |
| 父仓库既有删除态 | 来源不完全归属本批，先登记为待人工确认项。 |

## 6. 行数变化

| 文件 | B19 后 | B20 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 5432 | 5233 | -199 |
| `src/panels/decisionLoopPanels.tsx` | 322 | 542 | +220 |
| `src/shared/ui.tsx` | 365 | 379 | +14 |

## 7. 边界不变量

| 不变量 | B20 状态 |
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
| `npm run build` | 通过；40 modules transformed；JS 产物 `index-Sw3qWc9X.js` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；api smoke 后临时 recommendations 为 16；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T112000-b20-t8-13-decision-inbox-panels/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T112000-b20-t8-13-decision-inbox-panels/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T112000-b20-t8-13-decision-inbox-panels/governance_workbench.post-b20-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T112000-b20-t8-13-decision-inbox-panels/governance_workbench.final-restored.sqlite` |
| SQLite 记录 | `annotation_b20_t8_13_decision_inbox_panels_20260628`、`decision_b20_t8_13_decision_inbox_panels_20260628` |

## 10. Worktree 待定项清理启动

| 类别 | 当前处理 |
|---|---|
| B8-B20 原型 panel/shared 文件 | 可归属为当前 T8 拆分链，保留在本批 scope 清单。 |
| B20 新增/修改文件 | 纳入本批验收。 |
| 父仓库既有删除态 | 登记但不回滚、不删除。 |
| 百度云占位配置删除态 | 登记但不自动恢复。 |
| `tmp/outputs` 旧草稿删除态 | 登记但不自动恢复。 |

## 11. 下一批建议

B21 继续 T8：拆 `AipScenarioBoard` 与场景诊断结果展示层，保留 `runScenarioDiagnostic` 和 `runAllScenarioDiagnostics` 在 `DecisionPanel`，只搬展示和 matrix receipt。
