import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const kbRoot = resolve(__dirname, "..");
const repoRoot = resolve(kbRoot, "../../../..");
const at = (value) => resolve(kbRoot, value);
const paths = {
  cards: at("manifests/knowledge-card-manifest.json"),
  seeds: resolve(__dirname, "crosswalk-seeds.json"),
  ownerReview: resolve(__dirname, "owner-review-decisions.json"),
  database: resolve(repoRoot, "scm/drafts/prototypes/scm-data-governance-workbench-v0/data/governance_workbench.sqlite")
};
const expectedDatabaseHash = "3d972e46ec43a64ad69265f295af4ffd9039dfe721a0e9f7f22d02e9b7652af7";
const baseCommit = "e99f7089791b31891a7b5bb9cc352f161852c8e3";
const crosswalkPrefix = "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/07-scm-crosswalk/";
const generatedArtifactPaths = [
  "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/07-scm-crosswalk/01-candidate-crosswalk-review.md",
  "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/manifests/m3a-scm-crosswalk-candidates.json",
  "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/manifests/m3a-scm-crosswalk-quality-report.json"
].sort();
const generatedArtifactPathSet = new Set(generatedArtifactPaths);
const allowedExactPaths = new Set([
  ...generatedArtifactPaths,
  "scm/drafts/analysis/ontology-driven-ai-data-management-kb-ingestion-plan-draft-20260718.md"
]);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileHash = (path) => sha256(readFileSync(path));
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const keyOf = (target) => `${target.scm_target_type}:${target.scm_target_id}`;
const edgeKeyOf = (cardId, target) => `${cardId}|${target.scm_target_type}|${target.scm_target_id}`;
const duplicateValues = (values) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))].sort();
const expectedReviewer = "owner-delegated-codex";
const expectedReviewAuthority = "user-authorized-2026-07-19";
const expectedReviewedOn = "2026-07-19";
const allowedOwnerDecisions = new Set(["approve", "reject_semantic_mismatch", "defer_insufficient_target_model", "maintain_reject"]);
const expectedOwnerDecisionContract = Object.freeze({
  "oadm-integrated-multidimensional-decision-3b85562879|object|forecast_version": "reject_semantic_mismatch",
  "oadm-integrated-multidimensional-decision-3b85562879|object|purchase_plan": "reject_semantic_mismatch",
  "oadm-integrated-multidimensional-decision-3b85562879|object|inventory_batch": "reject_semantic_mismatch",
  "oadm-ontology-asset-registration-5b7e350efb|metric|SCM-MECE-L3-104": "reject_semantic_mismatch",
  "oadm-ontology-lifecycle-operations-968c388b34|metric|SCM-MECE-L3-100": "reject_semantic_mismatch",
  "oadm-ontology-lifecycle-operations-968c388b34|metric|SCM-MECE-L3-103": "reject_semantic_mismatch",
  "oadm-scenario-validation-loop-65cbb0ff79|metric|SCM-MECE-L3-110": "defer_insufficient_target_model",
  "oadm-continuous-tool-ecosystem-9eabee007d|metric|SCM-MECE-L3-100": "reject_semantic_mismatch",
  "oadm-continuous-tool-ecosystem-9eabee007d|metric|SCM-MECE-L3-102": "reject_semantic_mismatch",
  "oadm-modeling-admission-review-fd13d2a7bf|metric|SCM-MECE-L3-104": "reject_semantic_mismatch",
  "oadm-inference-result-traceability-0d0557615e|metric|SCM-MECE-L3-102": "maintain_reject",
  "oadm-ai-dataset-classification-versioning-97124ce95e|metric|SCM-MECE-L3-100": "maintain_reject",
  "oadm-dual-model-validation-eff49bdf82|metric|SCM-MECE-L3-110": "maintain_reject"
});

function ownerDecisionOutcome(decision) {
  if (decision === "approve") return "approved";
  if (decision === "defer_insufficient_target_model") return "deferred";
  return "rejected";
}

function candidateEdgesFromSeeds(seeds) {
  return [
    ...seeds.accept_candidates.flatMap((entry) => entry.targets.map((target) => ({
      candidate_card_id: entry.candidate_card_id,
      candidate_origin_status: "accept_candidate",
      ...target
    }))),
    ...seeds.reject_candidates.flatMap((entry) => entry.considered_targets.map((target) => ({
      candidate_card_id: entry.candidate_card_id,
      candidate_origin_status: "reject_candidate",
      ...target
    })))
  ];
}

