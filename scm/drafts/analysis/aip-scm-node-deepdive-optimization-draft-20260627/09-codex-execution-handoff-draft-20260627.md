---
title: "给 Codex 的执行交接手册"
doc_type: execution_handoff
module: scm
topic: "aip-scm-node-deepdive-09-codex-execution-handoff"
status: draft
created: 2026-06-27
updated: 2026-06-27
owner: self
source: human+ai
audience: "Codex / Codex CLI（承接本系列计划进行实际代码与数据实现的编码 agent）"
boundary: "Codex 可改代码，但必须继承平台受控边界与本系列设计；先内容后代码、小步可验证"
---

# 给 Codex 的执行交接手册

> 节点深化系列第 09 篇。前 8 篇是"设计与计划（不改代码）"，本篇是把它交给 **Codex 去落地** 的执行说明。核心思想：**先还可信债、先做内容数据、再动代码；每一步小、可验证、可回滚；绝不破坏受控边界。**

## 0. 一句话给 Codex

> 按 `07-cross-audit` 第 7 节的关键路径推进；**03 指标工程的 P0 是总瓶颈，最先做**。能用"数据/SQLite/契约"内容完成的就不要改前端巨石。每个改动跑通 `npm run check / build / smoke:*`，且必须保持 `productionWrites=false / providerCalls=false / erpWriteback=false`、动作止于 `suggestion_review_replay`。

## 1. 执行前置（Codex 开工前必须完成）

| # | 动作 | 说明 |
|---|---|---|
| 1 | 读计划 | 读完 00→07（尤其 03、04、07 第 7 节关键路径）；以各篇"验收标准"为完成定义 |
| 2 | 🔴 清密钥 | 先做 D-P0-01：移走 `ai_video.pem`、`.gitignore` 加 `*.pem`（先于任何索引/提交）|
| 3 | 装代码图谱 | 按第 08 篇在本机装 `codebase-memory-mcp` 并索引 `scm-data-governance-workbench-v0`（Codex CLI 在其自动接入的 11 agent 之列）|
| 4 | 建工作分支 | 每个债务/任务一条短分支，禁止在主干直接大改 |
| 5 | 跑基线 | 先 `npm run check && npm run build && npm run smoke:readonly` 留一份"改动前"绿色基线 |

## 2. 执行顺序（硬约束，照搬关键路径）

```text
W1  ① 清密钥(D-P0-01) ② 标注种子数据 evidence_level ③ 落术语/枚举为常量
W1-2 ④ 03-P0：Top-12 指标坐实字段映射 + 三签认证        ← 先做，解锁全链
W2   ⑤ 02-P0 标签坐实   ∥   ⑥ 04-P0 回填权重 + MECE 校验
W3   ⑦ 05-P0 履约页 SCQA 故事骨架   +   ⑧ 06-P0 跑通 3 端到端闭环、灌 agent_traces
W4   ⑨ 评审通过后：数据模型增量迁移 + 巨石拆分蓝图 + RBAC
```

判断规则：**凡能在 `data/governance_workbench.sqlite` 或 CSV/JSON 契约里完成的，归为"内容工作"，优先做、风险最低**；只有 UI 行为变化才动 `src/main.tsx` / `server/index.mjs`，且必须有图谱依赖证据。

## 3. 任务卡（按债务，含可改文件范围 + 验收 + 回归）

> 每张卡是 Codex 的一个 PR 上限。"可改文件"用于限制爆炸半径；"验收"对齐对应计划篇。

### T1 · 安全闭合（D-P0-01）
- 可改：`.gitignore`、移除 `ai_video.pem`（不入库）。
- 禁改：任何业务代码。
- 验收：仓库内无 `*.pem`；密钥已轮换（人工）。回归：`smoke:readonly` 绿。

### T2 · 指标坐实与认证（03-P0，**瓶颈，先做**）
- 可改：`data/governance_workbench.sqlite` 内容（`metrics`/`lineage_edges`/`certifications`/`metric_dimensions`）、坐实证据取自 `system_data/*.xlsx`、`供应链BI字段汇总.xlsx`。
- 做法：选 Top-12 高频指标，逐个把 `lineage_edges` 从 `confidence≈0.3/待确认` 坐实到 `≥0.8 + evidence`；三签后 `certification_status=certified`；维度白名单 `candidate→confirmed/forbidden`。
- 禁做：编造字段映射；改 ChatBI 的 `certified_metric_only` 策略以"绕过"未认证。
- 验收（对齐 03 第 9 节）：认证指标 ≥20；Top-12 血缘 confidence≥0.8；ChatBI 这些指标可答且带证据链。回归：`smoke:api` + `smoke:ui`。

