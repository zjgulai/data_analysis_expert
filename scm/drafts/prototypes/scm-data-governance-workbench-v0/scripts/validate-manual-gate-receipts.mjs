import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const root = process.cwd();
const receiptDir = process.env.SCM_MANUAL_GATE_RECEIPT_DIR || join(root, "tmp", "outputs", "manual-gate-receipt-templates-20260630");
const receiptIntakePath = process.env.SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV || join(root, "data", "manual-gate-receipts-intake-20260630.csv");
const summaryPath = process.env.SCM_MANUAL_GATE_SUMMARY_JSON || join(root, "tmp", "outputs", "manual-gate-resolution-summary-20260630.json");
const validationPath = process.env.SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON || join(root, "tmp", "outputs", "manual-gate-receipt-validation-20260630.json");
const statusPlanPath = process.env.SCM_MANUAL_GATE_STATUS_PLAN_JSON || join(root, "tmp", "outputs", "manual-gate-status-update-plan-20260630.json");
const templateMode = process.env.SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE !== "false";
const generatedAt = process.env.SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT || new Date().toISOString();

const expectedColumns = [
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
const humanReceiptFields = ["decision_result", "evidence_ref", "signoff_date", "scope", "rollback_rule"];
const identityFields = ["owner", "packet_type", "gate_id", "target_ref", "metric_code", "metric_name"];
const reviewRoutes = {
  owner_signoff: "manual_owner_signoff_review_queue",
  field_mapping: "manual_field_mapping_review_queue",
  scei_weight_source: "manual_scei_weight_review_queue"
};
const decisionResultAllowedValues = {
  approved_for_manual_review: "Owner approves this receipt for downstream manual review.",
  approved_with_conditions: "Owner approves with explicit conditions captured in scope/evidence_ref.",
  rejected_needs_rework: "Owner rejects this gate and requests rework before another receipt."
};
const decisionResultValues = Object.keys(decisionResultAllowedValues);

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      cell += "\"";
      i += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  return rows;
}

function toObjects(rows) {
  if (!rows.length) return { columns: [], records: [] };
  const [columns, ...dataRows] = rows;
  return {
    columns,
    records: dataRows.map((values) =>
      Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]))
    )
  };
}

function reviewRouteFor(packetType) {
  return reviewRoutes[packetType] || "manual_gate_exception_review_queue";
}

function increment(map, key) {
  map[key] = (map[key] || 0) + 1;
}

const errors = [];
const warnings = [];
const files = [];
const rowOutcomes = [];
const statusPlanRows = [];
const reviewRouteCounts = {};
const eligibleReviewRouteCounts = {};
const decisionResultCounts = {};
let invalidDecisionResultRows = 0;
const summary = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, "utf8")) : null;

if (!summary) errors.push(`missing_summary:${summaryPath}`);

let inputFiles = [];
if (templateMode) {
  if (!existsSync(receiptDir)) errors.push(`missing_receipt_dir:${receiptDir}`);
  if (existsSync(receiptDir)) {
    inputFiles = readdirSync(receiptDir)
      .filter((name) => name.endsWith(".csv"))
      .sort()
      .map((fileName) => ({ fileName, path: join(receiptDir, fileName) }));
  }
} else {
  if (!existsSync(receiptIntakePath)) errors.push(`missing_receipt_intake:${receiptIntakePath}`);
  if (existsSync(receiptIntakePath)) {
    inputFiles = [{ fileName: basename(receiptIntakePath), path: receiptIntakePath }];
  }
}

const expectedFileCount = Number(
  process.env.SCM_MANUAL_GATE_EXPECTED_RECEIPT_FILES || (templateMode ? summary?.counts?.receiptTemplateCount || 8 : 1)
);
const expectedTotalRows = Number(
  process.env.SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS ||
    (templateMode ? summary?.counts?.receiptTemplateRows : summary?.counts?.receiptIntakeRows || summary?.counts?.receiptTemplateRows) ||
    53
);

