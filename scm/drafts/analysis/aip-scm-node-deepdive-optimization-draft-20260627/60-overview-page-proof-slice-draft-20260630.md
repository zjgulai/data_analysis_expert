---
title: "SCM Overview Page Proof Slice"
doc_type: execution_evidence
module: scm
topic: "overview-page-proof-slice"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "UI page-proof only; no server change; no SQLite mutation in committed diff; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-ai-knowledge-page-proof-20260630"
evidence_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-overview-page-proof-after-20260630.json"
---

# SCM Overview Page Proof Slice

## 1. 结论先行

B60 在 B59 `08 ai-knowledge` 页面 proof 之后，完成 `00 治理链路总览` 的页面级长页 proof slice。本批只给 `OverviewPanel` 根节点增加页面级 class，并在该 scope 下收敛任务中心、工作台地图和治理成熟度扫描，不改导航行为、不改数据接口、不改 server。

事实：

- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/main.tsx`
- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/styles.css`
- 新增 after 证据 JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-overview-page-proof-after-20260630.json`
- 2026-06-30 历史截图位于仓库外，不作为当前合并的可复核证据；当前 head 的 canonical 截图与 SHA-256 摘要位于 `drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/ui-proof-screenshots-20260716/`。
- 模块数量：`15`
- 截图数量：`15`
- 视口：`desktop-1440`（1440 x 900）
- 非只读请求：`0`
- console errors：`0`
- page errors：`0`
- 最大横向溢出：`0`
- 全局最大页面高度比：`4.61 -> 4.61`
- `00 overview` heightRatio：`4.01 -> 2.90`

推断：

- `00` 的长页瓶颈主要来自 `ModuleGrid`、`CommandCenterQueues` 和 `readinessGrid`。
- 给 `OverviewPanel` 增加页面级 class 后，CSS 可以精准作用于总览页，不影响风险雷达、血缘质量、AI 知识库或决策闭环页面。

不确定项：

- 本批没有重新设计总览信息架构，也没有改变模块导航点击行为。
- after-baseline 显示当前全局最高页仍为 `07 lineage-quality`，其 `heightRatio=4.61`；若继续按最高页优先，B61 应回到 `07` 二次收敛。

## 2. 代码图谱依据

`codebase-memory-mcp` 显示：

- `OverviewPanel` 属于前端 `src` cluster。
- 唯一调用方为 `App`。
- 下游组件为 `MissionHero`、`OverviewAiSearch`、`CommandCenterQueues`、`ArchitectureRail`、`ModuleGrid`、`Badge`、`ScoreLine`。
- server cluster 独立，页面长页 proof 不需要触碰 `server/index.mjs`。

因此本批只给 `OverviewPanel` 根节点增加 `overviewWorkbench` class，并在该 scope 下做 CSS page proof。

## 3. 长页来源测量

B59 状态下，`00 overview` DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `missionHero` | 337 | 335 | 首屏总览 hero |
| `overviewAiPanel` | 288 | 286 | AI 搜索对话入口 |
| `commandCenterPanel` | 778 | 776 | 任务中心 4 卡片完全展开 |
| `commandCenterGrid` | 631 | 631 | 队列卡片由最长建议卡/对象卡拉高 |
| `ModuleGrid` panel | 1109 | 1107 | 14 个模块卡片完全展开 |
| `moduleGrid` | 1014 | 1014 | 3 列模块卡片列表 |
| `Readiness` panel | 742 | 740 | 成熟度扫描完全展开 |
| `readinessGrid` | 647 | 647 | 11 个成熟度项完全展开 |

B60 后，DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `missionHero` | 337 | 335 | 未改 |
| `overviewAiPanel` | 284 | 282 | panel padding scoped 收敛 |
| `commandCenterPanel` | 567 | 565 | 任务中心收敛 |
| `commandCenterGrid` | 425 | 425 | 队列列表内部滚动 |
| `ModuleGrid` panel | 613 | 611 | 工作台地图收敛 |
| `moduleGrid` | 522 | 928 | 模块卡片列表内部滚动 |
| `Readiness` panel | 451 | 449 | 成熟度扫描收敛 |
| `readinessGrid` | 360 | 623 | readiness grid 内部滚动 |

关键内部滚动区：

- `.queueList`: `250px` viewport，scrollHeight `335-547`
- `.queueList.compact`: `225px` viewport，scrollHeight `446`
- `.miniBarList`: `250px` viewport，scrollHeight `299`
- `.riskInstanceStrip`: `86px` viewport，scrollHeight `101`
- `.moduleGrid`: `522px` viewport，scrollHeight `928`
- `.readinessGrid`: `360px` viewport，scrollHeight `623`

## 4. 实际改动

`main.tsx`：

- `OverviewPanel` 根节点从 `className="stack"` 改为 `className="stack overviewWorkbench"`。
- 未改变 `onSelect`、模块导航、API path、state、按钮行为或任何 mutation 逻辑。

`styles.css`：

- `.overviewWorkbench .commandCenterPanel` 和直接子 `.panel` 收敛 padding。
- `.overviewWorkbench .queueList`、`.miniBarList`、`.riskInstanceStrip` 设置局部 `max-height` 与 `overflow:auto`。
- `.overviewWorkbench .moduleGrid` 设置局部 `max-height` 与 `overflow:auto`。
- `.overviewWorkbench .readinessGrid` 设置局部 `max-height` 与 `overflow:auto`。
- `.overviewWorkbench .moduleCard`、`.readinessItem` 做局部 padding/gap/min-height 收敛。

明确未改：

- 未修改 `server/index.mjs`
- 未修改 `data/governance_workbench.sqlite`
- 未修改 API payload
- 未接入 provider
- 未写生产库
- 未触发 ERP/WMS/TMS writeback

## 5. Page Delta

| Code | Module ID | B59 Height Ratio | B60 Height Ratio | Delta | Overflow X |
|---|---|---:|---:|---:|---:|
| 00 | `overview` | 4.01 | 2.90 | -1.11 | 0 |
| 07 | `lineage-quality` | 4.61 | 4.61 | 0.00 | 0 |
| R1 | `current-risk-radar` | 3.56 | 3.56 | 0.00 | 0 |
| S1 | `strategy-panorama` | 2.92 | 2.92 | 0.00 | 0 |
| 08 | `ai-knowledge` | 2.87 | 2.87 | 0.00 | 0 |
| 10 | `decision-loop` | 2.40 | 2.40 | 0.00 | 0 |
| R2 | `role-workbenches` | 1.80 | 1.80 | 0.00 | 0 |
| 06 | `kpi-system` | 1.27 | 1.27 | 0.00 | 0 |
| 01 | `ontology` | 1.24 | 1.24 | 0.00 | 0 |
| 04 | `metric-engineering` | 1.18 | 1.18 | 0.00 | 0 |
| 05 | `metric-dictionary` | 1.18 | 1.18 | 0.00 | 0 |
| 02 | `tags` | 1.12 | 1.12 | 0.00 | 0 |
| F1 | `fulfillment-dashboard` | 1.08 | 1.08 | 0.00 | 0 |
| 03 | `dimensions` | 1.00 | 1.00 | 0.00 | 0 |
| 09 | `chatbi` | 1.00 | 1.00 | 0.00 | 0 |

## 6. 回归脚本

本批 after-baseline：

```bash
PORT=5200 \
SCM_WORKBENCH_BASE_URL="http://127.0.0.1:5200" \
SCM_UI_BASELINE_OUTPUT_DIR="tmp/outputs/ui-proof-screenshots-20260716" \
npm run audit:ui-baseline
```

本批完整验收已执行：

```bash
find . -name '*.pem' -print
node --check scripts/audit-ui-baseline.mjs
git diff --check
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="${SCM_REPO_ROOT:?set SCM_REPO_ROOT}/scm" npm run preprod:check
npm run smoke:api
npm run smoke:ui
npm run smoke:readonly
```

验收事实：

- `find . -name '*.pem' -print` 结果为空。
- `node --check scripts/audit-ui-baseline.mjs` 通过。
- `git diff --check` 通过。
- `npm run check` 通过。
- `npm run build` 通过。
- `preprod:check` hard blockers 为空；manual gates 仍为 `manual-p0-owner-signoffs`、`manual-p0-field-mappings`、`manual-scei-weight-source`。
- `smoke:api` 通过；DeepSeek missing-key gate 返回 `503` 且 `providerCallAttempted=false`。
- `smoke:ui` 通过；所有桌面视口与交互检查 `overflow=0`，但该脚本按预期 `localSqliteWrites=true`。
- 已用 smoke 前快照恢复 `data/governance_workbench.sqlite`，最终 `smoke:readonly` 通过且 `localSqliteWrites=false`。

## 7. 下一批建议

B61 推荐严格按 after-baseline 最大值回到 `07 lineage-quality` 二次 page proof：

1. 复测 B60 后 `07 lineage-quality` 的长页来源。
2. 不扩大到 server 或 API，继续通过页面级 scope 和内部滚动收敛。
3. 目标是把当前 `heightRatio=4.61` 降到 4 以下。
4. 保持边界：`productionWrites=false / providerCalls=false / erpWriteback=false`，DeepSeek 仍保持 missing-key gate 或显式授权后再变更。
