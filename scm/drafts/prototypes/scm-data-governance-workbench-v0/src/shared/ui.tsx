import React, { useEffect, useState } from "react";

export type AnyRow = Record<string, unknown>;
export type BadgeTone = "neutral" | "good" | "warn" | "bad" | "blue";

type WorkbenchModuleSummary = {
  code: string;
  title: string;
  focus: string;
  stage: string;
  status: string;
  primaryMetric: string;
  secondaryMetric: string;
};

export const columnLabels: Record<string, string> = {
  id: "ID",
  code: "编码",
  name: "名称",
  title: "标题",
  level: "层级",
  metric_type: "指标类型",
  l1_domain: "L1 域",
  l2_group: "L2 分组",
  lifecycle_status: "生命周期",
  certification_status: "认证状态",
  owner: "Owner",
  object_type: "对象类型",
  object_type_id: "对象类型",
  business_key: "业务键",
  display_name: "实例名称",
  source_system: "来源系统",
  field_id: "字段 ID",
  projection_status: "投影状态",
  source_surface: "来源页面",
  target_property: "目标属性",
  sensitivity_level: "敏感级别",
  grain: "粒度",
  status: "状态",
  source_object_id: "源对象",
  link_type: "关系",
  target_object_id: "目标对象",
  source_instance_id: "源实例",
  target_instance_id: "目标实例",
  business_meaning: "业务含义",
  tag_type: "标签类型",
  rule_expression: "规则",
  quality_status: "质量状态",
  dimension_type: "维度类型",
  hierarchy: "层级",
  bound_object_id: "绑定对象",
  formula: "公式",
  direction: "方向",
  source_ref: "来源",
  edge_type: "血缘类型",
  target_ref: "目标",
  confidence: "置信度",
  domain_id: "知识域",
  theme: "主题域",
  topic: "主题",
  summary: "摘要",
  source_path: "来源路径",
  source_section: "来源章节",
  evidence_level: "证据等级",
  card_count: "知识卡",
  chunk_count: "证据块",
  crosswalk_count: "映射",
  chunk_index: "证据序号",
  text: "证据正文",
  keywords: "关键词",
  target_type: "目标类型",
  target_id: "目标 ID",
  relation_type: "关系类型",
  note: "说明",
  task_type: "任务类型",
  priority: "优先级",
  metric_id: "指标 ID",
  answer_policy: "回答策略",
  insight_title: "洞察",
  linked_metric_id: "关联指标",
  subject_ref: "关联主题",
  subject_type: "主题类型",
  recommendation: "建议",
  review_note: "复盘记录",
  insight_ref: "洞察引用",
  action_name: "动作",
  approval_required: "需审批",
  replay_note: "复盘说明",
  source_type: "来源类型",
  source_id: "来源 ID",
  question: "问题",
  intent: "意图",
  answerability: "可回答性",
  created_at: "创建时间",
  scenario: "场景",
  target_object_type: "目标对象类型",
  business_impact: "业务影响",
  confidence_level: "置信等级",
  risk_level: "风险等级",
  sla_due_at: "SLA",
  approval_status: "审批状态",
  execution_status: "执行状态",
  trace_id: "Trace ID",
  updated_at: "更新时间",
  run_type: "运行类型",
  started_at: "开始时间",
  completed_at: "完成时间",
  decision_boundary: "决策边界",
  scenario_type: "场景类型",
  trigger_condition: "触发条件",
  linked_metric_ids: "关联指标",
  linked_knowledge_card_ids: "关联知识卡",
  linked_recommendation_card_ids: "关联建议卡",
  diagnostic_question: "诊断问题",
  next_action: "下一步动作"
};

