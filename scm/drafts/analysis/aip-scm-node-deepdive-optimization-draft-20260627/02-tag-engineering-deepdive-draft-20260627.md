---
title: "标签工程工作台 — 深度优化方案（MECE）"
doc_type: deepdive_plan
module: scm
topic: "aip-scm-node-deepdive-02-tag-engineering"
status: draft
created: 2026-06-27
updated: 2026-06-27
owner: self
source: human+ai
node_code: "02 / 标签工程"
boundary: "analysis only；不改动现有代码；仅产出优化设计与落地计划"
---

# 标签工程工作台 — 深度优化方案（MECE）

> 节点深化系列第 02 篇。统一采用 11 节模板：定位边界 → 现状 → 标杆 → MECE 能力拆解 → 治理 SOP → AIP 闭环 → 数据模型增量 → 落地路线 → 验收 → 接口依赖 → 风险。

## 1. 节点定位与边界（MECE 区分）

**一句话定义**：标签工程是把「业务判断」沉淀为「可计算、可治理、可绑定到本体对象」的特征标记的工程化能力。标签是连接「指标数值」与「业务动作」的语义桥——指标告诉你"是多少"，标签告诉你"属于哪一类、要不要管"。

为避免与相邻节点重叠，先做 MECE 边界切分：

| 概念 | 本质 | 例子 | 归属节点 |
|---|---|---|---|
| 指标 Metric | 可聚合的**数值** | 断货损失金额=12.3万 | 指标工程 03 |
| 维度 Dimension | 分析的**切分轴** | 渠道 / 区域 / 时间 | 维度工程 |
| **标签 Tag** | 对象的**离散特征/判定** | "断货高危"、"爆款 SKU" | **标签工程 02（本篇）** |
| 本体属性 Property | 对象的**固有字段** | SKU.abcClass="A" | 对象本体 01 |
| 标签≠属性的边界 | 标签是**派生、可变、有生命周期**的判定；属性是**相对稳定**的事实 | "滞销库存"是标签；"品类=吸奶器"是属性 | — |

**范围内（In）**：标签分类体系、标签定义与规则、阈值版本、生命周期、实例级物化打标、标签升维为本体属性/关系、自动打标、标签质量与审计。
**范围外（Out）**：标签所依赖的指标口径（→03）、对象与关系建模（→01）、标签触发后的决策动作执行（→10/06）。本篇只负责"把标签做对、做全、做活"，不负责下游动作的审批执行。

## 2. 现状精确画像（实测证据）

| 维度 | 实测 | 判断 |
|---|---|---|
| 标签数量 | **8** 个（`tags` 表）| 严重不足，仅覆盖少数风险场景 |
| 标签类型 | 仅 `rule` / `stat` 两类 | 缺 model（模型）/ manual（人工）/ derived（派生）类型 |
| 生命周期 | 全部 `draft`（2 个 `mapped`）| 无一进入 active，生命周期形同虚设 |
| 质量状态 | 全为 `needs_threshold` / `needs_validation` / `needs_owner_review` / `needs_exception_policy` / `needs_resolution` | **没有一个标签的阈值/口径被坐实** |
| 规则表达 | `rule_expression` 为自然语言伪代码（如 `sales_velocity >= threshold AND contribution_rank <= 20%`）| 不可执行、`threshold` 未定义版本 |
| 实例级打标 | 无 `tag_assignment` 表，无对象实例被实际打标 | 标签停在"定义"，未"落到对象" |
| UI 能力 | `TagsPanel`（`main.tsx:4302`）仅 **17 行**：一张 `AssetTable` | 只能"看列表"，不能定义/评审/物化/追溯 |
| 本体绑定 | `target_object_id` 指向类型，但无标签→属性/Links 的升维 | 未实现 Palantir 式"标签即属性" |

**结论**：标签工程是当前最薄弱的节点——它有正确的表骨架（`tag_type/rule_expression/lifecycle_status/owner/quality_status`），但内容、可执行性、物化、治理流程几乎全空。这与用户"不专业、不完整"的判断完全一致。

## 3. 标杆方法论（Palantir AIP + 行业最佳实践）

**3.1 Palantir 式三重升维**（与本仓 `inbox/ABI_LE_Palantir3_1.md` 一致）：
- 维度一 · 标签升维为**对象属性（Properties）**：`[流失风险高]` 不再是宽表里的一列，而是 `Customer` 对象的内置属性，可被 AI/动作直接读取。
- 维度二 · 孤立标签编织为**网状图谱（Links）**：供应商 `[产能极不稳定]` × 物料 `[核心关键物料]` × 设备 `[高利润]` 经 Links 自动识别断供风险链——平面标签表做不到。
- 维度三 · 打通**洞察→动作（Actions）**：标签命中即触发场景与推荐动作，进入治理闭环。

