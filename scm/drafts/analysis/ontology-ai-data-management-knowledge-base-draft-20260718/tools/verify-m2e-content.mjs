import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const batchId = "m2e-agent-governance-future-enterprise-ch09-ch10";
const at = (value) => resolve(root, value);
const paths = {
  build: resolve(__dirname, "build-m2e-content.mjs"), sectionMap: at("manifests/m2e-section-map.json"),
  cardSeeds: at("manifests/m2e-card-seeds.json"), termSeeds: at("manifests/m2e-term-seeds.json"),
  relationSeeds: at("manifests/m2e-relation-seeds.json"), visualReview: at("manifests/m2e-visual-review.json"),
  sectionMaps: ["m2a", "m2b", "m2c", "m2d", "m2e"].map((id) => at(`manifests/${id}-section-map.json`)),
  priorCards: ["m2a", "m2b", "m2c", "m2d"].map((id) => at(`manifests/${id}-knowledge-card-manifest.json`)),
  priorTerms: ["m2b", "m2c", "m2d"].map((id) => at(`manifests/${id}-knowledge-term-manifest.json`)),
  priorRelations: ["m2b", "m2c", "m2d"].map((id) => at(`manifests/${id}-knowledge-relation-manifest.json`)),
  spanManifests: ["m2a", "m2b", "m2c", "m2d", "m2e"].map((id) => at(`manifests/${id}-source-spans.json`)),
  artifacts: at("01-source-map/figure-table-manifest.jsonl"), pageCoverage: at("01-source-map/page-coverage.jsonl"), source: at("00-governance/source-manifest.json"),
  contentMap: at("06-agent-governance-future-enterprise/00-agent-governance-future-enterprise-content-map.md"),
  termTable: at("06-agent-governance-future-enterprise/01-agent-governance-future-enterprise-terms.md"),
  relationTable: at("06-agent-governance-future-enterprise/02-agent-governance-future-enterprise-relations.md"),
  cardsDir: at("06-agent-governance-future-enterprise/cards"), spans: at("manifests/m2e-source-spans.json"),
  cardManifest: at("manifests/m2e-knowledge-card-manifest.json"), aggregateCards: at("manifests/knowledge-card-manifest.json"),
  termManifest: at("manifests/m2e-knowledge-term-manifest.json"), aggregateTerms: at("manifests/knowledge-term-manifest.json"),
  relationManifest: at("manifests/m2e-knowledge-relation-manifest.json"), aggregateRelations: at("manifests/knowledge-relation-manifest.json"),
  summary: at("manifests/m2e-batch-summary.json"), qualityJson: at("manifests/full-book-quality-report.json"),
  qualityMd: at("00-governance/full-book-coverage-quality-report.md")
};
const parseArgs = (argv) => { const result = new Map(); for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith("--")) { const value = argv[i + 1]; if (!value || value.startsWith("--")) result.set(argv[i], "true"); else { result.set(argv[i], value); i += 1; } } return result; };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => Array.isArray(value) ? `[${value.map(canonicalize).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}` : JSON.stringify(value);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readJsonl = (path) => readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const cardId = (seed) => `oadm-${seed.semantic_slug}-${sha256(seed.semantic_key).slice(0, 10)}`;
const termId = (seed) => `oadm-term-${seed.term_key.split(":").at(-1)}-${sha256(seed.term_key).slice(0, 8)}`;
const relationId = (seed) => `oadm-rel-${sha256(`${seed.subject_key}|${seed.predicate}|${seed.object_key}`).slice(0, 12)}`;
const spanId = (section) => `oadm-span-s${section.section_id.replaceAll(".", "-")}-p${String(section.pdf_page_start).padStart(3, "0")}-p${String(section.pdf_page_end).padStart(3, "0")}`;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const snapshot = (items) => Object.fromEntries(items.map((path) => [path, sha256(readFileSync(path))]));

