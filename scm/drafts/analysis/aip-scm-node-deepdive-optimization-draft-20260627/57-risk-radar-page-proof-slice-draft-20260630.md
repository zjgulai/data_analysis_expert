---
title: "SCM Risk Radar Page Proof Slice"
doc_type: execution_evidence
module: scm
topic: "risk-radar-page-proof-slice"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "CSS/page-proof only; no main.tsx change; no server change; no SQLite mutation in committed diff; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-css-token-readability-20260630"
evidence_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-risk-radar-page-proof-after-20260630.json"
---

# SCM Risk Radar Page Proof Slice

## 1. 结论先行

B57 在 B56 token/readability 基线之上完成 `R1 业务现状与风险雷达` 的**页面级长页 proof slice**。本批没有改 API payload、没有改 `main.tsx`、没有改 server，只通过 R1 局部 CSS 让风险信号、证据抽屉和行动队列成为内部滚动区域，并阻止 grid 子面板互相拉高。

事实：

- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/styles.css`
- 新增 after 证据 JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-risk-radar-page-proof-after-20260630.json`
- 2026-06-30 历史截图位于仓库外，不作为当前合并的可复核证据；当前 head 的 canonical 截图与 SHA-256 摘要位于 `drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/ui-proof-screenshots-20260716/`。
- 模块数量：`15`
- 截图数量：`15`
- 视口：`desktop-1440`（1440 x 900）
- 非只读请求：`0`
- console errors：`0`
- page errors：`0`
- 最大横向溢出：`0`
- 全局最大页面高度比：`10.00 -> 6.60`
- `R1 current-risk-radar` heightRatio：`10.00 -> 3.56`

推断：

- `R1` 的长页瓶颈不是数据接口，而是页面默认渲染完整风险卡与完整建议队列，并且 grid stretch 把相邻折叠摘要/根因面板拉高。
- B57 证明了不改 `main.tsx` 也能先把 R1 页面默认阅读高度降到可审阅区间。

不确定项：

- 本批不解决 `07 lineage-quality` 的 `heightRatio=6.60`；它成为下一批 UI proof 的最高长页。
- 本批没有重新设计风险雷达的信息架构，只做页面级 proof，完整交互与内容仍沿用现有结构。

## 2. 代码图谱依据

`codebase-memory-mcp` 架构图谱显示：

- `CurrentRiskRadarPanel` 属于 `src` 前端 cluster。
- 调用方为 `App`，被调用组件包括 `ModuleHeader`、`WorkflowStrip`、`RiskThresholdGovernancePanel`、`RecommendationCardList`、`Badge`、`RefPills`。
- server cluster 独立，R1 页面长页 proof 不需要触碰 `server/index.mjs`。

因此本批限定为 CSS/page-proof：不改 `main.tsx`，不改 server，不改 SQLite。

## 3. 长页来源测量

B56 状态下，R1 DOM 高度测量：

| Section | Height | 说明 |
|---|---:|---|
| `riskNarrativeSurface` | 957 | 证据抽屉内容撑高 |
| 第一组 `strategyGrid` | 2019 | 风险信号卡 + grid stretch |
| `riskRadarSurface` | 1638 | 3 张风险卡完整展开 |
| `riskAdvancedDetails` | 1638 | 被同一 grid row stretch 拉高 |
| 第二组 `strategyGrid` | 5126 | 行动队列 15 张建议卡完整展开 |
| `Action Queue` surface | 5126 | 建议卡列表撑高 |
| `Root Cause Lens` surface | 5126 | 被同一 grid row stretch 拉高 |

B57 后，R1 DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `riskNarrativeSurface` | 550 | 550 | 证据抽屉内部滚动后收敛 |
| `riskEvidenceDrawer` | 522 | 927 | 内部滚动 |
| 第一组 `strategyGrid` | 1058 | 1058 | grid 不再互相拉高 |
| `riskSignalGroupedList` | 560 | 1521 | 内部滚动 |
| `riskAdvancedDetails` | 111 | 109 | 保持折叠摘要高度 |
| 第二组 `strategyGrid` | 696 | 696 | 行动队列内部滚动后收敛 |
| `Action Queue` `recommendationGrid` | 620 | 4692 | 内部滚动 |
| `Root Cause Lens` surface | 510 | 510 | 不再被行动队列拉高 |

