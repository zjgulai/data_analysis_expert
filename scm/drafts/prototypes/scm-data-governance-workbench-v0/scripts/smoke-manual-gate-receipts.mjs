import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { countWorkstationHomePaths } from "./workstation-paths.mjs";

const root = process.cwd();
const exporterPath = join(root, "scripts", "export-manual-gate-resolution-pack.mjs");
const validatorPath = join(root, "scripts", "validate-manual-gate-receipts.mjs");
const tempRoot = mkdtempSync(join(root, "tmp", "manual-gate-receipts-smoke-"));
const blockerNames = "invalid_decision_result,unsupported_packet_type,status_mutation_must_remain_false";
const generatedSummaryPath = join(tempRoot, "generated", "manual-gate-resolution-summary.json");
const generatedPacketDir = join(tempRoot, "generated", "owner-packets");
const generatedReceiptDir = join(tempRoot, "generated", "receipt-templates");
const sourceDatabasePath = join(root, "data", "governance_workbench.sqlite");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCase(name, overrides, expectedStatus) {
  const validationPath = join(tempRoot, `${name}-validation.json`);
  const statusPlanPath = join(tempRoot, `${name}-status-plan.json`);
  const result = spawnSync(process.execPath, [validatorPath], {
    cwd: root,
    env: {
      ...process.env,
      SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT: "2026-07-16T00:00:00.000Z",
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "true",
      SCM_MANUAL_GATE_EXPECTED_BLOCKERS: "false",
      SCM_MANUAL_GATE_EXPECTED_BLOCKER_NAMES: blockerNames,
      SCM_MANUAL_GATE_RECEIPT_DIR: generatedReceiptDir,
      SCM_MANUAL_GATE_SUMMARY_JSON: generatedSummaryPath,
      SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON: validationPath,
      SCM_MANUAL_GATE_STATUS_PLAN_JSON: statusPlanPath,
      ...overrides
    },
    encoding: "utf8"
  });
  assert(result.status === expectedStatus, `${name}:exit:${result.status}:expected:${expectedStatus}:${result.stderr}`);
  const report = JSON.parse(readFileSync(validationPath, "utf8"));
  assert(report.readyForStatusMutation === false, `${name}:status-mutation-boundary-open`);
  assert(report.boundary?.providerCalls === false, `${name}:provider-boundary-open`);
  assert(report.boundary?.productionWrites === false, `${name}:production-write-boundary-open`);
  return report;
}

