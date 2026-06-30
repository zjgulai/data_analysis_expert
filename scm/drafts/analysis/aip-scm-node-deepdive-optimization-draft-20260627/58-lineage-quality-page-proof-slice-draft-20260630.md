---
title: "SCM Lineage Quality Page Proof Slice"
doc_type: execution_evidence
module: scm
topic: "lineage-quality-page-proof-slice"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "UI page-proof only; no server change; no SQLite mutation in committed diff; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-risk-radar-page-proof-20260630"
evidence_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-lineage-quality-page-proof-after-20260630.json"
---

# SCM Lineage Quality Page Proof Slice

## 1. 结论先行

B58 在 B57 风险雷达页面 proof 之后，完成 `07 血缘与质量工作台` 的页面级长页 proof slice。改动以 `LineagePanel` 页面级 class 为边界，只收敛血缘/运行时门禁页面的长卡片组和长表格，不改 API payload、不改 server、不写 SQLite。

事实：

- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/main.tsx`
- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/styles.css`
- 新增 after 证据 JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-lineage-quality-page-proof-after-20260630.json`
- 截图文件保存在本机 file-history：`/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b58-lineage-quality-page-proof/ui-baseline-after/screenshots/`
- 模块数量：`15`
- 截图数量：`15`
- 视口：`desktop-1440`（1440 x 900）
- 非只读请求：`0`
- console errors：`0`
- page errors：`0`
- 最大横向溢出：`0`
- 全局最大页面高度比：`6.60 -> 4.93`
- `07 lineage-quality` heightRatio：`6.60 -> 4.61`

推断：

- `07` 的长页瓶颈主要来自运行时业务行设计门禁、Source Coverage lineage 卡片组、多个 `BoundAssetTable` 长表格。
- 给 `LineagePanel` 增加页面级 class 后，CSS 可以精准作用于该页，不影响 KPI、风险雷达或其它模块。

不确定项：

- 本批没有重新设计血缘信息架构，只证明长页可通过局部滚动和页面级 scope 收敛。
- after-baseline 显示当前最高长页变为 `08 ai-knowledge`，其 `heightRatio=4.93`；它应作为下一批候选，而不是在本批扩大范围。

## 2. 代码图谱依据

`codebase-memory-mcp` 显示：

- `LineagePanel` 属于前端 `src` cluster。
- 唯一调用方为 `App`。
- 下游组件为 `BoundAssetTable`、`ModuleHeader`、`RuntimeBusinessRowDesignGatePanel`、`RuntimeMetadataProjectionPanel`、`SourceCoverageLineageSummary`、`WorkflowStrip`、`useApi`。
- server cluster 独立，页面长页 proof 不需要触碰 `server/index.mjs`。

因此本批只给 `LineagePanel` 根节点增加 `lineageQualityWorkbench` class，并在该 scope 下做 CSS page proof。

## 3. 长页来源测量

B57 状态下，`07 lineage-quality` DOM 高度测量：

| Section | Height | 说明 |
|---|---:|---|
| `Source Coverage Lineage` surface | 666 | Source coverage 卡片组完整展开 |
| `Runtime Metadata Projection` surface | 597 | allowlist/excluded 汇总卡完整展开 |
| `Runtime Metadata Projection Allowlist` table | 647 | 长表格默认 520px |
| `Excluded Sensitive Identifier Fields` table | 589 | 长表格默认展开 |
| `Runtime Business Row Design Gate` | 1716 | review packet 卡片组 + 两个 preview table |
| `血缘边/治理任务 split` | 688 | 两个长表格并排 |
| `Source Coverage Export/API Lineage` table | 647 | 长表格默认 520px |

B58 后，DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `Source Coverage Lineage` surface | 500 | 498 | 卡片组内部滚动 |
| `Runtime Metadata Projection` surface | 500 | 498 | 卡片组内部滚动 |
| `Runtime Metadata Projection Allowlist` table | 427 | 425 | tableWrap 内部滚动 |
| `Excluded Sensitive Identifier Fields` table | 427 | 425 | tableWrap 内部滚动 |
| `Runtime Business Row Design Gate` | 1014 | 1014 | review packet 卡片组和 preview table 内部滚动 |
| `血缘边/治理任务 split` | 468 | 468 | split 内 tableWrap 收敛 |
| `Source Coverage Export/API Lineage` table | 427 | 425 | tableWrap 内部滚动 |

关键内部滚动区：

- `.sourceLineageGrid`: `300px` viewport，scrollHeight `374-441`
- `.runtimeBusinessGrid`: `414px` viewport，scrollHeight `896`
- `.tableWrap`: `300px` viewport，scrollHeight `459-995`

## 4. 实际改动

`main.tsx`：

- `LineagePanel` 根节点从 `className="panel"` 改为 `className="panel lineageQualityWorkbench"`。
- 未改变 hooks、API path、state、render 分支或按钮行为。

`styles.css`：

- `.lineageQualityWorkbench .sourceLineageGrid` 设置局部 `max-height` 与 `overflow:auto`。
- `.lineageQualityWorkbench .runtimeBusinessGrid` 设置局部 `max-height` 与 `overflow:auto`。
- `.lineageQualityWorkbench .runtimeBusinessTables`、`.lineageQualityWorkbench > .split` 设置 `align-items:start`。
- `.lineageQualityWorkbench .tableWrap` 在该页内从通用 `520px` 收敛为 `300px` 内部滚动。
- `.lineageQualityWorkbench .sourceLineageCard`、`.lineageQualityWorkbench .runtimeBusinessCard`、stats card 只做局部 padding/gap 收敛。

明确未改：

- 未修改 `server/index.mjs`
- 未修改 `data/governance_workbench.sqlite`
- 未修改 API payload
- 未接入 provider
- 未写生产库
- 未触发 ERP/WMS/TMS writeback

## 5. Page Delta

| Code | Module ID | B57 Height Ratio | B58 Height Ratio | Delta | Overflow X |
|---|---|---:|---:|---:|---:|
| 07 | `lineage-quality` | 6.60 | 4.61 | -1.99 | 0 |
| 00 | `overview` | 4.01 | 4.01 | 0.00 | 0 |
| S1 | `strategy-panorama` | 2.92 | 2.92 | 0.00 | 0 |
| R1 | `current-risk-radar` | 3.56 | 3.56 | 0.00 | 0 |
| R2 | `role-workbenches` | 1.80 | 1.80 | 0.00 | 0 |
| F1 | `fulfillment-dashboard` | 1.08 | 1.08 | 0.00 | 0 |
| 01 | `ontology` | 1.24 | 1.24 | 0.00 | 0 |
| 02 | `tags` | 1.12 | 1.12 | 0.00 | 0 |
| 03 | `dimensions` | 1.00 | 1.00 | 0.00 | 0 |
| 04 | `metric-engineering` | 1.18 | 1.18 | 0.00 | 0 |
| 05 | `metric-dictionary` | 1.18 | 1.18 | 0.00 | 0 |
| 06 | `kpi-system` | 1.27 | 1.27 | 0.00 | 0 |
| 08 | `ai-knowledge` | 4.93 | 4.93 | 0.00 | 0 |
| 09 | `chatbi` | 1.00 | 1.00 | 0.00 | 0 |
| 10 | `decision-loop` | 2.40 | 2.40 | 0.00 | 0 |

## 6. 回归脚本

本批 after-baseline：

```bash
PORT=5198 \
SCM_WORKBENCH_BASE_URL="http://127.0.0.1:5198" \
SCM_UI_BASELINE_OUTPUT_DIR="/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b58-lineage-quality-page-proof/ui-baseline-after" \
SCM_UI_BASELINE_SUMMARY_PATH="tmp/outputs/scm-lineage-quality-page-proof-after-20260630.json" \
npm run audit:ui-baseline
```

完整验收仍需执行：

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

如果运行会写本地 SQLite 的 smoke，必须先保留快照，验收后恢复 `data/governance_workbench.sqlite`，再跑最终 `smoke:readonly`。

## 7. 下一批建议

B59 推荐聚焦 `08 ai-knowledge` page proof slice：

1. 用 DOM 高度测量定位 AI knowledge 的长页来源。
2. 只做页面级局部滚动/分区 proof，不改变 provider gate、不放宽认证门禁。
3. 使用 `audit:ui-baseline` 验证 `maxHeightRatio` 是否从 `4.93` 继续下降。
4. 保持边界：`productionWrites=false / providerCalls=false / erpWriteback=false`，DeepSeek 仍保持 missing-key gate 或显式授权后再变更。
