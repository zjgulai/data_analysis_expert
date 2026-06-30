---
title: "SCM Risk Radar Second Pass Page Proof"
doc_type: execution_evidence
module: scm
topic: "risk-radar-second-pass-page-proof"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "UI page-proof only; CSS scope only; no main.tsx change; no server change; no SQLite mutation in committed diff; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-lineage-quality-second-pass-20260630"
evidence_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-risk-radar-second-pass-after-20260630.json"
---

# SCM Risk Radar Second Pass Page Proof

## 1. 结论先行

B62 在 B61 `07 lineage-quality` 二次 proof 之后，转向 after-baseline 第二长页 `R1 current-risk-radar` 做二次页面密度收敛。本批不改 `main.tsx`，不改 `server/index.mjs`，复用 `CurrentRiskRadarPanel` 已有的 `.riskWorkbench` 页面级 scope，只通过局部 padding、gap 和内部滚动上限收敛页面高度。

事实：

- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/styles.css`
- 新增 after 证据 JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-risk-radar-second-pass-after-20260630.json`
- 截图文件保存在本机 file-history：`/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b62-risk-radar-second-pass/ui-baseline-after/screenshots/`
- 模块数量：`15`
- 截图数量：`15`
- 视口：`desktop-1440`（1440 x 900）
- 非只读请求计数：`0`
- 浏览器控制台红项：`0`
- 页面异常计数：`0`
- 最大横向溢出：`0`
- 全局最大页面高度比：`3.78`
- `R1 current-risk-radar` heightRatio：`3.56 -> 2.97`

推断：

- B61 后 `R1` 的主要长页来源不是页面外壳，而是 `riskEvidenceDrawer`、`riskSignalGroupedList`、`rootCauseGrid` 和 `recommendationGrid` 这些已具备独立内容边界的长列表区。
- 因为 `CurrentRiskRadarPanel` 已经在根节点带有 `.riskWorkbench`，本批无需触碰组件行为，也无需触碰 API/server。

不确定项：

- 本批不改变任何风险信号排序、推荐动作、阈值、权重或 owner choice 行为。
- after-baseline 显示当前全局最高页仍是 `07 lineage-quality`（heightRatio `3.78`），但 R1 已降至 `2.97`；是否继续追求低于 3 的全局密度，需要另行按页面价值排序。

## 2. 代码图谱依据

`codebase-memory-mcp` 显示：

- `CurrentRiskRadarPanel` 位于 `src/main.tsx`，属于前端 `src` cluster。
- 唯一调用方为 `App`。
- 直接下游包括 `RecommendationCardList`、`GovernanceBoundaryStrip`、`ModuleHeader`、`WorkflowStrip`、`RiskThresholdGovernancePanel`、`useApi`、`sourceCoverageForRisk`、`riskDomainForScenario`、`defenseLayerForRisk` 等。
- `get_code_snippet` 确认根节点为 `<section className="panel riskWorkbench">`。

因此本批只修改 `styles.css` 中既有 `.riskWorkbench` scope，不改 `main.tsx`、不改 server。

## 3. 长页来源测量

B61 状态下，`R1 current-risk-radar` DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `riskRoot` | 3081 | 3079 | 页面主体 |
| `moduleHeader` | 97 | 96 | 模块头 |
| `workflowStrip` | 74 | 72 | 5 步流程条 |
| `riskHero` | 204 | 202 | 风险雷达英雄区 |
| `riskNarrativeSurface` | 550 | 548 | 风险叙事与证据抽屉 |
| `riskEvidenceDrawer` | 522 | 927 | 证据抽屉内容区 |
| `strategyGrid[0]` | 1058 | 1056 | 风险信号与推荐动作双列 |
| `riskSignalGroupedList` | 560 | 1521 | 风险信号长列表 |
| `strategyGrid[1]` | 696 | 694 | 根因与推荐卡片双列 |
| `rootCauseGrid` | 457 | 457 | 根因列表 |
| `recommendationGrid` | 620 | 4692 | 推荐动作长列表 |
| `evidenceBoundaryDetails` | 90 | 88 | 证据边界 |

