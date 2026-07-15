---
title: "B7 T8 Baseline Package Draft"
date: "2026-06-27"
status: "baseline_package_ready"
scope: "T8-0 baseline-only package before behavior-preserving split"
debt_ids:
  - "T8"
depends_on:
  - "14-b4-t8-codebase-memory-split-blueprint-draft-20260627.md"
  - "16-b6-rbac-additive-migration-review-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B7 T8 拆分前基线包

## 1. 批次目标

B7 对应 T8-0：只冻结拆分前基线，不做源码重构。目标是把 codebase-memory 图谱、当前巨石行数、关键函数位置、回归脚本和 T8-1 第一刀边界固化，避免后续拆分时失去对比面。

本批不编辑 `src/main.tsx` / `server/index.mjs`，不创建运行时权限拦截，不接生产库，不打开 provider call，不做 ERP/OMS/WMS 写回。

## 2. Codebase-Memory 图谱快照

| 项 | 值 |
|---|---:|
| project | `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` |
| total_nodes | 814 |
| total_edges | 1874 |
| Function | 302 |
| Variable | 272 |
| Section | 77 |
| Type | 65 |
| File | 33 |
| Module | 33 |
| EnvVar | 20 |
| Folder | 11 |

主要热点：

| Hotspot | fan_in | 说明 |
|---|---:|---|
| `Badge` | 41 | 前端共享展示组件，最小可抽取候选。 |
| `all` | 29 | 后端 SQL read helper，后端拆分前不得改行为。 |
| `humanizeOperationalLabel` | 28 | 前端共享格式化 helper。 |
| `get` | 22 | 后端 SQL single-row helper。 |
| `RefPills` | 15 | 前端共享引用展示组件。 |
| `recordAudit` | 13 | 后端审计写入中心。 |

主要架构簇：

| Cluster | members | cohesion | top nodes | T8 含义 |
|---|---:|---:|---|---|
| `src` | 52 | 0.738 | `Badge` / `humanizeOperationalLabel` / `DecisionPanel` / `AiKnowledgePanel` / `RefPills` | 前端共享组件与高复杂面板混在同文件。 |
| `server` | 49 | 0.905 | `deepSeekAiChat` / `recordAudit` / `createAgentRun` / `makeId` / `nowIso` | 后端写入、审计与 AI 轨迹相关函数集中。 |
| `server` | 42 | 0.830 | `all` / `get` / `getWorkbenchModule` / `getSourceCoverage` / `getOverview` | 后端读服务和路由 payload 集中。 |
| `src` | 34 | 0.579 | `CurrentRiskRadarPanel` / `App` / `ModuleHeader` / `useApi` / `AssetTable` | 前端工作台壳、通用表格和大面板耦合。 |
| `scripts` | 13 | 0.944 | `runViewportSmoke` / `runInteractiveSmoke` / `assertNoDocumentOverflow` | UI smoke 是 T8 行为保持门禁。 |

## 3. 本地文件行数基线

| 文件 | 行数 | T8 用途 |
|---|---:|---|
| `src/main.tsx` | 7026 | 前端巨石，T8-1 到 T8-5 分批抽取。 |
| `server/index.mjs` | 4596 | 后端巨石，T8-6 到 T8-7 分批抽取。 |
| `scripts/smoke-ui.mjs` | 468 | UI 行为保持门禁。 |
| `scripts/smoke-api.mjs` | 650 | API payload 与本地写入 smoke 门禁。 |
| `scripts/smoke-readonly.mjs` | 241 | 边界不变量只读门禁。 |

## 4. 前端锚点

| Symbol | 行号 | 类型 | T8-1 处理建议 |
|---|---:|---|---|
| `useApi` | 1049 | React data hook | 暂留或单独抽；不要与纯 UI primitives 混抽。 |
| `Badge` | 1188 | pure display | T8-1 第一候选。 |
| `DataTable` | 1227 | generic table | T8-1 第一候选，但需 snapshot DOM/className。 |
| `ModuleHeader` | 1293 | pure display | T8-1 第一候选。 |
| `WorkflowStrip` | 1310 | pure display | T8-1 第一候选。 |
| `AgentTracePanel` | 1684 | trace display | 可跟随共享组件之后单独抽取。 |
| `AssetTable` | 2112 | generic table wrapper | T8-1 或 T8-2 之间评估。 |
| `RefPills` | 2194 | pure display | T8-1 第一候选。 |
| `CurrentRiskRadarPanel` | 3499 | high-risk panel | 留到 T8-4。 |
| `AiKnowledgePanel` | 4876 | high-risk panel | 留到 T8-5。 |
| `DecisionPanel` | 6417 | high-risk panel | 留到 T8-5。 |
| `App` | 6963 | app shell | 只在对应抽取 PR 做 imports wiring。 |

