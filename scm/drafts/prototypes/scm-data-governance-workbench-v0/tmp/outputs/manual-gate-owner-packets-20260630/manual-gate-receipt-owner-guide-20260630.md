---
title: "SCM Manual Gate Receipt Owner Guide"
doc_type: owner_receipt_guide
module: scm
topic: manual-gate-receipt-owner-guide
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "owner-facing manual receipt guide; csv contract only; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
field_values_csv: "manual-gate-receipt-field-values-20260630.csv"
receipt_intake_csv: "../../data/manual-gate-receipts-intake-20260630.csv"
---

# SCM Manual Gate Receipt Owner Guide

## 1. 适用范围

本说明用于 owner 填写 `manual-gate-receipts-intake-20260630.csv` 前的人工门禁。它只定义 CSV 字段、合法值和复核路径，不代表 owner 已签核，不触发任何状态变更。

边界：

- `status_mutation=false`
- `providerCalls=false`
- `productionWrites=false`
- `erpWriteback=false`
- `readyForStatusMutation=false`
- 动作止于 `manual_*_review_queue`，不写 ERP/OMS/WMS/TMS。

## 2. 填写原则

1. 不修改身份字段：`owner`、`packet_type`、`gate_id`、`target_ref`、`metric_code`、`metric_name`。
2. 只填写人工回执字段：`decision_result`、`evidence_ref`、`signoff_date`、`scope`、`rollback_rule`。
3. `status_mutation` 必须保持 `false`。
4. `boundary_note` 必须保留并包含 `status_mutation_false`。
5. 没有真实证据时保持空白，不用 fixture、示例值或推测值补齐。

## 3. `decision_result` 合法值

| Value | 含义 | 后续路径 |
|---|---|---|
| `approved_for_manual_review` | owner 同意该回执进入人工复核 | 进入对应 `manual_*_review_queue` |
| `approved_with_conditions` | owner 有条件同意，条件必须写在 `scope` 或 `evidence_ref` 指向的材料中 | 进入对应 `manual_*_review_queue`，复核时检查条件 |
| `rejected_needs_rework` | owner 不同意当前门禁结论，需要补证或重做映射/权重/口径 | 进入对应 `manual_*_review_queue`，不得推进状态 |

不允许使用示例值、自由文本、缩写、中文口语值或 AI 生成的推测值。

## 4. 字段填写说明

| Field | Owner 是否填写 | 填写规则 |
|---|---:|---|
| `owner` | 否 | 保持 packet 中的 owner 名称。 |
| `packet_type` | 否 | 只能使用已生成值：`owner_signoff` / `field_mapping` / `scei_weight_source`。 |
| `gate_id` | 否 | 保持门禁编号，如 `signoff_26`、`mapping_61`。 |
| `target_ref` | 否 | 保持指标或对象引用。 |
| `metric_code` | 否 | 保持指标编码。 |
| `metric_name` | 否 | 保持指标名称。 |
| `decision_result` | 是 | 必须取第 3 节三值之一。 |
| `evidence_ref` | 是 | 填真实证据引用，如审批单、导出文件、数据字典、工单或会议纪要路径。 |
| `signoff_date` | 是 | 使用 `YYYY-MM-DD`。 |
| `scope` | 是 | 写清本次签核覆盖范围、条件、排除项和适用周期。 |
| `rollback_rule` | 是 | 写清发现问题时如何撤回、重审或回滚该回执。 |
| `status_mutation` | 否 | 固定 `false`。 |
| `boundary_note` | 否 | 必须包含 `status_mutation_false`。 |

## 5. 复核路由

| `packet_type` | `proposedReviewRoute` |
|---|---|
| `owner_signoff` | `manual_owner_signoff_review_queue` |
| `field_mapping` | `manual_field_mapping_review_queue` |
| `scei_weight_source` | `manual_scei_weight_review_queue` |

路由只是人工复核队列，不是状态变更目标。

## 6. 示例

可接受：

```csv
decision_result,evidence_ref,signoff_date,scope,rollback_rule,status_mutation,boundary_note
approved_for_manual_review,approval://scm/manual-gate/signoff-26,2026-06-30,仅覆盖 2026Q2 财务口径且排除历史补录,reopen_gate_if_finance_owner_revokes,false,manual_receipt_status_mutation_false
```

不可接受：

```csv
decision_result,evidence_ref,signoff_date,scope,rollback_rule,status_mutation,boundary_note
ok,,2026/6/30,全部,无,true,manual_receipt
```

## 7. 验收口径

validator 在 `templateMode=false` 时会检查：

- CSV 列顺序完全一致。
- 身份字段不为空。
- 人工回执字段完整。
- `decision_result` 属于三值枚举。
- `status_mutation=false`。
- `boundary_note` 包含 `status_mutation_false`。
- 支持的 `packet_type` 能映射到人工复核队列。

即使全部通过，status plan 仍保持 `proposedStatusMutations=0`、`readyForStatusMutation=false`。
