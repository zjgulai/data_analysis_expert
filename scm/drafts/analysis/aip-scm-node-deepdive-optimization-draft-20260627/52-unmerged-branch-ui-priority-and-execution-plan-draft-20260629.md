---
title: "Unmerged Branch, Claude/UI Optimization Priority and Execution Plan Draft"
doc_type: execution_plan
module: scm
topic: "unmerged-branches-ui-optimization-priority"
status: draft_execution_started
created: 2026-06-29
updated: 2026-06-29
owner: self
source: codex
boundary: "planning + content governance only; no merge; no deploy; no provider call; no production write"
related:
  - "50-pr-closeout-and-manual-gate-handoff-draft-20260629.md"
  - "51-owner-intake-kit-execution-summary-draft-20260629.md"
  - "40-b29-t8-22-ai-knowledge-review-models-draft-20260629.md"
  - "42-release-candidate-governance-plan-draft-20260629.md"
invariants:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  maxActionBoundary: suggestion_review_replay
---

# Unmerged Branch, Claude/UI Optimization Priority and Execution Plan

## 1. 第一性原理

生产上线前的真实目标不是“把所有分支合掉”，而是让可发布对象满足四个条件：

| 原则 | 判定 |
|---|---|
| 可信 | 指标、标签、故事线、闭环和 manual gates 的证据边界清楚，不能把 seed/demo 或未认证值当事实。 |
| 可控 | `productionWrites=false`、`providerCalls=false`、`erpWriteback=false`，动作止于 `suggestion_review_replay`。 |
| 可审计 | 每个 PR 的文件范围、验证命令、SQLite/CSV 变更、UI smoke 证据可追溯。 |
| 可回滚 | 不直接合并巨分支；可抽取、可 cherry-pick、可独立回退。 |

因此本轮优先级排序规则是：**边界风险 > 远端合并风险 > 证据缺口 > 用户可见 UI 价值 > 清理便利性**。

## 2. 当前事实

| 类别 | 当前事实 | 证据 |
|---|---|---|
| SCM 当前分支 | `codex/scm-readonly-rc-governance-20260629` | `git branch --show-current` |
| SCM open PR | PR #1 open，head=`codex/scm-readonly-rc-governance-20260629`，base=`main`，GitHub mergeable=`MERGEABLE` | `gh pr list --repo zjgulai/data_analysis_expert --state open` |
| SCM 远端基线风险 | 本地 `main` 比 `origin/main` 超前 15 个提交；PR #1 相对远端 `main` 不只是 3 个 RC 提交 | `git log origin/main..main`、`git log origin/main..codex/scm-readonly-rc-governance-20260629` |
| SCM PR diff 风险 | 本地统计相对 `origin/main` 约 1412 files / 2,096,867 insertions；GitHub diff API 返回 `PullRequest.diff too_large` | `git diff --stat origin/main...codex/scm-readonly-rc-governance-20260629`、`gh pr diff --name-only` |
| SCM 密钥前置 | `/Users/pray/project/ecom_ana_overview/scm` 下未发现 `*.pem` | `find ... -name '*.pem' -print` 无输出 |
| codebase-memory | 已对 `scm-data-governance-workbench-v0` fast index：927 nodes / 2037 edges | `mcp__codebase_memory_mcp.index_repository` |
| mkt53 open PR | open PR 为 0 | `gh pr list --repo zjgulai/mkt53 --state open` |
| mkt53 本地 UI 候选 | 5 个 dirty 文件，约 290 insertions / 1161 deletions，主要是证据门禁和去除未认证展示口径 | `git diff --stat` |

## 3. 未合并分支盘点

### 3.1 SCM / data_analysis_expert

