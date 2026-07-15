import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceAppRoot = resolve(scriptDir, "..");
const sourceDatabasePath = join(sourceAppRoot, "data", "governance_workbench.sqlite");
const sandboxRoot = mkdtempSync(join(tmpdir(), "scm-import-gate-"));
const sandboxScriptDir = join(sandboxRoot, "scripts");
const sandboxDatabasePath = join(sandboxRoot, "data", "governance_workbench.sqlite");
const metricBlueprintFile = "supply-chain-metric-system-l0-l3-blueprint-mece-v2-20260618.json";

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const sourceHashBefore = hashFile(sourceDatabasePath);
let gateError;
let gateSummary;
try {
  cpSync(join(sourceAppRoot, "scripts"), sandboxScriptDir, { recursive: true });
  cpSync(join(sourceAppRoot, "data"), join(sandboxRoot, "data"), { recursive: true });

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

  if (failures.length) throw new Error(`Import authorization gate failed:\n- ${failures.join("\n- ")}`);
  gateSummary = {
    ok: true,
    unauthorizedImportStatus: result.status,
    sandboxedImportTarget: true,
    sandboxDatabaseHashPreserved: true,
    missingSourceStatus: missingSourceResult.status,
    sourcePreflightStatus: precedenceResult.status,
    sourcePrecedenceVerified: true,
    sourceDatabaseHashPreserved: sourceHashBefore === hashFile(sourceDatabasePath),
    databaseRebuild: false,
    productionWrites: false
  };
} catch (error) {
  gateError = error instanceof Error ? error : new Error(String(error));
}

let cleanupError;
try {
  rmSync(sandboxRoot, { recursive: true, force: true });
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
