import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const dbPath = process.env.SCM_DB_PATH || join(root, "data", "governance_workbench.sqlite");
const generatedAt = process.env.SCM_MANUAL_GATE_GENERATED_AT || new Date().toISOString();
const outputPaths = {
  ownerSignoff: process.env.SCM_MANUAL_GATE_OWNER_CSV || join(root, "data", "manual-gate-owner-signoff-intake-20260630.csv"),
  fieldMapping: process.env.SCM_MANUAL_GATE_MAPPING_CSV || join(root, "data", "manual-gate-field-mapping-intake-20260630.csv"),
  sceiWeight: process.env.SCM_MANUAL_GATE_SCEI_CSV || join(root, "data", "manual-gate-scei-weight-intake-20260630.csv"),
  receiptIntake: process.env.SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV || join(root, "data", "manual-gate-receipts-intake-20260630.csv"),
  summary: process.env.SCM_MANUAL_GATE_SUMMARY_JSON || join(root, "tmp", "outputs", "manual-gate-resolution-summary-20260630.json"),
  ownerPacketDir: process.env.SCM_MANUAL_GATE_PACKET_DIR || join(root, "tmp", "outputs", "manual-gate-owner-packets-20260630"),
  receiptTemplateDir: process.env.SCM_MANUAL_GATE_RECEIPT_DIR || join(root, "tmp", "outputs", "manual-gate-receipt-templates-20260630")
};

function portablePath(path) {
  const fromRoot = relative(root, resolve(path));
  if (fromRoot === "") return ".";
  if (fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot)) {
    return fromRoot.split(sep).join("/");
  }
  return "external-path";
}

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ].join("\n") + "\n";
}

function writeCsv(path, rows, columns) {
  ensureParent(path);
  writeFileSync(path, toCsv(rows, columns), "utf8");
}

function writeMarkdown(path, body) {
  ensureParent(path);
  writeFileSync(path, body, "utf8");
}

function all(db, sql, params = []) {
  return db.prepare(sql).all(...params);
}

const ownerSlugs = new Map([
  ["库存运营 Owner", "inventory-ops-owner"],
  ["数据治理 Owner", "data-governance-owner"],
  ["物流运营 Owner", "logistics-ops-owner"],
  ["计划 Owner", "planning-owner"],
  ["财务/成本 Owner", "finance-cost-owner"],
  ["采购与供应商 Owner", "procurement-supplier-owner"],
  ["仓储运营 Owner", "warehouse-ops-owner"],
  ["供应链数据治理 Owner", "scm-data-governance-owner"],
  ["待确认", "unassigned-owner"]
]);

function ownerSlug(owner) {
  if (!ownerSlugs.has(owner)) throw new Error(`unmapped_owner_slug:${owner || "blank"}`);
  return ownerSlugs.get(owner);
}

if (new Set(ownerSlugs.values()).size !== ownerSlugs.size) {
  throw new Error("duplicate_configured_owner_slug");
}

function routeOwner(row) {
  return row.metric_owner_current || row.requested_owner || row.owner || "待确认";
}

function packetRow(packetOwner, packetType, row) {
  return {
    packet_owner: packetOwner,
    packet_type: packetType,
    gate_id: row.gate_id || row.tree_edge_id || row.id,
    task_type: row.task_type || "scei_weight_source",
    target_ref: row.target_ref || row.child_metric_id,
    metric_code: row.metric_code || row.child_code,
    metric_name: row.metric_name || row.child_name,
    current_status: row.current_status || row.status || "",
    priority: row.priority || "P0",
    required_decision: row.required_decision || row.current_blocker_note || "",
    required_evidence_fields: row.required_evidence_fields || "proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result",
    resolution_rule: row.resolution_rule || "weights_remain_blank_until_owner_receipt_exists",
    boundary_note: row.boundary_note || boundaryNote
  };
}

function receiptTemplateRow(packetOwner, row) {
  return {
    owner: packetOwner,
    packet_type: row.packet_type,
    gate_id: row.gate_id,
    target_ref: row.target_ref,
    metric_code: row.metric_code,
    metric_name: row.metric_name,
    decision_result: "",
    evidence_ref: "",
    signoff_date: "",
    scope: "",
    rollback_rule: "",
    status_mutation: "false",
    boundary_note: "manual_receipt_template_only_status_mutation_false"
  };
}

