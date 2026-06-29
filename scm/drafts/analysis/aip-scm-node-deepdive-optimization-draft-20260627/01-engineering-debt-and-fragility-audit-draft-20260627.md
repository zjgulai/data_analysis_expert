---
title: "供应链 AIP 数据治理工作台 — 工程债务与脆弱点审计"
doc_type: audit
module: scm
topic: "aip-scm-node-deepdive-01-engineering-debt-and-fragility-audit"
status: draft
created: 2026-06-27
updated: 2026-06-27
owner: self
source: human+ai
boundary: "analysis only；不改动现有代码；仅产出优化与整改计划"
related:
  - "drafts/prototypes/scm-data-governance-workbench-v0"
  - "drafts/analysis/palantir-aipcon10-scm-aip-plan-draft-20260619"
---

# 供应链 AIP 数据治理工作台 — 工程债务与脆弱点审计

> 本文是节点深化方案系列的 **基线审计**（第 01 篇，共 08 篇）。目标：在「不改动现有代码」的前提下，把当前 `scm-data-governance-workbench-v0` 原型的脆弱点与工程债务全量登记、分级、给出可落地的整改路线，作为后续 5 个节点（标签工程 / 指标工程 / 指标体系 / 洞察故事线 / Palantir 核心）深化方案的共同事实底座。阅读总入口见 `00-index`。

## 0. 一句话结论

平台已经搭好了「Palantir 式治理骨架」（15 个工作台模块 + 本体 + 指标 + 知识库 + 决策闭环 + 受控边界），但**骨架与血肉严重不匹配**：表结构与组件已为 AIP 化预留，真实数据、可信血缘、认证口径、执行轨迹却大面积为空或种子态。当前最大的风险不是「功能不够」，而是 **可信度债务（trust debt）**：170/178 指标未认证、血缘置信度 0.3、`agent_traces` 为 0、示例数据与真实数据混在同库。若不先还这笔债，任何「自动化 / AI 闭环」都会建立在不可信地基上。

## 1. 审计范围与方法

| 项目 | 说明 |
|---|---|
| 审计对象 | `drafts/prototypes/scm-data-governance-workbench-v0`（React/Vite + Node + SQLite），及其依赖的 `drafts/analysis/*` 知识资产、`system_data/*`、`configs/*`、`scripts/scm/*` |
| 审计方法 | 静态代码走查（`src/main.tsx`、`server/index.mjs`）+ SQLite 资产盘点（`data/governance_workbench.sqlite`）+ 既有 AIP 蓝图交叉比对 + 公认工程/数据治理基线比对 |
| 证据级别 | 代码行号、表行数为实测；风险评估为基于实测的推断，已标注 |
| 边界 | **只读审计**：不修改任何源码、不写生产库、不调用 provider、不回写 ERP/OMS/WMS/TMS。所有「整改」均为计划，不在本轮执行 |

## 2. 项目分层画像（深度梳理）

当前 `scm/` 已从「资料目录」长成「供应链专题的工程分枝」，可归纳为 5 层：

```text
L0 方法论底座    01_书籍知识萃取报告.md / 02_Momcozy_KPI体系设计.md / 03_指标树图可视化/
L1 知识资产层    drafts/analysis/*（指标字典、字段抽取、本体 crosswalk、Palantir AIP 蓝图、各业务域 KB）
L2 系统数据层    system_data/*.xlsx（库存/库龄/计划库存/对账/BI 字段汇总）—— 真实导出，未入库
L3 治理工作台    drafts/prototypes/scm-data-governance-workbench-v0（15 模块 + SQLite 台账 + Node API）
L4 交付与部署    dist/ + Docker + 腾讯云轻量服务器 + 履约看板静态子站
```

### 2.1 工作台模块全景（15 个）

