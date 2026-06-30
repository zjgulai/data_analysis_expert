---
title: "SCM Manual Gate Owner Packet - 仓储运营 Owner"
doc_type: owner_packet
module: scm
topic: manual-gate-owner-packet
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: "仓储运营 Owner"
source: codex
boundary: "manual review packet; sqlite read-only export; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
generated_at: "2026-06-30T04:30:00.000Z"
---

# SCM Manual Gate Owner Packet - 仓储运营 Owner

## Boundary

- status_mutation=false
- source_read_mode=sqlite_read_only
- providerCalls=false
- productionWrites=false
- erpWriteback=false
- manual_review_required=true

## Counts

- owner_signoff=0
- field_mapping=3
- scei_weight_source=0
- total=3

## Closure Inputs

- owner_signoff: owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref
- field_mapping: source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref
- scei_weight_source: proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result

## Open Items

| Gate | Type | Metric | Current Status | Required Decision | Evidence Fields |
|---|---|---|---|---|---|
| mapping_34 | field_mapping | storage_capacity_utilization_rate 库容利用率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_32 | field_mapping | pallet_fill_rate 托盘填充率 | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
| mapping_33 | field_mapping | picking_uph 拣货效率 UPH | 待确认 | 待确认源字段（表/字段） | source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref |
