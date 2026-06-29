---
title: "SCM Ledger Workbench UI Salvage Manifest"
doc_type: execution_manifest
module: scm
topic: "ledger-workbench-ui-salvage"
status: draft
created: 2026-06-29
updated: 2026-06-29
owner: self
source: codex
boundary: "docs-only; no runtime code change; no SQLite mutation; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-readonly-rc-minimal-20260629"
source_branch: "codex/scm-ledger-workbench"
---

# SCM Ledger Workbench UI Salvage Manifest

## 1. 结论先行

本批只做 **UI 优化分支的盘点、分级和执行路由**，不合并 `codex/scm-ledger-workbench`，不搬运运行时代码。

事实：

- 当前 release 基线是 `codex/scm-readonly-rc-minimal-20260629@f5c6a0c`，已作为 draft PR #2 打到 `main`，范围是基于 `origin/main` 的最小只读 RC。
- 待盘点源分支是 `codex/scm-ledger-workbench@1a18fb2`。
- 两个分支 merge-base 是 `a680ed1`；源分支相对最小 RC 有 `82` 个提交。
- 直接 diff 规模为 `171 files changed, 32849 insertions(+), 31450 deletions(-)`。
- 直接 diff 会删除当前 00-53 分析文档、manual-gate CSV、runtime metadata、现有 `preprod/smoke` 脚本和已拆出的 panel 文件，同时修改 SQLite、Docker/deploy、`server/index.mjs`、`src/main.tsx`、`src/styles.css`。

推断：

- `codex/scm-ledger-workbench` 不是一个可直接合并的 UI 优化分支，而是混合了部署、SQLite、Provider readiness、Browser Harness、server 巨石、React 巨石和视觉样式的历史大分支。
- 它仍包含可复用的 UI/工作台设计资产，但必须先转成设计契约和拆分任务，再按小 PR 落地。

不确定项：

- 源分支中每一项 UI 改动的当前可运行性未逐一在最小 RC 基线上复现。
- Claude/UI 优化的视觉效果需要后续截图对照，不应仅凭提交名或旧 smoke 文档判断已适配当前产品。

## 2. 第一性原理排序

SCM 工作台上线前最小必要条件不是“页面更像成熟产品”，而是：

1. 可信数据：指标血缘、认证、权重、故事线、轨迹必须能解释来源。
2. 边界安全：`productionWrites=false / providerCalls=false / erpWriteback=false` 不被 UI 或服务端改动绕开。
3. 可验证：每个 PR 都能用本地 SQLite、preprod gate 和 smoke 脚本证明没有扩大写边界。
4. 可维护：`main.tsx` / `server/index.mjs` 的改动要受代码图谱拆分约束，不能用大爆炸重写换取短期 UI 观感。
5. 可用体验：在前四项成立后，再把长页面、卡片密度、分页、二级分区、KPI canvas 和角色工作台体验逐步补上。

因此，UI salvage 的优先级是 **PR #2 最小 RC 之后、运行时代码改动之前** 的设计债整理；它不能替代 03 指标工程 P0，也不能跳过认证/血缘/权重/轨迹这些内容工作。

## 3. 源分支风险切片