B62 后，DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `riskRoot` | 2545 | 2543 | 页面主体收敛 |
| `riskHero` | 192 | 190 | padding/gap 收敛 |
| `riskNarrativeSurface` | 384 | 382 | 证据抽屉内部滚动上限收敛 |
| `riskEvidenceDrawer` | 360 | 927 | 证据抽屉内部滚动 |
| `strategyGrid[0]` | 942 | 940 | 风险信号与推荐动作双列收敛 |
| `strategyGrid[1]` | 496 | 494 | 根因与推荐卡片双列收敛 |
| `riskSignalGroupedList` | 396 | 1541 | 风险信号内部滚动 |
| `rootCauseGrid` | 324 | 457 | 根因列表内部滚动 |
| `recommendationGrid` | 396 | 4896 | 推荐动作内部滚动 |
| `evidenceBoundaryDetails` | 90 | 88 | 无变化 |

## 4. 实际改动

`styles.css`：

- `.riskWorkbench` 根 panel gap 和 padding 收敛到 `12px`。
- `.riskWorkbench .moduleHeader`、`.workflowStrip`、`.workflowStep` 做局部 margin/padding/gap 收敛。
- `.riskWorkbench .riskHero`、`.riskNarrativeSurface`、直接子 `.strategyGrid > .surface` 做局部 padding 收敛。
- `.riskWorkbench .riskEvidenceDrawer` 从最高约 `620px` 收敛到约 `360px`。
- `.riskWorkbench .riskSignalGroupedList` 从最高约 `720px` 收敛到约 `400px`。
- `.riskWorkbench .recommendationGrid` 从最高约 `820px` 收敛到约 `420px`。
- `.riskWorkbench .rootCauseGrid` 增加内部滚动上限，避免根因列表继续拉高页面。

明确未改：

- 未修改 `main.tsx`
- 未修改 `server/index.mjs`
- 未修改 `data/governance_workbench.sqlite`
- 未修改 API payload
- 未接入 provider
- 未写生产库
- 未触发 ERP/WMS/TMS writeback

## 5. Page Delta

| Code | Module ID | B61 Height Ratio | B62 Height Ratio | Delta | Overflow X |
|---|---|---:|---:|---:|---:|
| 07 | `lineage-quality` | 3.78 | 3.78 | 0.00 | 0 |
| R1 | `current-risk-radar` | 3.56 | 2.97 | -0.59 | 0 |
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
SCM_UI_BASELINE_OUTPUT_DIR="/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b62-risk-radar-second-pass/ui-baseline-after" \
SCM_UI_BASELINE_SUMMARY_PATH="tmp/outputs/scm-risk-radar-second-pass-after-20260630.json" \
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
- `audit:ui-baseline` 已通过；`moduleCount=15`、`screenshotCount=15`、`maxOverflowX=0`、`maxHeightRatio=3.78`。
- `preprod:check` hard blockers 为空；manual gates 仍为 `manual-p0-owner-signoffs`、`manual-p0-field-mappings`、`manual-scei-weight-source`。
- `smoke:api` 通过；DeepSeek missing-key gate 返回 `503` 且 `providerCallAttempted=false`。
- `smoke:ui` 通过；所有桌面视口与交互检查 `overflow=0`，但该脚本按预期 `localSqliteWrites=true`。
- 已用 smoke 前快照恢复 `data/governance_workbench.sqlite`，最终 hash 为 `8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92`。
- `smoke:readonly` 通过且 `localSqliteWrites=false`。
- 本地服务已停止，`127.0.0.1:5200` 无残留监听。

## 7. 下一批建议

B63 建议先做一个决策点，而不是继续机械压缩所有页面：

1. 若目标是 UI proof 收尾，转向 `S1 strategy-panorama`，当前 heightRatio `2.92`，目标约 `2.50`，仍限定 CSS/page-proof。
2. 若目标是上线前可信债收口，暂停页面密度优化，回到 manual gates：`manual-p0-owner-signoffs`、`manual-p0-field-mappings`、`manual-scei-weight-source`。
3. 两条路线都必须保持边界：`productionWrites=false / providerCalls=false / erpWriteback=false`，DeepSeek 仍保持 missing-key gate 或显式授权后再变更。
