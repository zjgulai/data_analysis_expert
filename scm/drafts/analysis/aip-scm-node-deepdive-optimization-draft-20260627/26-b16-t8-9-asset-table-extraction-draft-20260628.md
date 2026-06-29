---
title: "B16 T8-9 AssetTable Extraction Draft"
date: "2026-06-28"
status: "asset_table_extracted_and_smoke_verified"
scope: "T8-9 behavior-preserving asset table shell split"
debt_ids:
  - "T8"
depends_on:
  - "25-b15-t8-8-export-controls-extraction-draft-20260628.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B16 T8-9 AssetTable 壳层抽取

## 1. 批次目标

B16 执行 T8-9：把 `AssetTable` 的表格壳层、行选择状态、详情抽屉打开逻辑移到 `src/panels/assetTable.tsx`。本批保留 `DetailDrawer`、`requestExport`、`api`、`useApi` 和服务端在 `src/main.tsx` / `server/index.mjs` 的既有边界，通过 `BoundAssetTable` 注入。

## 2. Codebase-Memory 依据

B16 开工前和抽取后均刷新 codebase-memory：

| 阶段 | nodes | edges |
|---|---:|---:|
| 开工前 | 865 | 1897 |
| 抽取后 | 870 | 1910 |

抽取后图谱判断：

| Symbol | 直接依赖 | 调用方 | B16 判断 |
|---|---|---|---|
| `AssetTable` | `rowKey`、`DataTable`、`ExportButton` | `BoundAssetTable` | 表格壳层已可独立维护。 |
| `BoundAssetTable` | `AssetTable`、`DetailDrawer`、`requestExport` | `RuntimeMetadataProjectionPanel`、`KpiTreePanel`、`LineagePanel`、`AiKnowledgePanel` 等 | 作为注入层保留在 `main.tsx`，避免新文件反向依赖 `main.tsx`。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除本地 `AssetTable` 实现；新增 `BoundAssetTable`；调用点改为使用绑定后的表格组件。 |
| `src/panels/assetTable.tsx` | 新增 `AssetTable`、`AssetTableProps`、`AssetDetailDrawerProps`。 |
| `src/panels/catalogPanels.tsx` | 本批不编辑；继续通过 `CatalogAssetTableProps` 注入表格组件。 |
| `src/panels/exportControls.tsx` | 本批不编辑；作为 `AssetTable` 的导出按钮依赖。 |
| `src/panels/detailDrawerSections.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/assetTable.tsx` | `AssetTable` | 行选择、表格渲染、抽屉打开、导出按钮壳层。 |
| `src/panels/assetTable.tsx` | `AssetDetailDrawerProps` | 抽屉组件注入契约。 |
| `src/main.tsx` | `BoundAssetTable` | 绑定 `DetailDrawer` 与 `requestExport`，防止循环依赖。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `DetailDrawer` | 仍承载 ledger 写入、修订建议、对象 360 与知识卡详情，后续单独按图谱处理。 |
| `api` / `useApi` | 请求 helper 与数据状态后续单独拆分。 |
| `TraceReviewBoard` / `AgentTracePanel` | 证据链复盘动作边界仍留到后续行为批次。 |
| `server/index.mjs` | 后端拆分留到后续 T8 批次。 |

## 6. 行数变化

| 文件 | B15 后 | B16 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 6069 | 6022 | -47 |
| `src/panels/assetTable.tsx` | 0 | 70 | +70 |

## 7. 边界不变量

| 不变量 | B16 状态 |
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
| `npm run build` | 通过；37 modules transformed；JS 产物 `index-CGxQiEsj.js` |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T011500-b16-t8-9-asset-table/ui-smoke-artifacts/ui-smoke-2026-06-28T01-23-20-753Z/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T011500-b16-t8-9-asset-table/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T011500-b16-t8-9-asset-table/governance_workbench.post-b16-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T011500-b16-t8-9-asset-table/governance_workbench.final-restored.sqlite` |
| SQLite 记录 | `annotation_b16_t8_9_asset_table_20260628`、`decision_b16_t8_9_asset_table_20260628` |

## 10. 下一批建议

B17 继续 T8：处理 `DetailDrawer` 与 ledger 写入区域的更细边界，把只读展示、ledger 写入和修订建议分开；后端 `server/index.mjs` 继续暂缓到后端拆分批次。
