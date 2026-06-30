---
title: "SCM Manual Gate Owner Packet - 采购与供应商 Owner"
doc_type: owner_packet
module: scm
topic: manual-gate-owner-packet
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: "采购与供应商 Owner"
source: codex
boundary: "manual review packet; sqlite read-only export; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
generated_at: "2026-06-30T04:30:00.000Z"
---

# SCM Manual Gate Owner Packet - 采购与供应商 Owner

## Boundary

- status_mutation=false
- source_read_mode=sqlite_read_only
- providerCalls=false
- productionWrites=false
- erpWriteback=false
- manual_review_required=true

## Counts

- owner_signoff=4
- field_mapping=0
- scei_weight_source=0
- total=4

## Closure Inputs

- owner_signoff: owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref
- field_mapping: source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref
- scei_weight_source: proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result

## Open Items

| Gate | Type | Metric | Current Status | Required Decision | Evidence Fields |
|---|---|---|---|---|---|
| signoff_4 | owner_signoff | purchase_delivery_rate 采购交付率 | 未发起 | 确认供应商交付完成口径与迟到容忍窗口 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_5 | owner_signoff | supplier_otif_rate 供应商 OTIF | 未发起 | 确认供应商OTIF的准时与足量定义 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_6 | owner_signoff | supplier_top3_purchase_concentration TOP3 供应商采购集中度 | 未发起 | 确认采购金额口径与供应商聚合口径 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_7 | owner_signoff | purchase_order_cycle_days 采购订单周期天数 | 未发起 | 确认PO创建、交付、入库完成时间点 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