export function validateOwnerReviewContract(seeds, ownerReview) {
  const acceptedReferenceCount = seeds.accept_candidates.flatMap((entry) => entry.targets).length;
  const consideredReferenceCount = seeds.reject_candidates.flatMap((entry) => entry.considered_targets).length;
  assert(acceptedReferenceCount === 10, `accepted target reference count mismatch: ${acceptedReferenceCount}/10`);
  assert(consideredReferenceCount === 3, `considered target reference count mismatch: ${consideredReferenceCount}/3`);

  const candidateEdgeMap = new Map(candidateEdgesFromSeeds(seeds).map((edge) => [edgeKeyOf(edge.candidate_card_id, edge), edge]));
  const decisionByEdge = new Map(ownerReview.decisions.map((decision) => [edgeKeyOf(decision.candidate_card_id, decision), decision.owner_decision]));
  const expectedContractMismatches = [];
  for (const [edgeKey, expectedDecision] of Object.entries(expectedOwnerDecisionContract)) {
    const expectedOrigin = expectedDecision === "maintain_reject" ? "reject_candidate" : "accept_candidate";
    const candidateEdge = candidateEdgeMap.get(edgeKey);
    const actualDecision = decisionByEdge.get(edgeKey);
    if (!candidateEdge) expectedContractMismatches.push(`${edgeKey}: expected candidate edge is missing`);
    else if (candidateEdge.candidate_origin_status !== expectedOrigin) expectedContractMismatches.push(`${edgeKey}: expected origin=${expectedOrigin}, actual=${candidateEdge.candidate_origin_status}`);
    if (actualDecision !== expectedDecision) expectedContractMismatches.push(`${edgeKey}: expected decision=${expectedDecision}, actual=${actualDecision ?? "missing"}`);
  }
  for (const edgeKey of candidateEdgeMap.keys()) {
    if (!(edgeKey in expectedOwnerDecisionContract)) expectedContractMismatches.push(`${edgeKey}: unexpected candidate edge outside fixed contract`);
  }
  for (const edgeKey of decisionByEdge.keys()) {
    if (!(edgeKey in expectedOwnerDecisionContract)) expectedContractMismatches.push(`${edgeKey}: unexpected owner decision outside fixed contract`);
  }
  assert(expectedContractMismatches.length === 0, `owner review contract mismatch: ${expectedContractMismatches.join("; ")}`);
  return {
    expected_contract_edge_count: Object.keys(expectedOwnerDecisionContract).length,
    expected_contract_mismatches: expectedContractMismatches,
    accepted_reference_count: acceptedReferenceCount,
    expected_accepted_reference_count: 10,
    considered_reference_count: consideredReferenceCount,
    expected_considered_reference_count: 3,
    passed: true
  };
}

export function validateOwnerReviewDecisions(seeds, ownerReview) {
  validateSeedUniqueness(seeds);
  assert(ownerReview.reviewed_on === expectedReviewedOn, `invalid reviewed_on: ${ownerReview.reviewed_on}`);
  assert(ownerReview.reviewer === expectedReviewer, `invalid reviewer: ${ownerReview.reviewer}`);
  assert(ownerReview.review_authority === expectedReviewAuthority, `invalid review authority: ${ownerReview.review_authority}`);
  assert(Array.isArray(ownerReview.decisions), "owner review decisions must be an array");

  const candidateEdges = candidateEdgesFromSeeds(seeds);
  const candidateEdgeMap = new Map(candidateEdges.map((edge) => [edgeKeyOf(edge.candidate_card_id, edge), edge]));
  const reviewedEdgeKeys = ownerReview.decisions.map((decision) => edgeKeyOf(decision.candidate_card_id, decision));
  const duplicateEdges = duplicateValues(reviewedEdgeKeys);
  assert(duplicateEdges.length === 0, `duplicate owner review edge: ${duplicateEdges.join(",")}`);
  const unknownEdges = [...new Set(reviewedEdgeKeys.filter((key) => !candidateEdgeMap.has(key)))].sort();
  assert(unknownEdges.length === 0, `unknown owner review edge: ${unknownEdges.join(",")}`);
  const reviewedEdgeSet = new Set(reviewedEdgeKeys);
  const missingEdges = [...candidateEdgeMap.keys()].filter((key) => !reviewedEdgeSet.has(key)).sort();
  assert(missingEdges.length === 0, `missing owner review edge: ${missingEdges.join(",")}`);

  for (const decision of ownerReview.decisions) {
    const edgeKey = edgeKeyOf(decision.candidate_card_id, decision);
    const candidateEdge = candidateEdgeMap.get(edgeKey);
    assert(decision.candidate_origin_status === candidateEdge.candidate_origin_status, `candidate origin status mismatch for ${edgeKey}: ${decision.candidate_origin_status}`);
    assert(allowedOwnerDecisions.has(decision.owner_decision), `invalid owner decision for ${edgeKey}: ${decision.owner_decision}`);
    const allowedForOrigin = decision.candidate_origin_status === "accept_candidate"
      ? new Set(["approve", "reject_semantic_mismatch", "defer_insufficient_target_model"])
      : new Set(["maintain_reject"]);
    assert(allowedForOrigin.has(decision.owner_decision), `owner decision incompatible with candidate origin for ${edgeKey}: ${decision.owner_decision}`);
    assert(typeof decision.reason === "string" && decision.reason.trim().length > 0, `missing owner review reason for ${edgeKey}`);
    assert(["high", "medium"].includes(decision.confidence), `invalid owner review confidence for ${edgeKey}: ${decision.confidence}`);
    assert(decision.reviewer === expectedReviewer, `invalid reviewer for ${edgeKey}: ${decision.reviewer}`);
    assert(decision.review_authority === expectedReviewAuthority, `invalid review authority for ${edgeKey}: ${decision.review_authority}`);
    assert(decision.reviewed_on === expectedReviewedOn, `invalid reviewed_on for ${edgeKey}: ${decision.reviewed_on}`);
    assert(decision.promotion_status === "none", `promotion is forbidden for ${edgeKey}: ${decision.promotion_status}`);
    assert(decision.scm_verified_fact === false, `scm_verified_fact must remain false for ${edgeKey}`);
  }

  const outcomes = ownerReview.decisions.map((decision) => ownerDecisionOutcome(decision.owner_decision));
  return {
    expected_edge_count: candidateEdges.length,
    reviewed_edge_count: ownerReview.decisions.length,
    missing_edges: missingEdges,
    duplicate_edges: duplicateEdges,
    overlapping_edges: duplicateEdges,
    unknown_edges: unknownEdges,
    invalid_decisions: [],
    decision_counts: {
      approved: outcomes.filter((outcome) => outcome === "approved").length,
      rejected: outcomes.filter((outcome) => outcome === "rejected").length,
      deferred: outcomes.filter((outcome) => outcome === "deferred").length
    },
    reviewed_card_count: new Set(ownerReview.decisions.map((decision) => decision.candidate_card_id)).size,
    not_in_scope_card_count: seeds.unmapped_candidates.length,
    promotion_count: ownerReview.decisions.filter((decision) => decision.promotion_status !== "none").length,
    scm_verified_true_count: ownerReview.decisions.filter((decision) => decision.scm_verified_fact !== false).length
  };
}

