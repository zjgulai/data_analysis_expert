import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { countWorkstationHomePaths, redactWorkstationPaths, workstationHomeRedaction } from "./workstation-paths.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceAppRoot = resolve(scriptDir, "..");
const sourceDatabasePath = join(sourceAppRoot, "data", "governance_workbench.sqlite");
const sandboxRepositoryRoot = mkdtempSync(join(tmpdir(), "scm-import-gate-"));
const sandboxRoot = join(sandboxRepositoryRoot, "scm", "drafts", "prototypes", "scm-data-governance-workbench-v0");
const sandboxScriptDir = join(sandboxRoot, "scripts");
const sandboxDatabasePath = join(sandboxRoot, "data", "governance_workbench.sqlite");
const metricBlueprintFile = "supply-chain-metric-system-l0-l3-blueprint-mece-v2-20260618.json";
const loop3Rows = {
  action_tasks: ["action_loop3_20260701_finance_cost_tail_warehouse_return"],
  agent_traces: ["trace_loop3_20260701_finance_cost_tail_warehouse_return"],
  aip_scenarios: [
    "scenario_loop3_inventory_stockout_three_way_20260701",
    "scenario_loop3_finance_cost_tail_warehouse_return_20260701",
    "scenario_loop3_fulfillment_eta_delivery_exception_20260701"
  ],
  decision_logs: ["decision_loop3_20260701_finance_cost_tail_warehouse_return"],
  ontology_object_instances: ["cost_event_loop3_tail_warehouse_return_20260701"],
  recommendation_cards: ["rec_loop3_20260701_finance_cost_tail_warehouse_return"],
  trace_reviews: ["trace_review_loop3_20260701_finance_cost_tail_warehouse_return"]
};

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function countDatabasePersonalPaths(db) {
  let hits = 0;
  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  for (const { name } of tables) {
    const columns = db.prepare(`PRAGMA table_info(${quoteIdentifier(name)})`).all()
      .filter((column) => /(CHAR|CLOB|TEXT)/i.test(String(column.type || "")));
    for (const column of columns) {
      const values = db.prepare(`SELECT ${quoteIdentifier(column.name)} AS value FROM ${quoteIdentifier(name)} WHERE ${quoteIdentifier(column.name)} IS NOT NULL`).all();
      hits += values.filter(({ value }) => countWorkstationHomePaths(value) > 0).length;
    }
  }
  return hits;
}

function countRawDatabasePersonalPaths(path) {
  return countWorkstationHomePaths(readFileSync(path).toString("latin1"));
}

