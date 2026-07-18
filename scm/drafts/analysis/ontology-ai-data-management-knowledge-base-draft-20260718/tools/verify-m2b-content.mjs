import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const buildScriptPath = resolve(__dirname, "build-m2b-content.mjs");
const sectionMapPath = resolve(root, "manifests/m2b-section-map.json");
const cardSeedsPath = resolve(root, "manifests/m2b-card-seeds.json");
const termSeedsPath = resolve(root, "manifests/m2b-term-seeds.json");
const relationSeedsPath = resolve(root, "manifests/m2b-relation-seeds.json");
const visualReviewPath = resolve(root, "manifests/m2b-visual-review.json");
const m2aCardManifestPath = resolve(root, "manifests/m2a-knowledge-card-manifest.json");
const artifactManifestPath = resolve(root, "01-source-map/figure-table-manifest.jsonl");
const sourceManifestPath = resolve(root, "00-governance/source-manifest.json");
const contentMapPath = resolve(root, "03-core-theory/00-core-theory-content-map.md");
const termTablePath = resolve(root, "03-core-theory/01-terms-and-synonyms.md");
const relationTablePath = resolve(root, "03-core-theory/02-core-framework-relations.md");
const cardsDirectory = resolve(root, "03-core-theory/cards");
const sourceSpansPath = resolve(root, "manifests/m2b-source-spans.json");
const cardManifestPath = resolve(root, "manifests/m2b-knowledge-card-manifest.json");
const aggregateCardManifestPath = resolve(root, "manifests/knowledge-card-manifest.json");
const batchTermManifestPath = resolve(root, "manifests/m2b-knowledge-term-manifest.json");
const termManifestPath = resolve(root, "manifests/knowledge-term-manifest.json");
const batchRelationManifestPath = resolve(root, "manifests/m2b-knowledge-relation-manifest.json");
const relationManifestPath = resolve(root, "manifests/knowledge-relation-manifest.json");
const batchSummaryPath = resolve(root, "manifests/m2b-batch-summary.json");

