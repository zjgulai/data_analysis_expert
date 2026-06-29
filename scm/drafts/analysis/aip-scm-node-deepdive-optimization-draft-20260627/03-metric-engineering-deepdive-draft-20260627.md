---
title: "指标工程工作台 — 深度优化方案（MECE）"
doc_type: deepdive_plan
module: scm
topic: "aip-scm-node-deepdive-03-metric-engineering"
status: draft
created: 2026-06-27
updated: 2026-06-27
owner: self
source: human+ai
node_code: "04 / 指标工程"
boundary: "analysis only；不改动现有代码；仅产出优化设计与落地计划"
---

# 指标工程工作台 — 深度优化方案（MECE）

> 节点深化系列第 03 篇。统一 11 节模板。指标工程是整条治理链路的"承重墙"——标签（02）、指标体系（04）、ChatBI（09）、洞察故事线（05）全部建立在指标资产可信之上。

## 1. 节点定位与边界（MECE 区分）

**一句话定义**：指标工程是把"业务想衡量的东西"工程化为**可计算、可复用、有口径、有字段血缘、可被机器消费**的指标资产的能力——即供应链域的"语义层（Semantic Layer）建造"。

与相邻节点的 MECE 切分（避免"指标"四个节点互相打架）：

| 节点 | 负责 | 不负责 |
|---|---|---|
| **指标工程 04（本篇）** | 指标怎么**定义/计算/映射字段/派生/认证** | 不负责树形归因、不负责对外检索 |
| 指标字典 05 | 指标口径的**检索、注解、对外查询、导出** | 不负责底层公式工程 |
| 指标体系 06 | 指标之间的**树/权重/归因/北极星分解** | 不负责单指标定义 |
| 维度工程 | 指标的**切分轴**与一致性维度 | 不负责指标本身 |
| 标签工程 02 | 基于指标的**离散判定** | 不负责指标数值 |

边界口诀：**04 造砖（单指标可信）、06 砌墙（指标成体系）、05 开窗（口径可查）、02 贴签（判定分群）。**

## 2. 现状精确画像（实测证据）

| 维度 | 实测 | 判断 |
|---|---|---|
| 指标总量 | **178**（L0:6 / L1:8 / L2:25 / L3:139）| 数量充足，骨架完整（MECE V2 蓝图导入）|
| 认证状态 | **certified 8 / not_certified 170** | 95.5% 不可信，ChatBI fail-closed 下基本"答不出" |
| 公式形态 | 高层表达式如 `weighted_score(...)`、`score(...)`，L3 多为口径描述 | 顶层是"组合占位"，**原子指标的可执行口径与字段未坐实** |
| 字段血缘 | `lineage_edges` 278 条，confidence≈0.3，`status=待确认`，evidence="待确认源字段" | **指标→源字段映射几乎全未坐实**（核心债务 D-P0-03）|
| 维度兼容 | `metric_dimensions` 395 条，全 `compatibility_status=candidate` | 指标×维度可切分性未确认，存在非法下钻风险 |
| 派生关系 | 公式内隐含依赖（如成本效率指数依赖 4 个子项），但无显式依赖图 | 派生链不可见，口径易分叉 |
| UI 能力 | `MetricsPanel`（`main.tsx:4336`）= 搜索框 + `AssetTable` | 只能"检索浏览"，**不能定义公式、不能映射字段、不能管派生**——"工程"名不副实 |
| 真实源数据 | `system_data/*.xlsx`（库存/库龄/计划库存/对账/BI 字段汇总）真实存在但**未与指标打通** | 坐实血缘的"弹药"已在手，未上膛 |

**结论**：指标工程"有目录、无引擎"。178 个指标像一本写好了标题、却没填公式与数据源的字典。优化重心不是"加更多指标"，而是 **让现有指标可信、可算、可被机器消费**。

## 3. 标杆方法论（语义层 + Palantir）

**3.1 语义层 / Headless BI 治理基线**（来源见 00-index）：
- 语义层是"企业数据系统 ↔ 人/报表/应用/AI"之间的**受治理翻译层**，把物理表/join/过滤/度量/层级/权限沉淀为可复用业务概念。
- **认证即资产**：标记 candidate"认证指标"，区分认证指标与域内变体；认证信号与审计记录**随指标流动到任何消费端**（BI/notebook/AI agent/Slack）。
- **治理即构造（governance by construction）**：当语义活在平台里，治理不再是文档而是"结构性强制"。
- **采纳即产品反馈**：指标被绕过时，修复办法是补维度、提性能、写边界文档，让"正路比抄近路更easy"。

