import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const batchId = "m2c-engineering-method-ch06";
const sectionMapPath = resolve(root, "manifests/m2c-section-map.json");
const cardSeedsPath = resolve(root, "manifests/m2c-card-seeds.json");
const termSeedsPath = resolve(root, "manifests/m2c-term-seeds.json");
const relationSeedsPath = resolve(root, "manifests/m2c-relation-seeds.json");
const visualReviewPath = resolve(root, "manifests/m2c-visual-review.json");
const m2aCardManifestPath = resolve(root, "manifests/m2a-knowledge-card-manifest.json");
const m2bCardManifestPath = resolve(root, "manifests/m2b-knowledge-card-manifest.json");
const m2bTermManifestPath = resolve(root, "manifests/m2b-knowledge-term-manifest.json");
const m2bRelationManifestPath = resolve(root, "manifests/m2b-knowledge-relation-manifest.json");
const contentDirectory = resolve(root, "04-engineering-methods");
const cardsDirectory = resolve(contentDirectory, "cards");
const contentMapPath = resolve(contentDirectory, "00-engineering-methods-content-map.md");
const termTablePath = resolve(contentDirectory, "01-engineering-terms.md");
const relationTablePath = resolve(contentDirectory, "02-engineering-workflow-relations.md");
const sourceSpansPath = resolve(root, "manifests/m2c-source-spans.json");
const cardManifestPath = resolve(root, "manifests/m2c-knowledge-card-manifest.json");
const aggregateCardManifestPath = resolve(root, "manifests/knowledge-card-manifest.json");
const termManifestPath = resolve(root, "manifests/m2c-knowledge-term-manifest.json");
const aggregateTermManifestPath = resolve(root, "manifests/knowledge-term-manifest.json");
const relationManifestPath = resolve(root, "manifests/m2c-knowledge-relation-manifest.json");
const aggregateRelationManifestPath = resolve(root, "manifests/knowledge-relation-manifest.json");
const batchSummaryPath = resolve(root, "manifests/m2c-batch-summary.json");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => Array.isArray(value)
  ? `[${value.map(canonicalize).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`
    : JSON.stringify(value);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const cardId = (seed) => `oadm-${seed.semantic_slug}-${sha256(seed.semantic_key).slice(0, 10)}`;
const termId = (seed) => `oadm-term-${seed.term_key.split(":").at(-1)}-${sha256(seed.term_key).slice(0, 8)}`;
const relationId = (seed) => `oadm-rel-${sha256(`${seed.subject_key}|${seed.predicate}|${seed.object_key}`).slice(0, 12)}`;
const spanId = (section) => `oadm-span-s${section.section_id.replaceAll(".", "-")}-p${String(section.pdf_page_start).padStart(3, "0")}-p${String(section.pdf_page_end).padStart(3, "0")}`;
const pageLabel = (start, end) => start === end ? `PDF p.${start}` : `PDF pp.${start}–${end}`;
const list = (items) => items.map((item) => `- ${item}`).join("\n");

const sectionMap = readJson(sectionMapPath);
const cardSeeds = readJson(cardSeedsPath);
const termSeeds = readJson(termSeedsPath);
const relationSeeds = readJson(relationSeedsPath);
const visualReview = readJson(visualReviewPath);
const m2aCards = readJson(m2aCardManifestPath);
const m2bCards = readJson(m2bCardManifestPath);
const m2bTerms = readJson(m2bTermManifestPath);
const m2bRelations = readJson(m2bRelationManifestPath);
const sectionById = new Map(sectionMap.sections.map((section) => [section.section_id, section]));
const reviewedArtifactIds = new Set(visualReview.reviews.flatMap((review) => review.status === "reviewed" ? review.artifact_ids : []));

mkdirSync(cardsDirectory, { recursive: true });

const sourceSpans = sectionMap.sections.map((section) => ({
  span_id: spanId(section),
  document_id: sectionMap.document_id,
  pdf_page_start: section.pdf_page_start,
  pdf_page_end: section.pdf_page_end,
  section_path: `${section.chapter} / ${section.parent_section ? `${section.parent_section} / ` : ""}${section.section_id} ${section.title}`,
  section_id: section.section_id,
  figure_or_table_refs: section.figure_table_refs,
  derived_summary_hash: sha256(section.summary),
  raw_text_persisted: false,
  visual_review_status: section.figure_table_refs.length === 0 ? "not_required" : section.figure_table_refs.every((id) => reviewedArtifactIds.has(id)) ? "reviewed" : "pending",
  extraction_status: "paraphrased_and_mapped"
}));
writeFileSync(sourceSpansPath, `${JSON.stringify({
  schema_version: "1.0.0", document_id: sectionMap.document_id, domain_id: sectionMap.domain_id,
  batch_id: batchId, span_count: sourceSpans.length, physical_pdf_page_is_primary_locator: true,
  raw_full_text_persisted: false, source_spans: sourceSpans
}, null, 2)}\n`);

