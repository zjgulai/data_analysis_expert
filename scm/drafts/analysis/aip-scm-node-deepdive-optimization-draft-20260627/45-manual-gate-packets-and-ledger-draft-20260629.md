---
title: "Manual Gate Packets and Ledger Draft"
date: "2026-06-29"
status: "review_packet_ready_local_only"
batch: "B42-5/B42-6/B42-7/B42-8"
scope: "Owner sign-off, field mapping, and SCEI weight source manual gate packets"
depends_on:
  - "43-release-candidate-dirty-worktree-manifest-draft-20260629.md"
  - "12-b2-scei-weight-source-decision-package-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  actionCeiling: "suggestion_review_replay"
---

# B42-5/B42-8 Manual Gate Packets

## 1. 当前 manual gates

事实：SQLite `governance_tasks` 的 P0 manual gates 仍为 owner signoff `30`、field mapping `18`、SCEI owner decision `1`。本轮没有把任何 pending 状态改成完成。

推断：这些 gates 不阻塞只读原型 RC 审批包准备，但阻塞 provider、生产写入、ERP/OMS/WMS 回写、真实业务明细导入。

不确定项：真实 owner 名单、真实源系统字段、SCEI 五维权重数值与依据仍待人工提供。

## 2. Gate SQL

```sql
select task_type, priority, status, count(*)
from governance_tasks
where priority='P0'
group by task_type, priority, status;
```

当前摘要：

| task_type | priority | status | count |
|---|---|---|---:|
| boundary_governance | P0 | review_ready | 1 |
| enumeration_governance | P0 | review_ready | 1 |
| field_mapping | P0 | 待确认 | 18 |
| owner_decision | P0 | owner_decision_packet_ready | 1 |
| owner_signoff | P0 | 未发起 | 30 |

## 3. Owner Sign-off Packet

Owner sign-off 必须确认口径、版本、分母、粒度、例外规则。当前 `owner` 字段均为 `待确认`，因此本 packet 按指标/业务问题列出，不代填 owner。

| target_ref | sign-off topic | required decision |
|---|---|---|
| `SCM-MECE-L3-001` | 日常预测准确率 | 预测口径、预测版本、误差分母与时间粒度。 |
| `SCM-MECE-L3-007` | 推荐采购量 | 是否扣减在途、未交 PO 和安全库存。 |
| `SCM-MECE-L3-016` | 采购交付率 | 供应商交付完成口径与迟到容忍窗口。 |
| `SCM-MECE-L3-019` | 供应商 OTIF | 准时与足量定义。 |
| `SCM-MECE-L3-027` | 业务可用库存 | 是否扣减预占、冻结、残次与不可售。 |
| `SCM-MECE-L3-032` | 备货计划库存 | 来源规则与默认 0 处理。 |
| `SCM-MECE-L3-036` | 全链条库存资金周转天数 | 金额口径、日均 COGS、在途/未交 PO 纳入规则。 |
| `SCM-MECE-L3-044` | 负可用库存经营主键数 | 业务允许场景与例外。 |
| `SCM-MECE-L3-056` | 盘点准确率 | 盘点差异分母与账实一致口径。 |
| `SCM-MECE-L3-066` | 妥投率 | 尾程妥投口径与平台回传时间。 |
| `SCM-MECE-L3-077` | 供应链总成本率 | 成本归集范围和销售额分母。 |
| `SCM-MECE-L3-087` | 库存减值率 | 减值口径与账龄分层。 |
| `SCM-MECE-L3-112` | 计划达成率 | 计划类型与完成口径。 |
| `SCM-MECE-L3-113` | SKU 缺货率 | SKU 缺货判断主键与应可售范围。 |
| `SCM-MECE-L3-114` | 件数缺货率 | 缺货件数损失的预测基线。 |
| `SCM-MECE-L3-115` | 金额缺货率 | 缺货金额损失的 GMV 口径。 |
| `SCM-MECE-L3-116` | 断货损失金额 | 损失金额采用 GMV 还是毛利。 |
| `SCM-MECE-L3-117` | 安全库存覆盖率 | 安全库存阈值版本和 ABC 分层。 |
| `SCM-MECE-L3-118` | 库存-销售匹配度 | 库存结构与销售结构的评分权重。 |
| `SCM-MECE-L3-119` | TOP3 供应商采购集中度 | 采购金额口径与供应商聚合口径。 |
| `SCM-MECE-L3-121` | 采购订单周期天数 | PO 创建、交付、入库完成时间点。 |
| `SCM-MECE-L3-122` | 库容利用率 | 库容容量单位、可用库容与冻结库容处理。 |
| `SCM-MECE-L3-124` | 拣货效率 UPH | 作业小时、拣货件数和异常订单排除规则。 |
| `SCM-MECE-L3-126` | 调拨成功率 | 调拨成功判断、完成窗口和取消单排除规则。 |
| `SCM-MECE-L3-127` | 调拨周期天数 | 调拨创建、发出、到达、上架节点。 |
| `SCM-MECE-L3-128` | 调拨数量达成率 | 调拨量与实收量差异处理。 |
| `SCM-MECE-L3-131` | 物流成本率 | 头程、仓储、尾程是否全部纳入。 |
| `SCM-MECE-L3-137` | 未匹配计划库存数量 | GTIN/MSKU/SKU 映射失败规则。 |
| `SCM-MECE-L3-138` | 库存同步延迟分钟数 | 来源系统同步时间与任务时间。 |
| `SCM-MECE-L3-139` | 业务默认 0 字段占比 | 默认 0 字段是质量问题还是业务规则。 |