| 分支 | 状态 | 与 `main` 关系 | 判断 | 处理优先级 |
|---|---:|---:|---|---|
| `codex/scm-readonly-rc-governance-20260629` | open PR #1，GitHub mergeable | ahead local main 3；但包含 local main 相对 `origin/main` 的 15 个提交 | RC governance / manual gate handoff 主线。不能因 `MERGEABLE` 就合并，需先确认远端 base promotion。 | P0 |
| `codex/scm-ledger-workbench` | 本地 + `scm/` remote branch；无当前 GitHub open PR 证据 | ahead local main 67 | 含 Claude/UI/Apple-support 风格、page density、role workbench、semantic operations、provider readiness 等大量历史 UI/工作台迭代。直接 merge 会覆盖当前 RC 边界，且改动 `main.tsx` / `server/index.mjs` / SQLite / deploy。 | P1 salvage，不直接 merge |
| `codex/scm-deploy-20260618` | 本地历史分支 | 与 local main 无 merge base | 旧部署/导出历史，不能直接合并。只能作为考古参考或归档。 | P3 archive/reference |
| `codex/scm-ledger-workbench-export` | 本地历史分支 | 与 local main 无 merge base | 旧 prototype export 历史，不能直接合并。只能抽取文档线索。 | P3 archive/reference |
| `codex/sprint-a-workflow-ui` | 已 merged into local main | ahead 0 / behind 0 | 本地 main 已包含，不是未合并分支；但远端 `origin/main` 尚未包含 local main 整体。 | P0 base decision input |

### 3.2 mkt53 related workspace

| 分支/状态 | 事实 | 判断 | 处理优先级 |
|---|---|---|---|
| `main` dirty UI files | `DataSourcePage.tsx`、`IndustryPage.tsx`、`MarketPage.tsx`、`NewCompetition.tsx`、`clientBundleGuard.test.ts` | 这是本地候选，不是 PR。内容倾向证据门禁：移除未授权比例、价格、专利数、渠道增速等展示。不能混入 SCM PR。 | P1 separate mkt53 branch |
| `codex/amazon-readiness-promotion-gate` | ahead 1 / behind 22，无 open PR | Amazon 私有 readiness 晋升门禁，业务边界不同于 UI 优化。 | P2, separate review |
| `codex/semi-monthly-refresh-release` | ahead 1 / behind 6，无 open PR | 半月刷新发布边界，与本轮 SCM RC 不同。 | P2, separate review |

## 4. Claude/UI 优化线索归类

| 来源 | 已确认内容 | 第一性判断 | 下一步 |
|---|---|---|---|
| SCM `codex/scm-ledger-workbench` | `apple-support-ui-extraction`、`p2-saas-layout-refinement`、`p2-page-density-threshold-governance`、`p2-pagination-layout-governance`、`p2-role-kpi-canvas-refinement` 等 | 这些是高价值 UI 经验，但分支同时包含 deploy、provider readiness、server/API、SQLite 和巨量源码改动。 | 不合并分支；在 RC 稳定后建立 UI salvage checklist，逐个抽取设计意图和低风险组件。 |
| SCM T8 B8-B29 | 共享 UI、catalog/detail/knowledge/object360/trace/decision/governance/role/AI review 模型已分批抽取，均有 smoke 证据记录 | 当前主线已从 UI 拆分转到 preprod/RC/manual gates；继续拆 UI 会增加 RC 不确定性。 | PR #1 完成前冻结 runtime UI；只允许 content/docs gate。 |
| codebase-memory 新索引 | `RoleWorkbenchesPanel` 与 `AiKnowledgePanel` 仍直接绑定 `useApi`、review handler、shared UI；`RuntimeBusinessRowDesignGatePanel` 依赖较窄 | 继续整块移动 role/AI panel 风险高；若要继续 T8，优先抽 `RuntimeBusinessRowDesign` 类型/factory/request builder。 | B30 候选，但排在 PR/base/manual gate 之后。 |
| mkt53 dirty UI | 证据门禁、去掉未授权指标/比例/价格、增加 bundle guard 断言 | 这是可信债修复，不是视觉美化；价值高但必须独立 repo/branch/test。 | 不纳入 SCM；另开 mkt53 原子分支验收。 |

## 5. 统一优先级

