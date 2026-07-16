import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { countWorkstationHomePaths } from "./workstation-paths.mjs";

const root = process.cwd();
const scanRoot = process.env.SCM_PREPROD_SCAN_ROOT || root;
const dbPath = join(root, "data", "governance_workbench.sqlite");
const evidenceFileName = "ai-knowledge-evidence-quality-review-20260622.json";
const configuredProjectRoot = String(process.env.SCM_PROJECT_ROOT || "").trim();
const projectRoot = configuredProjectRoot ? resolve(configuredProjectRoot) : resolve(scanRoot);
const configuredEvidencePath = String(process.env.SCM_AI_KNOWLEDGE_EVIDENCE_PATH || "").trim();
const configuredOutputPath = String(process.env.SCM_PREPROD_OUTPUT_PATH || "").trim();
const evidencePath = configuredEvidencePath
  ? (isAbsolute(configuredEvidencePath) ? resolve(configuredEvidencePath) : resolve(projectRoot, configuredEvidencePath))
  : join(root, "runtime", "evidence", evidenceFileName);
const providerCallAuthorized = ["1", "true", "yes", "on"].includes(
  String(process.env.SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED || "").toLowerCase()
);
const databaseWriteAuthorized = ["1", "true", "yes", "on"].includes(
  String(process.env.SCM_DATABASE_WRITES_AUTHORIZED || "").toLowerCase()
);
const checks = [];
const hardBlockers = [];
const manualGates = [];
const warnings = [];

function portablePath(path) {
  const fromScanRoot = relative(resolve(scanRoot), resolve(path));
  if (fromScanRoot === "") return ".";
  if (!fromScanRoot.startsWith("..") && !isAbsolute(fromScanRoot)) return fromScanRoot;
  const fromRoot = relative(root, resolve(path));
  if (fromRoot === "") return ".";
  if (!fromRoot.startsWith("..") && !isAbsolute(fromRoot)) return fromRoot;
  return "external-path";
}

function record(name, ok, detail, severity = "hard") {
  checks.push({ name, ok, detail, severity });
  if (!ok) {
    if (severity === "manual") manualGates.push({ name, detail });
    else if (severity === "warn") warnings.push({ name, detail });
    else hardBlockers.push({ name, detail });
  }
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function hasFile(path) {
  return existsSync(join(root, path));
}

function listFiles(dir) {
  const entries = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !existsSync(current)) continue;
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (["node_modules", "dist", ".git", ".codebase-memory"].includes(entry)) continue;
        stack.push(fullPath);
      } else {
        entries.push(fullPath);
      }
    }
  }
  return entries;
}

function qi(value) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function count(db, sql) {
  const row = db.prepare(sql).get();
  return Number(Object.values(row || { count: 0 })[0] || 0);
}

function getGitDirtyCount() {
  try {
    const output = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
    return output.split("\n").filter(Boolean).length;
  } catch {
    return -1;
  }
}

const packageJson = JSON.parse(read("package.json"));
const dockerfile = read("Dockerfile");
const serverSource = read("server/index.mjs");
const importSource = read("scripts/import-assets.mjs");
const productionCompose = hasFile("docker-compose.production.yml") ? read("docker-compose.production.yml") : "";
const requiredFiles = [
  "package-lock.json",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.production.yml",
  "server/index.mjs",
  "data/governance_workbench.sqlite",
  `runtime/evidence/${evidenceFileName}`,
  "dist/index.html",
  "dist/fulfillment-dashboard/index.html",
  "dist/fulfillment-dashboard/data/fulfillment_chart_data_binding_20260626.csv",
  "scripts/smoke-api.mjs",
  "scripts/audit-ui-baseline.mjs",
  "scripts/smoke-database-gate.mjs",
  "scripts/smoke-import-gate.mjs",
  "scripts/export-manual-gate-resolution-pack.mjs",
  "scripts/smoke-manual-gate-receipts.mjs",
  "scripts/validate-manual-gate-receipts.mjs",
  "scripts/smoke-migration-gate.mjs",
  "scripts/smoke-path-contract.mjs",
  "scripts/smoke-provider-gate.mjs",
  "scripts/smoke-readonly.mjs",
  "scripts/smoke-ui.mjs",
  "tmp/outputs/ui-proof-screenshots-20260716/summary.json",
  "tmp/outputs/manual-gate-resolution-summary-20260630.json",
  "tmp/outputs/manual-gate-receipt-validation-20260630.json",
  "tmp/outputs/manual-gate-receipt-intake-validation-20260630.json",
  "tmp/outputs/manual-gate-receipt-positive-fixture-validation-20260630.json",
  "tmp/outputs/manual-gate-receipt-negative-fixture-validation-20260630.json",
  "tmp/outputs/manual-gate-negative-fixture-status-update-plan-20260630.json"
];

