---
title: "SCM Manual Gate Owner Packet - 财务/成本 Owner"
doc_type: owner_packet
module: scm
topic: manual-gate-owner-packet
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: "财务/成本 Owner"
source: codex
boundary: "manual review packet; sqlite read-only export; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
generated_at: "2026-06-30T04:30:00.000Z"
---

# SCM Manual Gate Owner Packet - 财务/成本 Owner

## Boundary

- status_mutation=false
- source_read_mode=sqlite_read_only
- providerCalls=false
- productionWrites=false
- erpWriteback=false
- manual_review_required=true

## Counts

- owner_signoff=4
- field_mapping=6
- scei_weight_source=0
- total=10

## Closure Inputs

- owner_signoff: owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref
- field_mapping: source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref
- scei_weight_source: proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result

## Open Items

| Gate | Type | Metric | Current Status | Required Decision | Evidence Fields |
|---|---|---|---|---|---|
| signoff_26 | owner_signoff | full_chain_turnover_days_amount 全链条库存资金周转天数 | 未发起 | 确认金额口径、日均COGS和在途/未交PO纳入规则 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_24 | owner_signoff | supply_chain_total_cost_rate 供应链总成本率 | 未发起 | 确认成本归集范围和销售额分母 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_27 | owner_signoff | inventory_impairment_rate 库存减值率 | 未发起 | 确认减值口径与账龄分层 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_25 | owner_signoff | logistics_cost_rate 物流成本率 | 未发起 | 确认头程、仓储、尾程是否全部纳入 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| mapping_61 | field_mapping | full_chain_turnover_days_amount 全链条库存资金周转天数 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_72 | field_mapping | supply_chain_total_cost_rate 供应链总成本率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_63 | field_mapping | inventory_impairment_rate 库存减值率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_74 | field_mapping | cost_allocation_coverage_rate 成本分摊覆盖率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_68 | field_mapping | logistics_cost_rate 物流成本率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_62 | field_mapping | inventory_amount_to_sales_ratio 库存金额销售占比 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
