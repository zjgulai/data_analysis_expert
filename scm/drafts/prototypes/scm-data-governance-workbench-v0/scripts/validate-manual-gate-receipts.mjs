import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const root = process.cwd();
const receiptDir = process.env.SCM_MANUAL_GATE_RECEIPT_DIR || join(root, "tmp", "outputs", "manual-gate-receipt-templates-20260630");
const receiptIntakePath = process.env.SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV || join(root, "data", "manual-gate-receipts-intake-20260630.csv");
const summaryPath = process.env.SCM_MANUAL_GATE_SUMMARY_JSON || join(root, "tmp", "outputs", "manual-gate-resolution-summary-20260630.json");
const validationPath = process.env.SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON || join(root, "tmp", "outputs", "manual-gate-receipt-validation-20260630.json");
const statusPlanPath = process.env.SCM_MANUAL_GATE_STATUS_PLAN_JSON || join(root, "tmp", "outputs", "manual-gate-status-update-plan-20260630.json");
const templateMode = process.env.SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE !== "false";
const generatedAt = process.env.SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT || new Date().toISOString();
const expectedBlockersMode = process.env.SCM_MANUAL_GATE_EXPECTED_BLOCKERS === "true";
const formalIntakePath = join(root, "data", "manual-gate-receipts-intake-20260630.csv");
const positiveFixturePath = join(root, "tmp", "fixtures", "manual-gate-receipt-positive-fixture-20260630.csv");
const negativeFixturePath = join(root, "tmp", "fixtures", "manual-gate-receipt-negative-fixture-20260630.csv");
const positiveFixtureSha256 = "1d70137f60e31b2216637aa85041938316f6ef414f6d5a5b8bc69cedd7f0a02f";
const negativeFixtureSha256 = "289731d8c03c332f6f686d577c7b7de88fdb0789c4fc92889fa2d61644571430";
const resolvedReceiptIntakePath = resolve(receiptIntakePath);
const receiptProfile = templateMode
  ? "template"
  : resolvedReceiptIntakePath === resolve(formalIntakePath)
    ? "formal_intake"
    : resolvedReceiptIntakePath === resolve(positiveFixturePath)
      ? "positive_fixture"
      : resolvedReceiptIntakePath === resolve(negativeFixturePath)
        ? "negative_fixture"
        : "real_intake";

function portablePath(path) {
  const fromRoot = relative(root, resolve(path));
  if (fromRoot === "") return ".";
  if (fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot)) {
    return fromRoot.split(sep).join("/");
  }
  return "external-path";
}

