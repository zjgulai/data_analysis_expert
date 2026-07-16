import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceAppRoot = resolve(scriptDir, "..");
const sourceDatabasePath = join(sourceAppRoot, "data", "governance_workbench.sqlite");
const sandboxRoot = mkdtempSync(join(tmpdir(), "scm-database-gate-"));
const failures = [];
const runningApps = [];

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function verifyCertificationGates(databasePath) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const unresolvedCertified = db.prepare(`
      WITH unresolved_p0 AS (
        SELECT DISTINCT target_ref
        FROM governance_tasks
        WHERE priority = 'P0'
          AND NOT (
            status IN ('certified', 'done')
            OR (task_type = 'owner_signoff' AND status = '已签字')
            OR (task_type = 'field_mapping' AND status = '已映射')
          )
      )
      SELECT m.id
      FROM metrics m
      JOIN unresolved_p0 p ON p.target_ref = m.id
      WHERE m.certification_status = 'certified'
      ORDER BY m.id
    `).all().map((row) => row.id);
    if (unresolvedCertified.length) {
      throw new Error(`Unresolved P0 metrics must not be certified: ${unresolvedCertified.join(", ")}`);
    }

    const blockedCertificationRows = db.prepare(`
      SELECT c.asset_ref
      FROM certifications c
      JOIN governance_tasks g ON g.target_ref = c.asset_ref
      WHERE g.priority = 'P0'
        AND NOT (
          g.status IN ('certified', 'done')
          OR (g.task_type = 'owner_signoff' AND g.status = '已签字')
          OR (g.task_type = 'field_mapping' AND g.status = '已映射')
        )
        AND c.status = 'certified'
      GROUP BY c.asset_ref
      ORDER BY c.asset_ref
    `).all().map((row) => row.asset_ref);
    if (blockedCertificationRows.length) {
      throw new Error(`Unresolved P0 metrics must not have certified ledger rows: ${blockedCertificationRows.join(", ")}`);
    }

    const blockedChatbiContexts = db.prepare(`
      SELECT DISTINCT ctx.metric_id
      FROM chatbi_contexts ctx
      JOIN governance_tasks g ON g.target_ref = ctx.metric_id
      WHERE g.priority = 'P0'
        AND NOT (
          g.status IN ('certified', 'done')
          OR (g.task_type = 'owner_signoff' AND g.status = '已签字')
          OR (g.task_type = 'field_mapping' AND g.status = '已映射')
        )
      ORDER BY ctx.metric_id
    `).all().map((row) => row.metric_id);
    if (blockedChatbiContexts.length) {
      throw new Error(`Unresolved P0 metrics must not enter certified ChatBI contexts: ${blockedChatbiContexts.join(", ")}`);
    }
  } finally {
    db.close();
  }
}

function verifyDecisionReferences(databasePath) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const subjectTableExists = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM sqlite_schema
      WHERE type = 'table' AND name = 'decision_subject_refs'
    `).get().count) === 1;
    const decisionViewExists = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM sqlite_schema
      WHERE type = 'view' AND name = 'decision_logs_with_subject'
    `).get().count) === 1;
    if (!subjectTableExists || !decisionViewExists) {
      throw new Error("Decision reference contract requires decision_subject_refs and decision_logs_with_subject");
    }
    const invalidMetricReferences = db.prepare(`
      SELECT id, linked_metric_id
      FROM decision_logs
      WHERE linked_metric_id <> ''
        AND NOT EXISTS (
          SELECT 1 FROM metrics m
          WHERE m.id = decision_logs.linked_metric_id OR m.code = decision_logs.linked_metric_id
        )
      ORDER BY id
    `).all();
    if (invalidMetricReferences.length) {
      throw new Error(`Decision logs contain non-metric linked_metric_id values: ${invalidMetricReferences.map((row) => row.id).join(", ")}`);
    }
    const unresolvedSubjectRows = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM decision_logs_with_subject
      WHERE id LIKE 'OMSWMS-%' OR id LIKE 'RUNTIME-IMPORT-%'
    `).get().count);
    const resolvedSubjectRows = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM decision_logs_with_subject
      WHERE (id LIKE 'OMSWMS-%' OR id LIKE 'RUNTIME-IMPORT-%')
        AND linked_metric_id = ''
        AND subject_ref <> ''
    `).get().count);
    if (unresolvedSubjectRows !== resolvedSubjectRows) {
      throw new Error(`Governance decision subjects are not fully separated from metric links: ${resolvedSubjectRows}/${unresolvedSubjectRows}`);
    }
  } finally {
    db.close();
  }
}

