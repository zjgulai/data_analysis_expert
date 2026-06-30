---
title: "SCM AI Knowledge Page Proof Slice"
doc_type: execution_evidence
module: scm
topic: "ai-knowledge-page-proof-slice"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "UI page-proof only; no server change; no SQLite mutation in committed diff; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-lineage-quality-page-proof-20260630"
evidence_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-ai-knowledge-page-proof-after-20260630.json"
---

# SCM AI Knowledge Page Proof Slice

## 1. 结论先行

B59 在 B58 `07 lineage-quality` 页面 proof 之后，完成 `08 AI 知识库工作台` 的页面级长页 proof slice。本批只给 `AiKnowledgePanel` 增加页面级 class，并在该 scope 下收敛知识域列表、AI 回答质量人工复核包和知识卡片台账，不改变 provider gate、认证门禁、API payload 或 server。

事实：

- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/main.tsx`
- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/styles.css`
- 新增 after 证据 JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-ai-knowledge-page-proof-after-20260630.json`
- 截图文件保存在本机 file-history：`/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b59-ai-knowledge-page-proof/ui-baseline-after/screenshots/`
- 模块数量：`15`
- 截图数量：`15`
- 视口：`desktop-1440`（1440 x 900）
- 非只读请求：`0`
- console errors：`0`
- page errors：`0`
- 最大横向溢出：`0`
- 全局最大页面高度比：`4.93 -> 4.61`
- `08 ai-knowledge` heightRatio：`4.93 -> 2.87`

推断：

- `08` 的长页瓶颈主要来自左列：`aiQualityReviewPanel`、`domainGrid`、搜索输入区，以及底部知识卡片表格。
- 给 `AiKnowledgePanel` 增加页面级 class 后，CSS 可以精准作用于该页，不影响 KPI、风险雷达、血缘质量或 ChatBI 页面。

不确定项：

- 本批没有重新设计 AI 知识库的信息架构，也没有打开 DeepSeek provider。
- after-baseline 显示当前全局最高页回到 `07 lineage-quality`，其 `heightRatio=4.61`；若继续按最高页优先，可做 B60 二次收敛，否则可进入下一个未处理高页 `00 overview`。

## 2. 代码图谱依据

`codebase-memory-mcp` 显示：

- `AiKnowledgePanel` 属于前端 `src` cluster。
- 唯一调用方为 `App`。
- 下游组件包括 `EvidenceList`、`AgentRunList`、`AgentTracePanel`、`BoundAssetTable`、`BoundDetailDrawer`、`ModuleHeader`、`WorkflowStrip`、`RefPills`、`Badge`、`useApi`。
- 下游行为函数包括 `runSearch`、`recordAiKnowledgeQualityReview`、`createEmptyAiKnowledgeQualityReviewPayload`。
- server cluster 独立，页面长页 proof 不需要触碰 `server/index.mjs`。

因此本批只给 `AiKnowledgePanel` 根节点增加 `aiKnowledgeWorkbench` class，并在该 scope 下做 CSS page proof。

## 3. 长页来源测量

B58 状态下，`08 ai-knowledge` DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `knowledgeLayout` | 3415 | 3415 | 左列拉高整个双栏布局 |
| `knowledgeSearchSurface` | 555 | 553 | 搜索控件 + textarea + 多按钮 |
| `domainGrid` | 748 | 748 | 4 个知识域卡片全部展开 |
| `aiQualityReviewPanel` | 2084 | 2082 | review packet 卡片组完整展开 |
| `aiQualityReviewGrid` | 1625 | 1625 | 4 个长卡片两列排布 |
| `aiQualityBoundary` | 262 | 262 | 允许用途/关闭动作/回执完整展开 |
| `知识卡片台账 tableWrap` | 520 | 1161 | 长表格默认 520px |

B59 后，DOM 高度测量：

| Section | Height | Scroll Height | 说明 |
|---|---:|---:|---|
| `knowledgeLayout` | 1783 | 1783 | 左列总高度下降 |
| `knowledgeSearchSurface` | 478 | 476 | 输入区局部压缩 |
| `domainGrid` | 342 | 676 | 知识域卡片组内部滚动 |
| `aiQualityReviewPanel` | 935 | 933 | review panel 大幅收敛 |
| `aiQualityReviewGrid` | 540 | 1630 | review card grid 内部滚动 |
| `aiQualityBoundary` | 170 | 258 | 边界区内部滚动 |
| `知识卡片台账 tableWrap` | 300 | 1161 | tableWrap 内部滚动 |

## 4. 实际改动

`main.tsx`：

- `AiKnowledgePanel` 根节点从 `className="panel"` 改为 `className="panel aiKnowledgeWorkbench"`。
- 未改变 hooks、API path、state、按钮行为、provider gate、质量复核记录 payload 或详情抽屉行为。

`styles.css`：

- `.aiKnowledgeWorkbench .knowledgeLayout` 设置 `align-items:start`。
- `.aiKnowledgeWorkbench .knowledgeSearchSurface` 与 `.aiQualityReviewPanel` 收敛 padding/gap。
- `.aiKnowledgeWorkbench .domainGrid` 设置局部 `max-height` 与 `overflow:auto`。
- `.aiKnowledgeWorkbench .aiQualityReviewGrid` 设置局部 `max-height` 与 `overflow:auto`。
- `.aiKnowledgeWorkbench .aiQualityBoundary` 设置局部 `max-height` 与 `overflow:auto`。
- `.aiKnowledgeWorkbench > .assetSurface .tableWrap` 从通用 `520px` 收敛为 `300px` 内部滚动。

明确未改：

- 未修改 `server/index.mjs`
- 未修改 `data/governance_workbench.sqlite`
- 未修改 API payload
- 未接入 provider
- 未写生产库
- 未触发 ERP/WMS/TMS writeback

## 5. Page Delta

| Code | Module ID | B58 Height Ratio | B59 Height Ratio | Delta | Overflow X |
|---|---|---:|---:|---:|---:|
| 08 | `ai-knowledge` | 4.93 | 2.87 | -2.06 | 0 |
| 07 | `lineage-quality` | 4.61 | 4.61 | 0.00 | 0 |
| 00 | `overview` | 4.01 | 4.01 | 0.00 | 0 |
| R1 | `current-risk-radar` | 3.56 | 3.56 | 0.00 | 0 |
| S1 | `strategy-panorama` | 2.92 | 2.92 | 0.00 | 0 |
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
PORT=5199 \
SCM_WORKBENCH_BASE_URL="http://127.0.0.1:5199" \
SCM_UI_BASELINE_OUTPUT_DIR="/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b59-ai-knowledge-page-proof/ui-baseline-after" \
SCM_UI_BASELINE_SUMMARY_PATH="tmp/outputs/scm-ai-knowledge-page-proof-after-20260630.json" \
npm run audit:ui-baseline
```

本批完整验收已执行：

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
- `preprod:check` hard blockers 为空；manual gates 仍为 `manual-p0-owner-signoffs`、`manual-p0-field-mappings`、`manual-scei-weight-source`。
- `smoke:api` 通过；DeepSeek missing-key gate 返回 `503` 且 `providerCallAttempted=false`。
- `smoke:ui` 通过；所有桌面视口与交互检查 `overflow=0`，但该脚本按预期 `localSqliteWrites=true`。
- 已用 smoke 前快照恢复 `data/governance_workbench.sqlite`，最终 `smoke:readonly` 通过且 `localSqliteWrites=false`。

## 7. 下一批建议

B60 有两个可执行路径：

1. 严格按 after-baseline 最大值：继续做 `07 lineage-quality` 二次 page proof，把 `4.61` 进一步降到 4 以下。
2. 按未处理高页优先：做 `00 overview` page proof slice，把 `4.01` 的总览页长高收敛。

两者都必须保持边界：`productionWrites=false / providerCalls=false / erpWriteback=false`，DeepSeek 仍保持 missing-key gate 或显式授权后再变更。
