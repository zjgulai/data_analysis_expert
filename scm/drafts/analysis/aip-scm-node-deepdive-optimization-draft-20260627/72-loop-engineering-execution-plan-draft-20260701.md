---
title: "AIP-SCM Loop Engineering 目标、组件约束与执行计划"
doc_type: execution_plan
module: scm
topic: loop-engineering-execution-plan
status: draft_loop20_scaffold_ready_manual_secret_file_required
created: 2026-07-01
updated: 2026-07-02
owner: self
source: human+ai
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  omsWmsWriteback: false
  localSqliteWrites: false
  priorLoopSqliteWrites: true
  businessRowsImported: false
  runtimeImportAuthorized: false
  actionCeiling: "production_config_scaffold_ready_no_secret_no_restart"
related:
  - "41-preproduction-readiness-plan-and-execution-draft-20260629.md"
  - "52-unmerged-branch-ui-priority-and-execution-plan-draft-20260629.md"
  - "71-scm-business-value-and-investment-case-draft-20260630.md"
  - "73-loop2-manual-gates-owner-packet-execution-draft-20260701.md"
  - "74-loop3-business-closed-loops-execution-draft-20260701.md"
  - "75-loop4-readonly-sample-design-execution-draft-20260701.md"
  - "76-loop5-release-boundary-execution-draft-20260701.md"
  - "77-loop6-production-readonly-smoke-execution-draft-20260701.md"
  - "78-loop7-provider-gate-preflight-execution-draft-20260701.md"
  - "79-loop8-provider-runtime-key-gate-execution-draft-20260701.md"
  - "80-loop9-provider-live-readiness-execution-draft-20260701.md"
  - "81-loop10-production-provider-authorization-gate-execution-draft-20260701.md"
  - "82-loop11-production-provider-runtime-key-gate-execution-draft-20260701.md"
  - "83-loop12-provider-live-acceptance-readiness-gate-execution-draft-20260701.md"
  - "84-loop13-provider-live-authorization-hold-gate-execution-draft-20260702.md"
  - "85-loop14-provider-live-smoke-runtime-key-mismatch-execution-draft-20260702.md"
  - "86-loop15-runtime-key-visibility-diagnostic-execution-draft-20260702.md"
  - "87-loop16-production-runtime-key-injection-execution-draft-20260702.md"
  - "88-loop17-provider-live-smoke-gate-recheck-execution-draft-20260702.md"
  - "89-loop18-deepseek-billing-vs-runtime-key-gate-execution-draft-20260702.md"
  - "90-loop19-production-runtime-key-injection-ops-handoff-draft-20260702.md"
  - "91-loop20-production-key-injection-scaffold-execution-draft-20260702.md"
---

# AIP-SCM Loop Engineering 目标、组件约束与执行计划

## 0. 本轮定义

当前仓库未发现独立的 `loop engineering` 五大组件定义文件。本方案按 AIP-SCM 工作台现有产品语义，将 Loop Engineering 固定为五个组件：

1. **Objective 目标**：明确本轮要闭合的业务结果和证据层级。
2. **State 状态**：以指标、数据、任务、人工 gate、代码健康和部署边界作为可观测状态。
3. **Action 动作**：把状态差距转为受控任务，动作止于本轮授权边界。
4. **Verification 验证**：每个动作必须有本地、只读、人工或生产只读证据，不跨层级升级结论。
5. **Memory 复盘**：把每轮结果沉淀为计划、ledger、证据包或候选经验，但不自动晋升长期记忆。

## 1. 总目标

**目标**：把当前 AIP-SCM 数据治理工作台从“本地只读原型可演示”推进到“可审计、可复现、可进入人工发布审批和业务 Owner 校准的循环执行系统”。

### 1.1 成功判定

| 层 | Done Criteria |
|---|---|
| 产品闭环 | 至少 3 条跨境电商供应链高频场景进入 `risk signal -> recommendation card -> owner review -> action task -> trace review` 的本地闭环。 |
| 数据可信 | Top 指标保持 certified baseline，补齐 sourceRoot 可复现链路，P0 字段映射和 Owner sign-off 不再停留在无主 pending。 |
| 安全边界 | `providerCalls=false`、`productionWrites=false`、`erpWriteback=false` 默认成立；任何升级必须单独授权。 |
| 发布治理 | read-only prototype 可从干净 release 边界打包，preprod hard blockers 为 0，manual gates 被显式列账。 |
| 经营价值 | 库存对账、缺货/超龄库存、尾程成本、履约异常、退货成本至少各有一个可追踪价值指标。 |

### 1.2 非目标

| 非目标 | 边界 |
|---|---|
| 直接生产部署 | 需要人工部署授权和生产只读 smoke。 |
| 自动写 ERP/OMS/WMS | 本方案不开放 writeback。 |
| 自动 provider 调用 | DeepSeek 仅在显式授权和 key 存在时进入单点验收。 |
| 编造业务审批 | P0 owner sign-off、field mapping、SCEI 权重必须来自真实 Owner 或正式来源。 |
| 大分支直接合并 | 当前 dirty worktree 和历史大分支只作为输入，不直接 merge。 |

## 2. 五大组件约束

### 2.1 Objective 目标组件

| 约束 | 内容 |
|---|---|
| 业务锚点 | 只围绕跨境电商供应链：多平台库存、海外仓履约、尾程成本、超龄库存、缺货风险、退货/逆向成本。 |
| 目标颗粒度 | 每个 loop 只闭合一个明确 slice，例如 sourceRoot 可复现、manual gate packet、decision-loop 场景、runtime sample design。 |
| 证据等级 | 目标必须声明目标证据层级：local static、local SQLite、local smoke、production read-only、manual review、authorized live side effect。 |
| 停止规则 | 一旦需要生产写入、provider call、真实 ERP/OMS/WMS 导入或人工审批，停止并等待授权。 |

### 2.2 State 状态组件

| 状态域 | 必采字段 | 当前基线 |
|---|---|---|
| 代码健康 | `npm run check`、`git diff --check` | 2026-07-01 通过 |
| 发布 gate | hard blockers、manual gates、dirtyCount | hard blockers 0；manual gates 3；dirtyCount 46 |
| 数据资产 | metrics、certifiedMetrics、lineageEdges、activeTags | metrics 178；certifiedMetrics 20；lineageEdges 278；activeTags 8 |
| 闭环资产 | recommendationCards、agentTraces、traceReviews、actionTasks、decisionLogs | 16 / 62 / 14 / 16 / 155 |
| 人工阻塞 | P0 owner sign-off、P0 field mapping、SCEI 权重 | 30 / 18 / 1 |
| 可复现性 | `import-assets.mjs` sourceRoot 是否存在 | `sourceRootExists=false` |

