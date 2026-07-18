import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sectionMapPath = resolve(root, "manifests/m2b-section-map.json");
const cardSeedsPath = resolve(root, "manifests/m2b-card-seeds.json");
const termSeedsPath = resolve(root, "manifests/m2b-term-seeds.json");
const relationSeedsPath = resolve(root, "manifests/m2b-relation-seeds.json");
const visualReviewPath = resolve(root, "manifests/m2b-visual-review.json");
const m2aCardManifestPath = resolve(root, "manifests/m2a-knowledge-card-manifest.json");
const contentMapPath = resolve(root, "03-core-theory/00-core-theory-content-map.md");
const termTablePath = resolve(root, "03-core-theory/01-terms-and-synonyms.md");
const relationTablePath = resolve(root, "03-core-theory/02-core-framework-relations.md");
const cardsDirectory = resolve(root, "03-core-theory/cards");
const sourceSpansPath = resolve(root, "manifests/m2b-source-spans.json");
const cardManifestPath = resolve(root, "manifests/m2b-knowledge-card-manifest.json");
const batchTermManifestPath = resolve(root, "manifests/m2b-knowledge-term-manifest.json");
const batchRelationManifestPath = resolve(root, "manifests/m2b-knowledge-relation-manifest.json");
const batchSummaryPath = resolve(root, "manifests/m2b-batch-summary.json");

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

function cardId(seed) {
  return `oadm-${seed.semantic_slug}-${sha256(seed.semantic_key).slice(0, 10)}`;
}

function termId(seed) {
  const slug = seed.term_key.split(":").at(-1);
  return `oadm-term-${slug}-${sha256(seed.term_key).slice(0, 8)}`;
}

function relationId(seed) {
  return `oadm-rel-${sha256(`${seed.subject_key}|${seed.predicate}|${seed.object_key}`).slice(0, 12)}`;
}

function spanId(section) {
  const sectionSlug = section.section_id.replaceAll(".", "-");
  return `oadm-span-s${sectionSlug}-p${String(section.pdf_page_start).padStart(3, "0")}-p${String(section.pdf_page_end).padStart(3, "0")}`;
}

function pageLabel(start, end) {
  return start === end ? `PDF p.${start}` : `PDF pp.${start}–${end}`;
}

