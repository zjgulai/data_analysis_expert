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
const certificationGateApplySql = readFileSync(join(appRoot, "migrations", "20260716_certification_gate_remediation.apply.sql"), "utf8");
const certificationGateRollbackSql = readFileSync(join(appRoot, "migrations", "20260716_certification_gate_remediation.rollback.sql"), "utf8");
const decisionSubjectApplySql = readFileSync(join(appRoot, "migrations", "20260716_decision_subject_reference.apply.sql"), "utf8");
const decisionSubjectRollbackSql = readFileSync(join(appRoot, "migrations", "20260716_decision_subject_reference.rollback.sql"), "utf8");
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
const loop3MigrationId = "20260701_loop3_business_closed_loops";
const certificationGateMigrationId = "20260716_certification_gate_remediation";
const decisionSubjectMigrationId = "20260716_decision_subject_reference";
const certificationGateTables = ["metrics", "certifications", "chatbi_contexts", "lineage_edges"];

if (/\bINSERT\s+OR\s+IGNORE\b/i.test(loop3ApplySql)) {
  throw new Error("Loop 3 migration must use explicit conflict semantics; INSERT OR IGNORE is forbidden");
}

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

function viewExists(db, viewName) {
  return count(db, "SELECT COUNT(*) FROM sqlite_master WHERE type = 'view' AND name = ?", viewName) === 1;
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

function loop3TableSnapshots(db) {
  return Object.fromEntries(
    Object.keys(loop3Rows).map((tableName) => [
      tableName,
      db.prepare(`SELECT * FROM ${tableName} ORDER BY id`).all()
    ])
  );
}

function verifyLoop3LedgerApplyRollback() {
  const db = new DatabaseSync(createDatabaseCopy("loop3-ledger"));
  try {
    db.exec(loop3RollbackSql);
    const baseline = loop3TableCounts(db);
    const baselineRows = loop3TableSnapshots(db);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", loop3MigrationId) !== 0) {
      throw new Error("Loop 3 baseline rollback left the migration ledger row behind");
    }

    db.exec(loop3ApplySql);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", loop3MigrationId) !== 1) {
      throw new Error("Loop 3 apply did not restore the migration ledger row");
    }
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

    db.exec(`
      UPDATE action_tasks SET status = 'migration_gate_user_changed'
      WHERE id = 'action_loop3_20260701_finance_cost_tail_warehouse_return';
      UPDATE agent_traces SET answerability = 'migration_gate_user_changed'
      WHERE id = 'trace_loop3_20260701_finance_cost_tail_warehouse_return';
      UPDATE aip_scenarios SET status = 'migration_gate_user_changed'
      WHERE id LIKE 'scenario_loop3_%_20260701';
      UPDATE decision_logs SET status = 'migration_gate_user_changed'
      WHERE id = 'decision_loop3_20260701_finance_cost_tail_warehouse_return';
      UPDATE ontology_object_instances SET status = 'migration_gate_user_changed'
      WHERE id = 'cost_event_loop3_tail_warehouse_return_20260701';
      UPDATE recommendation_cards
      SET approval_status = 'migration_gate_user_changed',
          execution_status = 'migration_gate_user_changed'
      WHERE id = 'rec_loop3_20260701_finance_cost_tail_warehouse_return';
      UPDATE trace_reviews SET review_status = 'migration_gate_user_changed'
      WHERE id = 'trace_review_loop3_20260701_finance_cost_tail_warehouse_return';
    `);
    const userModifiedRows = loop3TableSnapshots(db);

    db.exec(loop3ApplySql);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", loop3MigrationId) !== 1) {
      throw new Error("Loop 3 reapply changed the migration ledger cardinality");
    }
    const reapplied = loop3TableCounts(db);
    if (JSON.stringify(applied) !== JSON.stringify(reapplied)) {
      throw new Error("Loop 3 apply must be idempotent");
    }
    if (JSON.stringify(userModifiedRows) !== JSON.stringify(loop3TableSnapshots(db))) {
      throw new Error("Loop 3 reapply must preserve mutable workflow, review, and audit state");
    }

    db.exec(loop3RollbackSql);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", loop3MigrationId) !== 0) {
      throw new Error("Loop 3 rollback left the migration ledger row behind");
    }
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
    const rolledBackRows = loop3TableSnapshots(db);
    if (JSON.stringify(baselineRows) !== JSON.stringify(rolledBackRows)) {
      throw new Error("Loop 3 rollback did not restore complete baseline table contents");
    }

    db.exec(loop3ApplySql);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", loop3MigrationId) !== 1) {
      throw new Error("Loop 3 final reapply did not restore the migration ledger row");
    }
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