## 4. 实际 CSS 改动

新增 R1 局部规则：

- `.riskWorkbench .strategyGrid` 与 `.riskWorkbench .riskNarrativeSurface` 使用 `align-items: start`，阻止 grid stretch。
- `.riskWorkbench .riskEvidenceDrawer` 设置 `max-height` 与 `overflow: auto`。
- `.riskWorkbench .riskSignalGroupedList` 设置 `max-height` 与 `overflow: auto`。
- `.riskWorkbench .recommendationGrid` 设置 `max-height` 与 `overflow: auto`。
- `.riskWorkbench .recommendationCard`、`.recommendationHead strong`、`.recommendationCard > p` 做局部密度收敛，长正文以 3 行 clamp 呈现。

明确未改：

- 未修改 `src/main.tsx`
- 未修改 `server/index.mjs`
- 未修改 `data/governance_workbench.sqlite`
- 未修改 API payload
- 未接入 provider
- 未写生产库
- 未触发 ERP/WMS/TMS writeback

## 5. Page Delta

| Code | Module ID | B56 Height Ratio | B57 Height Ratio | Delta | Overflow X |
|---|---|---:|---:|---:|---:|
| R1 | `current-risk-radar` | 10.00 | 3.56 | -6.44 | 0 |
| 00 | `overview` | 4.01 | 4.01 | 0.00 | 0 |
| S1 | `strategy-panorama` | 2.92 | 2.92 | 0.00 | 0 |
| R2 | `role-workbenches` | 1.80 | 1.80 | 0.00 | 0 |
| F1 | `fulfillment-dashboard` | 1.08 | 1.08 | 0.00 | 0 |
| 01 | `ontology` | 1.24 | 1.24 | 0.00 | 0 |
| 02 | `tags` | 1.12 | 1.12 | 0.00 | 0 |
| 03 | `dimensions` | 1.00 | 1.00 | 0.00 | 0 |
| 04 | `metric-engineering` | 1.18 | 1.18 | 0.00 | 0 |
| 05 | `metric-dictionary` | 1.18 | 1.18 | 0.00 | 0 |
| 06 | `kpi-system` | 1.27 | 1.27 | 0.00 | 0 |
| 07 | `lineage-quality` | 6.60 | 6.60 | 0.00 | 0 |
| 08 | `ai-knowledge` | 4.93 | 4.93 | 0.00 | 0 |
| 09 | `chatbi` | 1.00 | 1.00 | 0.00 | 0 |
| 10 | `decision-loop` | 2.40 | 2.40 | 0.00 | 0 |

## 6. 回归脚本

本批 after-baseline：

```bash
PORT=5197 \
SCM_WORKBENCH_BASE_URL="http://127.0.0.1:5197" \
SCM_UI_BASELINE_OUTPUT_DIR="tmp/outputs/ui-proof-screenshots-20260716" \
npm run audit:ui-baseline
```

完整验收仍需执行：

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

如果运行会写本地 SQLite 的 smoke，必须先保留快照，验收后恢复 `data/governance_workbench.sqlite`，再跑最终 `smoke:readonly`。

## 7. 下一批建议

B58 推荐聚焦 `07 lineage-quality` page proof slice：

1. 用 DOM 高度测量定位 `lineage-quality` 的长页来源。
2. 只做页面级局部滚动/分区 proof，不改血缘 API 和 SQLite。
3. 使用 `audit:ui-baseline` 验证 `maxHeightRatio` 是否从 `6.60` 继续下降。
4. 保持边界：`productionWrites=false / providerCalls=false / erpWriteback=false`，动作止于 `suggestion_review_replay`。
