---
title: "B15 T8-8 Export Controls Extraction Draft"
date: "2026-06-28"
status: "export_controls_extracted_and_smoke_verified"
scope: "T8-8 behavior-preserving export control split"
debt_ids:
  - "T8"
depends_on:
  - "24-b14-t8-7-detail-drawer-sections-extraction-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B15 T8-8 导出控件抽取

## 1. 批次目标

B15 执行 T8-8：把 `ExportButton` 的按钮 UI、运行状态和浏览器下载触发移到 `src/panels/exportControls.tsx`。本批保留 `/api/exports` 请求函数在 `src/main.tsx`，通过 `onExport` 传入新组件；不迁移 `AssetTable`，不改 `api` / `useApi`，不动服务端。

## 2. Codebase-Memory 依据

B15 开工前刷新 codebase-memory 索引：

| 项 | 值 |
|---|---:|
| project | `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` |
| nodes | 860 |
| edges | 1885 |

图谱判断：

| Symbol | 直接依赖 | 调用方 | B15 判断 |
|---|---|---|---|
| `ExportButton` | `exportAsset` | `AssetTable`、`SourceCoverageLineageSummary`、`RuntimeMetadataProjectionPanel`、`KpiTreePanel`、`AipScenarioBoard`、`DecisionReceiptGovernance`、`DecisionPanel` | 多页面复用，适合把按钮 UI 抽为独立控件。 |
| `exportAsset` / `/api/exports` | `api`、浏览器下载触发 | `ExportButton` | API 请求留在 `main.tsx` 的 `requestExport`；新控件只接收 `onExport`。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除本地 `ExportButton` UI；新增 `requestExport`；所有导出调用传入 `onExport={requestExport}`。 |
| `src/panels/exportControls.tsx` | 新增 `ExportButton`、`ExportFormat`、`ExportJob`；只处理按钮状态与下载触发。 |
| `src/panels/detailDrawerSections.tsx` | 本批不编辑。 |
| `src/panels/agentActivityLists.tsx` | 本批不编辑。 |
| `src/panels/object360Sections.tsx` | 本批不编辑。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/exportControls.tsx` | `ExportButton` | JSON/CSV/Excel 三按钮、running 状态、下载触发。 |
| `src/panels/exportControls.tsx` | `ExportFormat` / `ExportJob` | 导出格式和导出任务返回结构。 |
| `src/main.tsx` | `requestExport` | 唯一 `/api/exports` 请求入口，继续使用本地 `api` helper。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `AssetTable` | 选择逻辑与详情抽屉仍在 `main.tsx`，后续单独按图谱处理。 |
| `api` / `useApi` | 请求 helper 与数据状态后续单独处理。 |
| `TraceReviewBoard` / `AgentTracePanel` | 证据链复盘面板仍含本地复盘动作，留到后续行为边界批次。 |
| `server/index.mjs` | 后端拆分留到后续 T8 批次。 |

## 6. 行数变化

| 文件 | B14 后 | B15 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 6090 | 6069 | -21 |
| `src/panels/exportControls.tsx` | 0 | 49 | +49 |

## 7. 边界不变量

| 不变量 | B15 状态 |
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
| `git diff --check -- src/main.tsx src/panels/exportControls.tsx` | 通过 |
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T000500-b15-t8-8-export-controls/ui-smoke-artifacts/ui-smoke-2026-06-28T00-35-29-128Z/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T000500-b15-t8-8-export-controls/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260628T000500-b15-t8-8-export-controls/governance_workbench.post-b15-pre-smoke.sqlite` |
| SQLite 记录 | `annotation_b15_t8_8_export_controls_20260628`、`decision_b15_t8_8_export_controls_20260628` |

## 10. 下一批建议

B16 继续 T8：按图谱处理 `AssetTable` 的选择壳层，保留 `DetailDrawer` 和导出控件调用边界；后端 `server/index.mjs` 继续暂缓到后端拆分批次。
