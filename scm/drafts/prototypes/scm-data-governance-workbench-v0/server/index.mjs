import { DatabaseSync } from "node:sqlite";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
loadLocalEnvFile(resolve(root, ".env"));
loadLocalEnvFile(resolve(root, ".env.local"));
const dbPath = resolve(root, "data/governance_workbench.sqlite");
const distPath = resolve(root, "dist");
const runtimeMetadataProjectionPath = resolve(root, "data/runtime-metadata-projection.json");
const aiKnowledgeEvidenceQualityReviewFile = "ai-knowledge-evidence-quality-review-20260622.json";
const projectRoot = resolveProjectRoot();
const aiKnowledgeEvidenceQualityReviewPath = resolveAiKnowledgeEvidenceQualityReviewPath();
const port = Number(process.env.PORT || 5174);
const host = process.env.HOST || "127.0.0.1";
const launchedAt = new Date().toISOString();
const deepSeekDefaultBaseUrl = "https://api.deepseek.com";
const deploymentMetadata = {
  releaseId: process.env.SCM_RELEASE_ID || "local-compose",
  gitSha: process.env.SCM_GIT_SHA || "unknown",
  dataMountType: process.env.SCM_DATA_MOUNT_TYPE || "image_embedded_data",
  dataVolumeName: process.env.SCM_DATA_VOLUME_NAME || "",
  dataMountPath: publicMountPath(process.env.SCM_DATA_MOUNT_PATH)
};

function publicMountPath(value) {
  const configuredPath = String(value || "").trim();
  if (!configuredPath) return "data/governance_workbench.sqlite";
  if (!isAbsolute(configuredPath) || configuredPath === "/app" || configuredPath.startsWith("/app/")) return configuredPath;
  return `external/${basename(configuredPath)}`;
}

function resolveProjectRoot() {
  const configuredRoot = String(process.env.SCM_PROJECT_ROOT || "").trim();
  if (configuredRoot) return resolve(configuredRoot);
  const standaloneEvidencePath = resolve(root, "tmp", "outputs", aiKnowledgeEvidenceQualityReviewFile);
  if (existsSync(standaloneEvidencePath)) return root;
  const monorepoRoot = resolve(root, "../../..");
  const monorepoEvidencePath = resolve(monorepoRoot, "tmp", "outputs", aiKnowledgeEvidenceQualityReviewFile);
  if (existsSync(monorepoEvidencePath)) return monorepoRoot;
  return root;
}

function resolveProjectPath(value) {
  const path = String(value || "").trim();
  return isAbsolute(path) ? resolve(path) : resolve(projectRoot, path);
}

function publicProjectPath(value) {
  const absolutePath = resolve(value);
  for (const base of [projectRoot, root]) {
    const candidate = relative(base, absolutePath);
    if (candidate === "") return ".";
    if (!candidate.startsWith("..") && !isAbsolute(candidate)) return candidate;
  }
  return `external/${basename(absolutePath)}`;
}