const args = parseArgs(process.argv.slice(2));
execFileSync(process.execPath, [paths.build], { encoding: "utf8" });
const sectionMap = readJson(paths.sectionMap);
const cardSeeds = readJson(paths.cardSeeds);
const termSeeds = readJson(paths.termSeeds);
const relationSeeds = readJson(paths.relationSeeds);
const visualReview = readJson(paths.visualReview);
const sectionMaps = paths.sectionMaps.map(readJson);
const priorCards = paths.priorCards.map(readJson);
const priorTerms = paths.priorTerms.map(readJson);
const priorRelations = paths.priorRelations.map(readJson);
const artifacts = readJsonl(paths.artifacts);
const pages = readJsonl(paths.pageCoverage);
const source = readJson(paths.source);
const spans = readJson(paths.spans);
const allSpans = paths.spanManifests.map(readJson).flatMap((manifest) => manifest.source_spans);
const cardManifest = readJson(paths.cardManifest);
const aggregateCards = readJson(paths.aggregateCards);
const termManifest = readJson(paths.termManifest);
const aggregateTerms = readJson(paths.aggregateTerms);
const relationManifest = readJson(paths.relationManifest);
const aggregateRelations = readJson(paths.aggregateRelations);
const summary = readJson(paths.summary);
const quality = readJson(paths.qualityJson);

assert(sectionMap.batch_id === batchId, "M2-E batch ID mismatch");
assert(sectionMap.sections.length === 25, `expected 25 section records, received ${sectionMap.sections.length}`);
assert(sectionMap.sections.filter((section) => /^(9|10)\.\d+\.\d+$/.test(section.section_id)).length === 23, "expected 23 substantive subsections");
assert(sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length === 2, "expected two chapter summaries");
assert(sectionMap.sections.filter((section) => section.section_id.startsWith("9.")).length === 18, "chapter 9 section count mismatch");
assert(sectionMap.sections.filter((section) => section.section_id.startsWith("10.")).length === 7, "chapter 10 section count mismatch");
const sectionIds = sectionMap.sections.map((section) => section.section_id);
const sectionIdSet = new Set(sectionIds);
const sectionById = new Map(sectionMap.sections.map((section) => [section.section_id, section]));
assert(sectionIdSet.size === 25, "section IDs must be unique");
const allowedClaimTypes = new Set(["author_governance_context", "author_future_state", "author_integration_pattern", "author_trust_model", "author_trust_pattern", "author_control_pattern", "author_evidence_pattern", "author_incentive_pattern", "author_industry_example", "author_governance_framework", "author_technology_trend", "author_engineering_direction", "author_enterprise_model", "author_learning_model", "author_model_architecture", "author_operating_model", "author_organization_model", "author_management_framework", "chapter_summary"]);
const artifactIds = new Set(artifacts.map((artifact) => artifact.artifact_id));
for (const section of sectionMap.sections) {
  assert(section.pdf_page_start >= 179 && section.pdf_page_end <= 209, `section outside page scope ${section.section_id}`);
  assert(section.pdf_page_start <= section.pdf_page_end, `inverted page range ${section.section_id}`);
  assert(allowedClaimTypes.has(section.claim_type), `unsupported claim type ${section.claim_type}`);
  assert(section.summary.length >= 25, `summary too short ${section.section_id}`);
  for (const id of section.figure_table_refs) assert(artifactIds.has(id), `unknown artifact ${id}`);
}

assert(visualReview.reviews.length === 8, `expected 8 visual reviews, received ${visualReview.reviews.length}`);
assert(visualReview.full_page_images_persisted === false, "visual review images must stay temporary");
for (const review of visualReview.reviews) {
  assert(review.status === "reviewed", `visual review incomplete p.${review.pdf_page}`);
  assert(review.pdf_page >= 179 && review.pdf_page <= 199, `visual review outside selected scope p.${review.pdf_page}`);
  for (const id of review.artifact_ids) assert(artifactIds.has(id), `visual review unknown artifact ${id}`);
}
assert(spans.span_count === 25 && spans.source_spans.length === 25, "M2-E source span count mismatch");
const spanById = new Map(spans.source_spans.map((span) => [span.span_id, span]));
assert(spanById.size === 25, "M2-E source span IDs must be unique");
for (const section of sectionMap.sections) {
  const span = spanById.get(spanId(section));
  assert(span?.section_id === section.section_id, `missing span ${section.section_id}`);
  assert(span.raw_text_persisted === false, `raw text persisted ${section.section_id}`);
  assert(span.visual_review_status !== "pending", `M2-E referenced figure not reviewed ${section.section_id}`);
}