function markdownTable(rows) {
  if (!rows.length) return "_No open items in this packet._\n";
  const header = "| Gate | Type | Metric | Current Status | Required Decision | Evidence Fields |\n|---|---|---|---|---|---|\n";
  const lines = rows.map((row) => {
    const metric = `${row.metric_code || ""} ${row.metric_name || ""}`.trim();
    return `| ${row.gate_id} | ${row.packet_type} | ${metric} | ${row.current_status || ""} | ${String(row.required_decision || "").replaceAll("|", "/")} | ${String(row.required_evidence_fields || "").replaceAll("|", "/")} |`;
  });
  return header + lines.join("\n") + "\n";
}

const boundaryNote = "manual_review_required; keep productionWrites=false/providerCalls=false/erpWriteback=false until accepted";
const db = new DatabaseSync(dbPath, { readOnly: true });

const ownerSignoffRows = all(
  db,
  `SELECT
    t.id AS gate_id,
    t.task_type,
    t.target_ref,
    m.code AS metric_code,
    m.name AS metric_name,
    m.level AS metric_level,
    m.owner AS metric_owner_current,
    t.owner AS requested_owner,
    t.status AS current_status,
    t.priority,
    t.title,
    t.notes AS required_decision
  FROM governance_tasks t
  LEFT JOIN metrics m ON m.id = t.target_ref
  WHERE t.priority='P0'
    AND t.task_type='owner_signoff'
    AND t.status IN ('未发起','待确认')
  ORDER BY m.owner, t.target_ref, t.id`
).map((row) => ({
  ...row,
  required_evidence_fields: "owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref",
  resolution_rule: "do_not_mark_confirmed_until_named_owner_supplies_signoff_receipt",
  boundary_note: boundaryNote
}));

const fieldMappingRows = all(
  db,
  `SELECT
    t.id AS gate_id,
    t.task_type,
    t.target_ref,
    m.code AS metric_code,
    m.name AS metric_name,
    m.level AS metric_level,
    m.owner AS metric_owner_current,
    t.owner AS requested_owner,
    t.status AS current_status,
    t.priority,
    t.title,
    t.notes AS required_decision
  FROM governance_tasks t
  LEFT JOIN metrics m ON m.id = t.target_ref
  WHERE t.priority='P0'
    AND t.task_type='field_mapping'
    AND t.status IN ('未发起','待确认')
  ORDER BY t.owner, t.target_ref, t.id`
).map((row) => ({
  ...row,
  required_evidence_fields: "source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref",
  resolution_rule: "do_not_mark_confirmed_until_source_fields_are_named_and_owner_receipt_exists",
  boundary_note: boundaryNote
}));

const sceiTaskRows = all(
  db,
  `SELECT id, owner, status, due_date, notes
   FROM governance_tasks
   WHERE id='aip_20260627_d_p1_05_scei_weight_source_required'
     AND status='owner_decision_packet_ready'`
);

const sceiWeightRows = all(
  db,
  `SELECT
    k.id AS tree_edge_id,
    k.parent_metric_id,
    parent.code AS parent_code,
    parent.name AS parent_name,
    k.child_metric_id,
    child.code AS child_code,
    child.name AS child_name,
    k.relation_type,
    k.weight AS current_weight,
    k.governance_note AS current_blocker_note
  FROM kpi_tree k
  LEFT JOIN metrics parent ON parent.id = k.parent_metric_id
  LEFT JOIN metrics child ON child.id = k.child_metric_id
  WHERE k.parent_metric_id='SCM-MECE-L0-001'
  ORDER BY k.child_metric_id`
).map((row) => ({
  ...row,
  current_status: sceiTaskRows[0]?.status || "",
  proposed_weight: "",
  basis_type: "",
  basis_description: "",
  owner: "",
  signoff_date: "",
  evidence_ref: "",
  decision_result: "",
  boundary_note: "weights_must_sum_to_1_and_remain_blank_until_owner_signoff"
}));

const ownerPackets = new Map();

function addPacketRows(packetOwner, packetType, rows) {
  if (!ownerPackets.has(packetOwner)) ownerPackets.set(packetOwner, []);
  const packet = ownerPackets.get(packetOwner);
  rows.forEach((row) => packet.push(packetRow(packetOwner, packetType, row)));
}

const signoffByOwner = new Map();
ownerSignoffRows.forEach((row) => {
  const packetOwner = routeOwner(row);
  if (!signoffByOwner.has(packetOwner)) signoffByOwner.set(packetOwner, []);
  signoffByOwner.get(packetOwner).push(row);
});
for (const [packetOwner, rows] of signoffByOwner.entries()) {
  addPacketRows(packetOwner, "owner_signoff", rows);
}

