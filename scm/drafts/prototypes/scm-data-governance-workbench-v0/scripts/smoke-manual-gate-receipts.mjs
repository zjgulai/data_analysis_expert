import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const exporterPath = join(root, "scripts", "export-manual-gate-resolution-pack.mjs");
const validatorPath = join(root, "scripts", "validate-manual-gate-receipts.mjs");
const tempRoot = mkdtempSync(join(root, "tmp", "manual-gate-receipts-smoke-"));
const blockerNames = "invalid_decision_result,unsupported_packet_type,status_mutation_must_remain_false";
const generatedSummaryPath = join(tempRoot, "generated", "manual-gate-resolution-summary.json");
const generatedPacketDir = join(tempRoot, "generated", "owner-packets");
const generatedReceiptDir = join(tempRoot, "generated", "receipt-templates");
const workstationPathPattern = /(?:[\\/]{1,2}Users[\\/]{1,2}|[\\/]{1,2}home[\\/]{1,2})/i;

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
    assert(workstationPathPattern.test(workstationPath), `portability-pattern-miss:${workstationPath}`);
  }
  assert(!workstationPathPattern.test(JSON.stringify(exportSummary)), "export:workstation-path-leak");
  const sceiOwnerPacket = readFileSync(join(generatedPacketDir, "scm-data-governance-owner.md"), "utf8");
  assert((sceiOwnerPacket.match(/owner_decision_packet_ready/g) || []).length === 5, "export:scei-status-not-populated");

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