**3.2 指标规格（metric spec）应包含**（借鉴 dbt MetricFlow 等）：度量（measure）、可用维度（dimensions）、过滤（filters）、粒度（grain）、时间语义。当前 `metrics` 表有 `formula/grain/direction/definition`，但缺**显式依赖、字段映射坐实、维度白名单、时间语义**。

**3.3 Palantir 视角**：指标应是**绑定到本体对象的函数**，而非游离的 SQL；指标消费走认证语义层，AI 不自由写 SQL。当前 ChatBI 的 `certified_metric_only` 正是这条原则——但因认证率太低而"卡死"。

## 4. 目标能力 MECE 拆解

指标工程拆为 7 个互斥且穷尽的能力域：

### A. 指标定义规范（Spec）
统一最小规格：code / name / 业务定义 / 类型（**atomic 原子 / derived 派生 / composite 组合**）/ 公式 / 粒度 grain / 方向 direction / 单位 unit / owner / L0–L3 层级。强制"原子指标必须能落到字段、组合指标必须显式引用子指标"。

### B. 公式与计算口径（Semantics）
- 三层分层：原子（直接由字段聚合）→ 派生（原子的算术组合）→ 组合（加权指数）。
- 口径边界显式化：**包含/排除清单**（如"供应链总成本"是否含逆向？是否含直邮？）。
- **时间语义**：快照（snapshot，如期末库存）/ 区间（period，如本月发货）/ 期末对期初——避免库存类指标的经典口径错位。

### C. 字段映射与血缘（Field Mapping & Lineage）— 还 D-P0-03 的债
把每个**原子指标**坐实到 `源系统.源表.源字段 + 聚合方式 + 过滤条件`，`confidence` 从 0.3 升到坐实（依据 `system_data/*` 真实导出 + BI 字段汇总）。血缘置信度成为认证门禁的硬指标。

### D. 维度兼容矩阵（Compatibility）
把 395 条 `candidate` 逐步确认为 `confirmed`/`forbidden`：声明每个指标**合法可切分维度白名单**，禁止非法下钻（如"按供应商看末端妥投率"若无供应商-包裹关联则禁用），ChatBI 据此挡掉无意义提问。

### E. 派生与复用（Derivation & Reuse）
建立**显式指标依赖图**（metric DAG）：组合指标→派生→原子。同一业务概念全局唯一原子定义，禁止"同名不同口径"分叉。复用率作为健康度指标。

### F. 认证流水线（Certification Pipeline）— 还 D-P0-02 的债
三签门禁：**owner 签（业务口径）+ lineage 签（字段坐实，C 达标）+ quality 签（数据质量）**。`not_certified → certified` 仅当三签齐全；认证后该指标在 ChatBI 解锁。先认证 Top-N 高频指标（断货损失、可售覆盖、周转、履约达成、成本率）。

### G. 自动化校验（Validation）
机器可跑的校验集：公式可解析、依赖闭合（无悬空引用）、维度合法、单位一致、重复/冲突检测（同口径多指标）、孤儿指标（无血缘）。每次变更触发校验并留 `validation_log`。

> MECE 自检：A 定规格 / B 定口径 / C 接数据 / D 管切分 / E 管复用 / F 管认证 / G 管校验——七域无重叠，并集覆盖"定义→可算→可信→可消费"全链路。

## 5. 治理方法与 SOP

```text
指标申请
 → 定义(A：类型/公式/粒度/单位/owner)
 → 口径边界(B：包含排除 + 时间语义)
 → 字段映射坐实(C：源表源字段 + 置信度，用 system_data 真实导出)
 → 维度确认(D：白名单)
 → 派生登记(E：进 metric DAG，查重)
 → 自动校验(G：解析/闭合/合法/单位)
 → 三签认证(F：owner+lineage+quality)
 → 上线 → ChatBI 解锁 → 监控(漂移/质量)
```

## 6. 自动化与 AIP 闭环