function parseArgs(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) result.set(argument, "true");
    else {
      result.set(argument, value);
      index += 1;
    }
  }
  return result;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readJsonl(path) {
  return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function cardId(seed) {
  return `oadm-${seed.semantic_slug}-${sha256(seed.semantic_key).slice(0, 10)}`;
}

function termId(seed) {
  return `oadm-term-${seed.term_key.split(":").at(-1)}-${sha256(seed.term_key).slice(0, 8)}`;
}

function relationId(seed) {
  return `oadm-rel-${sha256(`${seed.subject_key}|${seed.predicate}|${seed.object_key}`).slice(0, 12)}`;
}

function spanId(section) {
  return `oadm-span-s${section.section_id.replaceAll(".", "-")}-p${String(section.pdf_page_start).padStart(3, "0")}-p${String(section.pdf_page_end).padStart(3, "0")}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function snapshot(paths) {
  return Object.fromEntries(paths.map((path) => [path, sha256(readFileSync(path))]));
}

const args = parseArgs(process.argv.slice(2));
execFileSync(process.execPath, [buildScriptPath], { encoding: "utf8" });

const sectionMap = readJson(sectionMapPath);
const cardSeeds = readJson(cardSeedsPath);
const termSeeds = readJson(termSeedsPath);
const relationSeeds = readJson(relationSeedsPath);
const visualReview = readJson(visualReviewPath);
const m2aCardManifest = readJson(m2aCardManifestPath);
const sourceManifest = readJson(sourceManifestPath);
const artifacts = readJsonl(artifactManifestPath);
const sourceSpans = readJson(sourceSpansPath);
const cardManifest = readJson(cardManifestPath);
const aggregateCardManifest = readJson(aggregateCardManifestPath);
const termManifest = readJson(termManifestPath);
const batchTermManifest = readJson(batchTermManifestPath);
const relationManifest = readJson(relationManifestPath);
const batchRelationManifest = readJson(batchRelationManifestPath);
const batchSummary = readJson(batchSummaryPath);

const artifactIds = new Set(artifacts.map((artifact) => artifact.artifact_id));
assert(sectionMap.sections.length === 38, `expected 38 section records, received ${sectionMap.sections.length}`);
assert(sectionMap.sections.filter((section) => /^\d+\.\d+\.\d+$/.test(section.section_id)).length === 36, "expected 36 substantive subsection records");
assert(sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length === 2, "expected 2 chapter summaries");
const sectionIds = sectionMap.sections.map((section) => section.section_id);
assert(new Set(sectionIds).size === 38, "section IDs must be unique");
const sectionIdSet = new Set(sectionIds);
const sectionById = new Map(sectionMap.sections.map((section) => [section.section_id, section]));
const chapterCounts = Object.fromEntries([...new Set(sectionMap.sections.map((section) => section.chapter))].map((chapter) => [chapter.match(/第 (\d+) 章/)?.[1], sectionMap.sections.filter((section) => section.chapter === chapter).length]));
assert(JSON.stringify(chapterCounts) === JSON.stringify({ "4": 15, "5": 23 }), `unexpected chapter counts ${JSON.stringify(chapterCounts)}`);

const allowedClaimTypes = new Set(["author_argument", "author_framework", "author_governance_rule", "author_mechanism", "author_standard_mapping", "chapter_summary"]);
for (const section of sectionMap.sections) {
  assert(section.pdf_page_start >= 53 && section.pdf_page_end <= 95, `section ${section.section_id} outside M2-B page scope`);
  assert(section.pdf_page_start <= section.pdf_page_end, `section ${section.section_id} has inverted page range`);
  assert(allowedClaimTypes.has(section.claim_type), `unsupported claim type ${section.claim_type}`);
  assert(section.summary.length >= 25, `section ${section.section_id} summary is too short`);
  for (const artifactId of section.figure_table_refs) assert(artifactIds.has(artifactId), `unknown artifact ${artifactId} in section ${section.section_id}`);
}

assert(visualReview.reviews.length === 11, `expected 11 visual page reviews, received ${visualReview.reviews.length}`);
assert(visualReview.full_page_images_persisted === false, "visual review images must remain temporary");
for (const review of visualReview.reviews) {
  assert(review.status === "reviewed", `visual review PDF p.${review.pdf_page} is incomplete`);
  assert(review.pdf_page >= 53 && review.pdf_page <= 95, `visual review PDF p.${review.pdf_page} outside scope`);
  for (const artifactId of review.artifact_ids) assert(artifactIds.has(artifactId), `visual review references unknown artifact ${artifactId}`);
}
const page91Review = visualReview.reviews.find((review) => review.pdf_page === 91);
assert(page91Review?.finding.includes("待出版源确认"), "PDF p.91 table-caption ambiguity must remain explicit");

assert(sourceSpans.span_count === 38 && sourceSpans.source_spans.length === 38, "source span count mismatch");
const spanById = new Map(sourceSpans.source_spans.map((span) => [span.span_id, span]));
assert(spanById.size === 38, "source span IDs must be unique");
for (const section of sectionMap.sections) {
  const expectedId = spanId(section);
  const span = spanById.get(expectedId);
  assert(span, `missing source span ${expectedId}`);
  assert(span.section_id === section.section_id, `source span section mismatch ${expectedId}`);
  assert(span.pdf_page_start === section.pdf_page_start && span.pdf_page_end === section.pdf_page_end, `source span page mismatch ${expectedId}`);
  assert(span.raw_text_persisted === false, `source span raw text flag must be false ${expectedId}`);
}

assert(cardSeeds.cards.length === 24, `expected 24 card seeds, received ${cardSeeds.cards.length}`);
const m2aSemanticKeys = new Set(m2aCardManifest.cards.map((card) => card.semantic_key));
const m2bSemanticKeys = cardSeeds.cards.map((card) => card.semantic_key);
assert(new Set(m2bSemanticKeys).size === 24, "M2-B semantic keys must be unique");
for (const key of m2bSemanticKeys) assert(!m2aSemanticKeys.has(key), `M2-B duplicates M2-A semantic key ${key}`);
const allCardKeys = new Set([...m2aSemanticKeys, ...m2bSemanticKeys]);
for (const seed of cardSeeds.cards) {
  assert(/^oadm:[a-z0-9-]+:[a-z0-9-]+$/.test(seed.semantic_key), `invalid semantic key ${seed.semantic_key}`);
  assert(seed.section_ids.length > 0, `card ${seed.semantic_key} lacks source sections`);
  for (const sectionId of seed.section_ids) assert(sectionIdSet.has(sectionId), `card ${seed.semantic_key} references missing section ${sectionId}`);
  for (const target of seed.relation_candidates) assert(allCardKeys.has(target), `card ${seed.semantic_key} references unknown card ${target}`);
  const changed = { ...seed, core_conclusion: `${seed.core_conclusion} 内容哈希探针` };
  assert(cardId(seed) === cardId(changed), `card ID changes with content for ${seed.semantic_key}`);
  assert(sha256(canonicalize(seed)) !== sha256(canonicalize(changed)), `card content hash fails to change for ${seed.semantic_key}`);
}
const calculatedCardIds = cardSeeds.cards.map(cardId);
assert(new Set(calculatedCardIds).size === 24, "calculated card IDs must be unique");
assert(JSON.stringify([...cardSeeds.cards].reverse().map(cardId).sort()) === JSON.stringify([...calculatedCardIds].sort()), "card IDs depend on seed ordering");
assert(cardManifest.card_count === 24 && cardManifest.cards.length === 24, "M2-B card manifest count mismatch");
for (const record of cardManifest.cards) {
  const seed = cardSeeds.cards.find((candidate) => candidate.semantic_key === record.semantic_key);
  assert(seed, `missing seed for card ${record.card_id}`);
  assert(record.card_id === cardId(seed), `card ID mismatch ${record.card_id}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `card content hash mismatch ${record.card_id}`);
  for (const sourceSpanId of record.source_span_ids) assert(spanById.has(sourceSpanId), `card ${record.card_id} has missing source span ${sourceSpanId}`);
  const cardContent = readFileSync(resolve(root, record.relative_path), "utf8");
  assert(sha256(cardContent) === record.file_hash, `card file hash mismatch ${record.card_id}`);
  assert(cardContent.includes("尚未进行 SCM 适用性评估"), `SCM boundary missing ${record.card_id}`);
}
assert(readdirSync(cardsDirectory).filter((name) => name.endsWith(".md")).length === 24, "expected exactly 24 generated M2-B card files");
assert(aggregateCardManifest.card_count === 36 && aggregateCardManifest.cards.length === 36, "aggregate card manifest must contain 36 cards through M2-B");
assert(new Set(aggregateCardManifest.cards.map((card) => card.card_id)).size === 36, "aggregate card IDs must be unique");
assert(new Set(aggregateCardManifest.cards.map((card) => card.semantic_key)).size === 36, "aggregate semantic keys must be unique");
assert(aggregateCardManifest.batch_counts["m2a-strategic-cognition-ch01-ch03"] === 12, "aggregate M2-A count mismatch");
assert(aggregateCardManifest.batch_counts["m2b-core-theory-ch04-ch05"] === 24, "aggregate M2-B count mismatch");

