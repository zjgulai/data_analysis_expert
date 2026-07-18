import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const buildScriptPath = resolve(__dirname, "build-m2a-content.mjs");
const sectionMapPath = resolve(root, "manifests/m2a-section-map.json");
const cardSeedsPath = resolve(root, "manifests/m2a-card-seeds.json");
const sourceSpansPath = resolve(root, "manifests/m2a-source-spans.json");
const cardManifestPath = resolve(root, "manifests/m2a-knowledge-card-manifest.json");
const batchSummaryPath = resolve(root, "manifests/m2a-batch-summary.json");
const contentMapPath = resolve(root, "02-strategic-cognition/00-strategic-cognition-content-map.md");
const cardsDirectory = resolve(root, "02-strategic-cognition/cards");
const artifactManifestPath = resolve(root, "01-source-map/figure-table-manifest.jsonl");
const visualReviewPath = resolve(root, "manifests/m2a-visual-review.json");
const sourceManifestPath = resolve(root, "00-governance/source-manifest.json");

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
const sourceSpans = readJson(sourceSpansPath);
const cardManifest = readJson(cardManifestPath);
const batchSummary = readJson(batchSummaryPath);
const sourceManifest = readJson(sourceManifestPath);
const artifacts = readJsonl(artifactManifestPath);
const visualReview = readJson(visualReviewPath);
const artifactIds = new Set(artifacts.map((artifact) => artifact.artifact_id));

assert(visualReview.reviews.length === 8, `expected 8 selected-page visual reviews, received ${visualReview.reviews.length}`);
assert(visualReview.full_page_images_persisted === false, "visual review must not persist full-page images");
for (const review of visualReview.reviews) {
  assert(review.status === "reviewed", `visual review for PDF p.${review.pdf_page} is incomplete`);
  assert(review.pdf_page >= 8 && review.pdf_page <= 52, `visual review page ${review.pdf_page} is outside M2-A scope`);
  for (const artifactId of review.artifact_ids) assert(artifactIds.has(artifactId), `visual review references unknown artifact ${artifactId}`);
}

assert(sectionMap.sections.length === 35, `expected 35 section records, received ${sectionMap.sections.length}`);
assert(sectionMap.sections.filter((section) => /^\d+\.\d+\.\d+$/.test(section.section_id)).length === 32, "expected 32 substantive subsection records");
assert(sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length === 3, "expected 3 chapter summaries");

const sectionIds = sectionMap.sections.map((section) => section.section_id);
assert(new Set(sectionIds).size === sectionIds.length, "section IDs must be unique");
const chapterCounts = Object.fromEntries(
  [...new Set(sectionMap.sections.map((section) => section.chapter))]
    .map((chapter) => [chapter.match(/第 (\d+) 章/)?.[1], sectionMap.sections.filter((section) => section.chapter === chapter).length])
);
assert(JSON.stringify(chapterCounts) === JSON.stringify({ "1": 10, "2": 13, "3": 12 }), `unexpected chapter record counts: ${JSON.stringify(chapterCounts)}`);

const allowedClaimTypes = new Set(["author_argument", "author_framework", "author_risk", "author_example", "chapter_summary"]);
for (const section of sectionMap.sections) {
  assert(section.pdf_page_start >= 8 && section.pdf_page_end <= 52, `section ${section.section_id} is outside M2-A page scope`);
  assert(section.pdf_page_start <= section.pdf_page_end, `section ${section.section_id} has inverted page range`);
  assert(allowedClaimTypes.has(section.claim_type), `section ${section.section_id} has unsupported claim type ${section.claim_type}`);
  assert(section.summary.length >= 25, `section ${section.section_id} summary is too short`);
  for (const artifactId of section.figure_table_refs) {
    assert(artifactIds.has(artifactId), `section ${section.section_id} references unknown artifact ${artifactId}`);
  }
}

assert(cardSeeds.cards.length === 12, `expected 12 card seeds, received ${cardSeeds.cards.length}`);
const semanticKeys = cardSeeds.cards.map((card) => card.semantic_key);
assert(new Set(semanticKeys).size === semanticKeys.length, "semantic keys must be unique");
const semanticKeySet = new Set(semanticKeys);
const sectionIdSet = new Set(sectionIds);
const calculatedCardIds = [];
for (const seed of cardSeeds.cards) {
  assert(/^oadm:[a-z0-9-]+:[a-z0-9-]+$/.test(seed.semantic_key), `invalid semantic key ${seed.semantic_key}`);
  assert(seed.section_ids.length > 0, `card ${seed.semantic_key} has no source section`);
  for (const sectionId of seed.section_ids) assert(sectionIdSet.has(sectionId), `card ${seed.semantic_key} references missing section ${sectionId}`);
  for (const target of seed.relation_candidates) assert(semanticKeySet.has(target), `card ${seed.semantic_key} references missing relation target ${target}`);
  const id = cardId(seed);
  calculatedCardIds.push(id);
  const changedContentSeed = { ...seed, core_conclusion: `${seed.core_conclusion} 内容哈希稳定性探针` };
  assert(cardId(changedContentSeed) === id, `card ID changed when content changed for ${seed.semantic_key}`);
  assert(sha256(canonicalize(changedContentSeed)) !== sha256(canonicalize(seed)), `content hash did not change for ${seed.semantic_key}`);
}
assert(new Set(calculatedCardIds).size === calculatedCardIds.length, "calculated card IDs must be unique");
const reversedCardIds = [...cardSeeds.cards].reverse().map(cardId).sort();
assert(JSON.stringify(reversedCardIds) === JSON.stringify([...calculatedCardIds].sort()), "card IDs depend on seed sorting");