for (const file of requiredFiles) {
  record(`required-file:${file}`, hasFile(file), file);
}

for (const scriptName of ["check", "build", "audit:ui-baseline", "smoke:api", "smoke:database-gate", "smoke:import-gate", "smoke:manual-gate-receipts", "smoke:migration-gate", "smoke:path-contract", "smoke:provider-gate", "smoke:readonly", "smoke:ui", "preprod:check"]) {
  record(`package-script:${scriptName}`, Boolean(packageJson.scripts?.[scriptName]), packageJson.scripts?.[scriptName] || "missing");
}

const uiProofArtifactDir = "tmp/outputs/ui-proof-screenshots-20260716";
const uiProofFailures = [];
let uiProofScreenshotCount = 0;
let uiProofShaVerified = 0;
try {
  const uiProof = JSON.parse(read(`${uiProofArtifactDir}/summary.json`));
  const artifactRoot = resolve(root, uiProofArtifactDir);
  const digestEntries = Object.entries(uiProof.screenshotSha256 || {});
  const digestPaths = new Set(digestEntries.map(([screenshotPath]) => screenshotPath));
  const modules = Array.isArray(uiProof.modules) ? uiProof.modules : [];
  const moduleScreenshots = modules.map((module) => String(module?.screenshot || ""));
  uiProofScreenshotCount = digestEntries.length;
  for (const [screenshotPath, expectedHash] of digestEntries) {
    if (!screenshotPath.startsWith("screenshots/")) {
      uiProofFailures.push(`${screenshotPath}:outside-screenshot-root`);
      continue;
    }
    const resolvedScreenshot = resolve(artifactRoot, screenshotPath);
    const relativeScreenshot = relative(artifactRoot, resolvedScreenshot);
    if (relativeScreenshot.startsWith("..") || isAbsolute(relativeScreenshot)) {
      uiProofFailures.push(`${screenshotPath}:outside-artifact-root`);
      continue;
    }
    if (!existsSync(resolvedScreenshot)) {
      uiProofFailures.push(`${screenshotPath}:missing`);
      continue;
    }
    const actualHash = createHash("sha256").update(readFileSync(resolvedScreenshot)).digest("hex");
    if (actualHash !== expectedHash) uiProofFailures.push(`${screenshotPath}:sha256-mismatch`);
    else uiProofShaVerified += 1;
  }
  if (uiProof.moduleCount !== 15 || modules.length !== 15) {
    uiProofFailures.push("summary:module-count-not-15");
  }
  if (moduleScreenshots.some((screenshotPath) => !screenshotPath.startsWith("screenshots/"))) {
    uiProofFailures.push("summary:module-screenshot-outside-root");
  }
  if (new Set(moduleScreenshots).size !== modules.length) {
    uiProofFailures.push("summary:duplicate-module-screenshot");
  }
  for (const screenshotPath of moduleScreenshots) {
    if (!digestPaths.has(screenshotPath)) {
      uiProofFailures.push(`${screenshotPath || "missing"}:module-screenshot-not-hashed`);
    }
  }
  if (uiProof.screenshotRoot !== "screenshots") uiProofFailures.push("summary:screenshot-root-not-portable");
  if (uiProof.screenshotCount !== 15) uiProofFailures.push("summary:screenshot-count-not-15");
  if (uiProof.globalChecks?.nonReadOnlyRequests !== 0) uiProofFailures.push("summary:non-readonly-request");
  if (uiProof.globalChecks?.consoleErrors !== 0) uiProofFailures.push("summary:console-error");
  if (uiProof.globalChecks?.pageErrors !== 0) uiProofFailures.push("summary:page-error");
  if (uiProof.globalChecks?.maxOverflowX !== 0) uiProofFailures.push("summary:horizontal-overflow");
} catch (error) {
  uiProofFailures.push(`summary:${error.message}`);
}
record(
  "ui-proof-screenshot-artifacts",
  uiProofScreenshotCount === 15 && uiProofFailures.length === 0,
  { screenshotCount: uiProofScreenshotCount, sha256Verified: uiProofShaVerified, failures: uiProofFailures }
);

