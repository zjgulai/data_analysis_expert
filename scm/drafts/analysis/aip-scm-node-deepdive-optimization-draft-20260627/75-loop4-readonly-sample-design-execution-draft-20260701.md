---
title: "Loop 4 Readonly Sample Design Execution Draft"
doc_type: execution_summary
module: scm
topic: loop4-readonly-sample-design
status: draft_loop4_done_design_review_required
created: 2026-07-01
updated: 2026-07-01
owner: self
source: runtime_metadata_projection_allowlist
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  omsWmsWriteback: false
  localSqliteWrites: false
  businessRowsImported: false
  sourceSystemReads: false
  runtimeImportAuthorized: false
  actionCeiling: "readonly_sample_design_packet_only"
depends_on:
  - "72-loop-engineering-execution-plan-draft-20260701.md"
  - "74-loop3-business-closed-loops-execution-draft-20260701.md"
---

# Loop 4 Readonly Sample Design Execution

## 1. Loop 4 目标

把 Loop 3 的库存、成本、履约三条本地闭环转成可审批的只读样本设计包：

1. 校准 `runtime-metadata-projection.json` 中 62 个 allowlist 字段和 26 个 excluded sensitive identifier 字段。
2. 生成库存、成本、履约三类空样本模板。
3. 生成 DQ 检查规格和 runtime import gate 清单。
4. 保持 `businessRowsImported=false`，本轮只进入设计评审。

## 2. 生成产物

| artifact | path | rows | 用途 |
|---|---|---:|---|
| Field policy | `tmp/outputs/loop4-readonly-sample-design-20260701/loop4-field-policy-20260701.csv` | 62 | 每个 allowlist field 绑定 sample domain、脱敏/转换规则、DQ group 和 Loop 3 场景。 |
| Excluded sensitive fields | `tmp/outputs/loop4-readonly-sample-design-20260701/loop4-excluded-sensitive-fields-20260701.csv` | 26 | 明确本轮样本包排除的敏感运营标识及替代策略。 |
| Inventory template | `tmp/outputs/loop4-readonly-sample-design-20260701/loop4-inventory-snapshot-template-20260701.csv` | 0 data rows | 库存/缺货样本空模板。 |
| Cost template | `tmp/outputs/loop4-readonly-sample-design-20260701/loop4-cost-event-template-20260701.csv` | 0 data rows | 尾程、仓储、退货费用样本空模板。 |
| Fulfillment template | `tmp/outputs/loop4-readonly-sample-design-20260701/loop4-fulfillment-task-template-20260701.csv` | 0 data rows | ETA、仓内任务、履约状态样本空模板。 |
| DQ rules | `tmp/outputs/loop4-readonly-sample-design-20260701/loop4-dq-rules-20260701.csv` | 19 | 必填、重复粒度、负数、币种、时间戳、敏感字段扫描等检查规格。 |
| Runtime import gate checklist | `tmp/outputs/loop4-readonly-sample-design-20260701/loop4-runtime-import-gate-checklist-20260701.csv` | 10 | 从设计包进入后续只读样本 PoC 前必须满足的 gate。 |
| Evidence summary | `tmp/outputs/loop4-readonly-sample-design-20260701/loop4-evidence-summary-20260701.json` | 1 | 记录来源、边界、计数和 template schema。 |

## 3. 字段校准结果

| 分类 | count | 说明 |
|---|---:|---|
| Runtime candidate fields | 88 | 来自现有 runtime metadata projection。 |
| Active allowlist fields | 62 | 本轮进入字段策略表。 |
| Excluded sensitive identifier fields | 26 | 本轮继续排除。 |
| Inventory sample fields | 40 | 覆盖 `InventoryBatch`、`InventoryTransaction`、`SKU`。 |
| Cost sample fields | 3 | 覆盖 `CostEvent` 的费用类型、币种、金额。 |
| Fulfillment sample fields | 19 | 覆盖 `WarehouseTask` 的任务、状态、时间和仓内执行字段。 |

## 4. 三类模板边界

| template | grain | tokenization / masking | prohibited examples |
|---|---|---|---|
| Inventory snapshot | `sample_date + platform + country + sku_token + warehouse_token` | SKU、仓库、位置、操作单等标识进入稳定 token。 | `sales_order_no`、`tracking_no`、`serial_no`、`customer_code`。 |
| Cost event | `period + platform + country + category_token + cost_type` | 成本金额建议 bucket 化，真实金额需财务 Owner 单独审批。 | raw bill line、raw transaction id、订单号、跟踪号。 |
| Fulfillment task | `period + platform + country + warehouse_token + task_group_token` | 仓库、任务、波次、单据字段进入 token；时间按授权粒度保留。 | `tracking_no`、`sales_order_no`、`serial_no`、`batch_no`。 |

## 5. DQ 与 Import Gate

| 维度 | 已生成规则 |
|---|---|
| Common DQ | 必填 key、敏感字段扫描、重复粒度、证据引用。 |
| Inventory DQ | 库存数值、负可用解释、库存公式、快照时间、SKU/仓 token 稳定性。 |
| Cost DQ | 币种、金额 bucket、费用类型枚举、成本率分母、汇率期间。 |
| Fulfillment DQ | 任务状态枚举、时间顺序、ETA 指标 caveat、跟踪号/订单号排除、仓内任务粒度。 |
| Import Gate | scope approval、allowlist lock、excluded scan、tokenization review、DQ precheck、manual gate link、SQLite boundary、production boundary、sample row cap、approval packet。 |

## 6. 边界声明

| 类型 | 结论 |
|---|---|
| 事实 | 本轮只生成本地 CSV/JSON/Markdown 设计包。 |
| 事实 | `localSqliteWrites=false`，没有改动 SQLite。 |
| 事实 | 三份样本模板只有表头，`templateRowsIncluded=0`。 |
| 事实 | `businessRowsImported=false`、`sourceSystemReads=false`、`runtimeImportAuthorized=false`。 |
| 事实 | `npm run check`、`preprod:check`、`git diff --check` 已复跑；hard blockers 0、manual gates 3、dirtyCount 31。 |
| 推断 | 当前设计包可以进入 Product/Security/Data Governance 评审。 |
| 不确定项 | 真实样本行、真实源字段证据、token map 保存位置、样本保留周期仍需 owner/security 审批。 |

## 7. 下一 Loop 建议

Loop 5 可以进入 Release 边界收敛：

1. 把 Loop 1-4 的文档、CSV/JSON 证据包、SQLite 状态和脚本改动归入 release file set。
2. 将当前 dirty worktree 拆成 release-critical、support-evidence、hold-out 三类。
3. 继续保持 manual gates 明确列账，不把 Loop 4 设计包解释为真实业务样本接入完成。