| 切片 | 观察到的事实 | 本批处理 |
|---|---|---|
| 当前分析集 | 源分支直接 diff 会删除 `aip-scm-node-deepdive-optimization-draft-20260627/00-53` | 禁止直接 merge；保留当前 00-54 为权威执行面 |
| SQLite | 源分支修改 `data/governance_workbench.sqlite`，尺寸从当前最小 RC 的本地账本变为历史账本 | 不搬运；后续只允许经 CSV/SQLite 契约、可回滚脚本和证据审计进入 |
| 部署 | 源分支包含 Docker、Nginx、PM2、volume、public deployment 记录 | 不搬运；production/deploy 另走授权链 |
| Provider readiness | 源分支包含 provider readiness、provider gateway、role provider governance | 不搬运；继续保持 provider disabled，`providerCalls=false` |
| Smoke/Preprod | 源分支会删除当前 `preprod-check.mjs`、`smoke-api.mjs`、`smoke-readonly.mjs`、`smoke-ui.mjs` | 不搬运；当前 RC smoke 脚本是 release gate |
| React 巨石 | 源分支重写 `src/main.tsx`，同时删除/回退当前 panel 拆分文件 | 不直接搬运；只能按代码图谱和页面边界小步重构 |
| Server 巨石 | 源分支重写 `server/index.mjs` 并引入多条新 API | 不直接搬运；先做 API 契约文档和 local-only gate |
| CSS/视觉 | 源分支有 Apple-like token、SaaS layout、分页和密度治理文档 | 可作为设计输入，但需截图对照和 current CSS token audit |

## 4. 可 salvage 的 UI 资产

| 优先级 | 可复用资产 | 来源证据 | 落地方式 | 前置条件 |
|---|---|---|---|---|
| P1 | Apple Support 风格 token：`#1d1d1f`、`#6e6e73`、`#f5f5f7`、`#0071e3`、SF/PingFang 字体栈、低阴影白底卡片 | `apple-support-ui-extraction-20260619.md` | 先做 CSS token audit 和截图对照，不复用 Apple 资产、不照搬 consumer hero | PR #2 合并或保持 stacked；无运行时代码变更 |
| P1 | SaaS 台账布局：透明 page container、明确 section surface、低噪 hairline、统一表格/控件节奏 | `p2-saas-layout-refinement-20260619.md` | 只改 `src/styles.css` 的公共 class，禁止改数据流 | 截图基线 + `smoke:ui` |
| P1 | 可读性 guardrail：summary/KPI grids 最小宽度、卡片文本不纵向断裂、badge/pill 不破碎 | `p2-readability-layout-refinement-20260619.md` | 小范围 CSS + Browser smoke 检查 horizontal overflow 和文字高度 | 当前页面截图清单 |
| P1 | 页面长度治理：分页、序号列、卡片内滚动、审计日志分页 | `p2-pagination-layout-governance-20260619.md` | 先抽通用 UI primitives，再按单页 PR 接入 | 不能删现有 panel 文件；不能替换 smoke gate |
| P1 | 页面二级分区：Object 360、ChatBI、AI 知识库、工作流编排、AI 对话、审计日志等工作区拆分 | `p2-page-section-information-architecture-20260620.md`、`p2-remaining-page-workflow-sections-20260620.md` | 先做 IA/spec，再挑一个长页面做 proof slice | 需要 codebase-memory 依赖图约束 `main.tsx` 拆分 |
| P2 | 角色工作台五区：概览、Action 草稿、Provider 治理、平台就绪、证据/指标 | `p2-role-kpi-canvas-refinement-20260619.md` | 不整体搬运；拆成 role UI spec、API read contract、local action draft gate | Provider 保持 disabled；Action 仍止于 local draft |
| P2 | KPI canvas 默认对象图、全屏预览、API 数据状态卡 | `p2-role-kpi-canvas-refinement-20260619.md` | 等 03 指标工程 P0 后再接入，避免把未认证指标图形化放大 | Top 指标血缘/认证完成 |
| P2 | ChatBI answerability scorecard、AI evidence export registry | `p2-semantic-operations-implementation-20260619.md` | 先做本地只读契约和证据导出格式，不新增 provider/NL2SQL | 认证指标和知识规则状态明确 |
| P3 | Role -> Rule -> ChatBI -> recommendation handoff 链路 | `p3a-role-rule-chatbi-linkage-implementation-20260620.md` | 仅作为后续闭环路线图；当前不搬 API/seed/rules | 03/02/04/05/06 内容链完成 |

## 5. 禁止 salvage 的内容