const manualGateEvidenceRoots = [
  join(root, "tmp", "outputs"),
  resolve(root, "../../analysis/aip-scm-node-deepdive-optimization-draft-20260627")
];
const manualGateOutputRoot = `${resolve(root, "tmp", "outputs")}${sep}`;
const manualGateEvidenceFiles = [...new Set(manualGateEvidenceRoots.flatMap((dir) => listFiles(dir)))]
  .filter((path) =>
    /\.(?:csv|json|md)$/i.test(path)
    && (
      (resolve(path).startsWith(manualGateOutputRoot) && path.includes("manual-gate"))
      || /^(?:6[3-9]|70)-manual-gate/.test(basename(path))
    )
  );
const manualGatePathFailures = manualGateEvidenceFiles
  .filter((path) => countWorkstationHomePaths(readFileSync(path, "utf8")) > 0)
  .map((path) => portablePath(path));
record(
  "manual-gate-evidence-portable-paths",
  manualGateEvidenceFiles.length > 0 && manualGatePathFailures.length === 0,
  { filesScanned: manualGateEvidenceFiles.length, failures: manualGatePathFailures }
);

const publicCopyIndex = dockerfile.indexOf("COPY public ./public");
const buildIndex = dockerfile.indexOf("RUN npm run build");
record("dockerfile-public-before-build", publicCopyIndex >= 0 && buildIndex >= 0 && publicCopyIndex < buildIndex, "Dockerfile copies public assets before Vite build");
record("dockerfile-healthcheck", dockerfile.includes("HEALTHCHECK"), "Docker image has healthcheck");
record("dockerfile-runtime-data-copy", dockerfile.includes("data ./data"), "Docker image includes embedded data for standalone prototype");
record("dockerfile-runtime-evidence-copy", dockerfile.includes("runtime ./runtime"), "Docker image keeps immutable evidence outside the mutable SQLite volume");
record("dockerfile-non-root-runtime", dockerfile.includes("USER node"), "Docker runtime uses the non-root node user");
record(
  "server-provider-authorization-gate",
  serverSource.includes("SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED") && serverSource.includes("error.statusCode = 403"),
  "DeepSeek route has an explicit server-side authorization gate"
);
record(
  "server-evidence-path-contract",
  serverSource.includes("SCM_PROJECT_ROOT") && serverSource.includes("SCM_AI_KNOWLEDGE_EVIDENCE_PATH"),
  "Evidence path supports project-root and explicit path overrides"
);
record(
  "server-database-authorization-gate",
  serverSource.includes("SCM_DATABASE_WRITES_AUTHORIZED")
    && serverSource.includes("readOnly: !databaseWriteAuthorized")
    && serverSource.includes("validateDatabaseSchema()"),
  "SQLite opens readonly by default, validates schema without repair, and gates mutation routes"
);
record(
  "import-database-rebuild-authorization-and-atomic-replace",
  importSource.includes("SCM_DATABASE_REBUILD_AUTHORIZED")
    && importSource.includes("temporaryDbPath")
    && importSource.includes("renameSync(temporaryDbPath, dbPath)"),
  "Destructive import requires explicit authorization and replaces SQLite only after a successful temporary build"
);
record(
  "provider-call-authorization-default-closed",
  !providerCallAuthorized,
  { envVar: "SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED", authorized: providerCallAuthorized }
);
record(
  "database-write-authorization-default-closed",
  !databaseWriteAuthorized,
  { envVar: "SCM_DATABASE_WRITES_AUTHORIZED", authorized: databaseWriteAuthorized }
);