### 2.3 Action 动作组件

| 动作级别 | 允许动作 | 禁止动作 |
|---|---|---|
| L0 docs/read-only | 写计划文档、读 SQLite、跑 `check`、跑 `preprod:check`、跑 `git diff --check` | 写生产、调用 provider、修改业务逻辑 |
| L1 local prototype | 修复本地导入路径、补本地 fixture、更新只读 smoke、改本地 UI 闭环 | 导入真实业务行、回写 ERP/OMS/WMS |
| L2 manual review | 生成 owner intake packet、field mapping checklist、SCEI 权重决策包 | 替 Owner 做审批 |
| L3 production read-only | 只读访问 public health、GET/HEAD smoke | POST/PUT/DELETE、部署变更 |
| L4 authorized live | 单点 provider smoke 或受控系统动作 | 无授权时执行任何 live side effect |

### 2.4 Verification 验证组件

| 验证类型 | 命令/证据 | 通过标准 |
|---|---|---|
| Static | `npm run check` | TypeScript 无错误 |
| Diff hygiene | `git diff --check` | 无 whitespace/error |
| Preprod gate | `SCM_PREPROD_SCAN_ROOT=... npm run preprod:check` | hard blockers 0，manual gates 只列账不伪完成 |
| SQLite read-only | Node `DatabaseSync(..., {readOnly:true})` 计数 | 核心计数符合当前 baseline |
| Local smoke | `smoke:api` / `smoke:readonly` / `smoke:ui` | 只在需要页面/接口行为验证时执行；写入型 smoke 后必须恢复 SQLite |
| Production read-only | `SCM_WORKBENCH_READONLY_BASE_URL=... npm run smoke:readonly` | 部署授权后执行，`localSqliteWrites=false` |

### 2.5 Memory 复盘组件

| 输出 | 写入位置 | 规则 |
|---|---|---|
| Loop plan | `drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/` | 正式/草稿 Markdown 必须有 frontmatter |
| Evidence artifacts | `tmp/outputs/` 或 `~/.Codex/file-history/ecom_ana_overview_scm/` | 区分 pre-smoke、post-smoke、restored |
| SQLite ledger | 本地 SQLite | 只有受控 smoke 或本地 ledger 动作可写 |
| Candidate memory | `~/.codex/evolution/inbox/candidates.jsonl` | 仅失败、用户纠正、测试失败；不写 global |
| Final status | 当前计划文档 + 用户回复 | 必须区分事实、推断、不确定项 |

## 3. Loop 执行总路线

```text
Loop 0  基线确认与方案固化
  -> Loop 1  可复现导入链路
  -> Loop 2  Manual gates owner packet
  -> Loop 3  三个业务闭环场景强化
  -> Loop 4  只读样本接入设计
  -> Loop 5  Release 边界收敛
  -> Loop 6  生产只读 smoke（需授权）
  -> Loop 7  Provider 门禁预检（已完成）
  -> Loop 8  Provider runtime key gate（已完成；live 单点验收仍需 server-side key）
  -> Loop 9  Provider live-readiness（已完成；生产 provider status configured=false）
  -> Loop 10 Production provider authorization gate（已完成；live call 未执行）
  -> Loop 11 Production provider runtime key gate（已完成；live call 未执行）
  -> Loop 12 Provider live acceptance readiness gate（已完成；runtime key missing，live call 未执行）
  -> Loop 13 Provider live authorization hold gate（已完成；explicit live authorization missing，live call 未执行）
  -> Loop 14 Provider live smoke runtime key mismatch gate（已完成；status configured=false，live call 未执行）
  -> Loop 15 Runtime key visibility diagnostic（已完成；remote mutation/restart 未执行）
```

## 4. 执行计划

### Loop 0：基线确认与方案固化

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L0-1 读取现有计划与价值文档 | 1h | Codex | 无 | 读完 00/41/52/53 核心文档 | done |
| L0-2 跑静态和 preprod gate | 0.5h | Codex | L0-1 | `check`、`preprod:check`、`git diff --check` 通过 | done |
| L0-3 读取 SQLite baseline | 0.5h | Codex | L0-2 | 记录核心计数和 manual gates | done |
| L0-4 写本 Loop Engineering 计划 | 1h | Codex | L0-3 | 本文档落盘 | done |

### Loop 1：可复现导入链路

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L1-1 定位 `metric-system-blueprint` 源资产 | 2h | Data/Dev | L0 | 找到真实路径或确认缺失 | done：当前仓库与 git 历史未发现真实源资产 |
| L1-2 修复 `import-assets.mjs` sourceRoot 策略 | 4h | Dev | L1-1 | 支持显式 env/path fallback；不破坏当前 DB | done：支持 `SCM_WORKBENCH_IMPORT_SOURCE_ROOT`、`SCM_IMPORT_SOURCE_ROOT`、默认路径 |
| L1-3 增加 import source preflight | 3h | Dev | L1-2 | 源文件缺失时输出清晰 blocker，不产生半截 DB | done：缺源时在 SQLite 打开前停止 |
| L1-4 重新导入并跑验收 | 3h | Dev | L1-3 | `npm run import`、`check`、`preprod:check` 通过；核心计数不意外退化 | blocked：需要恢复真实 `metric-system-blueprint` 源资产后再执行写库导入 |

#### Loop 1 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | `business-supply-chain-knowledge-base-draft-20260616/metric-system-blueprint` 的三类源文件未在当前仓库和 git 历史中找到；现有 `data/import-summary.json` 只是保留了旧 sourceRoot 字段。 | local filesystem + git metadata |
| 事实 | `import-assets.mjs` 已改为 sourceRoot 多候选解析：`SCM_WORKBENCH_IMPORT_SOURCE_ROOT` -> `SCM_IMPORT_SOURCE_ROOT` -> 默认相对路径。 | local code change |
| 事实 | `SCM_IMPORT_PREFLIGHT_ONLY=1` 可只做源文件检查；缺少 metric blueprint 时输出 `blocked_source_required`，并在打开 SQLite 前停止。 | local command evidence |
| 事实 | 2026-07-16 post-stack review 后，授权 rebuild 已统一为 base import → 固定 allowlist migrations → integrity/count 验证；disposable fixture 证明六场景与 Loop3 九行增量不会因 rebuild 丢失。 | disposable local rebuild smoke；不等于真实源资产 import |
| 推断 | 当前问题不是单纯路径漂移，而是源资产未随原型一起进入当前工作树。 | 基于当前仓库、git 历史与项目目录检索 |
| 未完成 | 未执行 DB-writing `npm run import`，因此未声称新导入成功，也未改变当前 SQLite 基线。 | boundary: localSqliteWrites=false |

