---
title: "B9 T8-2 Catalog Panels Extraction Draft"
date: "2026-06-27"
status: "catalog_panels_extracted"
scope: "T8-2 behavior-preserving reference and catalog panel split"
debt_ids:
  - "T8"
depends_on:
  - "17-b7-t8-baseline-package-draft-20260627.md"
  - "18-b8-t8-1-shared-ui-primitives-extraction-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B9 T8-2 Catalog 面板展示层抽取

## 1. 批次目标

B9 执行 T8-2：在 B8 已有 `src/shared/ui.tsx` 的基础上，把对象本体、标签、维度和指标 catalog 面板的展示层移出 `src/main.tsx`，保留数据获取、详情抽屉、本地台账写入和导出动作在原有位置。

本批只做行为保持式拆分，不改 API path，不改 `useApi`，不改 `DetailDrawer`，不改 `ExportButton`，不动服务端。

## 2. Codebase-Memory 依据

`codebase-memory-mcp` 当前索引项目：

| 项 | 值 |
|---|---:|
| project | `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` |
| nodes | 814 |
| edges | 1874 |

图谱显示前端仍有两个高耦合簇：一个以共享展示组件为中心，一个以 `CurrentRiskRadarPanel` / `App` / `ModuleHeader` / `useApi` / `AssetTable` 为中心。B9 选择 catalog 展示层，而非移动 `useApi` 或高风险业务面板。

`trace_path(AssetTable)` 显示其 caller 包含 `OntologyPanel`、`TagsPanel`、`DimensionsPanel`、`MetricsPanel`、`KpiTreePanel`、`LineagePanel`、`AiKnowledgePanel`。因此 B9 不搬 `AssetTable` 本身，只把四个 reference/catalog 面板的 JSX 主体抽出，并通过 `AssetTable` prop 继续复用原有详情、导出和台账行为。

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 保留 `useApi` 数据 shell；四个 catalog 面板改为调用新展示组件。 |
| `src/panels/catalogPanels.tsx` | 新增 catalog 展示组件。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新组件 | 来源 shell | 数据来源保持位置 | 说明 |
|---|---|---|---|
| `OntologyCatalogPanel` | `OntologyPanel` | `src/main.tsx` | 对象类型/实例治理 tabs 与四个 `AssetTable` 区块。 |
| `TagsCatalogPanel` | `TagsPanel` | `src/main.tsx` | 标签资产 catalog 展示。 |
| `DimensionsCatalogPanel` | `DimensionsPanel` | `src/main.tsx` | 维度资产 catalog 展示。 |
| `MetricsCatalogPanel` | `MetricsPanel` | `src/main.tsx` | 指标/指标字典搜索与资产表展示。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `useApi` / `api` | 数据 hook 与请求状态单独成批，避免和展示层混抽。 |
| `AssetTable` | 连接详情抽屉、导出和本地台账，需单独做行为对齐。 |
| `DetailDrawer` | 含本地台账写入与 360 详情加载，留到独立批次。 |
| `ExportButton` | 含本地导出 POST 链路，留到独立批次。 |
| `CurrentRiskRadarPanel` / `AiKnowledgePanel` / `DecisionPanel` | 高业务耦合面板，继续延后。 |
| `server/index.mjs` | 后端拆分留到 T8-6/T8-7。 |

## 6. 行数变化

| 文件 | B8 后 | B9 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 6699 | 6627 | -72 |
| `src/panels/catalogPanels.tsx` | 0 | 185 | +185 |
| `src/shared/ui.tsx` | 359 | 359 | 0 |

## 7. 边界不变量

| 不变量 | B9 状态 |
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
| `git diff --check -- src/main.tsx src/panels/catalogPanels.tsx` | 通过 |
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T193000-b9-t8-2-catalog-panels/ui-smoke-artifacts/ui-smoke-2026-06-27T13-04-16-275Z/` |
| SQLite smoke 写入处理 | `governance_workbench.post-smoke.sqlite` 已归档，当前库恢复到 B9 smoke 前状态后补写本批验收记录 |
| SQLite 记录 | `annotation_b9_t8_2_catalog_panels_20260627`、`decision_b9_t8_2_catalog_panels_20260627` |

## 10. 下一批建议

B10 执行 T8-3：优先抽 `EvidenceList`、`Object360List`、`LedgerList` 等详情展示原语，继续暂缓 `DetailDrawer` 的写入表单和 `ExportButton` 的本地导出链路。这样可以继续降低 `main.tsx` 的展示负载，同时不改本地写入行为。