let totalRows = 0;
let rowsWithStatusMutationFalse = 0;
let templateRowsAwaitingReceipt = 0;
let filledReceiptRows = 0;
let partialReceiptRows = 0;
let blockedReceiptRows = 0;
let statusPlanEligibleRows = 0;
let blankHumanFieldCells = 0;
let schemaValid = true;

if (inputFiles.length !== expectedFileCount) {
  errors.push(`receipt_file_count:${inputFiles.length}:expected:${expectedFileCount}`);
}

for (const inputFile of inputFiles) {
  const { fileName, path } = inputFile;
  const parsed = parseCsv(readFileSync(path, "utf8"));
  const { columns, records } = toObjects(parsed);
  const columnSignature = columns.join(",");
  const expectedSignature = expectedColumns.join(",");
  const fileErrors = [];

  if (columnSignature !== expectedSignature) {
    schemaValid = false;
    fileErrors.push(`columns:${columnSignature}`);
  }

  records.forEach((record, index) => {
    totalRows += 1;
    const rowLabel = `${fileName}:${index + 2}`;
    const rowBlockers = [];

    identityFields.forEach((field) => {
      if (!String(record[field] || "").trim()) {
        const blocker = `blank_${field}`;
        fileErrors.push(`${rowLabel}:${blocker}`);
        rowBlockers.push(blocker);
      }
    });

    if (record.status_mutation === "false") {
      rowsWithStatusMutationFalse += 1;
    } else {
      fileErrors.push(`${rowLabel}:status_mutation:${record.status_mutation}`);
      rowBlockers.push("status_mutation_must_remain_false");
    }

    const humanValues = humanReceiptFields.map((field) => String(record[field] || "").trim());
    const blankCount = humanValues.filter((value) => value === "").length;
    const missingHumanFields = humanReceiptFields.filter((field) => !String(record[field] || "").trim());
    blankHumanFieldCells += blankCount;
    if (blankCount === humanReceiptFields.length) {
      templateRowsAwaitingReceipt += 1;
    } else if (blankCount === 0) {
      filledReceiptRows += 1;
    } else {
      partialReceiptRows += 1;
    }

    if (templateMode && blankCount !== humanReceiptFields.length) {
      rowBlockers.push("template_human_fields_must_remain_blank");
    }
    if (!templateMode && missingHumanFields.length > 0) {
      rowBlockers.push(...missingHumanFields.map((field) => `missing_${field}`));
    }

    if (!String(record.boundary_note || "").includes("status_mutation_false")) {
      fileErrors.push(`${rowLabel}:boundary_note`);
      rowBlockers.push("boundary_note_must_include_status_mutation_false");
    }

    if (!templateMode) {
      const decisionResult = String(record.decision_result || "").trim();
      if (decisionResult) {
        increment(decisionResultCounts, decisionResult);
        if (!decisionResultAllowedValues[decisionResult]) {
          fileErrors.push(`${rowLabel}:decision_result:${decisionResult}`);
          rowBlockers.push("invalid_decision_result");
          invalidDecisionResultRows += 1;
        }
      }

      const proposedReviewRoute = reviewRouteFor(record.packet_type);
      increment(reviewRouteCounts, proposedReviewRoute);
      if (proposedReviewRoute === "manual_gate_exception_review_queue") {
        rowBlockers.push("unsupported_packet_type");
      }

      const receiptComplete = rowBlockers.length === 0 && missingHumanFields.length === 0;
      if (receiptComplete) {
        statusPlanEligibleRows += 1;
        increment(eligibleReviewRouteCounts, proposedReviewRoute);
      } else {
        blockedReceiptRows += 1;
      }

      const outcome = {
        sourceFile: fileName,
        rowNumber: index + 2,
        owner: record.owner,
        packetType: record.packet_type,
        gateId: record.gate_id,
        targetRef: record.target_ref,
        metricCode: record.metric_code,
        metricName: record.metric_name,
        decisionResult,
        receiptStatus: receiptComplete ? "complete_pending_manual_review" : "blocked_missing_receipt_fields",
        missingHumanFields,
        blockers: rowBlockers,
        proposedReviewRoute,
        statusMutation: false,
        plannedMutation: "none"
      };
      rowOutcomes.push(outcome);
      statusPlanRows.push({
        owner: outcome.owner,
        packetType: outcome.packetType,
        gateId: outcome.gateId,
        targetRef: outcome.targetRef,
        metricCode: outcome.metricCode,
        decisionResult: outcome.decisionResult,
        receiptStatus: outcome.receiptStatus,
        blockers: outcome.blockers,
        proposedReviewRoute: outcome.proposedReviewRoute,
        proposedStatusChange: null,
        statusMutation: false,
        dryRunOnly: true
      });
    }
  });

  if (fileErrors.length) {
    errors.push(...fileErrors);
  }

  files.push({
    fileName,
    path,
    rowCount: records.length,
    schemaValid: fileErrors.every((error) => !error.startsWith("columns:")),
    templateRowsAwaitingReceipt: records.filter((record) =>
      humanReceiptFields.every((field) => String(record[field] || "").trim() === "")
    ).length
  });
}

