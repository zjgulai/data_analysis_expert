import type {
  OwnerDecisionChoice,
  OwnerDecisionPacket
} from "./decisionLoopModels";
import type {
  FinanceCostEvidencePacket,
  RiskThresholdVersion,
  ThresholdValueReviewPacket
} from "./governanceModels";

export type DecisionLogRequestPayload = {
  id: string;
  insightTitle: string;
  linkedMetricId: string;
  recommendation: string;
  actionBoundary: string;
  status: string;
  reviewNote: string;
  actor: string;
};

export function buildThresholdReviewDecisionLog(
  threshold: RiskThresholdVersion,
  status: string,
  label: string,
  timestamp = Date.now()
): DecisionLogRequestPayload {
  return {
    id: `decision_threshold_${threshold.id.toLowerCase()}_${status}_${timestamp}`,
    insightTitle: `${threshold.name} - ${label}`,
    linkedMetricId: `risk_threshold.${threshold.id}`,
    recommendation: `${threshold.ownerQuestion}；阶段选择=${label}`,
    actionBoundary: threshold.reviewBoundary,
    status,
    reviewNote: `${threshold.version} remains ${threshold.activationState}; source evidence refs=${threshold.evidenceRefs.join(",")}.`,
    actor: threshold.owner
  };
}

export function buildThresholdOwnerChoiceDecisionLog(
  packet: OwnerDecisionPacket,
  choice: OwnerDecisionChoice,
  timestamp = Date.now()
): DecisionLogRequestPayload {
  return {
    id: `decision_threshold_owner_${packet.id.toLowerCase()}_${choice.code.toLowerCase()}_${timestamp}`,
    insightTitle: `${packet.title} - ${choice.code}`,
    linkedMetricId: packet.linkedMetricId,
    recommendation: `${packet.recommendation}；选择=${choice.label}`,
    actionBoundary: packet.actionBoundary,
    status: choice.status,
    reviewNote: `${choice.reviewNote} Boundary: operationalScoring=false; businessRowsImported=false; providerCalls=false; erpWriteback=false.`,
    actor: packet.owner
  };
}

export function buildThresholdValueReviewDecisionLog(
  packet: ThresholdValueReviewPacket,
  choice: OwnerDecisionChoice,
  timestamp = Date.now()
): DecisionLogRequestPayload {
  return {
    id: `decision_threshold_value_${packet.id.toLowerCase()}_${choice.code.toLowerCase()}_${timestamp}`,
    insightTitle: `${packet.title} - ${choice.code}`,
    linkedMetricId: `risk_threshold_value.${packet.thresholdId}`,
    recommendation: `${packet.sampleQuestion}；选择=${choice.label}`,
    actionBoundary: packet.actionBoundary,
    status: choice.status,
    reviewNote: `${choice.reviewNote} Boundary: thresholdValuesApproved=false; operationalScoring=false; businessRowsImported=false; autoActionTaskCreation=false.`,
    actor: packet.owner
  };
}

export function buildFinanceReviewDecisionLog(
  packet: FinanceCostEvidencePacket,
  status: string,
  label: string,
  timestamp = Date.now()
): DecisionLogRequestPayload {
  return {
    id: `decision_finance_${packet.id.toLowerCase()}_${status}_${timestamp}`,
    insightTitle: `${packet.title} - ${label}`,
    linkedMetricId: `finance_cost.${packet.id}`,
    recommendation: `${packet.nextOwnerDecision}；阶段选择=${label}`,
    actionBoundary: packet.boundary,
    status,
    reviewNote: `${packet.owner} review recorded; billDrilldown=false; transactionDetailImport=false.`,
    actor: packet.owner
  };
}

export function buildFinanceOwnerChoiceDecisionLog(
  packet: OwnerDecisionPacket,
  choice: OwnerDecisionChoice,
  timestamp = Date.now()
): DecisionLogRequestPayload {
  return {
    id: `decision_finance_owner_${packet.id.toLowerCase()}_${choice.code.toLowerCase()}_${timestamp}`,
    insightTitle: `${packet.title} - ${choice.code}`,
    linkedMetricId: packet.linkedMetricId,
    recommendation: `${packet.recommendation}；选择=${choice.label}`,
    actionBoundary: packet.actionBoundary,
    status: choice.status,
    reviewNote: `${choice.reviewNote} Boundary: billDrilldown=false; transactionDetailImport=false; providerCalls=false; erpWriteback=false.`,
    actor: packet.owner
  };
}
