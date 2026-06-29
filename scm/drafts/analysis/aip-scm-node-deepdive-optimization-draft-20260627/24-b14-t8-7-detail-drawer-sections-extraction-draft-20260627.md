---
title: "B14 T8-7 Detail Drawer Sections Extraction Draft"
date: "2026-06-27"
status: "detail_drawer_sections_extracted_and_smoke_verified"
scope: "T8-7 behavior-preserving DetailDrawer UI section split"
debt_ids:
  - "T8"
depends_on:
  - "22-b12-t8-5-object360-sections-extraction-draft-20260627.md"
  - "23-b13-t8-6-agent-activity-lists-extraction-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B14 T8-7 DetailDrawer UI 分层抽取

## 1. 批次目标

B14 执行 T8-7 的第一段：把 `DetailDrawer` 内的抽屉外壳、只读资产详情、注解/评论表单、修订建议表单和治理台账列表拆到 `src/panels/detailDrawerSections.tsx`。本批只做 UI section 分层，不迁移 `submit`、`refreshLedger`、`api`、`AssetTable` 选择逻辑、`ExportButton` 导出链路或服务端。

## 2. Codebase-Memory 依据

B14 开工前刷新 codebase-memory 索引：

| 项 | 值 |
|---|---:|
| project | `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` |
| nodes | 850 |
| edges | 1828 |

图谱判断：

| Symbol | 直接依赖 | 调用方 | B14 判断 |
|---|---|---|---|
| `DetailDrawer` | `api`、`refreshLedger`、`submit`、`Object360Section`、`ObjectInstance360Section`、`KnowledgeCardDetailSection`、`KnowledgeSupportSection`、`LedgerList`、`cellValue` | `AssetTable`、`KpiTreePanel`、`AiKnowledgePanel` | 先拆纯 UI sections；状态和本地写入 submit 留在 `main.tsx`。 |
| `AssetTable` | `ExportButton`、`DetailDrawer`、`DataTable`、`rowKey` | 多个资产面板 | 直接牵连导出 POST 链路，本批只记录边界，后续单独处理。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 引入 drawer sections；`DetailDrawer` 保留状态、API 和 submit，只组合新 sections。 |
| `src/panels/detailDrawerSections.tsx` | 新增 `DetailDrawerFrame`、`AssetDetailSection`、`LedgerWriteSection`、`RevisionProposalSection`、`LedgerHistorySection`。 |
| `src/panels/detailPrimitives.tsx` | 本批不编辑，`LedgerList` 继续被新 sections 复用。 |
| `src/panels/agentActivityLists.tsx` | 本批不编辑。 |
| `src/panels/object360Sections.tsx` | 本批不编辑。 |
| `src/shared/ui.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/detailDrawerSections.tsx` | `DetailDrawerFrame` | 抽屉 overlay、header 和 close 行为。 |
| `src/panels/detailDrawerSections.tsx` | `AssetDetailSection` | 只读资产详情 grid。 |
| `src/panels/detailDrawerSections.tsx` | `LedgerWriteSection` | 注解与评论表单；提交动作由 `main.tsx` 传入。 |
| `src/panels/detailDrawerSections.tsx` | `RevisionProposalSection` | 修订建议表单；提交动作由 `main.tsx` 传入。 |
| `src/panels/detailDrawerSections.tsx` | `LedgerHistorySection` | 治理台账列表。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `AssetTable` | 仍直接包含 `ExportButton`，需要与导出链路一起单独验收。 |
| `ExportButton` | 含导出 POST 链路，单独成批。 |
| `submit` / `refreshLedger` / `api` | 本地写入状态与 API helper 不在本批移动。 |
| `TraceReviewBoard` / `AgentTracePanel` | 证据链复盘面板仍含复盘按钮，留到后续行为边界批次。 |
| `server/index.mjs` | 后端拆分留到后续 T8 批次。 |

## 6. 行数变化

| 文件 | B13 后 | B14 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 6127 | 6090 | -37 |
| `src/panels/detailDrawerSections.tsx` | 0 | 162 | +162 |

## 7. 边界不变量

| 不变量 | B14 状态 |
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
| `git diff --check -- src/main.tsx src/panels/detailDrawerSections.tsx` | 通过 |
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T233000-b14-t8-7-detail-drawer-sections/ui-smoke-artifacts/ui-smoke-2026-06-27T15-40-43-439Z/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T233000-b14-t8-7-detail-drawer-sections/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T233000-b14-t8-7-detail-drawer-sections/governance_workbench.post-b14-pre-smoke.sqlite` |
| SQLite 记录 | `annotation_b14_t8_7_detail_drawer_sections_20260627`、`decision_b14_t8_7_detail_drawer_sections_20260627` |

## 10. 下一批建议

B15 继续 T8：单独处理 `ExportButton` 与导出交互边界，随后再决定是否移动 `AssetTable`；`server/index.mjs` 继续暂缓到后端拆分批次。