const priorCardKeys = new Set(priorCards.flatMap((manifest) => manifest.cards.map((card) => card.semantic_key)));
assert(cardSeeds.cards.length === 18, `expected 18 card seeds, received ${cardSeeds.cards.length}`);
const newCardKeys = cardSeeds.cards.map((card) => card.semantic_key);
assert(new Set(newCardKeys).size === 18, "M2-E card keys must be unique");
for (const key of newCardKeys) assert(!priorCardKeys.has(key), `M2-E duplicates prior card ${key}`);
const allCardKeys = new Set([...priorCardKeys, ...newCardKeys]);
for (const seed of cardSeeds.cards) {
  assert(/^oadm:[a-z0-9-]+:[a-z0-9-]+$/.test(seed.semantic_key), `invalid card key ${seed.semantic_key}`);
  for (const id of seed.section_ids) assert(sectionIdSet.has(id), `card references missing section ${id}`);
  for (const key of seed.relation_candidates) assert(allCardKeys.has(key), `card ${seed.semantic_key} references unknown card ${key}`);
  const changed = { ...seed, core_conclusion: `${seed.core_conclusion} 内容哈希探针` };
  assert(cardId(seed) === cardId(changed), `card ID changes with content ${seed.semantic_key}`);
  assert(sha256(canonicalize(seed)) !== sha256(canonicalize(changed)), `card hash does not change ${seed.semantic_key}`);
}
assert(cardManifest.card_count === 18 && cardManifest.cards.length === 18, "M2-E card manifest count mismatch");
for (const record of cardManifest.cards) {
  const seed = cardSeeds.cards.find((candidate) => candidate.semantic_key === record.semantic_key);
  assert(record.card_id === cardId(seed), `card ID mismatch ${record.semantic_key}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `card hash mismatch ${record.semantic_key}`);
  for (const id of record.source_span_ids) assert(spanById.has(id), `card missing source span ${id}`);
  const content = readFileSync(at(record.relative_path), "utf8");
  assert(sha256(content) === record.file_hash, `card file hash mismatch ${record.card_id}`);
  assert(content.includes("尚未进行 SCM 适用性评估"), `SCM boundary missing ${record.card_id}`);
}
assert(readdirSync(paths.cardsDir).filter((name) => name.endsWith(".md")).length === 18, "expected exactly 18 M2-E cards");
assert(aggregateCards.manifest_scope === "aggregate-through-m2e" && aggregateCards.card_count === 89, "aggregate card count mismatch");
assert(new Set(aggregateCards.cards.map((card) => card.semantic_key)).size === 89, "aggregate card keys must be unique");

const priorTermKeys = new Set(priorTerms.flatMap((manifest) => manifest.terms.map((term) => term.term_key)));
assert(termSeeds.terms.length === 21, `expected 21 term seeds, received ${termSeeds.terms.length}`);
const newTermKeys = termSeeds.terms.map((term) => term.term_key);
assert(new Set(newTermKeys).size === 21, "M2-E term keys must be unique");
for (const key of newTermKeys) assert(!priorTermKeys.has(key), `M2-E duplicates prior term ${key}`);
for (const seed of termSeeds.terms) for (const id of seed.section_ids) assert(sectionIdSet.has(id), `term references missing section ${id}`);
assert(termManifest.term_count === 21 && termManifest.terms.length === 21, "M2-E term manifest count mismatch");
for (const record of termManifest.terms) {
  const seed = termSeeds.terms.find((candidate) => candidate.term_key === record.term_key);
  assert(record.term_id === termId(seed), `term ID mismatch ${record.term_key}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `term hash mismatch ${record.term_key}`);
}
assert(aggregateTerms.manifest_scope === "aggregate-through-m2e" && aggregateTerms.term_count === 81, "aggregate term count mismatch");
assert(new Set(aggregateTerms.terms.map((term) => term.term_key)).size === 81, "aggregate term keys must be unique");