function certificationGateSnapshots(db) {
  return Object.fromEntries(certificationGateTables.map((tableName) => [
    tableName,
    db.prepare(`SELECT * FROM ${tableName} ORDER BY id`).all()
  ]));
}

function certificationGateMigrationSnapshots(db) {
  return {
    schema_migrations: db.prepare(
      "SELECT * FROM schema_migrations WHERE id = ? ORDER BY id"
    ).all(certificationGateMigrationId),
    metric_snapshot: db.prepare(`
      SELECT * FROM migration_20260716_cert_metric_snapshot
      ORDER BY migration_id, metric_id
    `).all(),
    ledger_snapshot: db.prepare(`
      SELECT * FROM migration_20260716_cert_ledger_snapshot
      ORDER BY migration_id, id
    `).all(),
    chatbi_snapshot: db.prepare(`
      SELECT * FROM migration_20260716_cert_chatbi_snapshot
      ORDER BY migration_id, id
    `).all(),
    lineage_snapshot: db.prepare(`
      SELECT * FROM migration_20260716_cert_lineage_snapshot
      ORDER BY migration_id, id
    `).all()
  };
}

function unresolvedCertifiedCount(db) {
  return count(db, `
    SELECT COUNT(*)
    FROM metrics m
    WHERE m.certification_status = 'certified'
      AND EXISTS (
        SELECT 1
        FROM governance_tasks g
        WHERE g.target_ref = m.id
          AND g.priority = 'P0'
          AND NOT (
            g.status IN ('certified', 'done')
            OR (g.task_type = 'owner_signoff' AND g.status = '已签字')
            OR (g.task_type = 'field_mapping' AND g.status = '已映射')
          )
      )
  `);
}

