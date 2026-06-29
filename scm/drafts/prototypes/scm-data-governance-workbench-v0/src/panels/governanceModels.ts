import type { SourceCoverage } from "./agentActivityLists";
import type {
  OwnerDecisionChoice,
  OwnerDecisionPacket
} from "./decisionLoopModels";
import type { AnyRow } from "../shared/ui";

export type RiskThresholdVersion = {
  id: string;
  code: string;
  name: string;
  version: string;
  owner: string;
  riskDomain: string;
  severityBand: string;
  status: string;
  activationState: string;
  gateId: string;
  ruleDraft: string;
  scenarioRefs: string[];
  linkedMetricIds: string[];
  evidenceRefs: string[];
  sourceEvidence: SourceCoverage[];
  ownerQuestion: string;
  reviewBoundary: string;
};

export type RiskThresholdScenarioBinding = {
  scenarioId: string;
  scenarioName: string;
  priority: string;
  targetObjectType: string;
  targetObjectId: string;
  boundThresholdIds: string[];
  boundThresholdNames: string[];
  operationalScoring: string;
  ownerGate: string;
};

export type ThresholdValueReviewPacket = {
  id: string;
  thresholdId: string;
  thresholdName: string;
  title: string;
  valueFamily: string;
  owner: string;
  riskDomain: string;
  severityBand: string;
  currentRuleDraft: string;
  scenarioRefs: string[];
  metricRefs: string[];
  evidenceRefs: string[];
  sourceEvidence: SourceCoverage[];
  suggestedRange: {
    triggerExpression: string;
    reviewBand: string;
    calibrationNeed: string;
  };
  sampleQuestion: string;
  actionBoundary: string;
  approvalState: string;
  choices: OwnerDecisionChoice[];
};

export type RiskThresholdGovernancePayload = {
  thresholdVersions: RiskThresholdVersion[];
  scenarioBindings: RiskThresholdScenarioBinding[];
  ownerDecisionPackets: OwnerDecisionPacket[];
  policySummary: {
    id: string;
    title: string;
    recommendedPath: string;
    ownerChoiceStatus: string;
    status: string;
    scope: string;
    effectiveUse: string[];
    closedActions: string[];
    decisions: Array<{
      packetId: string;
      linkedMetricId: string;
      title: string;
      recommendedChoice: string;
      recommendedStatus: string;
      selectedChoice: string;
      receiptId: string;
      recorded: boolean;
    }>;
    receiptCount: number;
    evidenceRefs: string[];
    boundary: Record<string, boolean>;
  };
  valueReviewPackets: ThresholdValueReviewPacket[];
  valueReviewSummary: {
    id: string;
    title: string;
    recommendedPath: string;
    ownerValueStatus: string;
    status: string;
    scope: string;
    valueFamilies: number;
    decisions: Array<{
      packetId: string;
      thresholdId: string;
      linkedMetricId: string;
      title: string;
      recommendedChoice: string;
      recommendedStatus: string;
      selectedChoice: string;
      receiptId: string;
      recorded: boolean;
    }>;
    reviewReceiptCount: number;
    formalApprovalReceiptCount: number;
    effectiveUse: string[];
    closedActions: string[];
    boundary: Record<string, boolean>;
  };
  summary: Record<string, string | number | boolean>;
  boundary: Record<string, boolean>;
  latestThresholdReviews: AnyRow[];
};

export type FinanceCostEvidencePacket = {
  id: string;
  title: string;
  owner: string;
  costDomain: string;
  sourceRefs: string[];
  costTypes: string[];
  targetObjectType: string;
  targetProperties: string[];
  evidenceLevel: string;
  reviewGate: string;
  status: string;
  nextOwnerDecision: string;
  boundary: string;
  sourceEvidence: SourceCoverage[];
  lineageEvidence: AnyRow[];
};