**Loop 1 下一动作**：恢复或提供真实 `metric-system-blueprint` 目录后，使用 `SCM_WORKBENCH_IMPORT_SOURCE_ROOT=<真实路径> npm run import` 执行导入，再复跑 `check`、`preprod:check` 和 SQLite baseline 对比。

### Loop 2：Manual Gates Owner Packet

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L2-1 导出 P0 owner sign-off 清单 | 2h | Data Governance | L0 | 30 条 P0 owner gate 转成 owner intake 表 | done：`loop2-owner-signoff-intake-20260701.csv` |
| L2-2 导出 P0 field mapping 清单 | 2h | Data Governance | L0 | 18 条 field mapping gate 带来源、字段、粒度、风险 | done：`loop2-field-mapping-intake-20260701.csv` |
| L2-3 生成 SCEI 权重决策包 | 3h | Product/Data | L0 | 权重来源问题变成 A/B/C 决策，不自动填值 | done：5 条 SCEI child weight intake；未回填权重 |
| L2-4 汇总 manual gate ledger | 2h | Product | L2-1/2/3 | 每条 gate 有 owner、所需证据、截止状态 | done：49 条 manual gate ledger |

#### Loop 2 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 已生成 6 个本地人工评审产物：owner sign-off intake、field mapping intake、SCEI weight intake、manual gate ledger、owner/status rollup、evidence summary。 | local SQLite read-only export |
| 事实 | 30 条 `owner_signoff` 仍为 `未发起`；18 条 `field_mapping` 仍为 `待确认`；1 条 SCEI owner decision 仍为 `owner_decision_packet_ready`。 | local SQLite read-only |
| 事实 | SCEI 5 条 child weights 仍为空；本轮没有写入 `kpi_tree.weight`。 | local SQLite read-only |
| 推断 | intake 包可以减少人工 review 前的信息整理成本，但不构成 owner 批准。 | 基于本地导出结构 |
| 未完成 | 真实 owner、真实源字段证据、SCEI 五维权重和依据仍需人工返回。 | manual review required |

### Loop 3：三个业务闭环场景强化

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L3-1 库存风险闭环 | 6h | Product/Dev | L1/L2 | FBA/TikTok/Walmart 缺货或负可用库存进入 scenario -> recommendation -> action task -> trace review | done：`scenario_loop3_inventory_stockout_three_way_20260701` |
| L3-2 成本风险闭环 | 6h | Product/Dev | L1/L2 | 尾程/仓储/退货费用异常进入 finance-cost governance 与 decision loop | done：`scenario_loop3_finance_cost_tail_warehouse_return_20260701` |
| L3-3 履约风险闭环 | 6h | Product/Dev | L1/L2 | 发货及时率、在途时效、配送异常进入 logistics-control role workbench | done：`scenario_loop3_fulfillment_eta_delivery_exception_20260701` |
| L3-4 闭环复盘报告 | 3h | Product | L3-1/2/3 | 每个场景有 trace、owner choice、action boundary、验证截图或 API 证据 | done：`74-loop3-business-closed-loops-execution-draft-20260701.md` |

#### Loop 3 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 三条闭环已进入本地 SQLite：库存风险、成本风险、履约风险均有 scenario、recommendation、trace、trace review、action。 | local SQLite ledger |
| 事实 | 本轮新增成本场景本地闭环，并把已有库存/履约闭环显式挂到 AIP scenario board。 | local SQLite ledger |
| 事实 | 写入后核心闭环计数为 recommendationCards 16、agentTraces 62、traceReviews 14、actionTasks 16、decisionLogs 155。 | local SQLite read |
| 推断 | 这些闭环足以支持产品演示和 owner review，但不构成生产闭环或真实运营处置。 | 基于本地原型证据 |
| 未完成 | 真实业务行、真实源字段、SCEI 权重、ETA/审核时效口径仍待 Loop 4/人工 gate。 | manual review + readonly sample required |

### Loop 4：只读样本接入设计

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L4-1 样本字段 allowlist 校准 | 4h | Data Governance | L2 | 62 allowlist、26 excluded sensitive fields 复核 | done：`loop4-field-policy-20260701.csv` + `loop4-excluded-sensitive-fields-20260701.csv` |
| L4-2 脱敏样本包模板 | 4h | Data | L4-1 | 明确字段、粒度、脱敏规则、禁止原始敏感标识 | done：库存、成本、履约 3 份空模板 |
| L4-3 DQ 检查规格 | 4h | Data | L4-2 | 空值、负值、重复 key、粒度冲突、平台公式差异规则落表 | done：19 条 DQ 规则 |
| L4-4 Runtime import gate 设计评审 | 3h | Product/Security | L4-1/2/3 | 保持 `businessRowsImported=false`，只进入设计审批 | done：10 条 import gate，`runtimeImportAuthorized=false` |

#### Loop 4 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 已生成 Loop 4 设计包：62 个 allowlist 字段、26 个 excluded sensitive identifier 字段、3 份空模板、19 条 DQ 规则、10 条 import gate。 | local file artifacts |
| 事实 | 三份模板只有表头，`templateRowsIncluded=0`。 | local file artifacts |
| 事实 | 本轮 `localSqliteWrites=false`，没有导入业务行，也没有读取源系统。 | local command evidence |
| 事实 | `npm run check`、`preprod:check`、`git diff --check` 已复跑；hard blockers 0、manual gates 3、dirtyCount 31。 | local verification |
| 推断 | 当前设计包可以进入 Product/Security/Data Governance 评审。 | 基于 runtime metadata projection |
| 未完成 | 真实样本行、token map 保存位置、样本保留周期和 runtime import 仍需人工审批。 | manual review required |

### Loop 5：Release 边界收敛

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L5-1 干净 release file set manifest | 4h | Release Owner | L1/L2/L3 | 不包含历史大分支和无关 dirty 文件 | done：34 个 dirty entries 已分类 |
| L5-2 Release worktree 或原子 staging | 4h | Dev | L5-1 | `dirtyCount=0` 的打包边界 | done：temp-index staging preview 33 paths，blocked 0；真实 index 未变 |
| L5-3 preprod/check/build/smoke 复跑 | 4h | Dev | L5-2 | hard blockers 0，smoke 后 SQLite 可恢复 | done：check/build/preprod/API/UI/readonly smoke 已复跑并恢复 SQLite |
| L5-4 PR/部署审批包 | 3h | Product/Release | L5-3 | 用户可选择 merge/split/pause/deploy-readonly | done：approval options A/B/C/D 已落表 |

