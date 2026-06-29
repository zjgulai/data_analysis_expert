---
title: "B8 T8-1 Shared UI Primitives Extraction Draft"
date: "2026-06-27"
status: "shared_ui_primitives_extracted"
scope: "T8-1 first behavior-preserving frontend split"
debt_ids:
  - "T8"
depends_on:
  - "14-b4-t8-codebase-memory-split-blueprint-draft-20260627.md"
  - "17-b7-t8-baseline-package-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B8 T8-1 共享 UI 原语抽取

## 1. 批次目标

B8 执行 T8-1 的第一刀：把 B7 已冻结的低风险共享展示组件从 `src/main.tsx` 移到 `src/shared/ui.tsx`，保持 API、业务状态机、本地写入路径和服务端逻辑不变。

本批只允许行为保持式移动，不引入新交互，不调整 DOM 语义，不接生产库，不打开 provider call，不做 ERP/OMS/WMS 写回。

## 2. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除本地共享 UI 定义，改为从 `./shared/ui` import。 |
| `src/shared/ui.tsx` | 新增共享 UI 原语与其必要格式化 helper。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 3. 抽取清单

| Symbol | 类型 | 说明 |
|---|---|---|
| `Badge` | shared display component | 状态徽标与 tone 映射的展示原语。 |
| `DataTable` | shared table component | 通用表格组件，保留空态、分页和 cell 渲染行为。 |
| `ModuleHeader` | shared display component | 模块标题、状态与边界展示。 |
| `WorkflowStrip` | shared display component | 轨迹链路的紧凑展示。 |
| `RefPills` | shared display component | 引用、证据与 ref 列表展示。 |

同步移动的 helper：

| Helper | 原因 |
|---|---|
| `columnLabels` | `DataTable` 与多个面板共用列名映射。 |
| `cellValue` | `DataTable` 单元格展示契约。 |
| `rowKey` | `DataTable` 行 key 契约。 |
| `toneFromStatus` | `Badge` / `ModuleHeader` 共用状态 tone。 |
| `humanizeOperationalLabel` | 多面板共用运维标签展示。 |
| `humanizeBoundary` | 多面板共用边界标签展示。 |
| `BadgeTone` | 保持现有类型契约。 |

## 4. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `useApi` | 数据 hook 与请求状态相关，单独拆分更容易验收。 |
| `AgentTracePanel` | 轨迹展示面板有业务上下文，留到后续批次。 |
| 业务 panels | 不与 shared primitives 混抽，降低回归面。 |
| `server/index.mjs` | 后端拆分留到 T8-6/T8-7，需更强 payload parity 证据。 |

## 5. 行数变化

| 文件 | B7 基线 | B8 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 7026 | 6699 | -327 |
| `src/shared/ui.tsx` | 0 | 359 | +359 |

总行数增加来自新文件 import/export、局部类型声明和共享 helper 自包含；业务逻辑未扩展。

## 6. 边界不变量

| 不变量 | B8 状态 |
|---|---|
| `productionWrites` | `false` |
| `providerCalls` | `false` |
| `erpWriteback` | `false` |
| action ceiling | `suggestion_review_replay` |
| 唯一写目标 | 本地 `data/governance_workbench.sqlite` |
| 密钥扫描 | `find ... -name '*.pem'` 输出为空 |

## 7. 回归脚本

```bash
npm run check
npm run build
npm run smoke:api
npm run smoke:readonly
npm run smoke:ui
```

smoke 产生的本地 SQLite 变化必须归档后恢复，最终以恢复后的 `smoke:readonly` 作为收口证据。

## 8. 本批验收记录

| 检查项 | 结果 |
|---|---|
| `git diff --check -- src/main.tsx src/shared/ui.tsx` | 通过 |
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T182500-b8-t8-1-shared-ui-primitives/ui-smoke-artifacts/ui-smoke-2026-06-27T09-22-42-301Z/` |
| SQLite smoke 写入处理 | `governance_workbench.post-smoke.sqlite` 已归档，当前库恢复到 B8 smoke 前状态后补写本批验收记录 |
| SQLite 记录 | `annotation_b8_t8_1_shared_ui_primitives_20260627`、`decision_b8_t8_1_shared_ui_primitives_20260627` |

## 9. 下一批建议

B9 执行 T8-2：在 `src/main.tsx` 已经引入 `src/shared/ui.tsx` 的前提下，优先抽取低风险 reference / catalog 类面板。候选顺序建议为标签、维度、指标或本体引用面板；继续延后 `useApi`、高风险 AI 面板和服务端拆分。