assert(termSeeds.terms.length === 33, `expected 33 term seeds, received ${termSeeds.terms.length}`);
const termKeys = termSeeds.terms.map((term) => term.term_key);
const preferredLabels = termSeeds.terms.map((term) => term.preferred_label);
assert(new Set(termKeys).size === 33, "term keys must be unique");
assert(new Set(preferredLabels).size === 33, "preferred term labels must be unique");
for (const seed of termSeeds.terms) {
  for (const sectionId of seed.section_ids) assert(sectionIdSet.has(sectionId), `term ${seed.term_key} references missing section ${sectionId}`);
  const changed = { ...seed, definition: `${seed.definition} 内容哈希探针` };
  assert(termId(seed) === termId(changed), `term ID changes with content ${seed.term_key}`);
  assert(sha256(canonicalize(seed)) !== sha256(canonicalize(changed)), `term content hash fails to change ${seed.term_key}`);
}
assert(termManifest.term_count === 33 && termManifest.terms.length === 33, "term manifest count mismatch");
assert(JSON.stringify(batchTermManifest) === JSON.stringify(termManifest), "M2-B batch term manifest must match aggregate-through-M2-B manifest");
const termKeySet = new Set(termKeys);
for (const record of termManifest.terms) {
  const seed = termSeeds.terms.find((candidate) => candidate.term_key === record.term_key);
  assert(record.term_id === termId(seed), `term ID mismatch ${record.term_key}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `term hash mismatch ${record.term_key}`);
  for (const sourceSpanId of record.source_span_ids) assert(spanById.has(sourceSpanId), `term ${record.term_key} has missing source span ${sourceSpanId}`);
}

assert(relationSeeds.relations.length === 36, `expected 36 relation seeds, received ${relationSeeds.relations.length}`);
assert(relationManifest.relation_count === 36 && relationManifest.relations.length === 36, "relation manifest count mismatch");
assert(JSON.stringify(batchRelationManifest) === JSON.stringify(relationManifest), "M2-B batch relation manifest must match aggregate-through-M2-B manifest");
const nodeKeys = new Set([...allCardKeys, ...termKeySet]);
const edgeKeys = relationSeeds.relations.map((seed) => `${seed.subject_key}|${seed.predicate}|${seed.object_key}`);
assert(new Set(edgeKeys).size === 36, "relation edges must be unique");
const participatingM2bCardKeys = new Set();
for (const seed of relationSeeds.relations) {
  assert(nodeKeys.has(seed.subject_key), `relation has missing subject ${seed.subject_key}`);
  assert(nodeKeys.has(seed.object_key), `relation has missing object ${seed.object_key}`);
  assert(relationSeeds.allowed_predicates.includes(seed.predicate), `relation has unsupported predicate ${seed.predicate}`);
  assert(seed.predicate !== "CANDIDATE_CROSSWALK", "M2-B must not create SCM crosswalks");
  for (const sectionId of seed.section_ids) assert(sectionIdSet.has(sectionId), `relation references missing section ${sectionId}`);
  if (m2bSemanticKeys.includes(seed.subject_key)) participatingM2bCardKeys.add(seed.subject_key);
  if (m2bSemanticKeys.includes(seed.object_key)) participatingM2bCardKeys.add(seed.object_key);
}
assert(participatingM2bCardKeys.size === 24, `orphan M2-B cards in relation graph: ${24 - participatingM2bCardKeys.size}`);
for (const record of relationManifest.relations) {
  const seed = relationSeeds.relations.find((candidate) => relationId(candidate) === record.relation_id);
  assert(seed, `relation manifest contains unknown relation ${record.relation_id}`);
  assert(record.relation_status === "candidate" && record.review_status === "pending", `relation boundary mismatch ${record.relation_id}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `relation content hash mismatch ${record.relation_id}`);
  for (const sourceSpanId of record.source_span_ids) assert(spanById.has(sourceSpanId), `relation ${record.relation_id} has missing source span ${sourceSpanId}`);
}

