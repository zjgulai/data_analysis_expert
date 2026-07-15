import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
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
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`SCM server exited before health check.\n${logs.join("").slice(-2000)}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/deploy/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return { child, baseUrl, logs };
    } catch {
      // The child may still be binding its local port.
    }
    await delay(100);
  }
  throw new Error(`SCM server did not become healthy.\n${logs.join("").slice(-2000)}`);
}

async function stopApp(app) {
  if (app?.child && app.child.exitCode === null) {
    app.child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolveExit) => app.child.once("exit", resolveExit)),
      delay(2000)
    ]);
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
  const monorepoRoot = join(sandboxRoot, "monorepo", "scm");
  const monorepoAppRoot = join(monorepoRoot, "drafts", "prototypes", "scm-data-governance-workbench-v0");
  copyApp(monorepoAppRoot);
  removeEmbeddedEvidence(monorepoAppRoot);
  mkdirSync(join(monorepoRoot, "tmp", "outputs"), { recursive: true });
  cpSync(sourceEvidencePath, join(monorepoRoot, "tmp", "outputs", evidenceFileName));
  const monorepoApp = await startApp(monorepoAppRoot);
  runningApps.push(monorepoApp);
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
  runningApps.push(standaloneApp);
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
  runningApps.push(overrideApp);
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
  runningApps.push(missingApp);
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
