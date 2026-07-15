import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
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
      const response = await fetch(`${baseUrl}/api/deploy/health`);
      if (response.ok) return response.json();
    } catch {
      // The child may still be binding its local port.
    }
    await delay(100);
  }
  throw new Error(`SCM server did not become healthy.\n${logs.join("").slice(-2000)}`);
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
      SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => childLogs.push(String(chunk)));
  child.stderr.on("data", (chunk) => childLogs.push(String(chunk)));

  const health = await waitForHealth(baseUrl, child, childLogs);
  const statusResponse = await fetch(`${baseUrl}/api/ai-chat/deepseek/status`);
  const status = await statusResponse.json();
  const chatResponse = await fetch(`${baseUrl}/api/ai-chat/deepseek`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  if (status.available !== false) failures.push("status must expose available=false");
  if (health.boundary?.providerCalls !== false) failures.push("health boundary must keep providerCalls=false");

  if (failures.length) {
    throw new Error(`Provider authorization gate failed:\n- ${failures.join("\n- ")}`);
  }

  console.log(JSON.stringify({
    ok: true,
    providerCallAuthorized: status.providerCallAuthorized,
    providerAvailable: status.available,
    providerRequestCount,
    responseStatus: chatResponse.status,
    databaseWrite: false
  }, null, 2));
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolveExit) => child.once("exit", resolveExit)),
      delay(2000)
    ]);
  }
  if (fakeProvider.listening) await close(fakeProvider);
  rmSync(sandboxRoot, { recursive: true, force: true });
}