Sign-off 接受标准：

1. 有明确 owner 和签署日期。
2. 有口径说明和适用范围。
3. 有 source/evidence 引用。
4. 如有例外，必须写明例外规则。
5. 不接受空泛批准或 agent 代签。

## 4. Field Mapping Evidence Request

字段映射不能通过猜测补齐。每条 mapping 至少需要 source system、table/view、field、join key、snapshot grain、更新频率、owner。

| owner | count | target_refs |
|---|---:|---|
| 仓储运营 Owner | 3 | `SCM-MECE-L3-122`, `SCM-MECE-L3-123`, `SCM-MECE-L3-124` |
| 库存运营 Owner | 6 | `SCM-MECE-L3-113`, `SCM-MECE-L3-114`, `SCM-MECE-L3-115`, `SCM-MECE-L3-116`, `SCM-MECE-L3-117`, `SCM-MECE-L3-118` |
| 数据治理 Owner | 3 | `SCM-MECE-L3-137`, `SCM-MECE-L3-138`, `SCM-MECE-L3-139` |
| 财务/成本 Owner | 6 | `SCM-MECE-L3-036`, `SCM-MECE-L3-077`, `SCM-MECE-L3-087`, `SCM-MECE-L3-088`, `SCM-MECE-L3-131`, `SCM-MECE-L3-133` |

字段证据模板：

| field | required value |
|---|---|
| source_system | ERP / OMS / WMS / Finance / BI mart 的真实系统名。 |
| table_or_view | 真实表、视图或导出文件名。 |
| field_name | 真实字段名，不接受自然语言描述替代。 |
| join_key | SKU/MSKU/GTIN/warehouse/order/supplier/date 等连接键。 |
| grain | day / SKU / warehouse / order / supplier 等粒度。 |
| update_frequency | 实时、小时、日批、月结等。 |
| owner | 可签署 owner。 |
| evidence_link | 截图、数据字典、SQL、schema export 或审批记录。 |

## 5. SCEI Weight Source Packet

当前 `SCM-MECE-L0-001` 到五个 L0 子项的 `kpi_tree.weight` 为空，且治理说明明确只有旧两轴 cost 50% + fulfillment 50% 证据，不足以推出五维 SCEI 权重。

| child_metric_id | 子项 | required owner decision |
|---|---|---|
| `SCM-MECE-L0-002` | 成本效率指数 | 是否继承旧成本 50% 的一部分，还是按新五维方法重设。 |
| `SCM-MECE-L0-003` | 可售性保障率 | 断货、可售覆盖对 SCEI 的权重。 |
| `SCM-MECE-L0-004` | 库存资金效率指数 | 周转、超龄、减值对 SCEI 的权重。 |
| `SCM-MECE-L0-005` | 履约体验达成率 | 是否继承旧履约 50% 的一部分，还是按新五维方法重设。 |
| `SCM-MECE-L0-006` | 指标数据可信通过率 | 独立权重、扣分门槛，还是健康门禁。 |

接受标准：

1. 五个权重范围均为 `0 <= weight <= 1`。
2. 合计为 `1.0`，允许浮点误差 `0.0001`。
3. 每个权重有依据类型：`methodology`、`business_priority`、`historical_backtest` 或 `governance_gate`。
4. 每个权重有 owner sign-off。
5. 回填前仍只允许本地 SQLite，不写生产库。

## 6. Manual Gate Ledger

| gate | current status | packet status | unblock condition | if rejected |
|---|---|---|---|---|
| owner_signoff | `未发起` x 30 | review packet ready | owner 对每项给出口径签字。 | 保持 P0 gate，不开放 provider/writeback。 |
| field_mapping | `待确认` x 18 | evidence request ready | 提供真实 source/table/field/join/grain。 | 保持 blocked_source_required，不编造映射。 |
| owner_decision | `owner_decision_packet_ready` x 1 | SCEI packet carried forward | 提供五维权重与依据。 | SCEI 权重继续为空。 |

## 7. B42-5/B42-8 Done Criteria

| criteria | status |
|---|---|
| Owner sign-off packet 已生成 | done |
| Field mapping request 已生成 | done |
| SCEI weight packet 已复用并升级为 release gate | done |
| Manual gate ledger 已生成 | done |
| SQLite pending 状态未改成完成 | done |
