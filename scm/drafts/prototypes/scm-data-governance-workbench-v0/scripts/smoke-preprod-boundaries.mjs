import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const preprodCheckPath = join(scriptDir, "preprod-check.mjs");
const sandboxRoot = mkdtempSync(join(tmpdir(), "scm-preprod-boundaries-"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runPreprod(scanRoot, name, cwd = appRoot, scriptPath = preprodCheckPath) {
  const outputPath = join(sandboxRoot, `${name}.json`);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd,
    env: {
      ...process.env,
      SCM_PREPROD_SCAN_ROOT: scanRoot,
      SCM_PREPROD_OUTPUT_PATH: outputPath,
      SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED: "",
      SCM_DATABASE_WRITES_AUTHORIZED: ""
    },
    encoding: "utf8"
  });
  assert(result.status !== null, `${name}:preprod-process-did-not-exit`);
  const report = JSON.parse(readFileSync(outputPath, "utf8"));
  const expectedStatus = report.hardBlockers.length > 0 ? 1 : 0;
  assert(result.status === expectedStatus, `${name}:exit-status-${result.status}-did-not-match-hard-blockers-${expectedStatus}`);
  return { report, status: result.status };
}

function execDatabaseSql(path, sql) {
  const database = new DatabaseSync(path);
  try {
    database.exec(sql);
  } finally {
    database.close();
  }
}

