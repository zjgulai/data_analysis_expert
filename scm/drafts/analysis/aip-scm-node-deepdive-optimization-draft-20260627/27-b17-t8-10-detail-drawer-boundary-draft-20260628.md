---
title: "B17 T8-10 DetailDrawer Boundary Draft"
date: "2026-06-28"
status: "detail_drawer_boundary_extracted_and_smoke_verified"
scope: "T8-10 behavior-preserving detail drawer boundary split"
debt_ids:
  - "T8"
depends_on:
  - "26-b16-t8-9-asset-table-extraction-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B17 T8-10 DetailDrawer 边界拆分

## 1. 批次目标

B17 执行 T8-10：把 `DetailDrawer` 主体移到 `src/panels/detailDrawer.tsx`，并在该文件内显式拆出只读展示、ledger 写入、revision proposal 三个边界。`main.tsx` 只保留 `BoundDetailDrawer`，向抽屉注入本地 `api` helper；不改服务端，不新增外部调用。

## 2. Codebase-Memory 依据

B17 开工前和抽取后均刷新 codebase-memory：

| 阶段 | nodes | edges |
|---|---:|---:|
| 开工前 | 870 | 1910 |
| 抽取后 | 878 | 1930 |

抽取后图谱判断：

| Symbol | 直接依赖 | 调用方 | B17 判断 |
|---|---|---|---|
| `DetailDrawer` | `DetailReadOnlySections`、`DetailLedgerWriteBoundary`、`DetailRevisionProposalBoundary`、`DetailDrawerFrame`、`LedgerHistorySection`、注入的 `api` | `BoundDetailDrawer` | 抽屉主体已离开 `main.tsx`，但 API 注入仍由 `main.tsx` 控制。 |
| `DetailReadOnlySections` | `AssetDetailSection`、`Object360Section`、`ObjectInstance360Section`、`KnowledgeCardDetailSection`、`KnowledgeSupportSection` | `DetailDrawer` | 只读展示边界独立，不承载写入按钮。 |
| `DetailLedgerWriteBoundary` | `LedgerWriteSection` | `DetailDrawer` | 注解/评论写入 UI 独立。 |
| `DetailRevisionProposalBoundary` | `RevisionProposalSection` | `DetailDrawer` | 修订建议 UI 独立。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除本地 `DetailDrawer` 主体；新增 `BoundDetailDrawer`；直接抽屉调用改为绑定组件。 |
| `src/panels/detailDrawer.tsx` | 新增 `DetailDrawer` 与三个边界组件。 |
| `src/panels/assetTable.tsx` | 本批不编辑；继续通过 `DetailDrawerComponent` 注入。 |
| `src/panels/detailDrawerSections.tsx` | 本批不编辑；继续作为 UI section 库。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/detailDrawer.tsx` | `DetailDrawer` | 抽屉主体、详情加载、ledger 刷新、提交后刷新本地 ledger。 |
| `src/panels/detailDrawer.tsx` | `DetailReadOnlySections` | 资产详情、Object 360、Object Instance 360、知识卡详情与知识支持。 |
| `src/panels/detailDrawer.tsx` | `DetailLedgerWriteBoundary` | 注解与评论写入 UI。 |
| `src/panels/detailDrawer.tsx` | `DetailRevisionProposalBoundary` | 修订建议写入 UI。 |
| `src/main.tsx` | `BoundDetailDrawer` | 注入本地 `api` helper，避免新文件直接依赖 `main.tsx`。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `api` / `useApi` | 请求 helper 与数据状态后续单独处理。 |
| `TraceReviewBoard` / `AgentTracePanel` | 证据链复盘动作留到后续行为边界批次。 |
| `DecisionPanel` | 建议卡、行动任务、owner 决策仍是更大动作面，后续拆。 |
| `server/index.mjs` | 后端拆分留到后续 T8 批次。 |

## 6. 行数变化

| 文件 | B16 后 | B17 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 6022 | 5813 | -209 |
| `src/panels/detailDrawer.tsx` | 0 | 227 | +227 |

## 7. 边界不变量

| 不变量 | B17 状态 |
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
| `npm run build` | 通过；38 modules transformed；JS 产物 `index-Blv39rZH.js` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T021000-b17-t8-10-detail-drawer-boundary/ui-smoke-artifacts/ui-smoke-2026-06-28T01-49-22-829Z/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T021000-b17-t8-10-detail-drawer-boundary/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T021000-b17-t8-10-detail-drawer-boundary/governance_workbench.post-b17-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T021000-b17-t8-10-detail-drawer-boundary/governance_workbench.final-restored.sqlite` |
| SQLite 记录 | `annotation_b17_t8_10_detail_drawer_20260628`、`decision_b17_t8_10_detail_drawer_20260628` |

## 10. 下一批建议

B18 继续 T8：处理 `TraceReviewBoard` / `AgentTracePanel` 的证据链复盘动作边界，把只读证据链展示、人工复盘写入和运行记录列表拆开；后端继续暂缓。
