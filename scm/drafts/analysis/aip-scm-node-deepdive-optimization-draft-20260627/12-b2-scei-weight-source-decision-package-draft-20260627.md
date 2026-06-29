---
title: "B2 SCEI 五维权重来源决策包"
date: "2026-06-27"
status: "owner_decision_packet_ready"
batch: "B2"
scope: "SCEI -> 五个 L0 驱动的权重来源决策包；不回填 kpi_tree.weight，直到 owner 给出数值签字"
boundary: "local SQLite / draft contract only; productionWrites=false; providerCalls=false; erpWriteback=false; actions stop at suggestion_review_replay"
depends_on:
  - "10-current-product-state-execution-register-draft-20260627.md"
  - "11-b1-boundary-enum-normalization-plan-draft-20260627.md"
  - "04-metric-system-deepdive-draft-20260627.md"
---

# B2 SCEI 五维权重来源决策包

## 1. 批次目标

B2 只处理 T4/D-P1-05 的一个阻塞点：`SCM-MECE-L0-001` 供应链综合效能指数到五个 L0 驱动的权重来源。当前目标是把 owner 需要决策的数值、依据、验收 SQL 和回填门槛写清楚。B2 完成后，T4 仍需等 owner 数值签字才能进入 `kpi_tree.weight` 回填。

## 2. 当前事实

| 项 | 当前状态 |
|---|---|
| 父指标 | `SCM-MECE-L0-001` 供应链综合效能指数。 |
| 五个 L0 子项 | 成本效率、可售性保障、库存资金效率、履约体验、指标数据可信。 |
| 结构边 | `kpi_tree` 已有 5 条 `WEIGHTED_COMPONENT` 边。 |
| 权重 | 5 条 SCEI 主干权重均为空。 |
| 现有治理状态 | `aip_20260627_d_p1_05_scei_weight_source_required` 当前为 source blocker。 |
| 执行边界 | 本批只产出决策包与 SQLite 治理记录，不批量改权重。 |

## 3. 已核对的证据

| 来源 | 可采纳事实 | 对五维 SCEI 的作用 |
|---|---|---|
| `03_指标树图可视化/README.md` | 综合供应链满意度 = 成本满意度 50% + 履约满意度 50%；履约 = 时效 40% + 质量 40% + 成本效率 20%。 | 可证明旧两轴满意度模型与履约内部权重。 |
| `03_指标树图可视化/xmind/Momcozy_融合指标树_完整版.md` | 成本维度 50%；履约维度 50%；成本维度内部进货 30% / 存货 35% / 销货 35%。 | 可证明旧指标树权重，不足以直接覆盖五个 L0 子项。 |
| `02_Momcozy_KPI体系设计.md` | 有成本波动、时效偏差、缺货率、滞销责任等归因公式与阈值。 | 可作为 T4 后续归因路径来源；没有给出 SCEI 五维顶层权重。 |
| `04-metric-system-deepdive` | 要求 SCEI -> 5 维权重完整、MECE 残差留证，且禁止拍脑袋权重。 | 约束当前只能做决策包，等待 owner 数值。 |

结论：已找到可引用的旧两轴权重；五维 SCEI 顶层权重仍需 owner 决策。

## 4. Owner 决策表

Owner 需要给出五个数值，范围为 `0 <= weight <= 1`，合计必须为 `1.0`。每个数值都要有依据类型和说明。

| child_metric_id | 子项 | weight | 依据类型 | 依据说明 | owner |
|---|---|---:|---|---|---|
| `SCM-MECE-L0-002` | 成本效率指数 | 待 owner 填写 | `methodology` / `business_priority` / `historical_backtest` | 需说明是否继承旧成本 50% 或调整。 | 供应链数据治理 Owner |
| `SCM-MECE-L0-003` | 可售性保障率 | 待 owner 填写 | `business_priority` / `historical_backtest` | 需说明断货与可售覆盖对 SCEI 的战略权重。 | 库存运营 Owner |
| `SCM-MECE-L0-004` | 库存资金效率指数 | 待 owner 填写 | `business_priority` / `historical_backtest` | 需说明资金周转、超龄库存、减值对 SCEI 的权重。 | 库存运营 Owner / 财务 Owner |
| `SCM-MECE-L0-005` | 履约体验达成率 | 待 owner 填写 | `methodology` / `business_priority` / `historical_backtest` | 需说明是否继承旧履约 50% 或调整。 | 履约 Owner |
| `SCM-MECE-L0-006` | 指标数据可信通过率 | 待 owner 填写 | `governance_gate` / `business_priority` | 需说明数据可信是扣分门槛、独立权重，还是只作为健康门禁。 | 数据治理 Owner |

## 5. 决策选项

| 选项 | 含义 | 风险 | 可执行状态 |
|---|---|---|---|
| A | Owner 直接签署五维权重，合计 1.0。 | 需要业务共识；最快解锁 T4。 | 推荐。 |
| B | 先把旧两轴模型作为独立 legacy score，SCEI 五维权重后置。 | T4 主干仍保持阻塞；可保留旧模型展示。 | 可作为过渡。 |
| C | 先做历史数据回测，再由 owner 签字。 | 周期较长；需要可用历史样本。 | P1 更合适。 |

B2 不提供默认数值。任何默认五等分或主观比例都必须先被 owner 明确批准，才可进入回填。

## 6. 回填门槛

| 门槛 | SQL / 规则 |
|---|---|
| 五项齐全 | `COUNT(weight)=5` for parent `SCM-MECE-L0-001`。 |
| 合计闭合 | `ABS(SUM(weight)-1.0) <= 0.0001`。 |
| 每项有依据 | `governance_note` 必须包含 `source=`、`owner_signoff=`、`decision_id=`。 |
| 动作边界 | 所有回填仍只写本地 SQLite，`productionWrites=false/providerCalls=false/erpWriteback=false`。 |
| 回归 | `npm run check`、`npm run build`、`npm run smoke:readonly`；若跑 api/ui smoke，验收后清理测试写入。 |

## 7. TODO

| # | TODO | 输出 |
|---|---|---|
| 1 | 写入本决策包文档。 | `12-b2-scei-weight-source-decision-package-draft-20260627.md` |
| 2 | 写入 SQLite annotation，记录证据核对和 owner 决策表。 | `annotation_b2_scei_weight_decision_packet_20260627` |
| 3 | 写入 SQLite decision log，明确当前状态为 owner decision packet ready。 | `decision_b2_scei_weight_source_packet_20260627` |
| 4 | 更新治理任务状态。 | `aip_20260627_d_p1_05_scei_weight_source_required` -> `owner_decision_packet_ready` |
| 5 | 验证。 | check/build/smoke，并确认 SCEI 权重仍未被误填。 |

## 8. 完成定义

B2 完成的定义是：证据核对可追溯、owner 决策表可查、SQLite 有决策包记录、SCEI 五条主干边保持空权重、T4 回填入口仍受 owner 数值签字控制。
