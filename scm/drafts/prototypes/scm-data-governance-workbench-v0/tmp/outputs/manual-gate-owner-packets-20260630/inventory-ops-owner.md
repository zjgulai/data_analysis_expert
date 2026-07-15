---
title: "SCM Manual Gate Owner Packet - 库存运营 Owner"
doc_type: owner_packet
module: scm
topic: manual-gate-owner-packet
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: "库存运营 Owner"
source: codex
boundary: "manual review packet; sqlite read-only export; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
generated_at: "2026-06-30T04:30:00.000Z"
---

# SCM Manual Gate Owner Packet - 库存运营 Owner

## Boundary

- status_mutation=false
- source_read_mode=sqlite_read_only
- providerCalls=false
- productionWrites=false
- erpWriteback=false
- manual_review_required=true

## Counts

- owner_signoff=12
- field_mapping=6
- scei_weight_source=0
- total=18

## Closure Inputs

- owner_signoff: owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref
- field_mapping: source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref
- scei_weight_source: proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result

## Open Items

| Gate | Type | Metric | Current Status | Required Decision | Evidence Fields |
|---|---|---|---|---|---|
| signoff_8 | owner_signoff | business_available_qty 业务可用库存 | 未发起 | 确认可用库存是否扣减预占、冻结、残次与不可售 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_9 | owner_signoff | stocking_planned_inventory_qty 备货计划库存 | 未发起 | 确认备货计划库存的来源规则与默认0处理 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_16 | owner_signoff | negative_available_inventory_count 负可用库存经营主键数 | 未发起 | 确认负可用库存的业务允许场景与例外 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_19 | owner_signoff | inventory_count_accuracy_rate 盘点准确率 | 未发起 | 确认盘点差异分母与账实一致口径 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_10 | owner_signoff | sku_oos_rate SKU 缺货率 | 未发起 | 确认SKU缺货判断主键与应可售范围 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_11 | owner_signoff | unit_oos_rate 件数缺货率 | 未发起 | 确认缺货件数损失的预测基线 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_12 | owner_signoff | gmv_oos_rate 金额缺货率 | 未发起 | 确认缺货金额损失的GMV口径 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_13 | owner_signoff | stockout_loss_amount 断货损失金额 | 未发起 | 确认损失金额采用GMV还是毛利 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_14 | owner_signoff | safety_stock_coverage_rate 安全库存覆盖率 | 未发起 | 确认安全库存阈值版本和ABC分层 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_15 | owner_signoff | inventory_sales_match_score 库存-销售匹配度 | 未发起 | 确认库存结构与销售结构的评分权重 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_17 | owner_signoff | storage_capacity_utilization_rate 库容利用率 | 未发起 | 确认库容容量单位、可用库容与冻结库容处理 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_18 | owner_signoff | picking_uph 拣货效率 UPH | 未发起 | 确认作业小时、拣货件数和异常订单排除规则 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| mapping_46 | field_mapping | sku_oos_rate SKU 缺货率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_48 | field_mapping | unit_oos_rate 件数缺货率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_43 | field_mapping | gmv_oos_rate 金额缺货率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_47 | field_mapping | stockout_loss_amount 断货损失金额 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_45 | field_mapping | safety_stock_coverage_rate 安全库存覆盖率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_52 | field_mapping | inventory_sales_match_score 库存-销售匹配度 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
