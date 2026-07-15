---
title: "SCM Manual Gate Owner Packet - 计划 Owner"
doc_type: owner_packet
module: scm
topic: manual-gate-owner-packet
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: "计划 Owner"
source: codex
boundary: "manual review packet; sqlite read-only export; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
generated_at: "2026-06-30T04:30:00.000Z"
---

# SCM Manual Gate Owner Packet - 计划 Owner

## Boundary

- status_mutation=false
- source_read_mode=sqlite_read_only
- providerCalls=false
- productionWrites=false
- erpWriteback=false
- manual_review_required=true

## Counts

- owner_signoff=3
- field_mapping=0
- scei_weight_source=0
- total=3

## Closure Inputs

- owner_signoff: owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref
- field_mapping: source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref
- scei_weight_source: proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result

## Open Items

| Gate | Type | Metric | Current Status | Required Decision | Evidence Fields |
|---|---|---|---|---|---|
| signoff_1 | owner_signoff | forecast_accuracy_daily 日常预测准确率 | 未发起 | 确认预测口径、预测版本、误差分母与时间粒度 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_2 | owner_signoff | recommended_purchase_qty 推荐采购量 | 未发起 | 确认建议采购数量是否扣减在途、未交PO和安全库存 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
| signoff_3 | owner_signoff | plan_attainment_rate 计划达成率 | 未发起 | 确认计划达成的计划类型与完成口径 | owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref |
