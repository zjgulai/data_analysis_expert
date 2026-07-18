import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { artifactMatchesPage, artifactWithinPageRange, containsPersonalAbsolutePath } from "./verification-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const batchId = "m2c-engineering-method-ch06";
const pathAt = (value) => resolve(root, value);
const paths = {
  build: resolve(__dirname, "build-m2c-content.mjs"), sectionMap: pathAt("manifests/m2c-section-map.json"),
  cardSeeds: pathAt("manifests/m2c-card-seeds.json"), termSeeds: pathAt("manifests/m2c-term-seeds.json"),
  relationSeeds: pathAt("manifests/m2c-relation-seeds.json"), visualReview: pathAt("manifests/m2c-visual-review.json"),
  m2aCards: pathAt("manifests/m2a-knowledge-card-manifest.json"), m2bCards: pathAt("manifests/m2b-knowledge-card-manifest.json"),
  m2bTerms: pathAt("manifests/m2b-knowledge-term-manifest.json"), m2bRelations: pathAt("manifests/m2b-knowledge-relation-manifest.json"),
  artifacts: pathAt("01-source-map/figure-table-manifest.jsonl"), source: pathAt("00-governance/source-manifest.json"),
  contentMap: pathAt("04-engineering-methods/00-engineering-methods-content-map.md"),
  termTable: pathAt("04-engineering-methods/01-engineering-terms.md"), relationTable: pathAt("04-engineering-methods/02-engineering-workflow-relations.md"),
  cardsDirectory: pathAt("04-engineering-methods/cards"), spans: pathAt("manifests/m2c-source-spans.json"),
  cardManifest: pathAt("manifests/m2c-knowledge-card-manifest.json"),
  termManifest: pathAt("manifests/m2c-knowledge-term-manifest.json"),
  relationManifest: pathAt("manifests/m2c-knowledge-relation-manifest.json"),
  summary: pathAt("manifests/m2c-batch-summary.json")
};

const parseArgs = (argv) => {
  const result = new Map();
  for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith("--")) {
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) result.set(argv[i], "true"); else { result.set(argv[i], value); i += 1; }
  }
  return result;
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => Array.isArray(value) ? `[${value.map(canonicalize).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}` : JSON.stringify(value);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readJsonl = (path) => readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
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
const m2aCards = readJson(paths.m2aCards);
const m2bCards = readJson(paths.m2bCards);
const m2bTerms = readJson(paths.m2bTerms);
const m2bRelations = readJson(paths.m2bRelations);
const artifacts = readJsonl(paths.artifacts);
const source = readJson(paths.source);
const spans = readJson(paths.spans);
const cardManifest = readJson(paths.cardManifest);
const termManifest = readJson(paths.termManifest);
const relationManifest = readJson(paths.relationManifest);
const summary = readJson(paths.summary);

assert(sectionMap.sections.length === 18, `expected 18 section records, received ${sectionMap.sections.length}`);
assert(sectionMap.sections.filter((section) => /^6\.\d+\.\d+$/.test(section.section_id)).length === 17, "expected 17 substantive subsections");
assert(sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length === 1, "expected one chapter summary");
const sectionIds = sectionMap.sections.map((section) => section.section_id);
assert(new Set(sectionIds).size === 18, "section IDs must be unique");
const sectionIdSet = new Set(sectionIds);
const sectionById = new Map(sectionMap.sections.map((section) => [section.section_id, section]));
const allowedClaimTypes = new Set(["author_method", "author_quality_gate", "author_governance_rule", "author_platform_capability", "author_implementation_path", "chapter_summary"]);
const artifactById = new Map(artifacts.map((artifact) => [artifact.artifact_id, artifact]));
const artifactIdSet = new Set(artifactById.keys());
for (const section of sectionMap.sections) {
  assert(section.pdf_page_start >= 96 && section.pdf_page_end <= 127, `section ${section.section_id} outside page scope`);
  assert(section.pdf_page_start <= section.pdf_page_end, `section ${section.section_id} has inverted pages`);
  assert(allowedClaimTypes.has(section.claim_type), `unsupported claim type ${section.claim_type}`);
  assert(section.summary.length >= 25, `summary too short ${section.section_id}`);
  for (const artifactId of section.figure_table_refs) {
    assert(artifactIdSet.has(artifactId), `unknown artifact ${artifactId}`);
    assert(artifactWithinPageRange(artifactById.get(artifactId), section.pdf_page_start, section.pdf_page_end), `section ${section.section_id} references ${artifactId} outside its page range`);
  }
}

assert(visualReview.reviews.length === 7, `expected 7 selected visual reviews, received ${visualReview.reviews.length}`);
assert(visualReview.full_page_images_persisted === false, "visual review images must stay temporary");
for (const review of visualReview.reviews) {
  assert(review.status === "reviewed", `visual review incomplete at p.${review.pdf_page}`);
  assert(review.pdf_page >= 96 && review.pdf_page <= 127, `visual review outside scope p.${review.pdf_page}`);
  for (const id of review.artifact_ids) {
    assert(artifactIdSet.has(id), `visual review references unknown artifact ${id}`);
    assert(artifactMatchesPage(artifactById.get(id), review.pdf_page), `visual review page mismatch for ${id}`);
  }
}