function list(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function yamlString(value) {
  return JSON.stringify(value);
}

function buildCardMarkdown(seed, sectionById) {
  const id = cardId(seed);
  const hash = sha256(canonicalize(seed));
  const sections = seed.section_ids.map((sectionId) => sectionById.get(sectionId));
  const pageStart = Math.min(...sections.map((section) => section.pdf_page_start));
  const pageEnd = Math.max(...sections.map((section) => section.pdf_page_end));
  const sectionPath = sections.map((section) => `${section.section_id} ${section.title}`).join("；");
  return [
    "---",
    `card_id: ${yamlString(id)}`,
    `semantic_key: ${yamlString(seed.semantic_key)}`,
    `card_type: ${yamlString(seed.card_type)}`,
    `title: ${yamlString(seed.title)}`,
    `domain: ${yamlString("ontology-ai-data-management-draft")}`,
    `status: ${yamlString("draft")}`,
    `evidence_level: ${yamlString("published-book-derived-candidate")}`,
    `source_document_id: ${yamlString("book-ontology-ai-data-management-2026")}`,
    `source_span_ids: ${JSON.stringify(sections.map(spanId))}`,
    `section_ids: ${JSON.stringify(seed.section_ids)}`,
    `fact_reason_action_class: ${yamlString(seed.fact_reason_action_class)}`,
    `scm_applicability: ${yamlString(seed.scm_applicability)}`,
    `review_status: ${yamlString("pending")}`,
    "version: 1",
    `content_hash: ${yamlString(hash)}`,
    "---",
    "",
    `# ${seed.title}`,
    "",
    "## 核心结论",
    "",
    seed.core_conclusion,
    "",
    "## 关键要素",
    "",
    list(seed.key_elements),
    "",
    "## 适用场景",
    "",
    list(seed.applicable_scenarios),
    "",
    "## 不适用边界",
    "",
    list(seed.boundaries),
    "",
    "## 与其他卡片或术语的候选关系",
    "",
    seed.relation_candidates.map((key) => `- \`${key}\`（候选关系，尚未晋升）`).join("\n"),
    "",
    "## SCM 候选映射",
    "",
    "M2-B 仅完成来源内核心理论萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。",
    "",
    "## 来源",
    "",
    "- 文档：`book-ontology-ai-data-management-2026`",
    `- 章节：${sectionPath}`,
    `- 页码：${pageLabel(pageStart, pageEnd)}`,
    "- 证据等级：`published-book-derived-candidate`",
    "",
    "## 不确定项",
    "",
    list(seed.uncertainties),
    ""
  ].join("\n");
}

const sectionMap = readJson(sectionMapPath);
const cardSeeds = readJson(cardSeedsPath);
const termSeeds = readJson(termSeedsPath);
const relationSeeds = readJson(relationSeedsPath);
const visualReview = readJson(visualReviewPath);
const m2aCardManifest = readJson(m2aCardManifestPath);
const sectionById = new Map(sectionMap.sections.map((section) => [section.section_id, section]));
const reviewedArtifactIds = new Set(visualReview.reviews.filter((review) => review.status === "reviewed").flatMap((review) => review.artifact_ids));

mkdirSync(dirname(contentMapPath), { recursive: true });
mkdirSync(cardsDirectory, { recursive: true });

const groupedSections = new Map();
for (const section of sectionMap.sections) {
  const chapterSections = groupedSections.get(section.chapter) || [];
  chapterSections.push(section);
  groupedSections.set(section.chapter, chapterSections);
}

const contentMapLines = [
  "---",
  "title: 核心理论篇忠实内容地图（第 4–5 章）",
  "doc_type: content-map",
  "module: scm",
  "topic: ontology-ai-data-management-m2b",
  "status: draft",
  "created: 2026-07-18",
  "updated: 2026-07-18",
  "owner: self",
  "source: human+ai",
  "---",
  "",
  "# 核心理论篇忠实内容地图（第 4–5 章）",
  "",
  "## 范围与边界",
  "",
  "本地图覆盖 36 个三级正文小节和 2 个章末小结，共 38 条来源记录。二级节的导入性内容并入首个三级小节的页级范围。所有结论均是对来源观点的释义，证据等级为 `published-book-derived-candidate`。",
  "",
  "书中的企业案例、规模数字、效率数据、标准生态判断和模型能力判断均未在本项目独立核验；采用前必须分别核验企业证据与官方标准文档。",
  ""
];

for (const [chapter, sections] of groupedSections.entries()) {
  contentMapLines.push(`## ${chapter}`, "", "| 小节 | 页码 | 证据类型 | 忠实摘要 | 图表锚点 |", "|---|---:|---|---|---|");
  for (const section of sections) {
    const refs = section.figure_table_refs.length ? section.figure_table_refs.map((ref) => `\`${ref}\``).join("<br>") : "—";
    contentMapLines.push(`| ${section.section_id} ${section.title} | ${pageLabel(section.pdf_page_start, section.pdf_page_end)} | \`${section.claim_type}\` | ${section.summary} | ${refs} |`);
  }
  contentMapLines.push("");
}
contentMapLines.push(
  "## 特殊审阅项",
  "",
  "- PDF p.91 的表题视觉上连排为“表 5-27 类语义总表”。当前保留 M1 artifact ID `oadm-table-5-27-p091`；是否应解释为“表 5-2”与“7 类语义总表”的连接，待出版源确认。",
  "- `author_standard_mapping` 表示作者对标准角色的映射，不代表 W3C 官方推荐架构。",
  "- `author_governance_rule` 表示书中治理建议，不代表项目已生效制度。",
  ""
);
writeFileSync(contentMapPath, contentMapLines.join("\n"), "utf8");

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
  schema_version: "1.0.0",
  document_id: sectionMap.document_id,
  domain_id: sectionMap.domain_id,
  batch_id: "m2b-core-theory-ch04-ch05",
  span_count: sourceSpans.length,
  physical_pdf_page_is_primary_locator: true,
  raw_full_text_persisted: false,
  source_spans: sourceSpans
}, null, 2)}\n`, "utf8");

const cardRecords = [];
for (const seed of cardSeeds.cards) {
  const sections = seed.section_ids.map((sectionId) => sectionById.get(sectionId));
  const id = cardId(seed);
  const path = resolve(cardsDirectory, `${id}.md`);
  const content = buildCardMarkdown(seed, sectionById);
  writeFileSync(path, content, "utf8");
  cardRecords.push({
    card_id: id,
    semantic_key: seed.semantic_key,
    title: seed.title,
    card_type: seed.card_type,
    relative_path: relative(root, path),
    content_hash: sha256(canonicalize(seed)),
    file_hash: sha256(content),
    source_span_ids: sections.map(spanId),
    section_ids: seed.section_ids,
    pdf_page_start: Math.min(...sections.map((section) => section.pdf_page_start)),
    pdf_page_end: Math.max(...sections.map((section) => section.pdf_page_end)),
    evidence_level: cardSeeds.evidence_level,
    review_status: "pending",
    version: 1
  });
}
writeFileSync(cardManifestPath, `${JSON.stringify({
  schema_version: "1.0.0",
  document_id: cardSeeds.document_id,
  domain_id: cardSeeds.domain_id,
  batch_id: "m2b-core-theory-ch04-ch05",
  id_policy: cardSeeds.id_policy,
  card_count: cardRecords.length,
  cards: cardRecords
}, null, 2)}\n`, "utf8");

const termRecords = termSeeds.terms.map((seed) => ({
  term_id: termId(seed),
  term_key: seed.term_key,
  preferred_label: seed.preferred_label,
  aliases: seed.aliases,
  definition: seed.definition,
  not_equivalent_to: seed.not_equivalent_to,
  section_ids: seed.section_ids,
  source_span_ids: seed.section_ids.map((sectionId) => spanId(sectionById.get(sectionId))),
  content_hash: sha256(canonicalize(seed)),
  evidence_level: termSeeds.evidence_level,
  review_status: "pending"
}));
const termManifestPayload = {
  schema_version: "1.0.0",
  document_id: termSeeds.document_id,
  domain_id: termSeeds.domain_id,
  batch_id: "m2b-core-theory-ch04-ch05",
  term_count: termRecords.length,
  terms: termRecords
};
writeFileSync(batchTermManifestPath, `${JSON.stringify(termManifestPayload, null, 2)}\n`, "utf8");

const termTableLines = [
  "---",
  "title: 核心理论术语与同义词表",
  "doc_type: glossary",
  "module: scm",
  "topic: ontology-ai-data-management-m2b",
  "status: draft",
  "created: 2026-07-18",
  "updated: 2026-07-18",
  "owner: self",
  "source: human+ai",
  "---",
  "",
  "# 核心理论术语与同义词表",
  "",
  "所有词条均为来源派生候选；`aliases` 只用于检索，不表示在所有上下文中完全等价。`not_equivalent_to` 用于防止概念误并。",
  "",
  "| 首选词 | 检索别名 | 来源内定义 | 不等同于 | 来源小节 |",
  "|---|---|---|---|---|"
];
for (const term of termRecords) {
  termTableLines.push(`| ${term.preferred_label} | ${term.aliases.join("；") || "—"} | ${term.definition} | ${term.not_equivalent_to.join("；") || "—"} | ${term.section_ids.join("、")} |`);
}
termTableLines.push("");
writeFileSync(termTablePath, termTableLines.join("\n"), "utf8");

const nodeByKey = new Map();
for (const card of m2aCardManifest.cards) nodeByKey.set(card.semantic_key, { node_id: card.card_id, node_type: "KnowledgeCard", title: card.title, batch_id: m2aCardManifest.batch_id });
for (const card of cardRecords) nodeByKey.set(card.semantic_key, { node_id: card.card_id, node_type: "KnowledgeCard", title: card.title, batch_id: "m2b-core-theory-ch04-ch05" });
for (const term of termRecords) nodeByKey.set(term.term_key, { node_id: term.term_id, node_type: "Term", title: term.preferred_label, batch_id: "m2b-core-theory-ch04-ch05" });

const relationRecords = relationSeeds.relations.map((seed) => {
  const subject = nodeByKey.get(seed.subject_key);
  const object = nodeByKey.get(seed.object_key);
  return {
    relation_id: relationId(seed),
    subject_id: subject.node_id,
    subject_type: subject.node_type,
    subject_key: seed.subject_key,
    predicate: seed.predicate,
    object_id: object.node_id,
    object_type: object.node_type,
    object_key: seed.object_key,
    source_span_ids: seed.section_ids.map((sectionId) => spanId(sectionById.get(sectionId))),
    section_ids: seed.section_ids,
    rationale: seed.rationale,
    relation_status: relationSeeds.relation_status,
    review_status: relationSeeds.review_status,
    content_hash: sha256(canonicalize(seed))
  };
});
const relationManifestPayload = {
  schema_version: "1.0.0",
  document_id: relationSeeds.document_id,
  domain_id: relationSeeds.domain_id,
  batch_id: "m2b-core-theory-ch04-ch05",
  allowed_predicates: relationSeeds.allowed_predicates,
  relation_count: relationRecords.length,
  relations: relationRecords
};
writeFileSync(batchRelationManifestPath, `${JSON.stringify(relationManifestPayload, null, 2)}\n`, "utf8");

const relationTableLines = [
  "---",
  "title: 核心框架候选关系表",
  "doc_type: relation-map",
  "module: scm",
  "topic: ontology-ai-data-management-m2b",
  "status: draft",
  "created: 2026-07-18",
  "updated: 2026-07-18",
  "owner: self",
  "source: human+ai",
  "---",
  "",
  "# 核心框架候选关系表",
  "",
  "所有关系均为 `candidate/pending`，只表示来源内候选语义，不表示 SCM crosswalk 或已生效治理规则。",
  "",
  "| 主体 | 关系 | 客体 | 来源小节 | 理由 |",
  "|---|---|---|---|---|"
];
for (const relation of relationRecords) {
  relationTableLines.push(`| \`${relation.subject_key}\` | \`${relation.predicate}\` | \`${relation.object_key}\` | ${relation.section_ids.join("、")} | ${relation.rationale} |`);
}
relationTableLines.push("");
writeFileSync(relationTablePath, relationTableLines.join("\n"), "utf8");

