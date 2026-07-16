export const manualGateReceiptDecisionResults = Object.freeze({
  approved_for_manual_review: "Owner approves this receipt for downstream manual review.",
  approved_with_conditions: "Owner approves with explicit conditions captured in scope/evidence_ref.",
  rejected_needs_rework: "Owner rejects this gate and requests rework before another receipt."
});

// Receipt validation and governance-task completion are distinct proof layers.
// Only these established persisted task statuses close each manual gate.
export const manualGateCompletionStatuses = Object.freeze({
  owner_signoff: Object.freeze(["已签字", "certified", "done"]),
  field_mapping: Object.freeze(["已映射", "certified", "done"]),
  scei_weight_source: Object.freeze(["已签字", "certified", "done"])
});

export function isAcceptedManualGateCompletionStatus(gateType, status) {
  return (manualGateCompletionStatuses[gateType] || []).includes(String(status || "").trim());
}