#### Loop 5 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 当前 dirty worktree 34 个 entries 已分为 release-critical 8、release-evidence 4、provider-gated support 1、support-evidence 2、hold-out 19。 | local git status |
| 事实 | 本轮不执行真实 `git add`、commit、push；只做 release packet 和 temp-index staging preview。 | local release boundary |
| 事实 | Temp-index staging preview 纳入 33 个路径，blocked staged path 为 0，真实 git index 未改变。 | temp-index preview |
| 事实 | `npm run check`、`npm run build`、`preprod:check`、`smoke:api`、`smoke:ui`、`smoke:readonly` 已复跑；最终 SQLite hash 与 smoke 前备份一致。 | local verification + file-history snapshot |
| 推断 | 当前最稳妥的 release 做法是按 Chunk A/B/C 原子纳入，Chunk D 保持 hold-out。 | 基于 41/47 既有 release 原则 |
| 未完成 | 真实 staging、commit、push、PR 更新、生产只读 smoke 仍需人工选择和授权。 | manual approval required |

### Loop 6：生产只读 smoke（授权后）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L6-1 确认生产 URL/volume/network | 1h | Ops | L5 + 授权 | 只读目标明确 | done：`https://scm.lute-tlz-dddd.top`，health 显示 external volume 字段 |
| L6-2 执行 production read-only smoke | 1h | Ops/Dev | L6-1 | GET/HEAD only，通过并记录边界 | done：health GET、CSV HEAD、app HEAD、`smoke:readonly` 通过 |
| L6-3 生产状态回填 | 1h | Product | L6-2 | 明确 production read-only status，不宣称写入 | done：`77-loop6-production-readonly-smoke-execution-draft-20260701.md` |

#### Loop 6 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 生产 URL `https://scm.lute-tlz-dddd.top` 当前可达：health GET 200、静态 CSV HEAD 200、app HEAD 200。 | production read-only |
| 事实 | `SCM_WORKBENCH_READONLY_BASE_URL=https://scm.lute-tlz-dddd.top npm run smoke:readonly` 通过，边界为 `localSqliteWrites=false`、`productionWrites=false`、`providerCalls=false`、`erpWriteback=false`。 | production read-only |
| 事实 | 当前生产 release id 为 `scm-workbench-ui-polish-20260627003850`，git sha label 为 `c1633fe-ui-polish-20260627`。 | production health JSON |
| 事实 | 当前生产计数：metrics 178、AIP scenarios 3、recommendation cards 3、agent traces 1、trace reviews 0。 | production health + read-only smoke |
| 推断 | 线上 read-only prototype 可作为后续 release 对照基线。 | 基于 GET/HEAD 证据 |
| 不确定项 | 这不证明 Loop 5 release packet 已上线；也未直接执行生产服务器 `docker inspect`。 | production deployment not executed |

### Loop 7：Provider 单点验收（授权后）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L7-1 授权与 key runtime 检查 | 1h | Security/Ops | 用户授权 | `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1` 且 key 仅 server side | gate done：授权 flag 单次设置；runtime key 未配置，停在 key gate |
| L7-2 knowledge mode 单 prompt smoke | 1h | Dev | L7-1 | evidence redacted；trace/run 生成；no external write | not_run：未进入 provider live call |
| L7-3 Provider 结论审计 | 1h | Product | L7-2 | 回答仅作为候选知识/建议，不证明生产事实 | not_run：等待 live smoke 证据 |

#### Loop 7 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 已执行 provider gate preflight；本地环境未设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED`，未设置 `DEEPSEEK_API_KEY`。 | local env presence check |
| 事实 | `smoke:deepseek-live` 停在 `blocked_authorization_flag_missing`，证据中 `providerCalls=false`、`providerModeCalled=not_called`、`webModeCalled=false`。 | local gate preflight |
| 事实 | 本轮没有 provider call、production write、ERP/OMS/WMS writeback、source system read、business row import，也没有持久化 key。 | local evidence JSON |
| 事实 | SQLite hash 保持 `cb91dd0d63dad2d62d73f7da5c7058254b08ac36feb139921a38121dcf61cc99`。 | local file hash |
| 事实 | `npm run check`、`preprod:check`、`git diff --check` 已复跑；hard blockers 0、manual gates 3、dirtyCount 38。 | local verification |
| 推断 | provider live 验收脚本具备 fail-closed 门禁；未授权时不会进入单 prompt live call 分支。 | 基于脚本审计和门禁证据 |
| 不确定项 | 尚未验证真实 DeepSeek 响应、trace/run 写入、usage 计量、latency 和回答质量；这些需要另行授权并配置 server-side key。 | authorized live side effect required |

### Loop 8：Provider runtime key gate（授权 flag 后）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L8-1 常驻 env presence check | 0.25h | Dev/Ops | Loop 7 | `DEEPSEEK_API_KEY_PRESENT=0`，避免误入 live call | done |
| L8-2 授权 flag 单次 key gate smoke | 0.5h | Dev/Ops | L8-1 | `blocked_runtime_key_missing`，`providerCalls=false` | done |
| L8-3 evidence + plan 回填 | 0.5h | Product/Dev | L8-2 | 明确 live provider call 未执行，下一 gate 需要 server-side key | done |