function verifyCertificationGateApplyRollback() {
  const db = new DatabaseSync(createDatabaseCopy("certification-gate"));
  try {
    if (tableExists(db, "schema_migrations")
      && count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", certificationGateMigrationId) === 1) {
      db.exec(certificationGateRollbackSql);
    }
    const baseline = certificationGateSnapshots(db);
    const baselineViolationCount = unresolvedCertifiedCount(db);
    if (baselineViolationCount === 0) {
      throw new Error("Certification gate fixture must expose at least one unresolved certified metric before apply");
    }
    const affectedMetric = db.prepare(`
      SELECT m.id
      FROM metrics m
      WHERE m.certification_status = 'certified'
        AND EXISTS (
          SELECT 1
          FROM governance_tasks g
          WHERE g.target_ref = m.id
            AND g.priority = 'P0'
            AND NOT (
              g.status IN ('certified', 'done')
              OR (g.task_type = 'owner_signoff' AND g.status = '已签字')
              OR (g.task_type = 'field_mapping' AND g.status = '已映射')
            )
        )
      ORDER BY m.id
      LIMIT 1
    `).get();
    const nonMetricCertificationId = "migration-gate-non-metric-certification";
    db.prepare(`
      INSERT INTO certifications (
        id, asset_type, asset_ref, status, certified_by, evidence
      ) VALUES (?, 'ontology_object', ?, 'certified', 'migration gate', 'must remain unchanged')
    `).run(nonMetricCertificationId, affectedMetric.id);
    const nonMetricCertificationBefore = db.prepare(
      "SELECT * FROM certifications WHERE id = ?"
    ).get(nonMetricCertificationId);
    const baselineWithNonMetricFixture = certificationGateSnapshots(db);

    db.exec(certificationGateApplySql);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", certificationGateMigrationId) !== 1) {
      throw new Error("Certification gate apply did not write its migration ledger row");
    }
    if (unresolvedCertifiedCount(db) !== 0) {
      throw new Error("Certification gate apply left unresolved P0 metrics certified");
    }
    if (count(db, `
      SELECT COUNT(*)
      FROM chatbi_contexts ctx
      JOIN governance_tasks g ON g.target_ref = ctx.metric_id
      WHERE g.priority = 'P0'
        AND NOT (
          g.status IN ('certified', 'done')
          OR (g.task_type = 'owner_signoff' AND g.status = '已签字')
          OR (g.task_type = 'field_mapping' AND g.status = '已映射')
        )
    `) !== 0) {
      throw new Error("Certification gate apply left unresolved P0 metrics in certified ChatBI contexts");
    }
    const capturedMetricCount = count(db, `
      SELECT COUNT(*)
      FROM migration_20260716_cert_metric_snapshot
      WHERE migration_id = ?
    `, certificationGateMigrationId);
    if (capturedMetricCount !== baselineViolationCount) {
      throw new Error(`Certification gate snapshot count mismatch: ${capturedMetricCount}/${baselineViolationCount}`);
    }
    if (count(db, `
      SELECT COUNT(*)
      FROM migration_20260716_cert_ledger_snapshot
      WHERE migration_id = ? AND id = ?
    `, certificationGateMigrationId, nonMetricCertificationId) !== 0) {
      throw new Error("Certification gate must not snapshot a non-metric certification sharing a metric asset_ref");
    }
    if (JSON.stringify(nonMetricCertificationBefore) !== JSON.stringify(db.prepare(
      "SELECT * FROM certifications WHERE id = ?"
    ).get(nonMetricCertificationId))) {
      throw new Error("Certification gate must not mutate a non-metric certification sharing a metric asset_ref");
    }
    const applied = certificationGateSnapshots(db);
    const appliedMigrationState = certificationGateMigrationSnapshots(db);

    db.exec(certificationGateApplySql);
    const reapplied = certificationGateSnapshots(db);
    const reappliedMigrationState = certificationGateMigrationSnapshots(db);
    if (JSON.stringify(applied) !== JSON.stringify(reapplied)
      || JSON.stringify(appliedMigrationState) !== JSON.stringify(reappliedMigrationState)) {
      throw new Error("Certification gate apply must be idempotent");
    }

    db.exec(certificationGateRollbackSql);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", certificationGateMigrationId) !== 0) {
      throw new Error("Certification gate rollback left its migration ledger row behind");
    }
    const rolledBack = certificationGateSnapshots(db);
    if (JSON.stringify(baselineWithNonMetricFixture) !== JSON.stringify(rolledBack)) {
      throw new Error("Certification gate rollback did not restore complete baseline contents");
    }
    for (const tableName of [
      "migration_20260716_cert_metric_snapshot",
      "migration_20260716_cert_ledger_snapshot",
      "migration_20260716_cert_chatbi_snapshot",
      "migration_20260716_cert_lineage_snapshot"
    ]) {
      if (tableExists(db, tableName)) throw new Error(`Certification gate rollback left ${tableName} behind`);
    }

    db.exec(certificationGateApplySql);
    if (unresolvedCertifiedCount(db) !== 0) {
      throw new Error("Certification gate final apply did not close unresolved certification violations");
    }
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") {
      throw new Error("SQLite integrity_check failed after certification gate final apply");
    }
    return {
      downgradedMetrics: baselineViolationCount,
      chatbiContextsRemoved: baseline.chatbi_contexts.length - applied.chatbi_contexts.length,
      migrationStateIdempotent: true,
      rollback: "complete_baseline_restored"
    };
  } finally {
    db.close();
  }
}