## 5. 后端锚点

| Symbol | 行号 | 类型 | T8 处理建议 |
|---|---:|---|---|
| `all` | 261 | SQL helper | T8-6 前不动。 |
| `get` | 265 | SQL helper | T8-6 前不动。 |
| `run` | 283 | SQL helper | T8-6 前不动。 |
| `insert` | 287 | SQL helper | T8-6 前不动。 |
| `recordAudit` | 1170 | audit writer | T8-6 需要重点 payload parity。 |
| `getWorkbenchModules` | 1614 | module payload | T8-6 service candidate。 |
| `getWorkbenchModule` | 1806 | module detail payload | T8-6 service candidate。 |
| `getOverview` | 2701 | overview payload | T8-6 service candidate。 |
| `getRecommendationCards` | 3363 | recommendation read | T8-6 service candidate。 |
| `createRecommendationCard` | 3388 | local write workflow | T8-6/T8-7 需要 smoke:api 对齐。 |
| `reviewRecommendationCard` | 3448 | local review workflow | T8-6/T8-7 需要 smoke:api 对齐。 |
| `convertRecommendationCardToAction` | 3468 | local action-task workflow | T8-6/T8-7 需要 smoke:api 对齐。 |
| `insertDecisionLog` | 3515 | local ledger writer | T8-6/T8-7 需要 smoke:api 对齐。 |
| `localAiChat` | 3595 | local answer path | 保持 provider gate。 |
| `getKpiTree` | 4019 | KPI payload | T8-6 service candidate。 |
| `getKpiGraph` | 4059 | KPI graph payload | T8-6 service candidate。 |
| `dryRunChatbi` | 4216 | ChatBI dry run | 保持 certified metric gate。 |
| `server` route dispatcher | 4372 | HTTP dispatch | T8-7 最后抽。 |
| `insertActionTask` | 4579 | local action task writer | T8-7 前不动。 |

## 6. T8-1 第一刀边界

建议 T8-1 先做 frontend shared primitives 的行为保持抽取：

| 项 | 范围 |
|---|---|
| 允许编辑 | `src/main.tsx`、`src/shared/ui.tsx` 或等价共享组件文件。 |
| 第一批抽取 | `Badge`、`DataTable`、`ModuleHeader`、`WorkflowStrip`、`RefPills`。 |
| 暂不抽 | `useApi`、`AgentTracePanel`、任何业务 panel、任何 server 函数。 |
| 验收 | `npm run check`、`npm run build`、`npm run smoke:ui`、`npm run smoke:readonly`。 |
| 比对重点 | DOM className、横向溢出、三视口截图、console/page 事件计数。 |

这条边界的原因：它只移动纯展示组件或通用表格，不改 API path、不改本地写入、不碰业务状态机。

## 7. B7 验收脚本

B7 本身为 baseline-only，必须跑完整基线回归：

```bash
npm run check
npm run build
npm run smoke:api
npm run smoke:readonly
npm run smoke:ui
```

smoke 产生的本地 SQLite 写入必须归档后恢复，最终以恢复后的 `smoke:readonly` 作为收口证据。

## 8. 本批验收记录

| 检查项 | 结果 |
|---|---|
| codebase-memory graph schema | 814 nodes / 1874 edges |
| `src/main.tsx` 行数 | 7026 |
| `server/index.mjs` 行数 | 4596 |
| 主源码编辑 | B7 不编辑 `src/main.tsx` / `server/index.mjs` |
| SQLite 记录 | `annotation_b7_t8_baseline_package_20260627`、`decision_b7_t8_baseline_package_20260627` |
| 边界 | `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` |
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T181500-b7-t8-baseline-package/ui-smoke-artifacts/ui-smoke-2026-06-27T08-57-39-131Z/` |

## 9. 下一批建议

B8 执行 T8-1 的第一刀：只抽 `Badge`、`DataTable`、`ModuleHeader`、`WorkflowStrip`、`RefPills` 到共享 UI 文件。抽取前后都保留 `smoke:ui` 和 `smoke:readonly` 证据；如果出现 DOM 或截图偏移，直接回滚该小块。