| 阶段 | 模块（code） | 实现态 | 数据深度 |
|---|---|---|---|
| Operate | 治理链路总览（00） | active | 聚合视图 |
| Plan | 战略供应链全景（S1） | draft_design_ready | 设计稿 |
| Sense | 业务现状与风险雷达（R1） | data_pending | 设计稿 |
| Operate | 角色作战工作台（R2） | implemented_local_role_routes | 路由级 |
| Operate | 供应链履约看板（F1） | local_knowledge_prototype | 静态子站（iframe） |
| Model | 对象本体工作台（01） | mapped | 14 类型 / 10 实例（种子）|
| Model | **标签工程工作台（02）** | **draft** | **8 标签，全 draft/needs_*** |
| Model | 维度工程工作台（03） | mapped | 10 维度 |
| Build | **指标工程工作台（04）** | mapped | 178 指标，8 认证 |
| Certify | 指标字典工作台（05） | active | 139 个 L3 |
| Certify | **指标体系编排台（06）** | active | 172 树边，权重空 |
| Control | 血缘与质量工作台（07） | reviewed | 278 边，置信 0.3 |
| Serve | AI 知识库工作台（08） | draft | 328 卡 / 696 chunk / 2191 crosswalk |
| Serve | ChatBI 语义治理台（09） | draft | 8 上下文，fail-closed |
| Act | 决策闭环工作台（10） | draft | 10 决策 / 3 动作 |

> 加粗的 4 个模块（标签 02、指标工程 04、指标体系 06）+ 履约看板 F1 的「洞察故事线」+ 贯穿全局的 Palantir 核心要义，正是本系列 5 篇节点深化方案的对象。

### 2.2 受控边界（设计上的优点，应保留）

平台明确写入 `productionWrites=false`、`providerCalls=false`、`erpWriteback=false`，ChatBI 对未认证指标 `fail-closed`，动作止于 `suggestion_review_replay`。**这是符合 Palantir「治理先行、动作逐步开放」SOP 的正确设计**，后续所有自动化方案都必须继承这条边界，不得绕过。

## 3. 资产与数据现状证据表（实测）

| 资产表 | 行数 | 关键观察 |
|---|---|---|
| ontology_objects | 14 | 类型齐全（sku/listing/supplier/warehouse/po/shipment/inventory_batch/…）|
| ontology_object_instances | 10 | 全部 `source_system=seeded_demo` / `evidence_level=prototype_seed` |
| ontology_links | 10 | 类型级关系 |
| ontology_instance_links | 9 | 实例级关系，仅样本 |
| tags | 8 | 全 `draft`/`mapped`，`quality_status` 全为 `needs_*` |
| dimensions | 10 | 一致性维度雏形 |
| metrics | 178（L0:6/L1:8/L2:25/L3:139）| 仅 **8** 认证，**170** 未认证 |
| metric_dimensions | 395 | `compatibility_status=candidate`（未确认）|
| kpi_tree | 172（CONTAINS:33 / DECOMPOSED_TO:139）| **weight 全为 NULL**（无定量归因）|
| certifications | 178 | 与指标 1:1，但绝大多数 `not_certified` |
| lineage_edges | 278 | **confidence≈0.3，status=待确认**（字段映射未坐实）|
| knowledge_cards / chunks / crosswalks | 328 / 696 / 2191 | 知识层是当前最厚的资产 |
| aip_scenarios / recommendation_cards | 3 / 3 | 闭环结构存在，仅种子 |
| decision_logs / action_tasks | 10 / 3 | 状态机可用，量小 |
| **agent_traces / trace_reviews** | **0 / 0** | **AIP 执行轨迹组件已写（main.tsx:1684 AgentTracePanel），但无数据** |
| comments / revision_proposals / export_jobs | 0 / 0 / 0 | 协同与导出链路未跑通 |

## 4. 脆弱点与工程债务登记（分级）

分级标准：**P0=可信度/安全红线，必须先于自动化处理**；P1=阻碍 AIP 闭环规模化；P2=可维护性/长期债务。

### 4.1 P0 — 安全与可信红线