function verifyDecisionSubjectApplyRollback() {
  const db = new DatabaseSync(createDatabaseCopy("decision-subject"));
  try {
    if (tableExists(db, "schema_migrations")
      && count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", decisionSubjectMigrationId) === 1) {
      db.exec(decisionSubjectRollbackSql);
    }
    const baseline = db.prepare("SELECT * FROM decision_logs ORDER BY id").all();
    const invalidBefore = count(db, `
      SELECT COUNT(*)
      FROM decision_logs d
      WHERE d.linked_metric_id <> ''
        AND NOT EXISTS (
          SELECT 1 FROM metrics m
          WHERE m.id = d.linked_metric_id OR m.code = d.linked_metric_id
        )
    `);
    if (invalidBefore === 0) throw new Error("Decision subject fixture must expose legacy non-metric references before apply");

    const unknownDecisionId = "migration-gate-unknown-decision-subject";
    const unknownSubjectRef = "metric_typo_decision_subject_gate";
    db.prepare(`
      INSERT INTO decision_logs (
        id, insight_title, linked_metric_id, recommendation, action_boundary, status, review_note
      ) VALUES (?, 'unknown subject guard', ?, 'reject unknown subject', 'local_only', 'fixture', 'fixture')
    `).run(unknownDecisionId, unknownSubjectRef);
    let unknownSubjectError = "";
    try {
      db.exec(decisionSubjectApplySql);
    } catch (error) {
      unknownSubjectError = String(error.message || error);
      try {
        db.exec("ROLLBACK");
      } catch {
        // The failed migration may already have closed its transaction.
      }
    }
    if (!unknownSubjectError.includes("CHECK constraint failed")) {
      throw new Error(`Decision subject apply did not fail closed on an unknown reference: ${unknownSubjectError || "no error"}`);
    }
    if (db.prepare("SELECT linked_metric_id FROM decision_logs WHERE id = ?").get(unknownDecisionId).linked_metric_id !== unknownSubjectRef) {
      throw new Error("Failed decision subject apply changed the unknown reference fixture");
    }
    if (tableExists(db, "decision_subject_refs") || viewExists(db, "decision_logs_with_subject")) {
      throw new Error("Failed decision subject apply left its table or view behind");
    }
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", decisionSubjectMigrationId) !== 0) {
      throw new Error("Failed decision subject apply wrote a migration ledger row");
    }
    db.prepare("DELETE FROM decision_logs WHERE id = ?").run(unknownDecisionId);

    db.exec(decisionSubjectApplySql);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", decisionSubjectMigrationId) !== 1) {
      throw new Error("Decision subject apply must write exactly one migration ledger row");
    }
    if (!tableExists(db, "decision_subject_refs") || !viewExists(db, "decision_logs_with_subject")) {
      throw new Error("Decision subject apply did not create its table and view");
    }
    const invalidAfter = count(db, `
      SELECT COUNT(*)
      FROM decision_logs d
      WHERE d.linked_metric_id <> ''
        AND NOT EXISTS (
          SELECT 1 FROM metrics m
          WHERE m.id = d.linked_metric_id OR m.code = d.linked_metric_id
        )
    `);
    if (invalidAfter !== 0) throw new Error("Decision subject apply left non-metric values in linked_metric_id");
    const subjectCount = count(db, "SELECT COUNT(*) FROM decision_subject_refs");
    if (subjectCount !== invalidBefore) {
      throw new Error(`Decision subject apply count mismatch: ${subjectCount}/${invalidBefore}`);
    }
    const metricRefs = new Set(db.prepare("SELECT id, code FROM metrics").all().flatMap((metric) => [metric.id, metric.code]));
    const compareDecisionRows = (left, right) => left.decision_id === right.decision_id
      ? 0
      : (left.decision_id < right.decision_id ? -1 : 1);
    const expectedSubjectRows = baseline
      .filter((decision) => decision.linked_metric_id && !metricRefs.has(decision.linked_metric_id))
      .map((decision) => ({
        decision_id: decision.id,
        subject_ref: decision.linked_metric_id,
        subject_type: "governance_subject"
      }))
      .sort(compareDecisionRows);
    const actualSubjectRows = db.prepare(`
      SELECT decision_id, subject_ref, subject_type
      FROM decision_subject_refs
    `).all().sort(compareDecisionRows);
    if (JSON.stringify(expectedSubjectRows) !== JSON.stringify(actualSubjectRows)) {
      throw new Error("Decision subject apply produced incorrect decision-to-subject mappings");
    }
    const viewSubjectRows = db.prepare(`
      SELECT id AS decision_id, subject_ref, subject_type
      FROM decision_logs_with_subject
      WHERE subject_ref <> ''
    `).all().sort(compareDecisionRows);
    if (JSON.stringify(expectedSubjectRows) !== JSON.stringify(viewSubjectRows)) {
      throw new Error("decision_logs_with_subject does not preserve the migrated decision-to-subject mappings");
    }
    const appliedDecisionRows = db.prepare("SELECT * FROM decision_logs ORDER BY id").all();
    const appliedSubjectRows = db.prepare("SELECT * FROM decision_subject_refs ORDER BY decision_id").all();

    db.exec(decisionSubjectApplySql);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", decisionSubjectMigrationId) !== 1) {
      throw new Error("Decision subject reapply changed the migration ledger cardinality");
    }
    if (JSON.stringify(appliedDecisionRows) !== JSON.stringify(db.prepare("SELECT * FROM decision_logs ORDER BY id").all())
      || JSON.stringify(appliedSubjectRows) !== JSON.stringify(db.prepare("SELECT * FROM decision_subject_refs ORDER BY decision_id").all())) {
      throw new Error("Decision subject apply must be idempotent");
    }

    const dualReferenceFixture = appliedSubjectRows[0];
    const validMetricId = db.prepare("SELECT id FROM metrics ORDER BY id LIMIT 1").get().id;
    db.prepare("UPDATE decision_logs SET linked_metric_id = ? WHERE id = ?")
      .run(validMetricId, dualReferenceFixture.decision_id);
    let dualReferenceRollbackError = "";
    try {
      db.exec(decisionSubjectRollbackSql);
    } catch (error) {
      dualReferenceRollbackError = String(error.message || error);
      try {
        db.exec("ROLLBACK");
      } catch {
        // The rollback guard may already have closed its transaction.
      }
    }
    if (!dualReferenceRollbackError.includes("CHECK constraint failed")) {
      throw new Error(`Decision subject rollback did not fail closed on a dual reference: ${dualReferenceRollbackError || "no error"}`);
    }
    if (!tableExists(db, "decision_subject_refs") || !viewExists(db, "decision_logs_with_subject")) {
      throw new Error("Rejected decision subject rollback removed its table or view");
    }
    if (db.prepare("SELECT linked_metric_id FROM decision_logs WHERE id = ?").get(dualReferenceFixture.decision_id).linked_metric_id !== validMetricId) {
      throw new Error("Rejected decision subject rollback changed the metric side of a dual reference");
    }
    if (db.prepare("SELECT subject_ref FROM decision_subject_refs WHERE decision_id = ?").get(dualReferenceFixture.decision_id).subject_ref !== dualReferenceFixture.subject_ref) {
      throw new Error("Rejected decision subject rollback changed the subject side of a dual reference");
    }
    db.prepare("UPDATE decision_logs SET linked_metric_id = '' WHERE id = ?")
      .run(dualReferenceFixture.decision_id);

    db.exec(decisionSubjectRollbackSql);
    if (tableExists(db, "decision_subject_refs") || viewExists(db, "decision_logs_with_subject")) {
      throw new Error("Decision subject rollback left its table or view behind");
    }
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", decisionSubjectMigrationId) !== 0) {
      throw new Error("Decision subject rollback left its migration ledger row behind");
    }
    if (JSON.stringify(baseline) !== JSON.stringify(db.prepare("SELECT * FROM decision_logs ORDER BY id").all())) {
      throw new Error("Decision subject rollback did not restore complete baseline contents");
    }

    db.exec(decisionSubjectApplySql);
    if (count(db, "SELECT COUNT(*) FROM schema_migrations WHERE id = ?", decisionSubjectMigrationId) !== 1) {
      throw new Error("Decision subject final apply must restore exactly one migration ledger row");
    }
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") {
      throw new Error("SQLite integrity_check failed after decision subject final apply");
    }
    return {
      migratedSubjects: invalidBefore,
      invalidMetricReferences: 0,
      mappingVerified: true,
      dualReferenceRollback: "rejected_before_drop",
      rollback: "complete_baseline_restored"
    };
  } finally {
    db.close();
  }
}

const sourceHashBefore = hashFile(sourceDatabasePath);
let gateError;
let rejectionMessage = "";
let loop3LedgerSummary = {};
let certificationGateSummary = {};
let decisionSubjectSummary = {};
try {
  rejectionMessage = verifyPopulatedRollbackIsRejected();
  verifyEmptyRollbackAndReapply();
  loop3LedgerSummary = verifyLoop3LedgerApplyRollback();
  certificationGateSummary = verifyCertificationGateApplyRollback();
  decisionSubjectSummary = verifyDecisionSubjectApplyRollback();
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
  certificationGate: certificationGateSummary,
  decisionSubjectReference: decisionSubjectSummary,
  sourceDatabaseHashPreserved: true,
  databaseWrite: "disposable_test_copies_only",
  productionWrites: false
}, null, 2));
