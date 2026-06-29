---
title: "B18 T8-11 Trace Review Panels Draft"
date: "2026-06-28"
status: "trace_review_panels_extracted_and_smoke_verified"
scope: "T8-11 behavior-preserving trace review panel split"
debt_ids:
  - "T8"
depends_on:
  - "27-b17-t8-10-detail-drawer-boundary-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B18 T8-11 证据链复盘面板拆分

## 1. 批次目标

B18 执行 T8-11：把 `AgentTracePanel` 与 `TraceReviewBoard` 移到 `src/panels/traceReviewPanels.tsx`，并在新文件内显式拆出证据链只读展示、复盘动作卡、回执和历史表。`main.tsx` 继续保留 `reviewTrace`，因此本批不改复盘写入路径、不动服务端。

## 2. Codebase-Memory 依据

B18 开工前和抽取后均刷新 codebase-memory：

| 阶段 | nodes | edges |
|---|---:|---:|
| 开工前 | 878 | 1930 |
| 抽取后 | 883 | 1946 |

抽取后图谱判断：

| Symbol | 直接依赖 | 调用方 | B18 判断 |
|---|---|---|---|
| `AgentTracePanel` | `Badge`、`RefPills`、`humanizeBoundary`、`humanizeOperationalLabel` | `AiKnowledgePanel`、`ChatBiDryRunResult`、`AipScenarioBoard`、`DecisionPanel` | 纯展示组件，适合离开 `main.tsx`。 |
| `TraceReviewBoard` | `TraceReviewSummary`、`TraceReviewReceipt`、`TraceReviewActionGrid`、`TraceReviewHistoryTable` | `DecisionPanel` | 复盘面板可独立；写入动作仍由 `onReview` 注入。 |
| `TraceReviewActionCard` | `Badge`、`RefPills`、`humanizeOperationalLabel` | `TraceReviewActionGrid` | 本地人工复盘动作边界已命名。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除本地 `AgentTracePanel` / `TraceReviewBoard` 主体；从新文件导入组件和类型。 |
| `src/panels/traceReviewPanels.tsx` | 新增证据链展示、复盘摘要、回执、动作卡和历史表。 |
| `src/panels/agentActivityLists.tsx` | 本批不编辑；复用其 `AgentTrace` / `AgentTraceStep` 类型。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/traceReviewPanels.tsx` | `AgentTracePanel` | 单条证据链只读展示。 |
| `src/panels/traceReviewPanels.tsx` | `TraceReviewBoard` | 证据链复盘工作台壳层。 |
| `src/panels/traceReviewPanels.tsx` | `TraceReviewActionCard` / `TraceReviewActionGrid` | 人工复盘按钮边界，动作通过 `onReview` 注入。 |
| `src/panels/traceReviewPanels.tsx` | `TraceReviewHistoryTable` | 复盘历史表，只读展示。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `DecisionPanel` | 仍承载建议卡、运行记录、行动任务和 owner 决策，后续单独按图谱处理。 |
| `reviewTrace` | mutation 所有权继续留在 `main.tsx`，避免本批扩大到 API helper 拆分。 |
| `api` / `useApi` | 请求 helper 与数据状态后续单独处理。 |
| `server/index.mjs` | 后端拆分留到后续 T8 批次。 |

## 6. 行数变化

| 文件 | B17 后 | B18 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 5813 | 5649 | -164 |
| `src/panels/traceReviewPanels.tsx` | 0 | 232 | +232 |

## 7. 边界不变量

| 不变量 | B18 状态 |
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

smoke 产生的本地 SQLite 变化必须归档后恢复，最终以恢复后的 `smoke:readonly` 作为收口证据。

## 9. 本批验收记录

| 检查项 | 结果 |
|---|---|
| `npm run check` | 通过 |
| `npm run build` | 通过；39 modules transformed；JS 产物 `index-BYCMmMuf.js` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T023500-b18-t8-11-trace-review-panels/ui-smoke-artifacts/ui-smoke-2026-06-28T02-10-22-244Z/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T023500-b18-t8-11-trace-review-panels/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T023500-b18-t8-11-trace-review-panels/governance_workbench.post-b18-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T023500-b18-t8-11-trace-review-panels/governance_workbench.final-restored.sqlite` |
| SQLite 记录 | `annotation_b18_t8_11_trace_review_panels_20260628`、`decision_b18_t8_11_trace_review_panels_20260628` |

## 10. 下一批建议

B19 继续 T8：处理 `DecisionPanel` 的运行记录、建议卡、行动任务和 owner 决策区域，先拆只读列表与动作写入边界；后端继续暂缓。
