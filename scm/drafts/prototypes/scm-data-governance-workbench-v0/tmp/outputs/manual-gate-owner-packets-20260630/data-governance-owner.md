---
title: "SCM Manual Gate Owner Packet - 数据治理 Owner"
doc_type: owner_packet
module: scm
topic: manual-gate-owner-packet
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: "数据治理 Owner"
source: codex
boundary: "manual review packet; sqlite read-only export; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
generated_at: "2026-06-30T04:30:00.000Z"
---

# SCM Manual Gate Owner Packet - 数据治理 Owner

## Boundary

- status_mutation=false
- source_read_mode=sqlite_read_only
- providerCalls=false
- productionWrites=false
- erpWriteback=false
- manual_review_required=true

## Counts

- owner_signoff=3
- field_mapping=3
- scei_weight_source=0
- total=6

## Closure Inputs

- owner_signoff: owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref
- field_mapping: source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref
- scei_weight_source: proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result

## Open Items

| Gate | Type | Metric | Current Status | Required Decision | Evidence Fields |
|---|---|---|---|---|---|
| signoff_28 | owner_signoff | unmatched_planned_inventory_qty 未匹配计划库存数量 | 未发起 | 确认GTIN/MSKU/SKU映射失败规则 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_29 | owner_signoff | inventory_sync_delay_minutes 库存同步延迟分钟数 | 未发起 | 确认来源系统同步时间与任务时间 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_30 | owner_signoff | business_default_zero_rate 业务默认 0 字段占比 | 未发起 | 确认默认0字段是否作为质量问题或业务规则 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| mapping_4 | field_mapping | unmatched_planned_inventory_qty 未匹配计划库存数量 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_12 | field_mapping | inventory_sync_delay_minutes 库存同步延迟分钟数 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_10 | field_mapping | business_default_zero_rate 业务默认 0 字段占比 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