assert(spans.span_count === 18 && spans.source_spans.length === 18, "source span count mismatch");
const spanById = new Map(spans.source_spans.map((span) => [span.span_id, span]));
assert(spanById.size === 18, "source span IDs must be unique");
for (const section of sectionMap.sections) {
  const span = spanById.get(spanId(section));
  assert(span?.section_id === section.section_id, `missing or mismatched span ${section.section_id}`);
  assert(span.raw_text_persisted === false, `raw source text persisted ${section.section_id}`);
}

const priorCardKeys = new Set([...m2aCards.cards, ...m2bCards.cards].map((card) => card.semantic_key));
assert(cardSeeds.cards.length === 12, `expected 12 card seeds, received ${cardSeeds.cards.length}`);
const newCardKeys = cardSeeds.cards.map((card) => card.semantic_key);
assert(new Set(newCardKeys).size === 12, "M2-C card semantic keys must be unique");
for (const key of newCardKeys) assert(!priorCardKeys.has(key), `M2-C duplicates prior card ${key}`);
const allCardKeys = new Set([...priorCardKeys, ...newCardKeys]);
for (const seed of cardSeeds.cards) {
  assert(/^oadm:[a-z0-9-]+:[a-z0-9-]+$/.test(seed.semantic_key), `invalid card key ${seed.semantic_key}`);
  for (const id of seed.section_ids) assert(sectionIdSet.has(id), `card ${seed.semantic_key} references missing section ${id}`);
  for (const target of seed.relation_candidates) assert(allCardKeys.has(target), `card ${seed.semantic_key} references unknown card ${target}`);
  const changed = { ...seed, core_conclusion: `${seed.core_conclusion} 内容哈希探针` };
  assert(cardId(seed) === cardId(changed), `card ID changes with content ${seed.semantic_key}`);
  assert(sha256(canonicalize(seed)) !== sha256(canonicalize(changed)), `card content hash does not change ${seed.semantic_key}`);
}
assert(cardManifest.card_count === 12 && cardManifest.cards.length === 12, "M2-C card manifest count mismatch");
for (const record of cardManifest.cards) {
  const seed = cardSeeds.cards.find((candidate) => candidate.semantic_key === record.semantic_key);
  assert(record.card_id === cardId(seed), `card ID mismatch ${record.semantic_key}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `card content hash mismatch ${record.semantic_key}`);
  for (const id of record.source_span_ids) assert(spanById.has(id), `card source span missing ${id}`);
  const content = readFileSync(pathAt(record.relative_path), "utf8");
  assert(sha256(content) === record.file_hash, `card file hash mismatch ${record.card_id}`);
  assert(content.includes("尚未进行 SCM 适用性评估"), `SCM boundary missing ${record.card_id}`);
}
assert(readdirSync(paths.cardsDirectory).filter((name) => name.endsWith(".md")).length === 12, "expected exactly 12 M2-C card files");
const aggregateCards = [...m2aCards.cards, ...m2bCards.cards, ...cardManifest.cards];
assert(aggregateCards.length === 48, "in-memory aggregate card count mismatch");
assert(m2bCards.card_count === 24 && cardManifest.card_count === 12, "aggregate card batch count mismatch");
assert(new Set(aggregateCards.map((card) => card.semantic_key)).size === 48, "aggregate card keys must be unique");

assert(termSeeds.terms.length === 11, `expected 11 term seeds, received ${termSeeds.terms.length}`);
const priorTermKeys = new Set(m2bTerms.terms.map((term) => term.term_key));
const termKeys = termSeeds.terms.map((term) => term.term_key);
assert(new Set(termKeys).size === 11, "M2-C term keys must be unique");
for (const key of termKeys) assert(!priorTermKeys.has(key), `M2-C duplicates prior term ${key}`);
for (const seed of termSeeds.terms) for (const id of seed.section_ids) assert(sectionIdSet.has(id), `term ${seed.term_key} references missing section ${id}`);
assert(termManifest.term_count === 11 && termManifest.terms.length === 11, "M2-C term manifest count mismatch");
for (const record of termManifest.terms) {
  const seed = termSeeds.terms.find((candidate) => candidate.term_key === record.term_key);
  assert(record.term_id === termId(seed), `term ID mismatch ${record.term_key}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `term hash mismatch ${record.term_key}`);
}
const aggregateTerms = [...m2bTerms.terms, ...termManifest.terms];
assert(aggregateTerms.length === 44, "in-memory aggregate term count mismatch");
assert(new Set(aggregateTerms.map((term) => term.term_key)).size === 44, "aggregate term keys must be unique");

