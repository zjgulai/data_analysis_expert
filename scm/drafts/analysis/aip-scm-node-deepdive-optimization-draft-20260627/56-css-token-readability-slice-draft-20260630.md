---
title: "SCM CSS Token Readability Slice"
doc_type: execution_evidence
module: scm
topic: "css-token-readability-slice"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "CSS/readability only; no main.tsx change; no server change; no SQLite mutation in committed diff; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-ui-token-baseline-20260630"
evidence_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-ui-token-readability-after-20260630.json"
---

# SCM CSS Token Readability Slice

## 1. 结论先行

B56 已在 B55 截图/token 基线之上完成一批**窄 scope CSS token/readability 调整**，目标是先降低公共视觉噪声和 KPI canvas 长页压力，不搬运旧 UI 分支、不改 React 行为、不改服务端。

事实：

- 修改文件：`drafts/prototypes/scm-data-governance-workbench-v0/src/styles.css`
- 新增 after 证据 JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-ui-token-readability-after-20260630.json`
- 2026-06-30 历史截图位于仓库外，不作为当前合并的可复核证据；当前 head 的 canonical 截图与 SHA-256 摘要位于 `drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/ui-proof-screenshots-20260716/`。
- 模块数量：`15`
- 截图数量：`15`
- 视口：`desktop-1440`（1440 x 900）
- 非只读请求：`0`
- console errors：`0`
- page errors：`0`
- 最大横向溢出：`0`
- 最大页面高度比：`13.48 -> 10.00`
- `06 指标体系编排台` heightRatio：`13.48 -> 1.27`

推断：

- KPI canvas 的长页压力主要来自页面级 `min-height`，已通过内部滚动 viewport 收敛，不需要改 `main.tsx`。
- 当前最大长页压力已转移到 `R1 业务现状与风险雷达`，它应作为 B57 page proof slice，而不是在本批继续扩大 CSS 面。

不确定项：

- 本批只覆盖 `desktop-1440` after-baseline；多断点视觉仍以 `smoke:ui` 的三桌面视口和后续 B57/B58 细分页面证明为准。
- `R1 业务现状与风险雷达` 的 heightRatio 仍为 `10.00`，本批没有声明其页面信息架构已完成收敛。

## 2. 可改文件范围与实际改动

允许范围：

- `src/styles.css`
- 本篇执行文档
- `00-index-draft-20260627.md`
- `tmp/outputs/scm-ui-token-readability-after-20260630.json`

实际 CSS 改动：

- root token：收敛 `--ink`、`--ink-2`、`--muted`、`--line`、`--line-strong`、`--paper`、`--paper-lift`、sidebar surface 和 shadow token。
- 全局背景：去掉两个 radial decorative layer，保留轻量 linear background。
- 密度：收紧 `content`、`topbar`、`panel`、`railPanel`、`sectionHeader`、`moduleHeader`、tabs、toolbar、workflow strip、table cell padding。
- KPI canvas：`canvasShell` 取消页面级 `min-height`，`canvasViewport` 改为 `height: clamp(500px, 62dvh, 620px)` 的内部滚动区；fullscreen 保持 `100dvh` 行为。
- KPI inspector：收紧右侧 inspector 宽度、gap、padding 和统计卡片字号。
- 策略/风险/角色页：仅收紧 hero/card/narrative surface 的 gap、padding 和背景 alpha，不改变页面状态或数据结构。

明确未改：

- 未修改 `src/main.tsx`
- 未修改 `server/index.mjs`
- 未修改 `data/governance_workbench.sqlite`
- 未接入 provider
- 未写生产库
- 未触发 ERP/WMS/TMS writeback

## 3. Token Delta

| Token | Before | After |
|---|---|---|
| `--ink` | `#111820` | `#1d1f23` |
| `--ink-2` | `#243140` | `#2b3440` |
| `--muted` | `#6d7885` | `#66717d` |
| `--line` | `#dde4eb` | `#d8e0e7` |
| `--line-strong` | `#c3ced8` | `#b9c6d2` |
| `--paper` | `#eef2f5` | `#f3f5f7` |
| `--paper-lift` | `#f7f8fa` | `#fbfcfd` |
| `--sidebar-surface` | `rgba(239, 243, 246, .88)` | `rgba(246, 248, 250, .9)` |
| `--sidebar-surface-strong` | `rgba(255, 255, 255, .74)` | `rgba(255, 255, 255, .82)` |
| `--shadow` | `0 16px 42px rgba(31, 43, 55, .065)` | `0 14px 36px rgba(31, 43, 55, .055)` |
| `--shadow-soft` | `0 8px 24px rgba(31, 43, 55, .045)` | `0 7px 20px rgba(31, 43, 55, .04)` |

业务语义色未改：

- `--blue`
- `--teal`
- `--green`
- `--amber`
- `--rose`

## 4. Page Delta

| Code | Module | Before Height Ratio | After Height Ratio | Delta | Overflow X |
|---|---|---:|---:|---:|---:|
| 06 | 指标体系编排台 | 13.48 | 1.27 | -12.21 | 0 |
| 07 | 血缘与质量工作台 | 7.01 | 6.60 | -0.41 | 0 |
| R1 | 业务现状与风险雷达 | 10.23 | 10.00 | -0.23 | 0 |
| S1 | 战略供应链全景工作台 | 3.07 | 2.92 | -0.15 | 0 |
| 03 | 维度工程工作台 | 1.14 | 1.00 | -0.14 | 0 |
| 08 | AI 知识库工作台 | 5.05 | 4.93 | -0.12 | 0 |
| R2 | 角色作战工作台 | 1.91 | 1.80 | -0.11 | 0 |
| 01 | 对象本体工作台 | 1.33 | 1.24 | -0.09 | 0 |

after-baseline 全量模块：

| Code | Module ID | Height Ratio | Overflow X |
|---|---|---:|---:|
| 00 | `overview` | 4.01 | 0 |
| S1 | `strategy-panorama` | 2.92 | 0 |
| R1 | `current-risk-radar` | 10.00 | 0 |
| R2 | `role-workbenches` | 1.80 | 0 |
| F1 | `fulfillment-dashboard` | 1.08 | 0 |
| 01 | `ontology` | 1.24 | 0 |
| 02 | `tags` | 1.12 | 0 |
| 03 | `dimensions` | 1.00 | 0 |
| 04 | `metric-engineering` | 1.18 | 0 |
| 05 | `metric-dictionary` | 1.18 | 0 |
| 06 | `kpi-system` | 1.27 | 0 |
| 07 | `lineage-quality` | 6.60 | 0 |
| 08 | `ai-knowledge` | 4.93 | 0 |
| 09 | `chatbi` | 1.00 | 0 |
| 10 | `decision-loop` | 2.40 | 0 |

## 5. 回归脚本

本批 after-baseline：

```bash
PORT=5196 \
SCM_WORKBENCH_BASE_URL="http://127.0.0.1:5196" \
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

## 6. 下一批建议

B57 推荐聚焦 `R1 业务现状与风险雷达` page proof slice：

1. 先用 baseline screenshot 定位长页来源：`riskAdvancedDetails`、`riskThresholdPanel`、`riskNarrativeSurface`、`recommendationGrid`。
2. 只做页面级分区/折叠/内部滚动 proof，不改 API payload。
3. 仍用 `audit:ui-baseline` 验证 `R1 heightRatio`、`maxOverflowX`、console/page error 和非只读请求。
4. 继续保留边界：`productionWrites=false / providerCalls=false / erpWriteback=false`，动作止于 `suggestion_review_replay`。
