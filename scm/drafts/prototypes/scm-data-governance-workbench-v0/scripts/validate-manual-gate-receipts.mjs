import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const receiptDir = process.env.SCM_MANUAL_GATE_RECEIPT_DIR || join(root, "tmp", "outputs", "manual-gate-receipt-templates-20260630");
const summaryPath = process.env.SCM_MANUAL_GATE_SUMMARY_JSON || join(root, "tmp", "outputs", "manual-gate-resolution-summary-20260630.json");
const validationPath = process.env.SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON || join(root, "tmp", "outputs", "manual-gate-receipt-validation-20260630.json");
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

const errors = [];
const warnings = [];
const files = [];
const summary = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, "utf8")) : null;

if (!summary) errors.push(`missing_summary:${summaryPath}`);
if (!existsSync(receiptDir)) errors.push(`missing_receipt_dir:${receiptDir}`);

let csvFiles = [];
if (existsSync(receiptDir)) {
  csvFiles = readdirSync(receiptDir)
    .filter((name) => name.endsWith(".csv"))
    .sort();
}

const expectedFileCount = Number(process.env.SCM_MANUAL_GATE_EXPECTED_RECEIPT_FILES || summary?.counts?.receiptTemplateCount || 8);
const expectedTotalRows = Number(process.env.SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS || summary?.counts?.receiptTemplateRows || 53);

let totalRows = 0;
let rowsWithStatusMutationFalse = 0;
let templateRowsAwaitingReceipt = 0;
let filledReceiptRows = 0;
let partialReceiptRows = 0;
let blankHumanFieldCells = 0;
let schemaValid = true;

if (csvFiles.length !== expectedFileCount) {
  errors.push(`receipt_file_count:${csvFiles.length}:expected:${expectedFileCount}`);
}

for (const fileName of csvFiles) {
  const path = join(receiptDir, fileName);
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

    identityFields.forEach((field) => {
      if (!String(record[field] || "").trim()) fileErrors.push(`${rowLabel}:blank_${field}`);
    });

    if (record.status_mutation === "false") {
      rowsWithStatusMutationFalse += 1;
    } else {
      fileErrors.push(`${rowLabel}:status_mutation:${record.status_mutation}`);
    }

    const humanValues = humanReceiptFields.map((field) => String(record[field] || "").trim());
    const blankCount = humanValues.filter((value) => value === "").length;
    blankHumanFieldCells += blankCount;
    if (blankCount === humanReceiptFields.length) {
      templateRowsAwaitingReceipt += 1;
    } else if (blankCount === 0) {
      filledReceiptRows += 1;
    } else {
      partialReceiptRows += 1;
    }

    if (!String(record.boundary_note || "").includes("status_mutation_false")) {
      fileErrors.push(`${rowLabel}:boundary_note`);
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
  receiptDir,
  summaryPath,
  validationPath,
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
    columns: expectedColumns
  },
  counts: {
    receiptFiles: csvFiles.length,
    totalRows,
    rowsWithStatusMutationFalse,
    filledReceiptRows,
    partialReceiptRows,
    templateRowsAwaitingReceipt,
    blankHumanFieldCells
  },
  schemaValid,
  readyForStatusMutation: false,
  files,
  warnings,
  errors
};

ensureParent(validationPath);
writeFileSync(validationPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (errors.length) process.exit(1);