const operationalLabelMap: Record<string, string> = {
  active: "已启用",
  certified: "已认证",
  completed: "已完成",
  done: "已完成",
  mapped: "已映射",
  reviewed: "已复核",
  draft: "草稿",
  review_pending: "待复核",
  pending_approval: "待审批",
  owner_pending: "待责任人确认",
  owner_review_pending: "待责任人复核",
  owner_receipts_incomplete: "责任人回执未齐",
  draft_design_ready: "设计草稿就绪",
  draft_design_ready_data_pending: "设计就绪，待真实数据",
  implemented_local_role_routes: "角色路由已接入",
  draft_framework: "框架草稿",
  data_pending: "待真实数据",
  approved_with_conditions: "有条件批准",
  approved_for_governance_view: "已纳入治理视图",
  approved_for_draft_modeling: "批准草稿建模",
  approved_field_class_only: "仅批准字段类",
  sample_only: "仅样本展示",
  partial_scope: "部分纳入",
  needs_more_evidence: "待补证据",
  deferred: "暂缓",
  recommended_owner_pending: "建议路径待责任人确认",
  draft_only_governance_policy: "草稿治理策略",
  draft_only_governance_view: "仅用于治理视图",
  operational_scoring_disabled: "自动评分未启用",
  owner_values_pending: "阈值待责任人确认",
  local_answer_quality_review_only: "仅本地回答质量评审",
  formal_answer_not_approved: "正式答案待批准",
  usable_as_local_evidence: "可作为本地证据",
  not_authorized_for_import: "暂未授权导入",
  lineage_required_before_import: "导入前需补血缘",
  closed_until_owner_lineage_receipt: "待责任人血缘回执后开启",
  action_task_created: "行动任务已创建",
  waiting_for_conversion: "待转为行动任务",
  not_created: "未创建",
  governance_view_only: "仅治理视图",
  local_ledger_only: "仅本地台账",
  metadata_projection_only: "仅元数据投影",
  metadata_only: "仅元数据",
  needs_bill_drilldown: "需要账单钻取",
  approved_for_runtime_projection: "批准运行时元数据投影",
  design_gate_only_no_import: "仅设计门禁，不导入",
  source_reads_disabled: "来源读取关闭",
  runtime_import_unauthorized: "运行时导入未授权",
  raw_sensitive_identifiers_blocked: "敏感标识已阻断",
  ready: "已就绪",
  idle: "待运行",
  failed: "失败",
  approved: "已批准",
  local_only: "仅本地",
  L2_browser_dom_verified: "L2 浏览器页面已核验",
  L3_owner_reviewed: "L3 责任人已复核"
};

const boundaryLabelMap: Record<string, string> = {
  threshold_decision_only_no_external_write: "仅记录阈值决策，不写外部系统",
  source_evidence_scope_only_no_system_change: "仅确认来源证据范围，不改源系统",
  source_coverage_governance_view_only_no_import: "仅进入覆盖治理视图，不导入业务行",
  candidate_object_modeling_only_no_runtime_import: "仅做候选对象建模，不开启运行时导入",
  field_class_only_no_business_rows_no_runtime_import: "仅展示字段类，不含业务明细行",
  export_api_lineage_required_before_runtime_import: "运行时导入前必须补齐导出/API 血缘",
  finance_readonly_scope_only_no_accounting_write: "仅做财务只读证据，不写会计系统",
  forecast_input_decision_only_no_planning_writeback: "仅记录预测输入决策，不回写计划系统",
  purchase_lifecycle_scope_only_no_procurement_write: "仅确认采购生命周期范围，不写采购系统",
  role_workbench_local_review_only_no_external_write: "仅写本地角色复盘，不写外部系统",
  ai_kb_answer_quality_review_local_only_no_provider_call_no_production_write: "仅做本地回答质量评审，不调用模型，不写生产",
  source_system_read_disabled: "源系统读取关闭",
  business_rows_not_imported: "业务明细行未导入",
  provider_calls_disabled: "外部模型调用关闭",
  production_write_disabled: "生产写入关闭",
  erp_writeback_disabled: "ERP 回写关闭"
};

export function toneFromStatus(status = ""): BadgeTone {
  if (["active", "certified", "已签字", "done"].includes(status)) return "good";
  if (["mapped", "reviewed"].includes(status)) return "blue";
  if (["draft", "review_pending", "pending_approval"].includes(status)) return "warn";
  if (["deprecated", "blocked"].includes(status)) return "bad";
  return "neutral";
}

export function sourceEvidenceTone(level: string): BadgeTone {
  if (level === "L2_browser_dom_verified") return "blue";
  if (level === "L1_frontend_script_parsed") return "warn";
  return "neutral";
}