assert(sourceSpans.span_count === 35 && sourceSpans.source_spans.length === 35, "source span manifest count mismatch");
const spanById = new Map(sourceSpans.source_spans.map((span) => [span.span_id, span]));
assert(spanById.size === 35, "source span IDs must be unique");
for (const section of sectionMap.sections) {
  const expectedSpanId = spanId(section);
  const span = spanById.get(expectedSpanId);
  assert(span, `missing source span ${expectedSpanId}`);
  assert(span.section_id === section.section_id, `source span section mismatch for ${expectedSpanId}`);
  assert(span.pdf_page_start === section.pdf_page_start && span.pdf_page_end === section.pdf_page_end, `source span page mismatch for ${expectedSpanId}`);
  assert(span.raw_text_persisted === false, `raw text flag must be false for ${expectedSpanId}`);
}

assert(cardManifest.card_count === 12 && cardManifest.cards.length === 12, "knowledge card manifest count mismatch");
const manifestCardIds = cardManifest.cards.map((card) => card.card_id);
assert(new Set(manifestCardIds).size === 12, "manifest card IDs must be unique");
assert(JSON.stringify([...manifestCardIds].sort()) === JSON.stringify([...calculatedCardIds].sort()), "manifest card IDs differ from stable ID calculation");
for (const record of cardManifest.cards) {
  const seed = cardSeeds.cards.find((candidate) => candidate.semantic_key === record.semantic_key);
  assert(seed, `missing seed for manifest card ${record.card_id}`);
  assert(record.card_id === cardId(seed), `unstable card ID for ${record.semantic_key}`);
  assert(record.content_hash === sha256(canonicalize(seed)), `content hash mismatch for ${record.card_id}`);
  assert(record.source_span_ids.length === seed.section_ids.length, `source span count mismatch for ${record.card_id}`);
  for (const sourceSpanId of record.source_span_ids) assert(spanById.has(sourceSpanId), `card ${record.card_id} references missing span ${sourceSpanId}`);
  const cardPath = resolve(root, record.relative_path);
  const cardContent = readFileSync(cardPath, "utf8");
  assert(sha256(cardContent) === record.file_hash, `file hash mismatch for ${record.card_id}`);
  assert(cardContent.includes(`card_id: ${JSON.stringify(record.card_id)}`), `card frontmatter ID mismatch for ${record.card_id}`);
  assert(cardContent.includes(`content_hash: ${JSON.stringify(record.content_hash)}`), `card frontmatter content hash mismatch for ${record.card_id}`);
  assert(cardContent.includes("published-book-derived-candidate"), `evidence level missing from ${record.card_id}`);
  assert(cardContent.includes("尚未进行 SCM 适用性评估"), `SCM boundary missing from ${record.card_id}`);
}

const generatedCardFiles = readdirSync(cardsDirectory).filter((name) => name.endsWith(".md")).sort();
assert(generatedCardFiles.length === 12, `expected exactly 12 generated card files, received ${generatedCardFiles.length}`);
assert(batchSummary.section_record_count === 35 && batchSummary.card_count === 12, "batch summary counts mismatch");
assert(batchSummary.boundaries.database_write === false, "batch summary database boundary mismatch");
assert(batchSummary.boundaries.provider_call === false, "batch summary provider boundary mismatch");
assert(batchSummary.boundaries.scm_crosswalk_performed === false, "batch summary SCM crosswalk boundary mismatch");

const contentMap = readFileSync(contentMapPath, "utf8");
assert((contentMap.match(/^\| [123]\./gm) || []).length === 35, "content map must contain 35 section rows");
assert(contentMap.includes("32 个三级正文小节和 3 个章末小结"), "content map count correction is missing");

const policyScanPaths = [sectionMapPath, cardSeedsPath, visualReviewPath, sourceSpansPath, cardManifestPath, batchSummaryPath, contentMapPath, ...cardManifest.cards.map((card) => resolve(root, card.relative_path))];
for (const path of policyScanPaths) {
  const content = readFileSync(path, "utf8");
  assert(!content.includes("/Users/"), `personal absolute path found in ${path}`);
  assert(!content.includes("桌面 - "), `personal desktop locator found in ${path}`);
}

const deterministicPaths = [sourceSpansPath, cardManifestPath, batchSummaryPath, contentMapPath, ...cardManifest.cards.map((card) => resolve(root, card.relative_path))];
const beforeRerun = snapshot(deterministicPaths);
execFileSync(process.execPath, [buildScriptPath], { encoding: "utf8" });
const afterRerun = snapshot(deterministicPaths);
assert(JSON.stringify(beforeRerun) === JSON.stringify(afterRerun), "M2-A generated output is not byte-stable across reruns");

if (args.has("--pdf")) {
  const pdfPath = resolve(args.get("--pdf"));
  const pdfHash = sha256(readFileSync(pdfPath));
  assert(pdfHash === sourceManifest.sha256, `PDF hash mismatch: ${pdfHash}`);
  const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const pages = Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]);
  assert(pages === 211, `expected 211 PDF pages, received ${pages}`);
}

if (args.has("--baseline-db") && args.has("--baseline-db-sha256")) {
  const dbHash = sha256(readFileSync(resolve(args.get("--baseline-db"))));
  assert(dbHash === args.get("--baseline-db-sha256"), `baseline DB hash changed: ${dbHash}`);
}

process.stdout.write(`${JSON.stringify({
  status: "m2a_verification_passed",
  section_records: 35,
  substantive_subsections: 32,
  chapter_summaries: 3,
  source_spans: 35,
  cards: 12,
  stable_ids: true,
  deterministic_rerun: true,
  database_write: false,
  provider_call: false
}, null, 2)}\n`);
