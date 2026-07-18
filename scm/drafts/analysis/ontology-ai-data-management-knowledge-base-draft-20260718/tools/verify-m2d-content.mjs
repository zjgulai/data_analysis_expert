import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const batchId = "m2d-agent-engineering-applications-ch07-ch08";
const at = (value) => resolve(root, value);
const paths = {
  build: resolve(__dirname, "build-m2d-content.mjs"), sectionMap: at("manifests/m2d-section-map.json"),
  cardSeeds: at("manifests/m2d-card-seeds.json"), termSeeds: at("manifests/m2d-term-seeds.json"),
  relationSeeds: at("manifests/m2d-relation-seeds.json"), visualReview: at("manifests/m2d-visual-review.json"),
  priorCards: [at("manifests/m2a-knowledge-card-manifest.json"), at("manifests/m2b-knowledge-card-manifest.json"), at("manifests/m2c-knowledge-card-manifest.json")],
  priorTerms: [at("manifests/m2b-knowledge-term-manifest.json"), at("manifests/m2c-knowledge-term-manifest.json")],
  priorRelations: [at("manifests/m2b-knowledge-relation-manifest.json"), at("manifests/m2c-knowledge-relation-manifest.json")],
  artifacts: at("01-source-map/figure-table-manifest.jsonl"), source: at("00-governance/source-manifest.json"),
  contentMap: at("05-agent-engineering-applications/00-agent-engineering-applications-content-map.md"),
  termTable: at("05-agent-engineering-applications/01-agent-application-terms.md"),
  relationTable: at("05-agent-engineering-applications/02-agent-application-relations.md"),
  cardsDir: at("05-agent-engineering-applications/cards"), spans: at("manifests/m2d-source-spans.json"),
  cardManifest: at("manifests/m2d-knowledge-card-manifest.json"), aggregateCards: at("manifests/knowledge-card-manifest.json"),
  termManifest: at("manifests/m2d-knowledge-term-manifest.json"), aggregateTerms: at("manifests/knowledge-term-manifest.json"),
  relationManifest: at("manifests/m2d-knowledge-relation-manifest.json"), aggregateRelations: at("manifests/knowledge-relation-manifest.json"),
  summary: at("manifests/m2d-batch-summary.json")
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
const priorCards = paths.priorCards.map(readJson);
const priorTerms = paths.priorTerms.map(readJson);
const priorRelations = paths.priorRelations.map(readJson);
const artifacts = readJsonl(paths.artifacts);
const source = readJson(paths.source);
const spans = readJson(paths.spans);
const cardManifest = readJson(paths.cardManifest);
const aggregateCards = readJson(paths.aggregateCards);
const termManifest = readJson(paths.termManifest);
const aggregateTerms = readJson(paths.aggregateTerms);
const relationManifest = readJson(paths.relationManifest);
const aggregateRelations = readJson(paths.aggregateRelations);
const summary = readJson(paths.summary);

assert(sectionMap.sections.length === 35, `expected 35 section records, received ${sectionMap.sections.length}`);
assert(sectionMap.sections.filter((section) => /^[78]\.\d+\.\d+$/.test(section.section_id)).length === 33, "expected 33 substantive subsections");
assert(sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length === 2, "expected two chapter summaries");
const sectionIds = sectionMap.sections.map((section) => section.section_id);
assert(new Set(sectionIds).size === 35, "section IDs must be unique");
const sectionIdSet = new Set(sectionIds);
const sectionById = new Map(sectionMap.sections.map((section) => [section.section_id, section]));
assert(sectionMap.sections.filter((section) => section.section_id.startsWith("7.")).length === 21, "chapter 7 section count mismatch");
assert(sectionMap.sections.filter((section) => section.section_id.startsWith("8.")).length === 14, "chapter 8 section count mismatch");
const allowedClaimTypes = new Set(["author_method", "author_mechanism", "author_decision_pattern", "author_action_pattern", "author_architecture", "author_implementation_path", "author_value_framework", "author_selection_rule", "author_application_pattern", "author_faq", "chapter_summary"]);
const artifactIds = new Set(artifacts.map((artifact) => artifact.artifact_id));
for (const section of sectionMap.sections) {
  assert(section.pdf_page_start >= 128 && section.pdf_page_end <= 178, `section outside page scope ${section.section_id}`);
  assert(section.pdf_page_start <= section.pdf_page_end, `inverted page range ${section.section_id}`);
  assert(allowedClaimTypes.has(section.claim_type), `unsupported claim type ${section.claim_type}`);
  assert(section.summary.length >= 25, `summary too short ${section.section_id}`);
  for (const id of section.figure_table_refs) assert(artifactIds.has(id), `unknown artifact ${id}`);
}

assert(visualReview.reviews.length === 11, `expected 11 visual reviews, received ${visualReview.reviews.length}`);
assert(visualReview.full_page_images_persisted === false, "visual review images must stay temporary");
for (const review of visualReview.reviews) {
  assert(review.status === "reviewed", `visual review incomplete p.${review.pdf_page}`);
  assert(review.pdf_page >= 128 && review.pdf_page <= 178, `visual review outside scope p.${review.pdf_page}`);
  for (const id of review.artifact_ids) assert(artifactIds.has(id), `visual review unknown artifact ${id}`);
}

assert(spans.span_count === 35 && spans.source_spans.length === 35, "source span count mismatch");
const spanById = new Map(spans.source_spans.map((span) => [span.span_id, span]));
assert(spanById.size === 35, "source span IDs must be unique");
for (const section of sectionMap.sections) {
  const span = spanById.get(spanId(section));
  assert(span?.section_id === section.section_id, `missing span ${section.section_id}`);
  assert(span.raw_text_persisted === false, `raw text persisted ${section.section_id}`);
}

const priorCardKeys = new Set(priorCards.flatMap((manifest) => manifest.cards.map((card) => card.semantic_key)));
assert(cardSeeds.cards.length === 23, `expected 23 card seeds, received ${cardSeeds.cards.length}`);
const newCardKeys = cardSeeds.cards.map((card) => card.semantic_key);
assert(new Set(newCardKeys).size === 23, "M2-D card keys must be unique");
for (const key of newCardKeys) assert(!priorCardKeys.has(key), `M2-D duplicates prior card ${key}`);
const allCardKeys = new Set([...priorCardKeys, ...newCardKeys]);
for (const seed of cardSeeds.cards) {
  assert(/^oadm:[a-z0-9-]+:[a-z0-9-]+$/.test(seed.semantic_key), `invalid card key ${seed.semantic_key}`);
  for (const id of seed.section_ids) assert(sectionIdSet.has(id), `card references missing section ${id}`);
  for (const key of seed.relation_candidates) assert(allCardKeys.has(key), `card ${seed.semantic_key} references unknown card ${key}`);
  const changed = { ...seed, core_conclusion: `${seed.core_conclusion} 内容哈希探针` };
  assert(cardId(seed) === cardId(changed), `card ID changes with content ${seed.semantic_key}`);
  assert(sha256(canonicalize(seed)) !== sha256(canonicalize(changed)), `card hash does not change ${seed.semantic_key}`);
}
assert(cardManifest.card_count === 23 && cardManifest.cards.length === 23, "M2-D card manifest count mismatch");
for (const record of cardManifest.cards) {
  const seed = cardSeeds.cards.find((candidate) => candidate.semantic_key === record.semantic_key);
  assert(record.card_id === cardId(seed), `card ID mismatch ${record.semantic_key}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `card hash mismatch ${record.semantic_key}`);
  for (const id of record.source_span_ids) assert(spanById.has(id), `card missing source span ${id}`);
  const content = readFileSync(at(record.relative_path), "utf8");
  assert(sha256(content) === record.file_hash, `card file hash mismatch ${record.card_id}`);
  assert(content.includes("尚未进行 SCM 适用性评估"), `SCM boundary missing ${record.card_id}`);
}
assert(readdirSync(paths.cardsDir).filter((name) => name.endsWith(".md")).length === 23, "expected exactly 23 M2-D cards");
assert(aggregateCards.manifest_scope === "aggregate-through-m2d" && aggregateCards.card_count === 71, "aggregate card count mismatch");
assert(new Set(aggregateCards.cards.map((card) => card.semantic_key)).size === 71, "aggregate card keys must be unique");

const priorTermKeys = new Set(priorTerms.flatMap((manifest) => manifest.terms.map((term) => term.term_key)));
assert(termSeeds.terms.length === 16, `expected 16 term seeds, received ${termSeeds.terms.length}`);
const newTermKeys = termSeeds.terms.map((term) => term.term_key);
assert(new Set(newTermKeys).size === 16, "M2-D term keys must be unique");
for (const key of newTermKeys) assert(!priorTermKeys.has(key), `M2-D duplicates prior term ${key}`);
for (const seed of termSeeds.terms) for (const id of seed.section_ids) assert(sectionIdSet.has(id), `term references missing section ${id}`);
assert(termManifest.term_count === 16 && termManifest.terms.length === 16, "M2-D term manifest count mismatch");
for (const record of termManifest.terms) {
  const seed = termSeeds.terms.find((candidate) => candidate.term_key === record.term_key);
  assert(record.term_id === termId(seed), `term ID mismatch ${record.term_key}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `term hash mismatch ${record.term_key}`);
}
assert(aggregateTerms.manifest_scope === "aggregate-through-m2d" && aggregateTerms.term_count === 60, "aggregate term count mismatch");
assert(new Set(aggregateTerms.terms.map((term) => term.term_key)).size === 60, "aggregate term keys must be unique");

assert(relationSeeds.relations.length === 46, `expected 46 relations, received ${relationSeeds.relations.length}`);
assert(relationManifest.relation_count === 46 && relationManifest.relations.length === 46, "M2-D relation manifest count mismatch");
const nodeKeys = new Set([...allCardKeys, ...priorTermKeys, ...newTermKeys]);
const edges = relationSeeds.relations.map((seed) => `${seed.subject_key}|${seed.predicate}|${seed.object_key}`);
assert(new Set(edges).size === 46, "M2-D relation edges must be unique");
const participatingCards = new Set();
for (const seed of relationSeeds.relations) {
  assert(nodeKeys.has(seed.subject_key), `relation missing subject ${seed.subject_key}`);
  assert(nodeKeys.has(seed.object_key), `relation missing object ${seed.object_key}`);
  assert(relationSeeds.allowed_predicates.includes(seed.predicate), `unsupported predicate ${seed.predicate}`);
  assert(seed.predicate !== "CANDIDATE_CROSSWALK", "M2-D must not create SCM crosswalks");
  for (const id of seed.section_ids) assert(sectionIdSet.has(id), `relation references missing section ${id}`);
  if (newCardKeys.includes(seed.subject_key)) participatingCards.add(seed.subject_key);
  if (newCardKeys.includes(seed.object_key)) participatingCards.add(seed.object_key);
}
assert(participatingCards.size === 23, `orphan M2-D cards in relation graph: ${23 - participatingCards.size}`);
for (const record of relationManifest.relations) {
  const seed = relationSeeds.relations.find((candidate) => relationId(candidate) === record.relation_id);
  assert(seed, `unknown relation ${record.relation_id}`);
  assert(record.relation_status === "candidate" && record.review_status === "pending", `relation boundary mismatch ${record.relation_id}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `relation hash mismatch ${record.relation_id}`);
}
assert(aggregateRelations.manifest_scope === "aggregate-through-m2d" && aggregateRelations.relation_count === 106, "aggregate relation count mismatch");
assert(new Set(aggregateRelations.relations.map((relation) => relation.relation_id)).size === 106, "aggregate relation IDs must be unique");

const contentMap = readFileSync(paths.contentMap, "utf8");
const termTable = readFileSync(paths.termTable, "utf8");
const relationTable = readFileSync(paths.relationTable, "utf8");
assert((contentMap.match(/^\| [78]\./gm) || []).length === 35, "content map row count mismatch");
assert((termTable.match(/^\| (?!---)/gm) || []).length === 17, "term table row count mismatch");
assert((relationTable.match(/^\| (?!---)/gm) || []).length === 47, "relation table row count mismatch");
assert(summary.section_record_count === 35 && summary.card_count === 23 && summary.term_count === 16 && summary.relation_count === 46, "summary count mismatch");
assert(summary.boundaries.author_metrics_independently_verified === false, "author metric boundary mismatch");
assert(summary.boundaries.scm_crosswalk_performed === false && summary.boundaries.database_write === false && summary.boundaries.provider_call === false, "side-effect boundary mismatch");

const policyPaths = [paths.sectionMap, paths.cardSeeds, paths.termSeeds, paths.relationSeeds, paths.visualReview, paths.spans, paths.cardManifest, paths.aggregateCards, paths.termManifest, paths.aggregateTerms, paths.relationManifest, paths.aggregateRelations, paths.summary, paths.contentMap, paths.termTable, paths.relationTable, ...cardManifest.cards.map((card) => at(card.relative_path))];
for (const path of policyPaths) {
  const content = readFileSync(path, "utf8");
  assert(!content.includes("/Users/"), `personal absolute path found in ${path}`);
  assert(!content.includes("桌面 - "), `personal desktop path found in ${path}`);
}
const deterministicPaths = [paths.spans, paths.cardManifest, paths.aggregateCards, paths.termManifest, paths.aggregateTerms, paths.relationManifest, paths.aggregateRelations, paths.summary, paths.contentMap, paths.termTable, paths.relationTable, ...cardManifest.cards.map((card) => at(card.relative_path))];
const before = snapshot(deterministicPaths);
execFileSync(process.execPath, [paths.build], { encoding: "utf8" });
const after = snapshot(deterministicPaths);
assert(JSON.stringify(before) === JSON.stringify(after), "M2-D outputs are not byte-stable across reruns");

if (args.has("--pdf")) {
  const pdfPath = resolve(args.get("--pdf"));
  assert(sha256(readFileSync(pdfPath)) === source.sha256, "PDF hash mismatch");
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  assert(Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]) === 211, "PDF page count mismatch");
}
if (args.has("--baseline-db") && args.has("--baseline-db-sha256")) assert(sha256(readFileSync(resolve(args.get("--baseline-db")))) === args.get("--baseline-db-sha256"), "baseline DB hash changed");
process.stdout.write(`${JSON.stringify({ status: "m2d_verification_passed", section_records: 35, substantive_subsections: 33, chapter_summaries: 2, source_spans: 35, cards: 23, terms: 16, relations: 46, relation_orphans: 0, aggregate_cards: 71, aggregate_terms: 60, aggregate_relations: 106, selected_visual_reviews: 11, stable_ids: true, deterministic_rerun: true, database_write: false, provider_call: false }, null, 2)}\n`);