const fieldMappingByOwner = new Map();
fieldMappingRows.forEach((row) => {
  // Field-mapping tasks carry an explicit assignee; owner-signoff tasks use the metric owner because their assignee is still "待确认".
  const packetOwner = row.requested_owner || routeOwner(row);
  if (!fieldMappingByOwner.has(packetOwner)) fieldMappingByOwner.set(packetOwner, []);
  fieldMappingByOwner.get(packetOwner).push(row);
});
for (const [packetOwner, rows] of fieldMappingByOwner.entries()) {
  addPacketRows(packetOwner, "field_mapping", rows);
}

addPacketRows("供应链数据治理 Owner", "scei_weight_source", sceiWeightRows);

const ownerBuckets = all(
  db,
  `SELECT owner, task_type, status, COUNT(*) AS count
   FROM governance_tasks
   WHERE priority='P0'
     AND (
       (task_type='owner_signoff' AND status IN ('未发起','待确认'))
       OR (task_type='field_mapping' AND status IN ('未发起','待确认'))
       OR id='aip_20260627_d_p1_05_scei_weight_source_required'
     )
   GROUP BY owner, task_type, status
   ORDER BY owner, task_type, status`
);

const summary = {
  generatedAt,
  dbPath: portablePath(dbPath),
  outputPaths: Object.fromEntries(
    Object.entries(outputPaths).map(([name, path]) => [name, portablePath(path)])
  ),
  boundary: {
    productionWrites: false,
    providerCalls: false,
    erpWriteback: false,
    localSqliteWrites: false,
    sourceReadMode: "sqlite_read_only",
    statusMutation: false
  },
  counts: {
    ownerSignoffOpen: ownerSignoffRows.length,
    fieldMappingOpen: fieldMappingRows.length,
    sceiWeightSourceOwnerDecisionPacketsReady: sceiTaskRows.length,
    sceiWeightChildrenAwaitingOwnerWeights: sceiWeightRows.length,
    ownerPacketCount: ownerPackets.size,
    receiptTemplateCount: 0,
    receiptTemplateRows: 0,
    receiptIntakeRows: 0
  },
  ownerBuckets,
  closureRules: {
    ownerSignoff: "requires named owner, signoff date, scope, metric definition version, and evidence reference",
    fieldMapping: "requires concrete source system/table/field, join key, grain, refresh cadence, field owner, and sample extract reference",
    sceiWeightSource: "requires five child weights with sum exactly 1.0, basis type, basis description, owner signoff, and evidence reference"
  },
  nonClosureReasons: [
    "No owner signoff receipt is present in the local source pack.",
    "No concrete source field mapping is present for the 18 field-mapping gates.",
    "SCEI five-dimensional weights are intentionally blank because only a historical two-axis cost/fulfillment split is evidenced."
  ],
  files: {
    ownerSignoffCsv: portablePath(outputPaths.ownerSignoff),
    fieldMappingCsv: portablePath(outputPaths.fieldMapping),
    sceiWeightCsv: portablePath(outputPaths.sceiWeight),
    receiptIntakeCsv: portablePath(outputPaths.receiptIntake),
    summaryJson: portablePath(outputPaths.summary),
    ownerPacketDir: portablePath(outputPaths.ownerPacketDir),
    receiptTemplateDir: portablePath(outputPaths.receiptTemplateDir)
  },
  ownerPackets: [],
  receiptTemplates: []
};

writeCsv(outputPaths.ownerSignoff, ownerSignoffRows, [
  "gate_id",
  "task_type",
  "target_ref",
  "metric_code",
  "metric_name",
  "metric_level",
  "metric_owner_current",
  "requested_owner",
  "current_status",
  "priority",
  "title",
  "required_decision",
  "required_evidence_fields",
  "resolution_rule",
  "boundary_note"
]);

writeCsv(outputPaths.fieldMapping, fieldMappingRows, [
  "gate_id",
  "task_type",
  "target_ref",
  "metric_code",
  "metric_name",
  "metric_level",
  "metric_owner_current",
  "requested_owner",
  "current_status",
  "priority",
  "title",
  "required_decision",
  "required_evidence_fields",
  "resolution_rule",
  "boundary_note"
]);