**3.2 行业数据标签治理基线**（来源见 00-index 引用）：
- 四种打标技法应分层共存：**schema（结构）/ ontology（概念关系）/ taxonomy（层级术语）/ folksonomy（协作自定义）**。当前仅有最弱的"自然语言规则"。
- 标签贯穿数据全生命周期：ingestion → storage → processing → analysis → cataloging → governance → consumption。
- 核心原则：**自动化管规模 + 人工管语境（automation for scale, human oversight for context）**；信息架构（taxonomy+命名规范）必须配治理（明确 owner + 变更控制）。

## 4. 目标能力 MECE 拆解

标签工程拆为 7 个**互斥且穷尽**的能力域（A–G），每域给出"做什么 + 验收锚点"：

### A. 标签分类体系（Taxonomy）— 解决"标签如何organize"
四个正交分类轴（彼此 MECE）：
1. **生成方式**：`rule`（规则）/ `stat`（统计阈值）/ `model`（模型打分）/ `manual`（人工标注）/ `derived`（标签组合派生）。
2. **业务语义域**：商品 / 库存 / 供应商 / 物流 / 成本 / 履约 / 风险（7 域，与本体对象对齐）。
3. **对象绑定**：SKU / InventoryBatch / Supplier / Listing / Shipment / CostEvent / PO …（绑定到本体类型）。
4. **敏感级别**：public / internal / restricted（继承自数据分级）。

### B. 标签定义与规则（Definition）— 解决"标签如何算"
结构化、可执行的规则（替代自然语言伪代码）：判定逻辑、依赖指标/字段（显式引用 03 的指标 id）、阈值引用版本、计算粒度、取值类型（布尔/枚举/分数）。

### C. 阈值与版本治理（Threshold & Versioning）— 解决"阈值从哪来、会变"
把散落的 `threshold` 收敛为**带版本的阈值对象**：阈值值、依据（业务/统计分位/历史回测）、生效区间、owner、变更记录。一个标签可引用多版本阈值做 A/B 与回溯。

### D. 实例级物化与历史（Materialization）— 解决"标签落到哪个对象、何时"
`tag_assignment`：把标签算到具体对象实例（如 `sku_momcozy_pump_s12` 被打 `爆款 SKU`），记录打标时间、命中值、证据、批次/实时来源、标签值历史（支持"何时进入/退出该标签"）。

### E. 升维与关联（Ontology Binding）— 解决"标签如何变成生产力"
标签→对象属性投影（Property projection）、标签→Links（标签组合形成跨对象风险链）、标签链可视化（断供链、滞销-占资链）。这是 Palantir 式价值放大的核心。

### F. 自动化与 AIP（Automation）— 解决"标签如何自动跑、驱动动作"
自动打标 agent（按 schedule/事件增量计算）、标签命中→`aip_scenarios` 触发、标签→`recommendation_cards` 生成、全程受 `suggestion_review_replay` 边界约束。

### G. 质量与审计（Quality & Audit）— 解决"标签可信吗"
覆盖率（已打标实例/应打标实例）、准确率（抽样校验）、漂移监控（命中率突变告警）、冲突检测（互斥标签同时命中）、变更审计（谁在何时改了规则/阈值）。

> MECE 自检：A 管"分类"、B 管"逻辑"、C 管"阈值"、D 管"落地"、E 管"关联"、F 管"自动化"、G 管"可信"——无重叠；七者并集覆盖"定义→落地→关联→运营→保障"全链路——无遗漏。

## 5. 治理方法与 SOP

标签生命周期 SOP（9 步，对齐"治理先行"）：

```text
申请(业务提出判定需求)
 → 定义(结构化规则 B + 绑定分类 A + 引用阈值版本 C)
 → 评审(owner + 数据治理，校验与维度/指标不重叠)
 → 阈值定标(C：业务/分位/回测三选一，留依据)
 → 物化试算(D：小批量打标，看覆盖率/命中分布)
 → 认证(G：覆盖率+准确率达标 → lifecycle: active)
 → 升维(E：投影为对象属性 / 建立 Links)
 → 监控(G：漂移/冲突告警)
 → 退役(deprecated → archived，保留历史)
```

生命周期状态机（替代当前全 `draft`）：`draft → reviewed → active → deprecated → archived`，每次跃迁留 owner+证据，与 `certifications` 表打通。

## 6. 自动化与 AIP 闭环

| 闭环环节 | 标签工程的角色 | 受控边界 |
|---|---|---|
| 发现异常 | 标签命中即"异常信号"（如 `负可用库存异常` 命中批次）| 只读计算 |
| 解释原因 | 标签携带规则+证据+关联链（E）作为解释 | 证据链可追溯 |
| 推荐动作 | 标签→场景→推荐动作卡（F）| 仅 suggestion |
| 审批执行 | 交由决策闭环 10 / 动作分级 06 | 不在本节点执行 |
| 复盘沉淀 | 标签命中历史（D）回流，校准阈值（C）| 形成学习闭环 |