| 环节 | 指标工程角色 |
|---|---|
| 发现 | 指标越界（破阈值）触发标签（02）与场景 |
| 解释 | 指标沿 metric DAG（E）逐层下钻到原子驱动（喂给 04 归因、05 故事线）|
| 推荐 | 认证指标 + 字段血缘作为推荐动作的"事实依据" |
| 复盘 | 动作后指标变化回流，验证因果假设 |

AIP 原则落位：**AI 只消费认证指标**（F），不自由写 SQL；指标的"可答性"由 D（维度白名单）+ F（认证）共同决定。这把"能不能让 AI 回答"从"模型能力问题"变成"治理状态问题"——可控、可审计。

## 7. 数据模型增量（设计先行，不改代码）

| 新增/扩展 | 关键字段（设计）| 说明 |
|---|---|---|
| `metrics`（扩展）| +unit, +calc_type(atomic/derived/composite), +depends_on_metric_ids, +time_semantics, +caliber_include, +caliber_exclude | A/B/E |
| `metric_field_mapping`（强化 lineage）| metric_id, source_system, source_table, source_field, agg, filter, confidence, evidence, confirmed_by | C |
| `metric_dimension`（扩展兼容）| +compatibility(confirmed/candidate/forbidden), +reason | D |
| `metric_certification`（强化）| metric_id, owner_sign, lineage_sign, quality_sign, certified_at | F |
| `metric_validation_log`（新）| metric_id, check_type, result, detail, at | G |

## 8. 落地路线（P0/P1/P2）

| 优先级 | 动作 | 不改代码的部分 |
|---|---|---|
| **P0** | 选 **Top-12 高频指标**坐实字段映射（C，用 `system_data/*`），完成三签认证（F）| 数据/口径录入 + 评审，纯内容工作 |
| P0 | 给上述指标确认维度白名单（D），ChatBI 解锁试跑 | 内容 + 验证 |
| P1 | 全量 178 指标补 `calc_type` 与依赖图（E），输出 metric DAG 可视化设计 | 内容 + 设计 |
| P1 | 设计 `metric_field_mapping`/`metric_validation_log` 增量表（第 7 节）| 设计蓝图 |
| P2 | 自动校验规则集（G）落为可执行清单 | 规范文档 |
| P2 | 派生指标口径分叉扫描（同名异口径）| 分析报告 |

## 9. 验收标准与度量

| 维度 | 当前 | 目标（首阶段）|
|---|---|---|
| 认证指标数 | 8 | ≥ 20（含 Top-12 高频）|
| 字段血缘坐实率（原子指标）| ≈0%（confidence 0.3）| Top 指标 100% confidence≥0.8 + evidence |
| 维度兼容确认率 | 0%（全 candidate）| Top 指标维度白名单 100% confirmed/forbidden |
| ChatBI 可答指标数 | 8 | ≥ 20，且每个有证据链 |
| 指标类型标注 | 无 | 178 个 100% 标注 atomic/derived/composite |
| 口径分叉 | 未知 | 完成一次全量扫描并清零高优冲突 |

## 10. 节点接口与依赖

| 方向 | 对象 | 接口 |
|---|---|---|
| 依赖 ← | 对象本体 01 / 维度工程 / `system_data/*` | 对象、切分轴、真实源字段 |
| 供给 → | 指标字典 05 | 认证口径供检索/导出 |
| 供给 → | 指标体系 06 | 原子/派生指标供树形归因与权重 |
| 供给 → | 标签工程 02 | 标签规则引用的认证指标与阈值 |
| 供给 → | ChatBI 09 / 洞察故事线 05 | 可答的认证指标与证据链 |
| 受约束 | 审计 01（D-P0-02/03）| 认证率、血缘置信度门禁 |

## 11. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 认证工作量大 → 久拖不决 | 先 Top-12 高频，价值优先；认证流水线模板化 |
| 字段映射坐实困难（源系统多） | 用 `system_data` 真实导出 + BI 字段汇总分批坐实，置信度可渐进 |
| 口径包含/排除争议 | B 显式清单 + owner 签字，争议留痕 |
| 派生口径分叉历史包袱 | E 全局唯一原子 + 查重扫描，存量分批收敛 |
| ChatBI 解锁后误用 | D 维度白名单 + F 认证双闸，宁可少答不可错答 |

---
*下一篇：`04-metric-system-deepdive` 指标体系深度优化方案。*
