const port = process.env.PORT || "5174";
const baseUrl = process.env.SCM_WORKBENCH_BASE_URL || `http://127.0.0.1:${port}`;
const requestTimeoutMs = Number(process.env.SCM_SMOKE_REQUEST_TIMEOUT_MS || 10000);

function envFlag(name) {
  return ["1", "true", "yes", "on"].includes(String(process.env[name] || "").toLowerCase());
}

function assertMutatingSmokeTarget() {
  const hostname = new URL(baseUrl).hostname;
  const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname);
  if (!loopback && !envFlag("SCM_MUTATING_SMOKE_REMOTE_AUTHORIZED")) {
    throw new Error("Mutating API smoke is restricted to loopback. Set SCM_MUTATING_SMOKE_REMOTE_AUTHORIZED=1 only for an explicitly approved disposable remote target.");
  }
}

assertMutatingSmokeTarget();

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
    signal: init.signal || AbortSignal.timeout(requestTimeoutMs)
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} failed: ${response.status} ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return { response, payload };
}

async function requestRaw(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
    signal: init.signal || AbortSignal.timeout(requestTimeoutMs)
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { response, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const summary = {
  baseUrl,
  checks: []
};

function checked(name, payload = {}) {
  summary.checks.push({ name, ...payload });
}

async function verifyExport(assetType, format, minimumRows = 1) {
  const exportJob = (await request("/api/exports", {
    method: "POST",
    body: JSON.stringify({ assetType, format, createdBy: "api-smoke" })
  })).payload.exportJob;
  assert(exportJob?.downloadUrl, `${assetType}/${format} export must expose a download url`);
  assert(exportJob.format === format, `${assetType}/${format} export must preserve format`);
  assert(exportJob.row_count >= minimumRows, `${assetType}/${format} export must include at least ${minimumRows} rows`);
  const expectedExtension = format === "excel" ? ".xls" : `.${format}`;
  assert(exportJob.file_name.endsWith(expectedExtension), `${assetType}/${format} file extension must be ${expectedExtension}`);

  const download = await request(exportJob.downloadUrl);
  const contentType = download.response.headers.get("content-type") || "";
  if (format === "json") {
    assert(contentType.includes("application/json"), `${assetType}/json download must be application/json`);
    assert(Array.isArray(download.payload), `${assetType}/json download must be an array`);
    assert(download.payload.length === exportJob.row_count, `${assetType}/json row count must match export job`);
  } else {
    const body = String(download.payload);
    if (format === "csv") {
      assert(contentType.includes("text/csv"), `${assetType}/csv download must be text/csv`);
      assert(body.startsWith("\""), `${assetType}/csv download must start with quoted header`);
      assert(body.split("\n").length >= minimumRows + 1, `${assetType}/csv download must include header and rows`);
    }
    if (format === "excel") {
      assert(contentType.includes("application/vnd.ms-excel"), `${assetType}/excel download must be excel mime`);
      assert(body.includes("<table"), `${assetType}/excel download must contain an HTML table`);
      assert(body.includes("<thead>"), `${assetType}/excel download must contain table header`);
    }
  }
  return {
    assetType,
    format,
    rowCount: exportJob.row_count,
    fileName: exportJob.file_name,
    downloadUrl: exportJob.downloadUrl
  };
}

const health = (await request("/api/deploy/health")).payload;
assert(health.ok === true, "deploy health must be ok");
assert(health.boundary?.databaseWriteAuthorized === true, "API smoke requires SCM_DATABASE_WRITES_AUTHORIZED=1 on a disposable target");
assert(health.database?.ontologyObjectInstances >= 10, "ontology object instances must be seeded");
assert(health.database?.aipScenarios >= 3, "aip scenarios must be seeded");
checked("deploy-health", {
  ontologyObjectInstances: health.database.ontologyObjectInstances,
  aipScenarios: health.database.aipScenarios
});

const deepSeekStatus = (await request("/api/ai-chat/deepseek/status")).payload;
assert(deepSeekStatus.provider === "deepseek", "DeepSeek status endpoint must identify provider");
assert(typeof deepSeekStatus.configured === "boolean", "DeepSeek status must expose configured flag");
assert(typeof deepSeekStatus.providerCallAuthorized === "boolean", "DeepSeek status must expose provider authorization flag");
assert(typeof deepSeekStatus.available === "boolean", "DeepSeek status must expose provider availability");
assert(deepSeekStatus.available === (deepSeekStatus.configured && deepSeekStatus.providerCallAuthorized), "DeepSeek availability must require both key and authorization");
assert(health.boundary?.providerCalls === deepSeekStatus.available, "Deploy health provider boundary must match DeepSeek availability");
assert(deepSeekStatus.model && deepSeekStatus.webModel, "DeepSeek status must expose knowledge and web models");
assert(deepSeekStatus.secretPolicy === "server_side_env_only_key_never_returned_to_browser", "DeepSeek status must preserve server-side key policy");
checked("deepseek-chat-status", {
  configured: deepSeekStatus.configured,
  model: deepSeekStatus.model,
  webModel: deepSeekStatus.webModel,
  webSearchEnabled: deepSeekStatus.webSearchEnabled,
  providerCallAuthorized: deepSeekStatus.providerCallAuthorized,
  available: deepSeekStatus.available
});
if (!deepSeekStatus.configured) {
  const missingKeyProbe = await requestRaw("/api/ai-chat/deepseek", {
    method: "POST",
    body: JSON.stringify({
      mode: "knowledge",
      messages: [{ role: "user", content: "smoke probe without key" }]
    })
  });
  assert(missingKeyProbe.response.status === 503, "DeepSeek chat must be gated when API key is absent");
  assert(String(missingKeyProbe.payload?.error || "").includes("DEEPSEEK_API_KEY"), "DeepSeek missing-key response must explain env configuration");
  checked("deepseek-chat-missing-key-gate", {
    status: missingKeyProbe.response.status,
    providerCallAttempted: false
  });
} else if (!deepSeekStatus.providerCallAuthorized) {
  const unauthorizedProbe = await requestRaw("/api/ai-chat/deepseek", {
    method: "POST",
    body: JSON.stringify({
      mode: "knowledge",
      messages: [{ role: "user", content: "smoke probe without provider authorization" }]
    })
  });
  assert(unauthorizedProbe.response.status === 403, "DeepSeek chat must be gated when provider authorization is absent");
  assert(String(unauthorizedProbe.payload?.error || "").includes("SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED"), "DeepSeek authorization response must name the server-side flag");
  checked("deepseek-chat-authorization-gate", {
    status: unauthorizedProbe.response.status,
    providerCallAttempted: false
  });
} else {
  checked("deepseek-chat-live-call-skipped", {
    reason: "api smoke does not trigger provider calls when DEEPSEEK_API_KEY is configured"
  });
}

const aiKnowledgeQuality = (await request("/api/knowledge/evidence-quality-review")).payload;
assert(Array.isArray(aiKnowledgeQuality.reviewPackets) && aiKnowledgeQuality.reviewPackets.length === 4, "AI knowledge quality review must expose four domain packets");
assert(aiKnowledgeQuality.summary?.recommendedPath === "A-A-A-A", "AI knowledge quality review must recommend A-A-A-A");
assert(aiKnowledgeQuality.summary?.activeAnswerableProbes === 9, "AI knowledge quality review must expose nine active answerable probes");
assert(aiKnowledgeQuality.summary?.candidateOnlyProbes === 3, "AI knowledge quality review must expose three candidate-only probes");
assert(aiKnowledgeQuality.summary?.boundary?.providerCalls === false, "AI knowledge quality review must keep provider calls closed");
assert(aiKnowledgeQuality.summary?.boundary?.productionWrites === false, "AI knowledge quality review must keep production writes closed");
assert(aiKnowledgeQuality.summary?.boundary?.draftDomainPromoted === false, "AI knowledge quality review must keep draft domain promotion closed");
const aiKbQualityDecisionId = `decision_ai_kb_quality_api_smoke_${Date.now()}`;
const aiKbQualityDecision = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: aiKbQualityDecisionId,
    insightTitle: "API smoke AI KB quality review",
    linkedMetricId: "ai_kb_quality.business-supply-chain",
    recommendation: "Record AI knowledge answer-quality review baseline for local governance only.",
    actionBoundary: "ai_kb_answer_quality_review_local_only_no_provider_call_no_production_write",
    status: "answer_quality_baseline_accepted",
    reviewNote: "API smoke AI KB quality review; providerCalls=false; productionWrites=false; draftDomainPromoted=false.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(aiKbQualityDecision?.status === "answer_quality_baseline_accepted", "AI KB quality review must write local decision receipt");
checked("ai-knowledge-quality-review-pack", {
  reviewPackets: aiKnowledgeQuality.reviewPackets.length,
  recommendedPath: aiKnowledgeQuality.summary.recommendedPath,
  activeAnswerableProbes: aiKnowledgeQuality.summary.activeAnswerableProbes,
  candidateOnlyProbes: aiKnowledgeQuality.summary.candidateOnlyProbes,
  decisionId: aiKbQualityDecision.id,
  providerCalls: aiKnowledgeQuality.summary.boundary.providerCalls
});

const instances = (await request("/api/ontology/instances")).payload;
assert(Array.isArray(instances) && instances.length >= 10, "instances endpoint must return seeded records");
checked("ontology-instances", { count: instances.length });

const instanceDetail = (await request("/api/ontology/instances/batch_fba_negative_available")).payload;
assert(instanceDetail.instance?.id === "batch_fba_negative_available", "instance detail must resolve batch_fba_negative_available");
assert(instanceDetail.summary?.scenarioCount >= 1, "instance detail must include linked scenarios");
assert(instanceDetail.sourceCoverage?.length >= 1, "instance detail must include source coverage");
checked("object-instance-360", {
  relationCount: instanceDetail.summary.relationCount,
  scenarioCount: instanceDetail.summary.scenarioCount,
  sourceCoverageCount: instanceDetail.sourceCoverage.length
});

const sourceCoverage = (await request("/api/source-coverage")).payload;
assert(Array.isArray(sourceCoverage) && sourceCoverage.length >= 10, "source coverage endpoint must return rows");
assert(sourceCoverage.some((item) => item.id === "SCOV-OMS-INVENTORY-STATS"), "source coverage must include OMS inventory stats");
assert(sourceCoverage.every((item) => item.runtime_status === "not_authorized_for_import"), "source coverage must keep runtime import gated");
const inventoryCoverage = (await request("/api/source-coverage?objectType=inventory_batch")).payload;
assert(inventoryCoverage.length >= 4, "inventory batch source coverage must include multiple rows");
const riskWorkbench = (await request("/api/workbench/current-risk-radar")).payload;
assert(riskWorkbench.payload?.sourceCoverage?.length >= 10, "current-risk-radar payload must include source coverage");
assert(riskWorkbench.payload?.riskThresholdGovernance?.thresholdVersions?.length >= 5, "current-risk-radar payload must include threshold governance");
assert(riskWorkbench.payload?.riskThresholdGovernance?.valueReviewPackets?.length === 5, "current-risk-radar payload must include threshold value review packets");
const thresholdGovernance = (await request("/api/risk-threshold-governance")).payload;
assert(Array.isArray(thresholdGovernance.thresholdVersions) && thresholdGovernance.thresholdVersions.length >= 5, "threshold governance must expose draft threshold versions");
assert(Array.isArray(thresholdGovernance.scenarioBindings) && thresholdGovernance.scenarioBindings.length >= 3, "threshold governance must bind seeded scenarios");
assert(Array.isArray(thresholdGovernance.ownerDecisionPackets) && thresholdGovernance.ownerDecisionPackets.length === 3, "threshold governance must expose three owner decision packets");
assert(Array.isArray(thresholdGovernance.valueReviewPackets) && thresholdGovernance.valueReviewPackets.length === 5, "threshold governance must expose five threshold value review packets");
assert(thresholdGovernance.policySummary?.recommendedPath === "A-A-A", "threshold policy summary must expose recommended A-A-A path");
assert(thresholdGovernance.valueReviewSummary?.recommendedPath === "A-A-A-A-A", "threshold value review summary must expose recommended A-A-A-A-A path");
assert(thresholdGovernance.policySummary?.boundary?.operationalScoring === false, "threshold policy summary must keep operational scoring disabled");
assert(thresholdGovernance.policySummary?.boundary?.thresholdValuesApproved === false, "threshold policy summary must keep threshold values unapproved");
assert(thresholdGovernance.valueReviewSummary?.boundary?.operationalScoring === false, "threshold value review summary must keep operational scoring disabled");
assert(thresholdGovernance.valueReviewSummary?.boundary?.thresholdValuesApproved === false, "threshold value review summary must keep threshold values unapproved");
assert(thresholdGovernance.valueReviewSummary?.formalApprovalReceiptCount === 0, "threshold value review summary must not include formal threshold value approvals");
assert(thresholdGovernance.boundary?.operationalScoring === false, "threshold governance must keep operational scoring disabled");
checked("source-coverage", {
  total: sourceCoverage.length,
  inventoryBatchRows: inventoryCoverage.length,
  riskWorkbenchRows: riskWorkbench.payload.sourceCoverage.length,
  thresholdVersions: riskWorkbench.payload.riskThresholdGovernance.thresholdVersions.length,
  thresholdValueReviewPackets: riskWorkbench.payload.riskThresholdGovernance.valueReviewPackets.length
});

const thresholdDecisionId = `decision_threshold_api_smoke_${Date.now()}`;
const thresholdDecision = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: thresholdDecisionId,
    insightTitle: "API smoke threshold governance review",
    linkedMetricId: "risk_threshold.THR-INV-NEG-AVAILABLE-V0.1",
    recommendation: "Record threshold governance approval for local review only.",
    actionBoundary: "threshold_governance_local_review_only_no_operational_scoring",
    status: "approved_for_governance_view",
    reviewNote: "API smoke threshold review.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(thresholdDecision?.status === "approved_for_governance_view", "threshold review must write local decision receipt");
checked("risk-threshold-governance", {
  thresholdVersions: thresholdGovernance.thresholdVersions.length,
  scenarioBindings: thresholdGovernance.scenarioBindings.length,
  decisionId: thresholdDecision.id,
  boundary: thresholdDecision.action_boundary
});

const thresholdOwnerDecisionId = `decision_threshold_owner_api_smoke_${Date.now()}`;
const thresholdOwnerDecision = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: thresholdOwnerDecisionId,
    insightTitle: "API smoke threshold owner choice",
    linkedMetricId: "risk_threshold_owner.threshold_policy_scope",
    recommendation: "Record threshold owner choice A for local governance view only.",
    actionBoundary: "threshold_owner_choice_local_ledger_only_no_operational_scoring",
    status: "threshold_policy_draft_only",
    reviewNote: "API smoke threshold owner choice; operationalScoring=false; businessRowsImported=false.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(thresholdOwnerDecision?.status === "threshold_policy_draft_only", "threshold owner choice must write local decision receipt");
checked("risk-threshold-owner-choice-pack", {
  ownerDecisionPackets: thresholdGovernance.ownerDecisionPackets.length,
  recommendedPath: thresholdGovernance.policySummary.recommendedPath,
  decisionId: thresholdOwnerDecision.id,
  operationalScoring: thresholdGovernance.policySummary.boundary.operationalScoring
});

const thresholdValueDecisionId = `decision_threshold_value_api_smoke_${Date.now()}`;
const thresholdValueDecision = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: thresholdValueDecisionId,
    insightTitle: "API smoke threshold value review",
    linkedMetricId: "risk_threshold_value.THR-INV-NEG-AVAILABLE-V0.1",
    recommendation: "Record threshold value owner review baseline for local governance only.",
    actionBoundary: "threshold_value_review_local_only_no_scoring",
    status: "value_review_baseline_only",
    reviewNote: "API smoke threshold value review; thresholdValuesApproved=false; operationalScoring=false; businessRowsImported=false.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(thresholdValueDecision?.status === "value_review_baseline_only", "threshold value review must write local decision receipt");
checked("risk-threshold-value-review-pack", {
  valueReviewPackets: thresholdGovernance.valueReviewPackets.length,
  recommendedPath: thresholdGovernance.valueReviewSummary.recommendedPath,
  decisionId: thresholdValueDecision.id,
  thresholdValuesApproved: thresholdGovernance.valueReviewSummary.boundary.thresholdValuesApproved,
  formalApprovalReceiptCount: thresholdGovernance.valueReviewSummary.formalApprovalReceiptCount
});

const sourceCoverageLineage = (await request("/api/source-coverage/lineage")).payload;
assert(Array.isArray(sourceCoverageLineage) && sourceCoverageLineage.length === sourceCoverage.length, "source coverage lineage must return one lineage row per source coverage row");
assert(sourceCoverageLineage.every((item) => item.import_gate === "closed_until_owner_lineage_receipt"), "source coverage lineage must keep import gate closed");
assert(sourceCoverageLineage.some((item) => String(item.api_candidate || "").startsWith("oms.")), "source coverage lineage must expose OMS API candidates");
assert(sourceCoverageLineage.some((item) => String(item.api_candidate || "").startsWith("wms.")), "source coverage lineage must expose WMS API candidates");
checked("source-coverage-lineage", {
  total: sourceCoverageLineage.length,
  omsRows: sourceCoverageLineage.filter((item) => item.source_system === "OMS").length,
  wmsRows: sourceCoverageLineage.filter((item) => item.source_system === "WMS").length
});

const omsWmsUsagePolicy = (await request("/api/source-coverage/owner-usage-policy")).payload;
assert(omsWmsUsagePolicy.id === "OMS-WMS-USAGE-POLICY-PACK-A4", "OMS/WMS usage policy must expose the A4 policy pack id");
assert(Array.isArray(omsWmsUsagePolicy.reviewPackets) && omsWmsUsagePolicy.reviewPackets.length === 4, "OMS/WMS usage policy must expose four owner review packets");
assert(omsWmsUsagePolicy.summary?.recommendedPath === "A-A-A-A", "OMS/WMS usage policy must recommend A-A-A-A");
assert(omsWmsUsagePolicy.summary?.sourceCoverageRows === sourceCoverage.length, "OMS/WMS usage policy must match source coverage count");
assert(omsWmsUsagePolicy.summary?.lineageRows === sourceCoverageLineage.length, "OMS/WMS usage policy must match lineage count");
assert(omsWmsUsagePolicy.summary?.activeAllowlistFields === 62, "OMS/WMS usage policy must expose 62 allowlist fields");
assert(omsWmsUsagePolicy.summary?.excludedSensitiveIdentifierFields === 26, "OMS/WMS usage policy must keep 26 sensitive identifiers excluded");
assert(omsWmsUsagePolicy.boundary?.businessRowsImported === false, "OMS/WMS usage policy must not import business rows");
assert(omsWmsUsagePolicy.boundary?.runtimeImportAuthorized === false, "OMS/WMS usage policy must keep runtime import unauthorized");
assert(omsWmsUsagePolicy.boundary?.exportDownloadAutomation === false, "OMS/WMS usage policy must keep export/download automation disabled");
assert(omsWmsUsagePolicy.boundary?.omsWmsWriteback === false, "OMS/WMS usage policy must not write OMS/WMS");
const usagePolicyPacket = omsWmsUsagePolicy.reviewPackets.find((item) => item.id === "OMSWMS-USE-001");
assert(usagePolicyPacket?.choices?.[0]?.status === "usage_policy_metadata_only_accepted", "OMS/WMS usage policy must expose metadata-only A choice");
const usagePolicyDecisionId = `decision_omswms_use_001_api_smoke_${Date.now()}`;
const usagePolicyDecision = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: usagePolicyDecisionId,
    insightTitle: "OMSWMS-USE-001 Field usage policy - A",
    linkedMetricId: "oms_wms_usage_policy.field_usage_scope",
    recommendation: "Record A choice: metadata governance only.",
    actionBoundary: "oms_wms_field_usage_metadata_governance_only_no_business_rows",
    status: "usage_policy_metadata_only_accepted",
    reviewNote: "API smoke records OMS/WMS usage policy; businessRowsImported=false; runtimeImportAuthorized=false; exportDownloadAutomation=false.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(usagePolicyDecision?.status === "usage_policy_metadata_only_accepted", "OMS/WMS usage policy decision must write local receipt");
checked("omswms-owner-usage-policy-pack", {
  reviewPackets: omsWmsUsagePolicy.reviewPackets.length,
  recommendedPath: omsWmsUsagePolicy.summary.recommendedPath,
  decisionId: usagePolicyDecision.id,
  businessRowsImported: omsWmsUsagePolicy.boundary.businessRowsImported,
  runtimeImportAuthorized: omsWmsUsagePolicy.boundary.runtimeImportAuthorized
});

const scenarios = (await request("/api/aip-scenarios")).payload;
assert(Array.isArray(scenarios) && scenarios.length >= 3, "scenario endpoint must return three seeded scenarios");
checked("aip-scenarios", { count: scenarios.length });

const diagnostic = (await request("/api/aip-scenarios/scenario_fba_negative_available/run-diagnostic", {
  method: "POST",
  body: JSON.stringify({ createdBy: "api-smoke" })
})).payload;
assert(diagnostic.run?.run_type === "aip_scenario_diagnostic", "scenario diagnostic must create an AgentRun");
assert(diagnostic.trace?.source_type === "aip_scenario_diagnostic", "scenario diagnostic must create an AgentTrace");
checked("scenario-diagnostic", {
  runId: diagnostic.run.id,
  traceId: diagnostic.trace.id,
  boundary: diagnostic.boundary
});

const traceReview = (await request(`/api/agent-traces/${diagnostic.trace.id}/review`, {
  method: "POST",
  body: JSON.stringify({
    reviewStatus: "approved_for_governance_view",
    reviewer: "api-smoke",
    reviewNote: "API smoke approves this trace for local governance view only.",
    decisionBoundary: "trace_review_local_governance_only_no_provider_no_erp_writeback"
  })
})).payload;
assert(traceReview.review?.trace_id === diagnostic.trace.id, "trace review must bind to the diagnostic trace");
assert(traceReview.review.review_status === "approved_for_governance_view", "trace review must preserve review status");
assert(traceReview.reviewSummary?.policy === "local_trace_review_only_no_provider_call_no_erp_writeback", "trace review must expose no-writeback policy");
const traceReviews = (await request(`/api/trace-reviews?traceId=${encodeURIComponent(diagnostic.trace.id)}`)).payload;
assert(Array.isArray(traceReviews) && traceReviews.some((item) => item.id === traceReview.review.id), "trace review list must include the recorded review");
checked("agent-trace-review-governance", {
  traceId: diagnostic.trace.id,
  reviewId: traceReview.review.id,
  reviewStatus: traceReview.review.review_status,
  boundary: traceReview.review.decision_boundary
});

const matrixDiagnostics = [];
for (const scenario of scenarios) {
  const result = (await request(`/api/aip-scenarios/${encodeURIComponent(scenario.id)}/run-diagnostic`, {
    method: "POST",
    body: JSON.stringify({ createdBy: "api-smoke-matrix" })
  })).payload;
  assert(result.run?.run_type === "aip_scenario_diagnostic", `scenario ${scenario.id} must create a diagnostic run`);
  assert(result.trace?.source_type === "aip_scenario_diagnostic", `scenario ${scenario.id} must create a diagnostic trace`);
  matrixDiagnostics.push(result);
}
checked("scenario-matrix-diagnostics", {
  scenarioCount: scenarios.length,
  runCount: matrixDiagnostics.length,
  runIds: matrixDiagnostics.map((item) => item.run.id)
});

const recommendationId = `rec_api_smoke_${Date.now()}`;
const createdRecommendation = (await request("/api/recommendation-cards", {
  method: "POST",
  body: JSON.stringify({
    id: recommendationId,
    scenario: "API smoke recommendation closure",
    title: "API smoke recommendation workflow",
    targetObjectType: "InventoryBatch",
    targetObjectId: "batch_fba_negative_available",
    linkedMetricIds: ["metric.business_available_inventory", "metric.fba_available_inventory"],
    linkedKnowledgeCardIds: ["knowledge.fba_available_negative"],
    businessImpact: "Prove create, review, and convert are captured in the local governance ledger.",
    confidenceLevel: "smoke_checked",
    riskLevel: "P1",
    owner: "api-smoke",
    slaDueAt: "T+1",
    actionOptions: ["create local action task"],
    approvalStatus: "draft",
    executionStatus: "not_started",
    replayNote: "API smoke local ledger only."
  })
})).payload.recommendationCard;
assert(createdRecommendation?.id === recommendationId, "recommendation creation must return the requested id");
assert(createdRecommendation.approval_status === "draft", "new recommendation must start as draft");

const reviewedRecommendation = (await request(`/api/recommendation-cards/${recommendationId}/review`, {
  method: "POST",
  body: JSON.stringify({ approvalStatus: "approved", actor: "api-smoke", note: "approve for local conversion smoke" })
})).payload.recommendationCard;
assert(reviewedRecommendation?.approval_status === "approved", "recommendation review must update approval status");

const convertedRecommendation = (await request(`/api/recommendation-cards/${recommendationId}/convert-action-task`, {
  method: "POST",
  body: JSON.stringify({ owner: "api-smoke", actor: "api-smoke", actionName: "API smoke local action task" })
})).payload;
assert(convertedRecommendation.recommendationCard?.execution_status === "action_task_created", "recommendation conversion must update execution status");
assert(convertedRecommendation.actionTask?.id, "recommendation conversion must create an action task");
checked("recommendation-workflow", {
  recommendationId,
  approvalStatus: convertedRecommendation.recommendationCard.approval_status,
  executionStatus: convertedRecommendation.recommendationCard.execution_status,
  actionTaskId: convertedRecommendation.actionTask.id
});

const decisionId = `decision_api_smoke_${Date.now()}`;
const decisionLog = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: decisionId,
    insightTitle: "API smoke owner decision packet",
    linkedMetricId: "risk_threshold_pack",
    recommendation: "Record A choice for local governance only.",
    actionBoundary: "owner_decision_local_ledger_only_no_external_write",
    status: "approved_with_conditions",
    reviewNote: "API smoke decision log.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(decisionLog?.id === decisionId, "owner decision log must be written to local ledger");
checked("owner-decision-log", {
  decisionId,
  status: decisionLog.status,
  boundary: decisionLog.action_boundary
});

const seededDecisionLogs = (await request("/api/decision/logs")).payload;
const omsWmsDecisionIds = ["OMSWMS-001", "OMSWMS-002", "OMSWMS-003", "OMSWMS-004"];
const runtimeImportDecisionIds = ["RUNTIME-IMPORT-001", "RUNTIME-IMPORT-002", "RUNTIME-IMPORT-003"];
for (const id of omsWmsDecisionIds) {
  const log = seededDecisionLogs.find((item) => item.id === id);
  assert(log, `${id} decision gate must be seeded`);
  assert(log.status === "owner_pending", `${id} must start owner_pending`);
  assert(String(log.action_boundary || "").includes("no_") || String(log.action_boundary || "").includes("required"), `${id} must carry a bounded action policy`);
}
for (const id of runtimeImportDecisionIds) {
  const log = seededDecisionLogs.find((item) => item.id === id);
  assert(log, `${id} decision gate must be seeded`);
  assert(log.status === "owner_pending", `${id} must start owner_pending`);
  assert(String(log.action_boundary || "").includes("no_") || String(log.action_boundary || "").includes("only"), `${id} must carry a bounded action policy`);
}

const omsWmsDecisionRecordId = `decision_omswms_001_api_smoke_${Date.now()}`;
const omsWmsDecisionLog = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: omsWmsDecisionRecordId,
    insightTitle: "OMSWMS-001 Source coverage object gate - A",
    linkedMetricId: "oms_wms_source_coverage_objects",
    recommendation: "Record A choice: governance view only.",
    actionBoundary: "source_coverage_governance_view_only_no_import",
    status: "approved_for_governance_view",
    reviewNote: "API smoke records the staged owner gate; runtime import remains disabled.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(omsWmsDecisionLog?.id === omsWmsDecisionRecordId, "OMSWMS staged decision must be recorded");
assert(omsWmsDecisionLog.status === "approved_for_governance_view", "OMSWMS staged decision must preserve status");
checked("omswms-owner-decision-gates", {
  seeded: omsWmsDecisionIds.length,
  recordedDecisionId: omsWmsDecisionRecordId,
  boundary: omsWmsDecisionLog.action_boundary
});

const receiptSummary = (await request("/api/decision/receipt-summary")).payload;
assert(receiptSummary.summary?.packetCount === 7, "receipt summary must track four OMS/WMS packets and three runtime import packets");
assert(receiptSummary.summary?.sourceCoverageRows >= 10, "receipt summary must include source coverage row count");
assert(receiptSummary.summary?.runtimeClosedRows === receiptSummary.summary.sourceCoverageRows, "receipt summary must show runtime import gated for every source row");
assert(receiptSummary.packets?.some((item) => item.packetId === "OMSWMS-001" && item.latestDecisionId), "receipt summary must link the recorded OMSWMS-001 decision");
assert(receiptSummary.packets?.some((item) => item.packetId === "RUNTIME-IMPORT-001"), "receipt summary must expose runtime import scope gate");
checked("decision-receipt-summary", {
  packetCount: receiptSummary.summary.packetCount,
  receiptCount: receiptSummary.summary.receiptCount,
  runtimeClosedRows: receiptSummary.summary.runtimeClosedRows
});

const runtimeProjection = (await request("/api/runtime-import/metadata-projection")).payload;
assert(runtimeProjection.owner_choice === "A-A-A", "runtime metadata projection must preserve owner A-A-A choice");
assert(runtimeProjection.summary?.runtime_projection_candidate_fields === 88, "runtime metadata projection must retain 88 candidate fields");
assert(runtimeProjection.summary?.active_allowlist_fields === 62, "runtime metadata projection allowlist must include 62 fields");
assert(runtimeProjection.summary?.excluded_sensitive_identifier_fields === 26, "runtime metadata projection must exclude 26 sensitive identifier fields");
assert(runtimeProjection.summary?.business_rows_included === false, "runtime metadata projection must not include business rows");
checked("runtime-metadata-projection", {
  ownerChoice: runtimeProjection.owner_choice,
  candidateFields: runtimeProjection.summary.runtime_projection_candidate_fields,
  allowlistFields: runtimeProjection.summary.active_allowlist_fields,
  excludedSensitiveFields: runtimeProjection.summary.excluded_sensitive_identifier_fields
});

const runtimeBusinessGate = (await request("/api/runtime-import/business-row-design-gate")).payload;
assert(runtimeBusinessGate.id === "RUNTIME-BUSINESS-ROW-DESIGN-GATE-A5", "runtime business row design gate must expose the A5 gate id");
assert(runtimeBusinessGate.summary?.recommendedPath === "A-A-A-A-A", "runtime business row design gate must recommend A-A-A-A-A");
assert(runtimeBusinessGate.summary?.reviewPacketCount === 5, "runtime business row design gate must expose five design packets");
assert(runtimeBusinessGate.summary?.sourceCoverageRows === sourceCoverage.length, "runtime business row design gate must match source coverage rows");
assert(runtimeBusinessGate.summary?.lineageRows === sourceCoverageLineage.length, "runtime business row design gate must match lineage rows");
assert(runtimeBusinessGate.summary?.activeAllowlistFields === 62, "runtime business row design gate must retain 62 active allowlist fields");
assert(runtimeBusinessGate.summary?.excludedSensitiveIdentifierFields === 26, "runtime business row design gate must retain 26 excluded sensitive identifier fields");
assert(runtimeBusinessGate.summary?.boundary?.sourceSystemReads === false, "runtime business row design gate must not read source systems");
assert(runtimeBusinessGate.summary?.boundary?.businessRowsImported === false, "runtime business row design gate must not import business rows");
assert(runtimeBusinessGate.summary?.boundary?.sampleRowsExtracted === false, "runtime business row design gate must not extract sample rows");
assert(runtimeBusinessGate.summary?.boundary?.runtimeImportAuthorized === false, "runtime business row design gate must keep runtime import unauthorized");
assert(runtimeBusinessGate.summary?.boundary?.productionWrites === false, "runtime business row design gate must keep production writes disabled");
assert(runtimeBusinessGate.summary?.boundary?.omsWmsWriteback === false, "runtime business row design gate must keep OMS/WMS writeback disabled");
assert(runtimeBusinessGate.summary?.boundary?.rawSensitiveIdentifiersAllowed === false, "runtime business row design gate must keep raw sensitive identifiers closed");
assert(runtimeBusinessGate.reviewPackets?.[0]?.choices?.[0]?.status === "runtime_row_design_contract_only", "runtime business row first A choice must stay design-contract only");
const runtimeBusinessDecisionId = `decision_runtime_biz_001_api_smoke_${Date.now()}`;
const runtimeBusinessDecisionLog = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: runtimeBusinessDecisionId,
    insightTitle: "RUNTIME-BIZ-001 Grain and source contract - A",
    linkedMetricId: "runtime_business_row_design.grain_and_source_contract",
    recommendation: "Record A choice: design contract only.",
    actionBoundary: "runtime_business_row_design_contract_only_no_source_read_no_row_import",
    status: "runtime_row_design_contract_only",
    reviewNote: "API smoke records design gate only; sourceSystemReads=false; businessRowsImported=false; sampleRowsExtracted=false; productionWrites=false.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(runtimeBusinessDecisionLog?.id === runtimeBusinessDecisionId, "runtime business row design decision must be written to local decision ledger");
assert(runtimeBusinessDecisionLog.status === "runtime_row_design_contract_only", "runtime business row design decision must preserve design-only status");
checked("runtime-business-row-design-gate", {
  gateId: runtimeBusinessGate.id,
  reviewPackets: runtimeBusinessGate.summary.reviewPacketCount,
  recommendedPath: runtimeBusinessGate.summary.recommendedPath,
  recordedDecisionId: runtimeBusinessDecisionId,
  sourceSystemReads: runtimeBusinessGate.summary.boundary.sourceSystemReads,
  businessRowsImported: runtimeBusinessGate.summary.boundary.businessRowsImported
});

const modules = (await request("/api/workbench/modules")).payload;
assert(modules.some((item) => item.id === "role-workbenches"), "workbench modules must include role-workbenches");
const roleWorkbench = (await request("/api/workbench/role-workbenches")).payload;
assert(roleWorkbench.id === "role-workbenches", "role-workbenches endpoint must resolve module");
assert(roleWorkbench.payload?.roles?.length === 6, "role-workbenches must expose six role workbenches");
assert(roleWorkbench.payload?.boundary?.providerCalls === false, "role-workbenches must keep provider calls disabled");
assert(roleWorkbench.payload?.boundary?.erpWriteback === false, "role-workbenches must keep ERP writeback disabled");
const roleReviewId = `decision_role_planning_api_smoke_${Date.now()}`;
const roleReview = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: roleReviewId,
    insightTitle: "计划员工作台 - API smoke role review",
    linkedMetricId: "role_workbench.planning",
    recommendation: "Record role workbench review locally only.",
    actionBoundary: "role_workbench_local_review_only_no_external_write",
    status: "approved_for_governance_view",
    reviewNote: "API smoke records role review without external writeback.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(roleReview?.id === roleReviewId, "role workbench review must be written to local decision ledger");
assert(roleReview.action_boundary === "role_workbench_local_review_only_no_external_write", "role review boundary must remain local only");
checked("role-workbenches-governance", {
  roles: roleWorkbench.payload.roles.length,
  reviewId: roleReview.id,
  boundary: roleReview.action_boundary
});

const financeCostGovernance = (await request("/api/finance-cost-governance")).payload;
assert(Array.isArray(financeCostGovernance.evidencePackets) && financeCostGovernance.evidencePackets.length >= 4, "finance cost governance must expose evidence packets");
assert(Array.isArray(financeCostGovernance.financeCoverage) && financeCostGovernance.financeCoverage.length >= 1, "finance cost governance must expose finance coverage");
assert(Array.isArray(financeCostGovernance.ownerDecisionPackets) && financeCostGovernance.ownerDecisionPackets.length === 4, "finance cost governance must expose four owner choice packets");
assert(financeCostGovernance.policySummary?.ownerChoice === "A-A-A-A", "finance cost policy summary must expose recorded A-A-A-A owner choice");
assert(financeCostGovernance.policySummary?.receiptCount >= 4, "finance cost policy summary must include four formal owner receipts");
assert(financeCostGovernance.policySummary?.boundary?.billDrilldown === false, "finance cost policy summary must keep bill drilldown closed");
assert(financeCostGovernance.policySummary?.boundary?.transactionDetailImport === false, "finance cost policy summary must keep transaction detail import closed");
assert(financeCostGovernance.boundary?.billDrilldown === false, "finance cost governance must keep bill drilldown disabled");
assert(financeCostGovernance.boundary?.transactionDetailImport === false, "finance cost governance must keep transaction detail import disabled");
const financeDecisionId = `decision_finance_api_smoke_${Date.now()}`;
const financeReview = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: financeDecisionId,
    insightTitle: "API smoke finance cost review",
    linkedMetricId: "finance_cost.FCOST-OMS-FEE-STATS",
    recommendation: "Record finance cost governance review locally only.",
    actionBoundary: "finance_cost_governance_local_review_only_no_external_write",
    status: "approved_for_governance_view",
    reviewNote: "API smoke records finance cost review without bill drilldown.",
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(financeReview?.status === "approved_for_governance_view", "finance cost review must write local receipt");
const financeOwnerChoice = financeCostGovernance.ownerDecisionPackets.find((packet) => packet.id === "FIN-OWNER-001");
assert(financeOwnerChoice?.choices?.[0]?.status === "approved_cost_type_mapping", "finance owner choice packet must expose A/B/C statuses");
const financeOwnerDecisionId = `decision_finance_owner_api_smoke_${Date.now()}`;
const financeOwnerReview = (await request("/api/decision/logs", {
  method: "POST",
  body: JSON.stringify({
    id: financeOwnerDecisionId,
    insightTitle: "API smoke finance owner choice",
    linkedMetricId: financeOwnerChoice.linkedMetricId,
    recommendation: "Record finance owner choice pack smoke locally only.",
    actionBoundary: financeOwnerChoice.actionBoundary,
    status: financeOwnerChoice.choices[0].status,
    reviewNote: `${financeOwnerChoice.choices[0].reviewNote} Smoke receipt; billDrilldown=false; transactionDetailImport=false.`,
    actor: "api-smoke"
  })
})).payload.decisionLog;
assert(financeOwnerReview?.status === "approved_cost_type_mapping", "finance owner choice must write local receipt");
checked("finance-cost-governance", {
  evidencePackets: financeCostGovernance.evidencePackets.length,
  financeCoverage: financeCostGovernance.financeCoverage.length,
  ownerDecisionPackets: financeCostGovernance.ownerDecisionPackets.length,
  ownerChoice: financeCostGovernance.policySummary.ownerChoice,
  policyReceiptCount: financeCostGovernance.policySummary.receiptCount,
  reviewId: financeReview.id,
  ownerChoiceReviewId: financeOwnerReview.id,
  boundary: financeReview.action_boundary
});

const overview = (await request("/api/governance/overview")).payload;
assert(Array.isArray(overview.riskQueue) && overview.riskQueue.length >= 3, "overview risk queue must include seeded scenarios");
assert(overview.objectInstanceSummary?.total >= 10, "overview object instance summary must be present");
checked("overview-command-center", {
  riskQueue: overview.riskQueue.length,
  recommendationQueue: overview.recommendationQueue?.length || 0
});

const exportMatrixAssets = [
  { assetType: "aip_scenarios", minimumRows: 3 },
  { assetType: "metrics", minimumRows: 100 },
  { assetType: "recommendation_cards", minimumRows: 3 },
  { assetType: "trace_reviews", minimumRows: 1 },
  { assetType: "decision_logs", minimumRows: 1 },
  { assetType: "source_coverage", minimumRows: 10 },
  { assetType: "source_coverage_lineage", minimumRows: 10 },
  { assetType: "runtime_metadata_projection", minimumRows: 88 }
];
const exportFormats = ["json", "csv", "excel"];
const exportMatrix = [];
for (const item of exportMatrixAssets) {
  for (const format of exportFormats) {
    exportMatrix.push(await verifyExport(item.assetType, format, item.minimumRows));
  }
}
checked("export-format-matrix", {
  assets: exportMatrixAssets.map((item) => item.assetType),
  formats: exportFormats,
  checks: exportMatrix.length
});

console.log(JSON.stringify(summary, null, 2));