const contentMapLines = [
  "---", "title: 第 6 章工程方法忠实内容地图", "doc_type: content-map", "module: scm",
  "topic: ontology-ai-data-management-m2c", "status: draft", "created: 2026-07-18", "updated: 2026-07-18",
  "owner: self", "source: human+ai", "---", "", "# 第 6 章工程方法忠实内容地图", "",
  "## 范围与边界", "",
  "本地图覆盖 17 个三级正文小节与 1 个章末小结，共 18 条来源记录。所有摘要均为来源观点释义，证据等级为 `published-book-derived-candidate`。", "",
  "书中模型能力、效率收益、案例结果和平台可行性均未在本项目独立核验；本批未执行 SCM 映射、数据库写入、导入或外部调用。", "",
  "| 小节 | 页码 | 证据类型 | 忠实摘要 | 图表锚点 |", "|---|---:|---|---|---|"
];
for (const section of sectionMap.sections) {
  const refs = section.figure_table_refs.length ? section.figure_table_refs.map((ref) => `\`${ref}\``).join("<br>") : "—";
  contentMapLines.push(`| ${section.section_id} ${section.title} | ${pageLabel(section.pdf_page_start, section.pdf_page_end)} | \`${section.claim_type}\` | ${section.summary} | ${refs} |`);
}
contentMapLines.push("", "## 解释边界", "", "- `author_method`、`author_quality_gate`、`author_governance_rule`、`author_platform_capability` 与 `author_implementation_path` 均表示作者方案，不表示项目已采纳。", "- 作者将若干标准组合为工程方法；本批未以 W3C 官方文档验证其完整性或推荐性。", "- PDF p.97 的“29 句话”结构按图示理解，完整模板清单仍应以出版源版式复核。", "");
writeFileSync(contentMapPath, contentMapLines.join("\n"));

function buildCardMarkdown(seed) {
  const sections = seed.section_ids.map((id) => sectionById.get(id));
  const start = Math.min(...sections.map((section) => section.pdf_page_start));
  const end = Math.max(...sections.map((section) => section.pdf_page_end));
  return [
    "---", `card_id: ${JSON.stringify(cardId(seed))}`, `semantic_key: ${JSON.stringify(seed.semantic_key)}`,
    `card_type: ${JSON.stringify(seed.card_type)}`, `title: ${JSON.stringify(seed.title)}`,
    `domain: ${JSON.stringify(cardSeeds.domain_id)}`, "status: \"draft\"",
    `evidence_level: ${JSON.stringify(cardSeeds.evidence_level)}`, `source_document_id: ${JSON.stringify(cardSeeds.document_id)}`,
    `source_span_ids: ${JSON.stringify(sections.map(spanId))}`, `section_ids: ${JSON.stringify(seed.section_ids)}`,
    `fact_reason_action_class: ${JSON.stringify(seed.fact_reason_action_class)}`, `scm_applicability: ${JSON.stringify(seed.scm_applicability)}`,
    "review_status: \"pending\"", "version: 1", `content_hash: ${JSON.stringify(sha256(canonicalize(seed)))}`, "---", "",
    `# ${seed.title}`, "", "## 核心结论", "", seed.core_conclusion, "", "## 关键要素", "", list(seed.key_elements), "",
    "## 适用场景", "", list(seed.applicable_scenarios), "", "## 不适用边界", "", list(seed.boundaries), "",
    "## 与其他卡片或术语的候选关系", "", seed.relation_candidates.map((key) => `- \`${key}\`（候选关系，尚未晋升）`).join("\n"), "",
    "## SCM 候选映射", "", "M2-C 仅完成来源内工程方法萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。", "",
    "## 来源", "", `- 文档：\`${cardSeeds.document_id}\``, `- 章节：${sections.map((section) => `${section.section_id} ${section.title}`).join("；")}`,
    `- 页码：${pageLabel(start, end)}`, `- 证据等级：\`${cardSeeds.evidence_level}\``, "", "## 不确定项", "", list(seed.uncertainties), ""
  ].join("\n");
}