assert(relationSeeds.relations.length === 24, `expected 24 relation seeds, received ${relationSeeds.relations.length}`);
assert(relationManifest.relation_count === 24 && relationManifest.relations.length === 24, "M2-C relation manifest count mismatch");
const nodeKeys = new Set([...allCardKeys, ...priorTermKeys, ...termKeys]);
const edgeKeys = relationSeeds.relations.map((seed) => `${seed.subject_key}|${seed.predicate}|${seed.object_key}`);
assert(new Set(edgeKeys).size === 24, "M2-C relation edges must be unique");
const participatingCards = new Set();
for (const seed of relationSeeds.relations) {
  assert(nodeKeys.has(seed.subject_key), `relation missing subject ${seed.subject_key}`);
  assert(nodeKeys.has(seed.object_key), `relation missing object ${seed.object_key}`);
  assert(relationSeeds.allowed_predicates.includes(seed.predicate), `unsupported predicate ${seed.predicate}`);
  assert(seed.predicate !== "CANDIDATE_CROSSWALK", "M2-C must not create SCM crosswalks");
  for (const id of seed.section_ids) assert(sectionIdSet.has(id), `relation references missing section ${id}`);
  if (newCardKeys.includes(seed.subject_key)) participatingCards.add(seed.subject_key);
  if (newCardKeys.includes(seed.object_key)) participatingCards.add(seed.object_key);
}
assert(participatingCards.size === 12, `orphan M2-C cards in relation graph: ${12 - participatingCards.size}`);
for (const record of relationManifest.relations) {
  const seed = relationSeeds.relations.find((candidate) => relationId(candidate) === record.relation_id);
  assert(seed, `unknown relation record ${record.relation_id}`);
  assert(record.relation_status === "candidate" && record.review_status === "pending", `relation boundary mismatch ${record.relation_id}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `relation hash mismatch ${record.relation_id}`);
}
const aggregateRelations = [...m2bRelations.relations, ...relationManifest.relations];
assert(aggregateRelations.length === 60, "in-memory aggregate relation count mismatch");
assert(m2bRelations.relation_count === 36 && relationManifest.relation_count === 24, "aggregate relation batch count mismatch");
assert(new Set(aggregateRelations.map((relation) => relation.relation_id)).size === 60, "aggregate relation IDs must be unique");

const contentMap = readFileSync(paths.contentMap, "utf8");
const termTable = readFileSync(paths.termTable, "utf8");
const relationTable = readFileSync(paths.relationTable, "utf8");
assert((contentMap.match(/^\| 6\./gm) || []).length === 18, "content map row count mismatch");
assert((termTable.match(/^\| (?!---)/gm) || []).length === 12, "term table row count mismatch");
assert((relationTable.match(/^\| (?!---)/gm) || []).length === 25, "relation table row count mismatch");
assert(summary.section_record_count === 18 && summary.card_count === 12 && summary.term_count === 11 && summary.relation_count === 24, "batch summary count mismatch");
assert(summary.boundaries.scm_crosswalk_performed === false && summary.boundaries.database_write === false && summary.boundaries.provider_call === false, "side-effect boundary mismatch");

const policyPaths = [paths.sectionMap, paths.cardSeeds, paths.termSeeds, paths.relationSeeds, paths.visualReview, paths.spans, paths.cardManifest, paths.termManifest, paths.relationManifest, paths.summary, paths.contentMap, paths.termTable, paths.relationTable, ...cardManifest.cards.map((card) => pathAt(card.relative_path))];
for (const path of policyPaths) {
  const content = readFileSync(path, "utf8");
  assert(!containsPersonalAbsolutePath(content), `personal absolute path found in ${path}`);
}
const deterministicPaths = [paths.spans, paths.cardManifest, paths.termManifest, paths.relationManifest, paths.summary, paths.contentMap, paths.termTable, paths.relationTable, ...cardManifest.cards.map((card) => pathAt(card.relative_path))];
const before = snapshot(deterministicPaths);
execFileSync(process.execPath, [paths.build], { encoding: "utf8" });
const after = snapshot(deterministicPaths);
assert(JSON.stringify(before) === JSON.stringify(after), "M2-C generated outputs are not byte-stable across reruns");

if (args.has("--pdf")) {
  const pdfPath = resolve(args.get("--pdf"));
  assert(sha256(readFileSync(pdfPath)) === source.sha256, "PDF hash mismatch");
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  assert(Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]) === 211, "PDF page count mismatch");
}
if (args.has("--baseline-db") && args.has("--baseline-db-sha256")) {
  assert(sha256(readFileSync(resolve(args.get("--baseline-db")))) === args.get("--baseline-db-sha256"), "baseline DB hash changed");
}
process.stdout.write(`${JSON.stringify({
  status: "m2c_verification_passed", section_records: 18, substantive_subsections: 17, chapter_summaries: 1,
  source_spans: 18, cards: 12, terms: 11, relations: 24, relation_orphans: 0,
  aggregate_cards: 48, aggregate_terms: 44, aggregate_relations: 60,
  selected_visual_reviews: 7, stable_ids: true, deterministic_rerun: true, database_write: false, provider_call: false
}, null, 2)}\n`);
