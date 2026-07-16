import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DimensionsCatalogPanel,
  MetricsCatalogPanel,
  OntologyCatalogPanel,
  TagsCatalogPanel,
  type CatalogAssetTableProps
} from "./panels/catalogPanels";
import {
  AgentRunList,
  RecommendationCardList,
  SourceCoverageList
} from "./panels/agentActivityLists";
import {
  buildAiKnowledgeQualityReviewDecisionLog,
  createEmptyAiKnowledgeQualityReviewPayload,
  type AiKnowledgeQualityReviewPacket,
  type AiKnowledgeQualityReviewPayload
} from "./panels/aiKnowledgeReviewModels";
import {
  EvidenceList
} from "./panels/detailPrimitives";
import { AssetTable, type AssetDetailDrawerProps } from "./panels/assetTable";
import {
  DetailDrawer
} from "./panels/detailDrawer";
import {
  ExportButton,
  type ExportFormat,
  type ExportJob
} from "./panels/exportControls";
import {
  AipScenarioBoard,
  DecisionReceiptGovernance,
  DecisionInboxPanel,
  DecisionAuditPanel,
  DecisionRunsPanel,
  DecisionViewTabs,
  OmsWmsUsagePolicyPanel,
  OwnerDecisionPacketPanel,
  type DecisionView
} from "./panels/decisionLoopPanels";
import {
  createEmptyDecisionReceiptSummary,
  createEmptyOmsWmsUsagePolicyPayload,
  ownerDecisionPackets,
  type DecisionReceiptSummary,
  type OmsWmsUsagePolicyChoice,
  type OmsWmsUsagePolicyPacket,
  type OmsWmsUsagePolicyPayload,
  type OwnerDecisionChoice,
  type OwnerDecisionPacket,
  type ScenarioDiagnosticPayload
} from "./panels/decisionLoopModels";
import {
  emptyFinanceCostGovernance,
  emptyRiskThresholdGovernance,
  type FinanceCostEvidencePacket,
  type FinanceCostGovernancePayload,
  type RiskThresholdGovernancePayload,
  type RiskThresholdVersion,
  type ThresholdValueReviewPacket
} from "./panels/governanceModels";
import {
  FinanceCostGovernancePanel,
  RiskThresholdGovernancePanel
} from "./panels/governancePanels";
import {
  buildFinanceOwnerChoiceDecisionLog,
  buildFinanceReviewDecisionLog,
  buildThresholdOwnerChoiceDecisionLog,
  buildThresholdReviewDecisionLog,
  buildThresholdValueReviewDecisionLog
} from "./panels/governanceReviewPayloads";
import {
  AgentTracePanel,
  type AgentTrace,
  type AgentTraceStep,
  type TraceReview
} from "./panels/traceReviewPanels";
import {
  buildRoleReviewDecisionLog,
  roleWorkbenches,
  type RoleWorkbench
} from "./panels/roleWorkbenchModels";
import {
  Badge,
  DataTable,
  GovernanceBoundaryStrip,
  ModuleHeader,
  RefPills,
  WorkflowStrip,
  cellValue,
  columnLabels,
  humanizeBoundary,
  humanizeOperationalLabel,
  sourceEvidenceTone,
  toneFromStatus,
  type BadgeTone
} from "./shared/ui";
import "./styles.css";

type Overview = {
  counts: Record<string, number>;
  lifecycle: Array<{ status: string; count: number }>;
  levels: Array<{ level: string; count: number }>;
  tasks: Array<{ status: string; count: number }>;
  moduleHealth: Array<{ module: string; score: number; status: string; note: string }>;
  architectureLayers: string[];
  riskQueue?: AipScenario[];
  recommendationQueue?: RecommendationCard[];
  traceSummary?: { total: number; reviewed?: number; recent: AgentTrace[] };
  objectInstanceSummary?: {
    total: number;
    byType: Array<{ type: string; count: number }>;
    riskInstances: ObjectInstance[];
  };
  scenarioSummary?: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    byPriority: Array<{ priority: string; count: number }>;
  };
};

type Metric = {
  id: string;
  code: string;
  name: string;
  level: string;
  metric_type: string;
  l1_domain: string;
  l2_group: string;
  formula: string;
  grain: string;
  direction: string;
  owner: string;
  lifecycle_status: string;
  certification_status: string;
  definition: string;
};

type WorkbenchModule = {
  id: string;
  code: string;
  title: string;
  focus: string;
  stage: string;
  status: string;
  score: number;
  primaryMetric: string;
  secondaryMetric: string;
  apiPath: string;
};

type AnyRow = Record<string, unknown>;

type SourceCoverage = AnyRow & {
  id: string;
  source_system: string;
  source_surface: string;
  field_class: string;
  target_object_type: string;
  target_property: string;
  grain: string;
  evidence_level: string;
  scenarioRefs?: string[];
  gateIds?: string[];
  runtime_status: string;
  owner_gate_status: string;
};

type SourceCoverageLineage = AnyRow & {
  id: string;
  source_coverage_id: string;
  source_system: string;
  source_surface: string;
  field_class: string;
  target_object_type: string;
  target_property: string;
  export_surface: string;
  api_candidate: string;
  lineage_status: string;
  runtime_status: string;
  import_gate: string;
  evidence_level: string;
  scenario_refs?: string[];
  scenario_names?: string[];
  gate_ids?: string[];
  gate_statuses?: Array<{ gateId: string; status: string; decisionRef: string; reviewNote: string }>;
};

type RuntimeMetadataProjection = {
  artifact_type: string;
  owner_choice: string;
  policy: Record<string, string>;
  summary: {
    runtime_projection_candidate_fields: number;
    active_allowlist_fields: number;
    excluded_sensitive_identifier_fields: number;
    business_rows_included: boolean;
    provider_calls: boolean;
    erp_writeback: boolean;
    oms_wms_writeback: boolean;
    production_write: boolean;
    import_mode: string;
  };
  allowlist_counts: {
    by_source_system?: Record<string, number>;
    by_target_object_type?: Record<string, number>;
    by_sensitivity_level?: Record<string, number>;
    by_evidence_level?: Record<string, number>;
  };
  excluded_counts: {
    by_source_system?: Record<string, number>;
    by_target_object_type?: Record<string, number>;
    by_sensitivity_level?: Record<string, number>;
  };
  allowlist_fields: AnyRow[];
  excluded_fields: AnyRow[];
};

type RuntimeBusinessRowDesignChoice = {
  code: string;
  label: string;
  status: string;
  reviewNote: string;
};

type RuntimeBusinessRowDesignPacket = {
  id: string;
  policyId: string;
  title: string;
  owner: string;
  linkedMetricId: string;
  designQuestion: string;
  recommendation: string;
  actionBoundary: string;
  evidenceRefs: string[];
  scopeRefs: string[];
  choices: RuntimeBusinessRowDesignChoice[];
  recommendedChoice: string;
  recommendedStatus: string;
  selectedChoice: string;
  receiptId?: string | null;
  recordedStatus: string;
  recorded: boolean;
};

type RuntimeBusinessRowDesignGatePayload = {
  id: string;
  generatedAt: string;
  summary: {
    id: string;
    title: string;
    recommendedPath: string;
    status: string;
    ownerChoiceStatus: string;
    scope: string;
    reviewPacketCount: number;
    receiptCount: number;
    sourceSystems: string[];
    objectTypes: string[];
    sourceCoverageRows: number;
    lineageRows: number;
    runtimeProjectionCandidateFields: number;
    activeAllowlistFields: number;
    excludedSensitiveIdentifierFields: number;
    effectiveUse: string[];
    closedActions: string[];
    boundary: Record<string, boolean>;
  };
  reviewPackets: RuntimeBusinessRowDesignPacket[];
  sourceCoverage: SourceCoverage[];
  sourceLineage: SourceCoverageLineage[];
  allowlistPreview: AnyRow[];
  excludedPreview: AnyRow[];
  boundary: Record<string, boolean>;
};

type ObjectInstance = AnyRow & {
  id: string;
  object_type_id: string;
  business_key: string;
  display_name: string;
  status: string;
  owner: string;
  properties: string;
  propertiesJson?: Record<string, unknown>;
  source_system: string;
  evidence_level: string;
  created_at: string;
};

type GraphNode = AnyRow & {
  id: string;
  label: string;
  name?: string;
  level?: string;
  kind?: string;
  x: number;
  y: number;
  objectId?: string;
  metricId?: string;
};

type GraphEdge = {
  source: string;
  target: string;
  relation_type: string;
  governance_note?: string;
};

type KpiGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  objectGraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  meta: Record<string, number>;
};

type KnowledgeDomain = AnyRow & {
  id: string;
  name: string;
  theme: string;
  status: string;
  evidence_level: string;
  description: string;
  card_count: number;
  chunk_count: number;
  crosswalk_count: number;
};

type KnowledgeCard = AnyRow & {
  id: string;
  domain_id: string;
  title: string;
  topic: string;
  summary: string;
  source_path: string;
  source_section: string;
  evidence_level: string;
  status: string;
  objectRefs?: string[];
  metricRefs?: string[];
  ruleRefs?: string[];
};

type KnowledgeSearchResult = {
  chunk_id: string;
  card_id: string;
  title: string;
  topic: string;
  summary: string;
  source_path: string;
  text: string;
  score: number;
  domain_id: string;
  domain_name: string;
  domain_status: string;
  card_status: string;
  evidencePolicy: string;
  objectRefs: string[];
  metricRefs: string[];
  ruleRefs: string[];
};

type KnowledgeSearchPayload = {
  query: string;
  terms: string[];
  answerable: boolean;
  policy: string;
  results: KnowledgeSearchResult[];
  doesNotProve: string[];
};

type LocalChatPayload = {
  answerable: boolean;
  policy: string;
  answer: string;
  evidence: KnowledgeSearchResult[];
  doesNotProve: string[];
  traceId?: string;
  trace?: AgentTrace;
  runId?: string;
  run?: AgentRun;
  nextStep: string;
};

type AiChatMode = "knowledge" | "web";

type DeepSeekChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type DeepSeekStatus = {
  configured: boolean;
  providerCallAuthorized: boolean;
  databaseWriteAuthorized: boolean;
  available: boolean;
  provider: string;
  baseUrlHost: string;
  anthropicBaseUrlHost: string;
  model: string;
  webModel: string;
  webSearchEnabled: boolean;
  secretPolicy: string;
  modes: Array<{ id: AiChatMode; label: string; policy: string }>;
};

type DeepSeekChatPayload = {
  answerable: boolean;
  provider: string;
  mode: AiChatMode;
  model: string;
  finishReason: string;
  policy: string;
  answer: string;
  messages: DeepSeekChatMessage[];
  evidence: KnowledgeSearchResult[];
  searchSummary: {
    answerable: boolean;
    resultCount: number;
    policy: string;
    doesNotProve: string[];
  };
  citations: Array<{ title?: string; url?: string; source?: string }>;
  usage: Record<string, unknown> | null;
  providerPayloadTypes: string[];
  doesNotProve: string[];
  traceId?: string;
  trace?: AgentTrace;
  runId?: string;
  run?: AgentRun;
  nextStep: string;
};

type KnowledgeSupportItem = AnyRow & {
  crosswalk_id: string;
  card_id: string;
  title: string;
  topic: string;
  summary: string;
  source_path: string;
  relation_type: string;
  confidence: number;
  note: string;
  domain_name: string;
  domain_status: string;
  evidencePolicy: string;
  objectRefs: string[];
  metricRefs: string[];
  ruleRefs: string[];
};

type KnowledgeSupportPayload = {
  targetType: string;
  targetId: string;
  matchedTargetIds: string[];
  resolvedTarget: AnyRow | null;
  count: number;
  supports: KnowledgeSupportItem[];
  policy: string;
  doesNotProve: string[];
};

type ChatBiCandidate = {
  metricId: string;
  code: string;
  name: string;
  formula: string;
  grain: string;
  allowedDimensions: string[];
  evidenceChain: string[];
};

type ChatBiDryRunPayload = {
  answerable: boolean;
  policy: string;
  rejectReason: string;
  answerPreview?: string;
  traceId?: string;
  trace?: AgentTrace;
  runId?: string;
  run?: AgentRun;
  candidates: ChatBiCandidate[];
  knowledgeEvidenceSummary?: {
    answerable: boolean;
    resultCount: number;
    policy: string;
    doesNotProve: string[];
  };
  knowledgeEvidence?: KnowledgeSearchPayload;
};

type TraceReviewMutationPayload = {
  ok: boolean;
  trace: AgentTrace;
  review: TraceReview;
  reviewSummary: {
    traceId: string;
    reviewStatus: string;
    policy: string;
    latestReviewCount: number;
  };
};

type RecommendationCard = AnyRow & {
  id: string;
  scenario: string;
  title: string;
  target_object_type: string;
  target_object_id: string;
  business_impact: string;
  confidence_level: string;
  risk_level: string;
  owner: string;
  sla_due_at: string;
  approval_status: string;
  execution_status: string;
  trace_id: string;
  replay_note: string;
  updated_at: string;
  linkedMetricIds: string[];
  linkedKnowledgeCardIds: string[];
  actionOptions: string[];
};

type AipScenario = AnyRow & {
  id: string;
  name: string;
  scenario_type: string;
  priority: string;
  status: string;
  owner: string;
  trigger_condition: string;
  target_object_type: string;
  target_object_id: string;
  diagnostic_question: string;
  decision_boundary: string;
  evidence_level: string;
  next_action: string;
  linkedMetricIds: string[];
  linkedKnowledgeCardIds: string[];
  linkedRecommendationCardIds: string[];
  targetInstance?: ObjectInstance | null;
  recommendationCards?: RecommendationCard[];
  agentRuns?: AgentRun[];
};

type RecommendationMutationPayload = {
  ok: boolean;
  recommendationCard: RecommendationCard;
  actionTask?: AnyRow;
};

type DecisionLogMutationPayload = {
  ok: boolean;
  decisionLog: AnyRow;
};

type AgentRun = AnyRow & {
  id: string;
  scenario: string;
  run_type: string;
  target_object_type: string;
  target_object_id: string;
  question: string;
  intent: string;
  status: string;
  owner: string;
  started_at: string;
  completed_at: string;
  decision_boundary: string;
  replay_note: string;
  inputRefs: string[];
  outputRefs: string[];
  traceIds: string[];
  recommendationCardIds: string[];
  actionTaskIds: string[];
  publicSteps: AgentTraceStep[];
};

type RoleWorkbenchPayload = WorkbenchModule & {
  payload: {
    roles: Array<{ id: string; name: string; owner: string; focus: string; linkedModules: string[] }>;
    counts: Record<string, number>;
    boundary: Record<string, boolean>;
    latestRoleReviews: AnyRow[];
  };
};