#### Loop 8 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 常驻环境中 `DEEPSEEK_API_KEY_PRESENT=0`，`SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=0`。 | local env presence check |
| 事实 | 本轮仅在单次 smoke 命令中设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`。 | local command env |
| 事实 | `smoke:deepseek-live` 停在 `blocked_runtime_key_missing`，证据中 `providerCalls=false`、`providerModeCalled=not_called`、`webModeCalled=false`。 | local key gate |
| 事实 | 本轮没有 provider call、production write、ERP/OMS/WMS writeback、source system read、business row import，也没有持久化 key。 | local evidence JSON |
| 事实 | SQLite hash 保持 `cb91dd0d63dad2d62d73f7da5c7058254b08ac36feb139921a38121dcf61cc99`。 | local file hash |
| 事实 | `npm run check`、`preprod:check`、`git diff --check` 已复跑；hard blockers 0、manual gates 3、dirtyCount 40。 | local verification |
| 推断 | provider live gate 的第二道 fail-closed 行为成立：授权 flag 已给出但 runtime key 缺失时，脚本停在 key gate。 | 基于脚本审计和门禁证据 |
| 不确定项 | 尚未验证真实 DeepSeek 响应、trace/run 写入、usage 计量、latency 和回答质量；下一 gate 需要 server-side key 与单独 live call 授权。 | authorized live side effect required |

### Loop 9：Provider live-readiness（生产只读）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L9-1 本地 env presence check | 0.25h | Dev/Ops | Loop 8 | key/auth flag 只记录布尔值，不输出 secret | done |
| L9-2 生产 provider status GET | 0.5h | Dev/Ops | L9-1 | `configured=false` 或 ready 状态可审计；GET only | done：`configured=false` |
| L9-3 live smoke authorization packet | 0.5h | Product/Security | L9-2 | 下一 gate 的 key、授权、mode、evidence redaction 条件明确 | done |

#### Loop 9 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 本地 shell 中 `DEEPSEEK_API_KEY_PRESENT=false`，`SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=false`。 | local env presence |
| 事实 | 生产 `/api/deploy/health` GET 200，边界仍为 `productionWrites=false`、`providerCalls=false`、`erpWriteback=false`。 | production read-only GET |
| 事实 | 生产 release 为 `scm-workbench-ui-polish-20260627003850` / `c1633fe-ui-polish-20260627`。 | production health |
| 事实 | 生产 `/api/ai-chat/deepseek/status` GET 200，`configured=false`，`secretPolicy=server_side_env_only_key_never_returned_to_browser`。 | production read-only GET |
| 事实 | 本轮未执行 provider live call、production write、ERP/OMS/WMS writeback、source system read、business row import，也未持久化 key。 | evidence JSON |
| 事实 | `npm run check`、`preprod:check`、`git diff --check` 已复跑；hard blockers 0、manual gates 3、dirtyCount 42。 | local verification |
| 推断 | 当前只具备 live smoke runbook 准备条件；真实 provider 调用验收仍需 server-side key 与单独授权。 | 基于生产 provider status |
| 不确定项 | DeepSeek 响应质量、trace/run 写入、usage 计量、latency、evidence redaction 的 live 路径仍未验证。 | authorized live side effect required |

### Loop 10：Production provider authorization gate（生产 base URL）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L10-1 确认本地常驻 key/auth flag | 0.25h | Dev/Ops | Loop 9 | `DEEPSEEK_API_KEY_PRESENT=0`，`SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=0` | done |
| L10-2 生产 base URL 未授权 smoke gate | 0.5h | Dev/Ops | L10-1 | `blocked_authorization_flag_missing`，`providerCalls=false` | done |
| L10-3 evidence + plan 回填 | 0.5h | Product/Dev | L10-2 | 明确生产路径下 live call 未执行 | done |

#### Loop 10 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 本地常驻环境中 `DEEPSEEK_API_KEY_PRESENT=0`，`SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=0`。 | local env presence |
| 事实 | 使用生产 base URL 执行 `smoke:deepseek-live`，未设置授权 flag。 | production base URL + local command env |
| 事实 | 脚本停在 `blocked_authorization_flag_missing`，证据中 `providerCalls=false`、`providerModeCalled=not_called`、`webModeCalled=false`。 | production authorization gate |
| 事实 | 本轮未执行 provider live call、POST chat、production write、ERP/OMS/WMS writeback、source system read 或 business row import。 | evidence JSON |
| 事实 | `npm run check`、`preprod:check`、`git diff --check` 已复跑；hard blockers 0、manual gates 3、dirtyCount 44。 | local verification |
| 推断 | 生产路径下授权门禁有效；授权 flag 是进入 key gate 或 live call 的必要条件。 | 基于 smoke gate 证据 |
| 不确定项 | 真实 provider call、trace/run 写入、usage 计量、latency 和回答质量仍需 server-side key 与单独 live call 授权。 | authorized live side effect required |

### Loop 11：Production provider runtime key gate（生产 base URL + 授权 flag）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L11-1 确认本地常驻 key/auth flag | 0.25h | Dev/Ops | Loop 10 | `DEEPSEEK_API_KEY_PRESENT=0`，`SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=0` | done |
| L11-2 生产 base URL 授权 flag key gate | 0.5h | Dev/Ops | L11-1 | `blocked_runtime_key_missing`，`providerCalls=false` | done |
| L11-3 evidence + plan 回填 | 0.5h | Product/Dev | L11-2 | 明确生产路径下 live call 未执行，下一步需要 server-side key | done |

#### Loop 11 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 本地常驻环境中 `DEEPSEEK_API_KEY_PRESENT=0`，`SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=0`。 | local env presence |
| 事实 | 使用生产 base URL 执行 `smoke:deepseek-live`，并在单次命令中设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`。 | production base URL + local command env |
| 事实 | 脚本停在 `blocked_runtime_key_missing`，证据中 `providerCalls=false`、`providerModeCalled=not_called`、`webModeCalled=false`。 | production runtime key gate |
| 事实 | 本轮未执行 provider live call、POST chat、production write、ERP/OMS/WMS writeback、source system read 或 business row import。 | evidence JSON |
| 事实 | `npm run check`、`preprod:check`、`git diff --check` 已复跑；hard blockers 0、manual gates 3、dirtyCount 46。 | local verification |
| 推断 | 生产路径下 runtime key gate 有效；server-side key 是进入 live provider call 的必要条件。 | 基于 smoke gate 证据 |
| 不确定项 | 真实 provider call、trace/run 写入、usage 计量、latency 和回答质量仍需 server-side key 与单独 live call 授权。 | authorized live side effect required |

### Loop 12：Provider live acceptance readiness gate（production read-only）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L12-1 本地常驻 env presence check | 0.25h | Dev/Ops | Loop 11 | 只输出 `DEEPSEEK_API_KEY` 与授权 flag 是否存在，不输出 secret | done |
| L12-2 production health/status GET | 0.5h | Dev/Ops | L12-1 | GET `/api/deploy/health` 与 `/api/ai-chat/deepseek/status`，不 POST chat | done |
| L12-3 live acceptance 审批条件固化 | 0.5h | Product/Security | L12-2 | 明确下一轮必须具备 server-side key + 显式 live 授权 | done |

#### Loop 12 执行记录（2026-07-01）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 本地常驻环境中 `DEEPSEEK_API_KEY_PRESENT=0`，`SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=0`。 | local env presence |
| 事实 | production `/api/deploy/health` GET 可达，production `/api/ai-chat/deepseek/status` GET 可达。 | production read-only GET |
| 事实 | production provider status 仍为 `configured=false`，Loop 12 状态为 `blocked_server_side_runtime_key_missing`。 | production read-only provider readiness |
| 事实 | 本轮未执行 provider live call、POST chat、production write、ERP/OMS/WMS writeback、source system read、business row import 或 key 持久化。 | evidence JSON |
| 推断 | 当前只能推进审批包和 runtime key 配置准备，不能把“继续 loop”解释成 live provider call 授权。 | 基于 live side effect 边界 |
| 不确定项 | 真实 DeepSeek 响应、trace/run 写入、usage 计量、latency、回答质量与 live evidence redaction 仍未验证。 | authorized live side effect required |

