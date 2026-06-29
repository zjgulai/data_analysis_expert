import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const scanRoot = process.env.SCM_PREPROD_SCAN_ROOT || root;
const dbPath = join(root, "data", "governance_workbench.sqlite");
const checks = [];
const hardBlockers = [];
const manualGates = [];
const warnings = [];

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
const productionCompose = hasFile("docker-compose.production.yml") ? read("docker-compose.production.yml") : "";
const requiredFiles = [
  "package-lock.json",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.production.yml",
  "server/index.mjs",
  "data/governance_workbench.sqlite",
  "dist/index.html",
  "dist/fulfillment-dashboard/index.html",
  "dist/fulfillment-dashboard/data/fulfillment_chart_data_binding_20260626.csv",
  "scripts/smoke-api.mjs",
  "scripts/smoke-readonly.mjs",
  "scripts/smoke-ui.mjs"
];

for (const file of requiredFiles) {
  record(`required-file:${file}`, hasFile(file), file);
}

for (const scriptName of ["check", "build", "smoke:api", "smoke:readonly", "smoke:ui", "preprod:check"]) {
  record(`package-script:${scriptName}`, Boolean(packageJson.scripts?.[scriptName]), packageJson.scripts?.[scriptName] || "missing");
}

const publicCopyIndex = dockerfile.indexOf("COPY public ./public");
const buildIndex = dockerfile.indexOf("RUN npm run build");
record("dockerfile-public-before-build", publicCopyIndex >= 0 && buildIndex >= 0 && publicCopyIndex < buildIndex, "Dockerfile copies public assets before Vite build");
record("dockerfile-healthcheck", dockerfile.includes("HEALTHCHECK"), "Docker image has healthcheck");
record("dockerfile-runtime-data-copy", dockerfile.includes("COPY data ./data"), "Docker image includes embedded data for standalone prototype");

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

const pemFiles = listFiles(scanRoot).filter((file) => file.endsWith(".pem"));
record("secret-file-scan:pem", pemFiles.length === 0, pemFiles.map((file) => relative(scanRoot, file)).slice(0, 10));

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
db.close();

record("manual-p0-owner-signoffs", p0OwnerSignoffs === 0, { p0OwnerSignoffs }, "manual");
record("manual-p0-field-mappings", p0FieldMappings === 0, { p0FieldMappings }, "manual");
record("manual-scei-weight-source", sceiWeightGate === 0, { ownerDecisionPacketsReady: sceiWeightGate }, "manual");

const dirtyCount = getGitDirtyCount();
record("worktree-clean-for-release-tag", dirtyCount === 0, { dirtyCount }, "warn");

const result = {
  generatedAt: new Date().toISOString(),
  root,
  scanRoot,
  releaseBoundary: {
    readOnlyPrototypeProduction: hardBlockers.length === 0,
    providerCalls: false,
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
    p0OwnerSignoffs,
    p0FieldMappings,
    dirtyCount
  },
  hardBlockers,
  manualGates,
  warnings,
  checks
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = hardBlockers.length ? 1 : 0;