export type FinanceCostGovernancePayload = {
  evidencePackets: FinanceCostEvidencePacket[];
  financeCoverage: SourceCoverage[];
  financeLineage: AnyRow[];
  costThresholds: RiskThresholdVersion[];
  ownerDecisionPackets: OwnerDecisionPacket[];
  policySummary: {
    id: string;
    title: string;
    ownerChoice: string;
    status: string;
    scope: string;
    effectiveUse: string[];
    closedActions: string[];
    decisions: Array<{
      packetId: string;
      linkedMetricId: string;
      title: string;
      policy: string;
      status: string;
      selectedChoice: string;
      receiptId: string;
      recordedStatus: string;
      recorded: boolean;
    }>;
    receiptCount: number;
    evidenceRefs: string[];
    boundary: Record<string, boolean>;
  };
  reconciliationGates: Array<{ id: string; name: string; status: string; reason: string }>;
  boundary: Record<string, boolean>;
  latestFinanceReviews: AnyRow[];
};

export function emptyRiskThresholdGovernance(): RiskThresholdGovernancePayload {
  return {
    thresholdVersions: [],
    scenarioBindings: [],
    ownerDecisionPackets: [],
    policySummary: {
      id: "",
      title: "",
      recommendedPath: "A-A-A",
      ownerChoiceStatus: "recommended_owner_pending",
      status: "draft_only_governance_policy",
      scope: "risk_governance_view_only",
      effectiveUse: [],
      closedActions: [],
      decisions: [],
      receiptCount: 0,
      evidenceRefs: [],
      boundary: {
        providerCalls: false,
        productionWrites: false,
        erpWriteback: false,
        omsWmsWriteback: false,
        operationalScoring: false,
        businessRowsImported: false,
        thresholdValuesApproved: false,
        autoActionTaskCreation: false
      }
    },
    valueReviewPackets: [],
    valueReviewSummary: {
      id: "",
      title: "",
      recommendedPath: "A-A-A-A-A",
      ownerValueStatus: "owner_values_pending",
      status: "value_review_packet_ready",
      scope: "owner_value_review_only",
      valueFamilies: 0,
      decisions: [],
      reviewReceiptCount: 0,
      formalApprovalReceiptCount: 0,
      effectiveUse: [],
      closedActions: [],
      boundary: {
        providerCalls: false,
        productionWrites: false,
        erpWriteback: false,
        omsWmsWriteback: false,
        operationalScoring: false,
        businessRowsImported: false,
        thresholdValuesApproved: false,
        autoActionTaskCreation: false
      }
    },
    summary: {
      thresholdVersionCount: 0,
      scenarioBindingCount: 0,
      ownerDecisionPacketCount: 0,
      ownerGate: "RUNTIME-IMPORT-003",
      operationalScoring: false,
      businessRowsIncluded: false
    },
    boundary: {
      providerCalls: false,
      productionWrites: false,
      erpWriteback: false,
      omsWmsWriteback: false,
      operationalScoring: false,
      businessRowsImported: false,
      thresholdValuesApproved: false,
      autoActionTaskCreation: false,
      localReviewOnly: true
    },
    latestThresholdReviews: []
  };
}

export function emptyFinanceCostGovernance(): FinanceCostGovernancePayload {
  return {
    evidencePackets: [],
    financeCoverage: [],
    financeLineage: [],
    costThresholds: [],
    ownerDecisionPackets: [],
    policySummary: {
      id: "",
      title: "",
      ownerChoice: "pending",
      status: "owner_receipts_incomplete",
      scope: "governance_view_only",
      effectiveUse: [],
      closedActions: [],
      decisions: [],
      receiptCount: 0,
      evidenceRefs: [],
      boundary: {
        localLedgerOnly: true,
        providerCalls: false,
        productionWrites: false,
        erpWriteback: false,
        billDrilldown: false,
        transactionDetailImport: false,
        accountingWrite: false,
        operationalScoring: false
      }
    },
    reconciliationGates: [],
    boundary: {
      providerCalls: false,
      productionWrites: false,
      erpWriteback: false,
      omsWmsWriteback: false,
      billDrilldown: false,
      transactionDetailImport: false,
      localReviewOnly: true
    },
    latestFinanceReviews: []
  };
}