自动打标 agent 原则：**先解释后动作**，agent 只产出"标签建议 + 证据 + 置信度"，人工确认后才写入 active 标签；高敏感标签禁止全自动。

## 7. 数据模型增量（设计先行，不改代码）

> 仅为设计蓝图，待 W4 评审后另行实施；不在本轮改动 `data/governance_workbench.sqlite` 与任何源码。

| 新增/扩展 | 关键字段（设计）| 说明 |
|---|---|---|
| `tag_taxonomy`（新）| id, axis(generation/domain/object/sensitivity), code, label, parent_id | 承载 A 的四轴分类 |
| `tags`（扩展）| +category_id, +generation_method, +value_type, +sensitivity, +depends_on_metric_ids, +threshold_version_id, +version | B/C 落位 |
| `tag_threshold_version`（新）| id, tag_id, value, basis, valid_from, valid_to, owner, evidence | C 阈值版本 |
| `tag_assignment`（新）| id, tag_id, object_instance_id, hit_value, evidence_ref, source(batch/stream), assigned_at, expired_at | D 实例级物化+历史 |
| `tag_property_projection`（新）| tag_id, target_object_type, target_property | E 标签→属性 |
| `tag_audit`（新）| id, tag_id, change_type, before, after, actor, at | G 审计 |

## 8. 落地路线（P0/P1/P2）

| 优先级 | 动作 | 依赖 | 不改代码的部分 |
|---|---|---|---|
| **P0** | 把 8 个现有标签的阈值/口径坐实（C），结构化 `rule_expression`（B），生命周期推进到 reviewed/active（G）| 03 指标坐实、01 本体 | 全部为**数据与规则内容**录入，纯内容工作 |
| P0 | 定义标签分类四轴（A），给 8 标签归类 | — | 内容工作 |
| P1 | 设计 `tag_assignment` 等增量表（第 7 节），对种子实例做物化试算 | 数据模型评审 | 设计蓝图 + 评审 |
| P1 | 选 2 条"标签链"做升维样例（E）：断供链（供应商×物料×SKU）、滞销占资链（批次×SKU×成本）| 01 Links | 设计 + 样例数据 |
| P2 | 自动打标 agent 规范与 1 个场景试点（F）| 06 AIP 闭环 | 规范文档 |
| P2 | 标签质量看板设计（G）：覆盖率/漂移/冲突 | 07 质量 | 设计 |

## 9. 验收标准与度量

| 维度 | 当前 | 目标（首阶段）|
|---|---|---|
| active 标签数 | 0 | ≥ 8（现有全部坐实并认证）|
| 阈值有版本依据 | 0% | 100%（每个 active 标签有 threshold_version + basis）|
| 实例物化 | 无 | ≥ 1 个对象类型完成 `tag_assignment` 试算 |
| 升维标签链 | 0 | ≥ 2 条（断供链、滞销占资链）|
| 标签可解释性 | 自然语言 | 每个 active 标签有"规则+依赖指标+证据"三件套 |
| 分类覆盖 | 无体系 | 四轴分类 100% 覆盖 active 标签 |

## 10. 节点接口与依赖

| 方向 | 对象节点 | 接口内容 |
|---|---|---|
| 依赖 ← | 对象本体 01 | 标签绑定的对象类型/实例、Links |
| 依赖 ← | 指标工程 03 | 标签规则引用的认证指标与阈值依据 |
| 依赖 ← | 维度工程 | 标签可被维度切分 |
| 供给 → | 业务现状与风险雷达 R1 | 标签命中即风险信号 |
| 供给 → | 洞察故事线 05 | 标签作为故事线的"分群与异常入口" |
| 供给 → | 决策闭环 10 / Palantir 核心 06 | 标签→场景→推荐动作 |
| 受约束 | 工程债务审计 01（D-P1-03/D-P0-04）| 不混入种子数据、补齐能力 |

## 11. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 阈值拍脑袋 → 标签不可信 | C 强制留依据（业务/分位/回测三选一），纳入认证门禁 |
| 标签爆炸 → 治理失控 | A 分类体系 + owner + 退役机制；新增标签须过评审 |
| 自动打标误标 → 误导动作 | F"先解释后动作"，高敏感标签禁全自动；G 抽样校验 |
| 标签与维度/指标语义混淆 | 第 1 节 MECE 边界表为强约束，评审时逐条比对 |
| 升维 Links 复杂度 | 先做 2 条高价值链样例，验证价值后再扩展 |

---
*下一篇：`03-metric-engineering-deepdive` 指标工程深度优化方案。*