if (totalRows !== expectedTotalRows) {
  errors.push(`receipt_total_rows:${totalRows}:expected:${expectedTotalRows}`);
}

if (templateMode && filledReceiptRows + partialReceiptRows > 0) {
  errors.push(`template_human_fields_present:${filledReceiptRows + partialReceiptRows}`);
}

const report = {
  generatedAt,
  templateMode,
  sourceMode: templateMode ? "receipt_templates" : "receipt_intake",
  receiptDir,
  receiptIntakePath: templateMode ? null : receiptIntakePath,
  summaryPath,
  validationPath,
  statusPlanPath: templateMode ? null : statusPlanPath,
  boundary: {
    statusMutation: false,
    providerCalls: false,
    productionWrites: false,
    erpWriteback: false,
    sourceReadMode: "csv_read_only"
  },
  expected: {
    receiptFiles: expectedFileCount,
    totalRows: expectedTotalRows,
    columns: expectedColumns,
    decisionResultAllowedValues: decisionResultValues
  },
  counts: {
    receiptFiles: inputFiles.length,
    totalRows,
    rowsWithStatusMutationFalse,
    filledReceiptRows,
    partialReceiptRows,
    blockedReceiptRows,
    statusPlanEligibleRows,
    templateRowsAwaitingReceipt,
    blankHumanFieldCells,
    reviewRouteCounts,
    eligibleReviewRouteCounts,
    decisionResultCounts,
    invalidDecisionResultRows
  },
  contract: {
    decisionResultAllowedValues
  },
  schemaValid,
  readyForStatusMutation: false,
  files,
  rowOutcomes: templateMode ? [] : rowOutcomes,
  warnings,
  errors
};

const statusPlan = {
  generatedAt,
  sourceMode: "receipt_intake",
  receiptIntakePath,
  summaryPath,
  validationPath,
  statusPlanPath,
  boundary: {
    statusMutation: false,
    providerCalls: false,
    productionWrites: false,
    erpWriteback: false,
    sourceReadMode: "csv_read_only",
    dryRunOnly: true
  },
  counts: {
    totalRows,
    eligibleRows: statusPlanEligibleRows,
    blockedRows: blockedReceiptRows,
    proposedStatusMutations: 0,
    reviewRouteCounts,
    eligibleReviewRouteCounts,
    decisionResultCounts,
    invalidDecisionResultRows
  },
  contract: {
    decisionResultAllowedValues
  },
  readyForStatusMutation: false,
  rows: statusPlanRows
};

ensureParent(validationPath);
writeFileSync(validationPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (!templateMode) {
  ensureParent(statusPlanPath);
  writeFileSync(statusPlanPath, `${JSON.stringify(statusPlan, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(report, null, 2));

if (errors.length) process.exit(1);