let evidenceReviewPackets = 0;
let evidenceLoadError = "";
try {
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  evidenceReviewPackets = Array.isArray(evidence.domain_reviews) ? evidence.domain_reviews.length : 0;
} catch (error) {
  evidenceLoadError = error.message;
}
record(
  "runtime-evidence-review-packet",
  evidenceReviewPackets >= 4,
  evidenceLoadError
    ? { path: portablePath(evidencePath), error: evidenceLoadError }
    : { path: portablePath(evidencePath), evidenceReviewPackets, minimum: 4 }
);

record(
  "production-compose-external-volume",
  productionCompose.includes("scm_governance_workbench_scm-governance-data") &&
    productionCompose.includes("SCM_DATA_MOUNT_TYPE: docker_external_volume") &&
    productionCompose.includes("/app/data"),
  "production override keeps SQLite on external Docker volume"
);
record(
  "production-compose-edge-network",
  productionCompose.includes("lighthouse_ai_video_net") &&
    productionCompose.includes("external: true"),
  "production override attaches to existing edge network"
);

const secretKeyFiles = listFiles(scanRoot).filter((file) => file.endsWith(".pem") || file.endsWith(".key"));
record("secret-file-scan:pem-key", secretKeyFiles.length === 0, secretKeyFiles.map((file) => relative(scanRoot, file)).slice(0, 10));

const db = new DatabaseSync(dbPath, { readOnly: true });
const certifiedMetrics = count(db, "select count(*) as count from metrics where certification_status='certified'");
const activeTags = count(db, "select count(*) as count from tags where lifecycle_status='active'");
const certifiedLineageTargets = count(db, "select count(distinct target_ref) as count from lineage_edges where status='certified' and confidence>=0.8");
const recommendationCards = count(db, "select count(*) as count from recommendation_cards");
const suggestionReplayCards = count(db, "select count(*) as count from recommendation_cards where execution_status='suggestion_review_replay'");
const agentTraces = count(db, "select count(*) as count from agent_traces");
const nonSeedObjects = count(db, "select count(*) as count from ontology_object_instances where evidence_level <> 'prototype_seed'");
const badBoundaryRows = count(
  db,
  "select count(*) as count from decision_logs where lower(action_boundary || ' ' || review_note || ' ' || recommendation) like '%productionwrites=true%' or lower(action_boundary || ' ' || review_note || ' ' || recommendation) like '%providercalls=true%' or lower(action_boundary || ' ' || review_note || ' ' || recommendation) like '%erpwriteback=true%'"
);
const p0OwnerSignoffs = count(
  db,
  "select count(*) as count from governance_tasks where priority='P0' and task_type='owner_signoff' and status in ('未发起','待确认')"
);
const p0FieldMappings = count(
  db,
  "select count(*) as count from governance_tasks where priority='P0' and task_type='field_mapping' and status in ('未发起','待确认')"
);
const sceiWeightGate = count(
  db,
  "select count(*) as count from governance_tasks where id='aip_20260627_d_p1_05_scei_weight_source_required' and status='owner_decision_packet_ready'"
);

record("db-certified-metrics-minimum", certifiedMetrics >= 20, { certifiedMetrics, minimum: 20 });
record("db-certified-lineage-targets-minimum", certifiedLineageTargets >= 12, { certifiedLineageTargets, minimum: 12 });
record("db-active-tags-minimum", activeTags >= 8, { activeTags, minimum: 8 });
record("db-recommendation-cards-minimum", recommendationCards >= 15, { recommendationCards, minimum: 15 });
record("db-agent-traces-minimum", agentTraces >= 61, { agentTraces, minimum: 61 });
record("db-non-seed-object-present", nonSeedObjects >= 1, { nonSeedObjects, minimum: 1 });
record("db-no-open-provider-or-writeback-flags", badBoundaryRows === 0, { badBoundaryRows });
record("db-suggestion-review-replay-present", suggestionReplayCards >= 3, { suggestionReplayCards, minimum: 3 });

const textTables = db.prepare("select name from sqlite_schema where type='table' and name not like 'sqlite_%'").all();
const secretPatterns = ["%private key%", "%begin rsa%", "%begin openssh%", "%api_secret%", "%access_token%"];
let dbSecretHits = 0;
for (const { name } of textTables) {
  const columns = db.prepare(`pragma table_info(${qi(name)})`).all().filter((column) => String(column.type || "").toUpperCase().includes("TEXT"));
  for (const column of columns) {
    const predicates = secretPatterns.map((pattern) => `lower(${qi(column.name)}) like '${pattern}'`).join(" or ");
    dbSecretHits += count(db, `select count(*) as count from ${qi(name)} where ${predicates}`);
  }
}
record("db-secret-pattern-scan", dbSecretHits === 0, { dbSecretHits });

const dbPersonalPathHitLocations = [];
let dbPersonalPathHits = 0;
let dbPersonalPathOccurrences = 0;
for (const { name } of textTables) {
  const columns = db.prepare(`pragma table_info(${qi(name)})`).all()
    .filter((column) => /(CHAR|CLOB|TEXT)/i.test(String(column.type || "")));
  for (const column of columns) {
    const values = db.prepare(`select ${qi(column.name)} as value from ${qi(name)} where ${qi(column.name)} is not null`).all();
    let hits = 0;
    let occurrences = 0;
    for (const { value } of values) {
      const count = countWorkstationHomePaths(value);
      if (!count) continue;
      hits += 1;
      occurrences += count;
    }
    if (!hits) continue;
    dbPersonalPathHits += hits;
    dbPersonalPathOccurrences += occurrences;
    dbPersonalPathHitLocations.push({ table: name, column: column.name, hits, occurrences });
  }
}
record(
  "db-personal-path-pattern-scan",
  dbPersonalPathHits === 0,
  { dbPersonalPathHits, dbPersonalPathOccurrences, locations: dbPersonalPathHitLocations }
);
const dbPersonalPathRawByteHits = countWorkstationHomePaths(readFileSync(dbPath).toString("latin1"));
record(
  "db-personal-path-raw-byte-scan",
  dbPersonalPathRawByteHits === 0,
  { dbPersonalPathRawByteHits }
);
db.close();

record("manual-p0-owner-signoffs", p0OwnerSignoffs === 0, { p0OwnerSignoffs }, "manual");
record("manual-p0-field-mappings", p0FieldMappings === 0, { p0FieldMappings }, "manual");
record("manual-scei-weight-source", sceiWeightGate === 0, { ownerDecisionPacketsReady: sceiWeightGate }, "manual");

const dirtyCount = getGitDirtyCount();
record("worktree-clean-for-release-tag", dirtyCount === 0, { dirtyCount }, "warn");

const result = {
  generatedAt: new Date().toISOString(),
  root: portablePath(root),
  scanRoot: ".",
  releaseBoundary: {
    readOnlyPrototypeProduction: hardBlockers.length === 0,
    providerCalls: providerCallAuthorized && Boolean(process.env.DEEPSEEK_API_KEY),
    databaseWrites: databaseWriteAuthorized,
    productionWrites: false,
    erpWriteback: false,
    controlledWritebackProduction: false
  },
  counts: {
    certifiedMetrics,
    certifiedLineageTargets,
    activeTags,
    recommendationCards,
    suggestionReplayCards,
    agentTraces,
    nonSeedObjects,
    evidenceReviewPackets,
    p0OwnerSignoffs,
    p0FieldMappings,
    dirtyCount
  },
  hardBlockers,
  manualGates,
  warnings,
  checks
};

const serializedResult = `${JSON.stringify(result, null, 2)}\n`;
if (configuredOutputPath) {
  const outputPath = isAbsolute(configuredOutputPath)
    ? resolve(configuredOutputPath)
    : resolve(root, configuredOutputPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serializedResult);
}
console.log(serializedResult.trimEnd());
process.exitCode = hardBlockers.length ? 1 : 0;