function verifyKnowledgeReferences(databasePath) {
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const unresolvedReferences = db.prepare(`
      WITH knowledge_references AS (
        SELECT 'aip_scenarios' AS source_table, scenario.id AS source_id, CAST(ref.value AS TEXT) AS card_id
        FROM aip_scenarios AS scenario, json_each(scenario.linked_knowledge_card_ids) AS ref
        UNION ALL
        SELECT 'recommendation_cards', recommendation.id, CAST(ref.value AS TEXT)
        FROM recommendation_cards AS recommendation, json_each(recommendation.linked_knowledge_card_ids) AS ref
        UNION ALL
        SELECT 'agent_traces', trace.id, CAST(ref.value AS TEXT)
        FROM agent_traces AS trace, json_each(trace.matched_knowledge_cards) AS ref
        UNION ALL
        SELECT 'agent_runs', agent_run.id, substr(CAST(ref.value AS TEXT), length('knowledge:') + 1)
        FROM agent_runs AS agent_run, json_each(agent_run.input_refs) AS ref
        WHERE CAST(ref.value AS TEXT) LIKE 'knowledge:%'
      )
      SELECT source_table, source_id, card_id
      FROM knowledge_references AS reference
      WHERE card_id = ''
        OR NOT EXISTS (
          SELECT 1 FROM knowledge_cards AS card WHERE card.id = reference.card_id
        )
      ORDER BY source_table, source_id, card_id
    `).all();
    if (unresolvedReferences.length) {
      const sample = unresolvedReferences
        .slice(0, 10)
        .map((row) => `${row.source_table}/${row.source_id}:${row.card_id}`)
        .join(", ");
      throw new Error(`Knowledge references must resolve to knowledge_cards (${unresolvedReferences.length} unresolved): ${sample}`);
    }
    return 0;
  } finally {
    db.close();
  }
}

function copyApp(name) {
  const targetRoot = join(sandboxRoot, name);
  for (const entry of ["server", "data", "dist", "runtime"]) {
    const source = join(sourceAppRoot, entry);
    if (existsSync(source)) cpSync(source, join(targetRoot, entry), { recursive: true });
  }
  return targetRoot;
}