function sha256File(path) {
  return existsSync(path) ? createHash("sha256").update(readFileSync(path)).digest("hex") : null;
}

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
const expectedBlockerNames = new Set(
  (process.env.SCM_MANUAL_GATE_EXPECTED_BLOCKER_NAMES ||
    "invalid_decision_result,unsupported_packet_type,status_mutation_must_remain_false")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

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

function identityKey(record) {
  return JSON.stringify(identityFields.map((field) => String(record[field] || "").trim()));
}

function isStrictCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
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

if (!existsSync(receiptDir)) errors.push(`missing_receipt_dir:${receiptDir}`);
const templateFiles = existsSync(receiptDir)
  ? readdirSync(receiptDir)
      .filter((name) => name.endsWith(".csv"))
      .sort()
      .map((fileName) => ({ fileName, path: join(receiptDir, fileName) }))
  : [];
const templateIdentityKeys = new Set();
for (const templateFile of templateFiles) {
  const { columns, records } = toObjects(parseCsv(readFileSync(templateFile.path, "utf8")));
  if (columns.join(",") !== expectedColumns.join(",")) {
    errors.push(`template_columns:${templateFile.fileName}:${columns.join(",")}`);
  }
  for (const record of records) {
    const key = identityKey(record);
    if (templateIdentityKeys.has(key)) errors.push(`template_duplicate_identity:${templateFile.fileName}:${key}`);
    templateIdentityKeys.add(key);
  }
}
if (summary && templateIdentityKeys.size !== Number(summary.counts?.receiptTemplateRows || 0)) {
  errors.push(`template_identity_count:${templateIdentityKeys.size}:expected:${summary.counts?.receiptTemplateRows || 0}`);
}

const positiveFixtureDigestMatches = receiptProfile === "positive_fixture"
  && sha256File(receiptIntakePath) === positiveFixtureSha256;
const negativeFixtureDigestMatches = receiptProfile === "negative_fixture"
  && sha256File(receiptIntakePath) === negativeFixtureSha256;

let inputFiles = [];
if (templateMode) {
  inputFiles = templateFiles;
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
let unknownIdentityRows = 0;
let duplicateIdentityRows = 0;
let invalidNegativeFixtureNamespaceRows = 0;
const seenInputIdentityKeys = new Set();

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

    const recordIdentityKey = identityKey(record);
    if (seenInputIdentityKeys.has(recordIdentityKey)) {
      fileErrors.push(`${rowLabel}:duplicate_identity_tuple`);
      rowBlockers.push("duplicate_identity_tuple");
      duplicateIdentityRows += 1;
    } else {
      seenInputIdentityKeys.add(recordIdentityKey);
    }
    const controlledNegativeSource = receiptProfile === "negative_fixture" && negativeFixtureDigestMatches;
    if (!controlledNegativeSource && !templateIdentityKeys.has(recordIdentityKey)) {
      fileErrors.push(`${rowLabel}:unknown_identity_tuple`);
      rowBlockers.push("unknown_identity_tuple");
      unknownIdentityRows += 1;
    }

    if (record.status_mutation === "false") {
      rowsWithStatusMutationFalse += 1;
    } else {
      fileErrors.push(`${rowLabel}:status_mutation:${record.status_mutation}`);
      rowBlockers.push("status_mutation_must_remain_false");
    }

    const humanValues = humanReceiptFields.map((field) => String(record[field] || "").trim());
    const blankCount = humanValues.filter((value) => value === "").length;
    const missingHumanFields = humanReceiptFields.filter((field) => !String(record[field] || "").trim());
    const signoffDate = String(record.signoff_date || "").trim();
    const signoffDateValid = signoffDate === "" || isStrictCalendarDate(signoffDate);
    if (signoffDate && !signoffDateValid) {
      fileErrors.push(`${rowLabel}:invalid_signoff_date:${signoffDate}`);
      rowBlockers.push("invalid_signoff_date");
    }
    blankHumanFieldCells += blankCount;
    if (blankCount === humanReceiptFields.length) {
      templateRowsAwaitingReceipt += 1;
    } else if (blankCount === 0 && signoffDateValid) {
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

    if (receiptProfile === "negative_fixture") {
      const fixtureNamespaceValid =
        String(record.gate_id || "").startsWith("negative_")
        && String(record.evidence_ref || "").startsWith("fixture://manual-gate-negative/")
        && record.scope === "fixture_only_negative_no_runtime_effect"
        && record.rollback_rule === "revert_fixture_only_row"
        && String(record.boundary_note || "").startsWith("fixture_only_negative_");
      if (!fixtureNamespaceValid) {
        fileErrors.push(`${rowLabel}:invalid_negative_fixture_namespace`);
        rowBlockers.push("invalid_negative_fixture_namespace");
        invalidNegativeFixtureNamespaceRows += 1;
      }
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
        receiptStatus: receiptComplete
          ? "complete_pending_manual_review"
          : missingHumanFields.length > 0
            ? "blocked_missing_receipt_fields"
            : "blocked_validation_errors",
        missingHumanFields,
        blockers: rowBlockers,
        inputStatusMutation: record.status_mutation,
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
        inputStatusMutation: outcome.inputStatusMutation,
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
    path: portablePath(path),
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

const controlledNegativeFixture =
  receiptProfile === "negative_fixture"
  && negativeFixtureDigestMatches
  && invalidNegativeFixtureNamespaceRows === 0
  && totalRows === 3;
const effectiveReceiptProfile = receiptProfile === "formal_intake"
  ? (templateRowsAwaitingReceipt === totalRows ? "formal_intake_blank" : "real_intake")
  : receiptProfile;
const acceptanceProfileFailures = [];
if (effectiveReceiptProfile === "template") {
  if (totalRows === 0) acceptanceProfileFailures.push("template_empty");
  if (templateRowsAwaitingReceipt !== totalRows) acceptanceProfileFailures.push("template_rows_not_all_awaiting");
  if (filledReceiptRows !== 0 || partialReceiptRows !== 0) acceptanceProfileFailures.push("template_human_fields_present");
} else if (effectiveReceiptProfile === "formal_intake_blank") {
  if (totalRows === 0) acceptanceProfileFailures.push("formal_intake_empty");
  if (templateRowsAwaitingReceipt !== totalRows) acceptanceProfileFailures.push("formal_intake_not_all_blank");
  if (blockedReceiptRows !== totalRows || statusPlanEligibleRows !== 0) {
    acceptanceProfileFailures.push("formal_intake_counts_invalid");
  }
} else if (effectiveReceiptProfile === "positive_fixture") {
  if (!positiveFixtureDigestMatches) acceptanceProfileFailures.push("positive_fixture_digest_mismatch");
  if (totalRows === 0 || blockedReceiptRows !== 0 || statusPlanEligibleRows !== totalRows) {
    acceptanceProfileFailures.push("positive_fixture_counts_invalid");
  }
} else if (effectiveReceiptProfile === "negative_fixture") {
  if (!controlledNegativeFixture) acceptanceProfileFailures.push("negative_fixture_contract_invalid");
  if (blockedReceiptRows !== totalRows || statusPlanEligibleRows !== 0) {
    acceptanceProfileFailures.push("negative_fixture_counts_invalid");
  }
} else if (totalRows === 0 || blockedReceiptRows !== 0 || statusPlanEligibleRows !== totalRows) {
  acceptanceProfileFailures.push("real_intake_requires_all_rows_eligible");
}
errors.push(...acceptanceProfileFailures.map((failure) => `acceptance_profile:${effectiveReceiptProfile}:${failure}`));
const acceptanceProfileValidation = {
  profile: effectiveReceiptProfile,
  failures: acceptanceProfileFailures,
  satisfied: acceptanceProfileFailures.length === 0
};

const blockerCounts = {};
rowOutcomes.forEach((outcome) => {
  outcome.blockers.forEach((blocker) => increment(blockerCounts, blocker));
});
const requiredExpectedBlockers = [...expectedBlockerNames];
const missingExpectedBlockers = requiredExpectedBlockers.filter((blocker) => !blockerCounts[blocker]);
const unexpectedBlockers = Object.keys(blockerCounts).filter((blocker) => !expectedBlockerNames.has(blocker));
const disallowedValidationIssues = expectedBlockersMode
  ? errors.filter((issue) => !issue.includes(":decision_result:") && !issue.includes(":status_mutation:"))
  : [];
const expectedBlockersSatisfied =
  expectedBlockersMode &&
  controlledNegativeFixture &&
  totalRows > 0 &&
  blockedReceiptRows === totalRows &&
  statusPlanEligibleRows === 0 &&
  missingExpectedBlockers.length === 0 &&
  unexpectedBlockers.length === 0 &&
  disallowedValidationIssues.length === 0;
const expectedBlockerValidation = expectedBlockersMode
  ? {
      enabled: true,
      requiredBlockers: requiredExpectedBlockers,
      blockerCounts,
      missingExpectedBlockers,
      unexpectedBlockers,
      disallowedValidationIssues,
      controlledNegativeFixture,
      satisfied: expectedBlockersSatisfied
    }
  : {
      enabled: false,
      requiredBlockers: [],
      blockerCounts,
      missingExpectedBlockers: [],
      unexpectedBlockers: [],
      disallowedValidationIssues: [],
      controlledNegativeFixture: false,
      satisfied: false
    };

const report = {
  generatedAt,
  templateMode,
  sourceMode: templateMode ? "receipt_templates" : "receipt_intake",
  receiptProfile: effectiveReceiptProfile,
  receiptDir: portablePath(receiptDir),
  receiptIntakePath: templateMode ? null : portablePath(receiptIntakePath),
  summaryPath: portablePath(summaryPath),
  validationPath: portablePath(validationPath),
  statusPlanPath: templateMode ? null : portablePath(statusPlanPath),
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
    invalidDecisionResultRows,
    unknownIdentityRows,
    duplicateIdentityRows,
    templateIdentityRows: templateIdentityKeys.size,
    blockerCounts
  },
  contract: {
    decisionResultAllowedValues
  },
  expectedBlockerValidation,
  acceptanceProfileValidation,
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
  receiptProfile: effectiveReceiptProfile,
  receiptIntakePath: portablePath(receiptIntakePath),
  summaryPath: portablePath(summaryPath),
  validationPath: portablePath(validationPath),
  statusPlanPath: portablePath(statusPlanPath),
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
    invalidDecisionResultRows,
    unknownIdentityRows,
    duplicateIdentityRows,
    templateIdentityRows: templateIdentityKeys.size,
    blockerCounts
  },
  contract: {
    decisionResultAllowedValues
  },
  expectedBlockerValidation,
  acceptanceProfileValidation,
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

if (expectedBlockersMode ? !expectedBlockersSatisfied : errors.length > 0) process.exit(1);