function resolveAiKnowledgeEvidenceQualityReviewPath() {
  const configuredPath = String(process.env.SCM_AI_KNOWLEDGE_EVIDENCE_PATH || "").trim();
  if (configuredPath) return resolveProjectPath(configuredPath);
  const candidates = [
    resolve(root, "runtime", "evidence", aiKnowledgeEvidenceQualityReviewFile),
    resolve(root, "data", aiKnowledgeEvidenceQualityReviewFile),
    resolve(root, "tmp", "outputs", aiKnowledgeEvidenceQualityReviewFile),
    resolve(root, "../../../tmp/outputs", aiKnowledgeEvidenceQualityReviewFile)
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

if (!existsSync(dbPath)) {
  console.error(`SQLite database not found: ${dbPath}`);
  console.error("Run `npm run import` before starting the API.");
  process.exit(1);
}

const requiredDatabaseTables = [
  "action_tasks",
  "agent_runs",
  "agent_traces",
  "aip_scenarios",
  "annotations",
  "audit_events",
  "certifications",
  "chatbi_contexts",
  "comments",
  "decision_logs",
  "dimensions",
  "export_jobs",
  "governance_tasks",
  "knowledge_cards",
  "knowledge_chunks",
  "knowledge_crosswalks",
  "knowledge_domains",
  "kpi_tree",
  "lineage_edges",
  "metric_dimensions",
  "metrics",
  "ontology_instance_links",
  "ontology_links",
  "ontology_object_instances",
  "ontology_objects",
  "recommendation_cards",
  "revision_proposals",
  "tags",
  "trace_reviews"
];
const databaseWriteAuthorized = envFlag("SCM_DATABASE_WRITES_AUTHORIZED", false);
const databaseMode = databaseWriteAuthorized ? "writable" : "readonly";
const db = new DatabaseSync(dbPath, { readOnly: !databaseWriteAuthorized });

if (databaseWriteAuthorized) ensureWorkflowSchema();
validateDatabaseSchema();

function loadRuntimeMetadataProjection() {
  const fallback = {
    artifact_type: "runtime_metadata_projection_allowlist",
    project: "ecom_ana_overview/scm",
    created_at: launchedAt,
    owner_choice: "A-A-A",
    policy: {
      runtime_scope_gate: "RUNTIME-IMPORT-001=A",
      sensitive_identifier_gate: "RUNTIME-IMPORT-002=A",
      threshold_activation_gate: "RUNTIME-IMPORT-003=A",
      scope: "metadata_only_runtime_projection",
      sensitive_identifier_policy: "exclude_sensitive_operational_identifier_first_stage",
      threshold_policy: "draft_only_no_operational_scoring"
    },
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
    receipt_summary: {},
    allowlist_fields: [],
    excluded_fields: []
  };
  if (!existsSync(runtimeMetadataProjectionPath)) return fallback;
  try {
    return JSON.parse(readFileSync(runtimeMetadataProjectionPath, "utf8"));
  } catch (error) {
    return { ...fallback, load_error: error.message };
  }
}

const runtimeMetadataProjection = loadRuntimeMetadataProjection();

const sourceCoverageRows = [
  {
    id: "SCOV-OMS-INVENTORY-STATS",
    source_system: "OMS",
    source_surface: "库存统计",
    field_class: "仓库/商品编码/可用库存/可售库存/库龄区间",
    target_object_type: "inventory_batch",
    target_property: "warehouse_id, sku_code, available_qty, sellable_qty, age_bucket",
    grain: "sku + warehouse + snapshot_time",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_fba_negative_available", "scenario_stockout_risk", "scenario_aged_inventory_overstock"],
    gate_ids: ["OMSWMS-001", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-OMS-REGIONAL-INVENTORY",
    source_system: "OMS",
    source_surface: "区域仓库存",
    field_class: "商品编码/参考编码/仓库/可售/冻结/预警库存/在途/预占",
    target_object_type: "inventory_batch",
    target_property: "sku_code, reference_code, warehouse_id, sellable_qty, frozen_qty, warning_stock_qty, in_transit_qty, reserved_qty",
    grain: "sku + warehouse + stock_status",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_fba_negative_available", "scenario_stockout_risk"],
    gate_ids: ["OMSWMS-001", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-OMS-INVENTORY-CHANGE",
    source_system: "OMS",
    source_surface: "库存动态",
    field_class: "操作单号/操作类型/商品编码/仓库/商品品质/变动量/操作时间",
    target_object_type: "inventory_transaction",
    target_property: "operation_no, operation_type, sku_code, warehouse_id, quality_status, delta_qty, operation_time",
    grain: "operation_no + sku + warehouse",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_fba_negative_available"],
    gate_ids: ["OMSWMS-002", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-OMS-SALES-STATS",
    source_system: "OMS",
    source_surface: "商品销量统计",
    field_class: "仓库/销售平台/商品编码/月销量/周转率/预计可售天数",
    target_object_type: "sku",
    target_property: "warehouse_id, platform, sku_code, monthly_sales_qty, turnover_rate, estimated_sellable_days",
    grain: "sku + platform + warehouse + period",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_stockout_risk", "scenario_aged_inventory_overstock"],
    gate_ids: ["OMSWMS-001", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-OMS-ORDER-STATS",
    source_system: "OMS",
    source_surface: "订单统计/订单列表",
    field_class: "收件人国家/订单量/订单状态/发货仓/物流产品/销售平台/订单类型",
    target_object_type: "sales_order",
    target_property: "destination_country, order_qty, order_status, ship_warehouse, logistics_product, sales_platform, order_type",
    grain: "order_no or country + warehouse/platform + period",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_stockout_risk"],
    gate_ids: ["OMSWMS-001", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-OMS-COST",
    source_system: "OMS",
    source_surface: "费用统计",
    field_class: "订单费用/退货费用/入库费用/仓租费用/增值费用/异常服务费用",
    target_object_type: "cost_event",
    target_property: "cost_type, cost_amount, currency",
    grain: "cost_type + period + currency",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_aged_inventory_overstock"],
    gate_ids: ["OMSWMS-001", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-WMS-SKU-MASTER",
    source_system: "WMS",
    source_surface: "产品档案",
    field_class: "货主/产品代码/产品描述/产品别名/货物类型/产品组/体积/毛重",
    target_object_type: "sku",
    target_property: "owner, product_code, product_description, alias, cargo_type, product_group, carton_volume, gross_weight",
    grain: "owner + product_code",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_stockout_risk", "scenario_aged_inventory_overstock"],
    gate_ids: ["OMSWMS-001", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-WMS-INVENTORY-SNAPSHOT",
    source_system: "WMS",
    source_surface: "库存快照数据导出",
    field_class: "供应链SKU/产品描述/仓库名称/仓库类型/库存数量/良品/不良品/锁库数量/快照时间",
    target_object_type: "inventory_batch",
    target_property: "supply_chain_sku, product_description, warehouse_name, warehouse_type, inventory_qty, good_qty, defect_qty, locked_qty, snapshot_time",
    grain: "sku + warehouse + snapshot_time",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_fba_negative_available", "scenario_stockout_risk", "scenario_aged_inventory_overstock"],
    gate_ids: ["OMSWMS-001", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-WMS-INVENTORY-BALANCE",
    source_system: "WMS",
    source_surface: "库存余量",
    field_class: "客户/产品组/货物类型/批次/区域/上架区/库位/库位组",
    target_object_type: "inventory_position",
    target_property: "customer_code, product_group, cargo_type, batch_no, area, putaway_zone, location_code, location_group",
    grain: "sku + batch + location",
    evidence_level: "L1_frontend_script_parsed",
    scenario_refs: ["scenario_fba_negative_available", "scenario_stockout_risk"],
    gate_ids: ["OMSWMS-002", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-WMS-PUTAWAY-TASK",
    source_system: "WMS",
    source_surface: "上架任务管理",
    field_class: "任务编号/任务状态/单证编号/产品代码/仓库/FM库位/实际上架库位/数量/释放关闭时间",
    target_object_type: "warehouse_task",
    target_property: "task_no, task_status, document_no, product_code, warehouse_code, from_location, actual_putaway_location, qty, release_close_time",
    grain: "task_no + sku + location",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_stockout_risk"],
    gate_ids: ["OMSWMS-002", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-WMS-PICKING-TASK",
    source_system: "WMS",
    source_surface: "拣货任务管理",
    field_class: "任务编号/任务组/波次/单证编号/任务状态/产品/FM库位/TO库位/数量/优先级",
    target_object_type: "warehouse_task",
    target_property: "task_no, task_group_no, wave_no, document_no, task_status, product_code, from_location, to_location, qty, priority",
    grain: "task_no + wave_no + order_no + sku",
    evidence_level: "L2_browser_dom_verified",
    scenario_refs: ["scenario_stockout_risk"],
    gate_ids: ["OMSWMS-002", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  },
  {
    id: "SCOV-WMS-SERIAL",
    source_system: "WMS",
    source_surface: "入库/出库序列号查询",
    field_class: "序列号/箱码/货主/产品代码/批次号/ASN/SO/在库标记/跟踪号/库位/仓库",
    target_object_type: "serial_number",
    target_property: "serial_no, carton_code, owner, product_code, batch_no, asn_no, sales_order_no, in_stock_flag, tracking_no, location_code, warehouse_code",
    grain: "serial_no + product_code + warehouse",
    evidence_level: "L1_frontend_script_parsed",
    scenario_refs: ["scenario_fba_negative_available"],
    gate_ids: ["OMSWMS-002", "OMSWMS-003", "OMSWMS-004"],
    runtime_status: "not_authorized_for_import",
    owner_gate_status: "owner_pending"
  }
];

const sourceCoverageObjectAliases = {
  inventory_batch: ["inventory_batch", "inventory_transaction", "inventory_position", "serial_number", "warehouse_task"],
  sku: ["sku", "inventory_batch", "sales_order"],
  warehouse: ["warehouse", "inventory_batch", "inventory_position", "warehouse_task"],
  sales_order: ["sales_order", "warehouse_task", "serial_number"],
  cost_event: ["cost_event"],
  shipment: ["sales_order", "warehouse_task"],
  parcel: ["sales_order"],
  forecast_version: ["sku", "inventory_batch"]
};

function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function loadLocalEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    if (!key || process.env[key]) continue;
    const raw = trimmed.slice(index + 1).trim();
    process.env[key] = raw.replace(/^['"]|['"]$/g, "");
  }
}

function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

function insert(table, record) {
  const keys = Object.keys(record);
  const placeholders = keys.map(() => "?").join(", ");
  const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`);
  stmt.run(...keys.map((key) => record[key]));
}

function normalizeObjectType(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function hydrateSourceCoverage(row) {
  return {
    ...row,
    scenarioRefs: row.scenario_refs,
    gateIds: row.gate_ids
  };
}

function sourceCoverageLineageRows() {
  return getSourceCoverage().map((row) => {
    const gateStatuses = row.gate_ids.map((gateId) => {
      const decision = get(
        "SELECT id, insight_title, status, review_note, action_boundary FROM decision_logs WHERE id = ? OR linked_metric_id = ? ORDER BY id DESC LIMIT 1",
        [gateId, row.target_object_type]
      );
      return {
        gateId,
        status: decision?.status || row.owner_gate_status,
        decisionRef: decision?.id || gateId,
        reviewNote: decision?.review_note || "owner decision pending"
      };
    });
    const scenarioNames = row.scenario_refs.map((scenarioId) => {
      const scenario = get("SELECT id, name, priority, status FROM aip_scenarios WHERE id = ?", [scenarioId]);
      return scenario ? `${scenario.priority}:${scenario.name}` : scenarioId;
    });
    return {
      id: `${row.id}-LINEAGE`,
      source_coverage_id: row.id,
      source_system: row.source_system,
      source_surface: row.source_surface,
      field_class: row.field_class,
      target_object_type: row.target_object_type,
      target_property: row.target_property,
      export_surface: `${row.source_system}:${row.source_surface}`,
      api_candidate: `${row.source_system.toLowerCase()}.${row.target_object_type}.${row.id.toLowerCase().replace(/^scov-/, "").replaceAll("-", "_")}`,
      lineage_status: row.gate_ids.includes("OMSWMS-004") ? "lineage_required_before_import" : "governance_view_only",
      runtime_status: row.runtime_status,
      evidence_level: row.evidence_level,
      scenario_refs: row.scenario_refs,
      scenario_names: scenarioNames,
      gate_ids: row.gate_ids,
      gate_statuses: gateStatuses,
      import_gate: row.runtime_status === "not_authorized_for_import" ? "closed_until_owner_lineage_receipt" : "runtime_candidate"
    };
  });
}

function getSourceCoverageLineage(url = new URL("http://local/api/source-coverage/lineage")) {
  const sourceSystem = String(url.searchParams.get("sourceSystem") || "").trim().toLowerCase();
  const objectType = normalizeObjectType(url.searchParams.get("objectType") || "");
  return sourceCoverageLineageRows().filter((row) => {
    if (sourceSystem && row.source_system.toLowerCase() !== sourceSystem) return false;
    if (objectType && normalizeObjectType(row.target_object_type) !== objectType) return false;
    return true;
  });
}

function getDecisionReceiptSummary() {
  const sourceRows = getSourceCoverage();
  const receiptPackets = [
    { packetId: "OMSWMS-001", coverageGateId: "OMSWMS-001" },
    { packetId: "OMSWMS-002", coverageGateId: "OMSWMS-002" },
    { packetId: "OMSWMS-003", coverageGateId: "OMSWMS-003" },
    { packetId: "OMSWMS-004", coverageGateId: "OMSWMS-004" },
    { packetId: "RUNTIME-IMPORT-001", coverageGateId: null },
    { packetId: "RUNTIME-IMPORT-002", coverageGateId: null },
    { packetId: "RUNTIME-IMPORT-003", coverageGateId: null }
  ];
  const packetRows = receiptPackets.map(({ packetId, coverageGateId }) => {
    const seed = get("SELECT * FROM decision_logs WHERE id = ?", [packetId]);
    const receipts = all(
      "SELECT * FROM decision_logs WHERE id LIKE ? OR linked_metric_id = ? ORDER BY id DESC LIMIT 20",
      [`decision_${packetId.toLowerCase()}_%`, seed?.linked_metric_id || packetId]
    );
    const latestReceipt = receipts.find((row) => row.id !== packetId) || null;
    const relatedCoverage = coverageGateId ? sourceRows.filter((row) => row.gate_ids.includes(coverageGateId)) : [];
    return {
      packetId,
      title: seed?.insight_title || packetId,
      seededStatus: seed?.status || "owner_pending",
      latestStatus: latestReceipt?.status || seed?.status || "owner_pending",
      latestDecisionId: latestReceipt?.id || null,
      latestReviewNote: latestReceipt?.review_note || seed?.review_note || "",
      actionBoundary: latestReceipt?.action_boundary || seed?.action_boundary || "",
      coverageCount: relatedCoverage.length,
      runtimeClosedCount: relatedCoverage.filter((row) => row.runtime_status === "not_authorized_for_import").length
    };
  });
  return {
    summary: {
      packetCount: packetRows.length,
      receiptCount: packetRows.filter((row) => row.latestDecisionId).length,
      sourceCoverageRows: sourceRows.length,
      runtimeClosedRows: sourceRows.filter((row) => row.runtime_status === "not_authorized_for_import").length,
      externalWriteback: false,
      providerCalls: false
    },
    packets: packetRows,
    recentReceipts: all(
      "SELECT * FROM decision_logs WHERE id LIKE 'decision_omswms-%' OR id LIKE 'decision_runtime-import-%' ORDER BY id DESC LIMIT 16"
    )
  };
}

function getOmsWmsOwnerUsagePolicy() {
  const sourceRows = getSourceCoverage();
  const lineageRows = sourceCoverageLineageRows();
  const runtimeSummary = runtimeMetadataProjection.summary || {};
  const boundary = {
    productionWrites: false,
    providerCalls: false,
    erpWriteback: false,
    omsWmsWriteback: false,
    businessRowsImported: false,
    runtimeImportAuthorized: false,
    exportDownloadAutomation: false,
    sensitiveRawIdentifiersAllowed: false,
    sourceSystemTruthPromoted: false
  };
  const usagePackets = [
    {
      id: "OMSWMS-USE-001",
      policyId: "field_usage_scope",
      title: "字段使用范围",
      owner: "数据治理 Owner",
      linkedMetricId: "oms_wms_usage_policy.field_usage_scope",
      recommendation: "确认 OMS/WMS 字段当前仅用于 source coverage、lineage、风险解释和 owner review，不导入业务明细行。",
      actionBoundary: "oms_wms_field_usage_metadata_governance_only_no_business_rows",
      evidenceRefs: ["source_coverage", "runtime_metadata_projection_allowlist"],
      sourceCoverageRefs: sourceRows.map((row) => row.id),
      choices: [
        {
          code: "A",
          label: "元数据治理基线",
          status: "usage_policy_metadata_only_accepted",
          reviewNote: "批准 OMS/WMS 字段只进入元数据治理与风险解释；businessRowsImported=false；runtimeImportAuthorized=false。"
        },
        {
          code: "B",
          label: "申请样本包校准",
          status: "usage_policy_readonly_sample_requested",
          reviewNote: "下一阶段申请只读样本包校准字段口径；未授权前不导入业务行。"
        },
        {
          code: "C",
          label: "暂缓字段使用",
          status: "usage_policy_deferred",
          reviewNote: "暂缓 OMS/WMS 字段使用策略，继续停留在 source coverage 草稿和 owner review。"
        }
      ]
    },
    {
      id: "OMSWMS-USE-002",
      policyId: "export_api_lineage",
      title: "Export/API lineage 前置策略",
      owner: "数据接入 Owner",
      linkedMetricId: "oms_wms_usage_policy.export_api_lineage",
      recommendation: "确认每个字段类必须保留来源页面、export surface 和 API candidate 后，才允许进入下一阶段 runtime import 设计。",
      actionBoundary: "oms_wms_lineage_required_before_runtime_import_no_export_automation",
      evidenceRefs: ["source_coverage_lineage"],
      sourceCoverageRefs: lineageRows.map((row) => row.source_coverage_id),
      choices: [
        {
          code: "A",
          label: "lineage 必须闭合",
          status: "usage_policy_lineage_gate_required",
          reviewNote: "批准 export/API lineage 作为入库前置门禁；exportDownloadAutomation=false；runtimeImportAuthorized=false。"
        },
        {
          code: "B",
          label: "高优字段先闭合",
          status: "usage_policy_priority_lineage_first",
          reviewNote: "优先闭合库存、订单、费用和任务字段 lineage，其他字段继续 owner_pending。"
        },
        {
          code: "C",
          label: "暂缓 lineage 策略",
          status: "usage_policy_lineage_deferred",
          reviewNote: "暂缓 lineage 策略，继续保持 runtime import closed。"
        }
      ]
    },
    {
      id: "OMSWMS-USE-003",
      policyId: "sensitive_field_policy",
      title: "敏感字段与业务标识策略",
      owner: "安全/数据治理 Owner",
      linkedMetricId: "oms_wms_usage_policy.sensitive_field_policy",
      recommendation: "确认序列号、订单号、操作单号、跟踪号等敏感业务标识在当前工作台中保持排除或脱敏，不展示原始明细。",
      actionBoundary: "oms_wms_sensitive_identifier_excluded_no_raw_identifier_display",
      evidenceRefs: ["runtime_metadata_projection_excluded_fields"],
      sourceCoverageRefs: sourceRows
        .filter((row) => /序列号|订单|操作单号|跟踪号|ASN|SO/.test(row.field_class))
        .map((row) => row.id),
      choices: [
        {
          code: "A",
          label: "继续排除原始标识",
          status: "usage_policy_sensitive_identifiers_excluded",
          reviewNote: "批准敏感业务标识继续排除或脱敏；sensitiveRawIdentifiersAllowed=false；productionWrites=false。"
        },
        {
          code: "B",
          label: "申请脱敏样本",
          status: "usage_policy_masked_sample_requested",
          reviewNote: "申请下一阶段脱敏样本复核；未授权前不展示原始标识。"
        },
        {
          code: "C",
          label: "另开安全审批",
          status: "usage_policy_security_gate_required",
          reviewNote: "敏感字段使用需另开安全审批 gate，当前策略不升级。"
        }
      ]
    },
    {
      id: "OMSWMS-USE-004",
      policyId: "source_system_provenance",
      title: "来源系统与证据等级策略",
      owner: "供应链数据 Owner",
      linkedMetricId: "oms_wms_usage_policy.source_system_provenance",
      recommendation: "确认 OMS/WMS 字段必须保留 source system、source surface、evidence level 和 gate status，不把只读证据提升为当前真实经营口径。",
      actionBoundary: "oms_wms_source_provenance_visible_no_current_truth_claim",
      evidenceRefs: ["source_coverage", "decision_receipt_summary"],
      sourceCoverageRefs: sourceRows.map((row) => row.id),
      choices: [
        {
          code: "A",
          label: "保留来源水位",
          status: "usage_policy_source_provenance_visible",
          reviewNote: "批准展示来源系统、页面和证据等级；sourceSystemTruthPromoted=false；仍需 owner 阶段性决策。"
        },
        {
          code: "B",
          label: "补 owner 证据水位",
          status: "usage_policy_provenance_calibration_requested",
          reviewNote: "申请下一阶段补充 owner 证据水位校准，不改变当前只读边界。"
        },
        {
          code: "C",
          label: "仅保留后台台账",
          status: "usage_policy_provenance_backend_only",
          reviewNote: "来源系统证据仅保留后台台账，不进入前台治理展示。"
        }
      ]
    }
  ];
  const reviewPackets = usagePackets.map((packet) => {
    const latestReceipt = all(
      "SELECT * FROM decision_logs WHERE linked_metric_id = ? OR id LIKE ? ORDER BY id DESC LIMIT 20",
      [packet.linkedMetricId, `decision_${packet.id.toLowerCase()}_%`]
    ).find((row) => row.id !== packet.id) || null;
    const sourceEvidence = sourceRows.filter((row) => packet.sourceCoverageRefs.includes(row.id));
    const lineageEvidence = lineageRows.filter((row) => packet.sourceCoverageRefs.includes(row.source_coverage_id));
    return {
      ...packet,
      recommendedChoice: "A",
      recommendedStatus: packet.choices[0].status,
      selectedChoice: latestReceipt ? "recorded" : "owner_pending",
      receiptId: latestReceipt?.id || null,
      recordedStatus: latestReceipt?.status || "owner_pending",
      recorded: Boolean(latestReceipt),
      sourceEvidence,
      lineageEvidence
    };
  });
  return {
    id: "OMS-WMS-USAGE-POLICY-PACK-A4",
    generatedAt: launchedAt,
    summary: {
      id: "OMS-WMS-USAGE-POLICY-PACK-A4",
      title: "OMS/WMS source-field owner usage policy",
      recommendedPath: "A-A-A-A",
      status: "usage_policy_choice_pack_ready",
      ownerChoiceStatus: "owner_pending",
      scope: "metadata_and_lineage_governance_only",
      reviewPacketCount: reviewPackets.length,
      receiptCount: reviewPackets.filter((packet) => packet.recorded).length,
      sourceCoverageRows: sourceRows.length,
      lineageRows: lineageRows.length,
      runtimeProjectionCandidateFields: runtimeSummary.runtime_projection_candidate_fields || 0,
      activeAllowlistFields: runtimeSummary.active_allowlist_fields || 0,
      excludedSensitiveIdentifierFields: runtimeSummary.excluded_sensitive_identifier_fields || 0,
      effectiveUse: [
        "source coverage governance",
        "export/API lineage review",
        "risk radar evidence explanation",
        "owner decision receipt tracking"
      ],
      closedActions: [
        "business row import",
        "runtime import authorization",
        "export/download automation",
        "OMS/WMS/ERP writeback",
        "raw sensitive identifier display"
      ],
      boundary
    },
    reviewPackets,
    boundary
  };
}

function getRuntimeBusinessRowDesignGate() {
  const sourceRows = getSourceCoverage();
  const lineageRows = sourceCoverageLineageRows();
  const runtimeSummary = runtimeMetadataProjection.summary || {};
  const allowlistFields = runtimeMetadataProjection.allowlist_fields || [];
  const excludedFields = runtimeMetadataProjection.excluded_fields || [];
  const sourceSystems = [...new Set(sourceRows.map((row) => row.source_system))].sort();
  const objectTypes = [...new Set(sourceRows.map((row) => row.target_object_type))].sort();
  const boundary = {
    productionWrites: false,
    providerCalls: false,
    erpWriteback: false,
    omsWmsWriteback: false,
    sourceSystemReads: false,
    businessRowsImported: false,
    sampleRowsExtracted: false,
    runtimeImportAuthorized: false,
    exportDownloadAutomation: false,
    rawSensitiveIdentifiersAllowed: false,
    operationalScoring: false,
    rollbackExecuted: false
  };
  const designPackets = [
    {
      id: "RUNTIME-BIZ-001",
      policyId: "grain_and_source_contract",
      title: "业务行粒度与来源契约",
      owner: "数据接入 Owner",
      linkedMetricId: "runtime_business_row_design.grain_and_source_contract",
      designQuestion: "如果未来进入业务行导入，哪些对象、粒度、增量键、刷新节奏和来源契约必须先闭合？",
      recommendation: "仅登记设计契约：以 source coverage 和 lineage 为输入，先定义对象粒度、增量键、去重键和 freshness SLA，不读取 OMS/WMS 业务行。",
      actionBoundary: "runtime_business_row_design_contract_only_no_source_read_no_row_import",
      evidenceRefs: ["source_coverage", "source_coverage_lineage", "runtime_metadata_projection"],
      scopeRefs: objectTypes,
      choices: [
        {
          code: "A",
          label: "只登记设计契约",
          status: "runtime_row_design_contract_only",
          reviewNote: "批准进入业务行导入设计契约阶段；sourceSystemReads=false；businessRowsImported=false；runtimeImportAuthorized=false。"
        },
        {
          code: "B",
          label: "先补来源样例说明",
          status: "runtime_row_design_sample_spec_requested",
          reviewNote: "先补来源样例说明和字段口径，不抽取样本行，不连接源系统。"
        },
        {
          code: "C",
          label: "暂缓业务行设计",
          status: "runtime_row_design_deferred",
          reviewNote: "暂缓业务行导入设计，继续停留在 metadata-only projection。"
        }
      ]
    },
    {
      id: "RUNTIME-BIZ-002",
      policyId: "rbac_and_data_minimization",
      title: "RBAC 与最小字段集",
      owner: "安全/数据治理 Owner",
      linkedMetricId: "runtime_business_row_design.rbac_and_data_minimization",
      designQuestion: "未来样本或业务行如果被授权，哪些角色可见哪些对象字段，哪些字段必须继续排除？",
      recommendation: "先建立角色-对象-字段矩阵草案，仅使用 62 个 metadata allowlist 和 26 个 excluded 敏感标识，不开放原始行级访问。",
      actionBoundary: "runtime_business_row_rbac_design_only_no_raw_row_access",
      evidenceRefs: ["runtime_metadata_projection_allowlist", "runtime_metadata_projection_excluded_fields"],
      scopeRefs: ["62 allowlist fields", "26 excluded sensitive identifiers"],
      choices: [
        {
          code: "A",
          label: "RBAC 草案 only",
          status: "runtime_row_rbac_design_only",
          reviewNote: "批准 RBAC 和最小字段集设计；rawSensitiveIdentifiersAllowed=false；businessRowsImported=false。"
        },
        {
          code: "B",
          label: "申请角色矩阵复核",
          status: "runtime_row_rbac_owner_matrix_requested",
          reviewNote: "申请 owner 提供角色矩阵，未复核前不进入样本行或业务行。"
        },
        {
          code: "C",
          label: "另开安全审批",
          status: "runtime_row_rbac_security_gate_required",
          reviewNote: "RBAC 需要另开安全审批 gate，当前不推进业务行设计。"
        }
      ]
    },
    {
      id: "RUNTIME-BIZ-003",
      policyId: "masked_sample_template",
      title: "脱敏样本模板",
      owner: "数据治理 Owner",
      linkedMetricId: "runtime_business_row_design.masked_sample_template",
      designQuestion: "未来如果 owner 授权样本校准，样本必须如何脱敏、抽样、留痕和过期？",
      recommendation: "只建立脱敏样本模板和字段变换规则，不抽取样本行；敏感运营标识保持 excluded 或 tokenized proposal。",
      actionBoundary: "runtime_business_row_masked_sample_template_only_no_sample_extract",
      evidenceRefs: ["excluded_sensitive_identifier_fields", "source_coverage_lineage"],
      scopeRefs: excludedFields.slice(0, 12).map((field) => field.field_id || field.target_property),
      choices: [
        {
          code: "A",
          label: "仅建脱敏模板",
          status: "runtime_row_masked_template_only",
          reviewNote: "批准脱敏样本模板设计；sampleRowsExtracted=false；rawSensitiveIdentifiersAllowed=false。"
        },
        {
          code: "B",
          label: "申请脱敏样本包",
          status: "runtime_row_masked_sample_requested",
          reviewNote: "申请下一阶段脱敏样本包；当前不抽取、不下载、不导入。"
        },
        {
          code: "C",
          label: "暂不设计样本",
          status: "runtime_row_sample_design_deferred",
          reviewNote: "暂缓样本模板，继续保留 metadata-only projection。"
        }
      ]
    },
    {
      id: "RUNTIME-BIZ-004",
      policyId: "audit_replay_controls",
      title: "审计与 replay 控制",
      owner: "治理审计 Owner",
      linkedMetricId: "runtime_business_row_design.audit_replay_controls",
      designQuestion: "未来任一导入批次如何记录来源、执行人、变更摘要、可追溯 runId 和 replay 证据？",
      recommendation: "只定义审计台账、RunTrace、批次 manifest 和 replay 字段；不创建导入批次，不执行任何数据变更。",
      actionBoundary: "runtime_business_row_audit_replay_design_only_no_import_batch",
      evidenceRefs: ["decision_logs", "agent_runs", "agent_traces"],
      scopeRefs: ["batch manifest", "run trace", "decision receipt", "source checksum"],
      choices: [
        {
          code: "A",
          label: "审计设计 only",
          status: "runtime_row_audit_design_only",
          reviewNote: "批准审计与 replay 控制设计；businessRowsImported=false；rollbackExecuted=false。"
        },
        {
          code: "B",
          label: "补审计字段清单",
          status: "runtime_row_audit_fields_requested",
          reviewNote: "先补审计字段清单和 retention 策略，不建立导入批次。"
        },
        {
          code: "C",
          label: "暂缓审计设计",
          status: "runtime_row_audit_design_deferred",
          reviewNote: "暂缓审计设计，业务行导入 gate 不推进。"
        }
      ]
    },
    {
      id: "RUNTIME-BIZ-005",
      policyId: "rollback_and_pilot_cutover",
      title: "回滚与 pilot 验收",
      owner: "平台/数据工程 Owner",
      linkedMetricId: "runtime_business_row_design.rollback_and_pilot_cutover",
      designQuestion: "未来从设计进入 pilot 时，如何证明可回滚、可停用、可比对、可灰度？",
      recommendation: "只定义 pilot 验收清单、回滚 runbook、灰度范围和停用条件；不做生产同步，不开 operational scoring。",
      actionBoundary: "runtime_business_row_rollback_pilot_design_only_no_cutover",
      evidenceRefs: ["runtime_import_authorization_packet", "risk_threshold_value_review_pack"],
      scopeRefs: ["rollback runbook", "pilot acceptance", "disable switch", "DQ comparison"],
      choices: [
        {
          code: "A",
          label: "pilot 设计 only",
          status: "runtime_row_pilot_design_only",
          reviewNote: "批准回滚与 pilot 验收设计；productionWrites=false；operationalScoring=false；runtimeImportAuthorized=false。"
        },
        {
          code: "B",
          label: "申请灰度计划",
          status: "runtime_row_pilot_plan_requested",
          reviewNote: "申请下一阶段灰度计划和验收样例，仍不执行导入。"
        },
        {
          code: "C",
          label: "暂停 pilot 设计",
          status: "runtime_row_pilot_design_deferred",
          reviewNote: "暂停 pilot 设计，等待 owner 完成 source usage 与阈值值域选择。"
        }
      ]
    }
  ];
  const reviewPackets = designPackets.map((packet) => {
    const latestReceipt = all(
      "SELECT * FROM decision_logs WHERE linked_metric_id = ? OR id LIKE ? ORDER BY id DESC LIMIT 20",
      [packet.linkedMetricId, `decision_${packet.id.toLowerCase()}_%`]
    ).find((row) => row.id !== packet.id) || null;
    return {
      ...packet,
      recommendedChoice: "A",
      recommendedStatus: packet.choices[0].status,
      selectedChoice: latestReceipt ? "recorded" : "owner_pending",
      receiptId: latestReceipt?.id || null,
      recordedStatus: latestReceipt?.status || "owner_pending",
      recorded: Boolean(latestReceipt)
    };
  });
  const ownerChoiceStatus = reviewPackets.every(
    (packet) => packet.recorded && packet.recordedStatus === packet.recommendedStatus
  )
    ? "recorded_owner_a_a_a_a_a"
    : "owner_pending";
  return {
    id: "RUNTIME-BUSINESS-ROW-DESIGN-GATE-A5",
    generatedAt: launchedAt,
    summary: {
      id: "RUNTIME-BUSINESS-ROW-DESIGN-GATE-A5",
      title: "Business-row runtime import design gate",
      recommendedPath: "A-A-A-A-A",
      status: "business_row_design_gate_ready",
      ownerChoiceStatus,
      scope: "design_gate_only_no_import",
      reviewPacketCount: reviewPackets.length,
      receiptCount: reviewPackets.filter((packet) => packet.recorded).length,
      sourceSystems,
      objectTypes,
      sourceCoverageRows: sourceRows.length,
      lineageRows: lineageRows.length,
      runtimeProjectionCandidateFields: runtimeSummary.runtime_projection_candidate_fields || 0,
      activeAllowlistFields: runtimeSummary.active_allowlist_fields || 0,
      excludedSensitiveIdentifierFields: runtimeSummary.excluded_sensitive_identifier_fields || 0,
      effectiveUse: [
        "import design review",
        "RBAC and masking planning",
        "audit and rollback planning",
        "pilot readiness gating"
      ],
      closedActions: [
        "source system read",
        "business row import",
        "sample row extraction",
        "runtime import authorization",
        "production write",
        "OMS/WMS/ERP writeback",
        "operational scoring"
      ],
      boundary
    },
    reviewPackets,
    sourceCoverage: sourceRows,
    sourceLineage: lineageRows,
    allowlistPreview: allowlistFields.slice(0, 12),
    excludedPreview: excludedFields.slice(0, 12),
    boundary
  };
}

function getSourceCoverage(url = new URL("http://local/api/source-coverage")) {
  const objectType = normalizeObjectType(url.searchParams.get("objectType") || "");
  const sourceSystem = String(url.searchParams.get("sourceSystem") || "").trim().toLowerCase();
  const evidenceLevel = String(url.searchParams.get("evidenceLevel") || "").trim();
  const scenarioId = String(url.searchParams.get("scenarioId") || "").trim();
  return sourceCoverageRows
    .filter((row) => {
      const allowedTypes = objectType ? (sourceCoverageObjectAliases[objectType] || [objectType]) : [];
      if (allowedTypes.length && !allowedTypes.includes(normalizeObjectType(row.target_object_type))) return false;
      if (sourceSystem && String(row.source_system).toLowerCase() !== sourceSystem) return false;
      if (evidenceLevel && row.evidence_level !== evidenceLevel) return false;
      if (scenarioId && !row.scenario_refs.includes(scenarioId)) return false;
      return true;
    })
    .map(hydrateSourceCoverage);
}

function ensureWorkflowSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revision_proposals (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      title TEXT NOT NULL,
      proposal TEXT NOT NULL,
      reason TEXT NOT NULL,
      proposed_by TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS export_jobs (
      id TEXT PRIMARY KEY,
      asset_type TEXT NOT NULL,
      format TEXT NOT NULL,
      filters TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ontology_object_instances (
      id TEXT PRIMARY KEY,
      object_type_id TEXT NOT NULL,
      business_key TEXT NOT NULL,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL,
      owner TEXT NOT NULL,
      properties TEXT NOT NULL,
      source_system TEXT NOT NULL,
      evidence_level TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ontology_instance_links (
      id TEXT PRIMARY KEY,
      source_instance_id TEXT NOT NULL,
      link_type TEXT NOT NULL,
      target_instance_id TEXT NOT NULL,
      evidence_level TEXT NOT NULL,
      note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_domains (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      theme TEXT NOT NULL,
      source_path TEXT NOT NULL,
      status TEXT NOT NULL,
      evidence_level TEXT NOT NULL,
      description TEXT NOT NULL,
      card_count INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      crosswalk_count INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_cards (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      source_path TEXT NOT NULL,
      source_section TEXT NOT NULL,
      summary TEXT NOT NULL,
      object_refs TEXT NOT NULL,
      metric_refs TEXT NOT NULL,
      rule_refs TEXT NOT NULL,
      evidence_level TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      domain_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      keywords TEXT NOT NULL,
      evidence_level TEXT NOT NULL,
      source_path TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_crosswalks (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      confidence REAL NOT NULL,
      note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_traces (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      question TEXT NOT NULL,
      intent TEXT NOT NULL,
      matched_objects TEXT NOT NULL,
      matched_metrics TEXT NOT NULL,
      matched_knowledge_cards TEXT NOT NULL,
      matched_lineage_edges TEXT NOT NULL,
      answerability TEXT NOT NULL,
      public_steps TEXT NOT NULL,
      recommendation_ref TEXT NOT NULL,
      policy TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trace_reviews (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      intent TEXT NOT NULL,
      answerability TEXT NOT NULL,
      review_status TEXT NOT NULL,
      reviewer TEXT NOT NULL,
      review_note TEXT NOT NULL,
      decision_boundary TEXT NOT NULL,
      action_ref TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recommendation_cards (
      id TEXT PRIMARY KEY,
      scenario TEXT NOT NULL,
      title TEXT NOT NULL,
      target_object_type TEXT NOT NULL,
      target_object_id TEXT NOT NULL,
      linked_metric_ids TEXT NOT NULL,
      linked_knowledge_card_ids TEXT NOT NULL,
      business_impact TEXT NOT NULL,
      confidence_level TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      owner TEXT NOT NULL,
      sla_due_at TEXT NOT NULL,
      action_options TEXT NOT NULL,
      approval_status TEXT NOT NULL,
      execution_status TEXT NOT NULL,
      trace_id TEXT NOT NULL,
      replay_note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      scenario TEXT NOT NULL,
      run_type TEXT NOT NULL,
      target_object_type TEXT NOT NULL,
      target_object_id TEXT NOT NULL,
      question TEXT NOT NULL,
      intent TEXT NOT NULL,
      status TEXT NOT NULL,
      owner TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      input_refs TEXT NOT NULL,
      output_refs TEXT NOT NULL,
      trace_ids TEXT NOT NULL,
      recommendation_card_ids TEXT NOT NULL,
      action_task_ids TEXT NOT NULL,
      public_steps TEXT NOT NULL,
      decision_boundary TEXT NOT NULL,
      replay_note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS aip_scenarios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scenario_type TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      owner TEXT NOT NULL,
      trigger_condition TEXT NOT NULL,
      target_object_type TEXT NOT NULL,
      target_object_id TEXT NOT NULL,
      linked_metric_ids TEXT NOT NULL,
      linked_knowledge_card_ids TEXT NOT NULL,
      linked_recommendation_card_ids TEXT NOT NULL,
      diagnostic_question TEXT NOT NULL,
      decision_boundary TEXT NOT NULL,
      evidence_level TEXT NOT NULL,
      next_action TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decision_logs (
      id TEXT PRIMARY KEY,
      insight_title TEXT NOT NULL,
      linked_metric_id TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      action_boundary TEXT NOT NULL,
      status TEXT NOT NULL,
      review_note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS action_tasks (
      id TEXT PRIMARY KEY,
      insight_ref TEXT NOT NULL,
      action_name TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL,
      approval_required INTEGER NOT NULL,
      replay_note TEXT NOT NULL
    );
  `);
}

function validateDatabaseSchema() {
  const existingTables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((row) => String(row.name))
  );
  const missingTables = requiredDatabaseTables.filter((table) => !existingTables.has(table));
  if (!missingTables.length) return;
  throw new Error(
    `SQLite schema validation failed in ${databaseMode} mode; missing required tables: ${missingTables.join(", ")}. `
    + "Run `npm run import` to build a complete database. Readonly startup never repairs schema."
  );
}

function json(res, payload, status = 200) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function text(res, body, headers = {}, status = 200) {
  res.writeHead(status, {
    "Content-Length": Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function tableCount(table) {
  return get(`SELECT COUNT(*) AS count FROM ${table}`).count;
}

function scalar(sql, params = []) {
  const row = get(sql, params);
  return row ? Number(row.count || 0) : 0;
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function recordAudit(eventType, targetType, targetId, actor, payload = {}) {
  insert("audit_events", {
    id: makeId("audit"),
    event_type: eventType,
    target_type: targetType,
    target_id: targetId,
    actor: actor || "local_user",
    payload: JSON.stringify(payload),
    created_at: nowIso()
  });
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim() !== "").map(String))];
}

function jsonArray(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === null || value === undefined || value === "") return "[]";
  return JSON.stringify([value]);
}

function inferIntent(question) {
  const textValue = String(question || "").toLowerCase();
  if (textValue.includes("负") || textValue.includes("negative")) return "inventory_exception_diagnosis";
  if (textValue.includes("断货") || textValue.includes("缺货") || textValue.includes("stockout")) return "stockout_risk_diagnosis";
  if (textValue.includes("库龄") || textValue.includes("超储") || textValue.includes("aged")) return "aged_inventory_diagnosis";
  if (textValue.includes("物流") || textValue.includes("shipment") || textValue.includes("eta")) return "logistics_risk_diagnosis";
  if (textValue.includes("成本") || textValue.includes("费用") || textValue.includes("cost")) return "cost_exception_diagnosis";
  return "supply_chain_governance_question";
}

function hydrateAgentTrace(row) {
  if (!row) return null;
  return {
    ...row,
    matchedObjects: parseJsonArray(row.matched_objects),
    matchedMetrics: parseJsonArray(row.matched_metrics),
    matchedKnowledgeCards: parseJsonArray(row.matched_knowledge_cards),
    matchedLineageEdges: parseJsonArray(row.matched_lineage_edges),
    publicSteps: parseJsonArray(row.public_steps)
  };
}

function createAgentTrace(input) {
  const trace = {
    id: makeId("trace"),
    source_type: requireText(input.sourceType || input.source_type || "manual"),
    source_id: String(input.sourceId || input.source_id || "manual"),
    question: requireText(input.question || "供应链治理问题"),
    intent: String(input.intent || inferIntent(input.question)),
    matched_objects: jsonArray(uniqueValues(input.matchedObjects || input.matched_objects || [])),
    matched_metrics: jsonArray(uniqueValues(input.matchedMetrics || input.matched_metrics || [])),
    matched_knowledge_cards: jsonArray(uniqueValues(input.matchedKnowledgeCards || input.matched_knowledge_cards || [])),
    matched_lineage_edges: jsonArray(uniqueValues(input.matchedLineageEdges || input.matched_lineage_edges || [])),
    answerability: String(input.answerability || "unknown"),
    public_steps: jsonArray(input.publicSteps || input.public_steps || []),
    recommendation_ref: String(input.recommendationRef || input.recommendation_ref || ""),
    policy: String(input.policy || "local_trace_only_no_provider_call"),
    created_by: String(input.createdBy || input.created_by || "供应链数据治理 Owner"),
    created_at: nowIso()
  };
  insert("agent_traces", trace);
  recordAudit("agent_trace_created", "agent_trace", trace.id, trace.created_by, {
    sourceType: trace.source_type,
    answerability: trace.answerability,
    policy: trace.policy
  });
  return hydrateAgentTrace(trace);
}

function getAgentTraces(url) {
  const clauses = [];
  const params = [];
  const sourceType = url.searchParams.get("sourceType");
  const sourceId = url.searchParams.get("sourceId");
  if (sourceType) {
    clauses.push("source_type = ?");
    params.push(sourceType);
  }
  if (sourceId) {
    clauses.push("source_id = ?");
    params.push(sourceId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all(`SELECT * FROM agent_traces ${where} ORDER BY created_at DESC LIMIT 200`, params).map(hydrateAgentTrace);
}

function hydrateTraceReview(row) {
  if (!row) return null;
  return row;
}

function getTraceReviews(url) {
  const clauses = [];
  const params = [];
  const traceId = url.searchParams.get("traceId");
  const status = url.searchParams.get("status");
  if (traceId) {
    clauses.push("trace_id = ?");
    params.push(traceId);
  }
  if (status) {
    clauses.push("review_status = ?");
    params.push(status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all(`SELECT * FROM trace_reviews ${where} ORDER BY updated_at DESC, created_at DESC LIMIT 300`, params).map(hydrateTraceReview);
}

function latestTraceReviewByTraceId(traceId) {
  return hydrateTraceReview(get("SELECT * FROM trace_reviews WHERE trace_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1", [traceId]));
}

function reviewAgentTrace(traceId, body) {
  const trace = hydrateAgentTrace(get("SELECT * FROM agent_traces WHERE id = ?", [traceId]));
  if (!trace) return null;
  const reviewStatus = String(body.reviewStatus || body.review_status || body.status || "reviewed");
  const allowed = new Set(["review_pending", "reviewed", "approved_for_governance_view", "rejected", "needs_follow_up"]);
  if (!allowed.has(reviewStatus)) throw new Error("Unsupported trace review status.");
  const now = nowIso();
  const review = {
    id: String(body.id || makeId("trace_review")),
    trace_id: trace.id,
    source_type: trace.source_type,
    intent: trace.intent,
    answerability: trace.answerability,
    review_status: reviewStatus,
    reviewer: String(body.reviewer || body.actor || "供应链数据治理 Owner"),
    review_note: String(body.reviewNote || body.review_note || body.note || "Trace reviewed in local governance workbench."),
    decision_boundary: String(body.decisionBoundary || body.decision_boundary || "trace_review_local_governance_only_no_provider_no_erp_writeback"),
    action_ref: String(body.actionRef || body.action_ref || ""),
    created_at: now,
    updated_at: now
  };
  insert("trace_reviews", review);
  recordAudit("agent_trace_reviewed", "agent_trace", trace.id, review.reviewer, {
    reviewId: review.id,
    reviewStatus,
    decisionBoundary: review.decision_boundary
  });
  return {
    trace,
    review: hydrateTraceReview(review),
    reviewSummary: {
      traceId: trace.id,
      reviewStatus,
      policy: "local_trace_review_only_no_provider_call_no_erp_writeback",
      latestReviewCount: scalar("SELECT COUNT(*) AS count FROM trace_reviews WHERE trace_id = ?", [trace.id])
    }
  };
}

function hydrateAgentRun(row) {
  if (!row) return null;
  return {
    ...row,
    inputRefs: parseJsonArray(row.input_refs),
    outputRefs: parseJsonArray(row.output_refs),
    traceIds: parseJsonArray(row.trace_ids),
    recommendationCardIds: parseJsonArray(row.recommendation_card_ids),
    actionTaskIds: parseJsonArray(row.action_task_ids),
    publicSteps: parseJsonArray(row.public_steps)
  };
}

function hydrateObjectInstance(row) {
  if (!row) return null;
  return {
    ...row,
    propertiesJson: parseJsonObject(row.properties)
  };
}

function hydrateInstanceLink(row) {
  if (!row) return null;
  return row;
}

function hydrateScenario(row) {
  if (!row) return null;
  return {
    ...row,
    linkedMetricIds: parseJsonArray(row.linked_metric_ids),
    linkedKnowledgeCardIds: parseJsonArray(row.linked_knowledge_card_ids),
    linkedRecommendationCardIds: parseJsonArray(row.linked_recommendation_card_ids)
  };
}

function createAgentRun(input) {
  const status = String(input.status || "completed");
  const startedAt = String(input.startedAt || input.started_at || nowIso());
  const completedAt = String(input.completedAt || input.completed_at || (status === "completed" ? nowIso() : ""));
  const question = requireText(input.question || input.title || "供应链治理运行");
  const run = {
    id: String(input.id || makeId("run")),
    scenario: requireText(input.scenario || inferIntent(question)),
    run_type: requireText(input.runType || input.run_type || "local_agent_run"),
    target_object_type: requireText(input.targetObjectType || input.target_object_type || "governance"),
    target_object_id: requireText(input.targetObjectId || input.target_object_id || "governance"),
    question,
    intent: String(input.intent || inferIntent(question)),
    status,
    owner: String(input.owner || "供应链数据治理 Owner"),
    started_at: startedAt,
    completed_at: completedAt,
    input_refs: jsonArray(input.inputRefs || input.input_refs || []),
    output_refs: jsonArray(input.outputRefs || input.output_refs || []),
    trace_ids: jsonArray(input.traceIds || input.trace_ids || []),
    recommendation_card_ids: jsonArray(input.recommendationCardIds || input.recommendation_card_ids || []),
    action_task_ids: jsonArray(input.actionTaskIds || input.action_task_ids || []),
    public_steps: jsonArray(input.publicSteps || input.public_steps || []),
    decision_boundary: String(input.decisionBoundary || input.decision_boundary || "local_governance_only_no_erp_writeback"),
    replay_note: String(input.replayNote || input.replay_note || "Local RunTrace only; no provider call, no production write.")
  };
  insert("agent_runs", run);
  recordAudit("agent_run_created", "agent_run", run.id, run.owner, {
    scenario: run.scenario,
    runType: run.run_type,
    status: run.status
  });
  return hydrateAgentRun(run);
}

function getAgentRuns(url) {
  const clauses = [];
  const params = [];
  const status = url.searchParams.get("status");
  const runType = url.searchParams.get("runType");
  const scenario = url.searchParams.get("scenario");
  const targetObjectId = url.searchParams.get("targetObjectId");
  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (runType) {
    clauses.push("run_type = ?");
    params.push(runType);
  }
  if (scenario) {
    clauses.push("scenario = ?");
    params.push(scenario);
  }
  if (targetObjectId) {
    clauses.push("(target_object_id = ? OR target_object_type = ? OR input_refs LIKE ? OR output_refs LIKE ?)");
    params.push(targetObjectId, targetObjectId, `%${targetObjectId}%`, `%${targetObjectId}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all(`SELECT * FROM agent_runs ${where} ORDER BY started_at DESC LIMIT 200`, params).map(hydrateAgentRun);
}

function getObjectInstances(url) {
  const clauses = [];
  const params = [];
  const objectType = url.searchParams.get("objectType");
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  if (objectType) {
    clauses.push("object_type_id = ?");
    params.push(objectType);
  }
  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (q) {
    clauses.push("(display_name LIKE ? OR business_key LIKE ? OR owner LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all(`SELECT * FROM ontology_object_instances ${where} ORDER BY object_type_id, status, id LIMIT 300`, params)
    .map(hydrateObjectInstance);
}

function getObjectInstance(id) {
  const instance = hydrateObjectInstance(get("SELECT * FROM ontology_object_instances WHERE id = ?", [id]));
  if (!instance) return null;
  const outboundLinks = all(
    `SELECT l.*, t.display_name AS target_display_name, t.object_type_id AS target_object_type
     FROM ontology_instance_links l
     LEFT JOIN ontology_object_instances t ON t.id = l.target_instance_id
     WHERE l.source_instance_id = ?
     ORDER BY l.link_type, l.id`,
    [id]
  ).map(hydrateInstanceLink);
  const inboundLinks = all(
    `SELECT l.*, s.display_name AS source_display_name, s.object_type_id AS source_object_type
     FROM ontology_instance_links l
     LEFT JOIN ontology_object_instances s ON s.id = l.source_instance_id
     WHERE l.target_instance_id = ?
     ORDER BY l.link_type, l.id`,
    [id]
  ).map(hydrateInstanceLink);
  const scenarios = all(
    "SELECT * FROM aip_scenarios WHERE target_object_id = ? OR target_object_type = ? ORDER BY priority, id",
    [id, instance.object_type_id]
  ).map(hydrateScenario);
  const recommendations = all(
    "SELECT * FROM recommendation_cards WHERE target_object_id = ? OR target_object_type = ? ORDER BY risk_level, approval_status, id",
    [id, instance.object_type_id]
  ).map(hydrateRecommendationCard);
  const runs = getAgentRuns(new URL(`http://local/api/agent-runs?targetObjectId=${encodeURIComponent(id)}`));
  const sourceCoverage = getSourceCoverage(new URL(`http://local/api/source-coverage?objectType=${encodeURIComponent(instance.object_type_id)}`));
  return {
    instance,
    outboundLinks,
    inboundLinks,
    scenarios,
    recommendations,
    agentRuns: runs,
    sourceCoverage,
    summary: {
      relationCount: outboundLinks.length + inboundLinks.length,
      scenarioCount: scenarios.length,
      recommendationCount: recommendations.length,
      agentRunCount: runs.length,
      sourceCoverageCount: sourceCoverage.length
    }
  };
}

function getAipScenarios(url) {
  const clauses = [];
  const params = [];
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const q = url.searchParams.get("q");
  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (priority) {
    clauses.push("priority = ?");
    params.push(priority);
  }
  if (q) {
    clauses.push("(name LIKE ? OR trigger_condition LIKE ? OR diagnostic_question LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all(`SELECT * FROM aip_scenarios ${where} ORDER BY priority, status, id LIMIT 100`, params).map(hydrateScenario);
}

function getAipScenario(id) {
  const scenario = hydrateScenario(get("SELECT * FROM aip_scenarios WHERE id = ?", [id]));
  if (!scenario) return null;
  return {
    ...scenario,
    targetInstance: hydrateObjectInstance(get("SELECT * FROM ontology_object_instances WHERE id = ?", [scenario.target_object_id])),
    recommendationCards: scenario.linkedRecommendationCardIds
      .map((cardId) => hydrateRecommendationCard(get("SELECT * FROM recommendation_cards WHERE id = ?", [cardId])))
      .filter(Boolean),
    agentRuns: getAgentRuns(new URL(`http://local/api/agent-runs?scenario=${encodeURIComponent(scenario.name)}`))
  };
}

function runScenarioDiagnostic(scenarioId, body = {}) {
  const scenario = getAipScenario(scenarioId);
  if (!scenario) return null;
  const question = String(body.question || scenario.diagnostic_question);
  const trace = createAgentTrace({
    sourceType: "aip_scenario_diagnostic",
    sourceId: scenario.id,
    question,
    intent: inferIntent(question),
    matchedObjects: [scenario.target_object_type, scenario.target_object_id],
    matchedMetrics: scenario.linkedMetricIds,
    matchedKnowledgeCards: scenario.linkedKnowledgeCardIds,
    matchedLineageEdges: lineageRefsForMetrics(scenario.linkedMetricIds),
    answerability: "scenario_review_ready",
    publicSteps: [
      { step: "bind_scenario", status: "completed", summary: `锁定场景：${scenario.name}` },
      { step: "bind_object_instance", status: "completed", summary: `绑定对象实例：${scenario.target_object_id}` },
      { step: "match_metrics", status: "completed", summary: `关联 ${scenario.linkedMetricIds.length} 个指标` },
      { step: "evidence_boundary", status: "review_ready", summary: scenario.decision_boundary }
    ],
    recommendationRef: scenario.linkedRecommendationCardIds[0] || "",
    policy: "local_scenario_diagnostic_no_provider_no_writeback",
    createdBy: body.createdBy || "供应链数据治理 Owner"
  });
  const runRecord = createAgentRun({
    scenario: scenario.name,
    runType: "aip_scenario_diagnostic",
    targetObjectType: scenario.target_object_type,
    targetObjectId: scenario.target_object_id,
    question,
    intent: trace.intent,
    status: "review_ready",
    owner: scenario.owner,
    inputRefs: [
      `scenario:${scenario.id}`,
      `object:${scenario.target_object_id}`,
      ...scenario.linkedMetricIds.map((id) => `metric:${id}`),
      ...scenario.linkedKnowledgeCardIds.map((id) => `knowledge:${id}`)
    ],
    outputRefs: [
      ...scenario.linkedRecommendationCardIds.map((id) => `recommendation:${id}`),
      `trace:${trace.id}`
    ],
    traceIds: [trace.id],
    recommendationCardIds: scenario.linkedRecommendationCardIds,
    publicSteps: trace.publicSteps,
    decisionBoundary: scenario.decision_boundary,
    replayNote: `Scenario diagnostic for ${scenario.name}; local ledger only.`
  });
  return {
    scenario: getAipScenario(scenario.id),
    trace,
    run: runRecord,
    nextAction: scenario.next_action,
    boundary: scenario.decision_boundary
  };
}

function lineageRefsForMetrics(metricRefs) {
  const refs = uniqueValues(metricRefs).slice(0, 20);
  if (!refs.length) return [];
  const placeholders = refs.map(() => "?").join(",");
  return all(
    `SELECT id FROM lineage_edges WHERE target_ref IN (${placeholders}) OR source_ref IN (${placeholders}) LIMIT 30`,
    [...refs, ...refs]
  ).map((row) => row.id);
}

function moduleHealth() {
  const totalMetrics = tableCount("metrics");
  const certifiedMetrics = get("SELECT COUNT(*) AS count FROM metrics WHERE certification_status = 'certified'").count;
  const p0Total = get("SELECT COUNT(*) AS count FROM governance_tasks WHERE priority = 'P0'").count;
  const p0Done = get("SELECT COUNT(*) AS count FROM governance_tasks WHERE priority = 'P0' AND status IN ('已签字', 'certified', 'done')").count;
  return [
    { module: "对象本体", score: 76, status: "mapped", note: "对象类型全覆盖，关键实例待补。" },
    { module: "标签工程", score: 48, status: "draft", note: "标签规则已种子化，阈值未冻结。" },
    { module: "维度工程", score: 68, status: "mapped", note: "一致性维度已建立，层级值待接入。" },
    { module: "指标工程", score: Math.round((certifiedMetrics / totalMetrics) * 100), status: "mapped", note: "MECE V2 已导入，认证样本先行。" },
    { module: "指标字典", score: 82, status: "active", note: "139 个 L3 可检索。" },
    { module: "指标体系", score: 86, status: "active", note: "L0-L3 树已导入。" },
    { module: "供应链履约看板", score: 72, status: "local_knowledge_prototype", note: "静态知识原型已接入侧边导航，生产数据写入关闭。" },
    { module: "血缘质量", score: 52, status: "reviewed", note: "公式血缘已种子化，物理字段待确认。" },
    { module: "ChatBI 语义", score: certifiedMetrics, status: "draft", note: "仅认证指标可回答。" },
    { module: "决策闭环", score: 40, status: "draft", note: "建议+审批+复盘边界已建立。" },
    { module: "Owner 签字", score: p0Total ? Math.round((p0Done / p0Total) * 100) : 0, status: "review_pending", note: `${p0Done}/${p0Total} P0 tasks signed.` }
  ];
}

function getWorkbenchModules() {
  const totalMetrics = tableCount("metrics");
  const l3Metrics = scalar("SELECT COUNT(*) AS count FROM metrics WHERE level = 'L3'");
  const certifiedMetrics = scalar("SELECT COUNT(*) AS count FROM metrics WHERE certification_status = 'certified'");
  const p0Total = scalar("SELECT COUNT(*) AS count FROM governance_tasks WHERE priority = 'P0'");
  const p0Done = scalar("SELECT COUNT(*) AS count FROM governance_tasks WHERE priority = 'P0' AND status IN ('已签字', 'certified', 'done')");
  const lineageMapped = scalar("SELECT COUNT(*) AS count FROM lineage_edges WHERE status IN ('mapped', 'certified')");
  const lineageTotal = tableCount("lineage_edges");
  return [
    {
      id: "overview",
      code: "00",
      title: "治理链路总览",
      focus: "九层架构健康度、治理状态、发布边界与可运营性总控。",
      stage: "Operate",
      status: "active",
      score: 78,
      primaryMetric: "9 layers",
      secondaryMetric: `${tableCount("governance_tasks")} tasks`,
      apiPath: "/api/governance/overview"
    },
    {
      id: "strategy-panorama",
      code: "S1",
      title: "战略供应链全景工作台",
      focus: "承接终点、愿景、北极星指标、能力地图、目标运营模型和路线图。",
      stage: "Plan",
      status: "draft_design_ready",
      score: 58,
      primaryMetric: "5 sections",
      secondaryMetric: "data pending",
      apiPath: "/api/workbench/strategy-panorama"
    },
    {
      id: "current-risk-radar",
      code: "R1",
      title: "业务现状与风险雷达",
      focus: "汇总对象事实、风险信号、防线归因、根因和行动队列。",
      stage: "Sense",
      status: "draft_design_ready_data_pending",
      score: 52,
      primaryMetric: `${tableCount("aip_scenarios")} risks`,
      secondaryMetric: `${tableCount("ontology_object_instances")} objects`,
      apiPath: "/api/workbench/current-risk-radar"
    },
    {
      id: "role-workbenches",
      code: "R2",
      title: "角色作战工作台",
      focus: "按管理层、计划、采购、仓库库存、物流和财务成本拆分输入、处理、输出、审批、复盘。",
      stage: "Operate",
      status: "implemented_local_role_routes",
      score: 56,
      primaryMetric: "6 roles",
      secondaryMetric: "review gated",
      apiPath: "/api/workbench/role-workbenches"
    },
    {
      id: "fulfillment-dashboard",
      code: "F1",
      title: "供应链履约看板",
      focus: "履约指标体系、订单时效、未发货预警、缺货三分法和页面级洞察故事线的静态知识原型。",
      stage: "Operate",
      status: "local_knowledge_prototype",
      score: 72,
      primaryMetric: "12 tabs",
      secondaryMetric: "static prototype",
      apiPath: "/api/workbench/fulfillment-dashboard"
    },
    {
      id: "ontology",
      code: "01",
      title: "对象本体工作台",
      focus: "维护 Object、Property、Link、State、Event，承载对象图谱。",
      stage: "Model",
      status: "mapped",
      score: 76,
      primaryMetric: `${tableCount("ontology_objects")} objects`,
      secondaryMetric: `${tableCount("ontology_object_instances")} instances`,
      apiPath: "/api/workbench/ontology"
    },
    {
      id: "tags",
      code: "02",
      title: "标签工程工作台",
      focus: "治理规则标签、统计标签、模型标签及生命周期。",
      stage: "Model",
      status: "draft",
      score: 48,
      primaryMetric: `${tableCount("tags")} tags`,
      secondaryMetric: "rule first",
      apiPath: "/api/workbench/tags"
    },
    {
      id: "dimensions",
      code: "03",
      title: "维度工程工作台",
      focus: "治理一致性维度、分析维度、层级与指标适配关系。",
      stage: "Model",
      status: "mapped",
      score: 68,
      primaryMetric: `${tableCount("dimensions")} dims`,
      secondaryMetric: "drill ready",
      apiPath: "/api/workbench/dimensions"
    },
    {
      id: "metric-engineering",
      code: "04",
      title: "指标工程工作台",
      focus: "维护原子、派生、复合指标的公式、粒度、字段映射和质量规则。",
      stage: "Build",
      status: "mapped",
      score: Math.max(8, Math.round((certifiedMetrics / totalMetrics) * 100)),
      primaryMetric: `${totalMetrics} metrics`,
      secondaryMetric: `${certifiedMetrics} certified`,
      apiPath: "/api/workbench/metric-engineering"
    },
    {
      id: "metric-dictionary",
      code: "05",
      title: "指标字典工作台",
      focus: "管理口径、owner、版本、同义词、常见问法和认证状态。",
      stage: "Certify",
      status: "active",
      score: 82,
      primaryMetric: `${l3Metrics} L3`,
      secondaryMetric: "searchable",
      apiPath: "/api/workbench/metric-dictionary"
    },
    {
      id: "kpi-system",
      code: "06",
      title: "指标体系编排台",
      focus: "维护 MECE V2 L0-L3、KPI、权重、归因关系和钻取路径。",
      stage: "Certify",
      status: "active",
      score: 86,
      primaryMetric: "L0-L3",
      secondaryMetric: "MECE V2",
      apiPath: "/api/workbench/kpi-system"
    },
    {
      id: "lineage-quality",
      code: "07",
      title: "血缘与质量工作台",
      focus: "展示字段血缘、指标血缘、影响分析、DQ 规则和质量评分。",
      stage: "Control",
      status: "reviewed",
      score: lineageTotal ? Math.round((lineageMapped / lineageTotal) * 100) : 0,
      primaryMetric: `${lineageTotal} edges`,
      secondaryMetric: `${lineageMapped} mapped`,
      apiPath: "/api/workbench/lineage-quality"
    },
    {
      id: "ai-knowledge",
      code: "08",
      title: "AI 知识库工作台",
      focus: "按主题域治理三大供应链知识库，支持本地检索、证据返回和不可证明边界。",
      stage: "Serve",
      status: "draft",
      score: 62,
      primaryMetric: `${tableCount("knowledge_cards")} cards`,
      secondaryMetric: `${tableCount("knowledge_chunks")} chunks`,
      apiPath: "/api/workbench/ai-knowledge"
    },
    {
      id: "chatbi",
      code: "09",
      title: "ChatBI 语义治理台",
      focus: "管理 NL2Metric/NL2Object、证据链、拒答机制和可回答性评分。",
      stage: "Serve",
      status: "draft",
      score: 55,
      primaryMetric: `${tableCount("chatbi_contexts")} contexts`,
      secondaryMetric: "certified only",
      apiPath: "/api/workbench/chatbi"
    },
    {
      id: "decision-loop",
      code: "10",
      title: "决策闭环工作台",
      focus: "管理洞察、建议、审批、任务、执行反馈和复盘记录。",
      stage: "Act",
      status: "draft",
      score: 40,
      primaryMetric: `${tableCount("recommendation_cards")} rec cards`,
      secondaryMetric: `${tableCount("aip_scenarios")} scenarios`,
      apiPath: "/api/workbench/decision-loop"
    }
  ];
}

function getWorkbenchModule(id) {
  const meta = getWorkbenchModules().find((module) => module.id === id);
  if (!meta) return null;
  const payloads = {
    overview: () => ({ overview: getOverview() }),
    "strategy-panorama": () => ({
      metrics: getMetrics(new URL("http://local/api/metrics")),
      domains: all("SELECT * FROM knowledge_domains ORDER BY status, id"),
      scenarios: getAipScenarios(new URL("http://local/api/aip-scenarios")),
      recommendations: getRecommendationCards(new URL("http://local/api/recommendation-cards"))
    }),
	    "current-risk-radar": () => ({
	      overview: getOverview(),
	      instances: getObjectInstances(new URL("http://local/api/ontology/instances")),
	      scenarios: getAipScenarios(new URL("http://local/api/aip-scenarios")),
	      recommendations: getRecommendationCards(new URL("http://local/api/recommendation-cards")),
	      runs: getAgentRuns(new URL("http://local/api/agent-runs")),
	      traces: getAgentTraces(new URL("http://local/api/agent-traces")),
	      traceReviews: getTraceReviews(new URL("http://local/api/trace-reviews")),
	      sourceCoverage: getSourceCoverage(),
	      riskThresholdGovernance: getRiskThresholdGovernance()
	    }),
    "role-workbenches": () => getRoleWorkbenchPayload(),
    "fulfillment-dashboard": () => ({
      prototypePath: "/fulfillment-dashboard/index.html",
      boundary: {
        staticKnowledgePrototype: true,
        productionDbWrite: false,
        erpWriteback: false,
        providerCall: false
      },
      artifacts: [
        "/fulfillment-dashboard/data/fulfillment_metric_dictionary_20260625.csv",
        "/fulfillment-dashboard/data/fulfillment_chart_data_binding_20260626.csv",
        "/fulfillment-dashboard/data/fulfillment_source_table_contract_20260626.csv",
        "/fulfillment-dashboard/docs/fulfillment-dashboard-readonly-data-contract-draft-20260626.md"
      ]
    }),
    ontology: () => ({
      objects: all("SELECT * FROM ontology_objects ORDER BY object_type, id"),
      links: all("SELECT * FROM ontology_links ORDER BY id"),
      instances: getObjectInstances(new URL("http://local/api/ontology/instances")),
      instanceLinks: all("SELECT * FROM ontology_instance_links ORDER BY id")
    }),
    tags: () => ({ tags: all("SELECT * FROM tags ORDER BY lifecycle_status, id") }),
    dimensions: () => ({ dimensions: all("SELECT * FROM dimensions ORDER BY dimension_type, id") }),
    "metric-engineering": () => ({ metrics: all("SELECT * FROM metrics ORDER BY CASE level WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 ELSE 3 END, id LIMIT 500") }),
    "metric-dictionary": () => ({ metrics: all("SELECT * FROM metrics WHERE level = 'L3' ORDER BY l1_domain, l2_group, id LIMIT 500") }),
    "kpi-system": () => ({ tree: getKpiTree() }),
    "lineage-quality": () => ({
      lineage: all("SELECT * FROM lineage_edges ORDER BY status, edge_type LIMIT 1000"),
      tasks: all("SELECT * FROM governance_tasks ORDER BY priority, status, id LIMIT 500")
    }),
    "ai-knowledge": () => ({
      domains: all("SELECT * FROM knowledge_domains ORDER BY status, id"),
      cards: all("SELECT * FROM knowledge_cards ORDER BY status, domain_id, id LIMIT 500")
    }),
    chatbi: () => ({ contexts: getChatbiContext() }),
    "decision-loop": () => ({
      decisions: all("SELECT * FROM decision_logs ORDER BY status, id"),
      actions: all("SELECT * FROM action_tasks ORDER BY status, id"),
      runs: all("SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 200"),
      traceReviews: getTraceReviews(new URL("http://local/api/trace-reviews")),
      scenarios: getAipScenarios(new URL("http://local/api/aip-scenarios"))
    })
  };
	  return { ...meta, payload: payloads[id]() };
	}

function getRiskThresholdGovernance() {
  const thresholdVersions = [
    {
      id: "THR-INV-NEG-AVAILABLE-V0.1",
      code: "NEG_AVAILABLE_GUARDRAIL",
      name: "负可用库存治理阈值",
      version: "v0.1-draft",
      owner: "库存运营 Owner",
      riskDomain: "inventory",
      severityBand: "P0 candidate",
      status: "draft_only_governance_view",
      activationState: "operational_scoring_disabled",
      gateId: "RUNTIME-IMPORT-003",
      ruleDraft: "business_available_qty < 0 或 sellable_qty < 0 时进入 P0 候选风险池",
      scenarioRefs: ["scenario_fba_negative_available"],
      linkedMetricIds: ["metric.business_available_inventory", "metric.fba_available_inventory"],
      evidenceRefs: ["SCOV-OMS-INVENTORY-STATS", "SCOV-OMS-REGIONAL-INVENTORY", "SCOV-WMS-INVENTORY-SNAPSHOT"],
      ownerQuestion: "是否允许负可用库存阈值进入治理视图，并保持 operational scoring 关闭？",
      reviewBoundary: "threshold_governance_local_review_only_no_operational_scoring"
    },
    {
      id: "THR-STOCKOUT-COVERAGE-V0.1",
      code: "STOCKOUT_COVERAGE_GUARDRAIL",
      name: "断货覆盖天数治理阈值",
      version: "v0.1-draft",
      owner: "计划 Owner",
      riskDomain: "planning",
      severityBand: "P0/P1 candidate",
      status: "draft_only_governance_view",
      activationState: "operational_scoring_disabled",
      gateId: "RUNTIME-IMPORT-003",
      ruleDraft: "coverage_days < 14 或 sku_oos_rate 上升时进入断货风险复核",
      scenarioRefs: ["scenario_stockout_risk"],
      linkedMetricIds: ["metric.coverage_days", "metric.sku_oos_rate"],
      evidenceRefs: ["SCOV-OMS-INVENTORY-STATS", "SCOV-OMS-REGIONAL-INVENTORY", "SCOV-WMS-INVENTORY-BALANCE"],
      ownerQuestion: "是否允许覆盖天数阈值作为 S&OE 风险复核候选？",
      reviewBoundary: "threshold_governance_local_review_only_no_operational_scoring"
    },
    {
      id: "THR-AGING-OVERSTOCK-V0.1",
      code: "AGING_OVERSTOCK_GUARDRAIL",
      name: "库龄超储治理阈值",
      version: "v0.1-draft",
      owner: "库存运营 Owner",
      riskDomain: "inventory_cash",
      severityBand: "P1 candidate",
      status: "draft_only_governance_view",
      activationState: "operational_scoring_disabled",
      gateId: "RUNTIME-IMPORT-003",
      ruleDraft: "batch_age_days > 90 或 coverage_days > 60 时进入库龄/超储复核",
      scenarioRefs: ["scenario_aged_inventory_overstock"],
      linkedMetricIds: ["metric.batch_age_days", "metric.inventory_turnover_days", "metric.storage_fee_rate"],
      evidenceRefs: ["SCOV-OMS-INVENTORY-STATS", "SCOV-OMS-SALES-STATS", "SCOV-OMS-COST"],
      ownerQuestion: "是否允许库龄阈值进入治理视图，并等待财务/库存 owner 二次确认？",
      reviewBoundary: "threshold_governance_local_review_only_no_operational_scoring"
    },
    {
      id: "THR-FULFILLMENT-SLA-V0.1",
      code: "FULFILLMENT_SLA_GUARDRAIL",
      name: "履约延迟治理阈值",
      version: "v0.1-draft",
      owner: "物流履约 Owner",
      riskDomain: "execution",
      severityBand: "P1 candidate",
      status: "draft_only_governance_view",
      activationState: "operational_scoring_disabled",
      gateId: "RUNTIME-IMPORT-003",
      ruleDraft: "release_close_time 超出 SLA 或 task_status 长时间停留时进入履约延迟复核",
      scenarioRefs: ["scenario_stockout_risk"],
      linkedMetricIds: ["metric.fulfillment_sla", "metric.warehouse_task_delay"],
      evidenceRefs: ["SCOV-WMS-PICKING-TASK", "SCOV-WMS-PUTAWAY-TASK"],
      ownerQuestion: "是否允许 WMS 任务 SLA 阈值进入本地治理视图？",
      reviewBoundary: "threshold_governance_local_review_only_no_operational_scoring"
    },
    {
      id: "THR-COST-ANOMALY-V0.1",
      code: "COST_ANOMALY_GUARDRAIL",
      name: "履约成本异常治理阈值",
      version: "v0.1-draft",
      owner: "财务成本 Owner",
      riskDomain: "cost",
      severityBand: "P1 candidate",
      status: "draft_only_governance_view",
      activationState: "operational_scoring_disabled",
      gateId: "RUNTIME-IMPORT-003",
      ruleDraft: "storage_fee_rate 或 logistics_estimate_actual_variance_rate 超出 owner 确认区间时进入成本复核",
      scenarioRefs: ["scenario_aged_inventory_overstock"],
      linkedMetricIds: ["metric.storage_fee_rate", "metric.fulfillment_cost_variance"],
      evidenceRefs: ["SCOV-OMS-COST"],
      ownerQuestion: "是否允许成本异常阈值进入本地治理视图，并等待财务 owner 确认金额口径？",
      reviewBoundary: "threshold_governance_local_review_only_no_operational_scoring"
    }
  ];
  const coverageById = new Map(getSourceCoverage().map((row) => [row.id, row]));
  const scenarios = getAipScenarios(new URL("http://local/api/aip-scenarios"));
  const scenarioBindings = scenarios.map((scenario) => {
    const thresholds = thresholdVersions.filter((threshold) => threshold.scenarioRefs.includes(scenario.id));
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      priority: scenario.priority,
      targetObjectType: scenario.target_object_type,
      targetObjectId: scenario.target_object_id,
      boundThresholdIds: thresholds.map((threshold) => threshold.id),
      boundThresholdNames: thresholds.map((threshold) => threshold.name),
      operationalScoring: "disabled_until_owner_approval",
      ownerGate: "owner_pending"
    };
  });
  const ownerDecisionPackets = [
    {
      id: "THR-OWNER-001",
      title: "阈值值域进入治理视图",
      linkedMetricId: "risk_threshold_owner.threshold_policy_scope",
      recommendation: "确认 5 个 draft 阈值是否仅进入治理视图，不参与自动评分。",
      actionBoundary: "threshold_owner_choice_local_ledger_only_no_operational_scoring",
      owner: "供应链风险 Owner",
      choices: [
        {
          code: "A",
          label: "仅治理视图",
          status: "threshold_policy_draft_only",
          reviewNote: "允许阈值进入风险雷达治理视图和 owner review；不进入 operational scoring，不触发自动任务。"
        },
        {
          code: "B",
          label: "样本值域评审",
          status: "threshold_sample_value_review_requested",
          reviewNote: "下一阶段先做样本值域评审，仍不启用自动评分。"
        },
        {
          code: "C",
          label: "暂缓阈值",
          status: "threshold_policy_deferred",
          reviewNote: "暂缓阈值进入治理视图，等待 owner 提供正式阈值值域。"
        }
      ]
    },
    {
      id: "THR-OWNER-002",
      title: "Operational scoring 启用策略",
      linkedMetricId: "risk_threshold_owner.operational_scoring_policy",
      recommendation: "确认风险阈值是否可触发 operational scoring 或自动动作。",
      actionBoundary: "threshold_operational_scoring_decision_only_no_external_write",
      owner: "供应链风险 Owner",
      choices: [
        {
          code: "A",
          label: "继续关闭评分",
          status: "operational_scoring_closed",
          reviewNote: "operational scoring 继续关闭；阈值只作为解释和复核线索。"
        },
        {
          code: "B",
          label: "仅生成候选队列",
          status: "risk_candidate_queue_only_requested",
          reviewNote: "允许下一阶段生成风险候选队列，但不创建自动任务，不写外部系统。"
        },
        {
          code: "C",
          label: "另开启用 gate",
          status: "operational_scoring_separate_gate_required",
          reviewNote: "operational scoring 必须另开启用 gate，当前阶段不启用。"
        }
      ]
    },
    {
      id: "THR-OWNER-003",
      title: "阈值异常流转策略",
      linkedMetricId: "risk_threshold_owner.exception_routing_policy",
      recommendation: "确认阈值命中后的异常只进入 owner review，还是可以进入本地 ActionTask 草稿。",
      actionBoundary: "threshold_exception_routing_decision_only_no_erp_writeback",
      owner: "供应链风险 Owner",
      choices: [
        {
          code: "A",
          label: "只进 owner review",
          status: "risk_owner_review_only",
          reviewNote: "阈值异常只进入 owner review 和解释，不创建行动任务，不写 ERP/OMS/WMS。"
        },
        {
          code: "B",
          label: "本地任务草稿",
          status: "local_action_draft_requested",
          reviewNote: "下一阶段可生成本地 ActionTask 草稿，但外部执行仍需单独授权。"
        },
        {
          code: "C",
          label: "暂缓流转",
          status: "exception_routing_deferred",
          reviewNote: "暂缓异常流转策略，等待阈值 owner 确认。"
        }
      ]
    }
  ];
  const thresholdById = new Map(thresholdVersions.map((threshold) => [threshold.id, threshold]));
  const valueChoiceSet = [
    {
      code: "A",
      label: "作为评审基线",
      status: "value_review_baseline_only",
      reviewNote: "仅作为 owner review 的值域评审基线；不批准生产阈值，不进入 operational scoring。"
    },
    {
      code: "B",
      label: "要求样本校准",
      status: "sample_calibration_requested",
      reviewNote: "要求下一阶段基于 OMS/WMS 样本和 owner 经验做值域校准；当前不启用评分。"
    },
    {
      code: "C",
      label: "暂缓值域",
      status: "value_range_deferred",
      reviewNote: "暂缓该阈值值域评审，等待 owner 提供正式口径或样本。"
    }
  ];
  const thresholdValueReviewPackets = [
    {
      id: "THR-VALUE-001",
      thresholdId: "THR-INV-NEG-AVAILABLE-V0.1",
      title: "负可用库存值域评审",
      valueFamily: "negative_available_inventory",
      owner: "库存运营 Owner",
      suggestedRange: {
        triggerExpression: "available_qty < 0 或 sellable_qty < 0",
        reviewBand: "P0 candidate",
        calibrationNeed: "按仓库、SKU、冻结/预占/在途口径校准误报边界。"
      },
      sampleQuestion: "是否接受负可用库存以 0 为越界线进入 owner review 基线？",
      actionBoundary: "threshold_value_review_local_only_no_scoring"
    },
    {
      id: "THR-VALUE-002",
      thresholdId: "THR-STOCKOUT-COVERAGE-V0.1",
      title: "断货覆盖天数值域评审",
      valueFamily: "stockout_coverage_days",
      owner: "计划 Owner",
      suggestedRange: {
        triggerExpression: "coverage_days < 14 或 sku_oos_rate 上升",
        reviewBand: "P0/P1 candidate",
        calibrationNeed: "按平台、仓库、产品生命周期和销售波动校准 7/14/21 天分层。"
      },
      sampleQuestion: "是否接受 14 天覆盖作为首版断货复核基线，并保留 owner 校准？",
      actionBoundary: "threshold_value_review_local_only_no_scoring"
    },
    {
      id: "THR-VALUE-003",
      thresholdId: "THR-AGING-OVERSTOCK-V0.1",
      title: "库龄超储值域评审",
      valueFamily: "aging_overstock",
      owner: "库存运营 Owner",
      suggestedRange: {
        triggerExpression: "batch_age_days > 90 或 coverage_days > 60",
        reviewBand: "P1 candidate",
        calibrationNeed: "按品类、季节性、仓租成本和周转天数确认 60/90/120 天分层。"
      },
      sampleQuestion: "是否接受 90 天库龄和 60 天覆盖作为库龄/超储复核基线？",
      actionBoundary: "threshold_value_review_local_only_no_scoring"
    },
    {
      id: "THR-VALUE-004",
      thresholdId: "THR-FULFILLMENT-SLA-V0.1",
      title: "履约 SLA 值域评审",
      valueFamily: "fulfillment_sla",
      owner: "物流履约 Owner",
      suggestedRange: {
        triggerExpression: "release_close_time 超出 SLA 或 task_status 长时间停留",
        reviewBand: "P1 candidate",
        calibrationNeed: "按仓型、任务类型、波次、优先级和节假日 SLA 校准停留时长。"
      },
      sampleQuestion: "是否允许 WMS 任务 SLA 先进入 owner review 基线，暂不创建自动任务？",
      actionBoundary: "threshold_value_review_local_only_no_scoring"
    },
    {
      id: "THR-VALUE-005",
      thresholdId: "THR-COST-ANOMALY-V0.1",
      title: "履约成本异常值域评审",
      valueFamily: "fulfillment_cost_anomaly",
      owner: "财务成本 Owner",
      suggestedRange: {
        triggerExpression: "storage_fee_rate 或 fulfillment_cost_variance 超出 owner 确认区间",
        reviewBand: "P1 candidate",
        calibrationNeed: "按费用类型、币种、仓库、订单类型和账单周期确认异常区间。"
      },
      sampleQuestion: "是否允许成本异常仅作为财务 owner review 基线，金额口径另行确认？",
      actionBoundary: "threshold_value_review_local_only_no_scoring"
    }
  ].map((packet) => {
    const threshold = thresholdById.get(packet.thresholdId);
    return {
      ...packet,
      thresholdName: threshold?.name || packet.thresholdId,
      riskDomain: threshold?.riskDomain || "unknown",
      severityBand: threshold?.severityBand || "owner_pending",
      currentRuleDraft: threshold?.ruleDraft || "",
      scenarioRefs: threshold?.scenarioRefs || [],
      metricRefs: threshold?.linkedMetricIds || [],
      evidenceRefs: threshold?.evidenceRefs || [],
      sourceEvidence: (threshold?.evidenceRefs || []).map((id) => coverageById.get(id)).filter(Boolean),
      approvalState: "owner_value_pending",
      choices: valueChoiceSet
    };
  });
  const thresholdValueReceipts = all(
    "SELECT * FROM decision_logs WHERE linked_metric_id LIKE 'risk_threshold_value.%' ORDER BY id"
  );
  const valueReceiptByMetric = new Map(
    thresholdValueReceipts.map((receipt) => [String(receipt.linked_metric_id || ""), receipt])
  );
  const valueReviewDecisions = thresholdValueReviewPackets.map((packet) => {
    const linkedMetricId = `risk_threshold_value.${packet.thresholdId}`;
    const receipt = valueReceiptByMetric.get(linkedMetricId);
    return {
      packetId: packet.id,
      thresholdId: packet.thresholdId,
      linkedMetricId,
      title: packet.title,
      recommendedChoice: "A",
      recommendedStatus: "value_review_baseline_only",
      selectedChoice: receipt ? String(receipt.status || "") : "owner_pending",
      receiptId: receipt?.id || "",
      recorded: Boolean(receipt)
    };
  });
  const formalThresholdValueApprovals = thresholdValueReceipts.filter((receipt) =>
    String(receipt.status || "").includes("approved_production_threshold_value")
  );
  const thresholdValueReviewSummary = {
    id: "RISK-THRESHOLD-VALUE-REVIEW-PACK-A5",
    title: "真实阈值值域 Owner Review Pack",
    recommendedPath: "A-A-A-A-A",
    ownerValueStatus: "owner_values_pending",
    status: "value_review_packet_ready",
    scope: "owner_value_review_only",
    valueFamilies: thresholdValueReviewPackets.length,
    decisions: valueReviewDecisions,
    reviewReceiptCount: valueReviewDecisions.filter((decision) => decision.recorded).length,
    formalApprovalReceiptCount: formalThresholdValueApprovals.length,
    effectiveUse: [
      "把 5 类阈值值域转成 owner 可评审问题",
      "为后续样本校准提供统一 baseline",
      "作为生产只读阈值说明的下一阶段 owner gate"
    ],
    closedActions: [
      "production threshold value approval closed",
      "operational scoring closed",
      "auto action task creation closed",
      "business-row import closed",
      "ERP/OMS/WMS writeback closed"
    ],
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
  };
  const thresholdOwnerReceipts = all(
    "SELECT * FROM decision_logs WHERE linked_metric_id LIKE 'risk_threshold_owner.%' ORDER BY id"
  );
  const receiptByMetric = new Map(
    thresholdOwnerReceipts.map((receipt) => [String(receipt.linked_metric_id || ""), receipt])
  );
  const policyDecisions = ownerDecisionPackets.map((packet) => {
    const receipt = receiptByMetric.get(packet.linkedMetricId);
    const recommendedChoice = packet.choices.find((choice) => choice.code === "A");
    return {
      packetId: packet.id,
      linkedMetricId: packet.linkedMetricId,
      title: packet.title,
      recommendedChoice: "A",
      recommendedStatus: recommendedChoice?.status || "",
      selectedChoice: receipt ? String(receipt.status || "") : "owner_pending",
      receiptId: receipt?.id || "",
      recorded: Boolean(receipt)
    };
  });
  const thresholdPolicySummary = {
    id: "RISK-THRESHOLD-POLICY-A-A-A",
    title: "风险阈值治理策略摘要",
    recommendedPath: "A-A-A",
    ownerChoiceStatus: policyDecisions.every((decision) => decision.recorded)
      ? "local_or_owner_receipts_recorded"
      : "recommended_owner_pending",
    status: "draft_only_governance_policy",
    scope: "risk_governance_view_only",
    effectiveUse: [
      "5 个阈值版本可进入风险雷达治理视图",
      "阈值可作为风险解释、owner review 和后续样本校准线索",
      "场景绑定可用于 Current State & Risk Radar 的证据引用"
    ],
    closedActions: [
      "operational scoring closed",
      "business-row import closed",
      "external system writeback closed",
      "auto action task creation closed",
      "threshold value production activation closed"
    ],
    decisions: policyDecisions,
    receiptCount: policyDecisions.filter((decision) => decision.recorded).length,
    evidenceRefs: [
      "drafts/analysis/scm-prd2-product-gap-next-execution-plan-draft-20260620/current-product-state-acceptance-draft-20260621.md",
      "tmp/outputs/oms-wms-runtime-gated-field-dictionary-20260622.json"
    ],
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
  };
  return {
    thresholdVersions: thresholdVersions.map((threshold) => ({
      ...threshold,
      sourceEvidence: threshold.evidenceRefs.map((id) => coverageById.get(id)).filter(Boolean)
    })),
    scenarioBindings,
    ownerDecisionPackets,
    policySummary: thresholdPolicySummary,
    valueReviewPackets: thresholdValueReviewPackets,
    valueReviewSummary: thresholdValueReviewSummary,
    summary: {
      thresholdVersionCount: thresholdVersions.length,
      scenarioBindingCount: scenarioBindings.length,
      ownerDecisionPacketCount: ownerDecisionPackets.length,
      valueReviewPacketCount: thresholdValueReviewPackets.length,
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
    latestThresholdReviews: all("SELECT * FROM decision_logs WHERE linked_metric_id = 'risk_threshold_pack' OR linked_metric_id LIKE 'risk_threshold.%' ORDER BY rowid DESC LIMIT 20")
  };
}

function getRoleWorkbenchPayload() {
  const roles = [
    { id: "executive-command", name: "管理层 Command Center", owner: "CEO/COO/供应链负责人", focus: "经营承诺、服务水平、库存现金和风险优先级", linkedModules: ["strategy-panorama", "current-risk-radar", "decision-loop"] },
    { id: "planning", name: "计划员工作台", owner: "供应链计划 Owner", focus: "预测偏差、补货策略、S&OP/S&OE 异常升级", linkedModules: ["kpi-system", "current-risk-radar", "chatbi"] },
    { id: "procurement", name: "采购员工作台", owner: "采购 Owner", focus: "供应商准交、采购计划、交期风险与成本取舍", linkedModules: ["ontology", "lineage-quality", "decision-loop"] },
    { id: "warehouse-inventory", name: "仓库库存工作台", owner: "仓库/库存 Owner", focus: "库存状态、库龄、负可用、盘点和批次异常", linkedModules: ["current-risk-radar", "ontology", "lineage-quality"] },
    { id: "logistics-control", name: "物流控制塔", owner: "物流履约 Owner", focus: "出海网络、仓配 SLA、履约异常和在途风险", linkedModules: ["current-risk-radar", "decision-loop", "chatbi"] },
    { id: "finance-cost", name: "财务成本工作台", owner: "财务成本 Owner", focus: "海外仓费用、履约成本、退货成本和对账口径", linkedModules: ["metric-dictionary", "lineage-quality", "decision-loop"] }
  ];
  return {
    roles,
    counts: {
      roles: roles.length,
      sourceCoverageRows: getSourceCoverage().length,
      recommendations: tableCount("recommendation_cards"),
      agentRuns: tableCount("agent_runs"),
      traceReviews: tableCount("trace_reviews"),
      decisionLogs: tableCount("decision_logs")
    },
    boundary: {
      providerCalls: false,
      productionWrites: false,
      erpWriteback: false,
      localReviewOnly: true
    },
    latestRoleReviews: all("SELECT * FROM decision_logs WHERE linked_metric_id LIKE 'role_workbench.%' ORDER BY rowid DESC LIMIT 20")
  };
}

function getFinanceCostGovernance() {
  const sourceCoverage = getSourceCoverage();
  const sourceLineage = sourceCoverageLineageRows();
  const financeCoverage = sourceCoverage.filter((row) => row.target_object_type === "cost_event" || row.source_surface.includes("费用"));
  const financeLineage = sourceLineage.filter((row) => row.target_object_type === "cost_event" || row.source_surface.includes("费用"));
  const thresholdGovernance = getRiskThresholdGovernance();
  const costThresholds = thresholdGovernance.thresholdVersions.filter((threshold) => {
    const metrics = (threshold.linkedMetricIds || []).join(" ");
    return ["cost", "inventory_cash"].includes(threshold.riskDomain) || /cost|fee|storage|fulfillment/.test(metrics);
  });
  const evidencePackets = [
    {
      id: "FCOST-OMS-FEE-STATS",
      title: "OMS 费用统计治理证据",
      owner: "财务成本 Owner",
      costDomain: "fee_statistics",
      sourceRefs: ["SCOV-OMS-COST"],
      costTypes: ["订单费用", "退货费用", "入库费用", "仓租费用", "增值费用", "异常服务费用"],
      targetObjectType: "cost_event",
      targetProperties: ["cost_type", "cost_amount", "currency"],
      evidenceLevel: "L2_browser_dom_verified",
      reviewGate: "finance_reconciliation_rule",
      status: "source_evidence_readonly_checked_partial_owner_pending",
      nextOwnerDecision: "确认费用类型、币种、周期和金额口径可进入治理视图；账单明细钻取另行授权。",
      boundary: "finance_cost_governance_local_review_only_no_external_write"
    },
    {
      id: "FCOST-FULFILLMENT-COST",
      title: "履约成本与订单费用复核",
      owner: "履约/财务 Owner",
      costDomain: "fulfillment_cost",
      sourceRefs: ["SCOV-OMS-COST", "SCOV-OMS-ORDER-STATS"],
      costTypes: ["订单费用", "入库费用", "增值费用", "异常服务费用"],
      targetObjectType: "cost_event",
      targetProperties: ["cost_type", "cost_amount", "currency", "order_status", "ship_warehouse"],
      evidenceLevel: "L2_browser_dom_verified",
      reviewGate: "fulfillment_cost_owner_review",
      status: "source_evidence_readonly_checked_partial_owner_pending",
      nextOwnerDecision: "确认订单费用与履约对象的归因口径，后续再接账单明细和 transaction drill-down。",
      boundary: "finance_cost_governance_local_review_only_no_external_write"
    },
    {
      id: "FCOST-RETURN-COST",
      title: "退货与逆向费用复核",
      owner: "逆向物流/财务 Owner",
      costDomain: "return_cost",
      sourceRefs: ["SCOV-OMS-COST"],
      costTypes: ["退货费用", "异常服务费用"],
      targetObjectType: "cost_event",
      targetProperties: ["cost_type", "cost_amount", "currency"],
      evidenceLevel: "L2_browser_dom_verified",
      reviewGate: "finance_reverse_logistics_review",
      status: "source_evidence_readonly_checked_partial_owner_pending",
      nextOwnerDecision: "确认退货费用是否与 ReturnOrder/SalesOrder 对齐，当前仅做字段级治理证据。",
      boundary: "finance_cost_governance_local_review_only_no_external_write"
    },
    {
      id: "FCOST-INVENTORY-CASH",
      title: "库存资金与仓租费用复核",
      owner: "库存/财务 Owner",
      costDomain: "inventory_cash",
      sourceRefs: ["SCOV-OMS-COST", "SCOV-OMS-INVENTORY-STATS", "SCOV-OMS-SALES-STATS"],
      costTypes: ["仓租费用", "库存金额风险", "库龄成本"],
      targetObjectType: "cost_event",
      targetProperties: ["cost_type", "cost_amount", "currency", "age_bucket", "turnover_rate"],
      evidenceLevel: "L2_browser_dom_verified",
      reviewGate: "aging_cost_owner_review",
      status: "source_evidence_readonly_checked_partial_owner_pending",
      nextOwnerDecision: "确认仓租费用、库龄和库存现金目标的归因口径，operational scoring 继续关闭。",
      boundary: "finance_cost_governance_local_review_only_no_external_write"
    }
  ];
  const ownerDecisionPackets = [
    {
      id: "FIN-OWNER-001",
      title: "费用类型与科目映射口径",
      linkedMetricId: "finance_owner.cost_type_policy",
      recommendation: "确认 OMS 费用统计字段如何映射到 CostEvent.cost_type 与后续会计科目复核。",
      actionBoundary: "finance_owner_choice_local_ledger_only_no_accounting_write",
      owner: "财务成本 Owner",
      choices: [
        {
          code: "A",
          label: "批准费用口径",
          status: "approved_cost_type_mapping",
          reviewNote: "批准订单费用、退货费用、入库费用、仓租费用、增值费用和异常服务费用作为 CostEvent cost_type 初版治理口径；billDrilldown=false；transactionDetailImport=false。"
        },
        {
          code: "B",
          label: "仅做差异清单",
          status: "variance_register_only",
          reviewNote: "仅允许生成费用类型差异清单，不进入成本判断或会计科目映射。"
        },
        {
          code: "C",
          label: "暂缓费用口径",
          status: "deferred_cost_type_mapping",
          reviewNote: "暂缓费用类型映射，等待财务 owner 提供费用科目和统计口径。"
        }
      ]
    },
    {
      id: "FIN-OWNER-002",
      title: "账单 drill-down 授权",
      linkedMetricId: "finance_owner.bill_drilldown_policy",
      recommendation: "确认是否允许从字段级 OMS 费用统计进入账单级只读 drill-down。",
      actionBoundary: "finance_bill_drilldown_decision_only_no_download_no_writeback",
      owner: "财务成本 Owner",
      choices: [
        {
          code: "A",
          label: "继续关闭钻取",
          status: "bill_drilldown_closed_registered",
          reviewNote: "账单 drill-down 继续关闭，仅登记后续授权需求；不点击导出，不下载账单，不读取交易明细。"
        },
        {
          code: "B",
          label: "申请只读样本包",
          status: "bill_drilldown_readonly_sample_requested",
          reviewNote: "申请下一阶段只读账单样本包，仍需单独授权后才可进入页面 drill-down。"
        },
        {
          code: "C",
          label: "另开授权 gate",
          status: "bill_drilldown_separate_gate_required",
          reviewNote: "账单 drill-down 必须另开授权 gate，当前治理视图不包含账单级证据。"
        }
      ]
    },
    {
      id: "FIN-OWNER-003",
      title: "交易明细导入粒度",
      linkedMetricId: "finance_owner.transaction_detail_import_policy",
      recommendation: "确认成本治理是否允许交易明细进入 runtime import。",
      actionBoundary: "finance_transaction_import_decision_only_no_business_rows",
      owner: "财务成本 Owner",
      choices: [
        {
          code: "A",
          label: "不导入明细",
          status: "transaction_detail_import_closed",
          reviewNote: "不导入交易明细；仅保留字段类、汇总口径和 owner review ledger。"
        },
        {
          code: "B",
          label: "仅聚合字段",
          status: "aggregate_fields_only_requested",
          reviewNote: "下一阶段只考虑按费用类型、币种、周期和对象聚合后的字段，不导入交易行。"
        },
        {
          code: "C",
          label: "申请明细 gate",
          status: "transaction_detail_import_gate_required",
          reviewNote: "交易明细导入需要单独 gate、脱敏策略和财务 owner 批准。"
        }
      ]
    },
    {
      id: "FIN-OWNER-004",
      title: "对账规则与异常启用",
      linkedMetricId: "finance_owner.reconciliation_rule_policy",
      recommendation: "确认成本异常阈值是否可进入对账候选规则。",
      actionBoundary: "finance_reconciliation_rule_decision_only_operational_scoring_disabled",
      owner: "财务成本 Owner",
      choices: [
        {
          code: "A",
          label: "仅治理视图预演",
          status: "reconciliation_rule_draft_only",
          reviewNote: "对账规则仅在治理视图预演，operational scoring 保持关闭。"
        },
        {
          code: "B",
          label: "生成异常候选",
          status: "reconciliation_exception_candidates",
          reviewNote: "允许生成成本异常候选清单，但不触发自动任务或外部系统写回。"
        },
        {
          code: "C",
          label: "暂缓规则启用",
          status: "reconciliation_rule_deferred",
          reviewNote: "暂缓对账规则启用，等待财务 owner 确认金额口径和阈值值域。"
        }
      ]
    }
  ];
  const formalOwnerReceipts = all(
    "SELECT * FROM decision_logs WHERE id LIKE 'decision_fin-owner-%' ORDER BY id"
  );
  const receiptByMetric = new Map(
    formalOwnerReceipts.map((receipt) => [String(receipt.linked_metric_id || ""), receipt])
  );
  const policyDecisions = [
    {
      packetId: "FIN-OWNER-001",
      linkedMetricId: "finance_owner.cost_type_policy",
      title: "费用类型与科目映射口径",
      policy: "批准费用类型进入 CostEvent 初版治理口径",
      status: "approved_cost_type_mapping"
    },
    {
      packetId: "FIN-OWNER-002",
      linkedMetricId: "finance_owner.bill_drilldown_policy",
      title: "账单 drill-down 授权",
      policy: "账单 drill-down 继续关闭，仅登记后续授权需求",
      status: "bill_drilldown_closed_registered"
    },
    {
      packetId: "FIN-OWNER-003",
      linkedMetricId: "finance_owner.transaction_detail_import_policy",
      title: "交易明细导入粒度",
      policy: "不导入交易明细，仅保留字段类和汇总口径",
      status: "transaction_detail_import_closed"
    },
    {
      packetId: "FIN-OWNER-004",
      linkedMetricId: "finance_owner.reconciliation_rule_policy",
      title: "对账规则与异常启用",
      policy: "对账规则仅治理视图预演，operational scoring 保持关闭",
      status: "reconciliation_rule_draft_only"
    }
  ].map((decision) => {
    const receipt = receiptByMetric.get(decision.linkedMetricId);
    return {
      ...decision,
      selectedChoice: receipt ? "A" : "pending",
      receiptId: receipt?.id || "",
      recordedStatus: receipt?.status || "owner_pending",
      recorded: Boolean(receipt)
    };
  });
  const recordedPolicyCount = policyDecisions.filter((decision) => decision.recorded).length;
  const policySummary = {
    id: "FIN-COST-POLICY-A-A-A-A",
    title: "财务成本治理政策摘要",
    ownerChoice: recordedPolicyCount === 4 ? "A-A-A-A" : "pending",
    status: recordedPolicyCount === 4 ? "recorded_local_governance_policy" : "owner_receipts_incomplete",
    scope: "governance_view_only",
    effectiveUse: [
      "费用类型口径可进入 CostEvent 治理视图",
      "成本异常可生成治理视图候选解释",
      "财务成本证据可用于风险解释和 owner review"
    ],
    closedActions: [
      "bill drill-down closed",
      "transaction detail import closed",
      "accounting write closed",
      "production sync closed",
      "operational scoring closed"
    ],
    decisions: policyDecisions,
    receiptCount: recordedPolicyCount,
    evidenceRefs: [
      "tmp/outputs/finance-owner-a-receipts-20260623.json",
      "drafts/prototypes/scm-data-governance-workbench-v0/tmp/ui-smoke-2026-06-23T07-12-20-497Z/summary.json"
    ],
    boundary: {
      localLedgerOnly: true,
      providerCalls: false,
      productionWrites: false,
      erpWriteback: false,
      omsWmsWriteback: false,
      billDrilldown: false,
      transactionDetailImport: false,
      accountingWrite: false,
      operationalScoring: false
    }
  };
  return {
    evidencePackets: evidencePackets.map((packet) => ({
      ...packet,
      sourceEvidence: packet.sourceRefs.map((id) => sourceCoverage.find((row) => row.id === id)).filter(Boolean),
      lineageEvidence: packet.sourceRefs.map((id) => sourceLineage.find((row) => row.source_coverage_id === id)).filter(Boolean)
    })),
    financeCoverage,
    financeLineage,
    costThresholds,
    ownerDecisionPackets,
    policySummary,
    reconciliationGates: [
      {
        id: "FCOST-GATE-001",
        name: "费用类型口径确认",
        status: "owner_pending",
        reason: "OMS 费用统计字段已只读捕获，费用类型与会计科目映射仍需财务 owner 确认。"
      },
      {
        id: "FCOST-GATE-002",
        name: "账单/交易明细钻取授权",
        status: "owner_pending",
        reason: "当前仅展示字段级证据，bill drill-down 和 transaction detail 仍保持关闭。"
      },
      {
        id: "FCOST-GATE-003",
        name: "成本异常阈值启用",
        status: "owner_pending",
        reason: "成本异常阈值已进入治理视图，operational scoring 仍关闭。"
      }
    ],
    boundary: {
      providerCalls: false,
      productionWrites: false,
      erpWriteback: false,
      omsWmsWriteback: false,
      billDrilldown: false,
      transactionDetailImport: false,
      localReviewOnly: true
    },
    latestFinanceReviews: all("SELECT * FROM decision_logs WHERE linked_metric_id = 'finance_cost_evidence' OR linked_metric_id LIKE 'finance_cost.%' OR linked_metric_id LIKE 'finance_owner.%' ORDER BY rowid DESC LIMIT 20")
  };
}

function getDeployHealth() {
  const deepSeekConfig = getDeepSeekConfig();
  const providerAvailable = Boolean(deepSeekConfig.apiKey)
    && deepSeekConfig.providerCallAuthorized
    && databaseWriteAuthorized;
  return {
    ok: true,
    service: "scm-data-governance-workbench",
    runtime: process.version,
    host,
    port,
    launchedAt,
    deployment: deploymentMetadata,
    staticBuild: existsSync(distPath),
    database: {
      path: "data/governance_workbench.sqlite",
      mode: databaseMode,
      ontologyObjects: tableCount("ontology_objects"),
      ontologyObjectInstances: tableCount("ontology_object_instances"),
      metrics: tableCount("metrics"),
      lineageEdges: tableCount("lineage_edges"),
      governanceTasks: tableCount("governance_tasks"),
      agentTraces: tableCount("agent_traces"),
      traceReviews: tableCount("trace_reviews"),
      recommendationCards: tableCount("recommendation_cards"),
      agentRuns: tableCount("agent_runs"),
      aipScenarios: tableCount("aip_scenarios")
    },
    boundary: {
      productionWrites: false,
      databaseWrites: databaseWriteAuthorized,
      databaseWriteAuthorized,
      providerCalls: providerAvailable,
      providerCallAuthorized: deepSeekConfig.providerCallAuthorized,
      providerConfigured: Boolean(deepSeekConfig.apiKey),
      erpWriteback: false,
      chatbiPolicy: "certified_metric_only"
    }
  };
}

function getOverview() {
  const lifecycle = all("SELECT lifecycle_status AS status, COUNT(*) AS count FROM metrics GROUP BY lifecycle_status ORDER BY count DESC");
  const levels = all("SELECT level, COUNT(*) AS count FROM metrics GROUP BY level ORDER BY level");
  const tasks = all("SELECT status, COUNT(*) AS count FROM governance_tasks GROUP BY status ORDER BY count DESC");
  return {
    counts: {
      ontologyObjects: tableCount("ontology_objects"),
      ontologyLinks: tableCount("ontology_links"),
      ontologyObjectInstances: tableCount("ontology_object_instances"),
      ontologyInstanceLinks: tableCount("ontology_instance_links"),
      tags: tableCount("tags"),
      dimensions: tableCount("dimensions"),
      metrics: tableCount("metrics"),
      lineageEdges: tableCount("lineage_edges"),
      governanceTasks: tableCount("governance_tasks"),
      chatbiContexts: tableCount("chatbi_contexts"),
      decisionLogs: tableCount("decision_logs"),
      annotations: tableCount("annotations"),
      revisionProposals: tableCount("revision_proposals"),
      exportJobs: tableCount("export_jobs"),
      knowledgeDomains: tableCount("knowledge_domains"),
      knowledgeCards: tableCount("knowledge_cards"),
      knowledgeChunks: tableCount("knowledge_chunks"),
      knowledgeCrosswalks: tableCount("knowledge_crosswalks"),
      agentTraces: tableCount("agent_traces"),
      traceReviews: tableCount("trace_reviews"),
      recommendationCards: tableCount("recommendation_cards"),
      agentRuns: tableCount("agent_runs"),
      aipScenarios: tableCount("aip_scenarios")
    },
    riskQueue: getAipScenarios(new URL("http://local/api/aip-scenarios"))
      .filter((scenario) => ["P0", "P1"].includes(scenario.priority))
      .slice(0, 5),
    recommendationQueue: getRecommendationCards(new URL("http://local/api/recommendation-cards"))
      .filter((card) => !["approved", "rejected"].includes(card.approval_status))
      .slice(0, 5),
    traceSummary: {
      total: tableCount("agent_traces"),
      reviewed: tableCount("trace_reviews"),
      recent: getAgentTraces(new URL("http://local/api/agent-traces")).slice(0, 3)
    },
    objectInstanceSummary: {
      total: tableCount("ontology_object_instances"),
      byType: all("SELECT object_type_id AS type, COUNT(*) AS count FROM ontology_object_instances GROUP BY object_type_id ORDER BY count DESC"),
      riskInstances: all("SELECT * FROM ontology_object_instances WHERE status LIKE '%risk%' OR status LIKE '%exception%' OR status LIKE '%review%' ORDER BY object_type_id, id LIMIT 5")
        .map(hydrateObjectInstance)
    },
    scenarioSummary: {
      total: tableCount("aip_scenarios"),
      byStatus: all("SELECT status, COUNT(*) AS count FROM aip_scenarios GROUP BY status ORDER BY count DESC"),
      byPriority: all("SELECT priority, COUNT(*) AS count FROM aip_scenarios GROUP BY priority ORDER BY priority")
    },
    lifecycle,
    levels,
    tasks,
    moduleHealth: moduleHealth(),
    architectureLayers: [
      "数据资产层",
      "元数据采集层",
      "主数据与身份解析层",
      "业务对象本体层",
      "标签与维度工程层",
      "指标工程层",
      "指标体系与KPI层",
      "语义服务与ChatBI层",
      "决策闭环层"
    ]
  };
}

function getLedger(targetType, targetId) {
  return {
    annotations: all(
      "SELECT * FROM annotations WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC LIMIT 100",
      [targetType, targetId]
    ),
    comments: all(
      "SELECT * FROM comments WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC LIMIT 100",
      [targetType, targetId]
    ),
    revisionProposals: all(
      "SELECT * FROM revision_proposals WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC LIMIT 100",
      [targetType, targetId]
    ),
    auditEvents: all(
      "SELECT * FROM audit_events WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC LIMIT 100",
      [targetType, targetId]
    )
  };
}

function requireText(value, fallback = "") {
  const textValue = String(value || fallback).trim();
  if (!textValue) throw new Error("Required field is empty.");
  return textValue;
}

function createAnnotation(body) {
  const targetType = requireText(body.targetType);
  const targetId = requireText(body.targetId);
  const record = {
    id: makeId("ann"),
    target_type: targetType,
    target_id: targetId,
    body: requireText(body.body),
    author: String(body.author || "供应链数据治理 Owner"),
    status: String(body.status || "active"),
    created_at: nowIso()
  };
  insert("annotations", record);
  recordAudit("annotation_created", targetType, targetId, record.author, { annotationId: record.id });
  return record;
}

function createComment(body) {
  const targetType = requireText(body.targetType);
  const targetId = requireText(body.targetId);
  const record = {
    id: makeId("comment"),
    target_type: targetType,
    target_id: targetId,
    body: requireText(body.body),
    author: String(body.author || "供应链数据治理 Owner"),
    created_at: nowIso()
  };
  insert("comments", record);
  recordAudit("comment_created", targetType, targetId, record.author, { commentId: record.id });
  return record;
}

function createRevisionProposal(body) {
  const targetType = requireText(body.targetType);
  const targetId = requireText(body.targetId);
  const record = {
    id: makeId("rev"),
    target_type: targetType,
    target_id: targetId,
    title: requireText(body.title, "修订建议"),
    proposal: requireText(body.proposal),
    reason: String(body.reason || "业务复核后进入治理任务。"),
    proposed_by: String(body.proposedBy || body.author || "供应链数据治理 Owner"),
    status: "review_pending",
    created_at: nowIso()
  };
  insert("revision_proposals", record);
  recordAudit("revision_proposal_created", targetType, targetId, record.proposed_by, { revisionProposalId: record.id });
  return record;
}

function getMetrics(url) {
  const clauses = [];
  const params = [];
  const q = url.searchParams.get("q");
  const level = url.searchParams.get("level");
  const status = url.searchParams.get("status");
  const domain = url.searchParams.get("domain");
  if (q) {
    clauses.push("(name LIKE ? OR code LIKE ? OR definition LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (level) {
    clauses.push("level = ?");
    params.push(level);
  }
  if (status) {
    clauses.push("lifecycle_status = ?");
    params.push(status);
  }
  if (domain) {
    clauses.push("l1_domain = ?");
    params.push(domain);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all(
    `SELECT * FROM metrics ${where} ORDER BY CASE level WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 ELSE 3 END, id LIMIT 500`,
    params
  );
}

function getMetricByRef(metricRef) {
  const ref = requireText(metricRef);
  const exact = get("SELECT * FROM metrics WHERE id = ? OR code = ? LIMIT 1", [ref, ref]);
  if (exact) return exact;
  const compact = ref.replaceAll("_", " ");
  return get(
    `SELECT * FROM metrics
     WHERE lower(name || ' ' || definition || ' ' || formula || ' ' || code) LIKE ?
     ORDER BY CASE level WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 ELSE 3 END, id
     LIMIT 1`,
    [`%${compact.toLowerCase()}%`]
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const exportQueries = {
  ontology_objects: "SELECT * FROM ontology_objects ORDER BY object_type, id",
  ontology_links: "SELECT * FROM ontology_links ORDER BY id",
  ontology_object_instances: "SELECT * FROM ontology_object_instances ORDER BY object_type_id, status, id",
  ontology_instance_links: "SELECT * FROM ontology_instance_links ORDER BY source_instance_id, link_type, target_instance_id",
  tags: "SELECT * FROM tags ORDER BY lifecycle_status, id",
  dimensions: "SELECT * FROM dimensions ORDER BY dimension_type, id",
  metrics: "SELECT * FROM metrics ORDER BY CASE level WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 ELSE 3 END, id",
  lineage_edges: "SELECT * FROM lineage_edges ORDER BY status, edge_type",
  governance_tasks: "SELECT * FROM governance_tasks ORDER BY priority, status, id",
  decision_logs: "SELECT * FROM decision_logs ORDER BY status, id",
  action_tasks: "SELECT * FROM action_tasks ORDER BY status, id",
  knowledge_domains: "SELECT * FROM knowledge_domains ORDER BY status, id",
  knowledge_cards: "SELECT * FROM knowledge_cards ORDER BY status, domain_id, topic, id",
  knowledge_chunks: "SELECT * FROM knowledge_chunks ORDER BY domain_id, card_id, chunk_index",
  knowledge_crosswalks: "SELECT * FROM knowledge_crosswalks ORDER BY target_type, target_id, source_id",
  agent_traces: "SELECT * FROM agent_traces ORDER BY created_at DESC",
  trace_reviews: "SELECT * FROM trace_reviews ORDER BY updated_at DESC, created_at DESC",
  recommendation_cards: "SELECT * FROM recommendation_cards ORDER BY risk_level, approval_status, updated_at DESC",
  agent_runs: "SELECT * FROM agent_runs ORDER BY started_at DESC",
  aip_scenarios: "SELECT * FROM aip_scenarios ORDER BY priority, status, id"
};

function rowsForExport(assetType) {
  if (assetType === "source_coverage") return getSourceCoverage();
  if (assetType === "source_coverage_lineage") return sourceCoverageLineageRows();
  if (assetType === "runtime_metadata_projection") return runtimeMetadataProjectionRows();
  const query = exportQueries[assetType];
  if (!query) throw new Error(`Unsupported export asset type: ${assetType}`);
  return all(`${query} LIMIT 5000`);
}

function runtimeMetadataProjectionRows() {
  const policy = runtimeMetadataProjection.policy || {};
  const summary = runtimeMetadataProjection.summary || {};
  return [
    ...(runtimeMetadataProjection.allowlist_fields || []),
    ...(runtimeMetadataProjection.excluded_fields || [])
  ].map((field) => ({
    field_id: field.field_id,
    projection_status: field.projection_status,
    source_system: field.source_system,
    source_surface: field.source_surface,
    target_object_type: field.target_object_type,
    target_property: field.target_property,
    data_type_hint: field.data_type_hint,
    sensitivity_level: field.sensitivity_level,
    evidence_level: field.evidence_level,
    owner_choice: runtimeMetadataProjection.owner_choice || "A-A-A",
    runtime_scope_gate: policy.runtime_scope_gate || "",
    sensitive_identifier_gate: policy.sensitive_identifier_gate || "",
    threshold_activation_gate: policy.threshold_activation_gate || "",
    import_mode: summary.import_mode || "metadata_projection_only",
    business_rows_included: summary.business_rows_included === true ? "true" : "false",
    provider_calls: summary.provider_calls === true ? "true" : "false",
    erp_writeback: summary.erp_writeback === true ? "true" : "false"
  }));
}

function buildExcelHtml(rows) {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const head = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function escapeCsvCell(value) {
  const textValue = String(value ?? "");
  return `"${textValue.replaceAll('"', '""')}"`;
}

function buildCsv(rows) {
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const header = columns.map(escapeCsvCell).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(",")).join("\n");
  return [header, body].filter(Boolean).join("\n");
}

function createExportJob(body) {
  const assetType = requireText(body.assetType);
  const format = String(body.format || "json").toLowerCase();
  if (!["json", "csv", "excel"].includes(format)) throw new Error("Export format must be json, csv or excel.");
  const rows = rowsForExport(assetType);
  const createdAt = nowIso();
  const id = makeId("export");
  const extension = format === "excel" ? "xls" : format;
  const fileName = `${assetType}-${createdAt.slice(0, 19).replaceAll(":", "").replace("T", "-")}.${extension}`;
  const mimeType = format === "excel"
    ? "application/vnd.ms-excel; charset=utf-8"
    : format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/json; charset=utf-8";
  const content = format === "excel" ? buildExcelHtml(rows) : format === "csv" ? buildCsv(rows) : JSON.stringify(rows, null, 2);
  const record = {
    id,
    asset_type: assetType,
    format,
    filters: JSON.stringify(body.filters || {}),
    row_count: rows.length,
    file_name: fileName,
    mime_type: mimeType,
    content,
    status: "ready",
    created_by: String(body.createdBy || "供应链数据治理 Owner"),
    created_at: createdAt
  };
  insert("export_jobs", record);
  recordAudit("export_created", "export_job", id, record.created_by, {
    assetType,
    format,
    rowCount: rows.length,
    fileName
  });
  return { ...record, content: undefined, downloadUrl: `/api/exports/${id}` };
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function tokenize(query) {
  const normalized = normalizeText(query).replace(/[^\p{L}\p{N}_]+/gu, " ");
  const rawTerms = normalized.split(/\s+/).filter(Boolean);
  const cjkTerms = String(query || "").match(/[\u4e00-\u9fa5]{2,}/g) || [];
  return [...new Set([...rawTerms, ...cjkTerms])].filter((term) => term.length >= 2).slice(0, 12);
}

function getKnowledgeCards(url) {
  const clauses = [];
  const params = [];
  const domain = url.searchParams.get("domain");
  const topic = url.searchParams.get("topic");
  const q = url.searchParams.get("q");
  if (domain) {
    clauses.push("domain_id = ?");
    params.push(domain);
  }
  if (topic) {
    clauses.push("topic = ?");
    params.push(topic);
  }
  if (q) {
    clauses.push("(title LIKE ? OR summary LIKE ? OR topic LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all(`SELECT * FROM knowledge_cards ${where} ORDER BY status, domain_id, topic, id LIMIT 500`, params)
    .map(hydrateKnowledgeCard);
}

function hydrateKnowledgeCard(card) {
  return {
    ...card,
    objectRefs: parseJsonArray(card.object_refs),
    metricRefs: parseJsonArray(card.metric_refs),
    ruleRefs: parseJsonArray(card.rule_refs)
  };
}

function getKnowledgeCard(id) {
  const card = get("SELECT * FROM knowledge_cards WHERE id = ?", [id]);
  if (!card) return null;
  return {
    ...hydrateKnowledgeCard(card),
    domain: get("SELECT * FROM knowledge_domains WHERE id = ?", [card.domain_id]),
    chunks: all("SELECT * FROM knowledge_chunks WHERE card_id = ? ORDER BY chunk_index", [id]),
    crosswalks: all("SELECT * FROM knowledge_crosswalks WHERE source_id = ? ORDER BY target_type, confidence DESC", [id])
  };
}

function getKnowledgeSupport(url) {
  const inputType = requireText(url.searchParams.get("targetType"));
  const inputId = requireText(url.searchParams.get("targetId"));
  const normalizedType = inputType === "ontology_object" ? "object" : inputType;
  const targetIds = new Set([inputId]);
  let resolvedTarget = null;

  if (normalizedType === "metric") {
    const metric = getMetricByRef(inputId);
    if (metric) {
      resolvedTarget = metric;
      targetIds.add(metric.id);
      targetIds.add(metric.code);
      targetIds.add(metric.name);
    }
  }

  if (normalizedType === "object") {
    const object = get("SELECT * FROM ontology_objects WHERE id = ? OR name = ? LIMIT 1", [inputId, inputId]);
    if (object) {
      resolvedTarget = object;
      targetIds.add(object.id);
      targetIds.add(object.name);
    }
  }

  const ids = [...targetIds].filter(Boolean);
  const placeholders = ids.map(() => "?").join(",");
  const rows = all(`
    SELECT
      x.id AS crosswalk_id,
      x.source_type,
      x.source_id,
      x.target_type,
      x.target_id,
      x.relation_type,
      x.confidence,
      x.note,
      cards.id AS card_id,
      cards.title,
      cards.topic,
      cards.summary,
      cards.source_path,
      cards.source_section,
      cards.object_refs,
      cards.metric_refs,
      cards.rule_refs,
      cards.evidence_level AS card_evidence_level,
      cards.status AS card_status,
      domains.id AS domain_id,
      domains.name AS domain_name,
      domains.status AS domain_status,
      domains.evidence_level AS domain_evidence_level
    FROM knowledge_crosswalks x
    JOIN knowledge_cards cards ON cards.id = x.source_id
    JOIN knowledge_domains domains ON domains.id = cards.domain_id
    WHERE x.target_type = ? AND x.target_id IN (${placeholders})
    ORDER BY x.confidence DESC, domains.status, cards.topic, cards.title
    LIMIT 120
  `, [normalizedType, ...ids]).map((row) => ({
    ...row,
    objectRefs: parseJsonArray(row.object_refs),
    metricRefs: parseJsonArray(row.metric_refs),
    ruleRefs: parseJsonArray(row.rule_refs),
    evidencePolicy: row.domain_status === "active" ? "usable_as_local_evidence" : "candidate_only_draft"
  }));

  return {
    targetType: normalizedType,
    targetId: inputId,
    matchedTargetIds: ids,
    resolvedTarget,
    count: rows.length,
    supports: rows,
    policy: "local_kb_crosswalk_evidence_only_no_provider_call",
    doesNotProve: [
      "知识卡反向支持只能证明本地知识库存在关联证据，不能证明 ERP/积加生产数据当前状态。",
      "draft 知识域仅作为候选证据，不自动进入 ChatBI certified 语义层。"
    ]
  };
}

function loadAiKnowledgeEvidenceQualityReview() {
  if (!existsSync(aiKnowledgeEvidenceQualityReviewPath)) {
    const error = new Error(
      `AI knowledge evidence review is missing at ${publicProjectPath(aiKnowledgeEvidenceQualityReviewPath)}. Configure SCM_PROJECT_ROOT or SCM_AI_KNOWLEDGE_EVIDENCE_PATH.`
    );
    error.statusCode = 503;
    throw error;
  }
  try {
    const packet = JSON.parse(readFileSync(aiKnowledgeEvidenceQualityReviewPath, "utf8"));
    if (!Array.isArray(packet.domain_reviews) || !packet.domain_reviews.length) {
      throw new Error("domain_reviews must be a non-empty array");
    }
    return packet;
  } catch (error) {
    const loadError = new Error(`AI knowledge evidence review is invalid at ${publicProjectPath(aiKnowledgeEvidenceQualityReviewPath)}: ${error.message}`);
    loadError.statusCode = 503;
    throw loadError;
  }
}

function getAiKnowledgeEvidenceQualityReview() {
  const packet = loadAiKnowledgeEvidenceQualityReview();
  const activeChoices = [
    {
      code: "A",
      label: "接受本地证据基线",
      status: "answer_quality_baseline_accepted",
      reviewNote: "接受该知识域作为本地回答质量人工 review 基线；不代表 provider 回答验收或生产口径批准。"
    },
    {
      code: "B",
      label: "补充反例抽样",
      status: "answer_quality_counterexample_review_requested",
      reviewNote: "要求补充反例、限制条件或抽样问答后再进入管理层表达。"
    },
    {
      code: "C",
      label: "暂缓用于回答",
      status: "answer_quality_use_deferred",
      reviewNote: "暂缓该知识域用于正式回答质量验收。"
    }
  ];
  const draftChoices = [
    {
      code: "A",
      label: "继续 candidate-only",
      status: "candidate_only_retained",
      reviewNote: "保持 draft 域为候选证据；不晋升为正式本地回答证据。"
    },
    {
      code: "B",
      label: "启动晋升评审",
      status: "owner_promotion_review_requested",
      reviewNote: "进入 owner 晋升评审，但当前不自动修改知识域状态。"
    },
    {
      code: "C",
      label: "暂缓纳入验收",
      status: "draft_domain_deferred",
      reviewNote: "暂缓该 draft 域进入回答质量验收。"
    }
  ];
  const reviewPackets = (packet.domain_reviews || []).map((domain) => {
    const isDraft = domain.status !== "active";
    const probes = domain.probes || [];
    return {
      id: `AI-KB-QUAL-${String(domain.id || "domain").toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
      domainId: domain.id,
      domainName: domain.name,
      theme: domain.theme,
      owner: isDraft ? "知识库 Owner + ERP Owner" : "知识库 Owner",
      domainStatus: domain.status,
      evidenceLevel: domain.evidence_level,
      cardCount: domain.card_count || 0,
      chunkCount: domain.chunk_count || 0,
      crosswalkCount: domain.crosswalk_count || 0,
      probeCount: probes.length,
      answerableCount: probes.filter((probe) => probe.answerability === "answerable_with_local_evidence").length,
      candidateOnlyCount: probes.filter((probe) => probe.answerability === "candidate_only_draft_evidence").length,
      topProbeTitles: probes.flatMap((probe) => probe.top_titles || []).slice(0, 6),
      decisionNeeded: isDraft
        ? "决定 draft ERP 补充域继续 candidate-only，还是进入 owner 晋升评审。"
        : "抽样确认 top cards 是否足以支持管理层回答，必要时补充反例或限制条件。",
      recommendedChoice: "A",
      recommendedStatus: isDraft ? "candidate_only_retained" : "answer_quality_baseline_accepted",
      actionBoundary: "ai_kb_answer_quality_review_local_only_no_provider_call_no_production_write",
      choices: isDraft ? draftChoices : activeChoices
    };
  });
  const receipts = all(
    "SELECT * FROM decision_logs WHERE linked_metric_id LIKE 'ai_kb_quality.%' ORDER BY id"
  );
  const receiptByMetric = new Map(receipts.map((receipt) => [String(receipt.linked_metric_id || ""), receipt]));
  const decisions = reviewPackets.map((reviewPacket) => {
    const linkedMetricId = `ai_kb_quality.${reviewPacket.domainId}`;
    const receipt = receiptByMetric.get(linkedMetricId);
    return {
      packetId: reviewPacket.id,
      domainId: reviewPacket.domainId,
      linkedMetricId,
      title: reviewPacket.domainName,
      recommendedChoice: reviewPacket.recommendedChoice,
      recommendedStatus: reviewPacket.recommendedStatus,
      selectedChoice: receipt ? String(receipt.status || "") : "owner_pending",
      receiptId: receipt?.id || "",
      recorded: Boolean(receipt)
    };
  });
  const recommendedPath = reviewPackets.map(() => "A").join("-");
  return {
    sourcePath: publicProjectPath(aiKnowledgeEvidenceQualityReviewPath),
    generatedAt: packet.generated_at,
    reviewDate: packet.review_date,
    source: packet.source,
    totals: packet.totals,
    reviewPackets,
    summary: {
      id: "AI-KB-QUALITY-REVIEW-PACK-A4",
      title: "AI 知识回答质量人工 Review Pack",
      recommendedPath,
      status: "manual_review_choice_pack_ready",
      scope: "local_answer_quality_review_only",
      manualReviewStatus: "owner_choices_pending",
      reviewPacketCount: reviewPackets.length,
      receiptCount: decisions.filter((decision) => decision.recorded).length,
      activeAnswerableProbes: packet.totals?.answerable_with_local_evidence || 0,
      candidateOnlyProbes: packet.totals?.candidate_only_draft_evidence || 0,
      decisions,
      effectiveUse: [
        "将 12 个固定 probes 转成 owner 回答质量验收题集",
        "区分 active 本地证据和 draft candidate-only 证据",
        "作为 DeepSeek live provider 验收前的人工基线"
      ],
      closedActions: [
        "live provider call closed",
        "production write closed",
        "ERP/OMS/WMS writeback closed",
        "draft domain promotion closed until owner choice",
        "formal management answer approval closed"
      ],
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

function hydrateRecommendationCard(row) {
  if (!row) return null;
  return {
    ...row,
    linkedMetricIds: parseJsonArray(row.linked_metric_ids),
    linkedKnowledgeCardIds: parseJsonArray(row.linked_knowledge_card_ids),
    actionOptions: parseJsonArray(row.action_options)
  };
}

function getRecommendationCards(url) {
  const clauses = [];
  const params = [];
  const scenario = url.searchParams.get("scenario");
  const status = url.searchParams.get("status");
  const targetObjectId = url.searchParams.get("targetObjectId");
  if (scenario) {
    clauses.push("scenario = ?");
    params.push(scenario);
  }
  if (status) {
    clauses.push("approval_status = ?");
    params.push(status);
  }
  if (targetObjectId) {
    clauses.push("(target_object_id = ? OR target_object_type = ?)");
    params.push(targetObjectId, targetObjectId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return all(
    `SELECT * FROM recommendation_cards ${where} ORDER BY risk_level, approval_status, updated_at DESC LIMIT 300`,
    params
  ).map(hydrateRecommendationCard);
}

function createRecommendationCard(body) {
  const createdAt = nowIso();
  const record = {
    id: String(body.id || makeId("rec")),
    scenario: requireText(body.scenario || inferIntent(body.title || body.question || "")),
    title: requireText(body.title || "供应链治理建议卡"),
    target_object_type: requireText(body.targetObjectType || body.target_object_type || "object"),
    target_object_id: requireText(body.targetObjectId || body.target_object_id || "manual"),
    linked_metric_ids: jsonArray(body.linkedMetricIds || body.linked_metric_ids || []),
    linked_knowledge_card_ids: jsonArray(body.linkedKnowledgeCardIds || body.linked_knowledge_card_ids || []),
    business_impact: requireText(body.businessImpact || body.business_impact || "待 owner 补充业务影响。"),
    confidence_level: String(body.confidenceLevel || body.confidence_level || "medium"),
    risk_level: String(body.riskLevel || body.risk_level || "P1"),
    owner: String(body.owner || "供应链数据治理 Owner"),
    sla_due_at: String(body.slaDueAt || body.sla_due_at || ""),
    action_options: jsonArray(body.actionOptions || body.action_options || ["人工复核", "生成治理任务", "进入复盘"]),
    approval_status: String(body.approvalStatus || body.approval_status || "draft"),
    execution_status: String(body.executionStatus || body.execution_status || "not_started"),
    trace_id: String(body.traceId || body.trace_id || ""),
    replay_note: String(body.replayNote || body.replay_note || "Suggestion + approval + replay only; no ERP/Jijia write-back."),
    created_at: createdAt,
    updated_at: createdAt
  };
  insert("recommendation_cards", record);
  if (record.trace_id) {
    run("UPDATE agent_traces SET recommendation_ref = ? WHERE id = ?", [record.id, record.trace_id]);
  }
  recordAudit("recommendation_card_created", "recommendation_card", record.id, record.owner, {
    scenario: record.scenario,
    riskLevel: record.risk_level,
    traceId: record.trace_id
  });
  createAgentRun({
    scenario: record.scenario,
    runType: "recommendation_card_created",
    targetObjectType: record.target_object_type,
    targetObjectId: record.target_object_id,
    question: record.title,
    intent: inferIntent(`${record.title} ${record.business_impact}`),
    status: "review_ready",
    owner: record.owner,
    inputRefs: [
      `object:${record.target_object_id}`,
      ...parseJsonArray(record.linked_metric_ids).map((id) => `metric:${id}`),
      ...parseJsonArray(record.linked_knowledge_card_ids).map((id) => `knowledge:${id}`)
    ],
    outputRefs: [`recommendation:${record.id}`],
    traceIds: record.trace_id ? [record.trace_id] : [],
    recommendationCardIds: [record.id],
    publicSteps: [
      { step: "scope_object", status: "completed", summary: `绑定对象 ${record.target_object_type}/${record.target_object_id}` },
      { step: "link_evidence", status: "completed", summary: "关联指标、知识卡和可复盘边界" },
      { step: "draft_recommendation", status: "completed", summary: "生成推荐动作卡，等待审核或批准" }
    ],
    decisionBoundary: "suggestion_review_replay_only_no_erp_writeback",
    replayNote: "Recommendation card creation captured as RunTrace."
  });
  return hydrateRecommendationCard(record);
}

function reviewRecommendationCard(id, body) {
  const card = get("SELECT * FROM recommendation_cards WHERE id = ?", [id]);
  if (!card) return null;
  const status = String(body.approvalStatus || body.status || "reviewed");
  const allowed = new Set(["draft", "review_pending", "reviewed", "approved", "rejected"]);
  if (!allowed.has(status)) throw new Error("Unsupported recommendation approval status.");
  const executionStatus = String(body.executionStatus || card.execution_status);
  const note = String(body.replayNote || body.note || card.replay_note || "");
  run(
    "UPDATE recommendation_cards SET approval_status = ?, execution_status = ?, replay_note = ?, updated_at = ? WHERE id = ?",
    [status, executionStatus, note, nowIso(), id]
  );
  recordAudit("recommendation_card_reviewed", "recommendation_card", id, body.actor || "供应链数据治理 Owner", {
    approvalStatus: status,
    executionStatus,
    note
  });
  return hydrateRecommendationCard(get("SELECT * FROM recommendation_cards WHERE id = ?", [id]));
}

function convertRecommendationCardToAction(id, body) {
  const card = hydrateRecommendationCard(get("SELECT * FROM recommendation_cards WHERE id = ?", [id]));
  if (!card) return null;
  if (!["approved", "reviewed"].includes(card.approval_status)) {
    throw new Error("Recommendation card must be reviewed or approved before converting to action task.");
  }
  const actionId = makeId("action");
  const actionName = String(body.actionName || card.actionOptions?.[0] || card.title);
  insertActionTask(actionId, {
    insightRef: card.id,
    actionName,
    owner: body.owner || card.owner,
    replayNote: `From recommendation ${card.id}: ${card.replay_note}`
  });
  run("UPDATE recommendation_cards SET execution_status = ?, updated_at = ? WHERE id = ?", ["action_task_created", nowIso(), id]);
  recordAudit("recommendation_converted_to_action", "recommendation_card", id, body.actor || "供应链数据治理 Owner", {
    actionTaskId: actionId,
    actionName
  });
  createAgentRun({
    scenario: card.scenario,
    runType: "recommendation_to_action_task",
    targetObjectType: card.target_object_type,
    targetObjectId: card.target_object_id,
    question: actionName,
    intent: inferIntent(`${card.title} ${card.business_impact}`),
    status: "completed",
    owner: body.owner || card.owner,
    inputRefs: [`recommendation:${card.id}`, ...card.linkedMetricIds.map((metricId) => `metric:${metricId}`)],
    outputRefs: [`action_task:${actionId}`],
    traceIds: card.trace_id ? [card.trace_id] : [],
    recommendationCardIds: [card.id],
    actionTaskIds: [actionId],
    publicSteps: [
      { step: "approval_gate", status: "completed", summary: `推荐卡状态 ${card.approval_status}` },
      { step: "create_action_task", status: "completed", summary: `生成 Action Task ${actionId}` },
      { step: "boundary", status: "completed", summary: "只进入本地治理任务，不写回 ERP/积加" }
    ],
    decisionBoundary: "approval_task_only_no_erp_writeback",
    replayNote: `Converted recommendation ${card.id} to action task ${actionId}.`
  });
  return {
    recommendationCard: hydrateRecommendationCard(get("SELECT * FROM recommendation_cards WHERE id = ?", [id])),
    actionTask: get("SELECT * FROM action_tasks WHERE id = ?", [actionId])
  };
}

function insertDecisionLog(id, body) {
  run(
    "INSERT INTO decision_logs (id, insight_title, linked_metric_id, recommendation, action_boundary, status, review_note) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      body.insightTitle || body.insight_title || "Owner decision packet",
      body.linkedMetricId || body.linked_metric_id || "manual_review",
      body.recommendation || "record_owner_decision",
      body.actionBoundary || body.action_boundary || "local_governance_decision_only_no_external_write",
      body.status || "recorded",
      body.reviewNote || body.review_note || ""
    ]
  );
}

function searchKnowledge(body) {
  const query = requireText(body.query || body.question || "");
  const terms = tokenize(query);
  const limit = Math.max(1, Math.min(Number(body.limit || 8), 20));
  const domainId = String(body.domainId || "");
  const rows = all(`
    SELECT
      chunks.id AS chunk_id,
      chunks.text,
      chunks.keywords,
      chunks.chunk_index,
      cards.id AS card_id,
      cards.title,
      cards.topic,
      cards.summary,
      cards.source_path,
      cards.object_refs,
      cards.metric_refs,
      cards.rule_refs,
      cards.evidence_level AS card_evidence_level,
      cards.status AS card_status,
      domains.id AS domain_id,
      domains.name AS domain_name,
      domains.status AS domain_status,
      domains.evidence_level AS domain_evidence_level
    FROM knowledge_chunks chunks
    JOIN knowledge_cards cards ON cards.id = chunks.card_id
    JOIN knowledge_domains domains ON domains.id = chunks.domain_id
    ${domainId ? "WHERE domains.id = ?" : ""}
    ORDER BY domains.status, cards.domain_id, chunks.card_id, chunks.chunk_index
    LIMIT 2000
  `, domainId ? [domainId] : []);
  const scored = rows.map((row) => {
    const haystack = normalizeText(`${row.title} ${row.topic} ${row.summary} ${row.text} ${row.keywords}`);
    let score = 0;
    terms.forEach((term) => {
      const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const matches = haystack.match(re);
      if (matches) score += matches.length;
    });
    if (row.domain_status === "active") score += 0.25;
    if (row.card_status === "active") score += 0.25;
    return {
      ...row,
      score,
      objectRefs: parseJsonArray(row.object_refs),
      metricRefs: parseJsonArray(row.metric_refs),
      ruleRefs: parseJsonArray(row.rule_refs),
      evidencePolicy: row.domain_status === "active" ? "usable_as_local_evidence" : "candidate_only_draft"
    };
  }).filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.card_id.localeCompare(b.card_id))
    .slice(0, limit);
  return {
    query,
    terms,
    answerable: scored.length > 0,
    policy: "local_kb_evidence_only_no_provider_call",
    results: scored,
    doesNotProve: scored.length
      ? ["本地检索只能证明知识库存在相关证据，不能证明 ERP/积加生产数据当前状态。"]
      : ["当前本地知识库没有命中足够证据；这不代表业务规则错误，只表示当前索引证据不足。"]
  };
}

function localAiChat(body) {
  const question = requireText(body.question || body.query || "");
  const search = searchKnowledge({ query: question, limit: body.limit || 6, domainId: body.domainId || "" });
  const top = search.results.slice(0, 4);
  const activeEvidence = top.filter((item) => item.evidencePolicy === "usable_as_local_evidence");
  const draftEvidence = top.filter((item) => item.evidencePolicy !== "usable_as_local_evidence");
  const answer = top.length
    ? [
        `本地知识库命中 ${top.length} 条证据，其中正式/可用本地证据 ${activeEvidence.length} 条，draft 候选证据 ${draftEvidence.length} 条。`,
        `建议优先查看：${top.map((item) => `《${item.title}》`).join("、")}。`,
        "当前回答只基于本地知识库证据，不调用外部模型，不执行 SQL，不读取生产系统。"
      ].join("\n")
    : "未命中足够本地知识库证据。当前无法给出正式回答，只能返回无法证明边界。";
  recordAudit("local_ai_chat", "knowledge_query", makeId("query"), "local_user", {
    question,
    resultCount: top.length,
    policy: search.policy
  });
  const matchedObjects = uniqueValues(top.flatMap((item) => item.objectRefs || []));
  const matchedMetrics = uniqueValues(top.flatMap((item) => item.metricRefs || []));
  const matchedKnowledgeCards = uniqueValues(top.map((item) => item.card_id));
  const trace = createAgentTrace({
    sourceType: "ai_chat_local",
    sourceId: makeId("query"),
    question,
    intent: inferIntent(question),
    matchedObjects,
    matchedMetrics,
    matchedKnowledgeCards,
    matchedLineageEdges: lineageRefsForMetrics(matchedMetrics),
    answerability: top.length > 0 ? "answerable_with_local_evidence" : "insufficient_evidence",
    policy: search.policy,
    publicSteps: [
      { step: "intent_detection", status: "completed", summary: `识别为 ${inferIntent(question)}` },
      { step: "local_knowledge_search", status: "completed", summary: `命中 ${top.length} 条本地证据` },
      { step: "evidence_boundary", status: "completed", summary: "仅使用本地知识库；不调用外部模型、不执行 SQL、不读取生产系统" },
      { step: "answerability", status: top.length > 0 ? "completed" : "blocked", summary: top.length > 0 ? "可以输出本地证据回答草稿" : "证据不足，返回无法证明边界" }
    ]
  });
  const run = createAgentRun({
    scenario: inferIntent(question),
    runType: "local_ai_knowledge_run",
    targetObjectType: matchedObjects[0] || "knowledge",
    targetObjectId: matchedObjects[0] || "knowledge",
    question,
    intent: inferIntent(question),
    status: top.length > 0 ? "completed" : "blocked",
    owner: "local_user",
    inputRefs: [`question:${question}`, ...matchedObjects.map((id) => `object:${id}`)],
    outputRefs: [...matchedKnowledgeCards.map((id) => `knowledge:${id}`), ...matchedMetrics.map((id) => `metric:${id}`)],
    traceIds: [trace.id],
    publicSteps: trace.publicSteps,
    decisionBoundary: "local_kb_only_no_provider_no_sql",
    replayNote: "AI local chat captured as RunTrace."
  });
  return {
    answerable: top.length > 0,
    policy: search.policy,
    answer,
    evidence: top,
    doesNotProve: search.doesNotProve,
    traceId: trace.id,
    trace,
    runId: run.id,
    run,
    nextStep: top.length
      ? "进入对应知识卡核验证据等级、来源路径和 crosswalk 后，再用于指标或 ChatBI 语义治理。"
      : "补充或重新萃取相关知识卡，再运行本地检索。"
  };
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function boundedNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function getDeepSeekConfig() {
  const baseUrl = String(process.env.DEEPSEEK_BASE_URL || deepSeekDefaultBaseUrl).replace(/\/+$/, "");
  const anthropicBaseUrl = String(process.env.DEEPSEEK_ANTHROPIC_BASE_URL || `${deepSeekDefaultBaseUrl}/anthropic`).replace(/\/+$/, "");
  return {
    apiKey: String(process.env.DEEPSEEK_API_KEY || ""),
    baseUrl,
    anthropicBaseUrl,
    model: String(process.env.DEEPSEEK_MODEL || "deepseek-v4-flash"),
    webModel: String(process.env.DEEPSEEK_WEB_MODEL || process.env.DEEPSEEK_MODEL || "deepseek-v4-pro"),
    maxTokens: boundedNumber(process.env.DEEPSEEK_MAX_TOKENS, 1200, 128, 8000),
    timeoutMs: boundedNumber(process.env.DEEPSEEK_TIMEOUT_MS, 45000, 5000, 120000),
    webSearchEnabled: envFlag("DEEPSEEK_ENABLE_WEB_SEARCH", true),
    providerCallAuthorized: envFlag("SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED", false)
  };
}

function safeUrlHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return "invalid_url";
  }
}

function getDeepSeekStatus() {
  const config = getDeepSeekConfig();
  return {
    configured: Boolean(config.apiKey),
    providerCallAuthorized: config.providerCallAuthorized,
    databaseWriteAuthorized,
    available: Boolean(config.apiKey) && config.providerCallAuthorized && databaseWriteAuthorized,
    provider: "deepseek",
    baseUrlHost: safeUrlHost(config.baseUrl),
    anthropicBaseUrlHost: safeUrlHost(config.anthropicBaseUrl),
    model: config.model,
    webModel: config.webModel,
    webSearchEnabled: config.webSearchEnabled,
    modes: [
      {
        id: "knowledge",
        label: "知识库",
        policy: "deepseek_knowledge_rag_provider_call_no_web_no_external_write"
      },
      {
        id: "web",
        label: "联网",
        policy: "deepseek_web_search_provider_call_no_external_write"
      }
    ],
    secretPolicy: "server_side_env_only_key_never_returned_to_browser"
  };
}

function normalizeDeepSeekMode(value) {
  return value === "web" ? "web" : "knowledge";
}

function truncateText(value, maxLength = 4000) {
  const textValue = String(value || "").trim();
  if (textValue.length <= maxLength) return textValue;
  return `${textValue.slice(0, maxLength)}...`;
}

function sanitizeChatMessages(messages, fallbackQuestion) {
  const source = Array.isArray(messages) && messages.length
    ? messages
    : [{ role: "user", content: fallbackQuestion }];
  return source
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: truncateText(message?.content || "", 3000),
      createdAt: message?.createdAt || nowIso()
    }))
    .filter((message) => message.content)
    .slice(-16);
}

function latestUserQuestion(messages, fallback) {
  const reversed = [...messages].reverse();
  const match = reversed.find((message) => message.role === "user" && message.content);
  return requireText(match?.content || fallback || "供应链治理问题");
}

function formatKnowledgeContext(evidence) {
  if (!evidence.length) return "未命中本地知识库证据。";
  return evidence.map((item, index) => {
    return [
      `证据 ${index + 1}: ${item.title}`,
      `domain=${item.domain_name}; topic=${item.topic}; policy=${item.evidencePolicy}; source=${item.source_path}`,
      `summary=${truncateText(item.summary || "", 500)}`,
      `text=${truncateText(item.text || "", 1200)}`
    ].join("\n");
  }).join("\n\n");
}

function deepSeekSystemPrompt({ mode, evidence }) {
  const context = formatKnowledgeContext(evidence);
  const common = [
    "你是 AIP-SCM 供应链治理工作台中的资深供应链、AI 与 Palantir Ontology 应用顾问。",
    "回答必须区分事实、推断和不确定项；不能把本地知识库或联网资料说成 ERP/OMS/WMS 当前生产事实。",
    "不得要求或执行外部系统写回；不得输出密钥、凭据、token、个人隐私或生产敏感明细。",
    "如果证据不足，要明确说明无法证明的边界，并给出下一步治理动作。",
    "回答用中文，面向供应链 Owner 和数据治理 Owner，结论先行。"
  ];
  const modePolicy = mode === "web"
    ? [
        "当前模式是联网模式：可以结合 Web Search 结果和下方本地知识库上下文。",
        "引用外部信息时要说明这是外部资料，不得直接覆盖本项目知识库和指标口径。"
      ]
    : [
        "当前模式是知识库模式：只使用下方本地知识库上下文和用户提供的对话历史回答。",
        "不得声称已经联网搜索；不得编造未给出的来源。"
      ];
  return [...common, ...modePolicy, "本地知识库上下文如下：", context].join("\n");
}

function providerErrorMessage(payload, fallback = "DeepSeek provider returned a non-OK response.") {
  if (payload && typeof payload === "object") {
    const message = payload.error?.message || payload.message || payload.error;
    if (message) return String(message).slice(0, 500);
  }
  return String(payload || fallback).slice(0, 500);
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function callDeepSeekKnowledgeMode({ config, messages, systemPrompt }) {
  const response = await fetchWithTimeout(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((message) => ({ role: message.role, content: message.content }))
      ],
      stream: false,
      max_tokens: config.maxTokens,
      temperature: 0.2,
      user_id: "scm_workbench"
    })
  }, config.timeoutMs);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(providerErrorMessage(payload));
  const choice = payload.choices?.[0];
  return {
    answer: String(choice?.message?.content || "").trim(),
    model: payload.model || config.model,
    finishReason: choice?.finish_reason || "",
    usage: payload.usage || null,
    providerPayloadTypes: ["chat.completion"]
  };
}

function extractAnthropicResponse(payload) {
  const content = Array.isArray(payload.content) ? payload.content : [];
  const textParts = [];
  const citations = [];
  const providerPayloadTypes = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    if (item.type) providerPayloadTypes.push(item.type);
    if (item.type === "text" && item.text) {
      textParts.push(String(item.text));
      if (Array.isArray(item.citations)) citations.push(...item.citations);
    }
    if (item.type === "web_search_tool_result" && Array.isArray(item.content)) {
      for (const result of item.content) {
        if (result?.url || result?.title) {
          citations.push({
            title: result.title || "",
            url: result.url || "",
            source: "deepseek_web_search"
          });
        }
      }
    }
  }
  return {
    answer: textParts.join("\n").trim(),
    citations,
    providerPayloadTypes: uniqueValues(providerPayloadTypes)
  };
}

async function callDeepSeekWebMode({ config, messages, systemPrompt }) {
  const body = {
    model: config.webModel,
    max_tokens: config.maxTokens,
    temperature: 0.2,
    system: systemPrompt,
    messages: messages.map((message) => ({
      role: message.role,
      content: [{ type: "text", text: message.content }]
    })),
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3
      }
    ]
  };
  const response = await fetchWithTimeout(`${config.anthropicBaseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  }, config.timeoutMs);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(providerErrorMessage(payload));
  const extracted = extractAnthropicResponse(payload);
  return {
    ...extracted,
    model: payload.model || config.webModel,
    finishReason: payload.stop_reason || "",
    usage: payload.usage || null
  };
}

async function deepSeekAiChat(body) {
  const config = getDeepSeekConfig();
  if (!config.apiKey) {
    const error = new Error("DeepSeek API key is not configured. Set DEEPSEEK_API_KEY in the server environment or ignored .env.local.");
    error.statusCode = 503;
    throw error;
  }
  if (!config.providerCallAuthorized) {
    const error = new Error("DeepSeek provider calls are not authorized. Set SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1 in the server environment after explicit approval.");
    error.statusCode = 403;
    throw error;
  }
  const mode = normalizeDeepSeekMode(body.mode);
  if (mode === "web" && !config.webSearchEnabled) {
    const error = new Error("DeepSeek web search mode is disabled by DEEPSEEK_ENABLE_WEB_SEARCH.");
    error.statusCode = 400;
    throw error;
  }
  const fallbackQuestion = String(body.question || body.query || "");
  const messages = sanitizeChatMessages(body.messages, fallbackQuestion);
  const question = latestUserQuestion(messages, fallbackQuestion);
  const search = searchKnowledge({ query: question, limit: body.limit || 6, domainId: body.domainId || "" });
  const evidence = search.results.slice(0, 5);
  const systemPrompt = deepSeekSystemPrompt({ mode, evidence });
  const provider = mode === "web"
    ? await callDeepSeekWebMode({ config, messages, systemPrompt })
    : await callDeepSeekKnowledgeMode({ config, messages, systemPrompt });
  const answer = provider.answer || "DeepSeek 未返回可展示文本。";
  const assistantMessage = { role: "assistant", content: answer, createdAt: nowIso() };
  const matchedObjects = uniqueValues(evidence.flatMap((item) => item.objectRefs || []));
  const matchedMetrics = uniqueValues(evidence.flatMap((item) => item.metricRefs || []));
  const matchedKnowledgeCards = uniqueValues(evidence.map((item) => item.card_id));
  const policy = mode === "web"
    ? "deepseek_web_search_provider_call_no_external_write"
    : "deepseek_knowledge_rag_provider_call_no_web_no_external_write";
  const sourceId = makeId("deepseek");
  recordAudit("deepseek_ai_chat", "knowledge_query", sourceId, "local_user", {
    mode,
    model: provider.model,
    evidenceCount: evidence.length,
    providerPayloadTypes: provider.providerPayloadTypes || [],
    policy
  });
  const publicSteps = [
    { step: "intent_detection", status: "completed", summary: `识别为 ${inferIntent(question)}` },
    { step: "local_knowledge_context", status: evidence.length ? "completed" : "blocked", summary: `注入 ${evidence.length} 条本地知识库证据` },
    { step: "provider_call", status: "completed", summary: `DeepSeek ${mode === "web" ? "联网" : "知识库"}模式返回模型回答` },
    { step: "evidence_boundary", status: "completed", summary: mode === "web" ? "允许联网资料；不写回 ERP/OMS/WMS；本地证据与外部资料分层" : "仅使用本地知识库上下文；不启用 Web Search；不写回外部系统" }
  ];
  const trace = createAgentTrace({
    sourceType: "deepseek_ai_chat",
    sourceId,
    question,
    intent: inferIntent(question),
    matchedObjects,
    matchedMetrics,
    matchedKnowledgeCards,
    matchedLineageEdges: lineageRefsForMetrics(matchedMetrics),
    answerability: provider.answer ? "provider_answer_returned" : "provider_empty_answer",
    policy,
    publicSteps
  });
  const run = createAgentRun({
    scenario: inferIntent(question),
    runType: mode === "web" ? "deepseek_web_chat_run" : "deepseek_knowledge_chat_run",
    targetObjectType: matchedObjects[0] || "knowledge",
    targetObjectId: matchedObjects[0] || "knowledge",
    question,
    intent: inferIntent(question),
    status: provider.answer ? "completed" : "blocked",
    owner: "local_user",
    inputRefs: [`question:${question}`, ...matchedObjects.map((id) => `object:${id}`)],
    outputRefs: [...matchedKnowledgeCards.map((id) => `knowledge:${id}`), ...matchedMetrics.map((id) => `metric:${id}`)],
    traceIds: [trace.id],
    publicSteps,
    decisionBoundary: mode === "web"
      ? "provider_call_with_web_search_no_erp_oms_wms_writeback"
      : "provider_call_with_local_kb_context_no_web_no_erp_oms_wms_writeback",
    replayNote: "DeepSeek chat captured as RunTrace; API key is not stored in ledger."
  });
  return {
    answerable: Boolean(provider.answer),
    provider: "deepseek",
    mode,
    model: provider.model,
    finishReason: provider.finishReason,
    policy,
    answer,
    messages: [...messages, assistantMessage],
    evidence,
    searchSummary: {
      answerable: search.answerable,
      resultCount: search.results.length,
      policy: search.policy,
      doesNotProve: search.doesNotProve
    },
    citations: provider.citations || [],
    usage: provider.usage,
    providerPayloadTypes: provider.providerPayloadTypes || [],
    doesNotProve: [
      "DeepSeek 回答不能证明 ERP/OMS/WMS 当前生产状态。",
      mode === "web" ? "联网资料只能作为外部参考，不能替代本项目认证指标和本体口径。" : "知识库模式没有启用 Web Search，不能证明最新互联网事实。",
      "本次对话不会写回任何外部系统，也不会导入业务明细行。"
    ],
    traceId: trace.id,
    trace,
    runId: run.id,
    run,
    nextStep: mode === "web"
      ? "把联网结论中可复用的供应链规则沉淀为候选知识卡，再进入人工 review。"
      : "把 DeepSeek 基于本地证据生成的回答与知识卡证据等级核对后，再用于 ChatBI 语义治理。"
  };
}

function getKpiTree() {
  const metrics = all(`
    SELECT metrics.id AS id, code, name, level, l1_domain, l2_group, parent_metric_id
    FROM metrics
    LEFT JOIN kpi_tree ON metrics.id = kpi_tree.child_metric_id
    ORDER BY level, metrics.id
  `);
  const byId = Object.fromEntries(metrics.map((metric) => [metric.id, { ...metric, children: [] }]));
  const roots = [];
  metrics.forEach((metric) => {
    const node = byId[metric.id];
    if (metric.parent_metric_id && byId[metric.parent_metric_id]) {
      byId[metric.parent_metric_id].children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

const levelOrder = { L0: 0, L1: 1, L2: 2, L3: 3 };

function inferMetricObjects(metric) {
  const text = `${metric.name || ""} ${metric.code || ""} ${metric.l1_domain || ""} ${metric.l2_group || ""} ${metric.formula || ""} ${metric.grain || ""} ${metric.definition || ""}`.toLowerCase();
  const rules = [
    ["sku", ["sku", "msku", "fnsku", "商品"]],
    ["listing", ["listing", "asin", "店铺", "销量", "销售"]],
    ["supplier", ["supplier", "供应商", "采购", "po"]],
    ["po", ["po", "采购订单"]],
    ["warehouse", ["warehouse", "仓库", "库位", "仓储"]],
    ["inventory_batch", ["inventory", "batch", "库存", "库龄", "可售", "不可售"]],
    ["shipment", ["shipment", "物流", "货件", "头程", "运输", "eta"]],
    ["cost_event", ["cost", "成本", "费用", "金额"]],
    ["return_order", ["return", "退货", "逆向", "售后"]],
    ["forecast_version", ["forecast", "预测", "计划"]]
  ];
  const matched = rules.filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword))).map(([objectId]) => objectId);
  return matched.length ? matched.slice(0, 3) : ["sku"];
}

function getKpiGraph() {
  const metrics = all(`
    SELECT id, code, name, level, metric_type, l1_domain, l2_group, formula, grain, direction, owner, lifecycle_status, certification_status, definition
    FROM metrics
    ORDER BY CASE level WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 ELSE 3 END, l1_domain, l2_group, id
  `);
  const treeEdges = all("SELECT parent_metric_id AS source, child_metric_id AS target, relation_type, weight, governance_note FROM kpi_tree ORDER BY id");
  const byLevel = metrics.reduce((acc, metric) => {
    acc[metric.level] = acc[metric.level] || [];
    acc[metric.level].push(metric);
    return acc;
  }, {});
  const levelX = { L0: 80, L1: 390, L2: 720, L3: 1080 };
  const nodes = metrics.map((metric) => {
    const index = byLevel[metric.level].findIndex((item) => item.id === metric.id);
    return {
      ...metric,
      label: metric.name,
      x: levelX[metric.level] || 80,
      y: 70 + index * 82,
      kind: "metric",
      objectIds: inferMetricObjects(metric)
    };
  });
  const objects = all("SELECT id, name, object_type, owner, status FROM ontology_objects ORDER BY object_type, id");
  const primaryMetricNodes = metrics.filter((metric) => metric.level === "L1" || metric.level === "L2");
  const objectNodes = [
    ...objects.map((object, index) => ({
      id: `object:${object.id}`,
      objectId: object.id,
      label: object.name,
      name: object.name,
      level: "Object",
      object_type: object.object_type,
      owner: object.owner,
      status: object.status,
      kind: "object",
      x: 120,
      y: 90 + index * 92
    })),
    ...primaryMetricNodes.map((metric, index) => ({
      ...metric,
      id: `metric:${metric.id}`,
      metricId: metric.id,
      label: metric.name,
      kind: "metric",
      x: 540 + (levelOrder[metric.level] || 0) * 260,
      y: 90 + index * 72,
      objectIds: inferMetricObjects(metric)
    }))
  ];
  const objectEdges = [];
  primaryMetricNodes.forEach((metric) => {
    inferMetricObjects(metric).forEach((objectId) => {
      objectEdges.push({
        source: `object:${objectId}`,
        target: `metric:${metric.id}`,
        relation_type: "MEASURED_BY",
        governance_note: "Inferred from metric grain/domain/formula keywords."
      });
    });
  });
  return {
    nodes,
    edges: treeEdges,
    objectGraph: {
      nodes: objectNodes,
      edges: objectEdges
    },
    meta: {
      nodeCount: nodes.length,
      edgeCount: treeEdges.length,
      objectNodeCount: objectNodes.length,
      objectEdgeCount: objectEdges.length
    }
  };
}

function getObject360(objectId) {
  const object = get("SELECT * FROM ontology_objects WHERE id = ?", [objectId]);
  if (!object) return null;
  const outboundLinks = all("SELECT * FROM ontology_links WHERE source_object_id = ? ORDER BY link_type, target_object_id", [objectId]);
  const inboundLinks = all("SELECT * FROM ontology_links WHERE target_object_id = ? ORDER BY link_type, source_object_id", [objectId]);
  const tags = all("SELECT * FROM tags WHERE target_object_id = ? ORDER BY lifecycle_status, id", [objectId]);
  const dimensions = all("SELECT * FROM dimensions WHERE bound_object_id = ? ORDER BY lifecycle_status, id", [objectId]);
  const keyword = objectId.replaceAll("_", " ");
  const metrics = all(
    `SELECT * FROM metrics
     WHERE lower(grain || ' ' || formula || ' ' || definition || ' ' || name || ' ' || l1_domain || ' ' || l2_group) LIKE ?
     ORDER BY CASE level WHEN 'L0' THEN 0 WHEN 'L1' THEN 1 WHEN 'L2' THEN 2 ELSE 3 END, id
     LIMIT 30`,
    [`%${keyword.toLowerCase().split(" ")[0]}%`]
  );
  const metricIds = metrics.map((metric) => metric.id);
  const taskTargets = metricIds.length ? metricIds : [objectId];
  const placeholders = taskTargets.map(() => "?").join(",");
  const tasks = all(
    `SELECT * FROM governance_tasks WHERE target_ref IN (${placeholders}) OR target_ref LIKE ? ORDER BY priority, status, id LIMIT 30`,
    [...taskTargets, `%${objectId}%`]
  );
  const recommendations = all(
    `SELECT * FROM recommendation_cards
     WHERE target_object_id = ? OR target_object_type = ? OR linked_metric_ids LIKE ?
     ORDER BY risk_level, approval_status, updated_at DESC
     LIMIT 20`,
    [objectId, objectId, `%${objectId}%`]
  ).map(hydrateRecommendationCard);
  const traces = all(
    `SELECT * FROM agent_traces
     WHERE matched_objects LIKE ? OR matched_metrics LIKE ?
     ORDER BY created_at DESC
     LIMIT 12`,
    [`%${objectId}%`, `%${objectId}%`]
  ).map(hydrateAgentTrace);
  const agentRuns = all(
    `SELECT * FROM agent_runs
     WHERE target_object_id = ? OR target_object_type = ? OR input_refs LIKE ? OR output_refs LIKE ?
     ORDER BY started_at DESC
     LIMIT 12`,
    [objectId, objectId, `%${objectId}%`, `%${objectId}%`]
  ).map(hydrateAgentRun);
  const sourceCoverage = getSourceCoverage(new URL(`http://local/api/source-coverage?objectType=${encodeURIComponent(objectId)}`));
  return {
    object,
    outboundLinks,
    inboundLinks,
    tags,
    dimensions,
    metrics,
    tasks,
    recommendations,
    traces,
    agentRuns,
    sourceCoverage,
    summary: {
      relationCount: outboundLinks.length + inboundLinks.length,
      tagCount: tags.length,
      dimensionCount: dimensions.length,
      metricCount: metrics.length,
      taskCount: tasks.length,
      recommendationCount: recommendations.length,
      traceCount: traces.length,
      agentRunCount: agentRuns.length,
      sourceCoverageCount: sourceCoverage.length
    }
  };
}

function getChatbiContext() {
  return all(`
    SELECT c.*, m.code, m.name, m.definition, m.formula, m.grain, m.direction
    FROM chatbi_contexts c
    JOIN metrics m ON m.id = c.metric_id
    ORDER BY m.l1_domain, m.code
  `);
}

function dryRunChatbi(question) {
  const dryRunQuestion = requireText(question, "供应链治理");
  const contexts = getChatbiContext();
  const normalized = dryRunQuestion.toLowerCase();
  const knowledgeEvidence = searchKnowledge({ query: dryRunQuestion, limit: 5 });
  const knowledgeEvidenceSummary = {
    answerable: knowledgeEvidence.answerable,
    resultCount: knowledgeEvidence.results.length,
    policy: knowledgeEvidence.policy,
    doesNotProve: knowledgeEvidence.doesNotProve
  };
  const matched = contexts.filter((context) => {
    return [context.code, context.name, context.definition, context.question_sample]
      .filter(Boolean)
      .some((value) => normalized.includes(String(value).toLowerCase()) || String(value).includes(dryRunQuestion));
  });
  const fallback = contexts.filter((context) => {
    return normalized.includes("库存") && String(context.name).includes("库存");
  });
  const candidates = matched.length ? matched : fallback.slice(0, 5);
  if (!candidates.length) {
    const matchedObjects = uniqueValues(knowledgeEvidence.results.flatMap((item) => item.objectRefs || []));
    const matchedMetrics = uniqueValues(knowledgeEvidence.results.flatMap((item) => item.metricRefs || []));
    const matchedKnowledgeCards = uniqueValues(knowledgeEvidence.results.map((item) => item.card_id));
    const trace = createAgentTrace({
      sourceType: "chatbi_dry_run",
      sourceId: makeId("dryrun"),
      question: dryRunQuestion,
      intent: inferIntent(dryRunQuestion),
      matchedObjects,
      matchedMetrics,
      matchedKnowledgeCards,
      matchedLineageEdges: [],
      answerability: "not_answerable_by_certified_metric",
      policy: "certified_metric_only",
      publicSteps: [
        { step: "intent_detection", status: "completed", summary: `识别为 ${inferIntent(dryRunQuestion)}` },
        { step: "certified_metric_match", status: "blocked", summary: "未命中 certified metric context" },
        { step: "knowledge_companion_search", status: knowledgeEvidence.answerable ? "completed" : "blocked", summary: `本地知识证据 ${knowledgeEvidence.results.length} 条` },
        { step: "answerability", status: "blocked", summary: "ChatBI V0 拒绝把候选知识证据升级为正式指标答案" }
      ]
    });
    const run = createAgentRun({
      scenario: inferIntent(dryRunQuestion),
      runType: "chatbi_certification_gate",
      targetObjectType: matchedObjects[0] || "chatbi",
      targetObjectId: matchedObjects[0] || "chatbi",
      question: dryRunQuestion,
      intent: inferIntent(dryRunQuestion),
      status: "blocked",
      owner: "ChatBI Governance",
      inputRefs: [`question:${dryRunQuestion}`, ...matchedObjects.map((id) => `object:${id}`)],
      outputRefs: [...matchedKnowledgeCards.map((id) => `knowledge:${id}`), ...matchedMetrics.map((id) => `candidate_metric:${id}`)],
      traceIds: [trace.id],
      publicSteps: trace.publicSteps,
      decisionBoundary: "certified_metric_only_refuse_unverified_answer",
      replayNote: "Blocked ChatBI dry-run captured as RunTrace."
    });
    return {
      answerable: false,
      policy: "certified_metric_only",
      rejectReason: knowledgeEvidence.answerable
        ? "本地知识库存在相关证据，但未命中认证指标。ChatBI V0 不能把知识库候选证据升级为正式指标答案。"
        : "未命中认证指标。ChatBI V0 不对未认证指标或原始表做自由 NL2SQL。",
      evidence: [],
      knowledgeEvidenceSummary,
      knowledgeEvidence,
      traceId: trace.id,
      trace,
      runId: run.id,
      run,
      candidates: []
    };
  }
  const matchedMetricRefs = uniqueValues(candidates.flatMap((context) => [context.metric_id, context.code, context.name]));
  const matchedObjects = uniqueValues(knowledgeEvidence.results.flatMap((item) => item.objectRefs || []));
  const matchedKnowledgeCards = uniqueValues(knowledgeEvidence.results.map((item) => item.card_id));
  const trace = createAgentTrace({
    sourceType: "chatbi_dry_run",
    sourceId: makeId("dryrun"),
    question: dryRunQuestion,
    intent: inferIntent(dryRunQuestion),
    matchedObjects,
    matchedMetrics: matchedMetricRefs,
    matchedKnowledgeCards,
    matchedLineageEdges: lineageRefsForMetrics(candidates.map((context) => context.metric_id)),
    answerability: "answerable_by_certified_metric",
    policy: "certified_metric_only",
    publicSteps: [
      { step: "intent_detection", status: "completed", summary: `识别为 ${inferIntent(dryRunQuestion)}` },
      { step: "certified_metric_match", status: "completed", summary: `命中 ${candidates.length} 个 certified metric context` },
      { step: "knowledge_companion_search", status: knowledgeEvidence.answerable ? "completed" : "blocked", summary: `伴随知识证据 ${knowledgeEvidence.results.length} 条` },
      { step: "answerability", status: "completed", summary: "仅返回指标口径、可用维度和证据链，不执行真实 SQL" }
    ]
  });
  const run = createAgentRun({
    scenario: inferIntent(dryRunQuestion),
    runType: "chatbi_certified_metric_dry_run",
    targetObjectType: matchedObjects[0] || "metric",
    targetObjectId: matchedObjects[0] || candidates[0].metric_id,
    question: dryRunQuestion,
    intent: inferIntent(dryRunQuestion),
    status: "completed",
    owner: "ChatBI Governance",
    inputRefs: [`question:${dryRunQuestion}`, ...matchedObjects.map((id) => `object:${id}`)],
    outputRefs: [...candidates.map((context) => `metric:${context.metric_id}`), ...matchedKnowledgeCards.map((id) => `knowledge:${id}`)],
    traceIds: [trace.id],
    publicSteps: trace.publicSteps,
    decisionBoundary: "certified_metric_only_no_free_nl2sql",
    replayNote: "ChatBI dry-run captured as RunTrace."
  });
  return {
    answerable: true,
    policy: "certified_metric_only",
    rejectReason: "",
    answerPreview: "已命中认证指标。V0 仅返回指标口径、可用维度与证据链，不执行真实 SQL。",
    knowledgeEvidenceSummary,
    knowledgeEvidence,
    traceId: trace.id,
    trace,
    runId: run.id,
    run,
    candidates: candidates.map((context) => ({
      metricId: context.metric_id,
      code: context.code,
      name: context.name,
      formula: context.formula,
      grain: context.grain,
      allowedDimensions: JSON.parse(context.allowed_dimensions || "[]"),
      evidenceChain: JSON.parse(context.evidence_chain || "[]")
    }))
  };
}

function serveStatic(req, res) {
  if (!existsSync(distPath)) {
    json(res, { error: "Static build not found. Run `npm run build`, or use `npm run dev:web` for Vite." }, 404);
    return;
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const path = resolve(distPath, requested);
  const safePath = path.startsWith(distPath) && existsSync(path) && statSync(path).isFile() ? path : join(distPath, "index.html");
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".md": "text/markdown; charset=utf-8"
  };
  res.writeHead(200, { "Content-Type": types[extname(safePath)] || "application/octet-stream" });
  createReadStream(safePath).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api")) {
      if (req.method === "POST" && !databaseWriteAuthorized && url.pathname !== "/api/knowledge/search") {
        return json(res, {
          error: "Local SQLite writes are not authorized. Set SCM_DATABASE_WRITES_AUTHORIZED=1 only for an explicitly approved disposable or local write-enabled flow."
        }, 403);
      }
      if (req.method === "GET" && url.pathname === "/api/deploy/health") return json(res, getDeployHealth());
      if (req.method === "GET" && url.pathname === "/api/workbench/modules") return json(res, getWorkbenchModules());
      const workbenchModule = url.pathname.match(/^\/api\/workbench\/([^/]+)$/);
      if (req.method === "GET" && workbenchModule) {
        const payload = getWorkbenchModule(workbenchModule[1]);
        return payload ? json(res, payload) : json(res, { error: "Workbench module not found" }, 404);
      }
      if (req.method === "GET" && url.pathname === "/api/governance/overview") return json(res, getOverview());
	      if (req.method === "GET" && url.pathname === "/api/source-coverage") return json(res, getSourceCoverage(url));
	      if (req.method === "GET" && url.pathname === "/api/source-coverage/lineage") return json(res, getSourceCoverageLineage(url));
	      if (req.method === "GET" && url.pathname === "/api/source-coverage/owner-usage-policy") return json(res, getOmsWmsOwnerUsagePolicy());
	      if (req.method === "GET" && url.pathname === "/api/risk-threshold-governance") return json(res, getRiskThresholdGovernance());
	      if (req.method === "GET" && url.pathname === "/api/finance-cost-governance") return json(res, getFinanceCostGovernance());
	      if (req.method === "GET" && url.pathname === "/api/runtime-import/metadata-projection") return json(res, runtimeMetadataProjection);
	      if (req.method === "GET" && url.pathname === "/api/runtime-import/business-row-design-gate") return json(res, getRuntimeBusinessRowDesignGate());
      if (req.method === "GET" && url.pathname === "/api/ontology/objects") return json(res, all("SELECT * FROM ontology_objects ORDER BY object_type, id"));
      if (req.method === "GET" && url.pathname === "/api/ontology/links") return json(res, all("SELECT * FROM ontology_links ORDER BY id"));
      if (req.method === "GET" && url.pathname === "/api/ontology/instances") return json(res, getObjectInstances(url));
      if (req.method === "GET" && url.pathname === "/api/ontology/instance-links") return json(res, all("SELECT * FROM ontology_instance_links ORDER BY source_instance_id, link_type, target_instance_id"));
      const instanceMatch = url.pathname.match(/^\/api\/ontology\/instances\/([^/]+)$/);
      if (req.method === "GET" && instanceMatch) {
        const payload = getObjectInstance(decodeURIComponent(instanceMatch[1]));
        return payload ? json(res, payload) : json(res, { error: "Object instance not found" }, 404);
      }
      const object360Match = url.pathname.match(/^\/api\/ontology\/object-360\/([^/]+)$/);
      if (req.method === "GET" && object360Match) {
        const payload = getObject360(decodeURIComponent(object360Match[1]));
        return payload ? json(res, payload) : json(res, { error: "Ontology object not found" }, 404);
      }
      if (req.method === "GET" && url.pathname === "/api/tags") return json(res, all("SELECT * FROM tags ORDER BY lifecycle_status, id"));
      if (req.method === "GET" && url.pathname === "/api/dimensions") return json(res, all("SELECT * FROM dimensions ORDER BY dimension_type, id"));
      if (req.method === "GET" && url.pathname === "/api/metrics") return json(res, getMetrics(url));
      const metricMatch = url.pathname.match(/^\/api\/metrics\/([^/]+)$/);
      if (req.method === "GET" && metricMatch) {
        const metric = getMetricByRef(decodeURIComponent(metricMatch[1]));
        return metric ? json(res, metric) : json(res, { error: "Metric not found" }, 404);
      }
      if (req.method === "GET" && url.pathname === "/api/kpi-tree") return json(res, getKpiTree());
      if (req.method === "GET" && url.pathname === "/api/kpi-tree/graph") return json(res, getKpiGraph());
      if (req.method === "GET" && url.pathname === "/api/lineage") return json(res, all("SELECT * FROM lineage_edges ORDER BY status, edge_type LIMIT 1000"));
      if (req.method === "GET" && url.pathname === "/api/governance/tasks") return json(res, all("SELECT * FROM governance_tasks ORDER BY priority, status, id LIMIT 500"));
      if (req.method === "GET" && url.pathname === "/api/knowledge/domains") return json(res, all("SELECT * FROM knowledge_domains ORDER BY status, id"));
      if (req.method === "GET" && url.pathname === "/api/knowledge/evidence-quality-review") return json(res, getAiKnowledgeEvidenceQualityReview());
      if (req.method === "GET" && url.pathname === "/api/knowledge/support") return json(res, getKnowledgeSupport(url));
      if (req.method === "GET" && url.pathname === "/api/knowledge/cards") return json(res, getKnowledgeCards(url));
      const knowledgeCardMatch = url.pathname.match(/^\/api\/knowledge\/cards\/([^/]+)$/);
      if (req.method === "GET" && knowledgeCardMatch) {
        const card = getKnowledgeCard(decodeURIComponent(knowledgeCardMatch[1]));
        return card ? json(res, card) : json(res, { error: "Knowledge card not found" }, 404);
      }
      if (req.method === "GET" && url.pathname === "/api/ai-chat/deepseek/status") return json(res, getDeepSeekStatus());
      if (req.method === "GET" && url.pathname === "/api/chatbi/context") return json(res, getChatbiContext());
      if (req.method === "GET" && url.pathname === "/api/decision/action-tasks") return json(res, all("SELECT * FROM action_tasks ORDER BY status, id"));
      if (req.method === "GET" && url.pathname === "/api/decision/logs") return json(res, all("SELECT * FROM decision_logs ORDER BY status, id"));
      if (req.method === "GET" && url.pathname === "/api/decision/receipt-summary") return json(res, getDecisionReceiptSummary());
      if (req.method === "GET" && url.pathname === "/api/agent-traces") return json(res, getAgentTraces(url));
      if (req.method === "GET" && url.pathname === "/api/trace-reviews") return json(res, getTraceReviews(url));
      const agentTraceMatch = url.pathname.match(/^\/api\/agent-traces\/([^/]+)$/);
      if (req.method === "GET" && agentTraceMatch) {
        const trace = hydrateAgentTrace(get("SELECT * FROM agent_traces WHERE id = ?", [agentTraceMatch[1]]));
        return trace ? json(res, trace) : json(res, { error: "Agent trace not found" }, 404);
      }
      if (req.method === "GET" && url.pathname === "/api/agent-runs") return json(res, getAgentRuns(url));
      const agentRunMatch = url.pathname.match(/^\/api\/agent-runs\/([^/]+)$/);
      if (req.method === "GET" && agentRunMatch) {
        const runRecord = hydrateAgentRun(get("SELECT * FROM agent_runs WHERE id = ?", [agentRunMatch[1]]));
        return runRecord ? json(res, runRecord) : json(res, { error: "Agent run not found" }, 404);
      }
      if (req.method === "GET" && url.pathname === "/api/aip-scenarios") return json(res, getAipScenarios(url));
      const scenarioMatch = url.pathname.match(/^\/api\/aip-scenarios\/([^/]+)$/);
      if (req.method === "GET" && scenarioMatch) {
        const scenario = getAipScenario(decodeURIComponent(scenarioMatch[1]));
        return scenario ? json(res, scenario) : json(res, { error: "AIP scenario not found" }, 404);
      }
      if (req.method === "GET" && url.pathname === "/api/recommendation-cards") return json(res, getRecommendationCards(url));
      const recommendationMatch = url.pathname.match(/^\/api\/recommendation-cards\/([^/]+)$/);
      if (req.method === "GET" && recommendationMatch) {
        const card = hydrateRecommendationCard(get("SELECT * FROM recommendation_cards WHERE id = ?", [recommendationMatch[1]]));
        return card ? json(res, card) : json(res, { error: "Recommendation card not found" }, 404);
      }
      const ledgerMatch = url.pathname.match(/^\/api\/ledger\/([^/]+)\/([^/]+)$/);
      if (req.method === "GET" && ledgerMatch) {
        return json(res, getLedger(decodeURIComponent(ledgerMatch[1]), decodeURIComponent(ledgerMatch[2])));
      }
      const exportMatch = url.pathname.match(/^\/api\/exports\/([^/]+)$/);
      if ((req.method === "GET" || req.method === "HEAD") && exportMatch) {
        const job = get("SELECT * FROM export_jobs WHERE id = ?", [exportMatch[1]]);
        if (!job) return json(res, { error: "Export job not found" }, 404);
        if (req.method === "HEAD") {
          res.writeHead(200, {
            "Content-Type": job.mime_type,
            "Content-Disposition": `attachment; filename="${job.file_name}"`,
            "Content-Length": Buffer.byteLength(job.content)
          });
          return res.end();
        }
        return text(res, job.content, {
          "Content-Type": job.mime_type,
          "Content-Disposition": `attachment; filename="${job.file_name}"`
        });
      }
      if (req.method === "POST" && url.pathname === "/api/chatbi/dry-run") {
        const body = await readBody(req);
        return json(res, dryRunChatbi(body.question));
      }
      if (req.method === "POST" && url.pathname === "/api/knowledge/search") {
        const body = await readBody(req);
        return json(res, searchKnowledge(body));
      }
      if (req.method === "POST" && url.pathname === "/api/ai-chat/local") {
        const body = await readBody(req);
        return json(res, localAiChat(body));
      }
      if (req.method === "POST" && url.pathname === "/api/ai-chat/deepseek") {
        const body = await readBody(req);
        return json(res, await deepSeekAiChat(body));
      }
      if (req.method === "POST" && url.pathname === "/api/annotations") {
        const body = await readBody(req);
        const annotation = createAnnotation(body);
        return json(res, { ok: true, annotation, ledger: getLedger(annotation.target_type, annotation.target_id) }, 201);
      }
      if (req.method === "POST" && url.pathname === "/api/comments") {
        const body = await readBody(req);
        const comment = createComment(body);
        return json(res, { ok: true, comment, ledger: getLedger(comment.target_type, comment.target_id) }, 201);
      }
      if (req.method === "POST" && url.pathname === "/api/revision-proposals") {
        const body = await readBody(req);
        const revisionProposal = createRevisionProposal(body);
        return json(res, { ok: true, revisionProposal, ledger: getLedger(revisionProposal.target_type, revisionProposal.target_id) }, 201);
      }
      if (req.method === "POST" && url.pathname === "/api/exports") {
        const body = await readBody(req);
        return json(res, { ok: true, exportJob: createExportJob(body) }, 201);
      }
      if (req.method === "POST" && url.pathname === "/api/agent-traces") {
        const body = await readBody(req);
        return json(res, { ok: true, trace: createAgentTrace(body) }, 201);
      }
      const traceReview = url.pathname.match(/^\/api\/agent-traces\/([^/]+)\/review$/);
      if (req.method === "POST" && traceReview) {
        const body = await readBody(req);
        const payload = reviewAgentTrace(traceReview[1], body);
        return payload ? json(res, { ok: true, ...payload }, 201) : json(res, { error: "Agent trace not found" }, 404);
      }
      if (req.method === "POST" && url.pathname === "/api/agent-runs") {
        const body = await readBody(req);
        return json(res, { ok: true, run: createAgentRun(body) }, 201);
      }
      const scenarioDiagnostic = url.pathname.match(/^\/api\/aip-scenarios\/([^/]+)\/run-diagnostic$/);
      if (req.method === "POST" && scenarioDiagnostic) {
        const body = await readBody(req);
        const payload = runScenarioDiagnostic(decodeURIComponent(scenarioDiagnostic[1]), body);
        return payload ? json(res, { ok: true, ...payload }, 201) : json(res, { error: "AIP scenario not found" }, 404);
      }
      if (req.method === "POST" && url.pathname === "/api/recommendation-cards") {
        const body = await readBody(req);
        return json(res, { ok: true, recommendationCard: createRecommendationCard(body) }, 201);
      }
      const recommendationReview = url.pathname.match(/^\/api\/recommendation-cards\/([^/]+)\/review$/);
      if (req.method === "POST" && recommendationReview) {
        const body = await readBody(req);
        const card = reviewRecommendationCard(recommendationReview[1], body);
        return card ? json(res, { ok: true, recommendationCard: card }) : json(res, { error: "Recommendation card not found" }, 404);
      }
      const recommendationConvert = url.pathname.match(/^\/api\/recommendation-cards\/([^/]+)\/convert-action-task$/);
      if (req.method === "POST" && recommendationConvert) {
        const body = await readBody(req);
        const payload = convertRecommendationCardToAction(recommendationConvert[1], body);
        return payload ? json(res, { ok: true, ...payload }, 201) : json(res, { error: "Recommendation card not found" }, 404);
      }
      if (req.method === "POST" && url.pathname === "/api/decision/logs") {
        const body = await readBody(req);
        const id = body.id || makeId("decision");
        insertDecisionLog(id, body);
        recordAudit("owner_decision_recorded", "decision_log", id, body.actor || "供应链数据治理 Owner", body);
        return json(res, { ok: true, decisionLog: get("SELECT * FROM decision_logs WHERE id = ?", [id]) }, 201);
      }
      const taskReview = url.pathname.match(/^\/api\/governance\/tasks\/([^/]+)\/review$/);
      if (req.method === "POST" && taskReview) {
        const body = await readBody(req);
        const status = body.status || "reviewed";
        const note = body.note || "";
        run("UPDATE governance_tasks SET status = ?, notes = notes || ? WHERE id = ?", [status, note ? `\nReview: ${note}` : "", taskReview[1]]);
        recordAudit("governance_task_reviewed", "governance_task", taskReview[1], body.actor || "供应链数据治理 Owner", { status, note });
        return json(res, { ok: true, task: get("SELECT * FROM governance_tasks WHERE id = ?", [taskReview[1]]) });
      }
if (req.method === "POST" && url.pathname === "/api/decision/action-task") {
        const body = await readBody(req);
        const id = `action_${Date.now()}`;
        insertActionTask(id, body);
        recordAudit("action_task_created", "action_task", id, body.actor || "供应链数据治理 Owner", body);
        return json(res, { ok: true, task: get("SELECT * FROM action_tasks WHERE id = ?", [id]) }, 201);
      }
      return json(res, { error: "API route not found" }, 404);
    }
    serveStatic(req, res);
  } catch (error) {
    json(res, { error: error.message }, error.statusCode || 500);
  }
});

function insertActionTask(id, body) {
  run(
    "INSERT INTO action_tasks (id, insight_ref, action_name, owner, status, approval_required, replay_note) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      body.insightRef || "manual",
      body.actionName || "治理动作",
      body.owner || "供应链数据治理 Owner",
      "pending_approval",
      1,
      body.replayNote || "Suggestion + approval + replay only."
    ]
  );
}

server.listen(port, host, () => {
  console.log(`SCM governance workbench API listening on http://${host}:${port}`);
});
