import type { AnyRow } from "../shared/ui";
import type { AgentRun, AgentTrace } from "./agentActivityLists";

export type OwnerDecisionChoice = {
  code: string;
  label: string;
  status: string;
  reviewNote: string;
};

export type OwnerDecisionPacket = {
  id: string;
  title: string;
  linkedMetricId: string;
  recommendation: string;
  actionBoundary: string;
  owner: string;
  choices: OwnerDecisionChoice[];
};

export type ScenarioDiagnosticPayload<TScenario> = {
  scenario: TScenario;
  trace: AgentTrace;
  run: AgentRun;
  nextAction: string;
  boundary: string;
};

export type DecisionReceiptSummary = {
  summary: {
    packetCount: number;
    receiptCount: number;
    sourceCoverageRows: number;
    runtimeClosedRows: number;
    externalWriteback: boolean;
    providerCalls: boolean;
  };
  packets: Array<AnyRow & {
    packetId: string;
    title: string;
    seededStatus: string;
    latestStatus: string;
    latestDecisionId?: string | null;
    latestReviewNote: string;
    actionBoundary: string;
    coverageCount: number;
    runtimeClosedCount: number;
  }>;
  recentReceipts: AnyRow[];
};

export type OmsWmsUsagePolicyChoice = {
  code: string;
  label: string;
  status: string;
  reviewNote: string;
};

export type OmsWmsUsagePolicyPacket = {
  id: string;
  policyId: string;
  title: string;
  owner: string;
  linkedMetricId: string;
  recommendation: string;
  actionBoundary: string;
  evidenceRefs: string[];
  sourceCoverageRefs: string[];
  choices: OmsWmsUsagePolicyChoice[];
  recommendedChoice: string;
  recommendedStatus: string;
  selectedChoice: string;
  receiptId?: string | null;
  recordedStatus: string;
  recorded: boolean;
  sourceEvidence: AnyRow[];
  lineageEvidence: AnyRow[];
};

export type OmsWmsUsagePolicyPayload = {
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
    sourceCoverageRows: number;
    lineageRows: number;
    runtimeProjectionCandidateFields: number;
    activeAllowlistFields: number;
    excludedSensitiveIdentifierFields: number;
    effectiveUse: string[];
    closedActions: string[];
    boundary: Record<string, boolean>;
  };
  reviewPackets: OmsWmsUsagePolicyPacket[];
  boundary: Record<string, boolean>;
};

export function createEmptyDecisionReceiptSummary(): DecisionReceiptSummary {
  return {
    summary: {
      packetCount: 0,
      receiptCount: 0,
      sourceCoverageRows: 0,
      runtimeClosedRows: 0,
      externalWriteback: false,
      providerCalls: false
    },
    packets: [],
    recentReceipts: []
  };
}

