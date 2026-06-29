import type { DecisionLogRequestPayload } from "./governanceReviewPayloads";

export type RoleWorkbench = {
  id: string;
  name: string;
  ownerRole: string;
  mission: string;
  inputRefs: string[];
  processSteps: string[];
  outputRefs: string[];
  approvalGates: string[];
  replayRefs: string[];
  linkedModules: string[];
  primaryRisks: string[];
};

export const roleWorkbenches: RoleWorkbench[] = [
  {
    id: "executive-command",
    name: "管理层 Command Center",
    ownerRole: "CEO/COO/供应链负责人",
    mission: "把服务水平、库存现金、风险暴露和战略路线图放到同一决策面。",
    inputRefs: ["Strategic North Star", "Risk Radar", "SCEI 候选指标", "Owner Decision Packet"],
    processSteps: ["查看目标差距", "对齐 P0 风险", "确认投资优先级", "决定升级路径"],
    outputRefs: ["路线图优先级", "风险处置指令", "经营复盘议题"],
    approvalGates: ["目标阈值 owner sign-off", "生产同步授权", "runtime import gate"],
    replayRefs: ["Decision Log", "Trace Review", "Recommendation Card"],
    linkedModules: ["strategy-panorama", "current-risk-radar", "decision-loop"],
    primaryRisks: ["strategy", "inventory", "cash"]
  },
  {
    id: "planning",
    name: "计划员工作台",
    ownerRole: "供应链计划 Owner",
    mission: "把预测偏差、补货策略、S&OP/S&OE 和异常升级串成计划闭环。",
    inputRefs: ["ForecastVersion", "SKU", "库存健康指标", "断货风险场景"],
    processSteps: ["读取预测偏差", "匹配补货规则", "检查库存水位", "触发异常复盘"],
    outputRefs: ["补货建议", "预测复盘单", "S&OE 升级队列"],
    approvalGates: ["补货阈值确认", "促销活动影响确认", "异常升级 owner review"],
    replayRefs: ["AIP Scenario", "RunTrace", "KPI Tree"],
    linkedModules: ["kpi-system", "current-risk-radar", "chatbi"],
    primaryRisks: ["forecast", "inventory", "process"]
  },
  {
    id: "procurement",
    name: "采购员工作台",
    ownerRole: "采购 Owner",
    mission: "把供应商准交、采购计划、交期风险、质量和成本取舍落到可复盘动作。",
    inputRefs: ["Supplier", "PO", "采购计划", "供应商绩效"],
    processSteps: ["识别交期波动", "检查 PO 状态", "匹配替代供应", "形成采购行动"],
    outputRefs: ["供应风险清单", "PO 跟催动作", "供应商复盘议题"],
    approvalGates: ["供应商策略 owner review", "采购异常升级", "成本/交期取舍确认"],
    replayRefs: ["Recommendation Card", "Action Task", "Source Coverage"],
    linkedModules: ["ontology", "lineage-quality", "decision-loop"],
    primaryRisks: ["supplier", "cost", "quality"]
  },
  {
    id: "warehouse-inventory",
    name: "仓库库存工作台",
    ownerRole: "仓库/库存 Owner",
    mission: "围绕库存状态、库龄、负可用、盘点和批次异常形成库存治理闭环。",
    inputRefs: ["InventoryBatch", "Warehouse", "库存动态", "WMS execution fields"],
    processSteps: ["定位异常批次", "核对 source coverage", "解释库龄/冻结/预占", "生成复盘任务"],
    outputRefs: ["库存异常队列", "批次复核任务", "库龄治理建议"],
    approvalGates: ["库存字段使用授权", "盘点/调整审批", "runtime import gate"],
    replayRefs: ["Object 360", "Trace Review", "Action Task"],
    linkedModules: ["current-risk-radar", "ontology", "lineage-quality"],
    primaryRisks: ["inventory", "data", "fulfillment"]
  },
  {
    id: "logistics-control",
    name: "物流控制塔",
    ownerRole: "物流履约 Owner",
    mission: "把出海网络、仓配 SLA、在途异常和履约风险集中到物流控制面。",
    inputRefs: ["Shipment", "Warehouse", "TMS/WMS 节点", "履约 SLA"],
    processSteps: ["检查履约节点", "定位在途延迟", "归因仓配责任", "升级异常动作"],
    outputRefs: ["物流异常看板", "履约 SLA 复盘", "控制塔升级记录"],
    approvalGates: ["SLA 阈值确认", "异常升级 owner review", "外部系统写回禁用"],
    replayRefs: ["RunTrace", "Decision Log", "Source Lineage"],
    linkedModules: ["current-risk-radar", "decision-loop", "chatbi"],
    primaryRisks: ["fulfillment", "shipment", "process"]
  },
  {
    id: "finance-cost",
    name: "财务成本工作台",
    ownerRole: "财务成本 Owner",
    mission: "把海外仓费用、履约成本、退货成本、库存资金和对账口径纳入治理视图。",
    inputRefs: ["OMS fee statistics", "成本指标", "库存现金目标", "对账规则"],
    processSteps: ["识别费用构成", "匹配成本口径", "关联库存/履约对象", "形成对账复盘"],
    outputRefs: ["费用异常清单", "成本归因说明", "财务 owner review 包"],
    approvalGates: ["财务口径 owner sign-off", "bill drill-down authorization", "reconciliation rule review"],
    replayRefs: ["Metric Dictionary", "Decision Receipt", "Trace Review"],
    linkedModules: ["metric-dictionary", "lineage-quality", "decision-loop"],
    primaryRisks: ["cost", "cash", "finance"]
  }
];

export function buildRoleReviewDecisionLog(
  role: RoleWorkbench,
  status: string,
  timestamp = Date.now()
): DecisionLogRequestPayload {
  return {
    id: `decision_role_${role.id}_${status}_${timestamp}`,
    insightTitle: `${role.name} - ${status}`,
    linkedMetricId: `role_workbench.${role.id}`,
    recommendation: `角色工作台 ${role.name} 进入 ${status}；保持本地治理复盘，不写外部系统。`,
    actionBoundary: "role_workbench_local_review_only_no_external_write",
    status,
    reviewNote: `${role.ownerRole} role review recorded from Role Workbenches UI.`,
    actor: role.ownerRole
  };
}
