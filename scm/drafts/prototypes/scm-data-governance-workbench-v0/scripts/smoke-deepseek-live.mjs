import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const port = process.env.PORT || "5174";
const baseUrl = process.env.SCM_WORKBENCH_BASE_URL || `http://127.0.0.1:${port}`;
const evidencePath = process.env.SCM_DEEPSEEK_LIVE_EVIDENCE_PATH
  || path.join("tmp", "outputs", "deepseek-live-acceptance-20260623.json");
const requestTimeoutMs = Number(process.env.SCM_DEEPSEEK_LIVE_TIMEOUT_MS || 60000);
const providerCallAuthorized = ["1", "true", "yes", "on"].includes(
  String(process.env.SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED || "").toLowerCase()
);
let providerCallAttempted = false;
let lastStatusEndpoint = null;

const prompt = "请用不超过80字说明 AIP-SCM DeepSeek live acceptance 的事实、推断和不确定项边界。";

function redactSecretLike(value) {
  return String(value || "")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[REDACTED_SECRET]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED_SECRET]")
    .replace(
      /(["']?x-api-key["']?\s*[:=]\s*["']?)[^"',\s}\]]+/gi,
      "$1[REDACTED_SECRET]"
    );
}

function redactObject(value) {
  return JSON.parse(JSON.stringify(value, (_key, innerValue) => {
    if (typeof innerValue === "string") return redactSecretLike(innerValue);
    return innerValue;
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoSecretLeak(serializedEvidence) {
  assert(!/sk-[A-Za-z0-9_-]{8,}/.test(serializedEvidence), "evidence must not contain secret-like sk token");
  assert(!/Bearer\s+[A-Za-z0-9._-]+/i.test(serializedEvidence), "evidence must not contain bearer token");
  assert(
    !/["']?x-api-key["']?\s*[:=]\s*["']?(?!\[REDACTED_SECRET\])[^"',\s}\]]+/i.test(serializedEvidence),
    "evidence must not contain x-api-key value"
  );
}

function buildStatusEndpointPayload(status, overrides = {}) {
  return {
    configured: Boolean(status.configured),
    providerCallAuthorized: Boolean(status.providerCallAuthorized),
    databaseWriteAuthorized: Boolean(status.databaseWriteAuthorized),
    available: Boolean(status.available),
    model: status.model,
    webModel: status.webModel,
    webSearchEnabled: Boolean(status.webSearchEnabled),
    secretPolicy: status.secretPolicy,
    ...overrides
  };
}

async function request(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
    signal: init.signal || AbortSignal.timeout(requestTimeoutMs)
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${pathname} failed: ${response.status} ${redactSecretLike(JSON.stringify(payload)).slice(0, 500)}`);
  }
  return payload;
}

async function writeEvidence(status, detail = {}) {
  const boundary = {
    providerCalls: providerCallAttempted,
    providerCallAttempted,
    providerCallCompleted: status === "passed",
    providerCallOutcome: !providerCallAttempted
      ? "not_attempted"
      : status === "passed"
        ? "succeeded"
        : "attempted_outcome_unconfirmed",
    providerCallScope: providerCallAttempted
      ? "authorized_single_knowledge_prompt_attempt"
      : "none",
    providerModeCalled: providerCallAttempted ? "knowledge" : "not_called",
    webModeCalled: false,
    localSqliteWrites: status === "passed",
    localSqliteWritePossibleButUnconfirmed: providerCallAttempted && status !== "passed",
    workbenchSqliteWrites: status === "passed",
    workbenchSqliteWritePossibleButUnconfirmed: providerCallAttempted && status !== "passed",
    productionWrites: false,
    productionBusinessWrites: false,
    erpWriteback: false,
    omsWriteback: false,
    wmsWriteback: false,
    sourceSystemRead: false,
    businessRowImport: false,
    deepseekApiKeyPersisted: false
  };
  const evidence = redactObject({
    generatedAt: new Date().toISOString(),
    check: "deepseek-live-provider-acceptance",
    status,
    baseUrl,
    evidencePath,
    boundary,
    ...detail
  });
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  assertNoSecretLeak(serialized);
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, serialized, "utf8");
  return evidence;
}

function evidenceSummary(items) {
  return (Array.isArray(items) ? items : []).slice(0, 5).map((item) => ({
    cardId: item.card_id || "",
    title: item.title || "",
    domain: item.domain_name || "",
    topic: item.topic || "",
    evidencePolicy: item.evidencePolicy || "",
    sourcePathHash: item.source_path
      ? crypto.createHash("sha256").update(String(item.source_path)).digest("hex").slice(0, 16)
      : ""
  }));
}

async function finishBlocked(status, detail) {
  const evidence = await writeEvidence(status, detail);
  console.log(JSON.stringify({
    ok: false,
    status: evidence.status,
    evidencePath: evidence.evidencePath,
    boundary: evidence.boundary
  }, null, 2));
  process.exitCode = 2;
}

async function main() {
  const status = await request("/api/ai-chat/deepseek/status");
  assert(status.provider === "deepseek", "status endpoint must identify deepseek provider");
  assert(status.secretPolicy === "server_side_env_only_key_never_returned_to_browser", "status endpoint must keep server-side secret policy");
  lastStatusEndpoint = buildStatusEndpointPayload(status);

  if (!providerCallAuthorized) {
    await finishBlocked("blocked_authorization_flag_missing", {
      statusEndpoint: lastStatusEndpoint,
      requiredEnv: "SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1"
    });
    return;
  }

  if (!status.providerCallAuthorized) {
    await finishBlocked("blocked_server_authorization_flag_missing", {
      statusEndpoint: buildStatusEndpointPayload(status, { providerCallAuthorized: false }),
      requiredServerEnv: "SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1"
    });
    return;
  }

  if (!status.configured) {
    await finishBlocked("blocked_runtime_key_missing", {
      statusEndpoint: buildStatusEndpointPayload(status, {
        configured: false,
        providerCallAuthorized: true,
        available: false
      }),
      requiredRuntimeEnv: "DEEPSEEK_API_KEY"
    });
    return;
  }

  if (!status.databaseWriteAuthorized) {
    await finishBlocked("blocked_database_write_authorization_flag_missing", {
      statusEndpoint: buildStatusEndpointPayload(status, {
        configured: true,
        providerCallAuthorized: true,
        databaseWriteAuthorized: false,
        available: false
      }),
      requiredServerEnv: "SCM_DATABASE_WRITES_AUTHORIZED=1"
    });
    return;
  }

  if (!status.available) {
    await finishBlocked("blocked_provider_unavailable", {
      statusEndpoint: buildStatusEndpointPayload(status, {
        configured: true,
        providerCallAuthorized: true,
        databaseWriteAuthorized: true,
        available: false
      })
    });
    return;
  }

  providerCallAttempted = true;
  const response = await request("/api/ai-chat/deepseek", {
    method: "POST",
    body: JSON.stringify({
      mode: "knowledge",
      limit: 4,
      messages: [{ role: "user", content: prompt }]
    })
  });

  assert(response.provider === "deepseek", "chat response must identify deepseek provider");
  assert(response.mode === "knowledge", "live acceptance must stay in knowledge mode");
  assert(response.policy === "deepseek_knowledge_rag_provider_call_no_web_no_external_write", "live acceptance must keep knowledge-mode policy");
  assert(response.traceId && response.runId, "live acceptance must return traceId and runId");
  assert(String(response.answer || "").trim().length > 0, "live acceptance must return non-empty answer");

  const answer = String(response.answer || "").trim();
  const evidence = await writeEvidence("passed", {
    promptHash: crypto.createHash("sha256").update(prompt).digest("hex"),
    statusEndpoint: buildStatusEndpointPayload(status, {
      configured: true,
      providerCallAuthorized: true,
      databaseWriteAuthorized: true,
      available: true
    }),
    response: {
      answerable: Boolean(response.answerable),
      provider: response.provider,
      mode: response.mode,
      model: response.model,
      finishReason: response.finishReason || "",
      policy: response.policy,
      traceId: response.traceId,
      runId: response.runId,
      usage: response.usage || null,
      providerPayloadTypes: response.providerPayloadTypes || [],
      answerLength: answer.length,
      answerPreview: redactSecretLike(answer).replace(/\s+/g, " ").slice(0, 180),
      evidenceCount: Array.isArray(response.evidence) ? response.evidence.length : 0,
      evidence: evidenceSummary(response.evidence),
      searchSummary: {
        answerable: Boolean(response.searchSummary?.answerable),
        resultCount: response.searchSummary?.resultCount || 0,
        policy: response.searchSummary?.policy || "",
        doesNotProve: response.searchSummary?.doesNotProve || []
      },
      doesNotProve: response.doesNotProve || []
    }
  });

  console.log(JSON.stringify({
    ok: true,
    status: evidence.status,
    evidencePath: evidence.evidencePath,
    providerCalls: evidence.boundary.providerCalls,
    mode: evidence.response.mode,
    traceId: evidence.response.traceId,
    runId: evidence.response.runId
  }, null, 2));
}

main().catch(async (error) => {
  const message = redactSecretLike(error?.message || error);
  try {
    const evidence = await writeEvidence("failed", {
      ...(lastStatusEndpoint ? { statusEndpoint: lastStatusEndpoint } : {}),
      error: message.slice(0, 500)
    });
    console.log(JSON.stringify({
      ok: false,
      status: evidence.status,
      evidencePath: evidence.evidencePath,
      error: message
    }, null, 2));
  } catch (writeError) {
    console.error(redactSecretLike(writeError?.message || writeError));
    console.error(message);
  }
  process.exitCode = 1;
});
