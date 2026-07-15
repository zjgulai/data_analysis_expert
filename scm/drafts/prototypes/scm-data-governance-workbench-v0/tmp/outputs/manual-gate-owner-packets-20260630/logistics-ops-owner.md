---
title: "SCM Manual Gate Owner Packet - 物流运营 Owner"
doc_type: owner_packet
module: scm
topic: manual-gate-owner-packet
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: "物流运营 Owner"
source: codex
boundary: "manual review packet; sqlite read-only export; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
generated_at: "2026-06-30T04:30:00.000Z"
---

# SCM Manual Gate Owner Packet - 物流运营 Owner

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
| signoff_23 | owner_signoff | last_mile_delivery_rate 妥投率 | 未发起 | 确认尾程妥投口径与平台回传时间 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_20 | owner_signoff | transfer_success_rate 调拨成功率 | 未发起 | 确认调拨成功判断、完成窗口和取消单排除规则 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_21 | owner_signoff | transfer_cycle_days 调拨周期天数 | 未发起 | 确认调拨创建、发出、到达、上架节点 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_22 | owner_signoff | transfer_quantity_fulfillment_rate 调拨数量达成率 | 未发起 | 确认确认调拨量与实收量差异处理 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