try {
  const collisionDatabasePath = join(tempRoot, "collision-source.sqlite");
  copyFileSync(sourceDatabasePath, collisionDatabasePath);
  const collisionDatabaseBefore = readFileSync(collisionDatabasePath);
  const collisionResult = spawnSync(process.execPath, [exporterPath], {
    cwd: root,
    env: {
      ...process.env,
      SCM_DB_PATH: collisionDatabasePath,
      SCM_MANUAL_GATE_OWNER_CSV: collisionDatabasePath,
      SCM_MANUAL_GATE_MAPPING_CSV: join(tempRoot, "collision", "field-mapping.csv"),
      SCM_MANUAL_GATE_SCEI_CSV: join(tempRoot, "collision", "scei-weight.csv"),
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: join(tempRoot, "collision", "receipt-intake.csv"),
      SCM_MANUAL_GATE_SUMMARY_JSON: join(tempRoot, "collision", "summary.json"),
      SCM_MANUAL_GATE_PACKET_DIR: join(tempRoot, "collision", "owner-packets"),
      SCM_MANUAL_GATE_RECEIPT_DIR: join(tempRoot, "collision", "receipt-templates")
    },
    encoding: "utf8"
  });
  assert(collisionResult.status !== 0, "export:source-database-output-collision-not-rejected");
  assert(
    readFileSync(collisionDatabasePath).equals(collisionDatabaseBefore),
    "export:source-database-changed-after-output-collision"
  );

  const duplicateOutputPath = join(tempRoot, "duplicate", "shared.csv");
  const duplicateOutputResult = spawnSync(process.execPath, [exporterPath], {
    cwd: root,
    env: {
      ...process.env,
      SCM_MANUAL_GATE_OWNER_CSV: duplicateOutputPath,
      SCM_MANUAL_GATE_MAPPING_CSV: duplicateOutputPath,
      SCM_MANUAL_GATE_SCEI_CSV: join(tempRoot, "duplicate", "scei-weight.csv"),
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: join(tempRoot, "duplicate", "receipt-intake.csv"),
      SCM_MANUAL_GATE_SUMMARY_JSON: join(tempRoot, "duplicate", "summary.json"),
      SCM_MANUAL_GATE_PACKET_DIR: join(tempRoot, "duplicate", "owner-packets"),
      SCM_MANUAL_GATE_RECEIPT_DIR: join(tempRoot, "duplicate", "receipt-templates")
    },
    encoding: "utf8"
  });
  assert(duplicateOutputResult.status !== 0, "export:duplicate-output-file-not-rejected");

  const sharedPacketDirectory = join(tempRoot, "duplicate-directories", "shared");
  const duplicateDirectoryResult = spawnSync(process.execPath, [exporterPath], {
    cwd: root,
    env: {
      ...process.env,
      SCM_MANUAL_GATE_OWNER_CSV: join(tempRoot, "duplicate-directories", "owner-signoff.csv"),
      SCM_MANUAL_GATE_MAPPING_CSV: join(tempRoot, "duplicate-directories", "field-mapping.csv"),
      SCM_MANUAL_GATE_SCEI_CSV: join(tempRoot, "duplicate-directories", "scei-weight.csv"),
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: join(tempRoot, "duplicate-directories", "receipt-intake.csv"),
      SCM_MANUAL_GATE_SUMMARY_JSON: join(tempRoot, "duplicate-directories", "summary.json"),
      SCM_MANUAL_GATE_PACKET_DIR: sharedPacketDirectory,
      SCM_MANUAL_GATE_RECEIPT_DIR: sharedPacketDirectory
    },
    encoding: "utf8"
  });
  assert(duplicateDirectoryResult.status !== 0, "export:duplicate-packet-directory-not-rejected");

  const formulaDatabasePath = join(tempRoot, "formula-source.sqlite");
  copyFileSync(sourceDatabasePath, formulaDatabasePath);
  const formulaFixtureResult = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--input-type=module",
      "-e",
      `import { DatabaseSync } from "node:sqlite";
       const database = new DatabaseSync(process.argv.at(-1));
       database.exec(\`UPDATE governance_tasks SET notes='=1+1' WHERE id=(SELECT id FROM governance_tasks WHERE priority='P0' AND task_type='owner_signoff' AND status IN ('未发起','待确认') ORDER BY id LIMIT 1)\`);
       database.close();`,
      formulaDatabasePath
    ],
    { encoding: "utf8" }
  );
  assert(formulaFixtureResult.status === 0, `formula-fixture:exit:${formulaFixtureResult.status}:${formulaFixtureResult.stderr}`);
  const formulaOwnerCsvPath = join(tempRoot, "formula", "owner-signoff.csv");
  const formulaResult = spawnSync(process.execPath, [exporterPath], {
    cwd: root,
    env: {
      ...process.env,
      SCM_DB_PATH: formulaDatabasePath,
      SCM_MANUAL_GATE_OWNER_CSV: formulaOwnerCsvPath,
      SCM_MANUAL_GATE_MAPPING_CSV: join(tempRoot, "formula", "field-mapping.csv"),
      SCM_MANUAL_GATE_SCEI_CSV: join(tempRoot, "formula", "scei-weight.csv"),
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: join(tempRoot, "formula", "receipt-intake.csv"),
      SCM_MANUAL_GATE_SUMMARY_JSON: join(tempRoot, "formula", "summary.json"),
      SCM_MANUAL_GATE_PACKET_DIR: join(tempRoot, "formula", "owner-packets"),
      SCM_MANUAL_GATE_RECEIPT_DIR: join(tempRoot, "formula", "receipt-templates")
    },
    encoding: "utf8"
  });
  assert(formulaResult.status === 0, `export:formula-fixture-exit:${formulaResult.status}:${formulaResult.stderr}`);
  assert(
    readFileSync(formulaOwnerCsvPath, "utf8").includes(",'=1+1,"),
    "export:spreadsheet-formula-not-neutralized"
  );

  const blockedSceiDatabasePath = join(tempRoot, "blocked-scei-source.sqlite");
  copyFileSync(sourceDatabasePath, blockedSceiDatabasePath);
  const blockedSceiFixtureResult = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--input-type=module",
      "-e",
      `import { DatabaseSync } from "node:sqlite";
       const database = new DatabaseSync(process.argv.at(-1));
       database.prepare("UPDATE governance_tasks SET status='未发起' WHERE id='aip_20260627_d_p1_05_scei_weight_source_required'").run();
       database.close();`,
      blockedSceiDatabasePath
    ],
    { encoding: "utf8" }
  );
  assert(blockedSceiFixtureResult.status === 0, `blocked-scei-fixture:exit:${blockedSceiFixtureResult.status}:${blockedSceiFixtureResult.stderr}`);
  const blockedSceiSummaryPath = join(tempRoot, "blocked-scei", "summary.json");
  const blockedSceiResult = spawnSync(process.execPath, [exporterPath], {
    cwd: root,
    env: {
      ...process.env,
      SCM_DB_PATH: blockedSceiDatabasePath,
      SCM_MANUAL_GATE_OWNER_CSV: join(tempRoot, "blocked-scei", "owner-signoff.csv"),
      SCM_MANUAL_GATE_MAPPING_CSV: join(tempRoot, "blocked-scei", "field-mapping.csv"),
      SCM_MANUAL_GATE_SCEI_CSV: join(tempRoot, "blocked-scei", "scei-weight.csv"),
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: join(tempRoot, "blocked-scei", "receipt-intake.csv"),
      SCM_MANUAL_GATE_SUMMARY_JSON: blockedSceiSummaryPath,
      SCM_MANUAL_GATE_PACKET_DIR: join(tempRoot, "blocked-scei", "owner-packets"),
      SCM_MANUAL_GATE_RECEIPT_DIR: join(tempRoot, "blocked-scei", "receipt-templates")
    },
    encoding: "utf8"
  });
  assert(blockedSceiResult.status === 0, `export:blocked-scei-exit:${blockedSceiResult.status}:${blockedSceiResult.stderr}`);
  const blockedSceiSummary = JSON.parse(readFileSync(blockedSceiSummaryPath, "utf8"));
  assert(blockedSceiSummary.counts.sceiWeightSourceOwnerDecisionPacketsReady === 0, "export:blocked-scei-ready-count-not-zero");
  assert(blockedSceiSummary.counts.receiptTemplateRows === 48, "export:blocked-scei-packet-rows-emitted");
  assert(blockedSceiSummary.counts.ownerPacketCount === 7, "export:blocked-scei-empty-owner-packet-emitted");
  assert(
    !blockedSceiSummary.ownerBuckets.some((bucket) => bucket.task_type === "scei_weight_source"),
    "export:blocked-scei-owner-bucket-emitted"
  );

  const exportResult = spawnSync(process.execPath, [exporterPath], {
    cwd: root,
    env: {
      ...process.env,
      SCM_MANUAL_GATE_GENERATED_AT: "2026-07-16T00:00:00.000Z",
      SCM_MANUAL_GATE_OWNER_CSV: join(tempRoot, "generated", "owner-signoff.csv"),
      SCM_MANUAL_GATE_MAPPING_CSV: join(tempRoot, "generated", "field-mapping.csv"),
      SCM_MANUAL_GATE_SCEI_CSV: join(tempRoot, "generated", "scei-weight.csv"),
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: join(tempRoot, "generated", "receipt-intake.csv"),
      SCM_MANUAL_GATE_SUMMARY_JSON: generatedSummaryPath,
      SCM_MANUAL_GATE_PACKET_DIR: generatedPacketDir,
      SCM_MANUAL_GATE_RECEIPT_DIR: generatedReceiptDir
    },
    encoding: "utf8"
  });
  assert(exportResult.status === 0, `export:exit:${exportResult.status}:${exportResult.stderr}`);
  const exportSummary = JSON.parse(readFileSync(generatedSummaryPath, "utf8"));
  assert(exportSummary.counts.receiptTemplateRows === 53, "export:template-rows-not-53");
  assert(exportSummary.counts.ownerPacketCount === 8, "export:owner-packets-not-8");
  for (const workstationPath of ["/Users/example/project", "/home/example/project", "C:\\Users\\example\\project", JSON.stringify({ path: "C:\\Users\\example\\project" })]) {
    assert(countWorkstationHomePaths(workstationPath) === 1, "portability-pattern-miss");
  }
  assert(countWorkstationHomePaths(JSON.stringify(exportSummary)) === 0, "export:workstation-path-leak");
  const sceiOwnerPacket = readFileSync(join(generatedPacketDir, "scm-data-governance-owner.md"), "utf8");
  assert((sceiOwnerPacket.match(/owner_decision_packet_ready/g) || []).length === 5, "export:scei-status-not-populated");

  const missingPathReport = runCase(
    "missing-paths",
    {
      SCM_MANUAL_GATE_SUMMARY_JSON: join(tempRoot, "missing", "summary.json"),
      SCM_MANUAL_GATE_RECEIPT_DIR: join(tempRoot, "missing", "receipt-templates")
    },
    1
  );
  assert(
    !JSON.stringify(missingPathReport.errors).includes(root),
    "validation:raw-workstation-path-in-errors"
  );

  const template = runCase("template", {}, 0);
  assert(template.schemaValid, "template:schema-invalid");
  assert(template.counts.receiptFiles === 8, "template:receipt-files-not-8");
  assert(template.counts.totalRows === 53, "template:rows-not-53");
  assert(template.counts.templateRowsAwaitingReceipt === 53, "template:awaiting-not-53");
  assert(template.errors.length === 0, "template:unexpected-errors");

  const intake = runCase(
    "intake",
    {
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "false",
      SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS: "53"
    },
    0
  );
  assert(intake.counts.totalRows === 53, "intake:rows-not-53");
  assert(intake.counts.blockedReceiptRows === 53, "intake:blocked-not-53");
  assert(intake.counts.statusPlanEligibleRows === 0, "intake:unexpected-eligible-rows");
  assert(intake.errors.length === 0, "intake:unexpected-errors");

  const positive = runCase(
    "positive",
    {
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "false",
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: "tmp/fixtures/manual-gate-receipt-positive-fixture-20260630.csv",
      SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS: "2"
    },
    0
  );
  assert(positive.counts.statusPlanEligibleRows === 2, "positive:eligible-not-2");
  assert(positive.counts.blockedReceiptRows === 0, "positive:unexpected-blocked-rows");
  assert(positive.errors.length === 0, "positive:unexpected-errors");

  const positiveSource = readFileSync(join(root, "tmp", "fixtures", "manual-gate-receipt-positive-fixture-20260630.csv"), "utf8");
  const [header, firstRow, secondRow] = positiveSource.trimEnd().split("\n");
  const extraColumnPath = join(tempRoot, "extra-column.csv");
  writeFileSync(extraColumnPath, `${header}\n${firstRow},unexpected\n${secondRow}\n`, "utf8");
  const extraColumn = runCase(
    "extra-column",
    {
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "false",
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: extraColumnPath,
      SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS: "2"
    },
    1
  );
  assert(extraColumn.errors.some((error) => error.includes("invalid_column_count")), "extra-column:not-rejected-by-width");

  const unknownIdentityPath = join(tempRoot, "unknown-identity.csv");
  writeFileSync(unknownIdentityPath, `${header}\n${firstRow.replace("signoff_26", "unknown_signoff_26")}\n${secondRow}\n`, "utf8");
  const unknownIdentity = runCase(
    "unknown-identity",
    {
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "false",
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: unknownIdentityPath,
      SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS: "2"
    },
    1
  );
  assert(unknownIdentity.counts.unknownIdentityRows === 1, "unknown-identity:not-rejected");

  const firstCells = firstRow.split(",");
  const duplicateCells = secondRow.split(",");
  for (let index = 0; index < 6; index += 1) duplicateCells[index] = firstCells[index];
  const duplicateIdentityPath = join(tempRoot, "duplicate-identity.csv");
  writeFileSync(duplicateIdentityPath, `${header}\n${firstRow}\n${duplicateCells.join(",")}\n`, "utf8");
  const duplicateIdentity = runCase(
    "duplicate-identity",
    {
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "false",
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: duplicateIdentityPath,
      SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS: "2"
    },
    1
  );
  assert(duplicateIdentity.counts.duplicateIdentityRows === 1, "duplicate-identity:not-rejected");

  const invalidDatePath = join(tempRoot, "invalid-date.csv");
  writeFileSync(invalidDatePath, positiveSource.replace("2026-06-30", "2026-02-30"), "utf8");
  const invalidDate = runCase(
    "invalid-date",
    {
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "false",
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: invalidDatePath,
      SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS: "2"
    },
    1
  );
  assert(invalidDate.counts.blockerCounts.invalid_signoff_date === 1, "invalid-date:not-rejected");

  const expectedBlockersMisuse = runCase(
    "expected-blockers-misuse",
    {
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "false",
      SCM_MANUAL_GATE_EXPECTED_BLOCKERS: "true",
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: "tmp/fixtures/manual-gate-receipt-positive-fixture-20260630.csv",
      SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS: "2"
    },
    1
  );
  assert(!expectedBlockersMisuse.expectedBlockerValidation?.satisfied, "expected-blockers-misuse:accepted");

  const negativeExpected = runCase(
    "negative-expected",
    {
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "false",
      SCM_MANUAL_GATE_EXPECTED_BLOCKERS: "true",
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: "tmp/fixtures/manual-gate-receipt-negative-fixture-20260630.csv",
      SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS: "3"
    },
    0
  );
  assert(negativeExpected.counts.blockedReceiptRows === 3, "negative-expected:blocked-not-3");
  assert(negativeExpected.counts.statusPlanEligibleRows === 0, "negative-expected:unexpected-eligible-rows");
  assert(negativeExpected.expectedBlockerValidation?.satisfied, "negative-expected:blocker-contract-unsatisfied");
  assert(negativeExpected.expectedBlockerValidation.unexpectedBlockers.length === 0, "negative-expected:unexpected-blockers");

  const negativeStrict = runCase(
    "negative-strict",
    {
      SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE: "false",
      SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV: "tmp/fixtures/manual-gate-receipt-negative-fixture-20260630.csv",
      SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS: "3"
    },
    1
  );
  assert(negativeStrict.counts.blockedReceiptRows === 3, "negative-strict:blocked-not-3");
  assert(negativeStrict.errors.length > 0, "negative-strict:missing-errors");

  console.log(JSON.stringify({
    ok: true,
    export: { ownerPackets: 8, receiptTemplateRows: 53, sceiStatusesPopulated: 5, portablePaths: true },
    template: { files: 8, rows: 53, awaiting: 53 },
    intake: { rows: 53, blocked: 53, eligible: 0 },
    positive: { rows: 2, blocked: 0, eligible: 2 },
    negativeExpected: { rows: 3, blocked: 3, eligible: 0, blockerContractSatisfied: true },
    negativeStrict: { exitCode: 1, blocked: 3 },
    adversarial: {
      unknownIdentityRejected: true,
      duplicateIdentityRejected: true,
      invalidCalendarDateRejected: true,
      expectedBlockersMisuseRejected: true
    },
    boundary: { statusMutation: false, providerCalls: false, productionWrites: false }
  }, null, 2));
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
