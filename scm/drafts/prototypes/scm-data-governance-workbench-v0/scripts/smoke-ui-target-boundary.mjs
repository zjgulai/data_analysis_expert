import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listen(server, host) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      server.off("error", reject);
      resolveListen(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolveClose) => server.close(() => resolveClose()));
}

function runProcess(command, args, options) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.once("error", rejectRun);
    child.once("close", (status) => resolveRun({ status, stdout, stderr }));
  });
}

const redirectedTarget = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({
    ok: false,
    boundary: { databaseWriteAuthorized: true },
    database: { aipScenarios: 6 },
    receivedPath: request.url
  }));
});

let entryServer;
try {
  const redirectedPort = await listen(redirectedTarget, "0.0.0.0");
  entryServer = createServer((request, response) => {
    response.writeHead(302, {
      Location: `http://0.0.0.0:${redirectedPort}${request.url || "/"}`
    });
    response.end();
  });
  const entryPort = await listen(entryServer, "127.0.0.1");
  const result = await runProcess(
    process.execPath,
    [join(scriptDir, "smoke-ui.mjs")],
    {
      cwd: appRoot,
      env: {
        ...process.env,
        SCM_WORKBENCH_BASE_URL: `http://127.0.0.1:${entryPort}`,
        SCM_MUTATING_SMOKE_REMOTE_AUTHORIZED: "",
        SCM_SMOKE_REQUEST_TIMEOUT_MS: "2000"
      }
    }
  );
  const output = `${result.stdout}\n${result.stderr}`;
  assert(result.status !== 0, "redirect-boundary:unauthorized-final-target-was-accepted");
  assert(
    output.includes("Mutating UI smoke final destination is restricted to loopback"),
    `redirect-boundary:final-target-rejection-missing:${output.slice(-600)}`
  );

  console.log(JSON.stringify({
    ok: true,
    initialTarget: "loopback",
    redirectedTarget: "unauthorized_0.0.0.0",
    finalTargetRejectedBeforeInteraction: true,
    productionWrites: false,
    providerCalls: false
  }, null, 2));
} finally {
  if (entryServer?.listening) await close(entryServer);
  if (redirectedTarget.listening) await close(redirectedTarget);
}