export function validateSeedUniqueness(seeds) {
  assert(Array.isArray(seeds.accept_candidates), "accept_candidates must be an array");
  assert(Array.isArray(seeds.reject_candidates), "reject_candidates must be an array");
  assert(Array.isArray(seeds.unmapped_candidates), "unmapped_candidates must be an array");
  const acceptIds = seeds.accept_candidates.map((entry) => entry.candidate_card_id);
  const rejectIds = seeds.reject_candidates.map((entry) => entry.candidate_card_id);
  const unmappedIds = seeds.unmapped_candidates;
  const duplicateAcceptIds = duplicateValues(acceptIds);
  const duplicateRejectIds = duplicateValues(rejectIds);
  const duplicateUnmappedIds = duplicateValues(unmappedIds);
  assert(duplicateAcceptIds.length === 0, `duplicate accept candidate card: ${duplicateAcceptIds.join(",")}`);
  assert(duplicateRejectIds.length === 0, `duplicate reject candidate card: ${duplicateRejectIds.join(",")}`);
  assert(duplicateUnmappedIds.length === 0, `duplicate unmapped candidate card: ${duplicateUnmappedIds.join(",")}`);
  const acceptIdSet = new Set(acceptIds);
  const rejectIdSet = new Set(rejectIds);
  const unmappedIdSet = new Set(unmappedIds);
  const acceptRejectOverlap = [...acceptIdSet].filter((id) => rejectIdSet.has(id)).sort();
  const acceptUnmappedOverlap = [...acceptIdSet].filter((id) => unmappedIdSet.has(id)).sort();
  const rejectUnmappedOverlap = [...rejectIdSet].filter((id) => unmappedIdSet.has(id)).sort();
  assert(acceptRejectOverlap.length === 0, `candidate card appears in accept and reject: ${acceptRejectOverlap.join(",")}`);
  assert(acceptUnmappedOverlap.length === 0, `candidate card appears in accept and unmapped: ${acceptUnmappedOverlap.join(",")}`);
  assert(rejectUnmappedOverlap.length === 0, `candidate card appears in reject and unmapped: ${rejectUnmappedOverlap.join(",")}`);

  const acceptedEdges = seeds.accept_candidates.flatMap((entry) => {
    assert(Array.isArray(entry.targets), `targets must be an array for ${entry.candidate_card_id}`);
    return entry.targets.map((target) => `${entry.candidate_card_id}|${target.scm_target_type}|${target.scm_target_id}`);
  });
  const consideredEdges = seeds.reject_candidates.flatMap((entry) => {
    assert(Array.isArray(entry.considered_targets), `considered_targets must be an array for ${entry.candidate_card_id}`);
    return entry.considered_targets.map((target) => `${entry.candidate_card_id}|${target.scm_target_type}|${target.scm_target_id}`);
  });
  const duplicateAcceptedEdges = duplicateValues(acceptedEdges);
  const duplicateConsideredEdges = duplicateValues(consideredEdges);
  assert(duplicateAcceptedEdges.length === 0, `duplicate accepted target edge: ${duplicateAcceptedEdges.join(",")}`);
  assert(duplicateConsideredEdges.length === 0, `duplicate considered target edge: ${duplicateConsideredEdges.join(",")}`);
}

export function validateDispositionPartition(cardIds, seeds) {
  validateSeedUniqueness(seeds);
  const sourceIds = new Set(cardIds);
  assert(sourceIds.size === cardIds.length, "source card IDs must be unique");
  const dispositionIds = [
    ...seeds.accept_candidates.map((entry) => entry.candidate_card_id),
    ...seeds.reject_candidates.map((entry) => entry.candidate_card_id),
    ...seeds.unmapped_candidates
  ];
  const dispositionIdSet = new Set(dispositionIds);
  const unknownIds = [...dispositionIdSet].filter((id) => !sourceIds.has(id)).sort();
  const missingIds = [...sourceIds].filter((id) => !dispositionIdSet.has(id)).sort();
  assert(unknownIds.length === 0, `unknown disposition card: ${unknownIds.join(",")}`);
  assert(missingIds.length === 0, `missing disposition card: ${missingIds.join(",")}`);
  return { source_count: sourceIds.size, disposition_count: dispositionIdSet.size, missing_ids: missingIds, unknown_ids: unknownIds };
}

export function parsePorcelainPaths(text) {
  const paths = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.length < 4) continue;
    const payload = line.slice(3);
    if (payload.includes(" -> ")) paths.push(...payload.split(" -> "));
    else paths.push(payload);
  }
  return [...new Set(paths)].sort();
}

export function evaluateRepositoryScope(changedPaths) {
  const normalizedPaths = [...new Set(changedPaths)].sort();
  const scopeInputPaths = normalizedPaths.filter((path) => !generatedArtifactPathSet.has(path));
  const unauthorizedPaths = normalizedPaths.filter((path) => !path.startsWith(crosswalkPrefix) && !allowedExactPaths.has(path));
  const importerModified = normalizedPaths.some((path) => /(?:^|\/)(?:import-assets\.mjs|[^/]*importer[^/]*)(?:$|\/)/i.test(path));
  return {
    baseline_commit: baseCommit,
    changed_paths: scopeInputPaths,
    scope_input_paths: scopeInputPaths,
    generated_artifact_paths: generatedArtifactPaths,
    unauthorized_paths: unauthorizedPaths,
    importer_modified: importerModified,
    scope_passed: unauthorizedPaths.length === 0 && !importerModified
  };
}

