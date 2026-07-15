---
title: "SCM Manual Gate Owner Packet - 供应链数据治理 Owner"
doc_type: owner_packet
module: scm
topic: manual-gate-owner-packet
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: "供应链数据治理 Owner"
source: codex
boundary: "manual review packet; sqlite read-only export; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
generated_at: "2026-06-30T04:30:00.000Z"
---

# SCM Manual Gate Owner Packet - 供应链数据治理 Owner

## Boundary

- status_mutation=false
- source_read_mode=sqlite_read_only
- providerCalls=false
- productionWrites=false
- erpWriteback=false
- manual_review_required=true

## Counts

- owner_signoff=0
- field_mapping=0
- scei_weight_source=5
- total=5

## Closure Inputs

- owner_signoff: owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref
- field_mapping: source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref
- scei_weight_source: proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result

## Open Items

| Gate | Type | Metric | Current Status | Required Decision | Evidence Fields |
|---|---|---|---|---|---|
| tree_SCEI_SCM-MECE-L0-002 | scei_weight_source | cost_efficiency_index 成本效率指数 | owner_decision_packet_ready | T4 20260627 structural SCEI component. Weight blocked: only dual-axis cost 50% + fulfillment 50% is explicit in 03_指标树图可视化/README.md; no five-dimensional SCEI split in source docs. | proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result |
| tree_SCEI_SCM-MECE-L0-003 | scei_weight_source | sellable_availability_rate 可售性保障率 | owner_decision_packet_ready | T4 20260627 structural SCEI component. Weight blocked: sellable availability is listed in SCEI formula, but no explicit five-dimensional weight basis found. | proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result |
| tree_SCEI_SCM-MECE-L0-004 | scei_weight_source | inventory_capital_efficiency_index 库存资金效率指数 | owner_decision_packet_ready | T4 20260627 structural SCEI component. Weight blocked: inventory capital efficiency is listed in SCEI formula, but no explicit five-dimensional weight basis found. | proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result |
| tree_SCEI_SCM-MECE-L0-005 | scei_weight_source | fulfillment_experience_rate 履约体验达成率 | owner_decision_packet_ready | T4 20260627 structural SCEI component. Weight blocked: only dual-axis cost 50% + fulfillment 50% is explicit; five-dimensional SCEI split requires owner approval. | proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result |
| tree_SCEI_SCM-MECE-L0-006 | scei_weight_source | metric_data_trust_pass_rate 指标数据可信通过率 | owner_decision_packet_ready | T4 20260627 structural SCEI component. Weight blocked: data trust is listed in SCEI formula, but no explicit five-dimensional weight basis found. | proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result |