以下内容本轮和下一批 UI 小 PR 都不应直接搬运：

- `data/governance_workbench.sqlite` 整库替换。
- Docker/Nginx/PM2/volume 和 public deployment 配置。
- Provider readiness、gateway、dry-run、eval gate 的运行时代码。
- 任何会让 `providerCalls`、`productionWrites`、`erpWriteback` 变为 true 的实现。
- 删除或替换当前 `preprod:check`、`smoke:api`、`smoke:ui`、`smoke:readonly` 的脚本。
- 大规模重写 `server/index.mjs` 或 `src/main.tsx`。
- 未经 owner review 的 seed certification、rule certification、metric certification。

## 6. 统一执行计划

| 顺序 | PR/任务 | 范围 | 验收 |
|---|---|---|---|
| B54 | 本文档：UI salvage manifest | `aip-scm-node-deepdive.../54-*` + `00-index` | docs-only diff、`.pem` scan、`npm run check`、`npm run build`、preprod gate、read-only smoke |
| B55 | UI screenshot and token baseline | 新增截图/审计脚本或文档，不改 runtime | 当前最小 RC 15 页截图、viewport overflow、console error、token inventory |
| B56 | CSS token/readability slice | 仅 `src/styles.css` 和 smoke 断言 | before/after screenshot、`smoke:ui`、无 API/SQLite diff |
| B57 | 单页分页/二级分区 proof slice | 只选一个长页面，新增通用 UI primitive | page height ratio、pagination/section click smoke、行为保持 |
| B58 | KPI canvas/role workbench spec-to-code | 按 codebase-memory 依赖图拆 `main.tsx` | 03 指标认证完成后执行；KPI/role smoke 必须通过 |
| B59 | Semantic operations and evidence export | API read contract + local evidence export | no provider call、no NL2SQL、no production write、evidence package 可复核 |

## 7. 每个后续 PR 的不变量

- `productionWrites=false`
- `providerCalls=false`
- `erpWriteback=false`
- `controlledWritebackProduction=false`
- 动作上限：`suggestion_review_replay`
- 唯一允许写入目标：本地 SQLite，且要有快照、恢复和 smoke 后复核。
- 种子数据不得污染认证状态。
- 不把 local smoke、public read-only、production deployment 混为一谈。
- 不用 UI 文案暗示系统已经接入 ERP/OMS/WMS/TMS 或真实 provider。

## 8. 不确定项清理清单

| 不确定项 | 清理方法 | 责任边界 |
|---|---|---|
| Claude/UI 优化在当前最小 RC 上的真实视觉收益 | B55 截图对照；只读浏览器检查 | local/browser read-only |
| 旧 Browser Harness 里的页面高度阈值是否适配当前页面 | 先采当前高度分布，再定阈值 | 不以旧阈值直接卡当前 release |
| 源分支 role/KPI/API 改动是否会改写认证语义 | 先抽 API read contract，不搬 seed/certify POST | no provider/no production |
| Apple-like token 是否会导致品牌/版权误用 | 只保留通用色彩/字体/间距原则，不复用 Apple 资产或页面结构 | design reference only |
| 分页和二级分区是否影响现有 smoke locator | B57 单页 proof slice，先改 smoke，再扩面 | one PR one page family |

## 9. 本批验收口径

本批是 docs-only stacked PR，不宣称 UI 已优化，不宣称已合并 Claude 分支，不宣称生产可用。

必须保留的验收：

```bash
find . -name '*.pem' -print
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="$(pwd)" npm run preprod:check
npm run smoke:api
npm run smoke:ui
npm run smoke:readonly
```

验收结论只能写成：

- 事实：B54 文档和索引已更新。
- 事实：本地验证命令通过或列出失败项。
- 事实：无 provider call、无 production write、无 ERP/WMS/TMS writeback。
- 推断：源分支可拆出若干 UI 设计资产，但需要 B55-B59 逐项验证。
