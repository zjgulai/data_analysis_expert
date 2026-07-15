import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const databasePath = join(appRoot, "data", "governance_workbench.sqlite");

function hashDatabase() {
  return createHash("sha256").update(readFileSync(databasePath)).digest("hex");
}

const beforeHash = hashDatabase();
const result = spawnSync(process.execPath, [join(scriptDir, "import-assets.mjs")], {
  cwd: appRoot,
  env: { ...process.env, SCM_DATABASE_REBUILD_AUTHORIZED: "" },
  encoding: "utf8"
});
const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const failures = [];

if (result.status === 0) failures.push("import must be rejected when database rebuild authorization is absent");
if (!output.includes("SCM_DATABASE_REBUILD_AUTHORIZED")) {
  failures.push("rejected import must name SCM_DATABASE_REBUILD_AUTHORIZED");
}
if (beforeHash !== hashDatabase()) failures.push("rejected import must preserve the SQLite hash");

if (failures.length) throw new Error(`Import authorization gate failed:\n- ${failures.join("\n- ")}`);
console.log(JSON.stringify({
  ok: true,
  unauthorizedImportStatus: result.status,
  sourceDatabaseHashPreserved: true,
  databaseRebuild: false,
  productionWrites: false
}, null, 2));