### Loop 13：Provider live authorization hold gate（production read-only）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L13-1 本地常驻 env presence check | 0.25h | Dev/Ops | Loop 12 | 只输出 key/auth flag 布尔值，不输出 secret | done |
| L13-2 production health/status GET | 0.25h | Dev/Ops | L13-1 | GET only，不设置 live auth flag，不 POST chat | done |
| L13-3 authorization hold evidence | 0.5h | Product/Security | L13-2 | 明确“继续 loop”不等价于 provider live call 授权 | done |

#### Loop 13 执行记录（2026-07-02）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | production `/api/deploy/health` 与 `/api/ai-chat/deepseek/status` GET 均可达。 | production read-only GET |
| 事实 | production provider status 仍为 `configured=false`。 | production read-only provider status |
| 事实 | 本轮没有设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`，没有发起 POST chat，没有 provider call。 | authorization hold evidence |
| 事实 | evidence 显示 `providerCalls=false`、`providerModeCalled=not_called`、`productionWrites=false`、`localSqliteWrites=false`。 | evidence JSON |
| 推断 | 当前最高可执行动作仍是 authorization hold；进入 live provider smoke 需要明确授权语句和 production server-side key。 | 基于 live side effect 边界 |
| 不确定项 | 真实 DeepSeek 响应、trace/run 写入、usage 计量、latency、回答质量与 live evidence redaction 仍未验证。 | authorized live side effect required |

### Loop 14：Provider live smoke runtime key mismatch gate（authorized live preflight）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L14-1 接收 explicit live authorization | 0.25h | Product/Security | Loop 13 | 用户明确授权一次 knowledge-mode provider live smoke | done |
| L14-2 production provider status 复核 | 0.25h | Dev/Ops | L14-1 | GET status；若 `configured=false`，后续只能停在 key gate | done：`configured=false` |
| L14-3 授权 flag smoke | 0.5h | Dev/Ops | L14-2 | 带 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1` 执行脚本；runtime key 未识别时 `providerCalls=false` | done：`blocked_runtime_key_missing` |
| L14-4 evidence + plan 回填 | 0.5h | Product/Dev | L14-3 | 明确人工确认与 runtime status 不一致，live call 未执行 | done |

#### Loop 14 执行记录（2026-07-02）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 用户已明确授权一次 knowledge-mode DeepSeek provider live smoke，并确认 production server-side key 已配置。 | conversation authorization |
| 事实 | production `/api/ai-chat/deepseek/status` 返回 `configured=false`。 | production read-only status |
| 事实 | 带授权 flag 执行 `smoke:deepseek-live` 后，脚本停在 `blocked_runtime_key_missing`。 | authorized live gate preflight |
| 事实 | evidence 显示 `providerCalls=false`、`providerModeCalled=not_called`、`webModeCalled=false`、`productionWrites=false`、`localSqliteWrites=false`。 | evidence JSON |
| 推断 | production runtime 尚未识别 server-side key；需要 Ops 复核环境变量注入、容器重启或目标实例一致性。 | 基于 status endpoint 与 smoke evidence |
| 不确定项 | 真实 DeepSeek 响应、trace/run 写入、usage 计量、latency、回答质量与 live evidence redaction 仍未验证。 | authorized live side effect required |

### Loop 15：Runtime key visibility diagnostic（production read-only + local config inspection）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L15-1 复核 production status endpoint | 0.25h | Dev/Ops | Loop 14 | GET status 仍只读，记录 `configured` | done：`configured=false` |
| L15-2 检查 server key 读取路径 | 0.25h | Dev | L15-1 | 明确读取 `process.env.DEEPSEEK_API_KEY` 或容器内 `.env/.env.local` | done |
| L15-3 检查 production Compose 注入路径 | 0.25h | Dev/Ops | L15-2 | 核对 Compose 是否声明 `DEEPSEEK_API_KEY` 或 `env_file` | done：未声明 |
| L15-4 生成 Ops 只读命令包 | 0.5h | Dev/Ops | L15-3 | 命令只输出布尔/redacted 信息，不输出 secret | done |

#### Loop 15 执行记录（2026-07-02）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | production `/api/ai-chat/deepseek/status` 当前返回 `configured=false`。 | production read-only GET |
| 事实 | server 读取 `process.env.DEEPSEEK_API_KEY`，并在启动时加载容器内 `/app/.env`、`/app/.env.local`。 | local code inspection |
| 事实 | 当前 `docker-compose.yml` 与 `docker-compose.production.yml` 没有注入 `DEEPSEEK_API_KEY` 或 `env_file`。 | local config inspection |
| 事实 | 本轮没有执行远端 shell、production env 修改、容器重启、provider call、production write 或 ERP/OMS/WMS writeback。 | evidence JSON |
| 推断 | 当前最强 root-cause candidate 是 production runtime 没有把 key 暴露给正在服务公网域名的 Node 进程。 | status endpoint + config inspection |
| 不确定项 | 远端实际 Compose config、container env、`/app/.env.local` 文件存在性和容器最近一次重启时间仍需 Ops 只读命令确认。 | production read-only shell required |

### Loop 16：Production runtime key injection gate（remote read-only diagnostic; env mutation not executed）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L16-1 确认远端 SSH 与目标 release 目录 | 0.25h | Dev/Ops | Loop 15 + 用户授权 | 目标机和 `/opt/scm-governance-workbench/current` 可访问 | done |
| L16-2 只读检查 Compose / container / Node runtime key presence | 0.5h | Dev/Ops | L16-1 | 只输出布尔或 redacted 信息 | done：均未发现 key |
| L16-3 查找可注入的 server-side key 来源 | 0.5h | Dev/Ops | L16-2 | 若存在真实 key 来源则注入；若不存在则停止 | blocked：未发现真实 key 来源 |
| L16-4 注入 env 并重建/重启容器 | 0.5h | Dev/Ops | L16-3 | status endpoint 变为 `configured=true` | not_executed：无真实 key 来源 |
| L16-5 复核 provider live smoke gate | 0.5h | Dev/Ops | L16-4 + 再次授权 | knowledge-mode provider live smoke 单点通过 | not_executed |

