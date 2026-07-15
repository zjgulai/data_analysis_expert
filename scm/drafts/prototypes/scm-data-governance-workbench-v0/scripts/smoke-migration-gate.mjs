import { createHash } from "node:crypto";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const sourceDatabasePath = join(appRoot, "data", "governance_workbench.sqlite");
const applySql = readFileSync(join(appRoot, "migrations", "20260627_b3_t7_additive_schema.apply.sql"), "utf8");
const rollbackSql = readFileSync(join(appRoot, "migrations", "20260627_b3_t7_additive_schema.rollback.sql"), "utf8");
const sandboxRoot = mkdtempSync(join(tmpdir(), "scm-migration-gate-"));
const targetTables = [
  "storyline_template",
  "insight_unit",
  "kpi_health",
  "kpi_mece_check",
  "kpi_attribution_path",
  "kpi_contribution",
  "metric_dimension_review",
  "metric_validation_log",
  "metric_field_mapping",
  "tag_property_projection",
  "tag_assignment"
];

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function createDatabaseCopy(name) {
  const databasePath = join(sandboxRoot, `${name}.sqlite`);
  copyFileSync(sourceDatabasePath, databasePath);
  return databasePath;
}

function count(db, sql, ...params) {
  return Number(Object.values(db.prepare(sql).get(...params))[0]);
}

function tableExists(db, tableName) {
  return count(db, "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?", tableName) === 1;
}

function emptyTargetTables(db) {
  for (const tableName of targetTables) db.exec(`DELETE FROM ${tableName}`);
}

function verifyPopulatedRollbackIsRejected() {
  const db = new DatabaseSync(createDatabaseCopy("populated"));
  let rejectionMessage = "";
  try {
    db.exec(applySql);
    emptyTargetTables(db);
    db.prepare(`
      INSERT INTO storyline_template (
        id, page_id, template_name, scqa_json, evidence_refs, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run("migration-gate-populated", "migration-gate", "guard fixture", "{}", "[]", "draft");

    try {
      db.exec(rollbackSql);
    } catch (error) {
      rejectionMessage = String(error.message || error);
    }

    if (!rejectionMessage.includes("CHECK constraint failed")) {
      throw new Error(`Populated B3 rollback did not fail at the emptiness guard: ${rejectionMessage || "no error"}`);
    }
    if (!tableExists(db, "storyline_template")) throw new Error("Populated B3 rollback removed storyline_template");
    if (count(db, "SELECT COUNT(*) FROM storyline_template WHERE id = 'migration-gate-populated'") !== 1) {
      throw new Error("Populated B3 rollback removed the guarded fixture row");
    }
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = '20260627_b3_t7_additive_schema'") !== 1) {
      throw new Error("Populated B3 rollback removed the migration ledger row");
    }
  } finally {
    try {
      db.exec("ROLLBACK");
    } catch {
      // No transaction remains after a failure outside the rollback transaction.
    }
    db.close();
  }
  return rejectionMessage;
}

function verifyEmptyRollbackAndReapply() {
  const db = new DatabaseSync(createDatabaseCopy("empty"));
  try {
    db.exec(applySql);
    emptyTargetTables(db);
    db.exec(rollbackSql);
    if (tableExists(db, "storyline_template")) throw new Error("Empty B3 rollback left storyline_template behind");
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = '20260627_b3_t7_additive_schema'") !== 0) {
      throw new Error("Empty B3 rollback left the migration ledger row behind");
    }
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") {
      throw new Error("SQLite integrity_check failed after empty B3 rollback");
    }

    db.exec(applySql);
    if (!tableExists(db, "storyline_template")) throw new Error("B3 reapply did not recreate storyline_template");
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = '20260627_b3_t7_additive_schema'") !== 1) {
      throw new Error("B3 reapply did not restore the migration ledger row");
    }
  } finally {
    db.close();
  }
}

const sourceHashBefore = hashFile(sourceDatabasePath);
let gateError;
let rejectionMessage = "";
try {
  rejectionMessage = verifyPopulatedRollbackIsRejected();
  verifyEmptyRollbackAndReapply();
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
    sourceIntegrityError = new Error("Source SQLite database changed during migration gate smoke");
  }
} catch (error) {
  sourceIntegrityError = error instanceof Error ? error : new Error(String(error));
}

const gateErrors = [gateError, cleanupError, sourceIntegrityError].filter(Boolean);
if (gateErrors.length === 1) throw gateErrors[0];
if (gateErrors.length > 1) {
  throw new AggregateError(gateErrors, "Migration gate failed and a cleanup or source-integrity check also failed");
}

console.log(JSON.stringify({
  ok: true,
  populatedRollback: "rejected_before_drop",
  populatedRollbackError: rejectionMessage,
  emptyRollback: "applied",
  emptyReapply: "applied",
  sourceDatabaseHashPreserved: true,
  databaseWrite: "disposable_test_copies_only",
  productionWrites: false
}, null, 2));