export function evaluateQualityGate(quality) {
  return Boolean(
    quality.source_coverage?.passed &&
    quality.target_existence?.passed &&
    quality.exact_duplicate?.passed &&
    quality.conflict?.passed &&
    quality.orphan?.passed &&
    quality.reverse_index?.passed &&
    quality.rule_registry_gap?.passed &&
    quality.record_boundary?.passed &&
    quality.owner_review_quality?.passed &&
    quality.database_boundary?.expected_hash_matched &&
    quality.database_boundary?.database_hash_unchanged &&
    quality.database_boundary?.readonly_open_mode_verified &&
    quality.repository_scope?.scope_passed
  );
}

function inspectRepositoryScope() {
  const committed = execFileSync("git", ["diff", `${baseCommit}..HEAD`, "--name-only", "--"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/).filter((path) => path.length > 0);
  const porcelain = execFileSync("git", ["-c", "core.quotePath=false", "status", "--porcelain=v1", "--untracked-files=all"], { cwd: repoRoot, encoding: "utf8" });
  return evaluateRepositoryScope([...committed, ...parsePorcelainPaths(porcelain)]);
}

function queryDatabase(sql) {
  const uri = pathToFileURL(paths.database);
  uri.searchParams.set("immutable", "1");
  const output = execFileSync("sqlite3", ["-readonly", "-json", uri.href, sql], { encoding: "utf8" }).trim();
  return output ? JSON.parse(output) : [];
}

function checkedTarget(target, objectIds, metricIds, decision) {
  assert(["object", "metric"].includes(target.scm_target_type), `unsupported target type ${target.scm_target_type}`);
  assert(decision, `missing owner review decision for target ${keyOf(target)}`);
  const targetExists = target.scm_target_type === "object"
    ? objectIds.has(target.scm_target_id)
    : metricIds.has(target.scm_target_id);
  return {
    scm_target_type: target.scm_target_type,
    scm_target_id: target.scm_target_id,
    relation_type: "CANDIDATE_CROSSWALK",
    runtime_relation_type: target.scm_target_type === "object" ? "DESCRIBES_OBJECT" : "SUPPORTS_METRIC",
    target_exists: targetExists,
    owner_review: {
      status: "completed",
      candidate_origin_status: decision.candidate_origin_status,
      owner_decision: decision.owner_decision,
      decision_outcome: ownerDecisionOutcome(decision.owner_decision),
      reason: decision.reason,
      confidence: decision.confidence,
      reviewer: decision.reviewer,
      review_authority: decision.review_authority,
      reviewed_on: decision.reviewed_on,
      promotion_status: decision.promotion_status,
      scm_verified_fact: decision.scm_verified_fact
    }
  };
}

export function buildArtifacts() {
  const databaseHashBefore = fileHash(paths.database);
  assert(databaseHashBefore === expectedDatabaseHash, `baseline database hash mismatch: ${databaseHashBefore}`);
  const cardManifest = readJson(paths.cards);
  const seeds = readJson(paths.seeds);
  const ownerReview = readJson(paths.ownerReview);
  assert(cardManifest.card_count === 89 && cardManifest.cards.length === 89, "expected 89 aggregate cards");
  assert(seeds.scope === "m3a-candidate-only", "seed scope mismatch");
  assert(ownerReview.scope === "m3a-owner-delegated-semantic-review", "owner review scope mismatch");
  assert(ownerReview.human_owner_sign_off === false, "human owner sign-off must remain false");
  const cardIds = cardManifest.cards.map((card) => card.card_id);
  const partition = validateDispositionPartition(cardIds, seeds);
  const ownerReviewSummary = validateOwnerReviewDecisions(seeds, ownerReview);
  const ownerReviewContract = validateOwnerReviewContract(seeds, ownerReview);
  assert(ownerReviewSummary.expected_edge_count === 13 && ownerReviewSummary.reviewed_edge_count === 13, "owner review edge coverage must be 13/13");
  assert(JSON.stringify(ownerReviewSummary.decision_counts) === JSON.stringify({ approved: 0, rejected: 12, deferred: 1 }), "owner review decision count mismatch");
  assert(ownerReviewSummary.reviewed_card_count === 9 && ownerReviewSummary.not_in_scope_card_count === 80, "owner review card scope count mismatch");
  assert(ownerReviewSummary.promotion_count === 0 && ownerReviewSummary.scm_verified_true_count === 0, "owner review boundary violation");

  const objectIds = new Set(queryDatabase("SELECT id FROM ontology_objects ORDER BY id;").map(({ id }) => id));
  const metricIds = new Set(queryDatabase("SELECT id FROM metrics ORDER BY id;").map(({ id }) => id));
  const ruleTables = queryDatabase("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('rules','rule_refs','rule_registry') ORDER BY name;").map(({ name }) => name);
  const databaseHashAfter = fileHash(paths.database);
  assert(databaseHashAfter === databaseHashBefore, "baseline database changed during readonly inspection");
  assert(ruleTables.length === 0, `unexpected stable rule registry: ${ruleTables.join(",")}`);

  const cardById = new Map(cardManifest.cards.map((card) => [card.card_id, card]));
  const acceptById = new Map(seeds.accept_candidates.map((entry) => [entry.candidate_card_id, entry]));
  const rejectById = new Map(seeds.reject_candidates.map((entry) => [entry.candidate_card_id, entry]));
  const unmappedIds = new Set(seeds.unmapped_candidates);
  const ownerDecisionByEdge = new Map(ownerReview.decisions.map((decision) => [edgeKeyOf(decision.candidate_card_id, decision), decision]));
  const seededIds = [...acceptById.keys(), ...rejectById.keys(), ...unmappedIds];
  for (const cardId of seededIds) assert(cardById.has(cardId), `seed references unknown card ${cardId}`);

  const dispositions = cardManifest.cards.map((card) => {
    const accepted = acceptById.get(card.card_id);
    const rejected = rejectById.get(card.card_id);
    const targets = accepted ? accepted.targets.map((target) => checkedTarget(target, objectIds, metricIds, ownerDecisionByEdge.get(edgeKeyOf(card.card_id, target)))) : [];
    const consideredTargets = rejected ? rejected.considered_targets.map((target) => checkedTarget(target, objectIds, metricIds, ownerDecisionByEdge.get(edgeKeyOf(card.card_id, target)))) : [];
    assert(targets.every((target) => target.target_exists), `accepted card has missing target ${card.card_id}`);
    const mappingStatus = accepted ? "accept_candidate" : rejected ? "reject_candidate" : unmappedIds.has(card.card_id) ? "unmapped" : null;
    assert(mappingStatus, `card has no explicit disposition ${card.card_id}`);
    const reviewedTargets = [...targets, ...consideredTargets];
    const ownerReviewStatus = mappingStatus === "unmapped" ? "not_in_scope" : "completed";
    const effectiveMappingStatus = mappingStatus === "unmapped"
      ? "unmapped"
      : reviewedTargets.some((target) => target.owner_review.decision_outcome === "deferred")
        ? "deferred"
        : reviewedTargets.some((target) => target.owner_review.decision_outcome === "approved")
          ? "approved"
          : "rejected";
    return {
      candidate_card_id: card.card_id,
      semantic_key: card.semantic_key,
      title: card.title,
      source_pages: { pdf_page_start: card.pdf_page_start, pdf_page_end: card.pdf_page_end },
      mapping_status: mappingStatus,
      effective_mapping_status: effectiveMappingStatus,
      targets,
      considered_targets: consideredTargets,
      book_evidence_level: "published-book-derived-candidate",
      applicability_evidence_level: "project-applicability-inference",
      scm_verified_fact: false,
      applicability_reason: accepted?.applicability_reason ?? null,
      conflict_reason: rejected?.conflict_reason ?? (mappingStatus === "unmapped" ? seeds.unmapped_reason : null),
      reviewer: null,
      review_status: "pending",
      owner_review: {
        status: ownerReviewStatus,
        edge_decision_count: reviewedTargets.length,
        reviewer: ownerReviewStatus === "completed" ? ownerReview.reviewer : null,
        review_authority: ownerReviewStatus === "completed" ? ownerReview.review_authority : null,
        reviewed_on: ownerReviewStatus === "completed" ? ownerReview.reviewed_on : null,
        human_owner_sign_off: false,
        promotion_status: "none",
        scm_verified_fact: false
      }
    };
  });

  const statusCounts = Object.fromEntries(["accept_candidate", "reject_candidate", "unmapped"].map((status) => [status, dispositions.filter((item) => item.mapping_status === status).length]));
  assert(JSON.stringify(statusCounts) === JSON.stringify({ accept_candidate: 6, reject_candidate: 3, unmapped: 80 }), "disposition count mismatch");
  const effectiveStatusCounts = Object.fromEntries(["approved", "rejected", "deferred", "unmapped"].map((status) => [status, dispositions.filter((item) => item.effective_mapping_status === status).length]));
  assert(JSON.stringify(effectiveStatusCounts) === JSON.stringify({ approved: 0, rejected: 8, deferred: 1, unmapped: 80 }), "effective mapping status count mismatch");
  const acceptedTargets = dispositions.flatMap((item) => item.targets.map((target) => ({ ...target, candidate_card_id: item.candidate_card_id })));
  const consideredTargets = dispositions.flatMap((item) => item.considered_targets.map((target) => ({ ...target, candidate_card_id: item.candidate_card_id })));
  const acceptedEdges = acceptedTargets.map((target) => `${target.candidate_card_id}|${keyOf(target)}`);
  const consideredEdges = consideredTargets.map((target) => `${target.candidate_card_id}|${keyOf(target)}`);
  const reverseMap = new Map();
  for (const target of acceptedTargets) {
    const key = keyOf(target);
    reverseMap.set(key, [...(reverseMap.get(key) || []), target.candidate_card_id].sort());
  }
  const reverseIndex = [...reverseMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([scm_target, candidateCardIds]) => ({ scm_target, candidate_card_ids: candidateCardIds }));
  const manyToOne = reverseIndex.filter((entry) => entry.candidate_card_ids.length > 1);
  const sourceIds = new Set(cardIds);
  const dispositionIds = new Set(dispositions.map((item) => item.candidate_card_id));
  const missingDispositions = [...sourceIds].filter((id) => !dispositionIds.has(id));
  const orphanDispositions = [...dispositionIds].filter((id) => !sourceIds.has(id));
  const reviewedTargets = [...acceptedTargets, ...consideredTargets];
  const reviewedTargetEdgeKeys = reviewedTargets.map((target) => edgeKeyOf(target.candidate_card_id, target));
  const completedReviewCardIds = dispositions.filter((item) => item.owner_review.status === "completed").map((item) => item.candidate_card_id);
  const notInScopeReviewCardIds = dispositions.filter((item) => item.owner_review.status === "not_in_scope").map((item) => item.candidate_card_id);
  const promotedEdges = reviewedTargets.filter((target) => target.owner_review.promotion_status !== "none").map((target) => edgeKeyOf(target.candidate_card_id, target));
  const scmVerifiedTrueEdges = reviewedTargets.filter((target) => target.owner_review.scm_verified_fact !== false).map((target) => edgeKeyOf(target.candidate_card_id, target));
  const reviewerMismatchEdges = reviewedTargets.filter((target) => target.owner_review.reviewer !== expectedReviewer).map((target) => edgeKeyOf(target.candidate_card_id, target));
  const authorityMismatchEdges = reviewedTargets.filter((target) => target.owner_review.review_authority !== expectedReviewAuthority).map((target) => edgeKeyOf(target.candidate_card_id, target));
  const reviewedOnMismatchEdges = reviewedTargets.filter((target) => target.owner_review.reviewed_on !== expectedReviewedOn).map((target) => edgeKeyOf(target.candidate_card_id, target));

  const repositoryScope = inspectRepositoryScope();
  const manifest = {
    schema_version: "1.2.0",
    generated_at: seeds.generated_at,
    scope: "m3a-candidate-only",
    source_card_manifest: "manifests/knowledge-card-manifest.json",
    source_card_manifest_sha256: fileHash(paths.cards),
    seed_sha256: fileHash(paths.seeds),
    owner_review_source: "07-scm-crosswalk/owner-review-decisions.json",
    owner_review_source_sha256: fileHash(paths.ownerReview),
    baseline_database: {
      relative_path: relative(repoRoot, paths.database),
      expected_sha256: expectedDatabaseHash,
      observed_sha256: databaseHashAfter,
      open_mode: "readonly+immutable",
      database_write: false
    },
    relation_registry: {
      runtime_target_types: ["object", "metric"],
      runtime_relation_types: { object: "DESCRIBES_OBJECT", metric: "SUPPORTS_METRIC" },
      stable_rule_registry_available: false,
      rule_mapping_policy: "unmapped"
    },
    card_count: dispositions.length,
    mapping_status_counts: statusCounts,
    effective_mapping_status_counts: effectiveStatusCounts,
    disposition_source: "explicit-three-way-seed-partition",
    seed_partition_counts: {
      accept_candidate: seeds.accept_candidates.length,
      reject_candidate: seeds.reject_candidates.length,
      unmapped: seeds.unmapped_candidates.length
    },
    accepted_target_reference_count: acceptedTargets.length,
    owner_review_summary: {
      mode: "owner-delegated-codex",
      review_authority: ownerReview.review_authority,
      reviewed_on: ownerReview.reviewed_on,
      human_owner_sign_off: false,
      reviewed_edge_count: ownerReviewSummary.reviewed_edge_count,
      decision_counts: ownerReviewSummary.decision_counts,
      reviewed_card_count: ownerReviewSummary.reviewed_card_count,
      not_in_scope_card_count: ownerReviewSummary.not_in_scope_card_count,
      promotion_count: ownerReviewSummary.promotion_count,
      scm_verified_true_count: ownerReviewSummary.scm_verified_true_count
    },
    dispositions
  };

  const quality = {
    schema_version: "1.2.0",
    generated_at: seeds.generated_at,
    scope: "m3a-readonly-owner-delegated-quality-report",
    source_coverage: {
      source_card_count: partition.source_count,
      disposition_count: partition.disposition_count,
      missing_dispositions: missingDispositions,
      unknown_dispositions: partition.unknown_ids,
      passed: partition.source_count === partition.disposition_count && missingDispositions.length === 0 && partition.unknown_ids.length === 0
    },
    mapping_status_counts: statusCounts,
    effective_mapping_status_counts: effectiveStatusCounts,
    target_existence: {
      accepted_target_reference_count: acceptedTargets.length,
      accepted_missing_target_count: acceptedTargets.filter((target) => !target.target_exists).length,
      considered_target_reference_count: consideredTargets.length,
      considered_missing_target_count: consideredTargets.filter((target) => !target.target_exists).length,
      passed: [...acceptedTargets, ...consideredTargets].every((target) => target.target_exists)
    },
    exact_duplicate: { accepted_duplicate_edges: duplicateValues(acceptedEdges), considered_duplicate_edges: duplicateValues(consideredEdges), passed: duplicateValues([...acceptedEdges, ...consideredEdges]).length === 0 },
    many_to_one: { target_count: manyToOne.length, targets: manyToOne, review_required: true, reported: true },
    conflict: { reject_candidate_count: statusCounts.reject_candidate, rejected_without_reason: dispositions.filter((item) => item.mapping_status === "reject_candidate" && !item.conflict_reason).map((item) => item.candidate_card_id), passed: dispositions.every((item) => item.mapping_status !== "reject_candidate" || Boolean(item.conflict_reason)) },
    orphan: { cards_without_disposition: missingDispositions, dispositions_without_card: orphanDispositions, passed: missingDispositions.length === 0 && orphanDispositions.length === 0 },
    reverse_index: { target_count: reverseIndex.length, entries: reverseIndex, passed: reverseIndex.every((entry) => entry.candidate_card_ids.every((id) => dispositionIds.has(id))) },
    rule_registry_gap: { inspected_tables: ["rules", "rule_refs", "rule_registry"], present_tables: ruleTables, stable_rule_registry_available: false, accepted_rule_mapping_count: 0, policy: "unmapped", passed: ruleTables.length === 0 },
    record_boundary: {
      record_count: dispositions.length,
      non_pending_card_ids: dispositions.filter((item) => item.review_status !== "pending").map((item) => item.candidate_card_id),
      reviewer_assigned_card_ids: dispositions.filter((item) => item.reviewer !== null).map((item) => item.candidate_card_id),
      scm_verified_true_card_ids: dispositions.filter((item) => item.scm_verified_fact !== false).map((item) => item.candidate_card_id),
      passed: dispositions.length === 89 && dispositions.every((item) => item.review_status === "pending" && item.reviewer === null && item.scm_verified_fact === false)
    },
    owner_review_quality: {
      review_mode: ownerReview.reviewer,
      review_authority: ownerReview.review_authority,
      reviewed_on: ownerReview.reviewed_on,
      human_owner_sign_off: ownerReview.human_owner_sign_off,
      expected_edge_count: ownerReviewSummary.expected_edge_count,
      reviewed_edge_count: reviewedTargetEdgeKeys.length,
      accepted_reference_count: ownerReviewContract.accepted_reference_count,
      expected_accepted_reference_count: ownerReviewContract.expected_accepted_reference_count,
      considered_reference_count: ownerReviewContract.considered_reference_count,
      expected_considered_reference_count: ownerReviewContract.expected_considered_reference_count,
      expected_contract_edge_count: ownerReviewContract.expected_contract_edge_count,
      expected_contract_mismatches: ownerReviewContract.expected_contract_mismatches,
      missing_edges: ownerReviewSummary.missing_edges,
      duplicate_edges: duplicateValues(reviewedTargetEdgeKeys),
      overlapping_edges: duplicateValues(reviewedTargetEdgeKeys),
      unknown_edges: ownerReviewSummary.unknown_edges,
      invalid_decisions: ownerReviewSummary.invalid_decisions,
      decision_counts: ownerReviewSummary.decision_counts,
      expected_decision_counts: { approved: 0, rejected: 12, deferred: 1 },
      reviewed_card_count: completedReviewCardIds.length,
      expected_reviewed_card_count: 9,
      not_in_scope_card_count: notInScopeReviewCardIds.length,
      expected_not_in_scope_card_count: 80,
      effective_mapping_status_counts: effectiveStatusCounts,
      reviewer_mismatch_edges: reviewerMismatchEdges,
      authority_mismatch_edges: authorityMismatchEdges,
      reviewed_on_mismatch_edges: reviewedOnMismatchEdges,
      promoted_edges: promotedEdges,
      promotion_count: promotedEdges.length,
      scm_verified_true_edges: scmVerifiedTrueEdges,
      scm_verified_true_card_ids: dispositions.filter((item) => item.scm_verified_fact !== false || item.owner_review.scm_verified_fact !== false).map((item) => item.candidate_card_id),
      passed:
        ownerReview.reviewer === expectedReviewer &&
        ownerReview.review_authority === expectedReviewAuthority &&
        ownerReview.reviewed_on === expectedReviewedOn &&
        ownerReview.human_owner_sign_off === false &&
        ownerReviewSummary.expected_edge_count === 13 &&
        reviewedTargetEdgeKeys.length === 13 &&
        ownerReviewContract.accepted_reference_count === 10 &&
        ownerReviewContract.considered_reference_count === 3 &&
        ownerReviewContract.expected_contract_edge_count === 13 &&
        ownerReviewContract.expected_contract_mismatches.length === 0 &&
        ownerReviewSummary.missing_edges.length === 0 &&
        duplicateValues(reviewedTargetEdgeKeys).length === 0 &&
        ownerReviewSummary.unknown_edges.length === 0 &&
        ownerReviewSummary.invalid_decisions.length === 0 &&
        JSON.stringify(ownerReviewSummary.decision_counts) === JSON.stringify({ approved: 0, rejected: 12, deferred: 1 }) &&
        completedReviewCardIds.length === 9 &&
        notInScopeReviewCardIds.length === 80 &&
        JSON.stringify(effectiveStatusCounts) === JSON.stringify({ approved: 0, rejected: 8, deferred: 1, unmapped: 80 }) &&
        reviewerMismatchEdges.length === 0 &&
        authorityMismatchEdges.length === 0 &&
        reviewedOnMismatchEdges.length === 0 &&
        promotedEdges.length === 0 &&
        scmVerifiedTrueEdges.length === 0 &&
        dispositions.every((item) => item.scm_verified_fact === false && item.owner_review.scm_verified_fact === false)
    },
    database_boundary: {
      database_before_sha256: databaseHashBefore,
      database_after_sha256: databaseHashAfter,
      expected_sha256: expectedDatabaseHash,
      expected_hash_matched: databaseHashBefore === expectedDatabaseHash && databaseHashAfter === expectedDatabaseHash,
      database_hash_unchanged: databaseHashBefore === databaseHashAfter,
      open_mode: "readonly+immutable",
      readonly_open_mode_verified: true,
      database_write_observed: false
    },
    repository_scope: repositoryScope,
    execution_declarations: {
      provider_call: { declared: false, verification: "not_verified_by_builder" },
      external_promotion: { declared: false, verification: "not_verified_by_builder" },
      deploy: { declared: false, verification: "not_verified_by_builder" },
      standalone_sync: { declared: false, verification: "not_verified_by_builder" }
    }
  };
  const allChecksPassed = evaluateQualityGate(quality);
  quality.automatic_checks_passed = allChecksPassed;
  quality.final_gate = allChecksPassed ? "passed-owner-delegated-review" : "failed";
  assert(allChecksPassed, "M3-A automatic quality gate failed");

  const report = [
    "---", "title: M3-A SCM Crosswalk owner-delegated 语义评审报告", "doc_type: quality-report", "module: scm",
    "topic: ontology-ai-data-management-m3a-crosswalk", "status: draft", "created: 2026-07-18", "updated: 2026-07-19", "owner: self", "source: human+ai", "---", "",
    "# M3-A SCM Crosswalk owner-delegated 语义评审报告", "", "## 结论", "",
    `用户于 2026-07-19 授权 Codex 作为 AI 代理执行语义评审，记录身份为 \`${ownerReview.reviewer}\`，授权依据为 \`review_authority=${ownerReview.review_authority}\`。这不是人类 owner 亲自复核或签字；\`human_owner_sign_off=false\`。`, "",
    `原候选快照保持不变：${statusCounts.accept_candidate} 张 \`accept_candidate\`、${statusCounts.reject_candidate} 张 \`reject_candidate\`、${statusCounts.unmapped} 张 \`unmapped\`。覆盖层完成 13/13 条候选边决策：0 条批准、12 条拒绝、1 条延期；有效卡片结果为 ${effectiveStatusCounts.rejected} 张 \`rejected\`、${effectiveStatusCounts.deferred} 张 \`deferred\`、${effectiveStatusCounts.unmapped} 张 \`unmapped\`。没有创建 active/certified 映射，所有 \`scm_verified_fact=false\`。`, "",
    "## 13 条边级决策", "", "| 知识卡 | SCM 目标 | 原候选状态 | owner-delegated 决策 | 置信度 | 理由 |", "|---|---|---|---|---|---|",
    ...ownerReview.decisions.map((decision) => `| \`${decision.candidate_card_id}\` | \`${decision.scm_target_type}:${decision.scm_target_id}\` | \`${decision.candidate_origin_status}\` | \`${decision.owner_decision}\` | \`${decision.confidence}\` | ${decision.reason} |`), "",
    "## 语义 guardrail", "",
    "- `DESCRIBES_OBJECT`：卡片必须匹配 canonical object 的身份键与业务粒度；只提到预测、计划或库存概念，不足以映射到更细的对象资产。",
    "- `SUPPORTS_METRIC`：卡片至少直接支持指标口径、采集/源字段或计算证据之一；一般流程、版本管理或工程追踪语义不足以支持指标。", "",
    "## Open question", "",
    "`SCM-MECE-L3-110` 仍需定义 rule grain，并澄清“支持结论数 / 已分析规则数”的公式与场景测试结果转 evidence 的机制；在目标模型补齐前保持 `deferred`。", "",
    "## 质量门禁", "",
    `- owner review 边覆盖：${quality.owner_review_quality.reviewed_edge_count}/${quality.owner_review_quality.expected_edge_count}；缺失 ${quality.owner_review_quality.missing_edges.length}、重复/重叠 ${quality.owner_review_quality.overlapping_edges.length}、未知 ${quality.owner_review_quality.unknown_edges.length}、非法 decision ${quality.owner_review_quality.invalid_decisions.length}。`,
    `- 固定合同：accepted references=${quality.owner_review_quality.accepted_reference_count}/${quality.owner_review_quality.expected_accepted_reference_count}、considered references=${quality.owner_review_quality.considered_reference_count}/${quality.owner_review_quality.expected_considered_reference_count}、edge→decision mismatch=${quality.owner_review_quality.expected_contract_mismatches.length}。`,
    `- 决策计数：approved=${quality.owner_review_quality.decision_counts.approved}、rejected=${quality.owner_review_quality.decision_counts.rejected}、deferred=${quality.owner_review_quality.decision_counts.deferred}；reviewed cards=${quality.owner_review_quality.reviewed_card_count}、not-in-scope cards=${quality.owner_review_quality.not_in_scope_card_count}。`,
    `- 晋升计数：${quality.owner_review_quality.promotion_count}；SCM verified=true edges=${quality.owner_review_quality.scm_verified_true_edges.length}、cards=${quality.owner_review_quality.scm_verified_true_card_ids.length}。`,
    `- 历史候选记录保持：非 pending ${quality.record_boundary.non_pending_card_ids.length}、已有历史 reviewer ${quality.record_boundary.reviewer_assigned_card_ids.length}、SCM verified=true ${quality.record_boundary.scm_verified_true_card_ids.length}。`,
    `- Git scope：固定生成物 ${quality.repository_scope.generated_artifact_paths.length} 个；\`owner-review-decisions.json\` 作为 source input 参与 \`scope_input_paths\`；未授权路径 ${quality.repository_scope.unauthorized_paths.length}，importer_modified=${quality.repository_scope.importer_modified}。`,
    `- SQLite 以 ${quality.database_boundary.open_mode} 打开；基线哈希匹配=${quality.database_boundary.expected_hash_matched}；前后哈希一致=${quality.database_boundary.database_hash_unchanged}。`, "",
    "## 机器验证边界", "", `- \`automatic_checks_passed=${quality.automatic_checks_passed}\``, `- \`owner_review_quality.passed=${quality.owner_review_quality.passed}\``, `- \`repository_scope.scope_passed=${quality.repository_scope.scope_passed}\``, `- \`database_write_observed=${quality.database_boundary.database_write_observed}\``, "",
    "## 本批执行声明", "", "以下项目不是 builder 可直接观察的自动证据，不参与自动通过判定：", "", "- provider call：声明未执行；`verification=not_verified_by_builder`。", "- external promotion：声明未执行；`verification=not_verified_by_builder`。", "- deploy：声明未执行；`verification=not_verified_by_builder`。", "- standalone sync：声明未执行；`verification=not_verified_by_builder`。", ""
  ].join("\n");

  return { manifest: json(manifest), quality: json(quality), report };
}

export const artifactPaths = {
  manifest: at("manifests/m3a-scm-crosswalk-candidates.json"),
  quality: at("manifests/m3a-scm-crosswalk-quality-report.json"),
  report: resolve(__dirname, "01-candidate-crosswalk-review.md")
};