#### Loop 16 执行记录（2026-07-02）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 远端 `tencent-lighthouse` 可访问，当前目录为 `/opt/scm-governance-workbench/current`，容器 `scm-governance-workbench` 处于 healthy。 | production remote read-only shell |
| 事实 | production `/api/ai-chat/deepseek/status` 仍返回 `configured=false`。 | production read-only GET |
| 事实 | 远端 Compose 渲染结果、container env、Node runtime env、容器内 `/app/.env`/`/app/.env.local` 均没有 `DEEPSEEK_API_KEY`。 | production remote read-only shell |
| 事实 | 当前 release `.env` 存在但不含 key；`.env.local`、`.env.production.local`、`docker-compose.override.yml` 不存在。 | production remote read-only shell |
| 事实 | SSH shell env、sudo/root/systemd 常见位置、本地 shell 均没有可直接注入的真实 key 来源。 | boolean/redacted presence diagnostic |
| 事实 | 本轮没有执行 production env mutation、container restart/recreate、provider call、production business write、ERP/OMS/WMS writeback 或 local SQLite write。 | evidence JSON |
| 推断 | “production server-side key 已配置”的人工确认与当前可访问生产 runtime 不一致；key 可能位于错误实例、错误用户/session、外部 secret manager，或尚未被 Compose 注入。 | runtime diagnostic |
| 不确定项 | 真实 key 是否存在于未授权访问的外部 secret manager 或另一台服务器，本轮无法验证。 | Ops key input required |

### Loop 17：Provider live smoke gate recheck（production read-only; no provider call）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L17-1 复核 production provider status | 0.25h | Dev/Ops | Loop 16 + 用户同意下一步 | status endpoint fresh GET | done：`configured=false` |
| L17-2 复核当前 runtime key presence | 0.25h | Dev/Ops | L17-1 | Node runtime、env 文件、shell env 只读 presence check | done：key absent |
| L17-3 判定是否进入 provider live smoke | 0.25h | Dev/Ops | L17-2 | 仅 `configured=true` 且 key 可见时进入 | blocked：未满足前置条件 |
| L17-4 knowledge-mode provider live smoke | 0.5h | Dev/Ops | L17-3 + provider call 授权 | 单点 live evidence | not_executed |

#### Loop 17 执行记录（2026-07-02）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | production `/api/ai-chat/deepseek/status` fresh GET 仍返回 `configured=false`。 | production read-only GET |
| 事实 | 当前生产 Node runtime、容器 env 文件、release 候选 env 文件和 SSH shell env 仍没有可见 `DEEPSEEK_API_KEY`。 | production remote read-only shell |
| 事实 | 本地 shell 也没有 `DEEPSEEK_API_KEY` 或 provider 授权 flag 常驻值。 | local env presence |
| 事实 | 本轮没有执行 provider live smoke、production env mutation、container restart/recreate、production business write、ERP/OMS/WMS writeback 或 local SQLite write。 | evidence JSON |
| 推断 | Loop 16 的 blocker 仍未解除；继续 provider live smoke 只会再次停在 runtime key gate。 | provider status + runtime presence |
| 不确定项 | health 中 `agentTraces` 与 `agentRuns` 计数较上一轮公开输出有变化；本轮没有 POST 或 provider call，若影响审计需单独追踪来源。 | separate audit required if material |

### Loop 18：DeepSeek billing vs runtime key gate（production read-only; no provider call）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L18-1 记录 billing/top-up 输入 | 0.1h | Dev/Ops | 用户确认 | 区分 conversation evidence 与 runtime evidence | done |
| L18-2 复核 production provider status | 0.25h | Dev/Ops | L18-1 | status endpoint fresh GET | done：`configured=false` |
| L18-3 复核 runtime key presence | 0.25h | Dev/Ops | L18-2 | Node runtime、env 文件、shell env 只读 presence check | done：key absent |
| L18-4 判定是否进入 provider live smoke | 0.25h | Dev/Ops | L18-3 | 仅 `configured=true` 且 key 可见时进入 | blocked：billing confirmed but runtime key absent |
| L18-5 knowledge-mode provider live smoke | 0.5h | Dev/Ops | L18-4 | 单点 live evidence | not_executed |

#### Loop 18 执行记录（2026-07-02）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 用户确认 DeepSeek 已充值；该证据只覆盖 billing/quota gate。 | conversation evidence |
| 事实 | production `/api/ai-chat/deepseek/status` fresh GET 仍返回 `configured=false`。 | production read-only GET |
| 事实 | 当前生产 Node runtime、容器 env 文件、release 候选 env 文件和 SSH shell env 仍没有可见 `DEEPSEEK_API_KEY`。 | production remote read-only shell |
| 事实 | 本地 shell 也没有 `DEEPSEEK_API_KEY` 或 provider 授权 flag 常驻值。 | local env presence |
| 事实 | 本轮没有执行 provider live smoke、production env mutation、container restart/recreate、production business write、ERP/OMS/WMS writeback 或 local SQLite write。 | evidence JSON |
| 推断 | billing/quota 风险可能已解除，但 runtime key visibility blocker 仍存在；继续 provider live smoke 仍会停在 runtime key gate。 | provider status + runtime presence |
| 不确定项 | 真实 key 是否已在 DeepSeek 控制台可用、是否在外部 secret manager 中配置、是否由 Ops 配在另一台机器，本轮无法从当前 production runtime 验证。 | Ops key input required |

### Loop 19：Production runtime key injection Ops handoff（no runtime mutation）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L19-1 设计 server-side secret 注入路径 | 0.25h | Dev/Ops | Loop 18 | 使用 secret file + compose override，不写 key 到仓库 | done |
| L19-2 写入 Ops handoff packet | 0.5h | Dev/Ops | L19-1 | 包含预检、注入、重建、验收、回滚命令 | done |
| L19-3 验证 handoff 不含真实 secret | 0.25h | Dev | L19-2 | secret-like scan 通过 | done |
| L19-4 执行生产 env mutation | 0.5h | Ops | L19-2 + 真实 key | status endpoint `configured=true` | not_executed：manual secret input required |
| L19-5 knowledge-mode provider live smoke | 0.5h | Dev/Ops | L19-4 + live smoke 授权 | 单点 live evidence | not_executed |