const countBy = (items, key) => Object.fromEntries([...new Set(items.map((item) => item[key]))].sort().map((value) => [value, items.filter((item) => item[key] === value).length]));
writeFileSync(batchSummaryPath, `${JSON.stringify({
  schema_version: "1.0.0",
  batch_id: "m2b-core-theory-ch04-ch05",
  scope: "第 4–5 章来源内核心理论萃取",
  section_record_count: sectionMap.sections.length,
  substantive_subsection_count: sectionMap.sections.filter((section) => /^\d+\.\d+\.\d+$/.test(section.section_id)).length,
  chapter_summary_count: sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length,
  card_count: cardRecords.length,
  term_count: termRecords.length,
  relation_count: relationRecords.length,
  pdf_page_start: 53,
  pdf_page_end: 95,
  claim_type_counts: countBy(sectionMap.sections, "claim_type"),
  visual_review_counts: countBy(sourceSpans, "visual_review_status"),
  boundaries: {
    faithful_source_paraphrase_only: true,
    author_examples_independently_verified: false,
    official_standards_verified: false,
    scm_crosswalk_performed: false,
    importer_modified: false,
    database_write: false,
    provider_call: false,
    full_raw_text_persisted: false,
    full_page_images_persisted: false,
    personal_absolute_path_persisted: false
  }
}, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({ status: "m2b_content_built", section_records: sectionMap.sections.length, source_spans: sourceSpans.length, cards: cardRecords.length, terms: termRecords.length, relations: relationRecords.length })}\n`);
