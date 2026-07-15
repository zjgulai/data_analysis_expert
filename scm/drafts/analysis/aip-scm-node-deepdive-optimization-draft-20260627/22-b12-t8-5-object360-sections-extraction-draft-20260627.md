---
title: "B12 T8-5 Object360 Sections Extraction Draft"
date: "2026-06-27"
status: "object360_sections_extracted_and_smoke_verified"
scope: "T8-5 behavior-preserving Object360 layout split"
debt_ids:
  - "T8"
depends_on:
  - "20-b10-t8-3-detail-primitives-extraction-draft-20260627.md"
  - "21-b11-t8-4-knowledge-sections-extraction-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B12 T8-5 Object360 布局抽取

## 1. 批次目标

B12 执行 T8-5：把 `Object360Section` 与 `ObjectInstance360Section` 从 `src/main.tsx` 移到 `src/panels/object360Sections.tsx`。本批只移动对象 360 和实例 360 的展示布局，不移动 `DetailDrawer` 的本地写入表单，不移动 `ExportButton`，不改 `useApi` / `api`，不动服务端。

## 2. Codebase-Memory 依据

B12 开工前刷新 codebase-memory 索引：

| 项 | 值 |
|---|---:|
| project | `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` |
| nodes | 836 |
| edges | 1851 |

图谱判断：

| Symbol | 直接依赖 | 调用方 | B12 判断 |
|---|---|---|---|
| `Object360Section` | `Badge`、`Object360List`、`AgentTraceList`、`AgentRunList`、`RecommendationCardList`、`SourceCoverageList` | `DetailDrawer` | 可抽为展示布局；仍在 `main.tsx` 的列表组件通过 `renderers` 传入。 |
| `ObjectInstance360Section` | `Badge`、`humanizeOperationalLabel`、`cellValue`、`Object360List`、`AgentRunList`、`RecommendationCardList`、`SourceCoverageList` | `DetailDrawer` | 可抽为展示布局；实例属性和关系表保持原渲染结构。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 增加 `object360Sections` imports；删除本地 360 布局定义；`DetailDrawer` 调用时传入现有 renderer 组件。 |
| `src/panels/object360Sections.tsx` | 新增对象 360 和实例 360 展示布局组件。 |
| `src/panels/detailPrimitives.tsx` | 本批不编辑。 |
| `src/panels/knowledgeSections.tsx` | 本批不编辑。 |
| `src/panels/catalogPanels.tsx` | 本批不编辑。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/object360Sections.tsx` | `Object360Section` | 对象关系、标签、维度、指标、任务、来源覆盖、证据链、运行记录和建议卡布局。 |
| `src/panels/object360Sections.tsx` | `ObjectInstance360Section` | 关键对象实例、实例属性、实例关系、AIP 场景、来源覆盖、运行记录和建议卡布局。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `DetailDrawer` | 含注解、评论、修订建议提交，属于本地写入 UI，单独成批。 |
| `ExportButton` | 含导出 POST 链路，单独成批。 |
| `AssetTable` | 连接详情抽屉和导出动作，需单独验收。 |
| `AgentTraceList` / `AgentRunList` / `RecommendationCardList` / `SourceCoverageList` | 被多处页面复用，先作为 renderer 传入，后续按图谱单独整理。 |
| `useApi` / `api` | 数据 hook 与请求状态后续单独处理。 |
| `server/index.mjs` | 后端拆分留到 T8-6/T8-7。 |

## 6. 行数变化

| 文件 | B11 后 | B12 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 6414 | 6323 | -91 |
| `src/panels/object360Sections.tsx` | 0 | 308 | +308 |
| `src/panels/knowledgeSections.tsx` | 183 | 183 | 0 |
| `src/panels/detailPrimitives.tsx` | 116 | 116 | 0 |
| `src/panels/catalogPanels.tsx` | 185 | 185 | 0 |
| `src/shared/ui.tsx` | 359 | 359 | 0 |

## 7. 边界不变量

| 不变量 | B12 状态 |
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
| `git diff --check -- src/main.tsx src/panels/object360Sections.tsx` | 通过 |
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T221500-b12-t8-5-object360-sections/ui-smoke-artifacts/ui-smoke-2026-06-27T14-50-37-018Z/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T221500-b12-t8-5-object360-sections/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T221500-b12-t8-5-object360-sections/governance_workbench.post-b12-pre-smoke.sqlite` |
| SQLite 记录 | `annotation_b12_t8_5_object360_sections_20260627`、`decision_b12_t8_5_object360_sections_20260627` |

## 10. 下一批建议

B13 执行 T8-6：按图谱整理 `AgentTraceList`、`AgentRunList`、`RecommendationCardList`、`SourceCoverageList` 等复用列表组件；继续暂缓 `DetailDrawer` 写入表单、`ExportButton` 导出链路和 `server/index.mjs`。