#### Loop 19 执行记录（2026-07-02）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | production `/api/ai-chat/deepseek/status` fresh GET 仍返回 `configured=false`。 | production read-only GET |
| 事实 | 已生成 Ops handoff packet，明确使用 `/opt/scm-governance-workbench/secrets/deepseek.env` + `docker-compose.deepseek-runtime.yml` 注入 key。 | ops handoff |
| 事实 | handoff 只包含交互式输入和 placeholder 命令，不包含真实 key。 | secret hygiene check |
| 事实 | 本轮没有执行 production env mutation、container restart/recreate、provider call、production business write、ERP/OMS/WMS writeback 或 local SQLite write。 | evidence JSON |
| 推断 | 这是当前 blocker 下唯一可推进的下一步；继续重复 smoke 不会改变 `configured=false`。 | loop evidence |
| 不确定项 | Ops 何时输入真实 key、重建容器后 health/status 是否通过，仍需下一轮 production evidence。 | manual execution required |

### Loop 20：Production key injection scaffold（no secret; no restart）

| Task | Effort | Owner | Depends On | Done Criteria | 状态 |
|---|---:|---|---|---|---|
| L20-1 创建 server-side secret 目录 | 0.1h | Dev/Ops | Loop 19 + 用户继续授权 | `/opt/scm-governance-workbench/secrets` present | done |
| L20-2 创建 Compose override 文件 | 0.1h | Dev/Ops | L20-1 | `docker-compose.deepseek-runtime.yml` present | done |
| L20-3 确认没有写入真实 key | 0.1h | Dev/Ops | L20-2 | secret file absent，`deepseekApiKeyPersisted=false` | done |
| L20-4 容器重建和 status 验收 | 0.5h | Ops | L20-3 + 真实 key | `configured=true` | not_executed：manual secret file required |
| L20-5 knowledge-mode provider live smoke | 0.5h | Dev/Ops | L20-4 | 单点 live evidence | not_executed |

#### Loop 20 执行记录（2026-07-02）

| 维度 | 结论 | 证据层级 |
|---|---|---|
| 事实 | 已在生产服务器创建 no-secret scaffold：secret 目录和 Compose override 文件存在。 | production config scaffold |
| 事实 | `/opt/scm-governance-workbench/secrets/deepseek.env` 仍不存在，未写入真实 key。 | production read-only check |
| 事实 | 容器没有重建或重启，仍为 Up 5 days healthy。 | production read-only check |
| 事实 | production `/api/ai-chat/deepseek/status` 仍返回 `configured=false`，本轮没有 provider call。 | production read-only GET |
| 推断 | Ops 下一步只需写入真实 secret file，再使用三份 compose 文件重建当前容器。 | handoff execution |
| 不确定项 | 真实 key 何时输入、重建后 health/status 是否通过，仍需下一轮 production evidence。 | manual execution required |

## 5. 依赖图

```text
Loop 0 baseline
  ├── Loop 1 import reproducibility
  │     ├── Loop 3 business decision loops
  │     └── Loop 5 release boundary
  ├── Loop 2 manual gates
  │     ├── Loop 3 business decision loops
  │     └── Loop 4 readonly sample design
  └── Loop 5 release boundary
          └── Loop 6 production readonly smoke
                  └── Loop 7 provider single acceptance
                          └── Loop 8 provider runtime key gate
                                  └── Loop 9 provider live-readiness
                                          └── Loop 10 production provider authorization gate
                                                  └── Loop 11 production provider runtime key gate
                                                          └── Loop 12 provider live acceptance readiness gate
                                                                  └── Loop 13 provider live authorization hold gate
                                                                          └── Loop 14 provider live smoke runtime key mismatch gate
                                                                                  └── Loop 15 runtime key visibility diagnostic
                                                                                          └── Loop 16 production runtime key injection gate
                                                                                                  └── Loop 17 provider live smoke gate recheck
                                                                                                          └── Loop 18 billing vs runtime key gate
                                                                                                                  └── Loop 19 key injection Ops handoff
                                                                                                                          └── Loop 20 key injection scaffold
```

## 6. 风险与处理

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| sourceRoot 缺失导致导入不可复现 | High | High | Loop 1 先修复 source root 策略，再做任何新导入 |
| manual gates 被误写成已完成 | High | Medium | 所有 owner/field/weight 只生成 packet，不替 Owner 决策 |
| local smoke 被叙述成 production-ready | High | Medium | 每轮输出必须标注 evidence level |
| dirty worktree 污染 release | Medium | High | Loop 5 使用干净 release file set 或独立 worktree |
| provider 被误触发 | High | Low | DeepSeek loop 单独授权；默认 providerCalls=false |
| UI/DB smoke 写入本地 SQLite 后污染基线 | Medium | Medium | smoke 前备份，smoke 后恢复，记录 pre/post/restored |

## 7. Loop 0 执行记录

执行时间：2026-07-01。

| 检查 | 结果 | 备注 |
|---|---|---|
| `npm run check` | passed | TypeScript 静态检查通过 |
| `SCM_PREPROD_SCAN_ROOT="$(git rev-parse --show-toplevel)/scm" npm run preprod:check` | passed | hard blockers 0；manual gates 3；dirtyCount 22 |
| `git diff --check` | passed | 无 whitespace/error 输出 |
| SQLite read-only baseline | passed | 使用 `DatabaseSync(..., {readOnly:true})` |

Loop 0 当前状态：

| 指标 | 当前值 |
|---|---:|
| metrics | 178 |
| certifiedMetrics | 20 |
| tags / activeTags | 8 / 8 |
| lineageEdges | 278 |
| certifiedLineageTargets | 12 |
| recommendationCards | 15 |
| agentTraces | 61 |
| traceReviews | 13 |
| actionTasks | 15 |
| decisionLogs | 154 |
| governanceTasks | 119 |
| P0 owner sign-offs pending | 30 |
| P0 field mappings pending | 18 |
| sourceRootExists | false |

事实：Loop 0 已完成本地静态和只读基线确认；没有 provider call、没有 production write、没有 ERP/OMS/WMS writeback。

推断：下一轮应优先进入 Loop 1 `sourceRoot` 可复现链路，原因是它影响后续导入、计数稳定和 release 可审计性。

不确定项：真实 owner 审批、字段映射来源、SCEI 权重来源、生产只读目标状态仍需人工或生产只读证据确认。

## 8. 下一轮入口

推荐下一步：**Loop 1-A：定位并修复 import sourceRoot 可复现链路**。

进入条件：

1. 允许修改本地 prototype 脚本或文档。
2. 明确仍保持 `productionWrites=false`、`providerCalls=false`、`erpWriteback=false`。
3. 若需要迁移或恢复源资产，只在 `drafts/analysis/` 或 prototype 本地配置内操作，不触碰生产系统。

停止条件：

1. 找不到源资产且无法从历史路径恢复。
2. 导入会覆盖当前 SQLite 且没有备份。
3. 需要真实 ERP/OMS/WMS 数据或 Owner 审批。