| 编号 | 类别 | 现象与证据 | 风险 | 整改方向（不改业务代码）|
|---|---|---|---|---|
| D-P0-01 | 密钥泄露 | 仓库根目录存在 `ai_video.pem`（私钥，1678 B）随项目一起存放 | 私钥若进入版本库/部署包→服务器可被接管 | 立即移出仓库到密钥管理；确认是否已被 git 跟踪并轮换该密钥；`.gitignore` 增加 `*.pem`（仅配置，不动应用代码）|
| D-P0-02 | 指标可信度 | 170/178 指标 `not_certified`；ChatBI `fail-closed` | 绝大多数业务问题 ChatBI 答不出→平台「可用面」极窄 | 建立**认证流水线**（见 03 指标工程、04 指标体系）；先认证 Top-N 高频指标 |
| D-P0-03 | 血缘不可信 | `lineage_edges` confidence≈0.3、`status=待确认` | 指标→字段映射未坐实，认证无依据，归因不可信 | 用 `system_data/*` 真实导出坐实字段映射（见 03）；血缘置信度纳入认证门禁 |
| D-P0-04 | 示例数据混入 | 实例/场景/推荐全部 `seeded_demo`/`prototype_seed`，与认证资产同库 | 演示数据可能被误读为生产事实，污染 AI 证据链 | 增加 `evidence_level` 强隔离与 UI 显式水印（设计见 06、07）；导出时过滤种子 |
| D-P0-05 | 执行轨迹空缺 | `agent_traces=0`，但 AIP 闭环以「可审计轨迹」为前提 | AI 建议无过程证据→无法满足「治理先行」 | 先用 3 个高价值场景手工沉淀 trace 样本（见 06）|

### 4.2 P1 — 阻碍 AIP 闭环规模化

| 编号 | 类别 | 现象与证据 | 风险 | 整改方向 |
|---|---|---|---|---|
| D-P1-01 | 前端巨石 | `src/main.tsx` 单文件 **7026 行**，所有 Panel 同文件 | 维护/协作/回归成本高，AI 改动易引入回归 | 制定**组件拆分蓝图**（按模块切 Panel，先文档化边界，不在本轮动手）|
| D-P1-02 | 后端巨石 | `server/index.mjs` 单文件 **4596 行**，路由+取数+SQL 混排 | 同上；SQL 散落难治理 | 规划路由/取数/SQL 三层分离蓝图 |
| D-P1-03 | 标签能力缺失 | `TagsPanel` 仅 17 行 AssetTable，无分类/生命周期/规则编辑/物化 | 标签停在「资产表」，无法升维为本体属性 | 见 02 标签工程深化 |
| D-P1-04 | 指标工程缺口 | `MetricsPanel` 仅搜索+表，无公式/字段映射/派生编辑 | 「指标工程」名不副实，仍是浏览器 | 见 03 指标工程深化 |
| D-P1-05 | 无定量归因 | `kpi_tree.weight` 全空，关系仅 CONTAINS/DECOMPOSED_TO | 指标体系不能做贡献度/归因分解 | 见 04 指标体系深化 |
| D-P1-06 | 协同链路空跑 | `comments/revision_proposals/export_jobs=0` | 注解→修订→认证→导出闭环未验证 | 用真实流程跑通 1 条端到端样本 |
| D-P1-07 | 无 RBAC | 无登录、无对象/动作/指标级权限 | 动作开放后无法满足「权限分级」 | 规划 RBAC 模型（设计先行，见 06）|

### 4.3 P2 — 可维护性与长期债务

| 编号 | 类别 | 现象与证据 | 整改方向 |
|---|---|---|---|
| D-P2-01 | 部署来源未收敛 | 多份部署快照（`75494ae`/`ee30914`/`ccb554a`）+ `tmp/deploy/*` 多目录 | 收敛到单一 release register（沿用既有蓝图 5.3 建议）|
| D-P2-02 | 工作区杂物 | `tmp/` 下数十个 `ui-smoke-*`/`deploy-*` 目录、根目录 `.DS_Store` | 归档/清理策略（仅整理产物目录，不动代码）|
| D-P2-03 | 测试以 smoke 为主 | `smoke:api/ui/readonly` 覆盖入口，但无单元/契约测试 | 规划契约测试清单（针对 API 形状与 SQL 口径）|
| D-P2-04 | 知识资产版本漂移 | `drafts/analysis/*` 同主题多版本草稿并存 | 在 00-index 建立「当前生效版本」指针 |
| D-P2-05 | 类型与数据契约弱 | `AnyRow` 等弱类型在前端流转 | 规划核心实体 TS 类型与 API schema（设计先行）|

