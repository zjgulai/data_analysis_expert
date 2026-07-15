import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceAppRoot = resolve(scriptDir, "..");
const sourceDatabasePath = join(sourceAppRoot, "data", "governance_workbench.sqlite");
const sandboxRoot = mkdtempSync(join(tmpdir(), "scm-import-gate-"));
const sandboxScriptDir = join(sandboxRoot, "scripts");
const sandboxDatabasePath = join(sandboxRoot, "data", "governance_workbench.sqlite");

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

  if (failures.length) throw new Error(`Import authorization gate failed:\n- ${failures.join("\n- ")}`);
  gateSummary = {
    ok: true,
    unauthorizedImportStatus: result.status,
    sandboxedImportTarget: true,
    sandboxDatabaseHashPreserved: true,
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
