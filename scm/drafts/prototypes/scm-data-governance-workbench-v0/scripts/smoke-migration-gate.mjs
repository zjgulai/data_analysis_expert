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
const loop3ApplySql = readFileSync(join(appRoot, "migrations", "20260701_loop3_business_closed_loops.apply.sql"), "utf8");
const loop3RollbackSql = readFileSync(join(appRoot, "migrations", "20260701_loop3_business_closed_loops.rollback.sql"), "utf8");
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

function loop3TableCounts(db) {
  return Object.fromEntries(
    Object.keys(loop3Rows).map((tableName) => [
      tableName,
      count(db, `SELECT COUNT(*) FROM ${tableName}`)
    ])
  );
}

function verifyLoop3LedgerApplyRollback() {
  const db = new DatabaseSync(createDatabaseCopy("loop3-ledger"));
  try {
    db.exec(loop3RollbackSql);
    const baseline = loop3TableCounts(db);

    db.exec(loop3ApplySql);
    const applied = loop3TableCounts(db);
    for (const [tableName, ids] of Object.entries(loop3Rows)) {
      if (applied[tableName] !== baseline[tableName] + ids.length) {
        throw new Error(`Loop 3 apply count mismatch for ${tableName}`);
      }
      for (const id of ids) {
        if (count(db, `SELECT COUNT(*) FROM ${tableName} WHERE id = ?`, id) !== 1) {
          throw new Error(`Loop 3 apply missing ${tableName}/${id}`);
        }
      }
    }
    if (count(
      db,
      `SELECT COUNT(*) FROM aip_scenarios
       WHERE id LIKE 'scenario_loop3_%_20260701'
         AND decision_boundary LIKE '%no_provider%'
         AND decision_boundary LIKE '%no_production%'
         AND decision_boundary LIKE '%no_erp_writeback%'`
    ) !== 3) {
      throw new Error("Loop 3 scenarios must preserve no-provider/no-production/no-ERP boundaries");
    }
    if (count(
      db,
      `SELECT COUNT(*) FROM action_tasks
       WHERE id = 'action_loop3_20260701_finance_cost_tail_warehouse_return'
         AND replay_note LIKE '%providerCalls=false%'
         AND replay_note LIKE '%productionWrites=false%'
         AND replay_note LIKE '%erpWriteback=false%'`
    ) !== 1) {
      throw new Error("Loop 3 action task must preserve closed external-write boundaries");
    }

    db.exec(loop3ApplySql);
    const reapplied = loop3TableCounts(db);
    if (JSON.stringify(applied) !== JSON.stringify(reapplied)) {
      throw new Error("Loop 3 apply must be idempotent");
    }

    db.exec(loop3RollbackSql);
    const rolledBack = loop3TableCounts(db);
    if (JSON.stringify(baseline) !== JSON.stringify(rolledBack)) {
      throw new Error("Loop 3 rollback must restore baseline counts");
    }
    for (const [tableName, ids] of Object.entries(loop3Rows)) {
      for (const id of ids) {
        if (count(db, `SELECT COUNT(*) FROM ${tableName} WHERE id = ?`, id) !== 0) {
          throw new Error(`Loop 3 rollback left ${tableName}/${id}`);
        }
      }
    }

    db.exec(loop3ApplySql);
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") {
      throw new Error("SQLite integrity_check failed after Loop 3 reapply");
    }
    return {
      rowDelta: Object.values(loop3Rows).reduce((total, ids) => total + ids.length, 0),
      tableDeltas: Object.fromEntries(
        Object.entries(loop3Rows).map(([tableName, ids]) => [tableName, ids.length])
      )
    };
  } finally {
    db.close();
  }
}

const sourceHashBefore = hashFile(sourceDatabasePath);
let gateError;
let rejectionMessage = "";
let loop3LedgerSummary = {};
try {
  rejectionMessage = verifyPopulatedRollbackIsRejected();
  verifyEmptyRollbackAndReapply();
  loop3LedgerSummary = verifyLoop3LedgerApplyRollback();
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
  loop3LedgerApply: "applied_idempotently",
  loop3LedgerRollback: "restored_baseline",
  loop3Ledger: loop3LedgerSummary,
  sourceDatabaseHashPreserved: true,
  databaseWrite: "disposable_test_copies_only",
  productionWrites: false
}, null, 2));
