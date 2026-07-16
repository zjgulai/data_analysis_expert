import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dbPath = resolve(root, "data/governance_workbench.sqlite");
const temporaryDbPath = resolve(root, "data", `governance_workbench.sqlite.build-${process.pid}`);
const summaryPath = resolve(root, "data/import-summary.json");
const metricBlueprintFile = "supply-chain-metric-system-l0-l3-blueprint-mece-v2-20260618.json";
const fieldMappingFile = "supply-chain-metric-stage2-field-mapping-template-20260618.csv";
const p0SignoffFile = "supply-chain-metric-mece-v2-p0-owner-signoff-task-list-20260618.csv";
const defaultSourceRoot = resolve(root, "../../analysis/business-supply-chain-knowledge-base-draft-20260616/metric-system-blueprint");
const importMigrationFiles = [
  "20260627_b3_t7_additive_schema.apply.sql",
  "20260627_b6_rbac_action_tiering.apply.sql",
  "20260701_loop3_business_closed_loops.apply.sql"
];
const databaseRebuildAuthorized = ["1", "true", "yes", "on"].includes(
  String(process.env.SCM_DATABASE_REBUILD_AUTHORIZED || "").toLowerCase()
);

if (!databaseRebuildAuthorized) {
  throw new Error(
    "Database rebuild is not authorized. Set SCM_DATABASE_REBUILD_AUTHORIZED=1 only after backing up or explicitly approving replacement of the local SQLite ledger."
  );
}

function sourceCandidateStatus(sourceRoot, configuredBy) {
  const requiredFiles = [
    { role: "metric_blueprint", path: resolve(sourceRoot, metricBlueprintFile) }
  ].map((file) => ({ ...file, exists: existsSync(file.path) }));
  const optionalFiles = [
    { role: "field_mapping", path: resolve(sourceRoot, fieldMappingFile) },
    { role: "p0_owner_signoff", path: resolve(sourceRoot, p0SignoffFile) }
  ].map((file) => ({ ...file, exists: existsSync(file.path) }));

  return {
    sourceRoot,
    configuredBy,
    sourceRootExists: existsSync(sourceRoot),
    ready: requiredFiles.every((file) => file.exists),
    requiredFiles,
    optionalFiles
  };
}

function resolveImportSource() {
  const candidates = [
    ["SCM_WORKBENCH_IMPORT_SOURCE_ROOT", process.env.SCM_WORKBENCH_IMPORT_SOURCE_ROOT],
    ["SCM_IMPORT_SOURCE_ROOT", process.env.SCM_IMPORT_SOURCE_ROOT],
    ["repository_default", defaultSourceRoot]
  ];
  const seen = new Set();
  const statuses = [];
  for (const [configuredBy, configuredPath] of candidates) {
    if (!configuredPath) continue;
    const sourceRoot = resolve(configuredPath);
    if (seen.has(sourceRoot)) continue;
    seen.add(sourceRoot);
    statuses.push(sourceCandidateStatus(sourceRoot, configuredBy));
  }
  return { selected: statuses.find((status) => status.ready), statuses };
}

const sourceResolution = resolveImportSource();
if (!sourceResolution.selected) {
  console.error(JSON.stringify({
    status: "blocked_source_required",
    message: "Metric blueprint source is required before opening or writing local SQLite.",
    envOverrideOrder: ["SCM_WORKBENCH_IMPORT_SOURCE_ROOT", "SCM_IMPORT_SOURCE_ROOT"],
    candidates: sourceResolution.statuses
  }, null, 2));
  process.exit(2);
}

const sourceRoot = sourceResolution.selected.sourceRoot;
const metricJsonPath = resolve(sourceRoot, metricBlueprintFile);
const fieldMappingPath = resolve(sourceRoot, fieldMappingFile);
const p0SignoffPath = resolve(sourceRoot, p0SignoffFile);
const migrationStatuses = importMigrationFiles.map((file) => ({
  file,
  path: resolve(root, "migrations", file),
  exists: existsSync(resolve(root, "migrations", file))
}));

if (migrationStatuses.some((migration) => !migration.exists)) {
  console.error(JSON.stringify({
    status: "blocked_migration_required",
    message: "All allowlisted migrations are required before opening or rebuilding local SQLite.",
    migrations: migrationStatuses
  }, null, 2));
  process.exit(2);
}

if (process.env.SCM_IMPORT_PREFLIGHT_ONLY === "1") {
  console.log(JSON.stringify({
    status: "preflight_ok",
    sourceRoot,
    configuredBy: sourceResolution.selected.configuredBy,
    files: sourceResolution.selected,
    migrations: migrationStatuses
  }, null, 2));
  process.exit(0);
}

const importMigrations = migrationStatuses.map((migration) => ({
  file: migration.file,
  sql: readFileSync(migration.path, "utf8")
}));