writeCsv(outputPaths.sceiWeight, sceiWeightRows, [
  "tree_edge_id",
  "parent_metric_id",
  "parent_code",
  "parent_name",
  "child_metric_id",
  "child_code",
  "child_name",
  "relation_type",
  "current_weight",
  "current_blocker_note",
  "proposed_weight",
  "basis_type",
  "basis_description",
  "owner",
  "signoff_date",
  "evidence_ref",
  "decision_result",
  "boundary_note"
]);

const packetColumns = [
  "packet_owner",
  "packet_type",
  "gate_id",
  "task_type",
  "target_ref",
  "metric_code",
  "metric_name",
  "current_status",
  "priority",
  "required_decision",
  "required_evidence_fields",
  "resolution_rule",
  "boundary_note"
];

const receiptTemplateColumns = [
  "owner",
  "packet_type",
  "gate_id",
  "target_ref",
  "metric_code",
  "metric_name",
  "decision_result",
  "evidence_ref",
  "signoff_date",
  "scope",
  "rollback_rule",
  "status_mutation",
  "boundary_note"
];

const receiptIntakeRows = [];

for (const [packetOwner, rows] of [...ownerPackets.entries()].sort(([a], [b]) => a.localeCompare(b, "zh-Hans-CN"))) {
  const slug = ownerSlug(packetOwner);
  const csvPath = join(outputPaths.ownerPacketDir, `${slug}.csv`);
  const markdownPath = join(outputPaths.ownerPacketDir, `${slug}.md`);
  const receiptCsvPath = join(outputPaths.receiptTemplateDir, `${slug}.csv`);
  const receiptRows = rows.map((row) => receiptTemplateRow(packetOwner, row));
  receiptIntakeRows.push(...receiptRows);
  const counts = rows.reduce((acc, row) => {
    acc[row.packet_type] = (acc[row.packet_type] || 0) + 1;
    return acc;
  }, {});
  writeCsv(csvPath, rows, packetColumns);
  writeCsv(receiptCsvPath, receiptRows, receiptTemplateColumns);
  writeMarkdown(
    markdownPath,
    `---\n` +
      `title: "SCM Manual Gate Owner Packet - ${packetOwner}"\n` +
      `doc_type: owner_packet\n` +
      `module: scm\n` +
      `topic: manual-gate-owner-packet\n` +
      `status: draft\n` +
      `created: 2026-06-30\n` +
      `updated: 2026-06-30\n` +
      `owner: "${packetOwner}"\n` +
      `source: codex\n` +
      `boundary: "manual review packet; sqlite read-only export; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"\n` +
      `generated_at: "${generatedAt}"\n` +
      `---\n\n` +
      `# SCM Manual Gate Owner Packet - ${packetOwner}\n\n` +
      `## Boundary\n\n` +
      `- status_mutation=false\n` +
      `- source_read_mode=sqlite_read_only\n` +
      `- providerCalls=false\n` +
      `- productionWrites=false\n` +
      `- erpWriteback=false\n` +
      `- manual_review_required=true\n\n` +
      `## Counts\n\n` +
      `- owner_signoff=${counts.owner_signoff || 0}\n` +
      `- field_mapping=${counts.field_mapping || 0}\n` +
      `- scei_weight_source=${counts.scei_weight_source || 0}\n` +
      `- total=${rows.length}\n\n` +
      `## Closure Inputs\n\n` +
      `- owner_signoff: owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref\n` +
      `- field_mapping: source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref\n` +
      `- scei_weight_source: proposed_weight; basis_type; basis_description; owner; signoff_date; evidence_ref; decision_result\n\n` +
      `## Open Items\n\n` +
      markdownTable(rows)
  );
  summary.ownerPackets.push({
    owner: packetOwner,
    slug,
    itemCount: rows.length,
    counts,
    csvPath: portablePath(csvPath),
    markdownPath: portablePath(markdownPath)
  });
  summary.receiptTemplates.push({
    owner: packetOwner,
    slug,
    rowCount: receiptRows.length,
    csvPath: portablePath(receiptCsvPath)
  });
  summary.counts.receiptTemplateCount += 1;
  summary.counts.receiptTemplateRows += receiptRows.length;
}

summary.counts.receiptIntakeRows = receiptIntakeRows.length;
writeCsv(outputPaths.receiptIntake, receiptIntakeRows, receiptTemplateColumns);

ensureParent(outputPaths.summary);
writeFileSync(outputPaths.summary, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

db.close();
console.log(JSON.stringify(summary, null, 2));
