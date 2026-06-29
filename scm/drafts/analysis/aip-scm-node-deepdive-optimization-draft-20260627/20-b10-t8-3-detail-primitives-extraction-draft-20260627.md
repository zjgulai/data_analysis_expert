---
title: "B10 T8-3 Detail Primitives Extraction Draft"
date: "2026-06-27"
status: "detail_primitives_extracted"
scope: "T8-3 behavior-preserving detail display primitive split"
debt_ids:
  - "T8"
depends_on:
  - "18-b8-t8-1-shared-ui-primitives-extraction-draft-20260627.md"
  - "19-b9-t8-2-catalog-panels-extraction-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B10 T8-3 详情展示原语抽取

## 1. 批次目标

B10 执行 T8-3：把 `Object360List`、`LedgerList`、`EvidenceList` 三个只读展示原语从 `src/main.tsx` 移到 `src/panels/detailPrimitives.tsx`。本批继续保持数据获取、表单提交、本地台账写入、导出动作和服务端逻辑原样。

## 2. Codebase-Memory 依据

B10 开工前刷新 codebase-memory 索引：

| 项 | 值 |
|---|---:|
| project | `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` |
| nodes | 827 |
| edges | 1823 |

图谱结果：

| Symbol | Callees | Callers | B10 判断 |
|---|---|---|---|
| `EvidenceList` | `Badge`、`RefPills` | `OverviewAiSearch`、`AiKnowledgePanel`、`ChatBiDryRunResult` | 可抽为纯展示组件。 |
| `Object360List` | `cellValue`、`rowKey`、`Badge` | `Object360Section`、`ObjectInstance360Section` | 可抽为纯展示组件。 |
| `LedgerList` | `Badge` | `DetailDrawer` | 可抽为台账只读列表；写入表单保留在 `DetailDrawer`。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 增加 `detailPrimitives` imports，删除本地展示原语定义。 |
| `src/panels/detailPrimitives.tsx` | 新增详情展示原语。 |
| `src/panels/catalogPanels.tsx` | 本批不编辑。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/detailPrimitives.tsx` | `Object360List` | 对象 360 关联列表展示。 |
| `src/panels/detailPrimitives.tsx` | `LedgerList` | 本地治理台账只读列表展示。 |
| `src/panels/detailPrimitives.tsx` | `EvidenceList` | 知识证据卡片列表展示。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `DetailDrawer` | 含注解、评论、修订建议提交，属于本地写入 UI，单独成批。 |
| `ExportButton` | 含导出 POST 链路，单独成批。 |
| `AssetTable` | 连接详情抽屉和导出动作，需单独验收。 |
| `Object360Section` / `ObjectInstance360Section` | 含较多业务布局，先保留。 |
| `useApi` / `api` | 数据 hook 与请求状态后续单独处理。 |
| `server/index.mjs` | 后端拆分留到 T8-6/T8-7。 |

## 6. 行数变化

| 文件 | B9 后 | B10 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 6627 | 6552 | -75 |
| `src/panels/detailPrimitives.tsx` | 0 | 116 | +116 |
| `src/panels/catalogPanels.tsx` | 185 | 185 | 0 |
| `src/shared/ui.tsx` | 359 | 359 | 0 |

## 7. 边界不变量

| 不变量 | B10 状态 |
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
| `git diff --check -- src/main.tsx src/panels/detailPrimitives.tsx` | 通过 |
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T212000-b10-t8-3-detail-primitives/ui-smoke-artifacts/ui-smoke-2026-06-27T13-17-54-961Z/` |
| SQLite smoke 写入处理 | `governance_workbench.post-smoke.sqlite` 已归档，当前库恢复到 B10 smoke 前状态后补写本批验收记录 |
| SQLite 记录 | `annotation_b10_t8_3_detail_primitives_20260627`、`decision_b10_t8_3_detail_primitives_20260627` |

## 10. 下一批建议

B11 执行 T8-4：优先抽 `Object360Section` / `ObjectInstance360Section` 或 `KnowledgeCardDetailSection` / `KnowledgeSupportSection` 这类详情布局组件。继续暂缓 `DetailDrawer` 的写入表单和 `ExportButton` 的导出链路。