export function createEmptyOmsWmsUsagePolicyPayload(): OmsWmsUsagePolicyPayload {
  return {
    id: "OMS-WMS-USAGE-POLICY-PACK-A4",
    generatedAt: "",
    summary: {
      id: "OMS-WMS-USAGE-POLICY-PACK-A4",
      title: "OMS/WMS source-field owner usage policy",
      recommendedPath: "A-A-A-A",
      status: "loading",
      ownerChoiceStatus: "owner_pending",
      scope: "metadata_and_lineage_governance_only",
      reviewPacketCount: 0,
      receiptCount: 0,
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
    boundary: {}
  };
}

export const ownerDecisionPackets: OwnerDecisionPacket[] = [
  {
    id: "ODP-THRESHOLD",
    title: "风险阈值与分级",
    linkedMetricId: "risk_threshold_pack",
    recommendation: "确认 P0/P1 风险阈值进入本地治理闭环",
    actionBoundary: "threshold_decision_only_no_external_write",
    owner: "供应链负责人",
    choices: [
      { code: "A", label: "批准当前阈值", status: "approved_with_conditions", reviewNote: "批准当前 P0/P1 阈值进入本地治理闭环，后续补真实业务阈值证据。" },
      { code: "B", label: "先用样本阈值", status: "sample_only", reviewNote: "仅允许样本阈值用于原型演示，不进入正式经营判断。" },
      { code: "C", label: "暂缓阈值确认", status: "deferred", reviewNote: "阈值确认暂缓，等待 owner 提供风险分级和升级规则。" }
    ]
  },
  {
    id: "ODP-OMS-WMS",
    title: "OMS/WMS 事件证据",
    linkedMetricId: "oms_wms_event_evidence",
    recommendation: "确认订单、出入库、平台库存事件的只读证据范围",
    actionBoundary: "source_evidence_scope_only_no_system_change",
    owner: "履约/仓储 Owner",
    choices: [
      { code: "A", label: "纳入只读证据", status: "approved_with_conditions", reviewNote: "同意把 OMS/WMS 事件纳入只读证据范围，仍需字段级样本验收。" },
      { code: "B", label: "只纳入库存事件", status: "partial_scope", reviewNote: "先纳入库存与平台仓事件，订单履约事件后续补充。" },
      { code: "C", label: "等待字段复核", status: "needs_more_evidence", reviewNote: "暂不纳入，等待字段 owner 复核完整事件口径。" }
    ]
  },
  {
    id: "OMSWMS-001",
    title: "Source coverage 对象入治理视图",
    linkedMetricId: "oms_wms_source_coverage_objects",
    recommendation: "确认 SKU、InventoryBatch、SalesOrder、CostEvent 作为第一批 source coverage 对象进入工作台治理视图。",
    actionBoundary: "source_coverage_governance_view_only_no_import",
    owner: "数据治理 Owner",
    choices: [
      { code: "A", label: "治理视图 only", status: "approved_for_governance_view", reviewNote: "批准第一批对象进入 source coverage 治理视图；仅展示字段覆盖与证据等级，不做 runtime import。" },
      { code: "B", label: "只保留草稿", status: "draft_only", reviewNote: "仅保留 source-field crosswalk 草稿，暂不进入工作台治理视图。" },
      { code: "C", label: "等待 owner 复核", status: "owner_review_pending", reviewNote: "等待对象 owner 复核 source coverage 范围后再进入治理视图。" }
    ]
  },
  {
    id: "OMSWMS-002",
    title: "Candidate extension object 建模",
    linkedMetricId: "oms_wms_candidate_extension_objects",
    recommendation: "确认 WarehouseTask、SerialNumber、InventoryTransaction、InventoryPosition 作为候选扩展对象进入草稿建模。",
    actionBoundary: "candidate_object_modeling_only_no_runtime_import",
    owner: "本体治理 Owner",
    choices: [
      { code: "A", label: "草稿建模", status: "approved_for_draft_modeling", reviewNote: "批准候选扩展对象进入草稿建模；正式对象和关系仍需 owner sign-off。" },
      { code: "B", label: "仅建字段字典", status: "field_dictionary_only", reviewNote: "先补字段字典，不新增候选对象。" },
      { code: "C", label: "暂缓扩展对象", status: "deferred", reviewNote: "暂缓扩展对象建模，等待 source lineage 和使用场景复核。" }
    ]
  },
  {
    id: "OMSWMS-003",
    title: "字段类支撑风险雷达",
    linkedMetricId: "oms_wms_field_class_risk_radar",
    recommendation: "确认 OMS/WMS 字段类可支撑风险雷达展示，同时暂缓真实业务行入库。",
    actionBoundary: "field_class_only_no_business_rows_no_runtime_import",
    owner: "风险雷达 Owner",
    choices: [
      { code: "A", label: "字段类 only", status: "approved_field_class_only", reviewNote: "批准字段类进入风险雷达证据说明；不包含业务明细行，不进入 runtime import。" },
      { code: "B", label: "仅显示证据等级", status: "evidence_badge_only", reviewNote: "仅在风险卡显示证据等级，不展示字段类细节。" },
      { code: "C", label: "等待阈值确认", status: "threshold_pending", reviewNote: "等待风险阈值和字段口径确认后再进入风险雷达。" }
    ]
  },
  {
    id: "OMSWMS-004",
    title: "Export/API lineage 入库前置门禁",
    linkedMetricId: "oms_wms_export_api_lineage_gate",
    recommendation: "确认每个字段类补齐 export/API lineage 后才允许进入正式 runtime import。",
    actionBoundary: "export_api_lineage_required_before_runtime_import",
    owner: "数据接入 Owner",
    choices: [
      { code: "A", label: "必须补 lineage", status: "lineage_required_before_import", reviewNote: "批准 export/API lineage 作为 runtime import 的前置门禁；未闭合前保持 not_authorized_for_import。" },
      { code: "B", label: "先补高优字段", status: "priority_lineage_first", reviewNote: "优先补库存、订单、费用和任务字段的 export/API lineage。" },
      { code: "C", label: "暂缓入库门禁", status: "deferred", reviewNote: "暂缓 runtime import 门禁设计，继续停留在 source coverage 草稿层。" }
    ]
  },
  {
    id: "ODP-FINANCE",
    title: "财务成本证据",
    linkedMetricId: "finance_cost_evidence",
    recommendation: "确认成本事件可用于供应链风险与利润影响判断",
    actionBoundary: "finance_readonly_scope_only_no_accounting_write",
    owner: "财务 Owner",
    choices: [
      { code: "A", label: "允许只读映射", status: "approved_with_conditions", reviewNote: "允许成本事件做只读映射，用于风险解释和影响评估。" },
      { code: "B", label: "仅做差异清单", status: "partial_scope", reviewNote: "先生成成本字段差异清单，不进入自动判断。" },
      { code: "C", label: "暂不纳入财务", status: "deferred", reviewNote: "财务证据暂不纳入，等待财务 owner 审核。" }
    ]
  },
  {
    id: "ODP-PROMO",
    title: "促销与预测输入",
    linkedMetricId: "promo_forecast_input",
    recommendation: "确认促销节奏作为需求预测和库存风险解释因子",
    actionBoundary: "forecast_input_decision_only_no_planning_writeback",
    owner: "销售/计划 Owner",
    choices: [
      { code: "A", label: "纳入预测输入", status: "approved_with_conditions", reviewNote: "促销节奏作为预测输入，进入本地解释和人工复盘。" },
      { code: "B", label: "只记录活动标签", status: "partial_scope", reviewNote: "先只记录活动标签，不参与阈值判断。" },
      { code: "C", label: "等待模板统一", status: "needs_more_evidence", reviewNote: "等待促销模板统一后再纳入。" }
    ]
  },
  {
    id: "ODP-PURCHASE",
    title: "采购生命周期字段",
    linkedMetricId: "purchase_lifecycle_fields",
    recommendation: "确认 PO、收货、发票、退货字段闭环范围",
    actionBoundary: "purchase_lifecycle_scope_only_no_procurement_write",
    owner: "采购 Owner",
    choices: [
      { code: "A", label: "纳入完整生命周期", status: "approved_with_conditions", reviewNote: "采购生命周期字段进入本地治理范围，后续补字段证据。" },
      { code: "B", label: "先纳入 PO/收货", status: "partial_scope", reviewNote: "先纳入 PO 与收货节点，发票和退货后续补充。" },
      { code: "C", label: "等待采购确认", status: "deferred", reviewNote: "等待采购 owner 确认字段口径和使用边界。" }
    ]
  }
];
