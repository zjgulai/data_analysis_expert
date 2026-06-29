---
title: "B11 T8-4 Knowledge Sections Extraction Draft"
date: "2026-06-27"
status: "knowledge_sections_extracted_and_smoke_verified"
scope: "T8-4 behavior-preserving knowledge detail layout split"
debt_ids:
  - "T8"
depends_on:
  - "19-b9-t8-2-catalog-panels-extraction-draft-20260627.md"
  - "20-b10-t8-3-detail-primitives-extraction-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B11 T8-4 知识详情布局抽取

## 1. 批次目标

B11 执行 T8-4 的第一半：把 `KnowledgeCardDetailSection` 与 `KnowledgeSupportSection` 从 `src/main.tsx` 移到 `src/panels/knowledgeSections.tsx`。本批只移动知识详情布局，不移动 `DetailDrawer` 的本地写入表单，不移动 `ExportButton`，不改 `useApi` / `api`，不动服务端。

## 2. Codebase-Memory 依据

B11 开工前刷新 codebase-memory 索引：

| 项 | 值 |
|---|---:|
| project | `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` |
| nodes | 831 |
| edges | 1843 |

图谱对比：

| Symbol | Callees | Callers | B11 判断 |
|---|---|---|---|
| `KnowledgeCardDetailSection` | `cellValue`、`Badge`、局部 `openCrosswalk` | `DetailDrawer` | 可抽为知识详情布局；回调保持由 `DetailDrawer` 传入。 |
| `KnowledgeSupportSection` | `Badge`、`RefPills` | `DetailDrawer` | 可抽为知识支持布局。 |
| `Object360Section` | `AgentTraceList`、`AgentRunList`、`RecommendationCardList`、`SourceCoverageList`、`Object360List` | `DetailDrawer` | 依赖更宽，留到下一批。 |
| `ObjectInstance360Section` | `AgentRunList`、`RecommendationCardList`、`SourceCoverageList`、`Object360List` | `DetailDrawer` | 依赖更宽，留到下一批。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 增加 `knowledgeSections` imports，删除本地知识详情布局定义。 |
| `src/panels/knowledgeSections.tsx` | 新增知识详情布局组件。 |
| `src/panels/detailPrimitives.tsx` | 本批不编辑。 |
| `src/panels/catalogPanels.tsx` | 本批不编辑。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/knowledgeSections.tsx` | `KnowledgeCardDetailSection` | 知识卡来源、摘要、证据块和 crosswalk 布局。 |
| `src/panels/knowledgeSections.tsx` | `KnowledgeSupportSection` | 资产关联知识卡与证据策略布局。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `Object360Section` / `ObjectInstance360Section` | 依赖运行记录、建议卡、来源覆盖等多个仍在 `main.tsx` 的布局组件。 |
| `DetailDrawer` | 含注解、评论、修订建议提交，属于本地写入 UI，单独成批。 |
| `ExportButton` | 含导出 POST 链路，单独成批。 |
| `AssetTable` | 连接详情抽屉和导出动作，需单独验收。 |
| `useApi` / `api` | 数据 hook 与请求状态后续单独处理。 |
| `server/index.mjs` | 后端拆分留到 T8-6/T8-7。 |

## 6. 行数变化

| 文件 | B10 后 | B11 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 6552 | 6414 | -138 |
| `src/panels/knowledgeSections.tsx` | 0 | 183 | +183 |
| `src/panels/detailPrimitives.tsx` | 116 | 116 | 0 |
| `src/panels/catalogPanels.tsx` | 185 | 185 | 0 |
| `src/shared/ui.tsx` | 359 | 359 | 0 |

## 7. 边界不变量

| 不变量 | B11 状态 |
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
| `git diff --check -- src/main.tsx src/panels/knowledgeSections.tsx` | 通过 |
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T214500-b11-t8-4-knowledge-sections/ui-smoke-artifacts/ui-smoke-2026-06-27T13-47-42-940Z/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T214500-b11-t8-4-knowledge-sections/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T214500-b11-t8-4-knowledge-sections/governance_workbench.post-b11-pre-smoke.sqlite` |
| SQLite 记录 | `annotation_b11_t8_4_knowledge_sections_20260627`、`decision_b11_t8_4_knowledge_sections_20260627` |

## 10. 下一批建议

B12 执行 T8-5：抽 `Object360Section` / `ObjectInstance360Section`，同时通过 props 保持 `AgentRunList`、`RecommendationCardList`、`SourceCoverageList` 等依赖在原位置；继续暂缓 `DetailDrawer` 写入表单、`ExportButton` 导出链路和 `server/index.mjs`。
