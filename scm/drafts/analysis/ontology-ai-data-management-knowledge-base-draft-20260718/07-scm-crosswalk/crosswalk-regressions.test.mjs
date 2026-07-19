import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  evaluateQualityGate,
  evaluateRepositoryScope,
  parsePorcelainPaths,
  validateDispositionPartition,
  validateOwnerReviewContract,
  validateOwnerReviewDecisions,
  validateSeedUniqueness
} from "./crosswalk-lib.mjs";

const target = { scm_target_type: "metric", scm_target_id: "metric-1" };
const accepted = (cardId, targets = [target]) => ({ candidate_card_id: cardId, targets });
const rejected = (cardId, consideredTargets = [target]) => ({ candidate_card_id: cardId, considered_targets: consideredTargets });
const reviewDecision = (cardId, candidateOriginStatus, overrides = {}) => ({
  candidate_card_id: cardId,
  scm_target_type: "metric",
  scm_target_id: "metric-1",
  candidate_origin_status: candidateOriginStatus,
  owner_decision: candidateOriginStatus === "reject_candidate" ? "maintain_reject" : "reject_semantic_mismatch",
  reason: "The candidate and canonical target have different semantic grains.",
  confidence: "high",
  reviewer: "owner-delegated-codex",
  review_authority: "user-authorized-2026-07-19",
  reviewed_on: "2026-07-19",
  promotion_status: "none",
  scm_verified_fact: false,
  ...overrides
});
const reviewSeeds = {
  accept_candidates: [accepted("card-a")],
  reject_candidates: [rejected("card-b")],
  unmapped_candidates: ["card-c"]
};
const validOwnerReview = () => ({
  reviewed_on: "2026-07-19",
  reviewer: "owner-delegated-codex",
  review_authority: "user-authorized-2026-07-19",
  decisions: [reviewDecision("card-a", "accept_candidate"), reviewDecision("card-b", "reject_candidate")]
});
const actualSeeds = () => JSON.parse(readFileSync(new URL("./crosswalk-seeds.json", import.meta.url), "utf8"));
const actualOwnerReview = () => JSON.parse(readFileSync(new URL("./owner-review-decisions.json", import.meta.url), "utf8"));

test("rejects a duplicate card in the raw accept seed array", () => {
  assert.throws(
    () => validateSeedUniqueness({ accept_candidates: [accepted("card-a"), accepted("card-a")], reject_candidates: [], unmapped_candidates: [] }),
    /duplicate accept candidate card: card-a/
  );
});

test("rejects a card present in both raw accept and reject seed arrays", () => {
  assert.throws(
    () => validateSeedUniqueness({ accept_candidates: [accepted("card-a")], reject_candidates: [rejected("card-a")], unmapped_candidates: [] }),
    /candidate card appears in accept and reject: card-a/
  );
});

test("rejects a duplicate accepted edge before artifact construction", () => {
  assert.throws(
    () => validateSeedUniqueness({ accept_candidates: [accepted("card-a", [target, target])], reject_candidates: [], unmapped_candidates: [] }),
    /duplicate accepted target edge: card-a\|metric\|metric-1/
  );
});

test("rejects a duplicate considered edge before artifact construction", () => {
  assert.throws(
    () => validateSeedUniqueness({ accept_candidates: [], reject_candidates: [rejected("card-a", [target, target])], unmapped_candidates: [] }),
    /duplicate considered target edge: card-a\|metric\|metric-1/
  );
});

test("rejects a missing explicit unmapped disposition", () => {
  assert.throws(
    () => validateDispositionPartition(["card-a", "card-b"], { accept_candidates: [accepted("card-a")], reject_candidates: [], unmapped_candidates: [] }),
    /missing disposition card: card-b/
  );
});

test("rejects overlap between accepted and unmapped dispositions", () => {
  assert.throws(
    () => validateDispositionPartition(["card-a"], { accept_candidates: [accepted("card-a")], reject_candidates: [], unmapped_candidates: ["card-a"] }),
    /candidate card appears in accept and unmapped: card-a/
  );
});

test("rejects an unknown explicit unmapped disposition", () => {
  assert.throws(
    () => validateDispositionPartition(["card-a"], { accept_candidates: [], reject_candidates: [], unmapped_candidates: ["card-unknown"] }),
    /unknown disposition card: card-unknown/
  );
});

test("quality gate cannot pass when a core dynamic check fails", () => {
  const quality = {
    source_coverage: { passed: false }, target_existence: { passed: true }, exact_duplicate: { passed: true },
    conflict: { passed: true }, orphan: { passed: true }, reverse_index: { passed: true }, rule_registry_gap: { passed: true },
    record_boundary: { passed: true },
    database_boundary: { expected_hash_matched: true, database_hash_unchanged: true, readonly_open_mode_verified: true },
    repository_scope: { scope_passed: true }
  };
  assert.equal(evaluateQualityGate(quality), false);
});

test("owner review rejects a missing candidate edge decision", () => {
  const ownerReview = validOwnerReview();
  ownerReview.decisions.pop();
  assert.throws(() => validateOwnerReviewDecisions(reviewSeeds, ownerReview), /missing owner review edge: card-b\|metric\|metric-1/);
});

test("owner review rejects a duplicate edge decision", () => {
  const ownerReview = validOwnerReview();
  ownerReview.decisions.push({ ...ownerReview.decisions[0] });
  assert.throws(() => validateOwnerReviewDecisions(reviewSeeds, ownerReview), /duplicate owner review edge: card-a\|metric\|metric-1/);
});

test("owner review rejects an unknown edge decision", () => {
  const ownerReview = validOwnerReview();
  ownerReview.decisions.push(reviewDecision("card-unknown", "accept_candidate"));
  assert.throws(() => validateOwnerReviewDecisions(reviewSeeds, ownerReview), /unknown owner review edge: card-unknown\|metric\|metric-1/);
});

