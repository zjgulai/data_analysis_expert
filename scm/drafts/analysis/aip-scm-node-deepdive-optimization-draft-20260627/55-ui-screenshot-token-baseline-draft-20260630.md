---
title: "SCM UI Screenshot And Token Baseline"
doc_type: execution_evidence
module: scm
topic: "ui-screenshot-token-baseline"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "tooling-and-evidence only; no runtime UI behavior change; no server change; no SQLite mutation in committed diff; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-ledger-ui-salvage-manifest-20260629"
evidence_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-ui-token-baseline-20260630.json"
---

# SCM UI Screenshot And Token Baseline

## 1. 结论先行

B55 已把当前最小 RC UI 的**截图基线、横向溢出基线、console/page error 基线、设计 token 基线**固化为可重复脚本和 JSON 证据。

事实：

- 新增脚本：`drafts/prototypes/scm-data-governance-workbench-v0/scripts/audit-ui-baseline.mjs`
- 新增 npm script：`npm run audit:ui-baseline`
- 新增证据 JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/scm-ui-token-baseline-20260630.json`
- 截图文件保存在本机 file-history：`/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b55-ui-token-baseline/ui-baseline/screenshots/`
- 截图数量：`15`
- 模块数量：`15`
- 视口：`desktop-1440`（1440 x 900）
- 非只读请求：`0`
- console errors：`0`
- page errors：`0`
- 最大横向溢出：`0`
- 最大页面高度比：`13.48`

推断：

- 当前 UI 的横向安全性可以作为 B56/B57 的 before 基线。
- 当前最高长页压力集中在 KPI 系统、业务现状与风险雷达、血缘与质量、AI 知识库四类页面，后续分页/二级分区应优先从这些页面里挑 proof slice。

不确定项：

- 本批只记录现状，不判断 Claude/UI 旧分支视觉方案优劣。
- 本批只覆盖 `desktop-1440` baseline；移动端断点仍依赖既有 `smoke:ui` 和后续 B56/B57 专项验证。

## 2. 执行边界

本批没有修改 `src/main.tsx`、`src/styles.css`、`server/index.mjs` 或 SQLite 数据文件。脚本只做：

1. `GET /api/workbench/modules` 读取模块列表。
2. 用 Playwright 打开本地工作台。
3. 点击侧边导航切换 15 个模块。
4. 采样 root CSS variables 和关键组件 computed style。
5. 记录 viewport、scrollWidth、scrollHeight、heightRatio、overflowX。
6. 截图到本地 file-history。
7. 输出 JSON 摘要。

脚本明确断言：

- `nonReadOnlyRequests = 0`
- `consoleErrors = 0`
- `pageErrors = 0`
- 每个模块 `overflowX = 0`

## 3. Token Baseline

当前 root token 摘要：

| Token | Value |
|---|---|
| `--ink` | `#111820` |
| `--ink-2` | `#243140` |
| `--muted` | `#6d7885` |
| `--line` | `#dde4eb` |
| `--line-strong` | `#c3ced8` |
| `--paper` | `#eef2f5` |
| `--paper-lift` | `#f7f8fa` |
| `--panel` | `#ffffff` |
| `--panel-soft` | `#f8fafb` |
| `--blue` | `#2167b8` |
| `--teal` | `#278b87` |
| `--green` | `#1d8f5f` |
| `--amber` | `#b56b00` |
| `--rose` | `#bc4050` |
| `--shadow` | `0 16px 42px rgba(31, 43, 55, .065)` |
| `--shadow-soft` | `0 8px 24px rgba(31, 43, 55, .045)` |

对 B56 的含义：

- 如果引入 Apple-like token，只能作为 token delta 被审计，不能整体替换 UI 行为。
- 需要保留多色语义：blue/teal/green/amber/rose 均已承担状态含义，不应变成单一蓝灰主题。
- `--paper`、`--panel`、`--line`、`--shadow` 是低风险第一批 token 对象；业务语义色要等截图对照后再调整。

## 4. Page Baseline

| Code | Module | Overflow X | Height Ratio | Screenshot |
|---|---|---:|---:|---|
| 00 | 治理链路总览 | 0 | 4.09 | `desktop-1440-00-overview.png` |
| S1 | 战略供应链全景工作台 | 0 | 3.07 | `desktop-1440-S1-strategy-panorama.png` |
| R1 | 业务现状与风险雷达 | 0 | 10.23 | `desktop-1440-R1-current-risk-radar.png` |
| R2 | 角色作战工作台 | 0 | 1.91 | `desktop-1440-R2-role-workbenches.png` |
| F1 | 供应链履约看板 | 0 | 1.11 | `desktop-1440-F1-fulfillment-dashboard.png` |
| 01 | 对象本体工作台 | 0 | 1.33 | `desktop-1440-01-ontology.png` |
| 02 | 标签工程工作台 | 0 | 1.20 | `desktop-1440-02-tags.png` |
| 03 | 维度工程工作台 | 0 | 1.14 | `desktop-1440-03-dimensions.png` |
| 04 | 指标工程工作台 | 0 | 1.27 | `desktop-1440-04-metric-engineering.png` |
| 05 | 指标字典工作台 | 0 | 1.27 | `desktop-1440-05-metric-dictionary.png` |
| 06 | 指标体系编排台 | 0 | 13.48 | `desktop-1440-06-kpi-system.png` |
| 07 | 血缘与质量工作台 | 0 | 7.01 | `desktop-1440-07-lineage-quality.png` |
| 08 | AI 知识库工作台 | 0 | 5.05 | `desktop-1440-08-ai-knowledge.png` |
| 09 | ChatBI 语义治理台 | 0 | 1.05 | `desktop-1440-09-chatbi.png` |
| 10 | 决策闭环工作台 | 0 | 2.45 | `desktop-1440-10-decision-loop.png` |

## 5. B56/B57 路由

推荐下一批路线：

1. B56 CSS token/readability slice：只改公共视觉 token 和低风险 readability guardrail，验收用本脚本做 before/after delta。
2. B57 page proof slice：优先选 `06 指标体系编排台` 或 `R1 业务现状与风险雷达`，因为它们的 heightRatio 最高；单页证明分页/分区机制后再扩面。
3. 暂缓 role/KPI 运行时代码搬运：KPI 页面虽高，但 KPI canvas 行为和指标认证语义耦合，仍需遵守 03 指标工程 P0 先行。

## 6. 回归脚本

本批新增可重复脚本：

```bash
SCM_UI_BASELINE_OUTPUT_DIR="/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260630T-b55-ui-token-baseline/ui-baseline" \
SCM_UI_BASELINE_SUMMARY_PATH="tmp/outputs/scm-ui-token-baseline-20260630.json" \
npm run audit:ui-baseline
```

本批完整验收仍需保留：

```bash
find . -name '*.pem' -print
node --check scripts/audit-ui-baseline.mjs
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="/Users/pray/.config/superpowers/worktrees/ecom_ana_overview/scm-readonly-rc-minimal-20260629" npm run preprod:check
npm run audit:ui-baseline
npm run smoke:readonly
```

若运行了会写本地 SQLite 的 smoke，应恢复 `data/governance_workbench.sqlite` 快照后再执行最终 `smoke:readonly`。
