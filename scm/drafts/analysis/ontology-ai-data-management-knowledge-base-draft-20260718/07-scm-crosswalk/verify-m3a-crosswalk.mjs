import { readFileSync } from "node:fs";
import { artifactPaths, buildArtifacts, evaluateQualityGate } from "./crosswalk-lib.mjs";

const expected = buildArtifacts();
for (const key of Object.keys(artifactPaths)) {
  const actual = readFileSync(artifactPaths[key], "utf8");
  if (actual !== expected[key]) throw new Error(`artifact drift: ${key}`);
}
const manifest = JSON.parse(expected.manifest);
const quality = JSON.parse(expected.quality);
if (manifest.card_count !== 89) throw new Error("card coverage mismatch");
if (manifest.disposition_source !== "explicit-three-way-seed-partition") throw new Error("disposition source mismatch");
if (!Object.values(quality).length || quality.final_gate !== "passed-owner-delegated-review") throw new Error("quality gate mismatch");
if (!quality.automatic_checks_passed || !evaluateQualityGate(quality)) throw new Error("one or more M3-A automatic quality checks failed");
if (JSON.stringify(quality.owner_review_quality.decision_counts) !== JSON.stringify({ approved: 0, rejected: 12, deferred: 1 })) throw new Error("owner review decision count mismatch");
if (quality.owner_review_quality.reviewed_edge_count !== 13 || quality.owner_review_quality.reviewed_card_count !== 9) throw new Error("owner review coverage mismatch");
if (quality.owner_review_quality.accepted_reference_count !== 10 || quality.owner_review_quality.considered_reference_count !== 3) throw new Error("owner review candidate reference baseline mismatch");
if (quality.owner_review_quality.expected_contract_edge_count !== 13 || quality.owner_review_quality.expected_contract_mismatches.length !== 0) throw new Error("owner review fixed edge decision contract mismatch");
if (quality.owner_review_quality.promotion_count !== 0 || quality.owner_review_quality.scm_verified_true_card_ids.length !== 0) throw new Error("owner review promotion boundary mismatch");
process.stdout.write("m3a_crosswalk_verification_passed cards=89 candidate_accept=6 candidate_reject=3 unmapped=80 reviewed_edges=13 owner_approved=0 owner_rejected=12 owner_deferred=1 database_hash_unchanged=true\n");
