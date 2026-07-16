import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const childTimeoutMs = Number(process.env.SCM_PROVIDER_GATE_CHILD_TIMEOUT_MS || 15000);

if (!Number.isFinite(childTimeoutMs) || childTimeoutMs <= 0) {
  throw new Error("SCM_PROVIDER_GATE_CHILD_TIMEOUT_MS must be a positive number");
}

const sandboxRoot = mkdtempSync(join(tmpdir(), "scm-provider-gate-"));

function listen(server) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolveListen(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolveClose) => server.close(() => resolveClose()));
}

async function reservePort() {
  const probe = createServer();
  const port = await listen(probe);
  await close(probe);
  return port;
}

async function waitForHealth(baseUrl, child, logs) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`SCM server exited before health check.\n${logs.join("").slice(-2000)}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/deploy/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return response.json();
    } catch {
      // The child may still be binding its local port.
    }
    await delay(100);
  }
  throw new Error(`SCM server did not become healthy.\n${logs.join("").slice(-2000)}`);
}

function runProcess(command, args, options) {
  return new Promise((resolveRun, rejectRun) => {
    const childProcess = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceKillTimer;
    const timeout = setTimeout(() => {
      timedOut = true;
      childProcess.kill("SIGTERM");
      forceKillTimer = setTimeout(() => {
        if (childProcess.exitCode === null) childProcess.kill("SIGKILL");
      }, 1000);
    }, childTimeoutMs);
    childProcess.stdout.on("data", (chunk) => { stdout += String(chunk); });
    childProcess.stderr.on("data", (chunk) => { stderr += String(chunk); });
    childProcess.once("error", (error) => {
      clearTimeout(timeout);
      clearTimeout(forceKillTimer);
      rejectRun(error);
    });
    childProcess.once("close", (status) => {
      clearTimeout(timeout);
      clearTimeout(forceKillTimer);
      if (timedOut) {
        rejectRun(new Error(`Child process exceeded ${childTimeoutMs}ms: ${command} ${args.join(" ")}`));
        return;
      }
      resolveRun({ status, stdout, stderr });
    });
  });
}

let providerRequestCount = 0;
const fakeProvider = createServer((request, response) => {
  providerRequestCount += 1;
  response.writeHead(418, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: { message: `unexpected fixture provider request: ${request.url}` } }));
});

let child;
try {
  for (const entry of ["server", "data", "dist"]) {
    cpSync(join(appRoot, entry), join(sandboxRoot, entry), { recursive: true });
  }

  const providerPort = await listen(fakeProvider);
  const appPort = await reservePort();
  const baseUrl = `http://127.0.0.1:${appPort}`;
  const childLogs = [];
  child = spawn(process.execPath, [join(sandboxRoot, "server", "index.mjs")], {
    cwd: sandboxRoot,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(appPort),
      DEEPSEEK_API_KEY: "fixture-key",
      DEEPSEEK_BASE_URL: `http://127.0.0.1:${providerPort}`,
      DEEPSEEK_ANTHROPIC_BASE_URL: `http://127.0.0.1:${providerPort}`,
      DEEPSEEK_TIMEOUT_MS: "5000",
      SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED: "",
      SCM_DATABASE_WRITES_AUTHORIZED: "1"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => childLogs.push(String(chunk)));
  child.stderr.on("data", (chunk) => childLogs.push(String(chunk)));

  const health = await waitForHealth(baseUrl, child, childLogs);
  const statusResponse = await fetch(`${baseUrl}/api/ai-chat/deepseek/status`, { signal: AbortSignal.timeout(2000) });
  const status = await statusResponse.json();
  const chatResponse = await fetch(`${baseUrl}/api/ai-chat/deepseek`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(2000),
    body: JSON.stringify({
      mode: "knowledge",
      messages: [{ role: "user", content: "provider gate fixture" }]
    })
  });
  const chatPayload = await chatResponse.json();

  const failures = [];
  if (chatResponse.status !== 403) failures.push(`expected HTTP 403, received ${chatResponse.status}`);
  if (!String(chatPayload.error || "").includes("SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED")) {
    failures.push("authorization error must name SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED");
  }
  if (providerRequestCount !== 0) failures.push(`expected zero provider requests, received ${providerRequestCount}`);
  if (status.providerCallAuthorized !== false) failures.push("status must expose providerCallAuthorized=false");
  if (status.databaseWriteAuthorized !== true) failures.push("status must expose databaseWriteAuthorized=true for this disposable fixture");
  if (status.available !== false) failures.push("status must expose available=false");
  if (health.boundary?.providerCalls !== false) failures.push("health boundary must keep providerCalls=false");

  let databaseBlockedPostCount = 0;
  const databaseBlockedWorkbench = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/api/ai-chat/deepseek/status") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        provider: "deepseek",
        configured: true,
        providerCallAuthorized: true,
        databaseWriteAuthorized: false,
        available: false,
        model: "fixture-model",
        webModel: "fixture-web-model",
        webSearchEnabled: false,
        secretPolicy: "server_side_env_only_key_never_returned_to_browser"
      }));
      return;
    }
    if (request.method === "POST" && request.url === "/api/ai-chat/deepseek") {
      databaseBlockedPostCount += 1;
    }
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "database authorization gate fixture must not receive POST" }));
  });

  const databaseBlockedEvidencePath = join(sandboxRoot, "deepseek-live-database-blocked.json");
  let databaseBlockedEvidence;
  try {
    const databaseBlockedWorkbenchPort = await listen(databaseBlockedWorkbench);
    const databaseBlockedResult = await runProcess(
      process.execPath,
      [join(appRoot, "scripts", "smoke-deepseek-live.mjs")],
      {
        cwd: sandboxRoot,
        env: {
          ...process.env,
          SCM_WORKBENCH_BASE_URL: `http://127.0.0.1:${databaseBlockedWorkbenchPort}`,
          SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED: "1",
          SCM_DEEPSEEK_LIVE_TIMEOUT_MS: "2000",
          SCM_DEEPSEEK_LIVE_EVIDENCE_PATH: databaseBlockedEvidencePath
        }
      }
    );
    if (databaseBlockedResult.status !== 2) failures.push(`database-blocked live fixture must exit 2, got ${databaseBlockedResult.status}`);
    databaseBlockedEvidence = JSON.parse(readFileSync(databaseBlockedEvidencePath, "utf8"));
    if (databaseBlockedPostCount !== 0) failures.push(`database-blocked live fixture must not dispatch POST, got ${databaseBlockedPostCount}`);
    if (databaseBlockedEvidence.status !== "blocked_database_write_authorization_flag_missing") {
      failures.push(`database-blocked live evidence status must identify database authorization, got ${databaseBlockedEvidence.status}`);
    }
    if (databaseBlockedEvidence.statusEndpoint?.databaseWriteAuthorized !== false) {
      failures.push("database-blocked live evidence must record databaseWriteAuthorized=false");
    }
    if (databaseBlockedEvidence.boundary?.providerCallAttempted !== false) {
      failures.push("database-blocked live evidence must record providerCallAttempted=false");
    }
  } finally {
    if (databaseBlockedWorkbench.listening) await close(databaseBlockedWorkbench);
  }

  let liveClientPostCount = 0;
  const fakeWorkbench = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/api/ai-chat/deepseek/status") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        provider: "deepseek",
        configured: true,
        providerCallAuthorized: true,
        databaseWriteAuthorized: true,
        available: true,
        model: "fixture-model",
        webModel: "fixture-web-model",
        webSearchEnabled: false,
        secretPolicy: "server_side_env_only_key_never_returned_to_browser"
      }));
      return;
    }
    if (request.method === "POST" && request.url === "/api/ai-chat/deepseek") {
      liveClientPostCount += 1;
      request.resume();
      response.writeHead(502, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "fixture provider failure after request dispatch" }));
      return;
    }
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });

  const liveEvidencePath = join(sandboxRoot, "deepseek-live-failed-attempt.json");
  let liveFailureEvidence;
  try {
    const fakeWorkbenchPort = await listen(fakeWorkbench);
    const liveResult = await runProcess(
      process.execPath,
      [join(appRoot, "scripts", "smoke-deepseek-live.mjs")],
      {
        cwd: sandboxRoot,
        env: {
          ...process.env,
          SCM_WORKBENCH_BASE_URL: `http://127.0.0.1:${fakeWorkbenchPort}`,
          SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED: "1",
          SCM_DEEPSEEK_LIVE_TIMEOUT_MS: "2000",
          SCM_DEEPSEEK_LIVE_EVIDENCE_PATH: liveEvidencePath
        }
      }
    );
    if (liveResult.status !== 1) failures.push(`failed live provider fixture must exit 1, got ${liveResult.status}`);
    liveFailureEvidence = JSON.parse(readFileSync(liveEvidencePath, "utf8"));
    if (liveClientPostCount !== 1) failures.push(`failed live provider fixture must dispatch one POST, got ${liveClientPostCount}`);
    if (liveFailureEvidence.status !== "failed") failures.push(`failed live provider evidence status must be failed, got ${liveFailureEvidence.status}`);
    if (liveFailureEvidence.boundary?.providerCallAttempted !== true) {
      failures.push("failed live provider evidence must record providerCallAttempted=true");
    }
    if (liveFailureEvidence.boundary?.providerCalls !== true) {
      failures.push("failed live provider evidence must conservatively record providerCalls=true after dispatch");
    }
    if (liveFailureEvidence.statusEndpoint?.databaseWriteAuthorized !== true) {
      failures.push("failed live provider evidence must record databaseWriteAuthorized=true from status");
    }
    if (liveFailureEvidence.boundary?.workbenchSqliteWritePossibleButUnconfirmed !== true) {
      failures.push("failed live provider evidence must conservatively record possible workbench SQLite write after dispatch");
    }
    if (liveFailureEvidence.boundary?.productionWrites !== false) {
      failures.push("failed live provider evidence must preserve productionWrites=false");
    }
    if (liveFailureEvidence.boundary?.productionBusinessWrites !== false) {
      failures.push("failed live provider evidence must preserve productionBusinessWrites=false");
    }
  } finally {
    if (fakeWorkbench.listening) await close(fakeWorkbench);
  }

  if (failures.length) {
    throw new Error(`Provider authorization gate failed:\n- ${failures.join("\n- ")}`);
  }

  console.log(JSON.stringify({
    ok: true,
    providerCallAuthorized: status.providerCallAuthorized,
    providerAvailable: status.available,
    providerRequestCount,
    responseStatus: chatResponse.status,
    databaseBlockedPostCount,
    databaseBlockedStatus: databaseBlockedEvidence.status,
    failedLiveClientPostCount: liveClientPostCount,
    failedLiveEvidenceProviderCalls: liveFailureEvidence.boundary.providerCalls,
    failedLiveEvidenceProviderCallAttempted: liveFailureEvidence.boundary.providerCallAttempted,
    failedLiveEvidenceDatabaseWriteAuthorized: liveFailureEvidence.statusEndpoint.databaseWriteAuthorized,
    failedLiveEvidenceWorkbenchSqliteWritePossibleButUnconfirmed: liveFailureEvidence.boundary.workbenchSqliteWritePossibleButUnconfirmed,
    databaseWrite: false
  }, null, 2));
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    const exited = await Promise.race([
      new Promise((resolveExit) => child.once("exit", () => resolveExit(true))),
      delay(2000).then(() => false)
    ]);
    if (!exited && child.exitCode === null) {
      child.kill("SIGKILL");
      await Promise.race([
        new Promise((resolveExit) => child.once("exit", resolveExit)),
        delay(2000)
      ]);
    }
  }
  if (fakeProvider.listening) await close(fakeProvider);
  rmSync(sandboxRoot, { recursive: true, force: true });
}