assert(relationSeeds.relations.length === 49, `expected 49 relations, received ${relationSeeds.relations.length}`);
assert(relationManifest.relation_count === 49 && relationManifest.relations.length === 49, "M2-E relation manifest count mismatch");
const nodeKeys = new Set([...allCardKeys, ...priorTermKeys, ...newTermKeys]);
const edges = relationSeeds.relations.map((seed) => `${seed.subject_key}|${seed.predicate}|${seed.object_key}`);
assert(new Set(edges).size === 49, "M2-E relation edges must be unique");
const participatingKeys = new Set();
for (const seed of relationSeeds.relations) {
  assert(nodeKeys.has(seed.subject_key), `relation missing subject ${seed.subject_key}`);
  assert(nodeKeys.has(seed.object_key), `relation missing object ${seed.object_key}`);
  assert(relationSeeds.allowed_predicates.includes(seed.predicate), `unsupported predicate ${seed.predicate}`);
  assert(seed.predicate !== "CANDIDATE_CROSSWALK", "M2-E must not create SCM crosswalks");
  for (const id of seed.section_ids) assert(sectionIdSet.has(id), `relation references missing section ${id}`);
  participatingKeys.add(seed.subject_key); participatingKeys.add(seed.object_key);
}
for (const key of [...newCardKeys, ...newTermKeys]) assert(participatingKeys.has(key), `orphan M2-E node ${key}`);
for (const record of relationManifest.relations) {
  const seed = relationSeeds.relations.find((candidate) => relationId(candidate) === record.relation_id);
  assert(seed, `unknown relation ${record.relation_id}`);
  assert(record.relation_status === "candidate" && record.review_status === "pending", `relation boundary mismatch ${record.relation_id}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `relation hash mismatch ${record.relation_id}`);
}
assert(aggregateRelations.manifest_scope === "aggregate-through-m2e" && aggregateRelations.relation_count === 155, "aggregate relation count mismatch");
assert(new Set(aggregateRelations.relations.map((relation) => relation.relation_id)).size === 155, "aggregate relation IDs must be unique");

const allSections = sectionMaps.flatMap((manifest) => manifest.sections);
const extractedSubsections = allSections.filter((section) => /^\d+\.\d+\.\d+$/.test(section.section_id)).map((section) => section.section_id);
const m1Subsections = [...new Set(pages.flatMap((page) => page.headings.filter((heading) => heading.kind === "subsection").map((heading) => heading.label.match(/^(\d+\.\d+\.\d+)\s/)?.[1]).filter(Boolean)))];
assert(allSections.length === 151, "full-book section record count mismatch");
assert(extractedSubsections.length === 141 && new Set(extractedSubsections).size === 141, "full-book subsection extraction mismatch");
assert(m1Subsections.length === 141, "M1 subsection baseline mismatch");
assert(m1Subsections.every((id) => extractedSubsections.includes(id)) && extractedSubsections.every((id) => m1Subsections.includes(id)), "M1 and M2 subsection coverage differ");
assert(allSections.filter((section) => section.claim_type === "chapter_summary").length === 10, "full-book chapter summary count mismatch");
assert(allSpans.length === 151 && new Set(allSpans.map((span) => span.span_id)).size === 151, "full-book source span integrity mismatch");

assert(quality.coverage.section_record_count === 151 && quality.coverage.substantive_subsection_count === 141 && quality.coverage.chapter_summary_count === 10, "quality coverage counts mismatch");
assert(quality.coverage.missing_subsection_ids.length === 0 && quality.coverage.unexpected_subsection_ids.length === 0, "quality report has uncovered sections");
assert(quality.inventory.card_count === 89 && quality.inventory.term_count === 81 && quality.inventory.relation_count === 155 && quality.inventory.source_span_count === 151, "quality inventory mismatch");
for (const values of Object.values(quality.exact_duplicates)) assert(values.length === 0, "quality report found exact duplicates");
assert(quality.semantic_duplicate_candidates.length === 0, "normalized title duplicate candidates require review");
assert(quality.relation_integrity.missing_subject_nodes.length === 0 && quality.relation_integrity.missing_object_nodes.length === 0, "quality report found missing relation nodes");
assert(quality.relation_integrity.m2e_orphan_card_keys.length === 0 && quality.relation_integrity.m2e_orphan_term_keys.length === 0, "quality report found M2-E orphan nodes");
assert(quality.relation_integrity.explicit_contradiction_edge_count === 1 && quality.relation_integrity.explicit_contradiction_relation_ids.length === 1, "explicit contradiction inventory mismatch");
assert(quality.relation_integrity.semantic_contradiction_review_status === "manual_review_required", "semantic contradiction boundary missing");
assert(quality.source_integrity.missing_card_source_span_ids.length === 0 && quality.source_integrity.missing_term_source_span_ids.length === 0 && quality.source_integrity.missing_relation_source_span_ids.length === 0, "quality report found missing source spans");
assert(quality.source_integrity.pending_visual_review_span_ids.length === 30, "pending visual span inventory drifted");
assert(quality.boundaries.semantic_equivalence_fully_proven === false && quality.boundaries.semantic_contradiction_fully_proven === false, "quality report overclaims semantic proof");
assert(quality.boundaries.scm_crosswalk_performed === false && quality.boundaries.database_write === false && quality.boundaries.provider_call === false, "quality side-effect boundary mismatch");

const contentMap = readFileSync(paths.contentMap, "utf8");
const termTable = readFileSync(paths.termTable, "utf8");
const relationTable = readFileSync(paths.relationTable, "utf8");
const qualityMd = readFileSync(paths.qualityMd, "utf8");
assert((contentMap.match(/^\| (?:9|10)\./gm) || []).length === 25, "content map row count mismatch");
assert((termTable.match(/^\| (?!---)/gm) || []).length === 22, "term table row count mismatch");
assert((relationTable.match(/^\| (?!---)/gm) || []).length === 50, "relation table row count mismatch");
assert(qualityMd.includes("141 个三级正文小节") && qualityMd.includes("不得直接导入数据库"), "quality report conclusion or gate missing");
assert(summary.section_record_count === 25 && summary.card_count === 18 && summary.term_count === 21 && summary.relation_count === 49, "M2-E summary count mismatch");
assert(summary.boundaries.blockchain_architecture_selected === false && summary.boundaries.industry_examples_independently_verified === false, "M2-E evidence boundary mismatch");
assert(summary.boundaries.scm_crosswalk_performed === false && summary.boundaries.database_write === false && summary.boundaries.provider_call === false, "M2-E side-effect boundary mismatch");

const policyPaths = [paths.sectionMap, paths.cardSeeds, paths.termSeeds, paths.relationSeeds, paths.visualReview, paths.spans, paths.cardManifest, paths.aggregateCards, paths.termManifest, paths.aggregateTerms, paths.relationManifest, paths.aggregateRelations, paths.summary, paths.qualityJson, paths.qualityMd, paths.contentMap, paths.termTable, paths.relationTable, ...cardManifest.cards.map((card) => at(card.relative_path))];
for (const path of policyPaths) {
  const content = readFileSync(path, "utf8");
  assert(!content.includes("/Users/"), `personal absolute path found in ${path}`);
  assert(!content.includes("桌面 - "), `personal desktop path found in ${path}`);
}
const deterministicPaths = [paths.spans, paths.cardManifest, paths.aggregateCards, paths.termManifest, paths.aggregateTerms, paths.relationManifest, paths.aggregateRelations, paths.summary, paths.qualityJson, paths.qualityMd, paths.contentMap, paths.termTable, paths.relationTable, ...cardManifest.cards.map((card) => at(card.relative_path))];
const before = snapshot(deterministicPaths);
execFileSync(process.execPath, [paths.build], { encoding: "utf8" });
const after = snapshot(deterministicPaths);
assert(JSON.stringify(before) === JSON.stringify(after), "M2-E outputs are not byte-stable across reruns");

if (args.has("--pdf")) {
  const pdfPath = resolve(args.get("--pdf"));
  assert(sha256(readFileSync(pdfPath)) === source.sha256, "PDF hash mismatch");
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  assert(Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]) === 211, "PDF page count mismatch");
}
if (args.has("--baseline-db") && args.has("--baseline-db-sha256")) assert(sha256(readFileSync(resolve(args.get("--baseline-db")))) === args.get("--baseline-db-sha256"), "baseline DB hash changed");
process.stdout.write(`${JSON.stringify({ status: "m2e_verification_passed", section_records: 25, substantive_subsections: 23, chapter_summaries: 2, source_spans: 25, cards: 18, terms: 21, relations: 49, relation_orphans: 0, aggregate_cards: 89, aggregate_terms: 81, aggregate_relations: 155, full_book_section_records: 151, full_book_subsections: 141, uncovered_subsections: 0, exact_duplicates: 0, normalized_title_duplicate_candidates: 0, explicit_contradiction_candidates: 1, pending_visual_review_spans: 30, selected_visual_reviews: 8, stable_ids: true, deterministic_rerun: true, database_write: false, provider_call: false }, null, 2)}\n`);