### T3 · 标签坐实（02-P0）
- 可改：`tags` 表内容、新增分类内容；如需 UI 升级走 T8 蓝图，不在本卡。
- 做法：8 个标签结构化 `rule_expression`、定阈值版本+依据、四轴归类、生命周期推进到 `active`。
- 验收（02 第 9 节）：active 标签 ≥8、阈值 100% 有依据、四轴分类全覆盖。

### T4 · 体系回填与 MECE 校验（04-P0）
- 可改：`kpi_tree`（回填 `weight`、必要时加 `DRIVES`）、新增校验脚本（独立文件，不改巨石）。
- 做法：回填 SCEI→5 维一级驱动权重（取 `02_Momcozy_KPI体系设计.md`）；对主干跑算术闭合校验、留残差。
- 验收（04 第 9 节）：L0–L1 权重 100%、主干残差≤阈值并留证、≥1 条端到端归因样例。

### T5 · 履约页故事骨架（05-P0）
- 可改：`public/fulfillment-dashboard/` 下的 **数据契约 CSV/JSON 与文案**；`app.js` 仅在必要渲染时小改。
- 做法：未发货/缺货三分法/审核效能三页各一条 SCQA 结论先行骨架 + 洞察单元挂证据链（引用已有口径/契约 CSV）。
- 禁做：接生产库、让页面执行动作（页面只到"建议"）。
- 验收（05 第 9 节）：3 核心页有结论先行 + 每洞察可回口径；保持静态原型边界。

### T6 · 闭环灌注（06-P0）
- 可改：`aip_scenarios`/`recommendation_cards`/`agent_traces`/`decision_logs` 内容（按现有 schema）。
- 做法：FBA 负可用 / 断货高危 / 成本异常 三场景各产出 1 条 `agent_trace`（含缺口+置信度）+ 1 张推荐卡（owner/SLA/证据）+ 复盘。
- 禁做：开放写回；用 `seed` 证据驱动高风险动作。
- 验收（06 第 9 节）：3 条可演示闭环、`agent_traces≥3`、全程边界 false。

### T7 · 数据模型增量迁移（W4，评审后）
- 可改：新增 **加法式** 迁移脚本（建 `tag_assignment`/`metric_field_mapping`/`kpi_contribution` 等，见各篇第 7 节），不删不改存量列。
- 验收：迁移可重复执行、回滚脚本齐备、`check`/`build` 绿。

### T8 · 巨石拆分（W4，行为保持）
- 前置：T0 代码图谱已索引。可改：从 `src/main.tsx`(7026) / `server/index.mjs`(4596) 按依赖边界抽出组件/路由/SQL 三层。
- 铁律：**行为保持重构**，每抽一块即跑 `smoke:ui`/`smoke:api` 对比，diff 必须小且可逐块回滚；禁止大爆炸式一次性重写。

## 4. 边界不变量（每个 PR 都要满足，建议加断言/测试）

| 不变量 | 检查方式 |
|---|---|
| `productionWrites=false / providerCalls=false / erpWriteback=false` | 配置/health 检查，最好加测试断言 |
| 动作止于 `suggestion_review_replay` | 决策/动作状态机不得新增"直接写回" |
| 唯一写目标 = 本原型 SQLite | 不写任何外部系统 |
| 种子隔离 | 新增数据正确标 `evidence_level`，`seed` 不污染 `certified` |
| 无密钥入库 | 提交前扫 `*.pem`/key |

## 5. 提交与协作规范

- 一卡一 PR，标题挂债务号（如 `T2/D-P0-02: certify top-12 metrics`）。
- 每 PR 必跑：`npm run check` → `npm run build` → 相关 `smoke:api/ui/readonly`，把结果贴进 PR。
- 改动附"证据来源"（如某指标映射来自哪张 `system_data` 表）。
- 小步提交；不可在一个 PR 里既坐实数据又重构巨石。

## 6. 反目标（Codex 明确不要做）

| 不要 | 原因 |
|---|---|
| 大爆炸重写 `main.tsx`/`server` | 高回归风险；必须行为保持、按图谱分块 |
| 为"让 AI 能答"放宽认证门禁 | 违背可信地基；宁可少答不可错答 |
| 编造字段映射/阈值/权重 | 必须有 `system_data`/方法论文档依据 |
| 接生产库 / 调 provider / 回写 ERP | 触碰受控边界红线 |
| 把示例数据当真实结论用 | evidence 分层必须保持 |
| 跳过 03 先做 02/04/05 | 关键路径硬约束，地基未稳 |

## 7. 给 Codex 的"完成定义"（DoD）

一个任务"完成" = 满足对应计划篇第 9 节验收 + 第 4 节边界不变量全绿 + `check/build/smoke` 通过 + PR 附证据。否则保持 in-progress。

---
*本篇为系列第 09 篇（执行交接）。配套：05 篇前置（清密钥）、08 篇（装代码图谱）、07 篇（关键路径）。总入口见 `00-index`。*
