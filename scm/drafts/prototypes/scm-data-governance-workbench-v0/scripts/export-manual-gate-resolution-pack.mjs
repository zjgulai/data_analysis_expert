import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const dbPath = process.env.SCM_DB_PATH || join(root, "data", "governance_workbench.sqlite");
const generatedAt = process.env.SCM_MANUAL_GATE_GENERATED_AT || new Date().toISOString();
const outputPaths = {
  ownerSignoff: process.env.SCM_MANUAL_GATE_OWNER_CSV || join(root, "data", "manual-gate-owner-signoff-intake-20260630.csv"),
  fieldMapping: process.env.SCM_MANUAL_GATE_MAPPING_CSV || join(root, "data", "manual-gate-field-mapping-intake-20260630.csv"),
  sceiWeight: process.env.SCM_MANUAL_GATE_SCEI_CSV || join(root, "data", "manual-gate-scei-weight-intake-20260630.csv"),
  summary: process.env.SCM_MANUAL_GATE_SUMMARY_JSON || join(root, "tmp", "outputs", "manual-gate-resolution-summary-20260630.json")
};

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

function all(db, sql, params = []) {
  return db.prepare(sql).all(...params);
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
  proposed_weight: "",
  basis_type: "",
  basis_description: "",
  owner: "",
  signoff_date: "",
  evidence_ref: "",
  decision_result: "",
  boundary_note: "weights_must_sum_to_1_and_remain_blank_until_owner_signoff"
}));

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
  dbPath,
  outputPaths,
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
    sceiWeightChildrenAwaitingOwnerWeights: sceiWeightRows.length
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
    ownerSignoffCsv: outputPaths.ownerSignoff,
    fieldMappingCsv: outputPaths.fieldMapping,
    sceiWeightCsv: outputPaths.sceiWeight,
    summaryJson: outputPaths.summary
  }
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

ensureParent(outputPaths.summary);
writeFileSync(outputPaths.summary, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

db.close();
console.log(JSON.stringify(summary, null, 2));