## 5. 不改代码前提下的整改路线（Plan-only）

> 本系列承诺**不动现有代码**。因此「整改」分两类：① 立即可做的**非代码动作**（密钥、配置、数据、文档、流程）；② 需要落到代码的部分，本轮只产出**设计/蓝图**，交由后续单独评审后实施。

| 波次 | 周期 | 立即非代码动作 | 同步产出的设计蓝图 |
|---|---|---|---|
| W1 可信地基 | 第 1 周 | 移出 `ai_video.pem` 并轮换；`.gitignore` 增 `*.pem`；标注示例数据 | 认证门禁规则、血缘置信度阈值（喂给 03/04）|
| W2 坐实血缘 | 第 2 周 | 用 `system_data/*` 真实导出，人工坐实 Top-N 指标字段映射 | 字段映射模板与 lineage 升级规则（03）|
| W3 三场景闭环 | 第 3 周 | 手工沉淀 3 个高价值场景的 trace+推荐+复盘样本 | Agent Execution Trace 数据规范（06）|
| W4 节点深化评审 | 第 4 周 | 评审本系列 02–06 五份节点方案 | 组件/后端拆分蓝图（D-P1-01/02）、RBAC 模型（D-P1-07）|

## 6. 与各节点深化方案的接口

| 本审计债务 | 对应深化文档 | 交接内容 |
|---|---|---|
| D-P0-02 指标未认证 | 03 指标工程 / 04 指标体系 | 认证流水线、口径治理 |
| D-P0-03 血缘不可信 | 03 指标工程 | 字段映射坐实、lineage 升级 |
| D-P1-03 标签缺失 | 02 标签工程 | 标签分类/生命周期/物化/升维本体属性 |
| D-P1-05 无归因 | 04 指标体系 | 权重、贡献度、归因路径 |
| D-P0-05 / D-P1-06 轨迹与协同 | 05 洞察故事线 / 06 Palantir 核心 | 故事线叙事、执行轨迹、动作闭环 |
| D-P0-04 数据隔离 | 07 交叉审计 | evidence_level 一致性、种子隔离规则 |

## 7. 附录：codebase-memory-mcp 接入建议（本轮按用户要求暂缓）

用户提出安装 `DeusData/codebase-memory-mcp`（把代码库索引成持久知识图谱、158 语言、毫秒级结构查询、显著降低 token）。**完整安装与接入运行手册见本系列第 08 篇**；本轮不在沙箱代为安装（沙箱为 Linux，无法改本机 Claude 配置）。鉴于 D-P1-01/02 的「单文件巨石」债务，该工具对后续拆分极有价值，要点速览：

- 形态：单静态二进制，官方安装脚本落到 `~/.local/bin` 并自动接入 Claude Code 等 11 种 agent；agent 侧对当前目录调用 `index_repository`（首次全量、之后增量）。
- 适配场景：正是「巨石单文件、AI 反复读同一文件、跨模块依赖查询」这类债务（与 D-P1-01/02 高度吻合）。
- 落地前提：在用户 macOS 本机执行（沙箱为 Linux，无法改本机 Claude 配置）；接入后建议先索引 `scm-data-governance-workbench-v0`，再用于组件拆分蓝图的依赖梳理。
- 参考：`github.com/DeusData/codebase-memory-mcp`、预印本 arXiv:2603.27277。

---
*下一篇：`02-tag-engineering-deepdive` 标签工程深度优化方案。*