function verifyAcceptedManualGateStatuses(appRoot) {
  const databasePath = join(appRoot, "data", "governance_workbench.sqlite");
  const fixture = new DatabaseSync(databasePath);
  try {
    fixture.exec(`
      INSERT INTO governance_tasks (
        id, task_type, target_ref, title, owner, status, priority, due_date, notes
      ) VALUES (
        'database-gate-status-owner', 'owner_signoff', 'SCM-MECE-L3-028',
        'accepted owner status fixture', 'database gate', 'done', 'P0', '', 'disposable fixture'
      ) ON CONFLICT(id) DO UPDATE SET status = excluded.status;
      INSERT INTO governance_tasks (
        id, task_type, target_ref, title, owner, status, priority, due_date, notes
      ) VALUES (
        'database-gate-status-mapping', 'field_mapping', 'SCM-MECE-L3-028',
        'accepted mapping status fixture', 'database gate', '已映射', 'P0', '', 'disposable fixture'
      ) ON CONFLICT(id) DO UPDATE SET status = excluded.status;
      UPDATE metrics SET lifecycle_status = 'certified', certification_status = 'certified'
      WHERE id = 'SCM-MECE-L3-028';
      UPDATE certifications SET status = 'certified', certified_by = 'database gate'
      WHERE asset_type = 'metric' AND asset_ref = 'SCM-MECE-L3-028';
      INSERT INTO chatbi_contexts (
        id, metric_id, question_sample, allowed_dimensions, evidence_chain, answer_policy
      ) VALUES (
        'database-gate-accepted-mapping-context',
        'SCM-MECE-L3-028',
        'accepted mapping fixture',
        '[]',
        '[]',
        'certified_metric_only'
      ) ON CONFLICT(id) DO NOTHING;
    `);
  } finally {
    fixture.close();
  }
  verifyCertificationGates(databasePath);
  const mismatchedFixture = new DatabaseSync(databasePath);
  try {
    mismatchedFixture.exec(`
      UPDATE governance_tasks SET status = '已映射'
      WHERE id = 'database-gate-status-owner';
      UPDATE governance_tasks SET status = '已签字'
      WHERE id = 'database-gate-status-mapping';
    `);
  } finally {
    mismatchedFixture.close();
  }
  let mismatchedStatusRejected = false;
  try {
    verifyCertificationGates(databasePath);
  } catch {
    mismatchedStatusRejected = true;
  }
  if (!mismatchedStatusRejected) {
    throw new Error("Manual-gate completion statuses must only close their matching task types");
  }
}

function listen(server) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolveListen(server.address().port);
    });
  });
}

async function reservePort() {
  const probe = createServer();
  const port = await listen(probe);
  await new Promise((resolveClose) => probe.close(resolveClose));
  return port;
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(2000),
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init
  });
  return { response, payload: await response.json() };
}

async function startApp(appRoot, extraEnv = {}) {
  const port = await reservePort();
  const logs = [];
  const child = spawn(process.execPath, [join(appRoot, "server", "index.mjs")], {
    cwd: appRoot,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DEEPSEEK_API_KEY: "",
      SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED: "0",
      SCM_DATABASE_WRITES_AUTHORIZED: "",
      ...extraEnv
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));
  const app = { child, logs, baseUrl: `http://127.0.0.1:${port}` };
  runningApps.push(app);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`SCM server exited before health check.\n${logs.join("").slice(-2000)}`);
    }
    try {
      const health = await fetchJson(`${app.baseUrl}/api/deploy/health`);
      if (health.response.ok) return { ...app, health: health.payload };
    } catch {
      // The child may still be binding its local port.
    }
    await delay(100);
  }
  throw new Error(`SCM server did not become healthy.\n${logs.join("").slice(-2000)}`);
}

async function stopApp(app) {
  if (!app?.child || app.child.exitCode !== null) return;
  app.child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => app.child.once("exit", resolveExit)),
    delay(2000)
  ]);
}

async function verifyIncompleteSchemaFailsClosed(appRoot) {
  const databasePath = join(appRoot, "data", "governance_workbench.sqlite");
  const fixture = new DatabaseSync(databasePath);
  fixture.exec("DROP TABLE annotations");
  fixture.close();
  const beforeHash = hashFile(databasePath);
  let app;
  try {
    app = await startApp(appRoot);
    failures.push("readonly startup must fail when a required table is missing");
  } catch (error) {
    const message = String(error.message || error);
    if (!message.includes("annotations")) failures.push("incomplete-schema error must name the missing annotations table");
    if (!message.toLowerCase().includes("schema")) failures.push("incomplete-schema error must explain the schema failure");
  } finally {
    await stopApp(app);
  }
  const afterHash = hashFile(databasePath);
  if (beforeHash !== afterHash) failures.push("readonly startup must not repair or mutate an incomplete database");
}

