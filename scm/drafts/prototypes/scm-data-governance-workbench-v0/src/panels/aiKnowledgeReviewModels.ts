import type { OwnerDecisionChoice } from "./decisionLoopModels";
import type { DecisionLogRequestPayload } from "./governanceReviewPayloads";

export type AiKnowledgeQualityReviewPacket = {
  id: string;
  domainId: string;
  domainName: string;
  theme: string;
  owner: string;
  domainStatus: string;
  evidenceLevel: string;
  cardCount: number;
  chunkCount: number;
  crosswalkCount: number;
  probeCount: number;
  answerableCount: number;
  candidateOnlyCount: number;
  topProbeTitles: string[];
  decisionNeeded: string;
  recommendedChoice: string;
  recommendedStatus: string;
  actionBoundary: string;
  choices: OwnerDecisionChoice[];
};

export type AiKnowledgeQualityReviewPayload = {
  sourcePath: string;
  generatedAt: string;
  reviewDate: string;
  totals: Record<string, number>;
  reviewPackets: AiKnowledgeQualityReviewPacket[];
  summary: {
    id: string;
    title: string;
    recommendedPath: string;
    status: string;
    scope: string;
    manualReviewStatus: string;
    reviewPacketCount: number;
    receiptCount: number;
    activeAnswerableProbes: number;
    candidateOnlyProbes: number;
    decisions: Array<Record<string, string | boolean>>;
    effectiveUse: string[];
    closedActions: string[];
    boundary: Record<string, boolean>;
  };
  boundary: Record<string, boolean>;
};

export function createEmptyAiKnowledgeQualityReviewPayload(): AiKnowledgeQualityReviewPayload {
  return {
    sourcePath: "",
    generatedAt: "",
    reviewDate: "",
    totals: {},
    reviewPackets: [],
    summary: {
      id: "",
      title: "",
      recommendedPath: "A-A-A-A",
      status: "manual_review_choice_pack_ready",
      scope: "local_answer_quality_review_only",
      manualReviewStatus: "owner_choices_pending",
      reviewPacketCount: 0,
      receiptCount: 0,
      activeAnswerableProbes: 0,
      candidateOnlyProbes: 0,
      decisions: [],
      effectiveUse: [],
      closedActions: [],
      boundary: {
        providerCalls: false,
        productionWrites: false,
        erpWriteback: false,
        omsWmsWriteback: false,
        liveProviderAcceptance: false,
        draftDomainPromoted: false,
        formalAnswerApproved: false
      }
    },
    boundary: {
      providerCalls: false,
      productionWrites: false,
      erpWriteback: false,
      omsWmsWriteback: false,
      localSqliteWrites: false,
      liveProviderAcceptance: false,
      draftDomainPromoted: false,
      formalAnswerApproved: false
    }
  };
}

export function buildAiKnowledgeQualityReviewDecisionLog(
  packet: AiKnowledgeQualityReviewPacket,
  choice: OwnerDecisionChoice,
  timestamp = Date.now()
): DecisionLogRequestPayload {
  const domainSlug = packet.domainId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: `decision_ai_kb_quality_${domainSlug}_${choice.code.toLowerCase()}_${timestamp}`,
    insightTitle: `${packet.domainName} - ${choice.code}`,
    linkedMetricId: `ai_kb_quality.${packet.domainId}`,
    recommendation: `${packet.decisionNeeded}；选择=${choice.label}`,
    actionBoundary: packet.actionBoundary,
    status: choice.status,
    reviewNote: `${choice.reviewNote} Boundary: providerCalls=false; productionWrites=false; erpWriteback=false; draftDomainPromoted=false; formalAnswerApproved=false.`,
    actor: packet.owner
  };
}