const cardRecords = cardSeeds.cards.map((seed) => {
  const sections = seed.section_ids.map((id) => sectionById.get(id));
  const path = resolve(cardsDirectory, `${cardId(seed)}.md`);
  const content = buildCardMarkdown(seed);
  writeFileSync(path, content);
  return {
    card_id: cardId(seed), semantic_key: seed.semantic_key, title: seed.title, card_type: seed.card_type,
    relative_path: relative(root, path), content_hash: sha256(canonicalize(seed)), file_hash: sha256(content),
    source_span_ids: sections.map(spanId), section_ids: seed.section_ids,
    pdf_page_start: Math.min(...sections.map((section) => section.pdf_page_start)),
    pdf_page_end: Math.max(...sections.map((section) => section.pdf_page_end)),
    evidence_level: cardSeeds.evidence_level, review_status: "pending", version: 1
  };
});
writeFileSync(cardManifestPath, `${JSON.stringify({
  schema_version: "1.0.0", document_id: cardSeeds.document_id, domain_id: cardSeeds.domain_id,
  batch_id: batchId, id_policy: cardSeeds.id_policy, card_count: cardRecords.length, cards: cardRecords
}, null, 2)}\n`);

const aggregateCards = [
  ...m2aCards.cards.map((card) => ({ ...card, source_batch_id: m2aCards.batch_id })),
  ...m2bCards.cards.map((card) => ({ ...card, source_batch_id: m2bCards.batch_id })),
  ...cardRecords.map((card) => ({ ...card, source_batch_id: batchId }))
].sort((a, b) => a.semantic_key.localeCompare(b.semantic_key));
writeFileSync(aggregateCardManifestPath, `${JSON.stringify({
  schema_version: "1.0.0", document_id: cardSeeds.document_id, domain_id: cardSeeds.domain_id,
  manifest_scope: "aggregate-through-m2c",
  batch_counts: { [m2aCards.batch_id]: m2aCards.card_count, [m2bCards.batch_id]: m2bCards.card_count, [batchId]: cardRecords.length },
  card_count: aggregateCards.length, cards: aggregateCards
}, null, 2)}\n`);

const termRecords = termSeeds.terms.map((seed) => ({
  term_id: termId(seed), term_key: seed.term_key, preferred_label: seed.preferred_label, aliases: seed.aliases,
  definition: seed.definition, not_equivalent_to: seed.not_equivalent_to, section_ids: seed.section_ids,
  source_span_ids: seed.section_ids.map((id) => spanId(sectionById.get(id))), content_hash: sha256(canonicalize(seed)),
  evidence_level: termSeeds.evidence_level, review_status: "pending"
}));
writeFileSync(termManifestPath, `${JSON.stringify({
  schema_version: "1.0.0", document_id: termSeeds.document_id, domain_id: termSeeds.domain_id,
  batch_id: batchId, term_count: termRecords.length, terms: termRecords
}, null, 2)}\n`);
const aggregateTerms = [
  ...m2bTerms.terms.map((term) => ({ ...term, source_batch_id: m2bTerms.batch_id })),
  ...termRecords.map((term) => ({ ...term, source_batch_id: batchId }))
].sort((a, b) => a.term_key.localeCompare(b.term_key));
writeFileSync(aggregateTermManifestPath, `${JSON.stringify({
  schema_version: "1.0.0", document_id: termSeeds.document_id, domain_id: termSeeds.domain_id,
  manifest_scope: "aggregate-through-m2c", batch_counts: { [m2bTerms.batch_id]: m2bTerms.term_count, [batchId]: termRecords.length },
  term_count: aggregateTerms.length, terms: aggregateTerms
}, null, 2)}\n`);

const termTableLines = ["---", "title: 第 6 章新增工程术语", "doc_type: glossary", "module: scm", "topic: ontology-ai-data-management-m2c", "status: draft", "created: 2026-07-18", "updated: 2026-07-18", "owner: self", "source: human+ai", "---", "", "# 第 6 章新增工程术语", "", "仅收录相对 M2-B 新增的术语；既有 W3C 标准术语直接复用，不重复建档。", "", "| 首选词 | 检索别名 | 来源内定义 | 不等同于 | 来源小节 |", "|---|---|---|---|---|"];
for (const term of termRecords) termTableLines.push(`| ${term.preferred_label} | ${term.aliases.join("；") || "—"} | ${term.definition} | ${term.not_equivalent_to.join("；") || "—"} | ${term.section_ids.join("、")} |`);
termTableLines.push("");
writeFileSync(termTablePath, termTableLines.join("\n"));

