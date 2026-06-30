---
title: "SCM Lineage Quality Second Pass Page Proof"
doc_type: execution_evidence
module: scm
topic: "lineage-quality-second-pass-page-proof"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "UI page-proof only; CSS scope only; no server change; no SQLite mutation in committed diff; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-overview-page-proof-20260630"
evidence_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-lineage-quality-second-pass-after-20260630.json"
---

# SCM Lineage Quality Second Pass Page Proof

## 1. 结论先行

B61 在 B60 `00 overview` 页面 proof 之后，回到 after-baseline 最大页 `07 lineage-quality` 做二次收敛。本批不改 `main.tsx`，复用 B58 已有的 `lineageQualityWorkbench` 页面级 scope，只在该 scope 下压缩内部滚动上限、panel padding、workflow strip 密度和 runtime boundary chips 高度。

事实：

- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/styles.css`
- 新增 after 证据 JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-lineage-quality-second-pass-after-20260630.json`
- 截图文件保存在本机 file-history：`/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b61-lineage-quality-second-pass/ui-baseline-after/screenshots/`
- 模块数量：`15`
- 截图数量：`15`
- 视口：`desktop-1440`（1440 x 900）
- 非只读请求计数：`0`
- 浏览器控制台红项：`0`
- 页面异常计数：`0`
- 最大横向溢出：`0`
- 全局最大页面高度比：`4.61 -> 3.78`
- `07 lineage-quality` heightRatio：`4.61 -> 3.78`

推断：

- B60 后 `07` 的剩余长页主要来自两个 `sourceLineageGrid`、三个直接 `assetSurface` 表格、`runtimeBusinessGrid`、`runtimeBusinessBoundary` 和底部 split 表格区。
- 因为 `LineagePanel` 已有页面级 scope，本批无需再修改 TSX，也无需触碰 API/server。

不确定项：

- 本批没有重构 `RuntimeBusinessRowDesignGatePanel` 的信息架构，也没有改变任何 owner choice 按钮行为。
- after-baseline 显示当前全局最高页仍是 `07 lineage-quality`，但已低于 4；若继续追求整体密度，下一批更适合转向 `R1 current-risk-radar` 的二次 proof。

## 2. 代码图谱依据

`codebase-memory-mcp` 显示：

- `LineagePanel` 属于前端 `src` cluster。
- 唯一调用方为 `App`。
- 直接下游为 `ModuleHeader`、`WorkflowStrip`、`useApi`、`BoundAssetTable`、`SourceCoverageLineageSummary`、`RuntimeMetadataProjectionPanel`、`RuntimeBusinessRowDesignGatePanel`。
- server cluster 独立，页面长页 proof 不需要触碰 `server/index.mjs`。

因此本批只修改 `styles.css` 中既有 `.lineageQualityWorkbench` scope，不改组件行为。

## 3. 长页来源测量

B60 状态下，`07 lineage-quality` DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `lineageRoot` | 4024 | 4022 | 页面主体 |
| `moduleHeader` | 97 | 96 | 模块头 |
| `workflowStrip` | 74 | 72 | 5 步流程条 |
| `sourceLineageGrid[0]` | 300 | 441 | Source Coverage 卡片区 |
| `sourceLineageGrid[1]` | 300 | 374 | Runtime Metadata 对象统计 |
| `runtimeBusinessGrid` | 414 | 896 | 设计包卡片区 |
| `runtimeBusinessTables` | 344 | 344 | allowlist/excluded 预览表 |
| `splitTables` | 468 | 468 | 血缘边 + 治理任务 |
| `assetSurface[0..2]` | 427 each | 425 each | 三个直接表格面板 |
| `tableWrap` | 300 each | 459-995 | 表格内部滚动 |

B61 后，DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `lineageRoot` | 3277 | 3275 | 页面主体收敛 |
| `sourceLineageGrid[0]` | 216 | 441 | 内部滚动 |
| `sourceLineageGrid[1]` | 216 | 374 | 内部滚动 |
| `runtimeBusinessBoundary` | 72 | 100 | boundary chips 内部滚动 |
| `runtimeBusinessGrid` | 288 | 896 | 设计包卡片区内部滚动 |
| `runtimeBusinessTables` | 260 | 260 | 表格预览收敛 |
| `splitTables` | 384 | 384 | 底部 split 收敛 |
| `assetSurface[0..2]` | 339 each | 337 each | 三个直接表格面板收敛 |
| `tableWrap` | 216 each | 459-995 | 表格内部滚动 |