try {
  const uppercaseExtensionScanRoot = join(sandboxRoot, "uppercase-extension-scan");
  mkdirSync(uppercaseExtensionScanRoot, { recursive: true });
  writeFileSync(join(uppercaseExtensionScanRoot, "fixture-credential.PEM"), "fixture only\n", "utf8");
  const { report: uppercaseExtensionReport, status: uppercaseExtensionStatus } = runPreprod(uppercaseExtensionScanRoot, "uppercase-extension");
  assert(uppercaseExtensionStatus === 1, "uppercase-extension:failed-secret-scan-must-exit-nonzero");
  const uppercaseExtensionCheck = uppercaseExtensionReport.checks.find(
    (check) => check.name === "secret-file-scan:pem-key"
  );
  assert(uppercaseExtensionCheck, "uppercase-extension:missing-secret-file-check");
  assert(uppercaseExtensionCheck.ok === false, "uppercase-extension:mixed-case-secret-file-not-detected");
  assert(
    uppercaseExtensionCheck.detail.some((path) => path.endsWith("fixture-credential.PEM")),
    "uppercase-extension:detected-file-not-reported"
  );
  for (const checkName of [
    "behavior-provider-authorization-gate",
    "behavior-database-authorization-gate",
    "behavior-import-authorization-and-atomic-replace"
  ]) {
    const check = uppercaseExtensionReport.checks.find((entry) => entry.name === checkName);
    assert(check, `behavior-gates:${checkName}:missing-check`);
    assert(check.ok === true, `behavior-gates:${checkName}:failed`);
  }

  const symlinkScanRoot = join(sandboxRoot, "symlink-scan");
  const outsideScanRoot = join(sandboxRoot, "outside-scan-root");
  mkdirSync(symlinkScanRoot, { recursive: true });
  mkdirSync(outsideScanRoot, { recursive: true });
  writeFileSync(join(outsideScanRoot, "outside-secret.key"), "fixture only\n", "utf8");
  symlinkSync(outsideScanRoot, join(symlinkScanRoot, "linked-outside"), "dir");
  const { report: symlinkReport, status: symlinkStatus } = runPreprod(symlinkScanRoot, "symlink-traversal");
  assert(
    symlinkStatus === 0,
    `symlink-traversal:clean-contained-scan-must-exit-zero:${JSON.stringify(symlinkReport.hardBlockers)}`
  );
  const symlinkSecretCheck = symlinkReport.checks.find(
    (check) => check.name === "secret-file-scan:pem-key"
  );
  assert(symlinkSecretCheck, "symlink-traversal:missing-secret-file-check");
  assert(symlinkSecretCheck.ok === true, "symlink-traversal:followed-directory-outside-scan-root");
  assert(symlinkSecretCheck.detail.length === 0, "symlink-traversal:reported-outside-secret-file");

  const screenshotSandboxRoot = join(sandboxRoot, "screenshot-containment-app");
  cpSync(appRoot, screenshotSandboxRoot, {
    recursive: true,
    filter: (source) => !source.split("/").includes("node_modules") && !source.split("/").includes(".git")
  });
  const artifactRoot = join(screenshotSandboxRoot, "tmp", "outputs", "ui-proof-screenshots-20260716");
  const summaryPath = join(artifactRoot, "summary.json");
  const originalSummaryText = readFileSync(summaryPath, "utf8");
  const summary = JSON.parse(originalSummaryText);
  const [originalScreenshotPath] = Object.keys(summary.screenshotSha256);
  const traversalScreenshotPath = "screenshots/../outside-screenshots.png";
  const traversalScreenshotFile = join(artifactRoot, "outside-screenshots.png");
  writeFileSync(traversalScreenshotFile, "not a screenshot directory member\n", "utf8");
  const traversalScreenshotHash = createHash("sha256")
    .update(readFileSync(traversalScreenshotFile))
    .digest("hex");
  delete summary.screenshotSha256[originalScreenshotPath];
  summary.screenshotSha256[traversalScreenshotPath] = traversalScreenshotHash;
  const matchingModule = summary.modules.find((module) => module.screenshot === originalScreenshotPath);
  assert(matchingModule, "screenshot-containment:matching-module-not-found");
  matchingModule.screenshot = traversalScreenshotPath;
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  const { report: screenshotContainmentReport, status: screenshotContainmentStatus } = runPreprod(
    screenshotSandboxRoot,
    "screenshot-containment",
    screenshotSandboxRoot,
    join(screenshotSandboxRoot, "scripts", "preprod-check.mjs")
  );
  assert(screenshotContainmentStatus === 1, "screenshot-containment:failed-artifact-check-must-exit-nonzero");
  const screenshotContainmentCheck = screenshotContainmentReport.checks.find(
    (check) => check.name === "ui-proof-screenshot-artifacts"
  );
  assert(screenshotContainmentCheck, "screenshot-containment:missing-ui-proof-check");
  assert(screenshotContainmentCheck.ok === false, "screenshot-containment:traversal-path-accepted");
  assert(
    screenshotContainmentCheck.detail.failures.some((failure) =>
      failure.includes("outside-screenshot-root")
    ),
    "screenshot-containment:traversal-rejection-not-reported"
  );
  writeFileSync(summaryPath, originalSummaryText, "utf8");

  const governanceDatabasePath = join(screenshotSandboxRoot, "data", "governance_workbench.sqlite");
  execDatabaseSql(governanceDatabasePath, `
    UPDATE governance_tasks SET status='reviewed'
    WHERE priority='P0'
      AND (task_type IN ('owner_signoff','field_mapping') OR id='aip_20260627_d_p1_05_scei_weight_source_required');
  `);
  const { report: unacceptedStatusReport, status: unacceptedStatus } = runPreprod(
    screenshotSandboxRoot,
    "unaccepted-governance-statuses",
    screenshotSandboxRoot,
    join(screenshotSandboxRoot, "scripts", "preprod-check.mjs")
  );
  assert(unacceptedStatus === 0, "unaccepted-governance-statuses:manual-gates-must-not-masquerade-as-hard-failures");
  for (const checkName of [
    "manual-p0-owner-signoffs",
    "manual-p0-field-mappings",
    "manual-scei-weight-source"
  ]) {
    const check = unacceptedStatusReport.checks.find((entry) => entry.name === checkName);
    assert(check, `unaccepted-governance-statuses:${checkName}:missing-check`);
    assert(check.ok === false, `unaccepted-governance-statuses:${checkName}:unrecognized-status-treated-complete`);
    assert(check.detail.unaccepted > 0, `unaccepted-governance-statuses:${checkName}:missing-unaccepted-count`);
  }

  execDatabaseSql(governanceDatabasePath, `
    UPDATE governance_tasks SET status='done' WHERE priority='P0' AND task_type='owner_signoff';
    UPDATE governance_tasks SET status='已映射' WHERE priority='P0' AND task_type='field_mapping';
    UPDATE governance_tasks SET status='certified' WHERE id='aip_20260627_d_p1_05_scei_weight_source_required';
  `);
  const { report: acceptedStatusReport, status: acceptedStatus } = runPreprod(
    screenshotSandboxRoot,
    "accepted-governance-statuses",
    screenshotSandboxRoot,
    join(screenshotSandboxRoot, "scripts", "preprod-check.mjs")
  );
  assert(acceptedStatus === 0, "accepted-governance-statuses:clean-hard-gates-must-exit-zero");
  const acceptedExpectations = {
    "manual-p0-owner-signoffs": 30,
    "manual-p0-field-mappings": 18,
    "manual-scei-weight-source": 1
  };
  for (const [checkName, expectedAccepted] of Object.entries(acceptedExpectations)) {
    const check = acceptedStatusReport.checks.find((entry) => entry.name === checkName);
    assert(check, `accepted-governance-statuses:${checkName}:missing-check`);
    assert(check.ok === true, `accepted-governance-statuses:${checkName}:formal-completion-status-rejected`);
    assert(check.detail.accepted === expectedAccepted, `accepted-governance-statuses:${checkName}:accepted-count-mismatch`);
  }

  execDatabaseSql(governanceDatabasePath, `
    DELETE FROM governance_tasks
    WHERE priority='P0'
      AND (task_type IN ('owner_signoff','field_mapping') OR id='aip_20260627_d_p1_05_scei_weight_source_required');
  `);
  const { report: missingGovernanceReport, status: missingGovernanceStatus } = runPreprod(
    screenshotSandboxRoot,
    "missing-governance-populations",
    screenshotSandboxRoot,
    join(screenshotSandboxRoot, "scripts", "preprod-check.mjs")
  );
  assert(missingGovernanceStatus === 0, "missing-governance-populations:manual-gates-must-not-masquerade-as-hard-failures");
  for (const checkName of [
    "manual-p0-owner-signoffs",
    "manual-p0-field-mappings",
    "manual-scei-weight-source"
  ]) {
    const check = missingGovernanceReport.checks.find((entry) => entry.name === checkName);
    assert(check, `missing-governance-populations:${checkName}:missing-check`);
    assert(check.ok === false, `missing-governance-populations:${checkName}:missing-tasks-treated-complete`);
  }

  console.log(JSON.stringify({
    ok: true,
    uppercaseSecretExtensionDetected: true,
    symlinkTraversalSkipped: true,
    screenshotContainmentEnforced: true,
    missingGovernancePopulationsRejected: true,
    unacceptedGovernanceStatusesRejected: true,
    acceptedGovernanceStatusesRecognized: true,
    authorizationBehaviorGatesExecuted: true,
    productionWrites: false,
    providerCalls: false
  }, null, 2));
} finally {
  rmSync(sandboxRoot, { recursive: true, force: true });
}