const nodeByKey = new Map();
for (const manifest of [m2aCards, m2bCards]) for (const card of manifest.cards) nodeByKey.set(card.semantic_key, { id: card.card_id, type: "KnowledgeCard" });
for (const card of cardRecords) nodeByKey.set(card.semantic_key, { id: card.card_id, type: "KnowledgeCard" });
for (const term of m2bTerms.terms) nodeByKey.set(term.term_key, { id: term.term_id, type: "Term" });
for (const term of termRecords) nodeByKey.set(term.term_key, { id: term.term_id, type: "Term" });
const relationRecords = relationSeeds.relations.map((seed) => ({
  relation_id: relationId(seed), subject_id: nodeByKey.get(seed.subject_key).id, subject_type: nodeByKey.get(seed.subject_key).type,
  subject_key: seed.subject_key, predicate: seed.predicate, object_id: nodeByKey.get(seed.object_key).id,
  object_type: nodeByKey.get(seed.object_key).type, object_key: seed.object_key,
  source_span_ids: seed.section_ids.map((id) => spanId(sectionById.get(id))), section_ids: seed.section_ids,
  rationale: seed.rationale, relation_status: relationSeeds.relation_status, review_status: relationSeeds.review_status,
  content_hash: sha256(canonicalize(seed))
}));
writeFileSync(relationManifestPath, `${JSON.stringify({
  schema_version: "1.0.0", document_id: relationSeeds.document_id, domain_id: relationSeeds.domain_id,
  batch_id: batchId, allowed_predicates: relationSeeds.allowed_predicates,
  relation_count: relationRecords.length, relations: relationRecords
}, null, 2)}\n`);
const aggregateRelations = [
  ...m2bRelations.relations.map((relation) => ({ ...relation, source_batch_id: m2bRelations.batch_id })),
  ...relationRecords.map((relation) => ({ ...relation, source_batch_id: batchId }))
].sort((a, b) => a.relation_id.localeCompare(b.relation_id));
writeFileSync(aggregateRelationManifestPath, `${JSON.stringify({
  schema_version: "1.0.0", document_id: relationSeeds.document_id, domain_id: relationSeeds.domain_id,
  manifest_scope: "aggregate-through-m2c", allowed_predicates: relationSeeds.allowed_predicates,
  batch_counts: { [m2bRelations.batch_id]: m2bRelations.relation_count, [batchId]: relationRecords.length },
  relation_count: aggregateRelations.length, relations: aggregateRelations
}, null, 2)}\n`);

const relationTableLines = ["---", "title: 第 6 章工程方法候选关系", "doc_type: relation-map", "module: scm", "topic: ontology-ai-data-management-m2c", "status: draft", "created: 2026-07-18", "updated: 2026-07-18", "owner: self", "source: human+ai", "---", "", "# 第 6 章工程方法候选关系", "", "以下关系均为来源内候选关系，状态为 `candidate/pending`；没有 SCM crosswalk。", "", "| 主体 | 关系 | 客体 | 理由 | 来源小节 |", "|---|---|---|---|---|"];
for (const relation of relationSeeds.relations) relationTableLines.push(`| \`${relation.subject_key}\` | \`${relation.predicate}\` | \`${relation.object_key}\` | ${relation.rationale} | ${relation.section_ids.join("、")} |`);
relationTableLines.push("");
writeFileSync(relationTablePath, relationTableLines.join("\n"));

const countBy = (items, key) => Object.fromEntries([...new Set(items.map((item) => item[key]))].sort().map((value) => [value, items.filter((item) => item[key] === value).length]));
writeFileSync(batchSummaryPath, `${JSON.stringify({
  schema_version: "1.0.0", batch_id: batchId, scope: "第 6 章来源内工程方法萃取",
  section_record_count: sectionMap.sections.length,
  substantive_subsection_count: sectionMap.sections.filter((section) => /^6\.\d+\.\d+$/.test(section.section_id)).length,
  chapter_summary_count: sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length,
  card_count: cardRecords.length, term_count: termRecords.length, relation_count: relationRecords.length,
  pdf_page_start: 96, pdf_page_end: 127, claim_type_counts: countBy(sectionMap.sections, "claim_type"),
  visual_review_counts: countBy(sourceSpans, "visual_review_status"), selected_visual_review_page_count: visualReview.reviews.length,
  boundaries: {
    faithful_source_paraphrase_only: true, author_examples_independently_verified: false,
    official_standards_verified: false, scm_crosswalk_performed: false, importer_modified: false,
    database_write: false, provider_call: false, full_raw_text_persisted: false,
    full_page_images_persisted: false, personal_absolute_path_persisted: false
  }
}, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({ status: "m2c_content_built", section_records: sourceSpans.length, cards: cardRecords.length, terms: termRecords.length, relations: relationRecords.length })}\n`);