const sourceHashBefore = hashFile(sourceDatabasePath);
let gateError;
let gateSummary;
let rebuiltPersonalPathHits = null;
let rebuiltRawPersonalPathHits = null;
let rebuiltKnowledgePathFixtureVerified = false;
try {
  mkdirSync(join(sandboxRepositoryRoot, ".git"), { recursive: true });
  cpSync(join(sourceAppRoot, "scripts"), sandboxScriptDir, { recursive: true });
  cpSync(join(sourceAppRoot, "data"), join(sandboxRoot, "data"), { recursive: true });
  cpSync(join(sourceAppRoot, "migrations"), join(sandboxRoot, "migrations"), { recursive: true });

  const sandboxHashBefore = hashFile(sandboxDatabasePath);
  const result = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: { ...process.env, SCM_DATABASE_REBUILD_AUTHORIZED: "" },
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const failures = [];

  if (result.status === 0) failures.push("import must be rejected when database rebuild authorization is absent");
  if (!output.includes("SCM_DATABASE_REBUILD_AUTHORIZED")) {
    failures.push("rejected import must name SCM_DATABASE_REBUILD_AUTHORIZED");
  }
  if (sandboxHashBefore !== hashFile(sandboxDatabasePath)) failures.push("rejected import must preserve the sandbox SQLite hash");

  const missingSourceResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: {
      ...process.env,
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: join(sandboxRoot, "missing-primary-source"),
      SCM_IMPORT_SOURCE_ROOT: join(sandboxRoot, "missing-secondary-source")
    },
    encoding: "utf8"
  });
  const missingSourceOutput = `${missingSourceResult.stdout || ""}\n${missingSourceResult.stderr || ""}`;
  if (missingSourceResult.status !== 2) failures.push(`missing source must exit 2, got ${missingSourceResult.status}`);
  if (!missingSourceOutput.includes("blocked_source_required")) {
    failures.push("missing source must emit blocked_source_required");
  }
  if (sandboxHashBefore !== hashFile(sandboxDatabasePath)) failures.push("missing-source preflight must preserve the sandbox SQLite hash");
  if (readdirSync(join(sandboxRoot, "data")).some((name) => name.includes(".build-"))) {
    failures.push("missing-source preflight must not create a temporary SQLite build file");
  }

  const primarySource = join(sandboxRoot, "primary-source");
  const secondarySource = join(sandboxRoot, "secondary-source");
  mkdirSync(primarySource, { recursive: true });
  mkdirSync(secondarySource, { recursive: true });
  writeFileSync(join(primarySource, metricBlueprintFile), "{}\n");
  writeFileSync(join(secondarySource, metricBlueprintFile), "{}\n");
  const precedenceResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: {
      ...process.env,
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_IMPORT_PREFLIGHT_ONLY: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: primarySource,
      SCM_IMPORT_SOURCE_ROOT: secondarySource
    },
    encoding: "utf8"
  });
  const precedenceOutput = `${precedenceResult.stdout || ""}\n${precedenceResult.stderr || ""}`;
  if (precedenceResult.status !== 0) failures.push(`source preflight must pass, got ${precedenceResult.status}`);
  if (!precedenceOutput.includes("preflight_ok")) failures.push("source preflight must emit preflight_ok");
  if (!precedenceOutput.includes(primarySource)) failures.push("SCM_WORKBENCH_IMPORT_SOURCE_ROOT must take precedence");
  if (precedenceOutput.includes(`\"sourceRoot\": \"${secondarySource}`)) {
    failures.push("lower-precedence SCM_IMPORT_SOURCE_ROOT must not be selected when the primary source is ready");
  }
  if (sandboxHashBefore !== hashFile(sandboxDatabasePath)) failures.push("source-only preflight must preserve the sandbox SQLite hash");
  if (!existsSync(join(primarySource, metricBlueprintFile))) failures.push("source-only preflight must not mutate source fixtures");

  const rebuildSource = join(sandboxRoot, "authorized-rebuild-source");
  mkdirSync(rebuildSource, { recursive: true });
  writeFileSync(join(rebuildSource, metricBlueprintFile), `${JSON.stringify({ metrics: [] }, null, 2)}\n`);
  const knowledgeFixtureRoot = resolve(sandboxRoot, "../../analysis/jijia-scm-knowledge-base-draft-20260604");
  const knowledgeFixtureFile = join(knowledgeFixtureRoot, "portable-path-fixture.md");
  const windowsSeparator = String.fromCharCode(92);
  const workstationPathFixtures = {
    mac: ["", "Users", "smoke-user", "private", "evidence.md"].join("/"),
    linux: ["", "home", "smoke-user", "private", "evidence.md"].join("/"),
    windows: ["C:", "Users", "Alice Smith", "private", "evidence.md"].join(windowsSeparator),
    mixed: `C:${windowsSeparator}Users/smoke-user/private/evidence.md`
  };
  const benignUrlFixture = "https://example.com/users/42";
  const expectedFixtureRedactions = {
    mac: `${workstationHomeRedaction}/private/evidence.md`,
    linux: `${workstationHomeRedaction}/private/evidence.md`,
    windows: `${workstationHomeRedaction}${windowsSeparator}private${windowsSeparator}evidence.md`,
    mixed: `${workstationHomeRedaction}/private/evidence.md`
  };
  for (const [name, value] of Object.entries(workstationPathFixtures)) {
    if (countWorkstationHomePaths(value) !== 1) failures.push(`${name} workstation fixture must have exactly one matcher hit`);
    if (redactWorkstationPaths(value) !== expectedFixtureRedactions[name]) failures.push(`${name} workstation fixture must redact exactly the home prefix`);
  }
  if (countWorkstationHomePaths(benignUrlFixture) !== 0) failures.push("benign users URL must have zero workstation matcher hits");
  if (redactWorkstationPaths(benignUrlFixture) !== benignUrlFixture) failures.push("benign users URL must remain unchanged by redaction");
  mkdirSync(knowledgeFixtureRoot, { recursive: true });
  writeFileSync(
    knowledgeFixtureFile,
    [
      "# Portable path fixture",
      "",
      `mac ${workstationPathFixtures.mac}`,
      `linux ${workstationPathFixtures.linux}`,
      `windows ${workstationPathFixtures.windows}`,
      `mixed ${workstationPathFixtures.mixed}`,
      `url ${benignUrlFixture}`,
      ""
    ].join("\n")
  );
  const rebuildResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: {
      ...process.env,
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_IMPORT_PREFLIGHT_ONLY: "",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: rebuildSource,
      SCM_IMPORT_SOURCE_ROOT: ""
    },
    encoding: "utf8"
  });
  const rebuildOutput = `${rebuildResult.stdout || ""}\n${rebuildResult.stderr || ""}`;
  if (rebuildResult.status !== 0) {
    failures.push(`authorized rebuild fixture must pass, got ${rebuildResult.status}: ${rebuildOutput.slice(-800)}`);
  } else {
    const rebuiltDb = new DatabaseSync(sandboxDatabasePath, { readOnly: true });
    try {
      const scenarioCount = Number(rebuiltDb.prepare("SELECT COUNT(*) AS count FROM aip_scenarios").get().count);
      if (scenarioCount !== 6) failures.push(`authorized rebuild must retain six scenarios, got ${scenarioCount}`);
      for (const [tableName, ids] of Object.entries(loop3Rows)) {
        for (const id of ids) {
          const rowCount = Number(rebuiltDb.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE id = ?`).get(id).count);
          if (rowCount !== 1) failures.push(`authorized rebuild missing Loop 3 row ${tableName}/${id}`);
        }
      }
      const migrationCount = Number(rebuiltDb.prepare(`
        SELECT COUNT(*) AS count
        FROM schema_migrations
        WHERE id IN ('20260627_b3_t7_additive_schema', '20260627_b6_rbac_action_tiering')
      `).get().count);
      if (migrationCount !== 2) failures.push(`authorized rebuild must replay additive schema migrations, got ${migrationCount}`);
      if (rebuiltDb.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") {
        failures.push("authorized rebuild SQLite integrity_check must be ok");
      }
      rebuiltPersonalPathHits = countDatabasePersonalPaths(rebuiltDb);
      if (rebuiltPersonalPathHits !== 0) {
        failures.push(`authorized rebuild must contain zero personal workstation paths, got ${rebuiltPersonalPathHits}`);
      }
      rebuiltRawPersonalPathHits = countRawDatabasePersonalPaths(sandboxDatabasePath);
      if (rebuiltRawPersonalPathHits !== 0) {
        failures.push(`authorized rebuild raw bytes must contain zero personal workstation paths, got ${rebuiltRawPersonalPathHits}`);
      }
      const domainFixture = rebuiltDb.prepare("SELECT source_path FROM knowledge_domains WHERE id = ?").get("jijia-scm-main");
      const cardFixture = rebuiltDb.prepare("SELECT id, source_path, summary FROM knowledge_cards WHERE title = ?").get("Portable path fixture");
      const chunkFixture = cardFixture
        ? rebuiltDb.prepare("SELECT text FROM knowledge_chunks WHERE card_id = ? ORDER BY chunk_index LIMIT 1").get(cardFixture.id)
        : null;
      const expectedDomainPath = "scm/drafts/analysis/jijia-scm-knowledge-base-draft-20260604";
      const expectedCardPath = `${expectedDomainPath}/portable-path-fixture.md`;
      const expectedWindowsRedactedPath = expectedFixtureRedactions.windows;
      const summaryFixture = String(cardFixture?.summary || "");
      const chunkTextFixture = String(chunkFixture?.text || "");
      const fixtureChecks = [
        [domainFixture?.source_path === expectedDomainPath, "authorized rebuild knowledge domain path must be repository-relative"],
        [cardFixture?.source_path === expectedCardPath, "authorized rebuild knowledge card path must be repository-relative"],
        [(summaryFixture.match(/<workstation-home>/g) || []).length === 4, "authorized rebuild knowledge summary must redact all workstation homes"],
        [(chunkTextFixture.match(/<workstation-home>/g) || []).length === 4, "authorized rebuild knowledge chunk must redact all workstation homes"],
        [summaryFixture.includes(expectedWindowsRedactedPath), "authorized rebuild knowledge summary must redact a Windows profile containing spaces"],
        [chunkTextFixture.includes(expectedWindowsRedactedPath), "authorized rebuild knowledge chunk must redact a Windows profile containing spaces"],
        [summaryFixture.includes(benignUrlFixture), "authorized rebuild knowledge summary must preserve a benign users URL"],
        [chunkTextFixture.includes(benignUrlFixture), "authorized rebuild knowledge chunk must preserve a benign users URL"]
      ];
      for (const [ok, message] of fixtureChecks) {
        if (!ok) failures.push(message);
      }
      rebuiltKnowledgePathFixtureVerified = fixtureChecks.every(([ok]) => ok);
    } finally {
      rebuiltDb.close();
    }
  }

  if (failures.length) throw new Error(`Import authorization gate failed:\n- ${failures.join("\n- ")}`);
  gateSummary = {
    ok: true,
    unauthorizedImportStatus: result.status,
    sandboxedImportTarget: true,
    unauthorizedSandboxDatabaseHashPreserved: true,
    missingSourceStatus: missingSourceResult.status,
    sourcePreflightStatus: precedenceResult.status,
    sourcePrecedenceVerified: true,
    authorizedRebuildStatus: rebuildResult.status,
    migrationsReplayed: true,
    loop3RowsRetained: Object.values(loop3Rows).reduce((total, ids) => total + ids.length, 0),
    rebuiltPersonalPathHits,
    rebuiltRawPersonalPathHits,
    rebuiltKnowledgePathFixtureVerified,
    sourceDatabaseHashPreserved: sourceHashBefore === hashFile(sourceDatabasePath),
    databaseRebuild: "disposable_fixture_only",
    sourceDatabaseRebuild: false,
    productionWrites: false
  };
} catch (error) {
  gateError = error instanceof Error ? error : new Error(String(error));
}

let cleanupError;
try {
  rmSync(sandboxRepositoryRoot, { recursive: true, force: true });
} catch (error) {
  cleanupError = error instanceof Error ? error : new Error(String(error));
}

let sourceIntegrityError;
try {
  if (sourceHashBefore !== hashFile(sourceDatabasePath)) {
    sourceIntegrityError = new Error("Source SQLite database changed during import authorization gate smoke");
  }
} catch (error) {
  sourceIntegrityError = error instanceof Error ? error : new Error(String(error));
}

const gateErrors = [gateError, cleanupError, sourceIntegrityError].filter(Boolean);
if (gateErrors.length === 1) throw gateErrors[0];
if (gateErrors.length > 1) {
  throw new AggregateError(gateErrors, "Import authorization gate failed and a cleanup or source-integrity check also failed");
}

console.log(JSON.stringify(gateSummary, null, 2));
