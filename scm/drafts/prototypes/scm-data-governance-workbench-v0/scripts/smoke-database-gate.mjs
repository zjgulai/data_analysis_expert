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

function copyApp(name) {
  const targetRoot = join(sandboxRoot, name);
  for (const entry of ["server", "data", "dist", "runtime"]) {
    const source = join(sourceAppRoot, entry);
    if (existsSync(source)) cpSync(source, join(targetRoot, entry), { recursive: true });
  }
  return targetRoot;
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
  await stopApp(writableApp);

  if (failures.length) throw new Error(`Database authorization gate failed:\n- ${failures.join("\n- ")}`);
  gateSummary = {
    ok: true,
    defaultMode: "readonly",
    defaultMutationStatus: mutation.response.status,
    incompleteSchema: "startup_rejected_without_repair",
    authorizedMode: "writable_disposable_fixture_only",
    authorizedMutationStatus: authorizedMutation.response.status,
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