test("owner review rejects an illegal decision enum", () => {
  const ownerReview = validOwnerReview();
  ownerReview.decisions[0].owner_decision = "approve_without_evidence";
  assert.throws(() => validateOwnerReviewDecisions(reviewSeeds, ownerReview), /invalid owner decision.*approve_without_evidence/);
});

test("owner review requires the delegated reviewer identity", () => {
  const ownerReview = validOwnerReview();
  ownerReview.decisions[0].reviewer = "human-owner";
  assert.throws(() => validateOwnerReviewDecisions(reviewSeeds, ownerReview), /invalid reviewer.*human-owner/);
});

test("owner review requires the explicit user authority", () => {
  const ownerReview = validOwnerReview();
  ownerReview.decisions[0].review_authority = "self-authorized";
  assert.throws(() => validateOwnerReviewDecisions(reviewSeeds, ownerReview), /invalid review authority.*self-authorized/);
});

test("owner review reports approved rejected and deferred edge counts", () => {
  const ownerReview = validOwnerReview();
  ownerReview.decisions[0].owner_decision = "defer_insufficient_target_model";
  ownerReview.decisions[0].confidence = "medium";
  const result = validateOwnerReviewDecisions(reviewSeeds, ownerReview);
  assert.deepEqual(result.decision_counts, { approved: 0, rejected: 1, deferred: 1 });
  assert.equal(result.reviewed_edge_count, 2);
  assert.equal(result.reviewed_card_count, 2);
  assert.equal(result.not_in_scope_card_count, 1);
  assert.equal(result.promotion_count, 0);
  assert.equal(result.scm_verified_true_count, 0);
});

test("owner review contract rejects swapping defer to another accepted edge with unchanged counts", () => {
  const seeds = actualSeeds();
  const ownerReview = actualOwnerReview();
  const deferred = ownerReview.decisions.find((decision) => decision.owner_decision === "defer_insufficient_target_model");
  const rejected = ownerReview.decisions.find((decision) => decision.candidate_origin_status === "accept_candidate" && decision.owner_decision === "reject_semantic_mismatch");
  deferred.owner_decision = "reject_semantic_mismatch";
  rejected.owner_decision = "defer_insufficient_target_model";
  assert.deepEqual(validateOwnerReviewDecisions(seeds, ownerReview).decision_counts, { approved: 0, rejected: 12, deferred: 1 });
  assert.throws(() => validateOwnerReviewContract(seeds, ownerReview), /owner review contract mismatch/);
});

test("owner review contract rejects 9 accepted and 4 considered references even when total remains 13", () => {
  const seeds = actualSeeds();
  const ownerReview = actualOwnerReview();
  const movedTarget = seeds.accept_candidates[0].targets.pop();
  seeds.reject_candidates[0].considered_targets.push(movedTarget);
  assert.equal(seeds.accept_candidates.flatMap((entry) => entry.targets).length + seeds.reject_candidates.flatMap((entry) => entry.considered_targets).length, 13);
  assert.throws(() => validateOwnerReviewContract(seeds, ownerReview), /accepted target reference count mismatch: 9\/10/);
});

test("quality gate cannot pass when owner review quality fails", () => {
  const quality = {
    source_coverage: { passed: true }, target_existence: { passed: true }, exact_duplicate: { passed: true },
    conflict: { passed: true }, orphan: { passed: true }, reverse_index: { passed: true }, rule_registry_gap: { passed: true },
    record_boundary: { passed: true }, owner_review_quality: { passed: false },
    database_boundary: { expected_hash_matched: true, database_hash_unchanged: true, readonly_open_mode_verified: true },
    repository_scope: { scope_passed: true }
  };
  assert.equal(evaluateQualityGate(quality), false);
});

test("porcelain parser preserves the path after a leading-space worktree status", () => {
  assert.deepEqual(
    parsePorcelainPaths(" M scm/path with spaces.md\n?? scm/new.md\n"),
    ["scm/new.md", "scm/path with spaces.md"]
  );
});

test("repository scope rejects an unauthorized Git path", () => {
  const result = evaluateRepositoryScope([
    "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/07-scm-crosswalk/allowed.md",
    "scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/import-assets.mjs"
  ]);
  assert.equal(result.scope_passed, false);
  assert.equal(result.importer_modified, true);
  assert.deepEqual(result.unauthorized_paths, ["scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/import-assets.mjs"]);
});

test("generated artifacts do not change deterministic repository scope fields", () => {
  const sourcePaths = [
    "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/07-scm-crosswalk/crosswalk-lib.mjs",
    "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/07-scm-crosswalk/owner-review-decisions.json"
  ];
  const generatedPaths = [
    "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/07-scm-crosswalk/01-candidate-crosswalk-review.md",
    "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/manifests/m3a-scm-crosswalk-candidates.json",
    "scm/drafts/analysis/ontology-ai-data-management-knowledge-base-draft-20260718/manifests/m3a-scm-crosswalk-quality-report.json"
  ];
  const beforeGeneration = evaluateRepositoryScope(sourcePaths);
  const afterGeneration = evaluateRepositoryScope([...sourcePaths, ...generatedPaths]);
  assert.deepEqual(afterGeneration, beforeGeneration);
  assert.deepEqual(afterGeneration.generated_artifact_paths, generatedPaths);
  assert.deepEqual(afterGeneration.scope_input_paths, sourcePaths);
  assert.equal(afterGeneration.scope_passed, true);
  assert.equal(afterGeneration.importer_modified, false);
  assert.deepEqual(afterGeneration.unauthorized_paths, []);
});