export function humanizeOperationalLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const direct = operationalLabelMap[raw] || operationalLabelMap[raw.toLowerCase()] || boundaryLabelMap[raw];
  if (direct) return direct;
  return raw
    .replace(/\bdraft[-_ ]?only\b/gi, "草稿治理")
    .replace(/\bmanual review\b/gi, "人工复核")
    .replace(/\breceipts?\b/gi, "回执")
    .replace(/\bRunTrace\b/g, "运行记录")
    .replace(/\bTrace\b/g, "证据链")
    .replace(/\bprovider\b/gi, "外部模型")
    .replace(/\bwriteback\b/gi, "业务系统回写")
    .replace(/\bno runtime import\b/gi, "未开启运行时导入")
    .replace(/\bno provider \/ no writeback\b/gi, "不调用外部模型，不回写业务系统")
    .replace(/owner[_ ]pending/gi, "待责任人确认")
    .replace(/runtime[_ ]import/gi, "运行时导入")
    .replace(/production[_ ]write/gi, "生产写入")
    .replace(/_/g, " ");
}

export function humanizeBoundary(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return boundaryLabelMap[raw] || humanizeOperationalLabel(raw);
}

function shouldHumanizeColumn(column = "") {
  return /status|boundary|evidence_level|lineage_status|runtime_status|owner_gate_status|approval_status|execution_status/i.test(column);
}

export function cellValue(value: unknown, column = "") {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return JSON.stringify(value);
  return shouldHumanizeColumn(column) ? humanizeOperationalLabel(value) : String(value);
}

export function rowKey(row: AnyRow, index = 0) {
  return String(row.id || row.code || row.name || `${index}`);
}

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function GovernanceBoundaryStrip({
  items
}: {
  items: Array<{ label: string; tone?: BadgeTone }>;
}) {
  return (
    <div className="governanceBoundaryStrip">
      {items.map((item) => (
        <Badge key={item.label} tone={item.tone || "neutral"}>{item.label}</Badge>
      ))}
    </div>
  );
}

export function DataTable({
  rows,
  columns,
  empty = "暂无数据",
  onRowSelect,
  selectedId,
  pageSize = 12
}: {
  rows: AnyRow[];
  columns: string[];
  empty?: string;
  onRowSelect?: (row: AnyRow) => void;
  selectedId?: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visibleRows = rows.slice(start, start + pageSize);

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize]);

  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="dataGrid">
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th className="indexCell">序号</th>
              {columns.map((column) => <th key={column}>{columnLabels[column] || column}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const key = rowKey(row, start + index);
              return (
                <tr
                  className={`${onRowSelect ? "clickableRow" : ""} ${selectedId === key ? "selectedRow" : ""}`}
                  key={key}
                  onClick={() => onRowSelect?.(row)}
                  tabIndex={onRowSelect ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (!onRowSelect || (event.key !== "Enter" && event.key !== " ")) return;
                    event.preventDefault();
                    onRowSelect(row);
                  }}
                >
                  <td className="indexCell">{start + index + 1}</td>
                  {columns.map((column) => <td key={column}>{cellValue(row[column], column)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <span>
          {rows.length} rows · {safePage}/{totalPages}
        </span>
        <div>
          <button disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button>
          <button disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button>
        </div>
      </div>
    </div>
  );
}

export function ModuleHeader({ module, eyebrow }: { module: WorkbenchModuleSummary; eyebrow?: string }) {
  return (
    <div className="moduleHeader">
      <div>
        <p className="eyebrow">{eyebrow || `${module.stage} / ${module.code}`}</p>
        <h2>{module.title}</h2>
        <p className="muted">{module.focus}</p>
      </div>
      <div className="moduleSignal">
        <Badge tone={toneFromStatus(module.status)}>{humanizeOperationalLabel(module.status)}</Badge>
        <strong>{module.primaryMetric}</strong>
        <span>{module.secondaryMetric}</span>
      </div>
    </div>
  );
}

export function WorkflowStrip({ steps }: { steps?: string[] }) {
  const workflowSteps = steps || ["检索筛选", "打开详情", "注解/评论", "修订建议", "JSON/CSV/Excel 导出"];
  return (
    <div className="workflowStrip" aria-label="workbench workflow">
      {workflowSteps.map((step, index) => (
        <div key={step} className="workflowStep">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  );
}

export function RefPills({ label, refs }: { label: string; refs?: string[] }) {
  if (!refs?.length) return null;
  return (
    <div className="refPills" aria-label={label}>
      <span>{label}</span>
      {refs.slice(0, 6).map((item) => <strong key={item}>{item}</strong>)}
    </div>
  );
}
