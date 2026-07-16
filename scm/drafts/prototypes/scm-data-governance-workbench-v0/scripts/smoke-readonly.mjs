import { countWorkstationHomePaths } from "./workstation-paths.mjs";

const port = process.env.PORT || "5174";
const baseUrl = process.env.SCM_WORKBENCH_READONLY_BASE_URL
  || process.env.SCM_WORKBENCH_BASE_URL
  || `http://127.0.0.1:${port}`;

const summary = {
  baseUrl,
  boundary: {
    productionWrites: false,
    providerCalls: false,
    erpWriteback: false,
    localSqliteWrites: false,
    methods: ["GET", "HEAD"]
  },
  checks: []
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checked(name, payload = {}) {
  summary.checks.push({ name, ...payload });
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: init.signal || AbortSignal.timeout(Number(process.env.SCM_SMOKE_REQUEST_TIMEOUT_MS || 10000))
  });
  const contentType = response.headers.get("content-type") || "";
  let payload = null;
  if (init.method !== "HEAD") {
    payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  }
  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} returned ${response.status}`);
  }
  return { response, payload, contentType };
}

const health = (await request("/api/deploy/health")).payload;
assert(health.ok === true, "deploy health must be ok");
assert(health.boundary?.productionWrites === false, "productionWrites boundary must be false");
assert(health.boundary?.databaseWrites === false, "databaseWrites boundary must be false");
assert(health.boundary?.databaseWriteAuthorized === false, "databaseWriteAuthorized boundary must be false");
assert(health.boundary?.providerCalls === false, "providerCalls boundary must be false");
assert(health.boundary?.erpWriteback === false, "erpWriteback boundary must be false");
assert(health.database?.path === "data/governance_workbench.sqlite", "deploy health must expose a portable database path");
assert(countWorkstationHomePaths(JSON.stringify(health)) === 0, "deploy health must not expose a developer home path");
checked("deploy-health-readonly", {
  staticBuild: health.staticBuild,
  metrics: health.database?.metrics,
  aipScenarios: health.database?.aipScenarios,
  boundary: health.boundary
});

const modules = (await request("/api/workbench/modules")).payload;
assert(Array.isArray(modules) && modules.length >= 10, "workbench modules must be readable");
for (const id of ["overview", "strategy-panorama", "current-risk-radar", "decision-loop"]) {
  assert(modules.some((item) => item.id === id), `module ${id} must be present`);
}
checked("modules-readonly", { count: modules.length });

const overview = (await request("/api/governance/overview")).payload;
assert(overview.counts?.metrics >= 100, "overview must include metric counts");
assert(Array.isArray(overview.riskQueue), "overview risk queue must be readable");
checked("overview-readonly", {
  metrics: overview.counts.metrics,
  riskQueue: overview.riskQueue.length,
  recommendations: overview.counts.recommendationCards
});

const aiKnowledgeQuality = (await request("/api/knowledge/evidence-quality-review")).payload;
assert(Array.isArray(aiKnowledgeQuality.reviewPackets) && aiKnowledgeQuality.reviewPackets.length === 4, "AI knowledge quality review must expose four domain packets");
assert(aiKnowledgeQuality.summary?.recommendedPath === "A-A-A-A", "AI knowledge quality review must expose A-A-A-A recommendation");
assert(aiKnowledgeQuality.summary?.activeAnswerableProbes === 9, "AI knowledge quality review must expose nine active answerable probes");
assert(aiKnowledgeQuality.summary?.candidateOnlyProbes === 3, "AI knowledge quality review must expose three candidate-only probes");
assert(aiKnowledgeQuality.summary?.boundary?.providerCalls === false, "AI knowledge quality review must keep provider calls closed");
assert(aiKnowledgeQuality.summary?.boundary?.productionWrites === false, "AI knowledge quality review must keep production writes closed");
assert(aiKnowledgeQuality.summary?.boundary?.draftDomainPromoted === false, "AI knowledge quality review must keep draft domain promotion closed");
assert(!String(aiKnowledgeQuality.sourcePath || "").startsWith("/"), "AI knowledge evidence source path must be portable");
assert(countWorkstationHomePaths(JSON.stringify(aiKnowledgeQuality)) === 0, "AI knowledge evidence response must not expose a developer home path");
checked("ai-knowledge-quality-review-readonly", {
  reviewPackets: aiKnowledgeQuality.reviewPackets.length,
  recommendedPath: aiKnowledgeQuality.summary.recommendedPath,
  activeAnswerableProbes: aiKnowledgeQuality.summary.activeAnswerableProbes,
  candidateOnlyProbes: aiKnowledgeQuality.summary.candidateOnlyProbes,
  providerCalls: aiKnowledgeQuality.summary.boundary.providerCalls,
  draftDomainPromoted: aiKnowledgeQuality.summary.boundary.draftDomainPromoted
});

const strategy = (await request("/api/workbench/strategy-panorama")).payload;
assert(Array.isArray(strategy.payload?.metrics), "strategy workbench must expose metrics array");
assert(Array.isArray(strategy.payload?.scenarios), "strategy workbench must expose scenarios array");
checked("strategy-panorama-readonly", {
  metrics: strategy.payload.metrics.length,
  scenarios: strategy.payload.scenarios.length
});

const risk = (await request("/api/workbench/current-risk-radar")).payload;
assert(Array.isArray(risk.payload?.instances), "risk workbench must expose object instances");
assert(Array.isArray(risk.payload?.recommendations), "risk workbench must expose recommendation cards");
assert(Array.isArray(risk.payload?.sourceCoverage), "risk workbench must expose source coverage");
assert(Array.isArray(risk.payload?.riskThresholdGovernance?.thresholdVersions), "risk workbench must expose threshold governance");
assert(Array.isArray(risk.payload?.riskThresholdGovernance?.valueReviewPackets), "risk workbench must expose threshold value review packets");
checked("current-risk-radar-readonly", {
  instances: risk.payload.instances.length,
  recommendations: risk.payload.recommendations.length,
  sourceCoverage: risk.payload.sourceCoverage.length,
  thresholdVersions: risk.payload.riskThresholdGovernance.thresholdVersions.length,
  thresholdValueReviewPackets: risk.payload.riskThresholdGovernance.valueReviewPackets.length
});

const thresholdGovernance = (await request("/api/risk-threshold-governance")).payload;
assert(Array.isArray(thresholdGovernance.thresholdVersions) && thresholdGovernance.thresholdVersions.length >= 5, "threshold governance must expose draft versions");
assert(Array.isArray(thresholdGovernance.ownerDecisionPackets) && thresholdGovernance.ownerDecisionPackets.length === 3, "threshold governance must expose owner choice pack");
assert(Array.isArray(thresholdGovernance.valueReviewPackets) && thresholdGovernance.valueReviewPackets.length === 5, "threshold governance must expose threshold value review pack");
assert(
  thresholdGovernance.thresholdVersions.every((threshold) => threshold.sourceEvidence?.length === threshold.evidenceRefs?.length),
  "every threshold evidence ref must resolve to a source-coverage row"
);
assert(thresholdGovernance.policySummary?.recommendedPath === "A-A-A", "threshold policy summary must expose A-A-A recommendation");
assert(thresholdGovernance.valueReviewSummary?.recommendedPath === "A-A-A-A-A", "threshold value summary must expose A-A-A-A-A recommendation");
assert(thresholdGovernance.boundary?.operationalScoring === false, "threshold governance must keep scoring disabled");
assert(thresholdGovernance.policySummary?.boundary?.businessRowsImported === false, "threshold policy summary must keep business rows out");
assert(thresholdGovernance.policySummary?.boundary?.thresholdValuesApproved === false, "threshold policy summary must keep values owner-pending");
assert(thresholdGovernance.valueReviewSummary?.boundary?.businessRowsImported === false, "threshold value summary must keep business rows out");
assert(thresholdGovernance.valueReviewSummary?.boundary?.thresholdValuesApproved === false, "threshold value summary must keep values unapproved");
assert(thresholdGovernance.valueReviewSummary?.formalApprovalReceiptCount === 0, "threshold value summary must have zero formal approvals");
checked("risk-threshold-governance-readonly", {
  thresholdVersions: thresholdGovernance.thresholdVersions.length,
  scenarioBindings: thresholdGovernance.scenarioBindings?.length,
  ownerDecisionPackets: thresholdGovernance.ownerDecisionPackets.length,
  valueReviewPackets: thresholdGovernance.valueReviewPackets.length,
  recommendedPath: thresholdGovernance.policySummary.recommendedPath,
  valueReviewRecommendedPath: thresholdGovernance.valueReviewSummary.recommendedPath,
  operationalScoring: thresholdGovernance.boundary?.operationalScoring,
  thresholdValuesApproved: thresholdGovernance.valueReviewSummary.boundary.thresholdValuesApproved
});

const financeCostGovernance = (await request("/api/finance-cost-governance")).payload;
assert(Array.isArray(financeCostGovernance.evidencePackets) && financeCostGovernance.evidencePackets.length >= 4, "finance cost governance must expose evidence packets");
assert(Array.isArray(financeCostGovernance.ownerDecisionPackets) && financeCostGovernance.ownerDecisionPackets.length === 4, "finance cost governance must expose four owner choice packets");
assert(financeCostGovernance.policySummary?.ownerChoice === "A-A-A-A", "finance cost policy summary must expose recorded A-A-A-A owner choice");
assert(financeCostGovernance.policySummary?.receiptCount >= 4, "finance cost policy summary must include owner receipts");
assert(financeCostGovernance.policySummary?.boundary?.billDrilldown === false, "finance cost policy summary must keep bill drilldown closed");
assert(financeCostGovernance.policySummary?.boundary?.transactionDetailImport === false, "finance cost policy summary must keep transaction detail import closed");
assert(financeCostGovernance.boundary?.billDrilldown === false, "finance cost governance must keep bill drilldown disabled");
assert(financeCostGovernance.boundary?.transactionDetailImport === false, "finance cost governance must keep transaction detail import disabled");
checked("finance-cost-governance-readonly", {
  evidencePackets: financeCostGovernance.evidencePackets.length,
  ownerDecisionPackets: financeCostGovernance.ownerDecisionPackets.length,
  ownerChoice: financeCostGovernance.policySummary.ownerChoice,
  policyReceiptCount: financeCostGovernance.policySummary.receiptCount,
  financeCoverage: financeCostGovernance.financeCoverage?.length,
  costThresholds: financeCostGovernance.costThresholds?.length,
  billDrilldown: financeCostGovernance.boundary?.billDrilldown
});

const sourceCoverage = (await request("/api/source-coverage")).payload;
assert(Array.isArray(sourceCoverage) && sourceCoverage.length >= 10, "source coverage must be readable");
assert(sourceCoverage.every((item) => item.runtime_status === "not_authorized_for_import"), "source coverage must keep runtime import gated");
checked("source-coverage-readonly", {
  rows: sourceCoverage.length,
  runtimeStatus: "not_authorized_for_import"
});

const sourceCoverageLineage = (await request("/api/source-coverage/lineage")).payload;
assert(Array.isArray(sourceCoverageLineage) && sourceCoverageLineage.length === sourceCoverage.length, "source coverage lineage must match source coverage rows");
assert(sourceCoverageLineage.every((item) => item.import_gate === "closed_until_owner_lineage_receipt"), "source coverage lineage must keep import gate closed");
checked("source-coverage-lineage-readonly", {
  rows: sourceCoverageLineage.length,
  omsRows: sourceCoverageLineage.filter((item) => item.source_system === "OMS").length,
  wmsRows: sourceCoverageLineage.filter((item) => item.source_system === "WMS").length
});

const omsWmsUsagePolicy = (await request("/api/source-coverage/owner-usage-policy")).payload;
assert(Array.isArray(omsWmsUsagePolicy.reviewPackets) && omsWmsUsagePolicy.reviewPackets.length === 4, "OMS/WMS usage policy must be readable");
assert(omsWmsUsagePolicy.summary?.recommendedPath === "A-A-A-A", "OMS/WMS usage policy must expose recommended A-A-A-A path");
assert(omsWmsUsagePolicy.summary?.sourceCoverageRows === sourceCoverage.length, "OMS/WMS usage policy must match source coverage rows");
assert(omsWmsUsagePolicy.summary?.lineageRows === sourceCoverageLineage.length, "OMS/WMS usage policy must match source lineage rows");
assert(omsWmsUsagePolicy.boundary?.businessRowsImported === false, "OMS/WMS usage policy must not import business rows");
assert(omsWmsUsagePolicy.boundary?.runtimeImportAuthorized === false, "OMS/WMS usage policy must keep runtime import unauthorized");
assert(omsWmsUsagePolicy.boundary?.exportDownloadAutomation === false, "OMS/WMS usage policy must keep export automation disabled");
assert(omsWmsUsagePolicy.boundary?.sensitiveRawIdentifiersAllowed === false, "OMS/WMS usage policy must not allow raw sensitive identifiers");
checked("omswms-owner-usage-policy-readonly", {
  reviewPackets: omsWmsUsagePolicy.reviewPackets.length,
  recommendedPath: omsWmsUsagePolicy.summary.recommendedPath,
  sourceCoverageRows: omsWmsUsagePolicy.summary.sourceCoverageRows,
  lineageRows: omsWmsUsagePolicy.summary.lineageRows,
  businessRowsImported: omsWmsUsagePolicy.boundary.businessRowsImported
});

const receiptSummary = (await request("/api/decision/receipt-summary")).payload;
assert(receiptSummary.summary?.packetCount === 7, "receipt summary must expose four OMS/WMS decision packets and three runtime import packets");
assert(receiptSummary.summary?.runtimeClosedRows === receiptSummary.summary?.sourceCoverageRows, "receipt summary must keep source coverage runtime gate closed");
checked("decision-receipt-summary-readonly", {
  packetCount: receiptSummary.summary.packetCount,
  receiptCount: receiptSummary.summary.receiptCount,
  runtimeClosedRows: receiptSummary.summary.runtimeClosedRows
});

const runtimeProjection = (await request("/api/runtime-import/metadata-projection")).payload;
assert(runtimeProjection.owner_choice === "A-A-A", "runtime metadata projection must expose A-A-A choice");
assert(runtimeProjection.summary?.active_allowlist_fields === 62, "runtime metadata projection must expose 62 active allowlist fields");
assert(runtimeProjection.summary?.excluded_sensitive_identifier_fields === 26, "runtime metadata projection must keep 26 sensitive identifier fields excluded");
assert(runtimeProjection.summary?.business_rows_included === false, "runtime metadata projection must remain metadata-only");
checked("runtime-metadata-projection-readonly", {
  ownerChoice: runtimeProjection.owner_choice,
  candidateFields: runtimeProjection.summary.runtime_projection_candidate_fields,
  allowlistFields: runtimeProjection.summary.active_allowlist_fields,
  excludedSensitiveFields: runtimeProjection.summary.excluded_sensitive_identifier_fields
});

const runtimeBusinessGate = (await request("/api/runtime-import/business-row-design-gate")).payload;
assert(runtimeBusinessGate.id === "RUNTIME-BUSINESS-ROW-DESIGN-GATE-A5", "runtime business row design gate must expose A5 id");
assert(runtimeBusinessGate.summary?.recommendedPath === "A-A-A-A-A", "runtime business row design gate must expose A-A-A-A-A recommendation");
assert(runtimeBusinessGate.summary?.reviewPacketCount === 5, "runtime business row design gate must expose five design packets");
assert(runtimeBusinessGate.summary?.sourceCoverageRows === sourceCoverage.length, "runtime business row design gate must match source coverage rows");
assert(runtimeBusinessGate.summary?.lineageRows === sourceCoverageLineage.length, "runtime business row design gate must match lineage rows");
assert(runtimeBusinessGate.summary?.activeAllowlistFields === 62, "runtime business row design gate must expose 62 active allowlist fields");
assert(runtimeBusinessGate.summary?.excludedSensitiveIdentifierFields === 26, "runtime business row design gate must keep 26 sensitive identifier fields excluded");
assert(runtimeBusinessGate.summary?.boundary?.sourceSystemReads === false, "runtime business row design gate must keep source reads disabled");
assert(runtimeBusinessGate.summary?.boundary?.businessRowsImported === false, "runtime business row design gate must keep business row import disabled");
assert(runtimeBusinessGate.summary?.boundary?.sampleRowsExtracted === false, "runtime business row design gate must keep sample extraction disabled");
assert(runtimeBusinessGate.summary?.boundary?.runtimeImportAuthorized === false, "runtime business row design gate must keep runtime import unauthorized");
assert(runtimeBusinessGate.summary?.boundary?.productionWrites === false, "runtime business row design gate must keep production writes disabled");
assert(runtimeBusinessGate.summary?.boundary?.omsWmsWriteback === false, "runtime business row design gate must keep OMS/WMS writeback disabled");
assert(runtimeBusinessGate.summary?.boundary?.rawSensitiveIdentifiersAllowed === false, "runtime business row design gate must keep raw sensitive identifiers disabled");
checked("runtime-business-row-design-readonly", {
  gateId: runtimeBusinessGate.id,
  reviewPackets: runtimeBusinessGate.summary.reviewPacketCount,
  recommendedPath: runtimeBusinessGate.summary.recommendedPath,
  sourceSystemReads: runtimeBusinessGate.summary.boundary.sourceSystemReads,
  businessRowsImported: runtimeBusinessGate.summary.boundary.businessRowsImported
});

const scenarios = (await request("/api/aip-scenarios")).payload;
assert(Array.isArray(scenarios) && scenarios.length >= 3, "AIP scenarios must be readable");
checked("aip-scenarios-readonly", { count: scenarios.length });

const recommendations = (await request("/api/recommendation-cards")).payload;
assert(Array.isArray(recommendations), "recommendation cards must be readable");
checked("recommendations-readonly", { count: recommendations.length });

const appShell = await request("/");
assert(appShell.contentType.includes("text/html"), "app shell must return html");
assert(String(appShell.payload).includes("src=\"/assets/") || String(appShell.payload).includes("src=\"assets/"), "app shell must reference built assets");
checked("app-shell-readonly", { contentType: appShell.contentType });

console.log(JSON.stringify(summary, null, 2));
