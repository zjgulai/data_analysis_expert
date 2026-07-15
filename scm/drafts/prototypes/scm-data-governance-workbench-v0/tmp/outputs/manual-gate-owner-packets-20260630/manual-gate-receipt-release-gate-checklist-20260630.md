---
title: "SCM Manual Gate Receipt Release Gate Checklist"
doc_type: release_gate_checklist
module: scm
topic: manual-gate-receipt-release-gate-checklist
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "receipt acceptance checklist; fixture and dry-run only; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
acceptance_matrix_csv: "manual-gate-receipt-acceptance-matrix-20260630.csv"
---

# SCM Manual Gate Receipt Release Gate Checklist

## 1. Boundary

- `productionWrites=false`
- `providerCalls=false`
- `erpWriteback=false`
- `status_mutation=false`
- `readyForStatusMutation=false`
- `proposedStatusMutations=0`
- `sourceReadMode=csv_read_only`
- Real owner receipt import remains a later manual authorization item.

## 2. Required Modes

| Mode | Required Command Shape | Expected Result | Gate |
|---|---|---|---|
| Template | default validator mode | `receiptFiles=8`, `totalRows=53`, `templateRowsAwaitingReceipt=53` | Must pass before sending templates |
| Formal intake blank | `SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false` | `totalRows=53`, `blockedReceiptRows=53`, `statusPlanEligibleRows=0` | Must stay blocked until real owner receipts exist |
| Positive fixture | `SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV=tmp/fixtures/manual-gate-receipt-positive-fixture-20260630.csv` | `totalRows=2`, `statusPlanEligibleRows=2`, `proposedStatusMutations=0` | Proves complete receipt routing only |
| Negative fixture | `SCM_MANUAL_GATE_EXPECTED_BLOCKERS=true` plus negative fixture CSV | `totalRows=3`, `blockedReceiptRows=3`, `expectedBlockerValidation.satisfied=true` | Proves blocker routing only |

## 3. Strict vs Expected-Blockers

Use strict mode for:

- receipt templates
- formal intake
- positive fixture
- any future real owner receipt intake

Use expected-blockers mode only for:

- fixture-only negative rows
- commands that set `SCM_MANUAL_GATE_EXPECTED_BLOCKERS=true`
- validations that also verify strict mode returns nonzero for the same negative fixture

Never use expected-blockers mode for:

- real owner receipt imports
- release acceptance of formal intake
- any path that writes SQLite, production systems, ERP, OMS, WMS, TMS, or provider state

## 4. Manual Release Gate

Before any real receipt import is considered, confirm:

1. Owner guide and field values CSV are attached to the review packet.
2. Each owner row uses one of:
   - `approved_for_manual_review`
   - `approved_with_conditions`
   - `rejected_needs_rework`
3. `evidence_ref`, `signoff_date`, `scope`, and `rollback_rule` are filled from real owner evidence.
4. `status_mutation=false` remains unchanged.
5. `boundary_note` contains `status_mutation_false`.
6. Strict validator mode passes for the real intake.
7. Status plan still has `proposedStatusMutations=0`.
8. A separate human authorization exists before any status mutation feature is designed.

## 5. Non-Goals

- No real owner receipt ingestion.
- No SQLite task-state mutation.
- No production writeback.
- No provider call.
- No UI or server behavior change.