mkdirSync(resolve(root, "data"), { recursive: true });
rmSync(temporaryDbPath, { force: true });
const db = new DatabaseSync(temporaryDbPath);
let databaseReplaced = false;
process.on("exit", () => {
  if (databaseReplaced) return;
  try {
    db.close();
  } catch {
    // The database may already be closed after a failed atomic rename.
  }
  rmSync(temporaryDbPath, { force: true });
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted && char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(value);
      value = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [headers, ...body] = rows;
  return body.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function execMany(sql) {
  db.exec(sql);
}

function insert(table, record) {
  const keys = Object.keys(record);
  const placeholders = keys.map(() => "?").join(", ");
  const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`);
  stmt.run(...keys.map((key) => record[key]));
}

const lifecycle = ["draft", "mapped", "reviewed", "certified", "active", "deprecated"];
const metricPayload = JSON.parse(readFileSync(metricJsonPath, "utf8"));
const metrics = metricPayload.metrics;
const l3Metrics = metrics.filter((metric) => metric.level === "L3");
const fieldMappings = existsSync(fieldMappingPath) ? parseCsv(readFileSync(fieldMappingPath, "utf8")) : [];
const signoffRows = existsSync(p0SignoffPath) ? parseCsv(readFileSync(p0SignoffPath, "utf8")) : [];
const certifiedCodes = new Set([
  "business_available_qty",
  "sku_oos_rate",
  "stockout_loss_amount",
  "supplier_otif_rate",
  "transfer_success_rate",
  "supply_chain_total_cost_rate",
  "full_chain_turnover_days_amount",
  "inventory_sync_delay_minutes"
]);

execMany(`
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS ontology_objects;
DROP TABLE IF EXISTS ontology_links;
DROP TABLE IF EXISTS ontology_object_instances;
DROP TABLE IF EXISTS ontology_instance_links;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS dimensions;
DROP TABLE IF EXISTS metrics;
DROP TABLE IF EXISTS metric_dimensions;
DROP TABLE IF EXISTS kpi_tree;
DROP TABLE IF EXISTS lineage_edges;
DROP TABLE IF EXISTS governance_tasks;
DROP TABLE IF EXISTS certifications;
DROP TABLE IF EXISTS chatbi_contexts;
DROP TABLE IF EXISTS decision_logs;
DROP TABLE IF EXISTS action_tasks;
DROP TABLE IF EXISTS annotations;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS revision_proposals;
DROP TABLE IF EXISTS export_jobs;
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS knowledge_domains;
DROP TABLE IF EXISTS knowledge_cards;
DROP TABLE IF EXISTS knowledge_chunks;
DROP TABLE IF EXISTS knowledge_crosswalks;
DROP TABLE IF EXISTS agent_traces;
DROP TABLE IF EXISTS trace_reviews;
DROP TABLE IF EXISTS recommendation_cards;
DROP TABLE IF EXISTS agent_runs;
DROP TABLE IF EXISTS aip_scenarios;

CREATE TABLE ontology_objects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  object_type TEXT NOT NULL,
  grain TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE ontology_links (
  id TEXT PRIMARY KEY,
  source_object_id TEXT NOT NULL,
  target_object_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  business_meaning TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE ontology_object_instances (
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

CREATE TABLE ontology_instance_links (
  id TEXT PRIMARY KEY,
  source_instance_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  target_instance_id TEXT NOT NULL,
  evidence_level TEXT NOT NULL,
  note TEXT NOT NULL
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tag_type TEXT NOT NULL,
  target_object_id TEXT NOT NULL,
  rule_expression TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL,
  owner TEXT NOT NULL,
  quality_status TEXT NOT NULL
);

CREATE TABLE dimensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dimension_type TEXT NOT NULL,
  hierarchy TEXT NOT NULL,
  bound_object_id TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL,
  owner TEXT NOT NULL
);

CREATE TABLE metrics (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  l1_domain TEXT NOT NULL,
  l2_group TEXT NOT NULL,
  formula TEXT NOT NULL,
  grain TEXT NOT NULL,
  direction TEXT NOT NULL,
  owner TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL,
  certification_status TEXT NOT NULL,
  source_status TEXT NOT NULL,
  definition TEXT NOT NULL
);

CREATE TABLE metric_dimensions (
  id TEXT PRIMARY KEY,
  metric_id TEXT NOT NULL,
  dimension_id TEXT NOT NULL,
  compatibility_status TEXT NOT NULL
);

CREATE TABLE kpi_tree (
  id TEXT PRIMARY KEY,
  parent_metric_id TEXT NOT NULL,
  child_metric_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  weight REAL,
  governance_note TEXT NOT NULL
);

CREATE TABLE lineage_edges (
  id TEXT PRIMARY KEY,
  source_ref TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  confidence REAL,
  evidence TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE governance_tasks (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date TEXT,
  notes TEXT NOT NULL
);

CREATE TABLE certifications (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL,
  asset_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  certified_by TEXT,
  evidence TEXT NOT NULL
);

CREATE TABLE chatbi_contexts (
  id TEXT PRIMARY KEY,
  metric_id TEXT NOT NULL,
  question_sample TEXT NOT NULL,
  allowed_dimensions TEXT NOT NULL,
  evidence_chain TEXT NOT NULL,
  answer_policy TEXT NOT NULL
);

CREATE TABLE decision_logs (
  id TEXT PRIMARY KEY,
  insight_title TEXT NOT NULL,
  linked_metric_id TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  action_boundary TEXT NOT NULL,
  status TEXT NOT NULL,
  review_note TEXT NOT NULL
);

CREATE TABLE action_tasks (
  id TEXT PRIMARY KEY,
  insight_ref TEXT NOT NULL,
  action_name TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  approval_required INTEGER NOT NULL,
  replay_note TEXT NOT NULL
);

CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE revision_proposals (
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

CREATE TABLE export_jobs (
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

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE knowledge_domains (
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

CREATE TABLE knowledge_cards (
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

CREATE TABLE knowledge_chunks (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  keywords TEXT NOT NULL,
  evidence_level TEXT NOT NULL,
  source_path TEXT NOT NULL
);

CREATE TABLE knowledge_crosswalks (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  confidence REAL NOT NULL,
  note TEXT NOT NULL
);

CREATE TABLE agent_traces (
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

CREATE TABLE trace_reviews (
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

CREATE TABLE recommendation_cards (
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

CREATE TABLE agent_runs (
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

CREATE TABLE aip_scenarios (
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
`);

const objects = [
  ["sku", "SKU", "master_object", "canonical_product_key", "商品主数据 Owner", "active", "跨平台商品统一对象，承接 SKU/MSKU/FNSKU/GTIN/ASIN 映射。"],
  ["listing", "Listing", "channel_object", "platform + site + asin/item_id", "渠道运营 Owner", "active", "前台销售承载对象，连接 SKU、站点、价格、广告和缺货风险。"],
  ["supplier", "Supplier", "partner_object", "supplier_id", "采购 Owner", "active", "供应商对象，承接交付、质量、TCO 和风险标签。"],
  ["po", "Purchase Order", "transaction_object", "po_no + po_line", "采购 Owner", "active", "采购订单对象，连接供应商、SKU、交付和成本。"],
  ["purchase_plan", "Purchase Plan", "planning_object", "plan_id + version", "计划 Owner", "draft", "采购和补货计划对象，承接目标库存和建议采购。"],
  ["warehouse", "Warehouse", "location_object", "warehouse_id", "仓储 Owner", "active", "仓库对象，承接库存、库容、入库、出库和履约。"],
  ["inventory_batch", "Inventory Batch", "inventory_object", "batch_no + sku + warehouse", "库存 Owner", "mapped", "库存批次对象，连接 SKU、仓库、库龄、良残状态和追溯。"],
  ["shipment", "Shipment", "logistics_object", "shipment_no", "物流 Owner", "active", "头程/调拨货件对象，连接 PO、仓库、路线、ETA 和费用。"],
  ["container", "Container", "logistics_object", "container_no", "物流 Owner", "mapped", "集装箱对象，连接货件、PO 行和运输节点。"],
  ["parcel", "Parcel", "fulfillment_object", "tracking_no", "尾程 Owner", "mapped", "包裹对象，承接尾程轨迹、妥投、停滞和拒收。"],
  ["sales_order", "Sales Order", "sales_object", "order_id", "销售运营 Owner", "mapped", "销售订单对象，连接 Listing、SKU、发货和退货。"],
  ["return_order", "Return Order", "reverse_object", "return_order_id", "售后 Owner", "mapped", "退货/补发/销毁和恢复对象。"],
  ["cost_event", "Cost Event", "finance_object", "cost_event_id", "财务 Owner", "mapped", "成本事件对象，承接采购、头程、仓储、尾程、逆向费用。"],
  ["forecast_version", "Forecast Version", "planning_object", "forecast_version + period", "计划 Owner", "draft", "预测版本对象，连接预测、销售、补货和断货风险。"]
];

objects.forEach(([id, name, object_type, grain, owner, status, description]) => {
  insert("ontology_objects", { id, name, object_type, grain, owner, status, description });
});

[
  ["link_sku_listing", "sku", "listing", "SUPPORTS_SALES", "SKU 支撑前台 Listing 销售。"],
  ["link_sku_supplier", "sku", "supplier", "SUPPLIED_BY", "SKU 由供应商供货。"],
  ["link_po_supplier", "po", "supplier", "FULFILLED_BY", "PO 由供应商履约。"],
  ["link_po_shipment", "po", "shipment", "LOADED_INTO", "PO 行装入货件或运输单。"],
  ["link_shipment_warehouse", "shipment", "warehouse", "ARRIVES_AT", "货件运输到目标仓。"],
  ["link_batch_sku", "inventory_batch", "sku", "BELONGS_TO", "库存批次归属 SKU。"],
  ["link_batch_warehouse", "inventory_batch", "warehouse", "STORED_IN", "库存批次存放于仓库。"],
  ["link_return_order", "return_order", "sales_order", "RECOVERS_FROM", "退货单来自销售订单。"],
  ["link_cost_po", "cost_event", "po", "ALLOCATED_TO", "成本事件可归因到 PO 或 SKU。"],
  ["link_forecast_sku", "forecast_version", "sku", "FORECASTS", "预测版本作用于 SKU。"]
].forEach(([id, source_object_id, target_object_id, link_type, business_meaning]) => {
  insert("ontology_links", { id, source_object_id, target_object_id, link_type, business_meaning, status: "active" });
});

const objectInstances = [
  {
    id: "sku_momcozy_pump_s12",
    object_type_id: "sku",
    business_key: "SKU-MC-PUMP-S12",
    display_name: "Momcozy S12 Pro Breast Pump",
    status: "active",
    owner: "商品主数据 Owner",
    properties: { category: "breast pump", lifecycle: "core", abcClass: "A", platformSku: "MC-S12-US" },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  },
  {
    id: "sku_momcozy_bottle_warmer",
    object_type_id: "sku",
    business_key: "SKU-MC-WARMER-01",
    display_name: "Momcozy Bottle Warmer",
    status: "active",
    owner: "商品主数据 Owner",
    properties: { category: "feeding", lifecycle: "growth", abcClass: "B", platformSku: "MC-FEED-US" },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  },
  {
    id: "warehouse_fba_us_west",
    object_type_id: "warehouse",
    business_key: "FBA-US-WEST",
    display_name: "FBA US West",
    status: "active",
    owner: "仓储 Owner",
    properties: { warehouseType: "FBA", country: "US", region: "West", platform: "Amazon" },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  },
  {
    id: "warehouse_3pl_us_nj",
    object_type_id: "warehouse",
    business_key: "3PL-US-NJ",
    display_name: "US NJ 3PL Warehouse",
    status: "active",
    owner: "仓储 Owner",
    properties: { warehouseType: "3PL", country: "US", region: "East", platform: "omni-channel" },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  },
  {
    id: "supplier_suzhou_motor",
    object_type_id: "supplier",
    business_key: "SUP-SZ-MOTOR",
    display_name: "Suzhou Motor Supplier",
    status: "active",
    owner: "采购 Owner",
    properties: { supplierTier: "strategic", leadTimeDays: 35, riskLevel: "medium" },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  },
  {
    id: "po_202606_s12_001",
    object_type_id: "po",
    business_key: "PO-202606-S12-001",
    display_name: "PO S12 June Replenishment",
    status: "open",
    owner: "采购 Owner",
    properties: { orderedQty: 3600, receivedQty: 1800, eta: "2026-07-05", deliveryStatus: "partial_received" },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  },
  {
    id: "shipment_fba_us_202606_01",
    object_type_id: "shipment",
    business_key: "SHIP-FBA-US-202606-01",
    display_name: "FBA US First-leg Shipment 202606-01",
    status: "in_transit",
    owner: "物流 Owner",
    properties: { eta: "2026-06-30", origin: "Yantian", destination: "FBA US West", trackingStatus: "eta_risk" },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  },
  {
    id: "batch_fba_negative_available",
    object_type_id: "inventory_batch",
    business_key: "BATCH-FBA-NEG-001",
    display_name: "FBA negative available batch",
    status: "exception_review",
    owner: "库存运营 Owner",
    properties: { onHandQty: 120, reservedQty: 168, availableQty: -48, batchAgeDays: 26, qualityStatus: "sellable" },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  },
  {
    id: "batch_stockout_risk_s12",
    object_type_id: "inventory_batch",
    business_key: "BATCH-S12-OOS-001",
    display_name: "S12 stockout risk batch",
    status: "risk_review",
    owner: "计划 Owner",
    properties: { onHandQty: 420, reservedQty: 280, availableQty: 140, coverageDays: 8, dailySalesQty: 52 },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  },
  {
    id: "batch_aged_overstock_warmer",
    object_type_id: "inventory_batch",
    business_key: "BATCH-WARMER-AGE-001",
    display_name: "Bottle warmer aged overstock batch",
    status: "clearance_review",
    owner: "库存运营 Owner",
    properties: { onHandQty: 920, availableQty: 880, batchAgeDays: 137, storageFeeRate: 0.18, coverageDays: 96 },
    source_system: "seeded_demo",
    evidence_level: "prototype_seed"
  }
];

objectInstances.forEach((record) => {
  insert("ontology_object_instances", {
    ...record,
    properties: JSON.stringify(record.properties),
    created_at: new Date().toISOString()
  });
});

[
  ["inst_link_batch_neg_sku", "batch_fba_negative_available", "BELONGS_TO", "sku_momcozy_pump_s12", "prototype_seed", "负可用样本批次归属 S12 核心 SKU。"],
  ["inst_link_batch_neg_wh", "batch_fba_negative_available", "STORED_IN", "warehouse_fba_us_west", "prototype_seed", "负可用样本发生在 FBA US West。"],
  ["inst_link_batch_oos_sku", "batch_stockout_risk_s12", "BELONGS_TO", "sku_momcozy_pump_s12", "prototype_seed", "断货风险批次归属 S12 核心 SKU。"],
  ["inst_link_batch_oos_wh", "batch_stockout_risk_s12", "STORED_IN", "warehouse_fba_us_west", "prototype_seed", "断货风险发生在 FBA 仓。"],
  ["inst_link_batch_age_sku", "batch_aged_overstock_warmer", "BELONGS_TO", "sku_momcozy_bottle_warmer", "prototype_seed", "超储批次归属 Bottle Warmer SKU。"],
  ["inst_link_batch_age_wh", "batch_aged_overstock_warmer", "STORED_IN", "warehouse_3pl_us_nj", "prototype_seed", "超储批次存放在 3PL 仓。"],
  ["inst_link_po_supplier", "po_202606_s12_001", "FULFILLED_BY", "supplier_suzhou_motor", "prototype_seed", "S12 补货 PO 由供应商履约。"],
  ["inst_link_po_shipment", "po_202606_s12_001", "LOADED_INTO", "shipment_fba_us_202606_01", "prototype_seed", "S12 补货 PO 装入头程货件。"],
  ["inst_link_shipment_wh", "shipment_fba_us_202606_01", "ARRIVES_AT", "warehouse_fba_us_west", "prototype_seed", "货件到达 FBA US West。"]
].forEach(([id, source_instance_id, link_type, target_instance_id, evidence_level, note]) => {
  insert("ontology_instance_links", { id, source_instance_id, link_type, target_instance_id, evidence_level, note });
});

[
  ["time", "时间", "time", "date > week > month > quarter > year", "forecast_version", "active", "数据治理 Owner"],
  ["platform", "平台", "enum", "platform > site > shop", "listing", "active", "渠道运营 Owner"],
  ["channel", "渠道", "enum", "channel > store", "listing", "active", "渠道运营 Owner"],
  ["country", "国家/区域", "hierarchy", "region > country > state", "warehouse", "active", "物流 Owner"],
  ["category", "品类", "hierarchy", "category_l1 > category_l2 > sku", "sku", "active", "商品 Owner"],
  ["warehouse", "仓库", "hierarchy", "warehouse_type > warehouse > bin", "warehouse", "active", "仓储 Owner"],
  ["supplier", "供应商", "enum", "supplier_group > supplier", "supplier", "mapped", "采购 Owner"],
  ["sku", "SKU", "identity", "product > sku > platform_sku", "sku", "mapped", "商品 Owner"],
  ["logistics_channel", "物流渠道", "enum", "mode > carrier > service_level", "shipment", "mapped", "物流 Owner"],
  ["abc_class", "ABC 分层", "tag_dimension", "A/B/C by value and velocity", "sku", "draft", "库存 Owner"]
].forEach(([id, name, dimension_type, hierarchy, bound_object_id, lifecycle_status, owner]) => {
  insert("dimensions", { id, name, dimension_type, hierarchy, bound_object_id, lifecycle_status, owner });
});

[
  ["tag_hot_sku", "爆款 SKU", "rule", "sku", "sales_velocity >= threshold AND contribution_rank <= 20%", "draft", "商品运营 Owner", "needs_threshold"],
  ["tag_slow_moving", "滞销库存", "rule", "inventory_batch", "slow_moving_inventory_ratio > threshold_version", "draft", "库存运营 Owner", "needs_threshold"],
  ["tag_oos_high_risk", "断货高危", "rule", "sku", "stock_cover_days_qty < target_stock_days", "draft", "计划 Owner", "needs_validation"],
  ["tag_supplier_delay_risk", "供应商延期风险", "stat", "supplier", "supplier_otif_rate < threshold_version", "draft", "采购 Owner", "needs_owner_review"],
  ["tag_route_congestion", "物流拥堵风险", "stat", "shipment", "eta_deviation_days > threshold_version", "draft", "物流 Owner", "needs_owner_review"],
  ["tag_negative_available", "负可用库存异常", "rule", "inventory_batch", "business_available_qty < 0", "mapped", "库存 Owner", "needs_exception_policy"],
  ["tag_mapping_risk", "SKU 映射风险", "rule", "sku", "sku_mapping_one_to_many_rate > 0 OR unmatched_planned_inventory_qty > 0", "mapped", "数据治理 Owner", "needs_resolution"],
  ["tag_cost_outlier", "成本异常", "stat", "cost_event", "logistics_estimate_actual_variance_rate outside threshold_version", "draft", "财务 Owner", "needs_validation"]
].forEach(([id, name, tag_type, target_object_id, rule_expression, lifecycle_status, owner, quality_status]) => {
  insert("tags", { id, name, tag_type, target_object_id, rule_expression, lifecycle_status, owner, quality_status });
});

function inferMetricType(metric) {
  if (metric.level === "L0") return "composite";
  if (metric.level === "L1" || metric.level === "L2") return "domain_node";
  if (metric.formula?.includes("score(") || metric.formula?.includes("weighted")) return "composite";
  if (metric.formula?.includes("/") || metric.formula?.includes("-") || metric.formula?.includes("+")) return "derived";
  return "atomic";
}

function ownerFor(metric) {
  const domain = metric.l1_domain || metric.name || "";
  if (domain.includes("采购")) return "采购与供应商 Owner";
  if (domain.includes("库存")) return "库存运营 Owner";
  if (domain.includes("仓储")) return "仓储运营 Owner";
  if (domain.includes("物流")) return "物流运营 Owner";
  if (domain.includes("成本")) return "财务/成本 Owner";
  if (domain.includes("逆向")) return "售后运营 Owner";
  if (domain.includes("治理")) return "数据治理 Owner";
  if (domain.includes("计划")) return "计划 Owner";
  return "供应链数据治理 Owner";
}

function lifecycleFor(metric) {
  if (metric.level !== "L3") return "active";
  if (certifiedCodes.has(metric.metric_code)) return "certified";
  if (metric.source_status === "added_by_mece_audit") return "draft";
  return "mapped";
}

metrics.forEach((metric) => {
  const lifecycle_status = lifecycleFor(metric);
  insert("metrics", {
    id: metric.metric_id,
    code: metric.metric_code || metric.metric_id,
    name: metric.name,
    level: metric.level,
    metric_type: inferMetricType(metric),
    l1_domain: metric.l1_domain || metric.name,
    l2_group: metric.l2_group || "",
    formula: metric.formula || "",
    grain: metric.grain || "",
    direction: metric.direction || "diagnostic",
    owner: ownerFor(metric),
    lifecycle_status,
    certification_status: lifecycle_status === "certified" ? "certified" : "not_certified",
    source_status: metric.source_status || "blueprint_node",
    definition: metric.definition || metric.name
  });
});

const dimensionRules = [
  ["time", /period|date|time|month|week|day|snapshot|forecast_version|version/i],
  ["platform", /platform|site|shop/i],
  ["channel", /channel|store/i],
  ["country", /country|region/i],
  ["category", /category|sku_group/i],
  ["warehouse", /warehouse|bin/i],
  ["supplier", /supplier|po_no|po_line/i],
  ["sku", /sku|msku|fnsku|gtin|business_key|source_sku_key/i],
  ["logistics_channel", /carrier|route|shipment|logistics|service_level/i],
  ["abc_class", /abc/i]
];

l3Metrics.forEach((metric) => {
  const grain = metric.grain || "";
  dimensionRules.forEach(([dimensionId, pattern]) => {
    if (pattern.test(grain)) {
      insert("metric_dimensions", {
        id: `${metric.metric_id}_${dimensionId}`,
        metric_id: metric.metric_id,
        dimension_id: dimensionId,
        compatibility_status: lifecycleFor(metric) === "certified" ? "certified" : "candidate"
      });
    }
  });
});

metrics.filter((metric) => metric.parent_id).forEach((metric) => {
  insert("kpi_tree", {
    id: `tree_${metric.metric_id}`,
    parent_metric_id: metric.parent_id,
    child_metric_id: metric.metric_id,
    relation_type: metric.level === "L3" ? "DECOMPOSED_TO" : "CONTAINS",
    weight: null,
    governance_note: "Imported from MECE V2 parent_id."
  });
});

fieldMappings.forEach((row, index) => {
  const metric = metrics.find((item) => item.metric_code === row.metric_code);
  if (!metric) return;
  insert("lineage_edges", {
    id: `lineage_field_${index + 1}`,
    source_ref: row.source_fields || `${row.source_system || "unknown_source"}.${row.source_table || "pending_field"}`,
    target_ref: metric.metric_id,
    edge_type: "MAPPED_TO",
    confidence: row.mapping_status === "已映射" ? 0.9 : 0.3,
    evidence: row.notes || "Imported from field mapping template.",
    status: row.mapping_status || "待确认"
  });
});

metrics.filter((metric) => metric.level === "L3").forEach((metric) => {
  insert("lineage_edges", {
    id: `lineage_formula_${metric.metric_id}`,
    source_ref: metric.formula || "formula_pending",
    target_ref: metric.metric_id,
    edge_type: "FORMULA_DEFINITION",
    confidence: 0.7,
    evidence: "Imported from MECE V2 formula.",
    status: lifecycleFor(metric)
  });
});

signoffRows.forEach((row, index) => {
  insert("governance_tasks", {
    id: `signoff_${index + 1}`,
    task_type: "owner_signoff",
    target_ref: row.metric_id,
    title: `P0 指标签字：${row.name || row.metric_code}`,
    owner: row.owner || "待确认",
    status: row.signoff_status || "未发起",
    priority: "P0",
    due_date: row.target_date || "",
    notes: row.confirm_focus || row.notes || "P0 owner signoff required."
  });
});

fieldMappings.slice(0, 80).forEach((row, index) => {
  insert("governance_tasks", {
    id: `mapping_${index + 1}`,
    task_type: "field_mapping",
    target_ref: row.metric_id,
    title: `字段映射确认：${row.name || row.metric_code}`,
    owner: row.owner || "数据治理 Owner",
    status: row.mapping_status || "待确认",
    priority: row.priority || "P1",
    due_date: "",
    notes: row.notes || "Confirm source table and source fields."
  });
});

metrics.forEach((metric) => {
  const lifecycle_status = lifecycleFor(metric);
  insert("certifications", {
    id: `cert_${metric.metric_id}`,
    asset_type: "metric",
    asset_ref: metric.metric_id,
    status: lifecycle_status === "certified" ? "certified" : "not_certified",
    certified_by: lifecycle_status === "certified" ? "Governance Seed" : "",
    evidence: lifecycle_status === "certified" ? "Seeded as certified sample for ChatBI dry-run." : "Awaiting owner, lineage, and quality certification."
  });
});

metrics.filter((metric) => certifiedCodes.has(metric.metric_code)).forEach((metric) => {
  const dims = dimensionRules
    .filter(([dimensionId]) => fieldMappings.length >= 0 && metric.grain?.toLowerCase().includes(String(dimensionId).split("_")[0]))
    .map(([dimensionId]) => dimensionId);
  insert("chatbi_contexts", {
    id: `ctx_${metric.metric_id}`,
    metric_id: metric.metric_id,
    question_sample: `如何分析${metric.name}？`,
    allowed_dimensions: JSON.stringify(dims.length ? dims : ["time", "sku", "warehouse"]),
    evidence_chain: JSON.stringify([
      "MECE V2 metric blueprint",
      "field mapping template",
      "certification seed"
    ]),
    answer_policy: "certified_metric_only"
  });
});

[
  ["decision_1", "断货风险治理建议", "SCM-MECE-L3-126", "对断货损失金额高且可售覆盖不足的 SKU 发起补货/调拨评审任务。", "suggestion_review_replay", "review_pending", "Action remains suggestion + approval + replay; no ERP write-back."],
  ["decision_2", "库存资金效率治理建议", "SCM-MECE-L3-036", "对全链条库存资金周转天数恶化的品类发起库存结构复盘。", "suggestion_review_replay", "draft", "Requires finance owner confirmation."],
  ["decision_3", "SKU 映射风险治理建议", "SCM-MECE-L3-137", "对未匹配计划库存数量创建主数据修复任务。", "suggestion_review_replay", "review_pending", "Requires data governance owner approval."],
  ["OMSWMS-001", "OMS/WMS Source Coverage 对象入治理视图", "oms_wms_source_coverage_objects", "确认 SKU、InventoryBatch、SalesOrder、CostEvent 作为第一批 source coverage 对象进入工作台治理视图。", "source_coverage_governance_view_only_no_import", "owner_pending", "Recommended A: governance view only; field dictionary and runtime import remain gated."],
  ["OMSWMS-002", "OMS/WMS Candidate Extension Object 建模", "oms_wms_candidate_extension_objects", "确认 WarehouseTask、SerialNumber、InventoryTransaction、InventoryPosition 作为候选扩展对象进入草稿建模。", "candidate_object_modeling_only_no_runtime_import", "owner_pending", "Recommended A: draft object extension; owner approval required before runtime import."],
  ["OMSWMS-003", "OMS/WMS 字段类支撑风险雷达", "oms_wms_field_class_risk_radar", "确认 OMS/WMS 字段类可支撑风险雷达展示，同时暂缓真实业务行入库。", "field_class_only_no_business_rows_no_runtime_import", "owner_pending", "Recommended A: field-class only; no business detail rows."],
  ["OMSWMS-004", "OMS/WMS Export/API Lineage 入库前置门禁", "oms_wms_export_api_lineage_gate", "确认每个字段类补齐 export/API lineage 后才允许进入正式 runtime import。", "export_api_lineage_required_before_runtime_import", "owner_pending", "Recommended A: lineage required before runtime import."],
  ["RUNTIME-IMPORT-001", "Runtime Import Scope 授权", "runtime_import_scope", "确认第一阶段仅授权 88 个 runtime_projection 字段作为生产可见治理元数据；不包含业务明细行、源系统 API 调用或外部写回。", "metadata_runtime_projection_only_no_business_rows_no_external_write", "owner_pending", "Recommended A: metadata-only runtime projection; business row import remains gated."],
  ["RUNTIME-IMPORT-002", "Sensitive Operational Identifier 策略", "runtime_import_sensitive_identifier_policy", "确认第一阶段排除 sensitive_operational_identifier 字段；敏感运营标识不进入本轮 runtime metadata projection。", "no_sensitive_identifiers_first_stage", "owner_pending", "Recommended A: exclude sensitive operational identifiers from first-stage runtime metadata projection."],
  ["RUNTIME-IMPORT-003", "Risk Threshold Activation 策略", "runtime_import_threshold_activation_policy", "确认风险阈值继续保持 draft-only；仅在 owner 后续确认后再进入 operational scoring。", "thresholds_draft_only_no_operational_scoring", "owner_pending", "Recommended A: keep thresholds draft-only until owner-approved values exist."]
].forEach(([id, insight_title, linked_metric_id, recommendation, action_boundary, status, review_note]) => {
  insert("decision_logs", { id, insight_title, linked_metric_id, recommendation, action_boundary, status, review_note });
});

[
  ["action_1", "decision_1", "发起补货/调拨评审", "计划 Owner", "pending_approval", 1, "No direct write-back; approval task only."],
  ["action_2", "decision_2", "发起库存资金复盘", "财务/成本 Owner", "draft", 1, "Review aged inventory and inventory amount ratio."],
  ["action_3", "decision_3", "发起 SKU 映射修复", "数据治理 Owner", "pending_approval", 1, "Resolve GTIN/MSKU/SKU mapping gaps."]
].forEach(([id, insight_ref, action_name, owner, status, approval_required, replay_note]) => {
  insert("action_tasks", { id, insight_ref, action_name, owner, status, approval_required, replay_note });
});

const seededRecommendations = [
  {
    id: "rec_fba_negative_available_seed",
    scenario: "fba_negative_available_inventory",
    title: "FBA 可用库存为负诊断与复核",
    target_object_type: "inventory_batch",
    target_object_id: "inventory_batch",
    linked_metric_ids: JSON.stringify(["business_available_qty", "inventory_sync_delay_minutes"]),
    linked_knowledge_card_ids: JSON.stringify([]),
    business_impact: "防止把 FBA 负可用库存直接判定为规则错误；先区分 oversell、预留、同步延迟、平台调整和批次状态。",
    confidence_level: "medium",
    risk_level: "P0",
    owner: "库存运营 Owner",
    sla_due_at: "2026-06-27",
    action_options: JSON.stringify(["核对 FBA 独立库存口径", "按 MSKU/FNSKU/仓/快照日期复核", "生成库存同步差异任务"]),
    approval_status: "draft",
    execution_status: "not_started",
    trace_id: "",
    replay_note: "本地建议卡种子；仅用于治理审批和复盘，不写回积加/ERP。",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "rec_stockout_risk_seed",
    scenario: "stockout_risk",
    title: "核心 SKU 断货风险补货/调拨评审",
    target_object_type: "sku",
    target_object_id: "sku",
    linked_metric_ids: JSON.stringify(["sku_oos_rate", "stockout_loss_amount", "business_available_qty"]),
    linked_knowledge_card_ids: JSON.stringify([]),
    business_impact: "对可售覆盖不足且断货损失金额高的 SKU 发起补货、调拨或活动节奏复核。",
    confidence_level: "medium",
    risk_level: "P0",
    owner: "计划 Owner",
    sla_due_at: "2026-06-27",
    action_options: JSON.stringify(["发起补货评审", "检查在途 ETA", "评估跨仓调拨"]),
    approval_status: "review_pending",
    execution_status: "not_started",
    trace_id: "",
    replay_note: "本地建议卡种子；approval 后只生成 action_task。",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "rec_aged_inventory_seed",
    scenario: "aged_inventory_overstock",
    title: "库龄/超储库存清理与补货冻结",
    target_object_type: "inventory_batch",
    target_object_id: "inventory_batch",
    linked_metric_ids: JSON.stringify(["full_chain_turnover_days_amount", "business_available_qty"]),
    linked_knowledge_card_ids: JSON.stringify([]),
    business_impact: "对 90/180 天库龄或高覆盖天数库存建立清库、调拨、补货冻结和复盘任务。",
    confidence_level: "medium",
    risk_level: "P1",
    owner: "库存运营 Owner",
    sla_due_at: "2026-06-30",
    action_options: JSON.stringify(["进入周清库会", "评估促销/调拨", "冻结高风险补货计划"]),
    approval_status: "draft",
    execution_status: "not_started",
    trace_id: "",
    replay_note: "本地建议卡种子；需要 owner 确认阈值版本。",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

seededRecommendations.forEach((record) => insert("recommendation_cards", record));

const seededAgentRuns = [
  {
    id: "run_seed_inventory_exception",
    scenario: "库存异常诊断",
    run_type: "diagnosis_to_recommendation",
    target_object_type: "inventory_batch",
    target_object_id: "inventory_batch",
    question: "FBA 可用库存为负数如何进入治理闭环？",
    intent: "inventory_exception_diagnosis",
    status: "review_ready",
    owner: "库存运营 Owner",
    started_at: new Date().toISOString(),
    completed_at: "",
    input_refs: JSON.stringify(["object:inventory_batch", "metric:business_available_qty", "metric:inventory_sync_delay_minutes"]),
    output_refs: JSON.stringify(["recommendation:rec_fba_negative_available_seed"]),
    trace_ids: JSON.stringify([]),
    recommendation_card_ids: JSON.stringify(["rec_fba_negative_available_seed"]),
    action_task_ids: JSON.stringify([]),
    public_steps: JSON.stringify([
      { step: "identify_object", status: "completed", summary: "绑定 InventoryBatch 与 FBA 可用库存异常样本" },
      { step: "match_metric", status: "completed", summary: "关联业务可用库存与库存同步延迟" },
      { step: "draft_recommendation", status: "completed", summary: "生成建议卡，等待 owner 审核" }
    ]),
    decision_boundary: "suggestion_review_replay_only_no_erp_writeback",
    replay_note: "Seed RunTrace；用于展示从对象/指标到建议卡的治理闭环。"
  },
  {
    id: "run_seed_stockout_risk",
    scenario: "断货风险治理",
    run_type: "object_metric_to_action_review",
    target_object_type: "sku",
    target_object_id: "sku",
    question: "核心 SKU 断货风险如何进入补货/调拨评审？",
    intent: "stockout_risk_governance",
    status: "review_pending",
    owner: "计划 Owner",
    started_at: new Date().toISOString(),
    completed_at: "",
    input_refs: JSON.stringify(["object:sku", "metric:sku_oos_rate", "metric:stockout_loss_amount"]),
    output_refs: JSON.stringify(["recommendation:rec_stockout_risk_seed"]),
    trace_ids: JSON.stringify([]),
    recommendation_card_ids: JSON.stringify(["rec_stockout_risk_seed"]),
    action_task_ids: JSON.stringify([]),
    public_steps: JSON.stringify([
      { step: "identify_object", status: "completed", summary: "绑定 SKU 对象与断货风险指标" },
      { step: "risk_review", status: "review_pending", summary: "等待 owner 判断补货、调拨或活动节奏调整" }
    ]),
    decision_boundary: "approval_required_before_action_task",
    replay_note: "Seed RunTrace；不自动写回计划或采购系统。"
  }
];

seededAgentRuns.forEach((record) => insert("agent_runs", record));

const aipScenarios = [
  {
    id: "scenario_fba_negative_available",
    name: "FBA 可用库存为负",
    scenario_type: "inventory_exception",
    priority: "P0",
    status: "review_ready",
    owner: "库存运营 Owner",
    trigger_condition: "business_available_qty < 0；先复核平台预占、同步延迟、平台调整和批次状态。",
    target_object_type: "inventory_batch",
    target_object_id: "batch_fba_negative_available",
    linked_metric_ids: ["business_available_qty", "inventory_sync_delay_minutes"],
    linked_knowledge_card_ids: ["business-supply-chain-card-0144", "erp-supplement-draft-card-0004"],
    linked_recommendation_card_ids: ["rec_fba_negative_available_seed"],
    diagnostic_question: "FBA 可用库存为负是否代表规则错误，还是业务预占/同步延迟/平台调整导致？",
    decision_boundary: "manual_review_required_no_erp_writeback",
    evidence_level: "prototype_seed_requires_export_validation",
    next_action: "打开对象 360，核对库存流水、平台预占和同步时间，再决定是否生成修复任务。"
  },
  {
    id: "scenario_stockout_risk",
    name: "断货风险治理",
    scenario_type: "availability_risk",
    priority: "P0",
    status: "review_pending",
    owner: "计划 Owner",
    trigger_condition: "coverage_days < 14 或 sku_oos_rate 上升，且 stockout_loss_amount 进入 P0 风险池。",
    target_object_type: "inventory_batch",
    target_object_id: "batch_stockout_risk_s12",
    linked_metric_ids: ["sku_oos_rate", "stockout_loss_amount", "business_available_qty"],
    linked_knowledge_card_ids: ["business-supply-chain-card-0001", "business-supply-chain-card-0002"],
    linked_recommendation_card_ids: ["rec_stockout_risk_seed"],
    diagnostic_question: "核心 SKU 是否需要补货、调拨或活动节奏调整？",
    decision_boundary: "approval_required_before_action_task",
    evidence_level: "prototype_seed_requires_plan_export",
    next_action: "计划 Owner 复核在途 ETA、未交 PO 和活动节奏，批准后生成补货/调拨评审任务。"
  },
  {
    id: "scenario_aged_inventory_overstock",
    name: "库龄/超储风险",
    scenario_type: "inventory_capital_risk",
    priority: "P1",
    status: "draft",
    owner: "库存运营 Owner",
    trigger_condition: "batch_age_days > 90 或 coverage_days > 60，且 storage_fee_rate/库存金额风险升高。",
    target_object_type: "inventory_batch",
    target_object_id: "batch_aged_overstock_warmer",
    linked_metric_ids: ["full_chain_turnover_days_amount", "business_available_qty"],
    linked_knowledge_card_ids: ["business-supply-chain-card-0144", "business-supply-chain-card-0145"],
    linked_recommendation_card_ids: ["rec_aged_inventory_seed"],
    diagnostic_question: "库龄/超储风险是否需要清库、调拨、促销或冻结补货？",
    decision_boundary: "suggestion_review_replay_only_no_writeback",
    evidence_level: "prototype_seed_requires_inventory_age_export",
    next_action: "进入周清库会，复核库龄、仓储费、销售速度和补货计划后形成处置建议。"
  }
];

aipScenarios.forEach((record) => {
  insert("aip_scenarios", {
    ...record,
    linked_metric_ids: JSON.stringify(record.linked_metric_ids),
    linked_knowledge_card_ids: JSON.stringify(record.linked_knowledge_card_ids),
    linked_recommendation_card_ids: JSON.stringify(record.linked_recommendation_card_ids)
  });
});

[
  ["ann_seed_metric", "metric", "SCM-MECE-L3-126", "断货类指标进入 ChatBI 前必须保留样本证据、字段映射和 owner 签字链。", "Governance Seed", "active"],
  ["ann_seed_object", "ontology_object", "inventory_batch", "本体只读。库存批次的结构调整必须通过修订建议进入治理任务，不允许页面直接改对象定义。", "Governance Seed", "active"]
].forEach(([id, target_type, target_id, body, author, status]) => {
  insert("annotations", { id, target_type, target_id, body, author, status, created_at: new Date().toISOString() });
});

[
  ["audit_seed_1", "seed_import", "system", "governance_workbench", "Governance Seed", JSON.stringify({ note: "Sprint A workflow ledger tables initialized." })]
].forEach(([id, event_type, target_type, target_id, actor, payload]) => {
  insert("audit_events", { id, event_type, target_type, target_id, actor, payload, created_at: new Date().toISOString() });
});

const knowledgeDomains = [
  {
    id: "jijia-scm-main",
    name: "积加 SCM 主知识库",
    theme: "scm-system-main",
    root: resolve(root, "../../analysis/jijia-scm-knowledge-base-draft-20260604"),
    status: "active",
    evidence_level: "draft-source-visible",
    description: "积加计划、采购、仓库、物流四模块的业务逻辑、字段、指标、血缘和实施设计。"
  },
  {
    id: "stocking-rules",
    name: "备货库存规则知识库",
    theme: "stocking-inventory-rules",
    root: resolve(root, "../../analysis/stocking-inventory-rules-knowledge-base-draft-20260604"),
    status: "active",
    evidence_level: "draft-rule-extract",
    description: "备货库存规划规则、平台规则、数据来源、指标口径和与积加 SCM 的一致性映射。"
  },
  {
    id: "business-supply-chain",
    name: "跨境电商供应链业务知识库",
    theme: "business-supply-chain",
    root: resolve(root, "../../analysis/business-supply-chain-knowledge-base-draft-20260616"),
    status: "active",
    evidence_level: "draft-business-extraction",
    description: "跨境电商供应链业务方法论、BI 字段、指标体系、书籍萃取和多源 crosswalk。"
  },
  {
    id: "erp-supplement-draft",
    name: "路特 ERP 说明书补充知识库",
    theme: "erp-supplement",
    root: resolve(root, "../../analysis/lute-erp-alidocs-knowledge-base-draft-20260620"),
    status: "draft",
    evidence_level: "browser-visible-draft",
    description: "ERP/企业服务平台可见文档萃取，当前只作为候选证据，不进入 certified evidence。"
  }
];

function walkMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).sort();
  const files = [];
  entries.forEach((entry) => {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
    } else if (stat.isFile() && fullPath.endsWith(".md")) {
      files.push(fullPath);
    }
  });
  return files;
}

function stripMarkdown(text) {
  return text
    .replace(/^---[\s\S]*?---/m, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, (match) => match.replace(/\[|\]\([^)]*\)/g, ""))
    .replace(/[#>*_`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(text, filePath) {
  const frontmatterTitle = text.match(/^title:\s*"?([^"\n]+)"?/m);
  if (frontmatterTitle) return frontmatterTitle[1].trim();
  const heading = text.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return filePath.split("/").pop().replace(/\.md$/, "");
}

function inferTopic(filePath, text) {
  const source = `${filePath} ${text.slice(0, 1200)}`.toLowerCase();
  if (/warehouse|库存|仓库|库龄|inventory/.test(source)) return "inventory-and-warehouse";
  if (/purchase|采购|供应商|supplier|po/.test(source)) return "procurement-and-supply";
  if (/logistics|物流|shipment|头程|运输|carrier/.test(source)) return "logistics-and-fulfillment";
  if (/plan|备货|预测|forecast|补货/.test(source)) return "planning-and-replenishment";
  if (/metric|指标|bi|字段|field|dimension|维度/.test(source)) return "metrics-and-data";
  if (/rule|规则|审批|validation|qa|governance/.test(source)) return "rules-and-governance";
  return "general-supply-chain";
}

function inferRefs(text) {
  const lower = text.toLowerCase();
  const objectRules = [
    ["sku", /sku|msku|fnsku|asin|商品/],
    ["listing", /listing|店铺|站点|销售/],
    ["supplier", /supplier|供应商/],
    ["po", /po|采购订单/],
    ["warehouse", /warehouse|仓库|库位/],
    ["inventory_batch", /batch|批次|库存|库龄/],
    ["shipment", /shipment|货件|头程|物流|运输/],
    ["cost_event", /cost|费用|成本|金额/],
    ["forecast_version", /forecast|预测|计划|备货/],
    ["return_order", /return|退货|逆向|售后/]
  ];
  const metricRules = [
    ["business_available_qty", /可用库存|可售|available/],
    ["sku_oos_rate", /断货率|缺货率|oos/],
    ["stockout_loss_amount", /断货损失|缺货损失/],
    ["supplier_otif_rate", /otif|准时|交付/],
    ["inventory_sync_delay_minutes", /同步延迟|库存同步/],
    ["full_chain_turnover_days_amount", /周转|turnover/],
    ["supply_chain_total_cost_rate", /总成本|cost rate/]
  ];
  const objectRefs = objectRules.filter(([, pattern]) => pattern.test(lower)).map(([id]) => id);
  const metricRefs = metricRules.filter(([, pattern]) => pattern.test(lower)).map(([id]) => id);
  const ruleRefs = [];
  if (/规则|rule|阈值|审批|validation|异常/.test(lower)) ruleRefs.push("rule_candidate");
  if (/证据|evidence|来源|source/.test(lower)) ruleRefs.push("evidence_boundary");
  return {
    objectRefs: [...new Set(objectRefs)],
    metricRefs: [...new Set(metricRefs)],
    ruleRefs: [...new Set(ruleRefs)]
  };
}

function chunkText(text, maxChunks = 4, chunkSize = 900) {
  const clean = stripMarkdown(text);
  const chunks = [];
  for (let start = 0; start < clean.length && chunks.length < maxChunks; start += chunkSize) {
    const chunk = clean.slice(start, start + chunkSize).trim();
    if (chunk.length > 80) chunks.push(chunk);
  }
  return chunks.length ? chunks : [clean.slice(0, chunkSize)];
}

let knowledgeCardCount = 0;
let knowledgeChunkCount = 0;
let knowledgeCrosswalkCount = 0;

knowledgeDomains.forEach((domain) => {
  const files = walkMarkdownFiles(domain.root);
  insert("knowledge_domains", {
    id: domain.id,
    name: domain.name,
    theme: domain.theme,
    source_path: domain.root,
    status: domain.status,
    evidence_level: domain.evidence_level,
    description: domain.description,
    card_count: 0,
    chunk_count: 0,
    crosswalk_count: 0
  });
  let domainCardCount = 0;
  let domainChunkCount = 0;
  let domainCrosswalkCount = 0;
  files.forEach((filePath, fileIndex) => {
    const raw = readFileSync(filePath, "utf8");
    const title = extractTitle(raw, filePath);
    const clean = stripMarkdown(raw);
    const topic = inferTopic(filePath, raw);
    const refs = inferRefs(`${filePath} ${raw}`);
    const cardId = `${domain.id}-card-${String(fileIndex + 1).padStart(4, "0")}`;
    insert("knowledge_cards", {
      id: cardId,
      domain_id: domain.id,
      title,
      topic,
      source_path: filePath,
      source_section: title,
      summary: clean.slice(0, 360),
      object_refs: JSON.stringify(refs.objectRefs),
      metric_refs: JSON.stringify(refs.metricRefs),
      rule_refs: JSON.stringify(refs.ruleRefs),
      evidence_level: domain.evidence_level,
      status: domain.status,
      updated_at: new Date().toISOString()
    });
    knowledgeCardCount += 1;
    domainCardCount += 1;
    chunkText(raw).forEach((chunk, chunkIndex) => {
      insert("knowledge_chunks", {
        id: `${cardId}-chunk-${chunkIndex + 1}`,
        card_id: cardId,
        domain_id: domain.id,
        chunk_index: chunkIndex + 1,
        text: chunk,
        keywords: JSON.stringify([...refs.objectRefs, ...refs.metricRefs, topic]),
        evidence_level: domain.evidence_level,
        source_path: filePath
      });
      knowledgeChunkCount += 1;
      domainChunkCount += 1;
    });
    [...refs.objectRefs.map((id) => ["object", id]), ...refs.metricRefs.map((id) => ["metric", id])].forEach(([targetType, targetId], refIndex) => {
      insert("knowledge_crosswalks", {
        id: `${cardId}-xwalk-${refIndex + 1}`,
        source_type: "knowledge_card",
        source_id: cardId,
        target_type: targetType,
        target_id: targetId,
        relation_type: targetType === "object" ? "DESCRIBES_OBJECT" : "SUPPORTS_METRIC",
        confidence: domain.status === "active" ? 0.72 : 0.42,
        note: "Generated from local markdown keyword evidence; requires owner review before certification."
      });
      knowledgeCrosswalkCount += 1;
      domainCrosswalkCount += 1;
    });
  });
  db.prepare("UPDATE knowledge_domains SET card_count = ?, chunk_count = ?, crosswalk_count = ? WHERE id = ?")
    .run(domainCardCount, domainChunkCount, domainCrosswalkCount, domain.id);
});

for (const migration of importMigrations) {
  db.exec(migration.sql);
}

function tableRowCount(tableName) {
  return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count);
}

const summary = {
  imported_at: new Date().toISOString(),
  sourceRoot: sourceResolution.selected.configuredBy === "repository_default"
    ? "scm/drafts/analysis/business-supply-chain-knowledge-base-draft-20260616/metric-system-blueprint"
    : `env:${sourceResolution.selected.configuredBy}`,
  sourceFiles: {
    metricBlueprint: metricBlueprintFile,
    fieldMapping: fieldMappingFile,
    p0Signoff: p0SignoffFile
  },
  databaseRebuildAuthorized,
  replacementMode: "same-directory-temporary-database_then_atomic_rename",
  appliedMigrations: importMigrations.map((migration) => migration.file),
  counts: {
    metrics: metrics.length,
    l3Metrics: l3Metrics.length,
    fieldMappings: fieldMappings.length,
    p0SignoffTasks: signoffRows.length,
    ontologyObjects: objects.length,
    ontologyObjectInstances: tableRowCount("ontology_object_instances"),
    ontologyInstanceLinks: 9,
    lifecycleStates: lifecycle,
    knowledgeCards: knowledgeCardCount,
    knowledgeChunks: knowledgeChunkCount,
    knowledgeCrosswalks: knowledgeCrosswalkCount,
    agentTraces: tableRowCount("agent_traces"),
    recommendationCards: tableRowCount("recommendation_cards"),
    agentRuns: seededAgentRuns.length,
    aipScenarios: tableRowCount("aip_scenarios"),
    schemaMigrations: tableRowCount("schema_migrations")
  }
};

const integrity = db.prepare("PRAGMA integrity_check").get();
if (integrity.integrity_check !== "ok") {
  throw new Error(`Generated SQLite integrity check failed: ${integrity.integrity_check}`);
}
db.close();
renameSync(temporaryDbPath, dbPath);
databaseReplaced = true;
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