| 优先级 | 任务 | 为什么排这里 | 可改范围 | 验收 |
|---|---|---|---|---|
| P0-A | 远端 base / PR #1 合并门禁 | PR #1 虽 mergeable，但 diff 过大且包含本地 main 15 个未远端化提交；这是上线前最大合并风险。 | docs / PR notes only | 明确人工选择：推进远端 main 基线、拆 PR、或暂停合并。 |
| P0-B | SCM RC 继续保持 review-ready | 已有 read-only RC pack、manual gate handoff、owner intake；不能被新 UI 改动污染。 | 当前 PR docs/data only | `check/build/preprod/smoke:*` 分层证据仍可复跑。 |
| P0-C | manual gates 不伪完成 | owner sign-off 30、field mapping 18、SCEI 5 仍待人工/真实来源。 | intake CSV / ledger / docs | pending 保持 pending；不得编造权重/映射。 |
| P1-A | `codex/scm-ledger-workbench` UI salvage | Claude/UI 价值最高，但直接合并风险也最高。 | 新分支逐项抽取，不动 RC | 每项一 PR，先 docs/design diff，再最小代码抽取。 |
| P1-B | mkt53 dirty UI 候选独立验收 | 与用户提到的 UI 可信修复相关，但 repo 边界不同。 | `/Users/pray/project/mkt53` 独立分支 | `npm run test` / `lint` / `build` / browser overflow。 |
| P2 | SCM B30 T8 低风险继续拆分 | 代码图谱显示 `RuntimeBusinessRowDesignGatePanel` 比 role/AI panel 更适合下一刀。 | 只抽类型/factory/request builder | `check/build/smoke:api/smoke:ui/smoke:readonly`。 |
| P3 | 无 merge base 历史分支归档 | 直接合并不成立。 | docs only | 标记 reference/archive，不再进入合并队列。 |

## 6. 执行队列

### 当前批次（已经开始）

| ID | Todo | 状态 |
|---|---|---|
| E52-1 | 盘点 SCM / mkt53 branch、open PR、dirty 边界 | done |
| E52-2 | 运行 SCM `.pem` 扫描 | done |
| E52-3 | 用 codebase-memory-mcp 索引 prototype 并读取关键依赖图 | done |
| E52-4 | 写入本统一计划 | done |
| E52-5 | 更新索引指针并跑验证 | done |

本批验证记录：

| 命令 | 结果 |
|---|---|
| `git diff --check` | passed |
| `find /Users/pray/project/ecom_ana_overview/scm -name '*.pem' -print` | passed；无输出 |
| `npm run check` | passed |
| `npm run build` | passed |
| `SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check` | passed；hard blockers 0；manual gates 3；dirty warning 22 |
| `SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5190 npm run smoke:api` | passed；DeepSeek missing-key gate `providerCallAttempted=false` |
| `SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5190 SCM_UI_SMOKE_OUTPUT_DIR=... npm run smoke:ui` | passed；desktop 1366/1440/1920 + interactions；horizontal overflow 0 |
| `SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5190 npm run smoke:readonly` | passed；`localSqliteWrites=false` |

SQLite 快照和 UI smoke 产物已归档到 `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T194500-unmerged-branch-ui-plan/`；smoke 后已恢复 pre-smoke SQLite。

### 下一批建议

| ID | Todo | 进入条件 | 停止条件 |
|---|---|---|---|
| B45 | PR #1 base decision packet | E52 完成 | 需要用户选择 merge/split/pause 时停止 |
| B46 | `codex/scm-ledger-workbench` salvage manifest | PR #1 不再漂移 | 发现 runtime/API/deploy 混改无法拆时停止 |
| B47 | mkt53 UI candidate branch | 用户确认跨 repo 开工或当前 SCM PR 暂停 | 测试失败或生产部署需求出现时停止 |
| B30 | SCM T8 RuntimeBusinessRowDesign builder extraction | RC 已稳定或明确暂停 release | `providerCalls`、production write、UI smoke 回归失败 |

## 7. 合并前人工选择

PR #1 不能只看 `MERGEABLE`。下一步必须在以下选择中择一：

| 选择 | 含义 | 风险 |
|---|---|---|
| A | 接受本地 `main` 的 15 个提交作为远端基线的一部分，让 PR #1 继续作为大 RC PR | 审查面极大；需确认 1412 files / 2M insertions 的远端基线提升是有意的。 |
| B | 从 `origin/main` 新建更小的 SCM release PR，只挑选当前 RC 必需文件 | 工作量更高，但审查面清晰。 |
| C | 暂停 PR #1 合并，只继续 manual gates / owner intake / UI salvage 规划 | 最稳，不推进生产。 |

推荐：**B**。原因是它满足可审计、可回滚和一 PR 一卡，不把历史大重构混入 read-only RC。

## 8. 边界声明

事实：本轮没有执行 merge、deploy、production read/write、provider call、ERP/OMS/WMS writeback。
推断：此前 Claude/UI 优化最可能集中在 `codex/scm-ledger-workbench` 和 mkt53 dirty UI 候选，但需要后续逐项 diff/截图验证，不能整体合并。
不确定项：PR #1 的最终合并策略、owner 审批、真实字段映射、SCEI 权重、生产部署窗口仍需人工决定。