const fallbackModules: WorkbenchModule[] = [
  { id: "overview", code: "00", title: "治理链路总览", focus: "九层治理链路总控。", stage: "Operate", status: "active", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/governance/overview" },
  { id: "strategy-panorama", code: "S1", title: "战略供应链全景工作台", focus: "终点、愿景、目标运营模型、能力地图和路线图。", stage: "Plan", status: "draft_design_ready", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/strategy-panorama" },
  { id: "current-risk-radar", code: "R1", title: "业务现状与风险雷达", focus: "当前对象事实、风险信号、防线归因、根因和行动队列。", stage: "Sense", status: "draft_design_ready_data_pending", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/current-risk-radar" },
  { id: "role-workbenches", code: "R2", title: "角色作战工作台", focus: "管理层、计划、采购、仓库库存、物流和财务成本的角色型工作面。", stage: "Operate", status: "implemented_local_role_routes", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/role-workbenches" },
  { id: "fulfillment-dashboard", code: "F1", title: "供应链履约看板", focus: "履约指标体系、订单时效、未发货预警、缺货三分法和页面级洞察故事线。", stage: "Operate", status: "local_knowledge_prototype", score: 0, primaryMetric: "12 tabs", secondaryMetric: "static prototype", apiPath: "/api/workbench/fulfillment-dashboard" },
  { id: "ontology", code: "01", title: "对象本体工作台", focus: "对象与关系图谱。", stage: "Model", status: "mapped", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/ontology" },
  { id: "tags", code: "02", title: "标签工程工作台", focus: "标签规则与生命周期。", stage: "Model", status: "draft", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/tags" },
  { id: "dimensions", code: "03", title: "维度工程工作台", focus: "一致性维度与分析维度。", stage: "Model", status: "mapped", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/dimensions" },
  { id: "metric-engineering", code: "04", title: "指标工程工作台", focus: "指标公式与字段映射。", stage: "Build", status: "mapped", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/metric-engineering" },
  { id: "metric-dictionary", code: "05", title: "指标字典工作台", focus: "指标口径与认证。", stage: "Certify", status: "active", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/metric-dictionary" },
  { id: "kpi-system", code: "06", title: "指标体系编排台", focus: "KPI 树与归因路径。", stage: "Certify", status: "active", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/kpi-system" },
  { id: "lineage-quality", code: "07", title: "血缘与质量工作台", focus: "血缘、DQ 与影响分析。", stage: "Control", status: "reviewed", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/lineage-quality" },
  { id: "ai-knowledge", code: "08", title: "AI 知识库工作台", focus: "本地知识卡、证据检索与主题域治理。", stage: "Serve", status: "draft", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/ai-knowledge" },
  { id: "chatbi", code: "09", title: "ChatBI 语义治理台", focus: "可回答性与证据链。", stage: "Serve", status: "draft", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/chatbi" },
  { id: "decision-loop", code: "10", title: "决策闭环工作台", focus: "洞察到审批复盘。", stage: "Act", status: "draft", score: 0, primaryMetric: "--", secondaryMetric: "--", apiPath: "/api/workbench/decision-loop" }
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function useApi<T>(path: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<T>(path)
      .then((payload) => {
        if (!alive) return;
        setData(payload);
        setError("");
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [path]);
  return { data, error, loading };
}

function ScoreLine({ score }: { score: number }) {
  return (
    <div className="scoreLine" aria-label={`readiness ${score}`}>
      <span style={{ width: `${Math.max(0, Math.min(score, 100))}%` }} />
    </div>
  );
}

async function requestExport(assetType: string, format: ExportFormat, filters: Record<string, unknown>): Promise<ExportJob> {
  const result = await api<{ exportJob: ExportJob }>("/api/exports", {
    method: "POST",
    body: JSON.stringify({ assetType, format, filters })
  });
  return result.exportJob;
}

function BoundAssetTable(props: CatalogAssetTableProps) {
  return <AssetTable {...props} DetailDrawerComponent={BoundDetailDrawer} onExport={requestExport} />;
}

function BoundDetailDrawer(props: AssetDetailDrawerProps) {
  return <DetailDrawer {...props} api={api} />;
}

function MissionHero({ overview, modules }: { overview: Overview; modules: WorkbenchModule[] }) {
  const certified = modules.find((module) => module.id === "metric-engineering")?.secondaryMetric || "--";
  const l3 = overview.levels.find((item) => item.level === "L3")?.count || 0;
  return (
    <section className="missionHero">
      <div className="heroCopy">
        <p className="eyebrow">Ontology-first governance</p>
        <h1>供应链数据开发治理工作台</h1>
        <p>
          以对象本体为骨架，把标签、维度、指标、指标体系、血缘质量、ChatBI 和决策闭环串成一条可认证、可追溯、可复盘的治理链路。
        </p>
      </div>
      <div className="heroStats" aria-label="governance summary">
        <div>
          <span>指标资产</span>
          <strong>{overview.counts.metrics || 0}</strong>
        </div>
        <div>
          <span>L3 指标</span>
          <strong>{l3}</strong>
        </div>
        <div>
          <span>ChatBI 范围</span>
          <strong>{certified}</strong>
        </div>
      </div>
    </section>
  );
}

function sourceCoverageForRisk(coverage: SourceCoverage[], risk: AipScenario) {
  return coverage.filter((item) => {
    const scenarioRefs = item.scenarioRefs || [];
    return scenarioRefs.includes(risk.id) || item.target_object_type === risk.target_object_type;
  });
}

function SourceCoverageLineageSummary({ rows }: { rows: SourceCoverageLineage[] }) {
  const closedRows = rows.filter((row) => row.runtime_status === "not_authorized_for_import").length;
  const l2Rows = rows.filter((row) => row.evidence_level === "L2_browser_dom_verified").length;
  const sourceCount = new Set(rows.map((row) => row.source_system)).size;
  return (
    <div className="surface sourceLineageSurface">
      <div className="surfaceHead">
        <div>
          <p className="eyebrow">Source Coverage Lineage</p>
          <h3>Export/API lineage 前置门禁</h3>
          <p>把 OMS/WMS 字段类映射到导出面、API 候选、AIP 场景和责任人门禁；当前只做血缘证据投影。</p>
        </div>
        <div className="inlineActions">
          <Badge tone="warn">未开启运行时导入</Badge>
          <ExportButton assetType="source_coverage_lineage" onExport={requestExport} />
        </div>
      </div>
      <div className="sourceLineageStats">
        <div>
          <span>来源系统</span>
          <strong>{sourceCount}</strong>
        </div>
        <div>
          <span>字段类</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>L2 证据</span>
          <strong>{l2Rows}</strong>
        </div>
        <div>
          <span>导入门禁关闭</span>
          <strong>{closedRows}</strong>
        </div>
      </div>
      <div className="sourceLineageGrid">
        {rows.slice(0, 6).map((row) => (
          <article className="sourceLineageCard" key={row.id}>
            <div className="sourceCoverageHead">
              <div>
                <span>{row.source_system} · {row.source_surface}</span>
                <strong>{row.field_class}</strong>
              </div>
              <Badge tone={row.lineage_status === "lineage_required_before_import" ? "warn" : "blue"}>{humanizeOperationalLabel(row.lineage_status)}</Badge>
            </div>
            <p>{row.target_object_type} · {row.export_surface}</p>
            <small>{row.api_candidate}</small>
            <RefPills label="Gate" refs={row.gate_ids || []} />
          </article>
        ))}
      </div>
    </div>
  );
}

function RuntimeMetadataProjectionPanel({ projection }: { projection: RuntimeMetadataProjection }) {
  const summary = projection.summary || {
    runtime_projection_candidate_fields: 0,
    active_allowlist_fields: 0,
    excluded_sensitive_identifier_fields: 0,
    business_rows_included: false,
    provider_calls: false,
    erp_writeback: false,
    oms_wms_writeback: false,
    production_write: false,
    import_mode: "metadata_projection_only"
  };
  const allowlistRows = projection.allowlist_fields || [];
  const excludedRows = projection.excluded_fields || [];
  const targetCounts = Object.entries(projection.allowlist_counts?.by_target_object_type || {});
  const excludedCounts = Object.entries(projection.excluded_counts?.by_target_object_type || {});
  return (
    <>
      <div className="surface sourceLineageSurface">
        <div className="surfaceHead">
          <div>
            <p className="eyebrow">Runtime Metadata Projection</p>
            <h3>A-A-A 元数据投影 allowlist</h3>
            <p>把运行时投影字段压缩成第一阶段可见元数据清单；敏感运营标识进入排除清单，不导入业务明细行。</p>
          </div>
          <div className="inlineActions">
            <Badge tone="good">{projection.owner_choice || "A-A-A"}</Badge>
            <Badge tone="warn">仅元数据</Badge>
            <ExportButton assetType="runtime_metadata_projection" onExport={requestExport} />
          </div>
        </div>
        <div className="sourceLineageStats">
          <div>
            <span>候选字段</span>
            <strong>{summary.runtime_projection_candidate_fields}</strong>
          </div>
          <div>
            <span>准入清单</span>
            <strong>{summary.active_allowlist_fields}</strong>
          </div>
          <div>
            <span>已排除敏感字段</span>
            <strong>{summary.excluded_sensitive_identifier_fields}</strong>
          </div>
          <div>
            <span>业务明细行</span>
            <strong>{summary.business_rows_included ? "包含" : "不包含"}</strong>
          </div>
        </div>
        <div className="sourceLineageGrid">
          {targetCounts.map(([target, count]) => (
            <article className="sourceLineageCard" key={target}>
              <div className="sourceCoverageHead">
                <div>
                  <span>准入对象</span>
                  <strong>{target}</strong>
                </div>
                <Badge tone="good">{count}</Badge>
              </div>
              <p>{humanizeOperationalLabel(projection.policy?.sensitive_identifier_policy || "exclude sensitive identifiers")}</p>
            </article>
          ))}
          {excludedCounts.map(([target, count]) => (
            <article className="sourceLineageCard" key={`excluded-${target}`}>
              <div className="sourceCoverageHead">
                <div>
                  <span>排除对象</span>
                  <strong>{target}</strong>
                </div>
                <Badge tone="warn">{count}</Badge>
              </div>
              <p>第一阶段排除敏感运营标识</p>
            </article>
          ))}
        </div>
      </div>
      <BoundAssetTable
        title="Runtime Metadata Projection Allowlist"
        rows={allowlistRows.slice(0, 24)}
        columns={["field_id", "source_system", "source_surface", "target_object_type", "target_property", "sensitivity_level", "projection_status"]}
        assetType="runtime_metadata_projection"
        targetType="runtime_metadata_projection"
      />
      <BoundAssetTable
        title="Excluded Sensitive Identifier Fields"
        rows={excludedRows.slice(0, 12)}
        columns={["field_id", "source_system", "target_object_type", "target_property", "sensitivity_level", "projection_status"]}
        assetType="runtime_metadata_projection"
        targetType="runtime_metadata_projection"
      />
    </>
  );
}

function RuntimeBusinessRowDesignGatePanel({
  data,
  busy,
  receipt,
  onRecord
}: {
  data: RuntimeBusinessRowDesignGatePayload;
  busy: string;
  receipt: AnyRow | null;
  onRecord: (packet: RuntimeBusinessRowDesignPacket, choice: RuntimeBusinessRowDesignChoice) => void;
}) {
  const boundaryFacts = Object.entries(data.summary.boundary || {}).slice(0, 12);
  return (
    <div className="surface runtimeBusinessGatePanel">
      <div className="surfaceHead">
        <div>
          <p className="eyebrow">Runtime Business Row Design Gate</p>
          <h3>业务行导入设计门禁</h3>
          <p>把粒度契约、RBAC、脱敏样本、审计复盘和回滚试点纳入责任人复核；当前只做设计登记，不执行导入。</p>
        </div>
        <div className="inlineActions">
          <Badge tone="warn">{data.summary.recommendedPath}</Badge>
          <Badge>{humanizeOperationalLabel(data.summary.scope)}</Badge>
        </div>
      </div>

      <div className="runtimeBusinessStats">
        <div>
          <span>设计包</span>
          <strong>{data.summary.reviewPacketCount}</strong>
        </div>
        <div>
          <span>回执</span>
          <strong>{data.summary.receiptCount}</strong>
        </div>
        <div>
          <span>来源 / 血缘</span>
          <strong>{data.summary.sourceCoverageRows} / {data.summary.lineageRows}</strong>
        </div>
        <div>
          <span>准入 / 排除</span>
          <strong>{data.summary.activeAllowlistFields} / {data.summary.excludedSensitiveIdentifierFields}</strong>
        </div>
        <div>
          <span>业务明细行</span>
          <strong>{data.summary.boundary?.businessRowsImported ? "已导入" : "未导入"}</strong>
        </div>
      </div>

      <div className="runtimeBusinessBoundary">
        {boundaryFacts.map(([key, value]) => (
          <span key={key}>{humanizeOperationalLabel(key)}: {value ? "开启" : "关闭"}</span>
        ))}
      </div>

      <div className="runtimeBusinessGrid">
        {data.reviewPackets.map((packet) => (
          <article className="runtimeBusinessCard" key={packet.id}>
            <div className="decisionPacketHead">
              <div>
                <span>{packet.id} · {packet.owner}</span>
                <strong>{packet.title}</strong>
              </div>
              <Badge tone={packet.recorded ? "blue" : "warn"}>{humanizeOperationalLabel(packet.recordedStatus)}</Badge>
            </div>
            <p>{packet.designQuestion}</p>
            <p>{packet.recommendation}</p>
            <div className="runtimeBusinessScope">
              {packet.scopeRefs.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="decisionChoiceGrid">
              {packet.choices.map((choice) => (
                <button
                  key={`${packet.id}-${choice.code}`}
                  disabled={Boolean(busy)}
                  onClick={() => onRecord(packet, choice)}
                >
                  <span>{choice.code}</span>
                  <strong>{choice.label}</strong>
                </button>
              ))}
            </div>
            <small>{humanizeBoundary(packet.actionBoundary)}</small>
            {packet.receiptId ? <small>{packet.receiptId}</small> : <small>业务行设计回执待确认</small>}
          </article>
        ))}
      </div>

      {receipt ? (
        <div className="workflowReceipt runtimeBusinessReceipt">
          <div>
            <p className="eyebrow">Runtime business row design receipt</p>
            <h3>业务行导入设计已记录</h3>
            <p>{String(receipt.insight_title || "")}</p>
          </div>
          <div className="receiptGrid">
            <div>
              <span>决策</span>
              <strong>{String(receipt.id || "")}</strong>
              <small>{humanizeOperationalLabel(receipt.status)}</small>
            </div>
            <div>
              <span>边界</span>
              <strong>{humanizeBoundary(receipt.action_boundary)}</strong>
              <small>仅设计门禁</small>
            </div>
            <div>
              <span>业务行 / 回写</span>
              <strong>关闭 / 关闭</strong>
              <small>不含业务明细行，不回写 OMS/WMS/ERP</small>
            </div>
          </div>
        </div>
      ) : null}

      <div className="runtimeBusinessTables">
        <DataTable rows={data.allowlistPreview.slice(0, 8)} columns={["field_id", "source_system", "target_object_type", "target_property", "sensitivity_level"]} />
        <DataTable rows={data.excludedPreview.slice(0, 8)} columns={["field_id", "source_system", "target_object_type", "target_property", "sensitivity_level"]} />
      </div>
    </div>
  );
}

type StrategyObjective = {
  id: string;
  title: string;
  horizon: string;
  target: string;
  metricHints: string[];
  capabilityIds: string[];
  canonicalIds: string[];
  evidenceLevel: string;
  reviewStatus: string;
};

type StrategyCapability = {
  id: string;
  name: string;
  domain: string;
  currentMaturity: number;
  targetMaturity: number;
  gapLevel: "low" | "medium" | "high" | "critical";
  primaryGap: string;
  objectTypes: string[];
  canonicalIds: string[];
};

type OperatingModelComponent = {
  id: string;
  name: string;
  role: string;
  processScope: string[];
  systemScope: string[];
  ownerRole: string;
  keyControls: string[];
  knownRisks: string[];
};

type RoadmapInitiative = {
  id: string;
  name: string;
  horizon: string;
  priority: string;
  capabilityIds: string[];
  outcome: string;
  requiredObjects: string[];
  evidenceRefs: string[];
};

type StrategicGap = {
  id: string;
  name: string;
  domain: string;
  severity: string;
  closurePath: string;
  linkedWorkbench: string;
};

const strategyObjectives: StrategyObjective[] = [
  {
    id: "STR-OBJ-0001",
    title: "服务水平与可售性",
    horizon: "half_year",
    target: "将战略目标落到可售、断货、履约 SLA 和客户承诺。",
    metricHints: ["服务水平", "缺货", "可售", "SLA"],
    capabilityIds: ["CAP-PLAN", "CAP-INVENTORY", "CAP-FULFILLMENT"],
    canonicalIds: ["SCM-CAN-0001", "SCM-CAN-0014"],
    evidenceLevel: "draft_framework",
    reviewStatus: "needs_business_review"
  },
  {
    id: "STR-OBJ-0002",
    title: "库存现金与周转",
    horizon: "year",
    target: "把库存水位、周转、库龄、资金占用纳入同一个经营取舍视图。",
    metricHints: ["库存", "周转", "资金", "库龄"],
    capabilityIds: ["CAP-INVENTORY", "CAP-COST", "CAP-DATA"],
    canonicalIds: ["SCM-CAN-0014", "SCM-CAN-0018"],
    evidenceLevel: "draft_framework",
    reviewStatus: "needs_business_review"
  },
  {
    id: "STR-OBJ-0003",
    title: "供应响应与风险韧性",
    horizon: "year",
    target: "把供应商准交、质量、TCO、备选覆盖和风险暴露连接到能力建设。",
    metricHints: ["供应商", "TCO", "准交", "风险"],
    capabilityIds: ["CAP-SUPPLIER", "CAP-RISK", "CAP-PROCESS"],
    canonicalIds: ["SCM-CAN-0006", "SCM-CAN-0013"],
    evidenceLevel: "draft_framework",
    reviewStatus: "needs_business_review"
  }
];

const strategyCapabilities: StrategyCapability[] = [
  { id: "CAP-PLAN", name: "计划与预测闭环", domain: "planning", currentMaturity: 2, targetMaturity: 4, gapLevel: "high", primaryGap: "预测、补货、活动节奏和异常复盘尚未形成统一闭环。", objectTypes: ["ForecastVersion", "SKU", "InventoryBatch"], canonicalIds: ["SCM-CAN-0002", "SCM-CAN-0004"] },
  { id: "CAP-INVENTORY", name: "库存健康与可售治理", domain: "inventory", currentMaturity: 2, targetMaturity: 4, gapLevel: "high", primaryGap: "业务可用库存、平台库存、批次状态和库龄风险仍需统一解释。", objectTypes: ["InventoryBatch", "Warehouse", "SKU"], canonicalIds: ["SCM-CAN-0005", "SCM-CAN-0014"] },
  { id: "CAP-SUPPLIER", name: "采购供应商协同", domain: "supplier", currentMaturity: 2, targetMaturity: 4, gapLevel: "medium", primaryGap: "供应商绩效、交期波动、质量和 TCO 尚未进入同一 cockpit。", objectTypes: ["Supplier", "PO"], canonicalIds: ["SCM-CAN-0006", "SCM-CAN-0007", "SCM-CAN-0008"] },
  { id: "CAP-FULFILLMENT", name: "物流履约与出海网络", domain: "fulfillment", currentMaturity: 2, targetMaturity: 4, gapLevel: "medium", primaryGap: "仓配、头程、平台仓、尾程和 SLA 需要统一网络视图。", objectTypes: ["Warehouse", "Shipment"], canonicalIds: ["SCM-CAN-0009", "SCM-CAN-0010"] },
  { id: "CAP-DATA", name: "数据语义与算法治理", domain: "digital", currentMaturity: 3, targetMaturity: 5, gapLevel: "medium", primaryGap: "指标、对象、知识证据已形成原型，但真实业务字段和 owner gate 仍待闭合。", objectTypes: ["Metric", "KnowledgeCard", "AgentTrace"], canonicalIds: ["SCM-CAN-0011", "SCM-CAN-0012", "SCM-CAN-0015"] },
  { id: "CAP-RISK", name: "风险雷达与行动闭环", domain: "risk", currentMaturity: 2, targetMaturity: 4, gapLevel: "high", primaryGap: "风险评分口径、行动 owner 和复盘机制仍需业务确认。", objectTypes: ["RiskSignal", "ActionRecommendation"], canonicalIds: ["SCM-CAN-0013", "SCM-CAN-0018"] }
];

const operatingModelComponents: OperatingModelComponent[] = [
  { id: "OM-001", name: "前端经营承诺", role: "front_end", processScope: ["销售预测", "活动节奏", "服务承诺"], systemScope: ["BI", "OMS"], ownerRole: "经营/销售 Owner", keyControls: ["需求承诺", "促销节奏", "服务目标"], knownRisks: ["forecast", "strategy"] },
  { id: "OM-002", name: "后端供应兑现", role: "back_end", processScope: ["采购", "生产协同", "仓配履约"], systemScope: ["ERP", "WMS", "TMS"], ownerRole: "供应链交付 Owner", keyControls: ["PO 准交", "库存状态", "履约 SLA"], knownRisks: ["supplier", "fulfillment"] },
  { id: "OM-003", name: "计划决策中枢", role: "integration", processScope: ["S&OP", "S&OE", "异常复盘"], systemScope: ["ERP", "BI", "AIP-SCM"], ownerRole: "供应链计划 Owner", keyControls: ["预测偏差", "补货策略", "例外升级"], knownRisks: ["forecast", "inventory", "process"] },
  { id: "OM-004", name: "数据治理与智能体审计", role: "shared_service", processScope: ["指标认证", "知识证据", "Trace 复盘"], systemScope: ["AIP-SCM", "BI", "Knowledge Base"], ownerRole: "数据治理 Owner", keyControls: ["certified metric", "evidence trace", "manual review"], knownRisks: ["data", "algorithm"] }
];

const roadmapInitiatives: RoadmapInitiative[] = [
  { id: "RM-001", name: "风险止血：FBA 负可用、断货、库龄超储", horizon: "now", priority: "P0", capabilityIds: ["CAP-INVENTORY", "CAP-RISK"], outcome: "把现有三大 AIP 场景纳入 owner review 与行动队列。", requiredObjects: ["InventoryBatch", "SKU", "Warehouse"], evidenceRefs: ["scenario_fba_negative_available", "scenario_stockout_risk"] },
  { id: "RM-002", name: "体系化：Strategy Panorama + Risk Radar 双工作台", horizon: "next_quarter", priority: "P0", capabilityIds: ["CAP-DATA", "CAP-RISK", "CAP-PLAN"], outcome: "让未来目标和当前风险在同一工作台互链。", requiredObjects: ["Metric", "KnowledgeCard", "AgentTrace"], evidenceRefs: ["WB-STRATEGY-PANORAMA", "WB-CURRENT-RISK"] },
  { id: "RM-003", name: "专业域 cockpit：计划库存、供应商、物流履约", horizon: "next_half_year", priority: "P1", capabilityIds: ["CAP-PLAN", "CAP-SUPPLIER", "CAP-FULFILLMENT"], outcome: "把对象、指标、异常和行动分拆到专业负责人工作面。", requiredObjects: ["Supplier", "PO", "Shipment"], evidenceRefs: ["SCM-CAN-0006", "SCM-CAN-0010"] },
  { id: "RM-004", name: "智能化：仿真、预测、推荐与复盘治理", horizon: "next_year", priority: "P2", capabilityIds: ["CAP-DATA", "CAP-RISK"], outcome: "从看板升级为可审计的 AIP 决策系统。", requiredObjects: ["ScenarioRun", "ModelRun", "ActionReview"], evidenceRefs: ["SCM-CAN-0011", "SCM-CAN-0018"] }
];

const strategicGaps: StrategicGap[] = [
  { id: "SCM-GAP-0001", name: "企业级北极星指标仍需管理层确认", domain: "strategy", severity: "high", closurePath: "把 SCEI、服务、库存现金、风险暴露拆成 owner 可确认目标。", linkedWorkbench: "current-risk-radar" },
  { id: "SCM-GAP-0002", name: "真实业务字段与风险口径未全部闭合", domain: "data", severity: "high", closurePath: "ERP/OMS/WMS/财务只读字段与风险阈值进入 review gate。", linkedWorkbench: "current-risk-radar" },
  { id: "SCM-GAP-0003", name: "能力路线图尚未绑定投资优先级", domain: "operating_model", severity: "medium", closurePath: "把能力缺口转为 P0/P1/P2 initiative 与验收标准。", linkedWorkbench: "decision-loop" },
  { id: "SCM-GAP-0004", name: "行动闭环仍以本地 ledger 为主", domain: "governance", severity: "medium", closurePath: "先完善人工 review，再考虑生产只读与正式任务系统。", linkedWorkbench: "decision-loop" }
];

const rootCauseLens = [
  { type: "data", label: "数据与口径", summary: "主数据、库存口径、字段血缘和快照时间不一致。", linkedCapability: "CAP-DATA" },
  { type: "process", label: "流程与防线", summary: "预测、库存、执行三道防线的升级规则和 owner 不清。", linkedCapability: "CAP-RISK" },
  { type: "supplier", label: "供应商响应", summary: "交期波动、质量和备选覆盖未形成稳定供应能力。", linkedCapability: "CAP-SUPPLIER" },
  { type: "system", label: "系统与同步", summary: "ERP/WMS/平台仓/BI 同步差异需要被保留并解释。", linkedCapability: "CAP-INVENTORY" },
  { type: "strategy", label: "战略取舍", summary: "服务、成本、库存和现金目标之间缺少明确优先级。", linkedCapability: "CAP-PLAN" }
];

function includesAny(value: string, hints: string[]) {
  return hints.some((hint) => value.includes(hint));
}

function linkedMetricsForObjective(objective: StrategyObjective, metrics: Metric[]) {
  return metrics.filter((metric) => includesAny(`${metric.name}${metric.l1_domain}${metric.l2_group}${metric.definition}`, objective.metricHints)).slice(0, 4);
}

function gapTone(level: string): "neutral" | "good" | "warn" | "bad" | "blue" {
  if (["critical", "high", "P0"].includes(level)) return "warn";
  if (["medium", "P1"].includes(level)) return "blue";
  if (["low", "P2"].includes(level)) return "neutral";
  return "neutral";
}

function StrategyPanoramaPanel({ module, onSelect }: { module: WorkbenchModule; onSelect: (id: string) => void }) {
  const metrics = useApi<Metric[]>("/api/metrics", []);
  const domains = useApi<KnowledgeDomain[]>("/api/knowledge/domains", []);
  const scenarios = useApi<AipScenario[]>("/api/aip-scenarios", []);
  const recommendations = useApi<RecommendationCard[]>("/api/recommendation-cards", []);
  const strategicMetricIds = new Set(
    strategyObjectives.flatMap((objective) => linkedMetricsForObjective(objective, metrics.data).map((metric) => metric.id))
  );
  const liveModule = {
    ...module,
    primaryMetric: `${strategyObjectives.length} goals`,
    secondaryMetric: `${strategyCapabilities.length} capabilities`
  };

  return (
    <section className="panel strategyWorkbench">
      <ModuleHeader module={liveModule} eyebrow="Strategy Panorama / WB-STRATEGY-PANORAMA" />
      <WorkflowStrip steps={["确认北极星", "查看能力地图", "校验运营模型", "排定路线图", "缺口转行动"]} />

      <div className="strategyHero">
        <div>
          <p className="eyebrow">Strategic North Star</p>
          <h2>终点 + 愿景：从供应链后台走向经营能力系统</h2>
          <p className="muted">当前只读承接战略供应链体系草稿。企业目标、阈值和投资优先级仍显示为 data_pending / needs_business_review。</p>
        </div>
        <div className="strategyHeroStats">
          <div><span>目标指标候选</span><strong>{strategicMetricIds.size}</strong></div>
          <div><span>知识域</span><strong>{domains.data.length}</strong></div>
          <div><span>风险互链</span><strong>{scenarios.data.length}</strong></div>
        </div>
      </div>

      <div className="strategyNorthStar">
        {strategyObjectives.map((objective) => {
          const linked = linkedMetricsForObjective(objective, metrics.data);
          return (
            <article className="northStarCard" key={objective.id}>
              <div className="northStarHead">
                <div>
                  <span>{objective.id} · {objective.horizon}</span>
                  <strong>{objective.title}</strong>
                </div>
                <Badge tone="warn">{objective.reviewStatus}</Badge>
              </div>
              <p>{objective.target}</p>
              <RefPills label="Capability" refs={objective.capabilityIds} />
              <RefPills label="Canonical" refs={objective.canonicalIds} />
              <div className="linkedMetricStrip">
                {linked.length ? linked.map((metric) => (
                  <span key={metric.id}>{metric.name}</span>
                )) : <span>metric data_pending</span>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="strategyGrid">
        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Capability Map</p>
              <h3>能力地图与成熟度缺口</h3>
              <p>从计划、库存、供应商、履约、数据、风险六类能力承接战略供应链体系。</p>
            </div>
            <Badge tone="warn">draft framework</Badge>
          </div>
          <div className="capabilityGrid">
            {strategyCapabilities.map((capability) => (
              <article className="capabilityCard" key={capability.id}>
                <div className="capabilityHead">
                  <div>
                    <span>{capability.domain}</span>
                    <strong>{capability.name}</strong>
                  </div>
                  <Badge tone={gapTone(capability.gapLevel)}>{capability.gapLevel}</Badge>
                </div>
                <div className="maturityLine">
                  <span>current {capability.currentMaturity}/5</span>
                  <ScoreLine score={capability.currentMaturity * 20} />
                  <span>target {capability.targetMaturity}/5</span>
                </div>
                <p>{capability.primaryGap}</p>
                <RefPills label="Object" refs={capability.objectTypes} />
                <RefPills label="Canonical" refs={capability.canonicalIds} />
              </article>
            ))}
          </div>
        </section>

        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Target Operating Model</p>
              <h3>目标运营模型</h3>
              <p>把前端经营承诺、后端供应兑现、计划中枢和数据治理放到同一 operating model。</p>
            </div>
            <Badge>read only</Badge>
          </div>
          <div className="operatingModelGrid">
            {operatingModelComponents.map((component) => (
              <article className="operatingModelCard" key={component.id}>
                <span>{component.role}</span>
                <strong>{component.name}</strong>
                <p>{component.ownerRole}</p>
                <RefPills label="Process" refs={component.processScope} />
                <RefPills label="System" refs={component.systemScope} />
                <RefPills label="Risk" refs={component.knownRisks} />
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="strategyGrid">
        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Strategic Roadmap</p>
              <h3>路线图与阶段优先级</h3>
            </div>
            <Badge tone="warn">priority pending</Badge>
          </div>
          <div className="roadmapList">
            {roadmapInitiatives.map((item) => (
              <article className="roadmapItem" key={item.id}>
                <span>{item.horizon}</span>
                <div>
                  <div className="roadmapHead">
                    <strong>{item.name}</strong>
                    <Badge tone={gapTone(item.priority)}>{item.priority}</Badge>
                  </div>
                  <p>{item.outcome}</p>
                  <RefPills label="Capability" refs={item.capabilityIds} />
                  <RefPills label="Object" refs={item.requiredObjects} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Gap-to-Action Board</p>
              <h3>战略缺口转行动</h3>
              <p>{recommendations.data.length} 张本地推荐卡可承接部分缺口，但外部执行仍需人工 review。</p>
            </div>
            <button className="ghostButton" onClick={() => onSelect("current-risk-radar")}>打开风险雷达</button>
          </div>
          <div className="gapBoard">
            {strategicGaps.map((gap) => (
              <article className="gapCard" key={gap.id}>
                <div>
                  <span>{gap.id} · {gap.domain}</span>
                  <strong>{gap.name}</strong>
                </div>
                <Badge tone={gapTone(gap.severity)}>{gap.severity}</Badge>
                <p>{gap.closurePath}</p>
                <button onClick={() => onSelect(gap.linkedWorkbench)}>进入承接工作台</button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function riskDomainForScenario(scenario: AipScenario) {
  const value = `${scenario.scenario_type} ${scenario.name}`;
  if (value.includes("stockout") || value.includes("断货")) return "inventory";
  if (value.includes("aged") || value.includes("超储") || value.includes("库龄")) return "cost";
  if (value.includes("inventory") || value.includes("库存")) return "inventory";
  return "process";
}

function defenseLayerForRisk(domain: string) {
  if (domain === "forecast") return "forecast";
  if (domain === "inventory" || domain === "cost") return "inventory";
  if (domain === "supplier" || domain === "fulfillment" || domain === "process") return "execution";
  return "cross_layer";
}

function CurrentRiskRadarPanel({ module, onSelect }: { module: WorkbenchModule; onSelect: (id: string) => void }) {
  const [activeRiskId, setActiveRiskId] = useState("");
  const [riskView, setRiskView] = useState<"priority" | "domain" | "all">("priority");
  const [showThresholdGovernance, setShowThresholdGovernance] = useState(false);
  const [showEvidenceBoundary, setShowEvidenceBoundary] = useState(false);
  const [thresholdRefreshKey, setThresholdRefreshKey] = useState(0);
  const [thresholdBusy, setThresholdBusy] = useState("");
  const [thresholdReceipt, setThresholdReceipt] = useState<AnyRow | null>(null);
  const [thresholdError, setThresholdError] = useState("");
  const overview = useApi<Overview>("/api/governance/overview", {
    counts: {},
    lifecycle: [],
    levels: [],
    tasks: [],
    moduleHealth: [],
    architectureLayers: []
  });
  const instances = useApi<ObjectInstance[]>("/api/ontology/instances", []);
  const scenarios = useApi<AipScenario[]>("/api/aip-scenarios", []);
  const recommendations = useApi<RecommendationCard[]>("/api/recommendation-cards", []);
  const runs = useApi<AgentRun[]>("/api/agent-runs", []);
  const sourceCoverage = useApi<SourceCoverage[]>("/api/source-coverage", []);
  const thresholdGovernance = useApi<RiskThresholdGovernancePayload>(
    `/api/risk-threshold-governance?refresh=${thresholdRefreshKey}`,
    emptyRiskThresholdGovernance()
  );
  const riskSignals = scenarios.data.map((scenario) => {
    const domain = riskDomainForScenario(scenario);
    return {
      ...scenario,
      riskDomain: domain,
      defenseLayer: defenseLayerForRisk(domain)
    };
  });
  const liveModule = {
    ...module,
    primaryMetric: `${riskSignals.length} risks`,
    secondaryMetric: `${instances.data.length} objects`
  };
  const riskInstances = instances.data.filter((item) => /risk|exception|review/.test(item.status));
  const defenseGroups = ["forecast", "inventory", "execution", "cross_layer"].map((layer) => ({
    layer,
    risks: riskSignals.filter((risk) => risk.defenseLayer === layer)
  }));
  const priorityRiskSignals = riskSignals.filter((risk) => ["P0", "P1"].includes(risk.priority));
  const visibleRiskSignals = riskView === "priority" ? priorityRiskSignals : riskSignals;
  const riskSignalGroups = riskView === "domain"
    ? Array.from(new Set(visibleRiskSignals.map((risk) => risk.riskDomain))).map((domain) => ({
        key: domain,
        label: `${domain} 风险`,
        risks: visibleRiskSignals.filter((risk) => risk.riskDomain === domain)
      }))
    : [{ key: riskView, label: riskView === "priority" ? "P0/P1 优先风险" : "全部风险信号", risks: visibleRiskSignals }];
  const activeRisk = riskSignals.find((risk) => risk.id === activeRiskId) || visibleRiskSignals[0] || riskSignals[0];
  const activeRiskCoverage = activeRisk ? sourceCoverageForRisk(sourceCoverage.data, activeRisk).slice(0, 6) : [];
  const activeRiskRecommendations = activeRisk ? recommendations.data.filter((card) => (
    card.scenario === activeRisk.name
    || card.target_object_id === activeRisk.target_object_id
    || (card.linkedMetricIds || []).some((metricId) => (activeRisk.linkedMetricIds || []).includes(metricId))
  )).slice(0, 3) : [];
  const activeRiskRuns = activeRisk ? runs.data.filter((run) => (
    run.scenario === activeRisk.name
    || run.target_object_id === activeRisk.target_object_id
    || run.target_object_type === activeRisk.target_object_type
  )).slice(0, 3) : [];
  const thresholdSummary = thresholdGovernance.data.summary || {};

  async function recordThresholdReview(threshold: RiskThresholdVersion, status: string, label: string) {
    setThresholdBusy(`${threshold.id}-${status}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify(buildThresholdReviewDecisionLog(threshold, status, label))
      });
      setThresholdReceipt(payload.decisionLog);
      setThresholdError("");
      setThresholdRefreshKey((value) => value + 1);
    } catch (err) {
      setThresholdError(err instanceof Error ? err.message : String(err));
    } finally {
      setThresholdBusy("");
    }
  }

  async function recordThresholdOwnerChoice(packet: OwnerDecisionPacket, choice: OwnerDecisionChoice) {
    setThresholdBusy(`${packet.id}-${choice.code}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify(buildThresholdOwnerChoiceDecisionLog(packet, choice))
      });
      setThresholdReceipt(payload.decisionLog);
      setThresholdError("");
      setThresholdRefreshKey((value) => value + 1);
    } catch (err) {
      setThresholdError(err instanceof Error ? err.message : String(err));
    } finally {
      setThresholdBusy("");
    }
  }

  async function recordThresholdValueReview(packet: ThresholdValueReviewPacket, choice: OwnerDecisionChoice) {
    setThresholdBusy(`${packet.id}-${choice.code}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify(buildThresholdValueReviewDecisionLog(packet, choice))
      });
      setThresholdReceipt(payload.decisionLog);
      setThresholdError("");
      setThresholdRefreshKey((value) => value + 1);
    } catch (err) {
      setThresholdError(err instanceof Error ? err.message : String(err));
    } finally {
      setThresholdBusy("");
    }
  }

  return (
    <section className="panel riskWorkbench">
      <ModuleHeader module={liveModule} eyebrow="Current State & Risk Radar / WB-CURRENT-RISK" />
      <WorkflowStrip steps={["读取对象事实", "识别风险信号", "归因三道防线", "定位根因", "进入行动队列"]} />
      {thresholdError ? <div className="error">{thresholdError}</div> : null}

      <div className="riskHero">
        <div>
          <p className="eyebrow">Current Object Facts</p>
          <h2>当前事实 + 风险：先看发生了什么，再决定行动</h2>
          <p className="muted">本页只读投影本地对象实例、AIP 场景、推荐卡、证据链和 OMS/WMS 来源覆盖；来源覆盖仅含字段类与证据等级，不含业务明细行。</p>
        </div>
        <div className="strategyHeroStats">
          <div><span>对象实例</span><strong>{instances.data.length}</strong></div>
          <div><span>风险对象</span><strong>{riskInstances.length}</strong></div>
          <div><span>行动候选</span><strong>{recommendations.data.length}</strong></div>
          <div><span>来源覆盖</span><strong>{sourceCoverage.data.length}</strong></div>
        </div>
      </div>

      {activeRisk ? (
        <div className="surface riskNarrativeSurface">
          <section className="riskNarrativeMain">
            <div className="surfaceHead">
              <div>
                <p className="eyebrow">Risk narrative</p>
                <h3>{activeRisk.name}</h3>
                <p>{activeRisk.trigger_condition}</p>
              </div>
              <Badge tone={gapTone(activeRisk.priority)}>{activeRisk.priority}</Badge>
            </div>
            <GovernanceBoundaryStrip
              items={[
                { label: "只读风险投影", tone: "blue" },
                { label: "阈值待责任人确认", tone: "warn" }
              ]}
            />
            <div className="riskNarrativeFlow">
              <div>
                <span>发生了什么</span>
                <strong>{activeRisk.target_object_type}</strong>
                <p>{activeRisk.target_object_id}</p>
              </div>
              <div>
                <span>为什么重要</span>
                <strong>{activeRisk.riskDomain}</strong>
                <p>{activeRisk.diagnostic_question}</p>
              </div>
              <div>
                <span>谁来判断</span>
                <strong>{activeRisk.owner}</strong>
                <p>{humanizeBoundary(activeRisk.decision_boundary)}</p>
              </div>
              <div>
                <span>下一步</span>
                <strong>{humanizeOperationalLabel(activeRisk.status)}</strong>
                <p>{activeRisk.next_action}</p>
              </div>
            </div>
            <div className="riskNarrativeActions">
              <button className="secondaryAction" onClick={() => onSelect("decision-loop")}>进入决策闭环</button>
              <button className="secondaryAction" onClick={() => onSelect("strategy-panorama")}>回到战略全景</button>
            </div>
          </section>

          <aside className="riskEvidenceDrawer">
            <div>
              <span>证据抽屉</span>
              <strong>来源、指标、知识与行动</strong>
            </div>
            <div className="riskEvidenceSection">
              <strong>来源覆盖</strong>
              {activeRiskCoverage.length ? activeRiskCoverage.map((item) => (
                <p key={item.id}>{item.source_system} · {item.field_class} · {humanizeOperationalLabel(item.evidence_level)}</p>
              )) : <p>暂无匹配来源覆盖</p>}
            </div>
            <div className="riskEvidenceSection">
              <strong>指标与知识</strong>
              <RefPills label="Metric" refs={activeRisk.linkedMetricIds || []} />
              <RefPills label="Knowledge" refs={activeRisk.linkedKnowledgeCardIds || []} />
            </div>
            <div className="riskEvidenceSection">
              <strong>行动候选</strong>
              {activeRiskRecommendations.length ? activeRiskRecommendations.map((card) => (
                <p key={card.id}>{card.risk_level} · {card.title}</p>
              )) : <p>暂无直接匹配建议卡</p>}
            </div>
            <div className="riskEvidenceSection">
              <strong>运行记录</strong>
              {activeRiskRuns.length ? activeRiskRuns.map((run) => (
                <p key={run.id}>{humanizeOperationalLabel(run.status)} · {run.scenario}</p>
              )) : <p>暂无直接匹配运行记录</p>}
            </div>
          </aside>
        </div>
      ) : null}

      <div className="riskFactsGrid">
        {riskInstances.slice(0, 6).map((item) => (
          <article className="objectFactCard" key={item.id}>
            <div>
              <span>{item.object_type_id}</span>
              <strong>{item.display_name}</strong>
            </div>
            <Badge tone={item.status.includes("exception") ? "warn" : "blue"}>{humanizeOperationalLabel(item.status)}</Badge>
            <p>{item.business_key}</p>
            <small>{item.owner} · {humanizeOperationalLabel(item.evidence_level)}</small>
          </article>
        ))}
      </div>

      <div className="strategyGrid">
        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Risk Radar</p>
              <h3>风险信号</h3>
              <p>默认只看 P0/P1 高优先级信号；也可按风险域分组或查看全部。</p>
            </div>
            <Badge tone="warn">风险分值待业务阈值确认</Badge>
          </div>
          <div className="riskViewSwitch" aria-label="风险信号视图">
            <button className={riskView === "priority" ? "active" : ""} onClick={() => setRiskView("priority")}>
              P0/P1 优先 <span>{priorityRiskSignals.length}</span>
            </button>
            <button className={riskView === "domain" ? "active" : ""} onClick={() => setRiskView("domain")}>
              按风险域 <span>{riskSignalGroups.length}</span>
            </button>
            <button className={riskView === "all" ? "active" : ""} onClick={() => setRiskView("all")}>
              全部 <span>{riskSignals.length}</span>
            </button>
          </div>
          <div className="riskSignalGroupedList">
            {riskSignalGroups.map((group) => (
              <section className="riskSignalGroup" key={group.key}>
                <div className="riskSignalGroupHead">
                  <strong>{group.label}</strong>
                  <Badge tone={group.risks.some((risk) => risk.priority === "P0") ? "warn" : "blue"}>{group.risks.length}</Badge>
                </div>
                <div className="riskSignalGrid">
                  {group.risks.map((risk) => {
                    const matchedCoverage = sourceCoverageForRisk(sourceCoverage.data, risk);
                    return (
                      <article className={`riskSignalCard ${activeRisk?.id === risk.id ? "active" : ""}`} key={risk.id}>
                        <div className="riskSignalHead">
                          <div>
                            <span>{risk.riskDomain} · {humanizeOperationalLabel(risk.status)}</span>
                            <strong>{risk.name}</strong>
                          </div>
                          <Badge tone={gapTone(risk.priority)}>{risk.priority}</Badge>
                        </div>
                        <p>{risk.trigger_condition}</p>
                        <div className="scenarioTarget">
                          <div><span>对象</span><strong>{risk.target_object_type}</strong><small>{risk.target_object_id}</small></div>
                          <div><span>防线</span><strong>{risk.defenseLayer}</strong><small>{risk.owner}</small></div>
                        </div>
                        <div className="sourceEvidenceBadges" aria-label={`${risk.id} source evidence`}>
                          <span>来源证据</span>
                          {matchedCoverage.slice(0, 3).map((item) => (
                            <Badge key={item.id} tone={sourceEvidenceTone(item.evidence_level)}>
                              {item.source_system} · {humanizeOperationalLabel(item.evidence_level)}
                            </Badge>
                          ))}
                          <small>{matchedCoverage.length} 类字段 · 未开启运行时导入</small>
                        </div>
                        <RefPills label="Metric" refs={risk.linkedMetricIds} />
                        <RefPills label="Knowledge" refs={risk.linkedKnowledgeCardIds} />
                        <button className="secondaryAction" onClick={() => setActiveRiskId(risk.id)}>打开证据抽屉</button>
                        <small>{risk.next_action}</small>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
	        </section>

        <section className="riskAdvancedDetails">
          <button
            className="riskAdvancedSummary"
            type="button"
            aria-expanded={showThresholdGovernance}
            onClick={() => setShowThresholdGovernance((value) => !value)}
          >
            <span>高级治理层</span>
            <strong>阈值版本、值域复核与责任人决策</strong>
            <small>
              {String(thresholdSummary.thresholdVersionCount || 0)} 个阈值版本 · {String(thresholdSummary.scenarioBindingCount || 0)} 个场景绑定 · {showThresholdGovernance ? "已展开" : "默认折叠"}
            </small>
          </button>
          {showThresholdGovernance ? (
            <RiskThresholdGovernancePanel
              data={thresholdGovernance.data}
              busy={thresholdBusy}
              receipt={thresholdReceipt}
              onRecord={recordThresholdReview}
              onOwnerChoice={recordThresholdOwnerChoice}
              onValueReview={recordThresholdValueReview}
            />
          ) : null}
        </section>

	        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Defense Attribution</p>
              <h3>三道防线归因</h3>
              <p>将风险归到预测、库存、执行或跨层防线，便于 owner 决策。</p>
            </div>
            <button className="ghostButton" onClick={() => onSelect("strategy-panorama")}>回到战略全景</button>
          </div>
          <div className="defenseGrid">
            {defenseGroups.map((group) => (
              <article className="defenseCard" key={group.layer}>
                <div>
                  <span>{group.layer}</span>
                  <strong>{group.risks.length} signals</strong>
                </div>
                {group.risks.length ? group.risks.map((risk) => <p key={risk.id}>{risk.name}</p>) : <p>暂无本地风险信号</p>}
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="strategyGrid">
        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Root Cause Lens</p>
              <h3>根因视角</h3>
            </div>
            <Badge>schema ready</Badge>
          </div>
          <div className="rootCauseGrid">
            {rootCauseLens.map((item) => (
              <article className="rootCauseCard" key={item.type}>
                <span>{item.type}</span>
                <strong>{item.label}</strong>
                <p>{item.summary}</p>
                <RefPills label="Capability" refs={[item.linkedCapability]} />
              </article>
            ))}
          </div>
        </section>

        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Action Queue</p>
              <h3>行动队列与复盘</h3>
              <p>{runs.data.length} 条运行记录；所有动作仍需人工复核，不写外部系统。</p>
            </div>
            <button className="ghostButton" onClick={() => onSelect("decision-loop")}>打开决策闭环</button>
          </div>
          <RecommendationCardList cards={recommendations.data} />
        </section>
      </div>

      <section className="riskAdvancedDetails evidenceBoundaryDetails">
        <button
          className="riskAdvancedSummary"
          type="button"
          aria-expanded={showEvidenceBoundary}
          onClick={() => setShowEvidenceBoundary((value) => !value)}
        >
          <span>证据边界</span>
          <strong>本地证据计数与不可证明边界</strong>
          <small>{overview.data.counts.agentTraces || 0} 条证据链 · {sourceCoverage.data.length} 行来源覆盖 · {showEvidenceBoundary ? "已展开" : "默认折叠"}</small>
        </button>
        {showEvidenceBoundary ? (
          <div className="surface evidenceBoundaryPanel">
            <div className="surfaceHead">
              <div>
                <p className="eyebrow">Evidence Boundary</p>
                <h3>证据边界</h3>
                <p>当前风险雷达可证明本地对象、场景、推荐和证据链的存在；不能证明生产系统当前状态。</p>
              </div>
              <Badge tone="warn">生产状态未核验</Badge>
            </div>
            <div className="knowledgeEvidenceSummary">
              <div><span>证据链</span><strong>{overview.data.counts.agentTraces || 0}</strong></div>
              <div><span>运行记录</span><strong>{overview.data.counts.agentRuns || 0}</strong></div>
              <div><span>建议卡</span><strong>{overview.data.counts.recommendationCards || 0}</strong></div>
              <div><span>来源覆盖</span><strong>{sourceCoverage.data.length}</strong></div>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function OverviewAiSearch({ onOpenKnowledge }: { onOpenKnowledge: () => void }) {
  const [question, setQuestion] = useState("FBA 可用库存为负数可能反映什么业务场景？");
  const [result, setResult] = useState<LocalChatPayload | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    setRunning(true);
    try {
      const payload = await api<LocalChatPayload>("/api/ai-chat/local", {
        method: "POST",
        body: JSON.stringify({ question, limit: 4 })
      });
      setResult(payload);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="panel overviewAiPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Local evidence assistant</p>
          <h2>AI 搜索对话</h2>
        </div>
        <Badge tone="warn">不调用外部模型</Badge>
      </div>
      <div className="overviewAiGrid">
        <div className="chatBox knowledgeAskBox">
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
          <div className="inlineActions">
            <button onClick={ask} disabled={!question.trim() || running}>{running ? "检索中..." : "本地证据回答"}</button>
            <button className="secondaryAction" onClick={onOpenKnowledge}>打开 AI 知识库</button>
          </div>
          <p className="helperText">只检索 SQLite 本地知识卡和证据块，不调用外部大模型，不执行自由 SQL。</p>
          {error ? <div className="error">{error}</div> : null}
        </div>
        <div className="answerPanel">
          {result ? (
            <>
              <div className="answerHead">
                <Badge tone={result.answerable ? "blue" : "warn"}>{result.answerable ? "answerable" : "insufficient evidence"}</Badge>
                <span>{result.policy}</span>
              </div>
              <p>{result.answer}</p>
              <EvidenceList evidence={result.evidence.slice(0, 2)} />
              <div className="doesNotProve">
                {result.doesNotProve.map((item) => <span key={item}>{item}</span>)}
              </div>
            </>
          ) : (
            <div className="empty">输入供应链治理问题后，系统会返回知识卡证据、来源路径和无法证明边界。</div>
          )}
        </div>
      </div>
    </section>
  );
}

function CommandCenterQueues({ overview, onSelect }: { overview: Overview; onSelect: (id: string) => void }) {
  const riskQueue = overview.riskQueue || [];
  const recommendationQueue = overview.recommendationQueue || [];
  const objectSummary = overview.objectInstanceSummary || { total: 0, byType: [], riskInstances: [] };
  const scenarioSummary = overview.scenarioSummary || { total: 0, byStatus: [], byPriority: [] };
  const traceSummary = overview.traceSummary || { total: 0, recent: [] };
  return (
    <section className="panel commandCenterPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Command center</p>
          <h2>治理任务中心与资产盘点</h2>
        </div>
        <div className="inlineActions">
          <button className="secondaryAction" onClick={() => onSelect("ontology")}>对象实例</button>
          <button className="secondaryAction" onClick={() => onSelect("decision-loop")}>决策闭环</button>
        </div>
      </div>

      <div className="commandCenterGrid">
        <article className="queueCard priority">
          <div className="queueHead">
            <div>
              <span>P0/P1 风险队列</span>
              <strong>{riskQueue.length} 个场景待治理</strong>
            </div>
            <Badge tone="warn">{scenarioSummary.total} 个场景</Badge>
          </div>
          <div className="queueList">
            {riskQueue.length ? riskQueue.map((scenario) => (
              <button key={scenario.id} onClick={() => onSelect("decision-loop")}>
                <span>{scenario.priority} · {humanizeOperationalLabel(scenario.status)}</span>
                <strong>{scenario.name}</strong>
                <small>{scenario.next_action}</small>
              </button>
            )) : <p className="ledgerEmpty">暂无 P0/P1 场景</p>}
          </div>
        </article>

        <article className="queueCard">
          <div className="queueHead">
            <div>
              <span>建议卡队列</span>
              <strong>{recommendationQueue.length} 张建议卡待审核</strong>
            </div>
            <Badge tone="blue">{overview.counts.recommendationCards || 0} 张卡片</Badge>
          </div>
          <div className="queueList">
            {recommendationQueue.length ? recommendationQueue.map((card) => (
              <button key={card.id} onClick={() => onSelect("decision-loop")}>
                <span>{card.risk_level} · {humanizeOperationalLabel(card.approval_status)}</span>
                <strong>{card.title}</strong>
                <small>{card.owner} · {card.target_object_id}</small>
              </button>
            )) : <p className="ledgerEmpty">暂无待审核建议卡</p>}
          </div>
        </article>

        <article className="queueCard">
          <div className="queueHead">
            <div>
              <span>对象盘点</span>
              <strong>{objectSummary.total} 个关键实例入图</strong>
            </div>
            <Badge>{objectSummary.riskInstances.length} 个风险对象</Badge>
          </div>
          <div className="miniBarList">
            {objectSummary.byType.slice(0, 6).map((item) => (
              <div key={item.type}>
                <span>{item.type}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
          <div className="riskInstanceStrip">
            {objectSummary.riskInstances.slice(0, 4).map((item) => (
              <span key={item.id}>{item.display_name}</span>
            ))}
          </div>
        </article>

        <article className="queueCard">
          <div className="queueHead">
            <div>
              <span>运行证据</span>
              <strong>{traceSummary.total} 条证据链</strong>
            </div>
            <Badge tone="neutral">{overview.counts.agentRuns || 0} 条运行记录</Badge>
          </div>
          <div className="queueList compact">
            {traceSummary.recent.length ? traceSummary.recent.map((trace) => (
              <button key={trace.id} onClick={() => onSelect("decision-loop")}>
                <span>{trace.source_type} · {humanizeOperationalLabel(trace.answerability)}</span>
                <strong>{trace.question}</strong>
                <small>{humanizeBoundary(trace.policy)}</small>
              </button>
            )) : <p className="ledgerEmpty">暂无证据链</p>}
          </div>
        </article>
      </div>

      <div className="commandCenterFooter">
        <div>
          <span>场景状态</span>
          {scenarioSummary.byStatus.map((item) => <strong key={item.status}>{humanizeOperationalLabel(item.status)}: {item.count}</strong>)}
        </div>
        <div>
          <span>优先级</span>
          {scenarioSummary.byPriority.map((item) => <strong key={item.priority}>{item.priority}: {item.count}</strong>)}
        </div>
      </div>
    </section>
  );
}

function ArchitectureRail({ layers }: { layers: string[] }) {
  return (
    <section className="railPanel">
      <div className="sectionLabel">
        <span>Architecture</span>
        <strong>九层递进式治理架构</strong>
      </div>
      <div className="layerRail">
        {layers.map((layer, index) => (
          <div className="layerNode" key={layer}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{layer}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModuleGrid({ modules, onSelect }: { modules: WorkbenchModule[]; onSelect: (id: string) => void }) {
  return (
    <section className="moduleGrid">
      {modules.slice(1).map((module) => (
        <button className="moduleCard" key={module.id} onClick={() => onSelect(module.id)}>
          <div className="moduleTop">
            <span>{module.code}</span>
            <Badge tone={toneFromStatus(module.status)}>{humanizeOperationalLabel(module.status)}</Badge>
          </div>
          <strong>{module.title}</strong>
          <p>{module.focus}</p>
          <ScoreLine score={module.score} />
          <div className="moduleMetrics">
            <span>{module.primaryMetric}</span>
            <span>{module.secondaryMetric}</span>
          </div>
        </button>
      ))}
    </section>
  );
}

function OverviewPanel({ overview, modules, onSelect }: { overview: Overview; modules: WorkbenchModule[]; onSelect: (id: string) => void }) {
  return (
    <div className="stack overviewWorkbench">
      <MissionHero overview={overview} modules={modules} />
      <OverviewAiSearch onOpenKnowledge={() => onSelect("ai-knowledge")} />
      <CommandCenterQueues overview={overview} onSelect={onSelect} />
      <ArchitectureRail layers={overview.architectureLayers || []} />
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Workbench map</p>
            <h2>{modules.length - 1} 个工作台模块</h2>
          </div>
          <Badge tone="good">认证语义优先</Badge>
        </div>
        <ModuleGrid modules={modules} onSelect={onSelect} />
      </section>
      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Readiness</p>
            <h2>治理成熟度扫描</h2>
          </div>
          <Badge>样本已装载</Badge>
        </div>
        <div className="readinessGrid">
          {overview.moduleHealth?.map((item) => (
            <div className="readinessItem" key={item.module}>
              <div>
                <strong>{item.module}</strong>
                <Badge tone={toneFromStatus(item.status)}>{humanizeOperationalLabel(item.status)}</Badge>
              </div>
              <ScoreLine score={item.score} />
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OntologyPanel({ module }: { module: WorkbenchModule }) {
  const objects = useApi<AnyRow[]>("/api/ontology/objects", []);
  const links = useApi<AnyRow[]>("/api/ontology/links", []);
  const instances = useApi<ObjectInstance[]>("/api/ontology/instances", []);
  const instanceLinks = useApi<AnyRow[]>("/api/ontology/instance-links", []);
  return (
    <OntologyCatalogPanel
      module={module}
      objects={objects.data}
      links={links.data}
      instances={instances.data as unknown as AnyRow[]}
      instanceLinks={instanceLinks.data}
      errorMessage={objects.error || links.error || instances.error || instanceLinks.error}
      AssetTable={BoundAssetTable}
    />
  );
}

function TagsPanel({ module }: { module: WorkbenchModule }) {
  const tags = useApi<AnyRow[]>("/api/tags", []);
  return <TagsCatalogPanel module={module} tags={tags.data} AssetTable={BoundAssetTable} />;
}

function DimensionsPanel({ module }: { module: WorkbenchModule }) {
  const dimensions = useApi<AnyRow[]>("/api/dimensions", []);
  return <DimensionsCatalogPanel module={module} dimensions={dimensions.data} AssetTable={BoundAssetTable} />;
}

function MetricsPanel({ module, dictionary = false }: { module: WorkbenchModule; dictionary?: boolean }) {
  const [query, setQuery] = useState("");
  const path = query
    ? `/api/metrics?q=${encodeURIComponent(query)}`
    : dictionary
      ? "/api/metrics?level=L3"
      : "/api/metrics";
  const metrics = useApi<Metric[]>(path, []);
  return (
    <MetricsCatalogPanel
      module={module}
      dictionary={dictionary}
      query={query}
      metrics={metrics.data as unknown as AnyRow[]}
      onQueryChange={setQuery}
      AssetTable={BoundAssetTable}
    />
  );
}

function graphNodeTargetId(node: GraphNode) {
  if (node.kind === "object") return String(node.objectId || String(node.id).replace("object:", ""));
  return String(node.metricId || String(node.id).replace("metric:", ""));
}

function graphNodeMatches(node: GraphNode, mode: "mind" | "object", levelFilter: string, normalizedQuery: string) {
  const levelMatched = mode === "object" || levelFilter === "all" || node.level === levelFilter;
  const queryMatched = !normalizedQuery || [
    node.label,
    node.name,
    node.code,
    node.metricId,
    node.objectId,
    node.object_type,
    node.l1_domain,
    node.owner
  ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  return levelMatched && queryMatched;
}

function filteredGraphView({
  baseNodes,
  baseEdges,
  mode,
  levelFilter,
  query,
  focusTargetId,
  focusMode
}: {
  baseNodes: GraphNode[];
  baseEdges: GraphEdge[];
  mode: "mind" | "object";
  levelFilter: string;
  query: string;
  focusTargetId?: string;
  focusMode?: boolean;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const selectedBaseNode = focusTargetId
    ? baseNodes.find((node) => graphNodeTargetId(node) === focusTargetId || node.id === focusTargetId)
    : null;
  const focusNodeIds = new Set<string>();
  if (focusMode && selectedBaseNode) {
    focusNodeIds.add(selectedBaseNode.id);
    baseEdges.forEach((edge) => {
      if (edge.source === selectedBaseNode.id) focusNodeIds.add(edge.target);
      if (edge.target === selectedBaseNode.id) focusNodeIds.add(edge.source);
    });
  }
  const nodes = baseNodes.filter((node) => {
    const focusMatched = !focusMode || !selectedBaseNode || focusNodeIds.has(node.id);
    return focusMatched && graphNodeMatches(node, mode, levelFilter, normalizedQuery);
  });
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = baseEdges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  return { nodes, edges };
}

function GraphCanvas({
  graph,
  mode,
  onSelect,
  selectedId,
  levelFilter = "all",
  query = "",
  focusMode = false
}: {
  graph: KpiGraph;
  mode: "mind" | "object";
  onSelect: (row: AnyRow, targetType: string) => void;
  selectedId?: string;
  levelFilter?: string;
  query?: string;
  focusMode?: boolean;
}) {
  const [zoom, setZoom] = useState(0.86);
  const [fullScreen, setFullScreen] = useState(false);
  const baseNodes = mode === "object" ? graph.objectGraph.nodes : graph.nodes;
  const baseEdges = mode === "object" ? graph.objectGraph.edges : graph.edges;
  const { nodes, edges } = filteredGraphView({
    baseNodes,
    baseEdges,
    mode,
    levelFilter,
    query,
    focusTargetId: selectedId,
    focusMode
  });
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const width = Math.max(1280, ...nodes.map((node) => Number(node.x || 0) + 300));
  const height = Math.max(640, ...nodes.map((node) => Number(node.y || 0) + 120));

  function nodeTarget(node: GraphNode): { row: AnyRow; targetType: string } {
    if (node.kind === "object") {
      return {
        targetType: "ontology_object",
        row: {
          id: node.objectId || String(node.id).replace("object:", ""),
          name: node.name || node.label,
          object_type: node.object_type,
          owner: node.owner,
          status: node.status
        }
      };
    }
    return {
      targetType: "metric",
      row: {
        ...node,
        id: node.metricId || String(node.id).replace("metric:", "")
      }
    };
  }

  return (
    <div className={`canvasShell ${fullScreen ? "fullScreenCanvas" : ""}`}>
      <div className="canvasToolbar">
        <div>
          <strong>{mode === "object" ? "Object Graph" : "Mind Map"}</strong>
          <span>{nodes.length} nodes · {edges.length} edges</span>
        </div>
        <div className="canvasControls">
          <button onClick={() => setZoom((value) => Math.max(0.45, value - 0.1))}>-</button>
          <button onClick={() => setZoom(0.86)}>重置</button>
          <button onClick={() => setZoom((value) => Math.min(1.35, value + 0.1))}>+</button>
          <button onClick={() => setFullScreen((value) => !value)}>{fullScreen ? "退出全屏" : "全屏预览"}</button>
        </div>
      </div>
      <div className="canvasViewport">
        <div className="canvasScene" style={{ width, height, transform: `scale(${zoom})` }}>
          <svg className="graphEdges" width={width} height={height} aria-hidden="true">
            {edges.map((edge, index) => {
              const source = nodeById[edge.source];
              const target = nodeById[edge.target];
              if (!source || !target) return null;
              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={Number(source.x) + 112}
                  y1={Number(source.y) + 32}
                  x2={Number(target.x) + 112}
                  y2={Number(target.y) + 32}
                />
              );
            })}
          </svg>
          {nodes.map((node) => {
            const target = nodeTarget(node);
            const id = String(target.row.id || node.id);
            return (
              <button
                className={`graphNode ${node.kind || "metric"} level${node.level || ""} ${selectedId === id ? "selected" : ""}`}
                key={node.id}
                style={{ left: Number(node.x), top: Number(node.y) }}
                onClick={() => onSelect(target.row, target.targetType)}
                title={String(node.label || node.name || node.id)}
              >
                <span>{node.kind === "object" ? "Object" : node.level}</span>
                <strong>{node.label || node.name || node.id}</strong>
                <small>{cellValue(node.code || node.object_type || node.l1_domain || node.owner)}</small>
              </button>
            );
          })}
          {!nodes.length ? (
            <div className="canvasEmptyState">
              <strong>暂无匹配节点</strong>
              <span>调整层级筛选或搜索关键词后再查看画布。</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function KpiCanvasInspector({
  selected,
  view,
  graph,
  onOpenDrawer,
  onClearSelection
}: {
  selected: { row: AnyRow; targetType: string } | null;
  view: "mind" | "object";
  graph: KpiGraph;
  onOpenDrawer: () => void;
  onClearSelection: () => void;
}) {
  const row = selected?.row || null;
  const title = row ? String(row.name || row.label || row.code || row.id || "未命名节点") : "选择一个画布节点";
  const nodeCount = view === "object" ? graph.objectGraph.nodes.length : graph.nodes.length;
  const edgeCount = view === "object" ? graph.objectGraph.edges.length : graph.edges.length;
  const facts = row ? [
    ["ID", String(row.id || "-")],
    ["层级/类型", String(row.level || row.object_type || selected?.targetType || "-")],
    ["编码", String(row.code || "-")],
    ["Owner", String(row.owner || "-")],
    ["状态", humanizeOperationalLabel(String(row.certification_status || row.status || "-"))],
    ["业务域", String(row.l1_domain || row.object_type || "-")]
  ] : [];

  return (
    <aside className="kpiInspector">
      <div className="kpiInspectorHead">
        <div>
          <p className="eyebrow">PC canvas inspector</p>
          <h3>{title}</h3>
        </div>
        <Badge tone="blue">{view === "object" ? "对象图谱" : "指标树"}</Badge>
      </div>
      <GovernanceBoundaryStrip
        items={[
          { label: "PC 端检查器", tone: "blue" },
          { label: "移动端浏览降级", tone: "neutral" }
        ]}
      />
      <div className="kpiInspectorStats">
        <div><span>节点</span><strong>{nodeCount}</strong></div>
        <div><span>关系</span><strong>{edgeCount}</strong></div>
      </div>
      {row ? (
        <>
          <div className="kpiInspectorFacts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="kpiInspectorChecklist">
            <strong>复核顺序</strong>
            <span>确认定义、公式和业务域</span>
            <span>检查对象绑定与血缘来源</span>
            <span>记录 owner review 或修订建议</span>
          </div>
          <div className="kpiInspectorActions">
            <button onClick={onOpenDrawer}>打开详细抽屉</button>
            <button className="secondaryAction" onClick={onClearSelection}>清除选择</button>
          </div>
        </>
      ) : (
        <div className="kpiInspectorEmpty">
          <p>在左侧 PC 画布中点击指标或对象节点，右侧会显示检查信息。移动端仅作为浏览降级，不提供画布编辑体验。</p>
        </div>
      )}
    </aside>
  );
}

function KpiTreePanel({ module }: { module: WorkbenchModule }) {
  const graph = useApi<KpiGraph>("/api/kpi-tree/graph", { nodes: [], edges: [], objectGraph: { nodes: [], edges: [] }, meta: {} });
  const [view, setView] = useState<"mind" | "object" | "table">("mind");
  const [selected, setSelected] = useState<{ row: AnyRow; targetType: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [canvasQuery, setCanvasQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [focusMode, setFocusMode] = useState(false);
  const flat = useMemo(() => {
    return graph.data.nodes.map((node) => ({
      id: node.id,
      level: node.level,
      code: node.code,
      name: node.name || node.label,
      l1_domain: node.l1_domain,
      certification_status: node.certification_status,
      owner: node.owner
    }));
  }, [graph.data.nodes]);
  const kpiLevels = useMemo(() => {
    return Array.from(new Set(graph.data.nodes.map((node) => String(node.level || "")).filter(Boolean))).sort();
  }, [graph.data.nodes]);
  const selectedTargetId = selected ? String(selected.row.id || "") : "";
  const visibleCanvasNodeCount = useMemo(() => {
    const nodes = view === "object" ? graph.data.objectGraph.nodes : graph.data.nodes;
    const edges = view === "object" ? graph.data.objectGraph.edges : graph.data.edges;
    return filteredGraphView({
      baseNodes: nodes,
      baseEdges: edges,
      mode: view === "object" ? "object" : "mind",
      levelFilter,
      query: canvasQuery,
      focusTargetId: selectedTargetId,
      focusMode
    }).nodes.length;
  }, [canvasQuery, focusMode, graph.data.nodes, graph.data.edges, graph.data.objectGraph.nodes, graph.data.objectGraph.edges, levelFilter, selectedTargetId, view]);
  return (
    <section className="panel">
      <ModuleHeader module={module} />
      <WorkflowStrip steps={["浏览 L0-L3", "点击指标", "注解指标", "提交修订", "导出指标体系"]} />
      <div className="canvasTabs">
        <button className={view === "mind" ? "active" : ""} onClick={() => { setView("mind"); setFocusMode(false); setDrawerOpen(false); }}>Mind Map</button>
        <button className={view === "object" ? "active" : ""} onClick={() => { setView("object"); setLevelFilter("all"); setFocusMode(false); setDrawerOpen(false); }}>Object Graph</button>
        <button className={view === "table" ? "active" : ""} onClick={() => { setView("table"); setFocusMode(false); setDrawerOpen(false); }}>Table</button>
        <Badge tone="blue">PC 端画布编辑</Badge>
        <ExportButton assetType="metrics" onExport={requestExport} />
      </div>
      {view !== "table" ? (
        <div className="kpiCanvasFilters">
          <label>
            <span>搜索节点</span>
            <input
              value={canvasQuery}
              onChange={(event) => setCanvasQuery(event.target.value)}
              placeholder="指标名称、code、owner、对象"
            />
          </label>
          <div className="kpiLevelFilters" aria-label="KPI layer filters">
            <button className={levelFilter === "all" ? "active" : ""} onClick={() => setLevelFilter("all")}>全部</button>
            {kpiLevels.map((level) => (
              <button className={levelFilter === level ? "active" : ""} key={level} onClick={() => setLevelFilter(level)} disabled={view === "object"}>
                {level}
              </button>
            ))}
          </div>
          <Badge tone={visibleCanvasNodeCount ? "blue" : "warn"}>{visibleCanvasNodeCount} 个可见节点</Badge>
          <button
            className={`secondaryAction ${focusMode ? "active" : ""}`}
            onClick={() => setFocusMode((value) => !value)}
            disabled={!selectedTargetId}
          >
            {focusMode ? "显示筛选全集" : "一跳聚焦"}
          </button>
          <button
            className="secondaryAction"
            onClick={() => {
              setCanvasQuery("");
              setLevelFilter("all");
              setFocusMode(false);
              setSelected(null);
              setDrawerOpen(false);
            }}
          >
            重置筛选
          </button>
        </div>
      ) : null}
      {graph.error ? <div className="error">{graph.error}</div> : null}
      {view === "table" ? (
        <BoundAssetTable
          title="KPI 树表格视图"
          rows={flat}
          columns={["id", "level", "code", "name", "l1_domain", "certification_status", "owner"]}
          assetType="metrics"
          targetType="metric"
        />
      ) : (
        <div className="kpiCanvasLayout">
          <GraphCanvas
            graph={graph.data}
            mode={view}
            selectedId={selectedTargetId}
            levelFilter={levelFilter}
            query={canvasQuery}
            focusMode={focusMode}
            onSelect={(row, targetType) => {
              setSelected({ row, targetType });
              setDrawerOpen(false);
            }}
          />
          <KpiCanvasInspector
            selected={selected}
            view={view}
            graph={graph.data}
            onOpenDrawer={() => setDrawerOpen(true)}
            onClearSelection={() => {
              setSelected(null);
              setDrawerOpen(false);
            }}
          />
        </div>
      )}
      {drawerOpen ? (
        <BoundDetailDrawer
          row={selected?.row || null}
          targetType={selected?.targetType || "metric"}
          targetId={selectedTargetId}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </section>
  );
}

function LineagePanel({ module }: { module: WorkbenchModule }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [designReceipt, setDesignReceipt] = useState<AnyRow | null>(null);
  const lineage = useApi<AnyRow[]>("/api/lineage", []);
  const tasks = useApi<AnyRow[]>("/api/governance/tasks", []);
  const sourceLineage = useApi<SourceCoverageLineage[]>("/api/source-coverage/lineage", []);
  const runtimeProjection = useApi<RuntimeMetadataProjection>("/api/runtime-import/metadata-projection", {
    artifact_type: "runtime_metadata_projection_allowlist",
    owner_choice: "A-A-A",
    policy: {},
    summary: {
      runtime_projection_candidate_fields: 0,
      active_allowlist_fields: 0,
      excluded_sensitive_identifier_fields: 0,
      business_rows_included: false,
      provider_calls: false,
      erp_writeback: false,
      oms_wms_writeback: false,
      production_write: false,
      import_mode: "metadata_projection_only"
    },
    allowlist_counts: {},
    excluded_counts: {},
    allowlist_fields: [],
    excluded_fields: []
  });
  const businessRowDesignGate = useApi<RuntimeBusinessRowDesignGatePayload>(`/api/runtime-import/business-row-design-gate?refresh=${refreshKey}`, {
    id: "RUNTIME-BUSINESS-ROW-DESIGN-GATE-A5",
    generatedAt: "",
    summary: {
      id: "RUNTIME-BUSINESS-ROW-DESIGN-GATE-A5",
      title: "Business-row runtime import design gate",
      recommendedPath: "A-A-A-A-A",
      status: "loading",
      ownerChoiceStatus: "owner_pending",
      scope: "design_gate_only_no_import",
      reviewPacketCount: 0,
      receiptCount: 0,
      sourceSystems: [],
      objectTypes: [],
      sourceCoverageRows: 0,
      lineageRows: 0,
      runtimeProjectionCandidateFields: 0,
      activeAllowlistFields: 0,
      excludedSensitiveIdentifierFields: 0,
      effectiveUse: [],
      closedActions: [],
      boundary: {}
    },
    reviewPackets: [],
    sourceCoverage: [],
    sourceLineage: [],
    allowlistPreview: [],
    excludedPreview: [],
    boundary: {}
  });

  async function recordRuntimeBusinessDesignChoice(packet: RuntimeBusinessRowDesignPacket, choice: RuntimeBusinessRowDesignChoice) {
    setBusy(`${packet.id}-${choice.code}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify({
          id: `decision_${packet.id.toLowerCase()}_${choice.code.toLowerCase()}_${Date.now()}`,
          insightTitle: `${packet.title} - ${choice.code}`,
          linkedMetricId: packet.linkedMetricId,
          recommendation: `${packet.recommendation}；选择=${choice.label}`,
          actionBoundary: packet.actionBoundary,
          status: choice.status,
          reviewNote: `${choice.reviewNote} Boundary: sourceSystemReads=false; businessRowsImported=false; sampleRowsExtracted=false; runtimeImportAuthorized=false; productionWrites=false; omsWmsWriteback=false; erpWriteback=false.`,
          actor: packet.owner
        })
      });
      setDesignReceipt(payload.decisionLog);
      setError("");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="panel lineageQualityWorkbench">
      <ModuleHeader module={module} />
      <WorkflowStrip steps={["查看血缘", "定位影响", "注解问题", "生成修订建议", "导出证据"]} />
      {error ? <div className="error">{error}</div> : null}
      <SourceCoverageLineageSummary rows={sourceLineage.data} />
      <RuntimeMetadataProjectionPanel projection={runtimeProjection.data} />
      <RuntimeBusinessRowDesignGatePanel
        data={businessRowDesignGate.data}
        busy={busy}
        receipt={designReceipt}
        onRecord={recordRuntimeBusinessDesignChoice}
      />
      <div className="split">
        <BoundAssetTable
          title="血缘边"
          rows={lineage.data}
          columns={["source_ref", "edge_type", "target_ref", "confidence", "status"]}
          assetType="lineage_edges"
          targetType="lineage_edge"
        />
        <BoundAssetTable
          title="治理任务"
          rows={tasks.data}
          columns={["task_type", "target_ref", "title", "owner", "status", "priority"]}
          assetType="governance_tasks"
          targetType="governance_task"
        />
      </div>
      <BoundAssetTable
        title="Source Coverage Export/API Lineage"
        rows={sourceLineage.data}
        columns={["source_coverage_id", "source_system", "source_surface", "target_object_type", "api_candidate", "lineage_status", "runtime_status"]}
        assetType="source_coverage_lineage"
        targetType="source_coverage_lineage"
      />
    </section>
  );
}

function AiKnowledgePanel({ module }: { module: WorkbenchModule }) {
  const domains = useApi<KnowledgeDomain[]>("/api/knowledge/domains", []);
  const [qualityRefreshKey, setQualityRefreshKey] = useState(0);
  const qualityReview = useApi<AiKnowledgeQualityReviewPayload>(
    `/api/knowledge/evidence-quality-review?refresh=${qualityRefreshKey}`,
    createEmptyAiKnowledgeQualityReviewPayload()
  );
  const deepSeekStatus = useApi<DeepSeekStatus>("/api/ai-chat/deepseek/status", {
    configured: false,
    providerCallAuthorized: false,
    databaseWriteAuthorized: false,
    available: false,
    provider: "deepseek",
    baseUrlHost: "api.deepseek.com",
    anthropicBaseUrlHost: "api.deepseek.com",
    model: "deepseek-v4-flash",
    webModel: "deepseek-v4-pro",
    webSearchEnabled: true,
    secretPolicy: "server_side_env_only_key_never_returned_to_browser",
    modes: []
  });
  const [domainId, setDomainId] = useState("");
  const [query, setQuery] = useState("库存 可用库存 断货");
  const [aiChatMode, setAiChatMode] = useState<AiChatMode>("knowledge");
  const [searchResult, setSearchResult] = useState<KnowledgeSearchPayload | null>(null);
  const [chatResult, setChatResult] = useState<LocalChatPayload | null>(null);
  const [deepSeekResult, setDeepSeekResult] = useState<DeepSeekChatPayload | null>(null);
  const [deepSeekMessages, setDeepSeekMessages] = useState<DeepSeekChatMessage[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<{ row: AnyRow; targetType: string } | null>(null);
  const [running, setRunning] = useState("");
  const [qualityBusy, setQualityBusy] = useState("");
  const [qualityReceipt, setQualityReceipt] = useState<AnyRow | null>(null);
  const [error, setError] = useState("");
  const cardParams = new URLSearchParams();
  if (domainId) cardParams.set("domain", domainId);
  const cardsPath = `/api/knowledge/cards${cardParams.toString() ? `?${cardParams.toString()}` : ""}`;
  const cards = useApi<KnowledgeCard[]>(cardsPath, []);
  const selectedDomain = domains.data.find((domain) => domain.id === domainId);
  const selectedTargetId = selectedAsset ? String(selectedAsset.row.id || selectedAsset.row.code || selectedAsset.row.name || "") : "";

  async function runSearch(mode: "search" | "chat") {
    setRunning(mode);
    try {
      if (mode === "search") {
        setSearchResult(await api<KnowledgeSearchPayload>("/api/knowledge/search", {
          method: "POST",
          body: JSON.stringify({ query, domainId, limit: 8 })
        }));
      } else {
        setChatResult(await api<LocalChatPayload>("/api/ai-chat/local", {
          method: "POST",
          body: JSON.stringify({ question: query, domainId, limit: 6 })
        }));
      }
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning("");
    }
  }

  async function runDeepSeekChat() {
    const question = query.trim();
    if (!question) return;
    const userMessage: DeepSeekChatMessage = { role: "user", content: question, createdAt: new Date().toISOString() };
    const nextMessages = [...deepSeekMessages, userMessage];
    setDeepSeekMessages(nextMessages);
    setRunning("deepseek");
    try {
      const payload = await api<DeepSeekChatPayload>("/api/ai-chat/deepseek", {
        method: "POST",
        body: JSON.stringify({
          mode: aiChatMode,
          domainId,
          limit: 6,
          messages: nextMessages
        })
      });
      setDeepSeekResult(payload);
      setDeepSeekMessages(payload.messages);
      setError("");
    } catch (err) {
      setDeepSeekMessages(deepSeekMessages);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning("");
    }
  }

  function resetDeepSeekChat() {
    setDeepSeekMessages([]);
    setDeepSeekResult(null);
  }

  async function recordAiKnowledgeQualityReview(packet: AiKnowledgeQualityReviewPacket, choice: OwnerDecisionChoice) {
    setQualityBusy(`${packet.id}-${choice.code}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify(buildAiKnowledgeQualityReviewDecisionLog(packet, choice))
      });
      setQualityReceipt(payload.decisionLog);
      setError("");
      setQualityRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setQualityBusy("");
    }
  }

  return (
    <section className="panel aiKnowledgeWorkbench">
      <ModuleHeader module={module} />
      <WorkflowStrip steps={["选择知识域", "本地证据检索", "打开知识卡", "注解/修订建议", "JSON/Excel 导出"]} />

      <div className="knowledgeLayout">
        <div className="knowledgeLeft">
          <div className="surface knowledgeSearchSurface">
            <div className="surfaceHead">
              <div>
                <h3>本地证据检索</h3>
                <p>面向三类正式供应链知识库和 ERP 补充草稿库，返回证据块、来源路径和无法证明边界。</p>
              </div>
              <Badge tone="warn">仅本地证据</Badge>
            </div>
            <div className="knowledgeFilters">
              <label>
                <span>知识域</span>
                <select value={domainId} onChange={(event) => setDomainId(event.target.value)}>
                  <option value="">全部知识库</option>
                  {domains.data.map((domain) => (
                    <option value={domain.id} key={domain.id}>{domain.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>问题 / 关键词</span>
                <textarea value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <div className="aiModeControl" role="group" aria-label="DeepSeek 对话模式">
                <button
                  type="button"
                  className={aiChatMode === "knowledge" ? "active" : ""}
                  onClick={() => setAiChatMode("knowledge")}
                >
                  知识库模式
                </button>
                <button
                  type="button"
                  className={aiChatMode === "web" ? "active" : ""}
                  onClick={() => setAiChatMode("web")}
                  disabled={!deepSeekStatus.data.webSearchEnabled}
                >
                  联网模式
                </button>
              </div>
              <div className="inlineActions">
                <button onClick={() => runSearch("search")} disabled={!query.trim() || Boolean(running)}>
                  {running === "search" ? "检索中..." : "本地检索"}
                </button>
                <button onClick={() => runSearch("chat")} disabled={!query.trim() || Boolean(running)}>
                  {running === "chat" ? "生成中..." : "AI 对话"}
                </button>
                <button onClick={runDeepSeekChat} disabled={!query.trim() || Boolean(running) || !deepSeekStatus.data.available}>
                  {running === "deepseek" ? "DeepSeek 生成中..." : "DeepSeek 多轮对话"}
                </button>
                <button className="secondaryAction" onClick={resetDeepSeekChat} disabled={Boolean(running) || deepSeekMessages.length === 0}>
                  清空上下文
                </button>
              </div>
              <p className="helperText">
                DeepSeek key 仅在 server 侧环境变量读取；知识库模式会注入本地证据，联网模式会启用 Web Search。当前配置：
                {!deepSeekStatus.data.configured
                  ? " 等待 DEEPSEEK_API_KEY"
                  : !deepSeekStatus.data.providerCallAuthorized
                    ? " 等待 provider 显式授权"
                    : !deepSeekStatus.data.databaseWriteAuthorized
                      ? " 当前为 SQLite readonly，provider 对话记录写入未授权"
                      : ` 已就绪 · ${deepSeekStatus.data.model}`}。
              </p>
            </div>
            {error ? <div className="error">{error}</div> : null}
          </div>

          <div className="domainGrid">
            {domains.data.map((domain) => (
              <button
                className={`domainCard ${domainId === domain.id ? "active" : ""}`}
                key={domain.id}
                onClick={() => setDomainId(domain.id === domainId ? "" : domain.id)}
              >
                <div>
                  <strong>{domain.name}</strong>
                  <Badge tone={toneFromStatus(domain.status)}>{humanizeOperationalLabel(domain.status)}</Badge>
                </div>
                <p>{domain.description}</p>
                <div className="domainStats">
                  <span>{domain.card_count} cards</span>
                  <span>{domain.chunk_count} chunks</span>
                  <span>{domain.crosswalk_count} links</span>
                </div>
                <small>{domain.evidence_level}</small>
              </button>
            ))}
          </div>

          <section className="surface aiQualityReviewPanel">
            <div className="surfaceHead">
              <div>
                <p className="eyebrow">Answer Quality Review</p>
                <h3>{qualityReview.data.summary.title || "AI 知识回答质量人工复核包"}</h3>
                <p>把 12 个固定测试问题转成责任人可决策的回答质量验收题集；当前只记录人工复核，不调用外部模型，不晋升草稿域。</p>
              </div>
              <div className="inlineBadges">
                <Badge tone="warn">{qualityReview.data.summary.recommendedPath || "A-A-A-A"}</Badge>
                <Badge>{qualityReview.data.reviewPackets.length} 个知识域</Badge>
              </div>
            </div>
            <div className="aiQualityStats">
              <div><span>知识卡</span><strong>{qualityReview.data.totals.knowledge_cards || 0}</strong></div>
              <div><span>证据块</span><strong>{qualityReview.data.totals.knowledge_chunks || 0}</strong></div>
              <div><span>可答问题</span><strong>{qualityReview.data.summary.activeAnswerableProbes}</strong></div>
              <div><span>候选问题</span><strong>{qualityReview.data.summary.candidateOnlyProbes}</strong></div>
            </div>
            <div className="aiQualityReviewGrid">
              {qualityReview.data.reviewPackets.map((packet) => (
                <article className="aiQualityReviewCard" key={packet.id}>
                  <div className="thresholdVersionHead">
                    <div>
                      <span>{packet.id} · {packet.owner}</span>
                      <strong>{packet.domainName}</strong>
                    </div>
                    <Badge tone={packet.domainStatus === "active" ? "blue" : "warn"}>{humanizeOperationalLabel(packet.domainStatus)}</Badge>
                  </div>
                  <p>{packet.decisionNeeded}</p>
                  <div className="aiQualityFacts">
                    <div><span>证据等级</span><strong>{humanizeOperationalLabel(packet.evidenceLevel)}</strong></div>
                    <div><span>知识卡</span><strong>{packet.cardCount}</strong></div>
                    <div><span>测试问题</span><strong>{packet.answerableCount}/{packet.probeCount}</strong></div>
                    <div><span>候选</span><strong>{packet.candidateOnlyCount}</strong></div>
                  </div>
                  <RefPills label="Top cards" refs={packet.topProbeTitles} />
                  <div className="decisionChoiceGrid aiQualityChoices">
                    {packet.choices.map((choice) => (
                      <button
                        key={`${packet.id}-${choice.code}`}
                        disabled={Boolean(qualityBusy)}
                        onClick={() => recordAiKnowledgeQualityReview(packet, choice)}
                      >
                        <span>{choice.code}</span>
                        <strong>{choice.label}</strong>
                      </button>
                    ))}
                  </div>
                  <small>{humanizeBoundary(packet.actionBoundary)}</small>
                </article>
              ))}
            </div>
            <div className="aiQualityBoundary">
              <section>
                <strong>允许用途</strong>
                {qualityReview.data.summary.effectiveUse.map((item) => <span key={item}>{humanizeOperationalLabel(item)}</span>)}
              </section>
              <section>
                <strong>关闭动作</strong>
                {qualityReview.data.summary.closedActions.map((item) => <span key={item}>{humanizeOperationalLabel(item)}</span>)}
              </section>
              <section>
                <strong>复核回执</strong>
                <span>{qualityReview.data.summary.receiptCount}</span>
              </section>
            </div>
            {qualityReceipt ? (
              <div className="decisionReceipt aiQualityReceipt">
                <span>AI 知识库质量回执</span>
                <strong>{String(qualityReceipt.insight_title || "")}</strong>
                <p>{humanizeOperationalLabel(qualityReceipt.status)} · {humanizeBoundary(qualityReceipt.action_boundary)}</p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="knowledgeRight">
          <div className="surface">
            <div className="surfaceHead">
              <div>
                <h3>{selectedDomain ? `${selectedDomain.name} 证据结果` : "证据结果"}</h3>
                <p>{searchResult ? `${searchResult.results.length} 条命中 · ${searchResult.policy}` : "运行本地检索后展示证据块。"}</p>
              </div>
              <Badge tone={searchResult?.answerable ? "blue" : "neutral"}>{searchResult?.answerable ? "hit" : "idle"}</Badge>
            </div>
            {searchResult ? (
              <>
                <EvidenceList
                  evidence={searchResult.results}
                  onOpenCard={(cardId, title) => setSelectedAsset({ targetType: "knowledge_card", row: { id: cardId, title } })}
                />
                <div className="doesNotProve">
                  {searchResult.doesNotProve.map((item) => <span key={item}>{item}</span>)}
                </div>
              </>
            ) : <div className="empty">暂无检索结果</div>}
          </div>

          <div className="surface">
            <div className="surfaceHead">
              <div>
                <h3>AI 对话草稿</h3>
                <p>输出只用于知识库治理判断，进入 ChatBI 前仍需认证语义层。</p>
              </div>
              <Badge tone="warn">草稿回答</Badge>
            </div>
            {chatResult ? (
              <div className="answerPanel compact">
                <div className="answerHead">
                  <Badge tone={chatResult.answerable ? "blue" : "warn"}>{chatResult.answerable ? "可回答" : "证据不足"}</Badge>
                  <span>{humanizeBoundary(chatResult.policy)}</span>
                </div>
                <p>{chatResult.answer}</p>
                <strong>{chatResult.nextStep}</strong>
                <EvidenceList
                  evidence={chatResult.evidence.slice(0, 3)}
                  onOpenCard={(cardId, title) => setSelectedAsset({ targetType: "knowledge_card", row: { id: cardId, title } })}
                />
                <AgentRunList runs={chatResult.run ? [chatResult.run] : []} title="本地知识对话运行记录" limit={1} />
                <AgentTracePanel trace={chatResult.trace} title="本地知识对话证据链" />
              </div>
            ) : <div className="empty">点击 AI 对话后生成本地证据回答。</div>}
          </div>

          <div className="surface deepSeekSurface">
            <div className="surfaceHead">
              <div>
                <h3>DeepSeek 多轮对话</h3>
                <p>
                  {aiChatMode === "web"
                    ? "联网模式会调用 DeepSeek Web Search；回答进入治理记录前仍需人工复核。"
                    : "知识库模式会把本地证据作为上下文交给 DeepSeek；不启用 Web Search。"}
                </p>
              </div>
              <Badge tone={deepSeekStatus.data.available ? "blue" : "warn"}>
                {deepSeekStatus.data.available ? (aiChatMode === "web" ? "联网模式" : "知识库模式") : "调用未授权"}
              </Badge>
            </div>
            <div className="deepSeekMeta">
              <span>{aiChatMode === "web" ? deepSeekStatus.data.webModel : deepSeekStatus.data.model}</span>
              <span>{deepSeekStatus.data.baseUrlHost}</span>
              <span>{deepSeekStatus.data.secretPolicy}</span>
            </div>
            {deepSeekMessages.length ? (
              <div className="conversationList">
                {deepSeekMessages.map((message, index) => (
                  <article className={`conversationMessage ${message.role}`} key={`${message.role}-${index}-${message.createdAt || ""}`}>
                    <span>{message.role === "user" ? "你" : "DeepSeek"}</span>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">选择模式后点击 DeepSeek 多轮对话，当前会话上下文会连续传给外部模型。</div>
            )}
            {deepSeekResult ? (
              <div className="answerPanel compact">
                <div className="answerHead">
                  <Badge tone={deepSeekResult.answerable ? "blue" : "warn"}>
                    {deepSeekResult.answerable ? "外部模型回答" : "无有效回答"}
                  </Badge>
                  <span>{humanizeBoundary(deepSeekResult.policy)}</span>
                </div>
                <strong>{deepSeekResult.nextStep}</strong>
                <div className="knowledgeEvidenceSummary">
                  <div><span>本地证据</span><strong>{deepSeekResult.searchSummary.resultCount}</strong></div>
                  <div><span>模式</span><strong>{deepSeekResult.mode === "web" ? "联网" : "知识库"}</strong></div>
                  <div><span>结束原因</span><strong>{humanizeOperationalLabel(deepSeekResult.finishReason || "n/a")}</strong></div>
                </div>
                {deepSeekResult.citations.length ? (
                  <div className="citationList">
                    {deepSeekResult.citations.slice(0, 5).map((citation, index) => (
                      <a href={citation.url || "#"} target="_blank" rel="noreferrer" key={`${citation.url || citation.title}-${index}`}>
                        {citation.title || citation.url || citation.source || "web citation"}
                      </a>
                    ))}
                  </div>
                ) : null}
                <EvidenceList
                  evidence={deepSeekResult.evidence.slice(0, 3)}
                  onOpenCard={(cardId, title) => setSelectedAsset({ targetType: "knowledge_card", row: { id: cardId, title } })}
                />
                <div className="doesNotProve">
                  {deepSeekResult.doesNotProve.map((item) => <span key={item}>{item}</span>)}
                </div>
                <AgentRunList runs={deepSeekResult.run ? [deepSeekResult.run] : []} title="DeepSeek 对话运行记录" limit={1} />
                <AgentTracePanel trace={deepSeekResult.trace} title="DeepSeek 对话证据链" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <BoundAssetTable
        title="知识卡片台账"
        rows={cards.data as unknown as AnyRow[]}
        columns={["id", "domain_id", "topic", "title", "evidence_level", "status", "source_path"]}
        assetType="knowledge_cards"
        targetType="knowledge_card"
      />
      <BoundDetailDrawer
        row={selectedAsset?.row || null}
        targetType={selectedAsset?.targetType || "knowledge_card"}
        targetId={selectedTargetId}
        onClose={() => setSelectedAsset(null)}
        onOpenLinkedAsset={(targetType, targetId) =>
          setSelectedAsset({ targetType, row: { id: targetId, name: targetId, title: targetId } })
        }
      />
    </section>
  );
}

function ChatBiPanel({ module }: { module: WorkbenchModule }) {
  const contexts = useApi<AnyRow[]>("/api/chatbi/context", []);
  const [question, setQuestion] = useState("库存可售性可以分析哪些认证指标？");
  const [result, setResult] = useState<ChatBiDryRunPayload | null>(null);
  const [running, setRunning] = useState(false);
  async function dryRun() {
    setRunning(true);
    try {
      setResult(await api<ChatBiDryRunPayload>("/api/chatbi/dry-run", { method: "POST", body: JSON.stringify({ question }) }));
    } finally {
      setRunning(false);
    }
  }
  return (
    <section className="panel">
      <ModuleHeader module={module} />
      <div className="split chatSplit">
        <div className="surface">
          <div className="surfaceHead">
            <h3>可回答性判断</h3>
              <Badge tone="warn">试运行</Badge>
          </div>
          <div className="chatBox">
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
            <button onClick={dryRun}>{running ? "判断中..." : "试运行"}</button>
          </div>
          {result && <ChatBiDryRunResult result={result} />}
        </div>
        <div className="surface">
          <div className="surfaceHead">
            <h3>认证上下文</h3>
            <Badge>{contexts.data.length} 个上下文</Badge>
          </div>
          <DataTable rows={contexts.data} columns={["code", "name", "formula", "grain", "answer_policy"]} />
        </div>
      </div>
    </section>
  );
}

function ChatBiDryRunResult({ result }: { result: ChatBiDryRunPayload }) {
  return (
    <div className="chatBiResult">
      <div className="answerHead">
        <Badge tone={result.answerable ? "blue" : "warn"}>{result.answerable ? "命中认证指标" : "暂不可回答"}</Badge>
        <span>{humanizeBoundary(result.policy)}</span>
      </div>
      <p>{result.answerPreview || result.rejectReason}</p>
      <AgentRunList runs={result.run ? [result.run] : []} title="ChatBI 试运行记录" limit={1} />
      <AgentTracePanel trace={result.trace} title="ChatBI 试运行证据链" />
      {result.knowledgeEvidenceSummary ? (
        <div className="knowledgeEvidenceSummary">
          <div>
            <span>知识证据</span>
            <strong>{result.knowledgeEvidenceSummary.resultCount}</strong>
          </div>
          <div>
            <span>本地证据策略</span>
            <strong>{humanizeBoundary(result.knowledgeEvidenceSummary.policy)}</strong>
          </div>
          <div>
            <span>可辅助判断</span>
            <strong>{result.knowledgeEvidenceSummary.answerable ? "是" : "否"}</strong>
          </div>
        </div>
      ) : null}
      <div className="candidateGrid">
        <div className="knowledgeDrawerBlock">
          <div className="object360ListHead">
            <strong>认证指标候选</strong>
            <Badge>{result.candidates.length}</Badge>
          </div>
          {result.candidates.length ? result.candidates.map((candidate) => (
            <article className="candidateItem" key={candidate.metricId}>
              <span>{candidate.code}</span>
              <strong>{candidate.name}</strong>
              <p>{candidate.formula}</p>
              <small>{candidate.grain} · {candidate.allowedDimensions.join(" / ")}</small>
            </article>
          )) : <p className="ledgerEmpty">没有命中 certified 指标。</p>}
        </div>
        <div className="knowledgeDrawerBlock">
          <div className="object360ListHead">
            <strong>知识库伴随证据</strong>
            <Badge>{result.knowledgeEvidence?.results.length || 0}</Badge>
          </div>
          <EvidenceList evidence={result.knowledgeEvidence?.results.slice(0, 4) || []} />
          {result.knowledgeEvidence?.doesNotProve?.length ? (
            <div className="doesNotProve">
              {result.knowledgeEvidence.doesNotProve.map((item) => <span key={item}>{item}</span>)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RoleWorkbenchesPanel({ module, onSelect }: { module: WorkbenchModule; onSelect: (id: string) => void }) {
  const [activeRoleId, setActiveRoleId] = useState(roleWorkbenches[0].id);
  const [busy, setBusy] = useState("");
  const [financeBusy, setFinanceBusy] = useState("");
  const [error, setError] = useState("");
  const [financeError, setFinanceError] = useState("");
  const [receipt, setReceipt] = useState<AnyRow | null>(null);
  const [financeReceipt, setFinanceReceipt] = useState<AnyRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const rolePayload = useApi<RoleWorkbenchPayload>(`/api/workbench/role-workbenches?refresh=${refreshKey}`, {
    ...module,
    payload: { roles: [], counts: {}, boundary: {}, latestRoleReviews: [] }
  });
  const financeCostGovernance = useApi<FinanceCostGovernancePayload>(
    `/api/finance-cost-governance?refresh=${financeRefreshKey}`,
    emptyFinanceCostGovernance()
  );
  const sourceCoverage = useApi<AnyRow[]>("/api/source-coverage", []);
  const recommendations = useApi<RecommendationCard[]>("/api/recommendation-cards", []);
  const activeRole = roleWorkbenches.find((role) => role.id === activeRoleId) || roleWorkbenches[0];
  const latestRoleReviews = rolePayload.data.payload?.latestRoleReviews || [];
  const reviewedRoleIds = new Set(
    latestRoleReviews
      .map((item: AnyRow) => String(item.subject_ref || item.linked_metric_id || "").replace("role_workbench.", ""))
      .filter(Boolean)
  );
  const liveModule = {
    ...module,
    primaryMetric: `${roleWorkbenches.length} roles`,
    secondaryMetric: `${reviewedRoleIds.size} reviewed`
  };

  async function recordRoleReview(role: RoleWorkbench, status: string) {
    setBusy(`${role.id}-${status}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify(buildRoleReviewDecisionLog(role, status))
      });
      setReceipt(payload.decisionLog);
      setError("");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function recordFinanceReview(packet: FinanceCostEvidencePacket, status: string, label: string) {
    setFinanceBusy(`${packet.id}-${status}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify(buildFinanceReviewDecisionLog(packet, status, label))
      });
      setFinanceReceipt(payload.decisionLog);
      setFinanceError("");
      setFinanceRefreshKey((value) => value + 1);
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : String(err));
    } finally {
      setFinanceBusy("");
    }
  }

  async function recordFinanceOwnerChoice(packet: OwnerDecisionPacket, choice: OwnerDecisionChoice) {
    setFinanceBusy(`${packet.id}-${choice.code}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify(buildFinanceOwnerChoiceDecisionLog(packet, choice))
      });
      setFinanceReceipt(payload.decisionLog);
      setFinanceError("");
      setFinanceRefreshKey((value) => value + 1);
    } catch (err) {
      setFinanceError(err instanceof Error ? err.message : String(err));
    } finally {
      setFinanceBusy("");
    }
  }

  const stageCards = [
    { title: "输入", items: activeRole.inputRefs },
    { title: "处理", items: activeRole.processSteps },
    { title: "输出", items: activeRole.outputRefs },
    { title: "审批", items: activeRole.approvalGates },
    { title: "复盘", items: activeRole.replayRefs }
  ];

  return (
    <section className="panel roleWorkbench">
      <ModuleHeader module={liveModule} eyebrow="Role Workbenches / WB-ROLE-OPS" />
      <WorkflowStrip steps={["输入", "处理", "输出", "审批", "复盘"]} />
      {error ? <div className="error">{error}</div> : null}
      {financeError ? <div className="error">{financeError}</div> : null}

      <div className="roleHero">
        <div>
          <p className="eyebrow">Dedicated role routes</p>
          <h2>从治理后台拆到一线角色工作面</h2>
          <p className="muted">每个角色都有输入、处理、输出、审批和复盘闭环；当前只写本地复核台账，不调用外部模型、不写生产、不回写 ERP/WMS/OMS。</p>
        </div>
        <div className="roleHeroStats">
          <div><span>角色</span><strong>{roleWorkbenches.length}</strong></div>
          <div><span>来源覆盖行</span><strong>{sourceCoverage.data.length}</strong></div>
          <div><span>建议卡</span><strong>{recommendations.data.length}</strong></div>
        </div>
      </div>

      <div className="roleTabs">
        {roleWorkbenches.map((role) => (
          <button className={role.id === activeRole.id ? "active" : ""} key={role.id} onClick={() => setActiveRoleId(role.id)}>
            <span>{role.ownerRole}</span>
            <strong>{role.name}</strong>
            <small>{reviewedRoleIds.has(role.id) ? "已记录复核" : "待复核"}</small>
          </button>
        ))}
      </div>

      <div className="roleDetail">
        <section className="surface roleMission">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">{activeRole.ownerRole}</p>
              <h3>{activeRole.name}</h3>
              <p>{activeRole.mission}</p>
            </div>
            <Badge tone={reviewedRoleIds.has(activeRole.id) ? "blue" : "warn"}>{reviewedRoleIds.has(activeRole.id) ? "已复核" : "待责任人确认"}</Badge>
          </div>
          <div className="traceRefs">
            <RefPills label="Linked module" refs={activeRole.linkedModules} />
            <RefPills label="Risk" refs={activeRole.primaryRisks} />
          </div>
          <div className="inlineActions">
            {activeRole.linkedModules.slice(0, 3).map((moduleId) => (
              <button className="secondaryAction" key={moduleId} onClick={() => onSelect(moduleId)}>打开 {moduleId}</button>
            ))}
          </div>
        </section>

        <section className="surface roleFlowSurface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Role Flow</p>
              <h3>输入-处理-输出-审批-复盘</h3>
            </div>
            <Badge>可执行工作面</Badge>
          </div>
          <div className="roleFlowGrid">
            {stageCards.map((stage, index) => (
              <article className="roleFlowCard" key={stage.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{stage.title}</strong>
                <ul>
                  {stage.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>
	      </div>

      {activeRole.id === "finance-cost" ? (
        <FinanceCostGovernancePanel
          data={financeCostGovernance.data}
          busy={financeBusy}
          receipt={financeReceipt}
          onRecord={recordFinanceReview}
          onOwnerChoice={recordFinanceOwnerChoice}
        />
      ) : null}

	      <div className="roleReviewGrid">
        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Approval Gate</p>
              <h3>角色复核记录</h3>
              <p>记录阶段性角色决策，作为后续责任人复核和生产同步前置证据。</p>
            </div>
            <Badge tone="warn">本地台账</Badge>
          </div>
          <div className="roleReviewActions">
            <button onClick={() => recordRoleReview(activeRole, "role_reviewed")} disabled={Boolean(busy)}>
              {busy === `${activeRole.id}-role_reviewed` ? "记录中..." : "记录角色复核"}
            </button>
            <button onClick={() => recordRoleReview(activeRole, "approved_for_governance_view")} disabled={Boolean(busy)}>
              {busy === `${activeRole.id}-approved_for_governance_view` ? "记录中..." : "批准治理视图"}
            </button>
            <button onClick={() => recordRoleReview(activeRole, "needs_follow_up")} disabled={Boolean(busy)}>
              {busy === `${activeRole.id}-needs_follow_up` ? "记录中..." : "需要补证据"}
            </button>
          </div>
          {receipt ? (
            <div className="decisionReceipt roleReceipt">
              <span>角色复核回执</span>
              <strong>{String(receipt.insight_title || "")}</strong>
              <p>{humanizeOperationalLabel(receipt.status)} · {String(receipt.review_note || "")}</p>
            </div>
          ) : null}
        </section>

        <section className="surface">
          <div className="surfaceHead">
            <div>
              <p className="eyebrow">Replay Ledger</p>
              <h3>最近角色复核</h3>
            </div>
            <Badge>{latestRoleReviews.length} 条记录</Badge>
          </div>
          <DataTable rows={latestRoleReviews} columns={["id", "insight_title", "subject_ref", "status", "review_note"]} />
        </section>
      </div>
    </section>
  );
}

function DecisionPanel({ module }: { module: WorkbenchModule }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<DecisionView>("inbox");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [diagnostic, setDiagnostic] = useState<ScenarioDiagnosticPayload<AipScenario> | null>(null);
  const [matrixResults, setMatrixResults] = useState<ScenarioDiagnosticPayload<AipScenario>[]>([]);
  const [workflowCard, setWorkflowCard] = useState<RecommendationCard | null>(null);
  const [workflowActionTask, setWorkflowActionTask] = useState<AnyRow | null>(null);
  const [decisionReceipt, setDecisionReceipt] = useState<AnyRow | null>(null);
  const [usagePolicyReceipt, setUsagePolicyReceipt] = useState<AnyRow | null>(null);
  const [traceReviewReceipt, setTraceReviewReceipt] = useState<TraceReview | null>(null);
  const actions = useApi<AnyRow[]>(`/api/decision/action-tasks?refresh=${refreshKey}`, []);
  const decisions = useApi<AnyRow[]>(`/api/decision/logs?refresh=${refreshKey}`, []);
  const recommendations = useApi<RecommendationCard[]>(`/api/recommendation-cards?refresh=${refreshKey}`, []);
  const traces = useApi<AgentTrace[]>(`/api/agent-traces?refresh=${refreshKey}`, []);
  const traceReviews = useApi<TraceReview[]>(`/api/trace-reviews?refresh=${refreshKey}`, []);
  const runs = useApi<AgentRun[]>(`/api/agent-runs?refresh=${refreshKey}`, []);
  const scenarios = useApi<AipScenario[]>(`/api/aip-scenarios?refresh=${refreshKey}`, []);
  const receiptSummary = useApi<DecisionReceiptSummary>(
    `/api/decision/receipt-summary?refresh=${refreshKey}`,
    createEmptyDecisionReceiptSummary()
  );
  const usagePolicy = useApi<OmsWmsUsagePolicyPayload>(
    `/api/source-coverage/owner-usage-policy?refresh=${refreshKey}`,
    createEmptyOmsWmsUsagePolicyPayload()
  );

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  async function createRecommendation() {
    const id = `rec_ui_${Date.now()}`;
    setBusy("create");
    try {
      const payload = await api<RecommendationMutationPayload>("/api/recommendation-cards", {
        method: "POST",
        body: JSON.stringify({
          id,
          scenario: "库存异常诊断",
          title: "复核 FBA 可用库存为负样本",
          targetObjectType: "InventoryBatch",
          targetObjectId: "inventory_batch_fba_negative",
          linkedMetricIds: ["metric.business_available_inventory", "metric.fba_available_inventory"],
          linkedKnowledgeCardIds: ["business-supply-chain-card-0144"],
          businessImpact: "把负可用库存先作为异常样本进入治理闭环，复核平台预占、同步延迟、批次状态和数据质量缺口。",
          confidenceLevel: "sample_supported",
          riskLevel: "P0",
          owner: "supply_chain_owner",
          slaDueAt: "T+1",
          actionOptions: ["核对平台预占与同步时间", "拉取库存流水证据", "补充批次状态字段", "形成复盘规则"],
          approvalStatus: "draft",
          executionStatus: "not_started",
          replayNote: "UI 创建的治理建议卡，只写入本地 SQLite ledger。"
        })
      });
      setWorkflowCard(payload.recommendationCard);
      setWorkflowActionTask(null);
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function createScenarioRun() {
    setBusy("run");
    try {
      await api<{ ok: boolean; run: AgentRun }>("/api/agent-runs", {
        method: "POST",
        body: JSON.stringify({
          scenario: "库存异常诊断",
          runType: "manual_scenario_trace",
          targetObjectType: "inventory_batch",
          targetObjectId: "inventory_batch",
          question: "管理层复盘：FBA 可用库存为负的治理闭环是否完整？",
          intent: "inventory_exception_diagnosis",
          status: "review_ready",
          owner: "supply_chain_owner",
          inputRefs: ["object:inventory_batch", "metric:business_available_qty", "knowledge:business-supply-chain"],
          outputRefs: ["review:inventory_negative_available"],
          publicSteps: [
            { step: "scope", status: "completed", summary: "锁定 InventoryBatch 和业务可用库存口径" },
            { step: "evidence", status: "review_ready", summary: "等待 owner 核查平台预占、同步延迟和批次状态证据" },
            { step: "decision", status: "blocked", summary: "未审批前不生成系统写回动作" }
          ],
          decisionBoundary: "manual_review_required_no_erp_writeback",
          replayNote: "UI 手工创建的场景 RunTrace，只用于本地治理工作台复盘。"
        })
      });
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function reviewRecommendation(card: RecommendationCard, status: string) {
    setBusy(card.id);
    try {
      const payload = await api<RecommendationMutationPayload>(`/api/recommendation-cards/${card.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          approvalStatus: status,
          note: `UI workflow set approval_status=${status}`
        })
      });
      setWorkflowCard(payload.recommendationCard);
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function convertRecommendation(card: RecommendationCard) {
    setBusy(card.id);
    try {
      const payload = await api<RecommendationMutationPayload>(`/api/recommendation-cards/${card.id}/convert-action-task`, {
        method: "POST",
        body: JSON.stringify({
          owner: card.owner,
          note: "Converted from recommendation card in Decision Loop UI."
        })
      });
      setWorkflowCard(payload.recommendationCard);
      setWorkflowActionTask(payload.actionTask || null);
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function runScenarioDiagnostic(scenario: AipScenario) {
    setBusy(scenario.id);
    try {
      const payload = await api<ScenarioDiagnosticPayload<AipScenario>>(`/api/aip-scenarios/${scenario.id}/run-diagnostic`, {
        method: "POST",
        body: JSON.stringify({
          question: scenario.diagnostic_question,
          createdBy: "供应链数据治理 Owner"
        })
      });
      setDiagnostic(payload);
      setMatrixResults([]);
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function runAllScenarioDiagnostics() {
    setBusy("scenario-matrix");
    try {
      const results: ScenarioDiagnosticPayload<AipScenario>[] = [];
      for (const scenario of scenarios.data) {
        const payload = await api<ScenarioDiagnosticPayload<AipScenario>>(`/api/aip-scenarios/${scenario.id}/run-diagnostic`, {
          method: "POST",
          body: JSON.stringify({
            question: scenario.diagnostic_question,
            createdBy: "供应链数据治理 Owner"
          })
        });
        results.push(payload);
      }
      setDiagnostic(results[results.length - 1] || null);
      setMatrixResults(results);
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function recordOwnerDecision(packet: OwnerDecisionPacket, choice: OwnerDecisionChoice) {
    setBusy(`${packet.id}-${choice.code}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify({
          id: `decision_${packet.id.toLowerCase()}_${choice.code.toLowerCase()}_${Date.now()}`,
          insightTitle: `${packet.title} - ${choice.code}`,
          linkedMetricId: packet.linkedMetricId,
          recommendation: `${packet.recommendation}；选择=${choice.label}`,
          actionBoundary: packet.actionBoundary,
          status: choice.status,
          reviewNote: choice.reviewNote,
          actor: packet.owner
        })
      });
      setDecisionReceipt(payload.decisionLog);
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function recordOmsWmsUsagePolicyChoice(packet: OmsWmsUsagePolicyPacket, choice: OmsWmsUsagePolicyChoice) {
    setBusy(`${packet.id}-${choice.code}`);
    try {
      const payload = await api<DecisionLogMutationPayload>("/api/decision/logs", {
        method: "POST",
        body: JSON.stringify({
          id: `decision_${packet.id.toLowerCase()}_${choice.code.toLowerCase()}_${Date.now()}`,
          insightTitle: `${packet.title} - ${choice.code}`,
          linkedMetricId: packet.linkedMetricId,
          recommendation: `${packet.recommendation}；选择=${choice.label}`,
          actionBoundary: packet.actionBoundary,
          status: choice.status,
          reviewNote: `${choice.reviewNote} Boundary: businessRowsImported=false; runtimeImportAuthorized=false; exportDownloadAutomation=false; omsWmsWriteback=false; erpWriteback=false.`,
          actor: packet.owner
        })
      });
      setUsagePolicyReceipt(payload.decisionLog);
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function reviewTrace(trace: AgentTrace, status: string) {
    setBusy(`${trace.id}-${status}`);
    try {
      const payload = await api<TraceReviewMutationPayload>(`/api/agent-traces/${trace.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          reviewStatus: status,
          reviewer: "供应链数据治理 Owner",
          reviewNote: `Trace review set to ${status} from Decision Loop UI.`,
          decisionBoundary: "trace_review_local_governance_only_no_provider_no_erp_writeback"
        })
      });
      setTraceReviewReceipt(payload.review);
      setError("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  const pendingReviewCards = recommendations.data.filter((card) => !["approved", "reviewed", "rejected"].includes(card.approval_status));
  const openActionTasks = actions.data.filter((action) => !["done", "completed", "closed"].includes(String(action.status || "")));
  const liveModule = {
    ...module,
    primaryMetric: `${pendingReviewCards.length} pending`,
    secondaryMetric: `${openActionTasks.length} actions`
  };

  return (
    <section className="panel">
      <ModuleHeader module={liveModule} />
      <WorkflowStrip steps={["查看待办", "责任人复核", "记录决策", "转行动任务", "复盘证据链"]} />
      {error ? <div className="error">{error}</div> : null}
      {scenarios.error ? <div className="error">{scenarios.error}</div> : null}

      <DecisionViewTabs activeView={activeView} onChange={setActiveView} />

      {activeView === "inbox" ? (
        <DecisionInboxPanel
          scenarios={scenarios.data}
          recommendations={recommendations.data}
          actions={actions.data}
          receiptSummary={receiptSummary.data}
          traces={traces.data}
          runs={runs.data}
          busy={busy}
          onReview={reviewRecommendation}
          onConvert={convertRecommendation}
          onRunScenario={runScenarioDiagnostic}
          onCreateRecommendation={createRecommendation}
          onCreateScenarioRun={createScenarioRun}
          onViewChange={setActiveView}
        />
      ) : null}

      {activeView === "scenarios" ? (
        <AipScenarioBoard
          scenarios={scenarios.data}
          busy={busy}
          diagnostic={diagnostic}
          matrixResults={matrixResults}
          onRun={runScenarioDiagnostic}
          onRunAll={runAllScenarioDiagnostics}
          onExport={requestExport}
        />
      ) : null}

      {activeView === "governance" ? (
        <>
          <DecisionReceiptGovernance data={receiptSummary.data} onExport={requestExport} />
          <OmsWmsUsagePolicyPanel
            data={usagePolicy.data}
            busy={busy}
            receipt={usagePolicyReceipt}
            onRecord={recordOmsWmsUsagePolicyChoice}
          />
          <OwnerDecisionPacketPanel
            packets={ownerDecisionPackets}
            busy={busy}
            receipt={decisionReceipt}
            onRecord={recordOwnerDecision}
          />
        </>
      ) : null}

      {activeView === "runs" ? (
        <DecisionRunsPanel
          runs={runs.data}
          recommendations={recommendations.data}
          workflowCard={workflowCard}
          workflowActionTask={workflowActionTask}
          busy={busy}
          onCreateScenarioRun={createScenarioRun}
          onCreateRecommendation={createRecommendation}
          onReviewRecommendation={reviewRecommendation}
          onConvertRecommendation={convertRecommendation}
          onExport={requestExport}
        />
      ) : null}

      {activeView === "audit" ? (
        <DecisionAuditPanel
          decisions={decisions.data}
          actions={actions.data}
          traces={traces.data}
          traceReviews={traceReviews.data}
          traceReviewReceipt={traceReviewReceipt}
          busy={busy}
          onReviewTrace={reviewTrace}
        />
      ) : null}
    </section>
  );
}

function FulfillmentDashboardPanel({ module }: { module: WorkbenchModule }) {
  return (
    <section className="workbenchPage fulfillmentPrototypePage">
      <div className="pageIntro fulfillmentPrototypeIntro">
        <div>
          <p className="eyebrow">Static knowledge prototype</p>
          <h2>供应链履约看板</h2>
          <p>{module.focus}</p>
        </div>
        <div className="prototypeBoundary">
          <Badge tone="good">UI/交互验收</Badge>
          <Badge tone="blue">静态知识原型</Badge>
          <Badge>独立页面</Badge>
        </div>
      </div>

      <div className="prototypeFrameShell">
        <iframe
          className="prototypeFrame"
          src="/fulfillment-dashboard/index.html"
          title="供应链履约看板知识原型"
        />
      </div>
    </section>
  );
}

function readStoredSidebarState() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("scm.sidebarCollapsed") === "true";
}

function Sidebar({
  modules,
  active,
  collapsed,
  onSelect,
  onToggleCollapse
}: {
  modules: WorkbenchModule[];
  active: string;
  collapsed: boolean;
  onSelect: (id: string) => void;
  onToggleCollapse: () => void;
}) {
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="brand">
        <span className="brandMark">SC</span>
        <div className="brandCopy">
          <strong>AIP-SCM</strong>
          <small>Data Workbench</small>
        </div>
        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? "展开侧边导航" : "收起侧边导航"}
          className="sidebarToggle"
          onClick={onToggleCollapse}
          type="button"
        >
          <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
        </button>
      </div>
      <nav aria-label="AIP-SCM 工作台导航" className="sidebarNav">
        {modules.map((module) => (
          <button
            aria-current={active === module.id ? "page" : undefined}
            className={active === module.id ? "active" : ""}
            key={module.id}
            onClick={() => onSelect(module.id)}
            title={collapsed ? `${module.code} ${module.title}` : undefined}
            type="button"
          >
            <span>{module.code}</span>
            <strong>{module.title}</strong>
            <small>{module.primaryMetric}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function App() {
  const [active, setActive] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readStoredSidebarState);
  const overview = useApi<Overview>("/api/governance/overview", {
    counts: {},
    lifecycle: [],
    levels: [],
    tasks: [],
    moduleHealth: [],
    architectureLayers: []
  });
  const modulesApi = useApi<WorkbenchModule[]>("/api/workbench/modules", fallbackModules);
  const modules = modulesApi.data.length ? modulesApi.data : fallbackModules;
  const activeModule = modules.find((module) => module.id === active) || modules[0];

  useEffect(() => {
    window.localStorage.setItem("scm.sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <main className={`shell${sidebarCollapsed ? " sidebarCollapsed" : ""}`}>
      <Sidebar
        modules={modules}
        active={activeModule.id}
        collapsed={sidebarCollapsed}
        onSelect={setActive}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Supply chain semantic governance</p>
            <h1>{activeModule.title}</h1>
          </div>
          <div className="topMeta">
            <Badge tone="good">认证指标</Badge>
            <Badge tone="blue">本体图谱</Badge>
            <Badge>审批优先</Badge>
          </div>
        </header>
        {overview.error ? <div className="error">{overview.error}</div> : null}
        {modulesApi.error ? <div className="error">{modulesApi.error}</div> : null}
        {overview.loading && active === "overview" ? <div className="empty">正在加载治理资产...</div> : null}
        {active === "overview" && <OverviewPanel overview={overview.data} modules={modules} onSelect={setActive} />}
        {active === "strategy-panorama" && <StrategyPanoramaPanel module={activeModule} onSelect={setActive} />}
        {active === "current-risk-radar" && <CurrentRiskRadarPanel module={activeModule} onSelect={setActive} />}
        {active === "role-workbenches" && <RoleWorkbenchesPanel module={activeModule} onSelect={setActive} />}
        {active === "fulfillment-dashboard" && <FulfillmentDashboardPanel module={activeModule} />}
        {active === "ontology" && <OntologyPanel module={activeModule} />}
        {active === "tags" && <TagsPanel module={activeModule} />}
        {active === "dimensions" && <DimensionsPanel module={activeModule} />}
        {active === "metric-engineering" && <MetricsPanel module={activeModule} />}
        {active === "metric-dictionary" && <MetricsPanel module={activeModule} dictionary />}
        {active === "kpi-system" && <KpiTreePanel module={activeModule} />}
        {active === "lineage-quality" && <LineagePanel module={activeModule} />}
        {active === "ai-knowledge" && <AiKnowledgePanel module={activeModule} />}
        {active === "chatbi" && <ChatBiPanel module={activeModule} />}
        {active === "decision-loop" && <DecisionPanel module={activeModule} />}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
