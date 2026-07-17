import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceAppRoot = resolve(scriptDir, "..");
const evidenceFileName = "ai-knowledge-evidence-quality-review-20260622.json";
const sourceEvidencePath = resolve(sourceAppRoot, "runtime", "evidence", evidenceFileName);
const sandboxRoot = mkdtempSync(join(tmpdir(), "scm-path-contract-"));

if (!existsSync(sourceEvidencePath)) {
  throw new Error(`Path-contract fixture is missing: ${sourceEvidencePath}`);
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

function close(server) {
  return new Promise((resolveClose) => server.close(() => resolveClose()));
}

async function reservePort() {
  const probe = createServer();
  const port = await listen(probe);
  await close(probe);
  return port;
}

function copyApp(targetRoot) {
  mkdirSync(targetRoot, { recursive: true });
  for (const entry of ["server", "data", "dist"]) {
    cpSync(join(sourceAppRoot, entry), join(targetRoot, entry), { recursive: true });
  }
}

function removeEmbeddedEvidence(targetRoot) {
  rmSync(join(targetRoot, "data", evidenceFileName), { force: true });
}

function hasChildExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

async function waitForChildExit(child, timeoutMs) {
  if (hasChildExited(child)) return true;
  return new Promise((resolveExit) => {
    let timer;
    const finish = (exited) => {
      clearTimeout(timer);
      child.off("exit", onExit);
      resolveExit(exited);
    };
    const onExit = () => finish(true);
    child.once("exit", onExit);
    timer = setTimeout(() => finish(hasChildExited(child)), timeoutMs);
    if (hasChildExited(child)) finish(true);
  });
}

async function startApp(appRoot, extraEnv = {}, { startupTimeoutMs = 10_000 } = {}) {
  if (!Number.isInteger(startupTimeoutMs) || startupTimeoutMs <= 0) {
    throw new Error("startupTimeoutMs must be a positive integer");
  }
  const port = await reservePort();
  const logs = [];
  const child = spawn(process.execPath, [join(appRoot, "server", "index.mjs")], {
    cwd: appRoot,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DEEPSEEK_API_KEY: "",
      SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED: "",
      SCM_PROJECT_ROOT: "",
      SCM_AI_KNOWLEDGE_EVIDENCE_PATH: "",
      ...extraEnv
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => logs.push(String(chunk)));
  child.stderr.on("data", (chunk) => logs.push(String(chunk)));
  const baseUrl = `http://127.0.0.1:${port}`;
  const app = { child, baseUrl, logs };
  runningApps.push(app);
  try {
    const startupDeadline = Date.now() + startupTimeoutMs;
    while (Date.now() < startupDeadline) {
      if (hasChildExited(child)) {
        throw new Error(`SCM server exited before health check.\n${logs.join("").slice(-2000)}`);
      }
      try {
        const remainingMs = Math.max(1, startupDeadline - Date.now());
        const response = await fetch(`${baseUrl}/api/deploy/health`, {
          signal: AbortSignal.timeout(Math.min(2000, remainingMs))
        });
        if (response.ok) return app;
      } catch {
        // The child may still be binding its local port.
        if (hasChildExited(child)) {
          throw new Error(`SCM server exited before health check.\n${logs.join("").slice(-2000)}`);
        }
      }
      const delayMs = Math.min(100, Math.max(0, startupDeadline - Date.now()));
      if (delayMs > 0) await delay(delayMs);
    }
    throw new Error(`SCM server did not become healthy.\n${logs.join("").slice(-2000)}`);
  } catch (error) {
    await stopApp(app);
    const appIndex = runningApps.indexOf(app);
    if (appIndex >= 0) runningApps.splice(appIndex, 1);
    throw error;
  }
}

async function stopApp(app) {
  if (app?.child && !hasChildExited(app.child)) {
    app.child.kill("SIGTERM");
    const exited = await waitForChildExit(app.child, 2000);
    if (!exited && !hasChildExited(app.child)) {
      app.child.kill("SIGKILL");
      const killed = await waitForChildExit(app.child, 2000);
      if (!killed && !hasChildExited(app.child)) {
        throw new Error(`SCM server child ${app.child.pid || "unknown"} did not exit after SIGKILL`);
      }
    }
  }
}

async function requestReview(app) {
  const response = await fetch(`${app.baseUrl}/api/knowledge/evidence-quality-review`, { signal: AbortSignal.timeout(2000) });
  return { response, payload: await response.json() };
}

const failures = [];
const results = [];
const runningApps = [];

try {
  const stalledStartupRoot = join(sandboxRoot, "stalled-startup");
  mkdirSync(join(stalledStartupRoot, "server"), { recursive: true });
  writeFileSync(
    join(stalledStartupRoot, "server", "index.mjs"),
    `import { createServer } from "node:http";
     createServer(() => {}).listen(Number(process.env.PORT), "127.0.0.1");
    `,
    "utf8"
  );
  const stalledStartupIndex = runningApps.length;
  const stalledStartupStartedAt = Date.now();
  const stalledStartupPromise = startApp(stalledStartupRoot, {}, { startupTimeoutMs: 250 }).then(
    () => ({ ok: true, error: "" }),
    (error) => ({ ok: false, error: String(error?.message || error) })
  );
  const stalledStartupOutcome = await Promise.race([
    stalledStartupPromise,
    delay(1000).then(() => ({ watchdogExpired: true }))
  ]);
  const stalledStartupElapsedMs = Date.now() - stalledStartupStartedAt;
  if (stalledStartupOutcome.watchdogExpired) {
    const stalledApp = runningApps[stalledStartupIndex];
    if (stalledApp) await stopApp(stalledApp);
    await stalledStartupPromise;
    failures.push("stalled health endpoint must respect one overall startup deadline");
  } else {
    if (stalledStartupOutcome.ok || !stalledStartupOutcome.error.includes("did not become healthy")) {
      failures.push(`stalled health endpoint must surface the startup deadline, got: ${stalledStartupOutcome.error || "no error"}`);
    }
    if (stalledStartupElapsedMs > 750) {
      failures.push(`stalled health endpoint exceeded the bounded startup deadline: ${stalledStartupElapsedMs}ms`);
    }
  }

  const exitDuringProbeRoot = join(sandboxRoot, "exit-during-probe");
  mkdirSync(join(exitDuringProbeRoot, "server"), { recursive: true });
  writeFileSync(
    join(exitDuringProbeRoot, "server", "index.mjs"),
    `setTimeout(() => process.kill(process.pid, "SIGTERM"), 20);`,
    "utf8"
  );
  const originalFetch = globalThis.fetch;
  let exitDuringProbeError = "";
  try {
    globalThis.fetch = async () => {
      await delay(150);
      throw new Error("synthetic health probe failure");
    };
    await startApp(exitDuringProbeRoot, {}, { startupTimeoutMs: 100 });
  } catch (error) {
    exitDuringProbeError = String(error?.message || error);
  } finally {
    globalThis.fetch = originalFetch;
  }
  if (!exitDuringProbeError.includes("exited before health check")) {
    failures.push(`child exit during health probe must surface immediately, got: ${exitDuringProbeError || "no error"}`);
  }

  const failedStartupRoot = join(sandboxRoot, "failed-startup");
  const failedStartupPidPath = join(failedStartupRoot, "server.pid");
  mkdirSync(join(failedStartupRoot, "server"), { recursive: true });
  writeFileSync(
    join(failedStartupRoot, "server", "index.mjs"),
    `import { writeFileSync } from "node:fs";
     import { createServer } from "node:http";
     writeFileSync(process.env.SCM_PATH_CONTRACT_PID_PATH, String(process.pid));
     process.on("SIGTERM", () => {});
     createServer((_request, response) => {
       response.writeHead(503, { "Content-Type": "application/json" });
       response.end(JSON.stringify({ ok: false }));
     }).listen(Number(process.env.PORT), "127.0.0.1");
    `,
    "utf8"
  );
  let failedStartupError = "";
  try {
    await startApp(failedStartupRoot, { SCM_PATH_CONTRACT_PID_PATH: failedStartupPidPath });
  } catch (error) {
    failedStartupError = String(error?.message || error);
  }
  const failedStartupPid = Number(readFileSync(failedStartupPidPath, "utf8"));
  let failedStartupLeaked = false;
  try {
    process.kill(failedStartupPid, 0);
    failedStartupLeaked = true;
  } catch {
    // The expected cleanup path already terminated the failed child.
  }
  if (failedStartupLeaked) {
    process.kill(failedStartupPid, "SIGKILL");
    await delay(100);
  }
  if (!failedStartupError.includes("did not become healthy")) {
    failures.push(`failed startup must surface the health timeout, got: ${failedStartupError || "no error"}`);
  }
  if (failedStartupLeaked) failures.push("failed startup must not leak a child that ignores SIGTERM");

  const signalExitRoot = join(sandboxRoot, "signal-exit");
  mkdirSync(join(signalExitRoot, "server"), { recursive: true });
  writeFileSync(
    join(signalExitRoot, "server", "index.mjs"),
    `setTimeout(() => process.kill(process.pid, "SIGTERM"), 25);`,
    "utf8"
  );
  let signalExitError = "";
  try {
    await startApp(signalExitRoot);
  } catch (error) {
    signalExitError = String(error?.message || error);
  }
  if (!signalExitError.includes("exited before health check")) {
    failures.push(`signal-driven startup exit must be detected immediately, got: ${signalExitError || "no error"}`);
  }

  const monorepoRoot = join(sandboxRoot, "monorepo", "scm");
  const monorepoAppRoot = join(monorepoRoot, "drafts", "prototypes", "scm-data-governance-workbench-v0");
  copyApp(monorepoAppRoot);
  removeEmbeddedEvidence(monorepoAppRoot);
  mkdirSync(join(monorepoRoot, "tmp", "outputs"), { recursive: true });
  cpSync(sourceEvidencePath, join(monorepoRoot, "tmp", "outputs", evidenceFileName));
  const monorepoApp = await startApp(monorepoAppRoot);
  const monorepoReview = await requestReview(monorepoApp);
  if (monorepoReview.response.status !== 200 || monorepoReview.payload.reviewPackets?.length !== 4) {
    failures.push("monorepo layout must load four evidence review packets");
  }
  results.push({ layout: "monorepo", status: monorepoReview.response.status, reviewPackets: monorepoReview.payload.reviewPackets?.length || 0 });

  const standaloneAppRoot = join(sandboxRoot, "standalone");
  copyApp(standaloneAppRoot);
  removeEmbeddedEvidence(standaloneAppRoot);
  mkdirSync(join(standaloneAppRoot, "runtime", "evidence"), { recursive: true });
  cpSync(sourceEvidencePath, join(standaloneAppRoot, "runtime", "evidence", evidenceFileName));
  const standaloneApp = await startApp(standaloneAppRoot);
  const standaloneReview = await requestReview(standaloneApp);
  if (standaloneReview.response.status !== 200 || standaloneReview.payload.reviewPackets?.length !== 4) {
    failures.push("standalone layout must load four evidence review packets");
  }
  results.push({ layout: "standalone", status: standaloneReview.response.status, reviewPackets: standaloneReview.payload.reviewPackets?.length || 0 });

  const overrideAppRoot = join(sandboxRoot, "override-app");
  const overrideProjectRoot = join(sandboxRoot, "override-project");
  copyApp(overrideAppRoot);
  removeEmbeddedEvidence(overrideAppRoot);
  mkdirSync(join(overrideProjectRoot, "fixtures"), { recursive: true });
  cpSync(sourceEvidencePath, join(overrideProjectRoot, "fixtures", "review.json"));
  const overrideApp = await startApp(overrideAppRoot, {
    SCM_PROJECT_ROOT: overrideProjectRoot,
    SCM_AI_KNOWLEDGE_EVIDENCE_PATH: "fixtures/review.json"
  });
  const overrideReview = await requestReview(overrideApp);
  if (overrideReview.response.status !== 200 || overrideReview.payload.reviewPackets?.length !== 4) {
    failures.push("SCM_PROJECT_ROOT plus relative evidence override must load four review packets");
  }
  results.push({ layout: "env_override", status: overrideReview.response.status, reviewPackets: overrideReview.payload.reviewPackets?.length || 0 });

  const missingAppRoot = join(sandboxRoot, "missing-app");
  const missingProjectRoot = join(sandboxRoot, "missing-project");
  copyApp(missingAppRoot);
  removeEmbeddedEvidence(missingAppRoot);
  mkdirSync(missingProjectRoot, { recursive: true });
  const missingApp = await startApp(missingAppRoot, { SCM_PROJECT_ROOT: missingProjectRoot });
  const missingReview = await requestReview(missingApp);
  if (missingReview.response.status !== 503) failures.push(`missing evidence must return HTTP 503, received ${missingReview.response.status}`);
  if (!String(missingReview.payload.error || "").includes("SCM_AI_KNOWLEDGE_EVIDENCE_PATH")) {
    failures.push("missing evidence error must name SCM_AI_KNOWLEDGE_EVIDENCE_PATH");
  }
  results.push({ layout: "missing", status: missingReview.response.status, reviewPackets: missingReview.payload.reviewPackets?.length || 0 });

  if (failures.length) throw new Error(`Evidence path contract failed:\n- ${failures.join("\n- ")}`);

  console.log(JSON.stringify({ ok: true, results, databaseWrite: "temporary-fixture-only" }, null, 2));
} finally {
  for (const app of runningApps.reverse()) await stopApp(app);
  rmSync(sandboxRoot, { recursive: true, force: true });
}