const contentMap = readFileSync(contentMapPath, "utf8");
const termTable = readFileSync(termTablePath, "utf8");
const relationTable = readFileSync(relationTablePath, "utf8");
assert((contentMap.match(/^\| [45]\./gm) || []).length === 38, "content map must contain 38 section rows");
assert((termTable.match(/^\| (?!---)/gm) || []).length === 34, "term table must contain one header and 33 term rows");
assert((relationTable.match(/^\| (?!---)/gm) || []).length === 37, "relation table must contain one header and 36 relation rows");
assert(contentMap.includes("待出版源确认"), "p.91 caption ambiguity missing from content map");

assert(batchSummary.section_record_count === 38 && batchSummary.card_count === 24 && batchSummary.term_count === 33 && batchSummary.relation_count === 36, "batch summary counts mismatch");
assert(batchSummary.boundaries.author_examples_independently_verified === false, "author example boundary mismatch");
assert(batchSummary.boundaries.official_standards_verified === false, "official standard boundary mismatch");
assert(batchSummary.boundaries.scm_crosswalk_performed === false, "SCM crosswalk boundary mismatch");
assert(batchSummary.boundaries.database_write === false && batchSummary.boundaries.provider_call === false, "side-effect boundary mismatch");

const policyScanPaths = [sectionMapPath, cardSeedsPath, termSeedsPath, relationSeedsPath, visualReviewPath, sourceSpansPath, cardManifestPath, aggregateCardManifestPath, termManifestPath, relationManifestPath, batchSummaryPath, contentMapPath, termTablePath, relationTablePath, ...cardManifest.cards.map((card) => resolve(root, card.relative_path))];
for (const path of policyScanPaths) {
  const content = readFileSync(path, "utf8");
  assert(!content.includes("/Users/"), `personal absolute path found in ${path}`);
  assert(!content.includes("桌面 - "), `personal desktop path found in ${path}`);
}

const deterministicPaths = [sourceSpansPath, cardManifestPath, aggregateCardManifestPath, termManifestPath, relationManifestPath, batchSummaryPath, contentMapPath, termTablePath, relationTablePath, ...cardManifest.cards.map((card) => resolve(root, card.relative_path))];
const beforeRerun = snapshot(deterministicPaths);
execFileSync(process.execPath, [buildScriptPath], { encoding: "utf8" });
const afterRerun = snapshot(deterministicPaths);
assert(JSON.stringify(beforeRerun) === JSON.stringify(afterRerun), "M2-B generated outputs are not byte-stable across reruns");

if (args.has("--pdf")) {
  const pdfPath = resolve(args.get("--pdf"));
  assert(sha256(readFileSync(pdfPath)) === sourceManifest.sha256, "PDF hash mismatch");
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  assert(Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]) === 211, "PDF page count mismatch");
}

if (args.has("--baseline-db") && args.has("--baseline-db-sha256")) {
  const dbHash = sha256(readFileSync(resolve(args.get("--baseline-db"))));
  assert(dbHash === args.get("--baseline-db-sha256"), `baseline DB hash changed: ${dbHash}`);
}

process.stdout.write(`${JSON.stringify({
  status: "m2b_verification_passed",
  section_records: 38,
  substantive_subsections: 36,
  chapter_summaries: 2,
  source_spans: 38,
  cards: 24,
  terms: 33,
  relations: 36,
  relation_orphans: 0,
  selected_visual_reviews: 11,
  stable_ids: true,
  deterministic_rerun: true,
  database_write: false,
  provider_call: false
}, null, 2)}\n`);