## 4. 实际改动

`styles.css`：

- `.lineageQualityWorkbench` 根 panel padding 从默认 16px 收敛到 12px。
- `.lineageQualityWorkbench .moduleHeader`、`.workflowStrip`、`.workflowStep` 做局部 margin/padding/gap 收敛。
- `.lineageQualityWorkbench .sourceLineageSurface`、`.runtimeBusinessGatePanel`、直接子 `.assetSurface` 做局部 padding 收敛。
- `.lineageQualityWorkbench .sourceLineageGrid` 从最高 300px 收敛到约 216px。
- `.lineageQualityWorkbench .runtimeBusinessGrid` 从约 414px 收敛到约 288px。
- `.lineageQualityWorkbench .runtimeBusinessBoundary` 增加内部滚动，避免 boundary chips 拉高页面。
- `.lineageQualityWorkbench .tableWrap` 从最高 300px 收敛到约 216px。

明确未改：

- 未修改 `main.tsx`
- 未修改 `server/index.mjs`
- 未修改 `data/governance_workbench.sqlite`
- 未修改 API payload
- 未接入 provider
- 未写生产库
- 未触发 ERP/WMS/TMS writeback

## 5. Page Delta

| Code | Module ID | B60 Height Ratio | B61 Height Ratio | Delta | Overflow X |
|---|---|---:|---:|---:|---:|
| 07 | `lineage-quality` | 4.61 | 3.78 | -0.83 | 0 |
| R1 | `current-risk-radar` | 3.56 | 3.56 | 0.00 | 0 |
| S1 | `strategy-panorama` | 2.92 | 2.92 | 0.00 | 0 |
| 00 | `overview` | 2.90 | 2.90 | 0.00 | 0 |
| 08 | `ai-knowledge` | 2.87 | 2.87 | 0.00 | 0 |
| 10 | `decision-loop` | 2.40 | 2.40 | 0.00 | 0 |
| R2 | `role-workbenches` | 1.80 | 1.80 | 0.00 | 0 |
| 06 | `kpi-system` | 1.27 | 1.27 | 0.00 | 0 |

## 6. 回归脚本

本批 after-baseline：

```bash
PORT=5200 \
SCM_WORKBENCH_BASE_URL="http://127.0.0.1:5200" \
SCM_UI_BASELINE_OUTPUT_DIR="/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b61-lineage-quality-second-pass/ui-baseline-after" \
SCM_UI_BASELINE_SUMMARY_PATH="tmp/outputs/scm-lineage-quality-second-pass-after-20260630.json" \
npm run audit:ui-baseline
```

本批完整验收脚本：

```bash
find . -name '*.pem' -print
node --check scripts/audit-ui-baseline.mjs
git diff --check
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="/Users/pray/.config/superpowers/worktrees/ecom_ana_overview/scm-readonly-rc-minimal-20260629" npm run preprod:check
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
- `audit:ui-baseline` 通过；`moduleCount=15`、`screenshotCount=15`、`maxOverflowX=0`、`maxHeightRatio=3.78`。
- `preprod:check` hard blockers 为空；manual gates 仍为 `manual-p0-owner-signoffs`、`manual-p0-field-mappings`、`manual-scei-weight-source`。
- `smoke:api` 通过；DeepSeek missing-key gate 返回 `503` 且 `providerCallAttempted=false`。
- `smoke:ui` 通过；所有桌面视口与交互检查 `overflow=0`，但该脚本按预期 `localSqliteWrites=true`。
- 已用 smoke 前快照恢复 `data/governance_workbench.sqlite`，最终 `smoke:readonly` 通过且 `localSqliteWrites=false`。

## 7. 下一批建议

B62 推荐转向 `R1 current-risk-radar` 二次 page proof：

1. 复测 B61 后 `R1 current-risk-radar` 的长页来源。
2. 不扩大到 server 或 API，继续通过页面级 scope 和内部滚动收敛。
3. 目标是把当前 `heightRatio=3.56` 继续降到约 3.0。
4. 保持边界：`productionWrites=false / providerCalls=false / erpWriteback=false`，DeepSeek 仍保持 missing-key gate 或显式授权后再变更。