const sourceHashBefore = hashFile(sourceDatabasePath);
let gateError;
let gateSummary;
try {
  verifyCertificationGates(sourceDatabasePath);
  verifyDecisionReferences(sourceDatabasePath);
  verifyKnowledgeReferences(sourceDatabasePath);
  verifyAcceptedManualGateStatuses(copyApp("accepted-manual-gate-status"));
  const readonlyRoot = copyApp("readonly");
  const readonlyDatabasePath = join(readonlyRoot, "data", "governance_workbench.sqlite");
  const readonlyHashBefore = hashFile(readonlyDatabasePath);
  const readonlyApp = await startApp(readonlyRoot);
  if (readonlyApp.health.boundary?.databaseWriteAuthorized !== false) {
    failures.push("health must expose databaseWriteAuthorized=false by default");
  }
  if (readonlyApp.health.boundary?.databaseWrites !== false) {
    failures.push("health must expose databaseWrites=false by default");
  }
  if (readonlyApp.health.database?.mode !== "readonly") {
    failures.push("health must expose database.mode=readonly by default");
  }
  const mutation = await fetchJson(`${readonlyApp.baseUrl}/api/annotations`, {
    method: "POST",
    body: JSON.stringify({
      targetType: "database_gate_fixture",
      targetId: "readonly",
      body: "must be rejected",
      author: "database-gate-smoke"
    })
  });
  if (mutation.response.status !== 403) failures.push(`readonly mutation must return HTTP 403, received ${mutation.response.status}`);
  if (!String(mutation.payload.error || "").includes("SCM_DATABASE_WRITES_AUTHORIZED")) {
    failures.push("readonly mutation error must name SCM_DATABASE_WRITES_AUTHORIZED");
  }
  await stopApp(readonlyApp);
  if (readonlyHashBefore !== hashFile(readonlyDatabasePath)) failures.push("readonly startup and rejected POST must preserve the SQLite hash");

  await verifyIncompleteSchemaFailsClosed(copyApp("incomplete"));

  const writableRoot = copyApp("authorized");
  const writableApp = await startApp(writableRoot, { SCM_DATABASE_WRITES_AUTHORIZED: "1" });
  if (writableApp.health.boundary?.databaseWriteAuthorized !== true) {
    failures.push("authorized health must expose databaseWriteAuthorized=true");
  }
  if (writableApp.health.boundary?.databaseWrites !== true) {
    failures.push("authorized health must expose databaseWrites=true");
  }
  if (writableApp.health.database?.mode !== "writable") {
    failures.push("authorized health must expose database.mode=writable");
  }
  const authorizedMutation = await fetchJson(`${writableApp.baseUrl}/api/annotations`, {
    method: "POST",
    body: JSON.stringify({
      targetType: "database_gate_fixture",
      targetId: "authorized",
      body: "authorized disposable fixture write",
      author: "database-gate-smoke"
    })
  });
  if (authorizedMutation.response.status !== 201) {
    failures.push(`authorized disposable mutation must return HTTP 201, received ${authorizedMutation.response.status}`);
  }
  const invalidRecommendationId = "database-gate-unresolved-knowledge-reference";
  const invalidRecommendation = await fetchJson(`${writableApp.baseUrl}/api/recommendation-cards`, {
    method: "POST",
    body: JSON.stringify({
      id: invalidRecommendationId,
      scenario: "database gate unresolved knowledge reference",
      title: "Reject an unresolved knowledge reference",
      targetObjectType: "InventoryBatch",
      targetObjectId: "database_gate_fixture",
      linkedKnowledgeCardIds: ["knowledge.missing_database_gate_fixture"]
    })
  });
  if (invalidRecommendation.response.status !== 400) {
    failures.push(`unresolved recommendation knowledge reference must return HTTP 400, received ${invalidRecommendation.response.status}`);
  }
  if (!String(invalidRecommendation.payload.error || "").includes("knowledge.missing_database_gate_fixture")) {
    failures.push("unresolved recommendation error must name the rejected knowledge card id");
  }
  const persistedInvalidRecommendation = await fetchJson(
    `${writableApp.baseUrl}/api/recommendation-cards/${invalidRecommendationId}`
  );
  if (persistedInvalidRecommendation.response.status !== 404) {
    failures.push("unresolved recommendation knowledge reference must not persist a recommendation card");
  }
  const policyDecision = await fetchJson(`${writableApp.baseUrl}/api/decision/logs`, {
    method: "POST",
    body: JSON.stringify({
      id: "database-gate-policy-subject",
      insightTitle: "Policy subject reference fixture",
      linkedMetricId: "policy.fixture",
      recommendation: "verify_subject_reference",
      actor: "database-gate-smoke"
    })
  });
  if (policyDecision.response.status !== 201) {
    failures.push(`policy subject decision must return HTTP 201, received ${policyDecision.response.status}`);
  }
  if (policyDecision.payload.decisionLog?.linked_metric_id !== ""
    || policyDecision.payload.decisionLog?.subject_ref !== "policy.fixture") {
    failures.push("policy subject decision must store policy.fixture in subject_ref and leave linked_metric_id empty");
  }
  const metricDecision = await fetchJson(`${writableApp.baseUrl}/api/decision/logs`, {
    method: "POST",
    body: JSON.stringify({
      id: "database-gate-metric-reference",
      insightTitle: "Metric reference fixture",
      linkedMetricId: "SCM-MECE-L3-028",
      recommendation: "verify_metric_reference",
      actor: "database-gate-smoke"
    })
  });
  if (metricDecision.response.status !== 201) {
    failures.push(`metric decision must return HTTP 201, received ${metricDecision.response.status}`);
  }
  if (metricDecision.payload.decisionLog?.linked_metric_id !== "SCM-MECE-L3-028"
    || metricDecision.payload.decisionLog?.subject_ref !== "") {
    failures.push("metric decision must resolve SCM-MECE-L3-028 into linked_metric_id and leave subject_ref empty");
  }
  await stopApp(writableApp);

  if (failures.length) throw new Error(`Database authorization gate failed:\n- ${failures.join("\n- ")}`);
  gateSummary = {
    ok: true,
    defaultMode: "readonly",
    defaultMutationStatus: mutation.response.status,
    incompleteSchema: "startup_rejected_without_repair",
    authorizedMode: "writable_disposable_fixture_only",
    authorizedMutationStatus: authorizedMutation.response.status,
    unresolvedRecommendationStatus: invalidRecommendation.response.status,
    policySubjectDecisionStatus: policyDecision.response.status,
    metricReferenceDecisionStatus: metricDecision.response.status,
    acceptedFieldMappingStatusRecognized: true,
    sourceDatabaseHashPreserved: sourceHashBefore === hashFile(sourceDatabasePath),
    providerCalls: false,
    productionWrites: false
  };
} catch (error) {
  gateError = error instanceof Error ? error : new Error(String(error));
}

const cleanupErrors = [];
for (const app of runningApps.reverse()) {
  try {
    await stopApp(app);
  } catch (error) {
    cleanupErrors.push(error instanceof Error ? error : new Error(String(error)));
  }
}
try {
  rmSync(sandboxRoot, { recursive: true, force: true });
} catch (error) {
  cleanupErrors.push(error instanceof Error ? error : new Error(String(error)));
}

let sourceIntegrityError;
try {
  if (sourceHashBefore !== hashFile(sourceDatabasePath)) {
    sourceIntegrityError = new Error("Source SQLite database changed during database gate smoke");
  }
} catch (error) {
  sourceIntegrityError = error instanceof Error ? error : new Error(String(error));
}

const gateErrors = [gateError, ...cleanupErrors, sourceIntegrityError].filter(Boolean);
if (gateErrors.length === 1) throw gateErrors[0];
if (gateErrors.length > 1) {
  throw new AggregateError(gateErrors, "Database gate failed and one or more cleanup or source-integrity checks also failed");
}

console.log(JSON.stringify(gateSummary, null, 2));
