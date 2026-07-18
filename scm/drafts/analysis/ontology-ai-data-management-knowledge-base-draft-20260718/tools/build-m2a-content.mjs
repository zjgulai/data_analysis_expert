import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const sectionMapPath = resolve(root, "manifests/m2a-section-map.json");
const cardSeedsPath = resolve(root, "manifests/m2a-card-seeds.json");
const artifactManifestPath = resolve(root, "01-source-map/figure-table-manifest.jsonl");
const visualReviewPath = resolve(root, "manifests/m2a-visual-review.json");
const contentMapPath = resolve(root, "02-strategic-cognition/00-strategic-cognition-content-map.md");
const cardsDirectory = resolve(root, "02-strategic-cognition/cards");
const sourceSpansPath = resolve(root, "manifests/m2a-source-spans.json");
const cardManifestPath = resolve(root, "manifests/m2a-knowledge-card-manifest.json");
const batchSummaryPath = resolve(root, "manifests/m2a-batch-summary.json");

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
  const sectionSlug = section.section_id.replaceAll(".", "-");
  const start = String(section.pdf_page_start).padStart(3, "0");
  const end = String(section.pdf_page_end).padStart(3, "0");
  return `oadm-span-s${sectionSlug}-p${start}-p${end}`;
}

function pageLabel(start, end) {
  return start === end ? `PDF p.${start}` : `PDF pp.${start}–${end}`;
}

function yamlString(value) {
  return JSON.stringify(value);
}

function list(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function buildCardMarkdown(seed, sectionById) {
  const id = cardId(seed);
  const hash = sha256(canonicalize(seed));
  const sections = seed.section_ids.map((sectionId) => sectionById.get(sectionId));
  const sourceSpanIds = sections.map(spanId);
  const pageStart = Math.min(...sections.map((section) => section.pdf_page_start));
  const pageEnd = Math.max(...sections.map((section) => section.pdf_page_end));
  const sectionPath = sections.map((section) => `${section.section_id} ${section.title}`).join("；");
  const relations = seed.relation_candidates.length
    ? seed.relation_candidates.map((key) => `- \`${key}\`（候选关系，尚未建模）`).join("\n")
    : "- 无";

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
    `source_span_ids: ${JSON.stringify(sourceSpanIds)}`,
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
    "## 与其他卡片的候选关系",
    "",
    relations,
    "",
    "## SCM 候选映射",
    "",
    "M2-A 仅完成来源内萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。",
    "",
    "## 来源",
    "",
    `- 文档：\`book-ontology-ai-data-management-2026\``,
    `- 章节：${sectionPath}`,
    `- 页码：${pageLabel(pageStart, pageEnd)}`,
    `- 证据等级：\`published-book-derived-candidate\``,
    "",
    "## 不确定项",
    "",
    list(seed.uncertainties),
    ""
  ].join("\n");
}

const sectionMap = readJson(sectionMapPath);
const cardSeeds = readJson(cardSeedsPath);
const artifacts = readJsonl(artifactManifestPath);
const visualReview = readJson(visualReviewPath);
const sectionById = new Map(sectionMap.sections.map((section) => [section.section_id, section]));
const artifactById = new Map(artifacts.map((artifact) => [artifact.artifact_id, artifact]));
const reviewedArtifactIds = new Set(
  visualReview.reviews
    .filter((review) => review.status === "reviewed")
    .flatMap((review) => review.artifact_ids)
);

mkdirSync(dirname(contentMapPath), { recursive: true });
mkdirSync(cardsDirectory, { recursive: true });
mkdirSync(dirname(cardManifestPath), { recursive: true });

const groupedSections = new Map();
for (const section of sectionMap.sections) {
  const listForChapter = groupedSections.get(section.chapter) || [];
  listForChapter.push(section);
  groupedSections.set(section.chapter, listForChapter);
}

const contentMapLines = [
  "---",
  "title: 战略认知篇忠实内容地图（第 1–3 章）",
  "doc_type: content-map",
  "module: scm",
  "topic: ontology-ai-data-management-m2a",
  "status: draft",
  "created: 2026-07-18",
  "updated: 2026-07-18",
  "owner: self",
  "source: human+ai",
  "---",
  "",
  "# 战略认知篇忠实内容地图（第 1–3 章）",
  "",
  "## 范围与证据边界",
  "",
  "本地图覆盖 32 个三级正文小节和 3 个章末小结，共 35 条来源内摘要。二级节只作为分组，不另造摘要记录。所有内容均为对书中观点的忠实释义，证据等级为 `published-book-derived-candidate`；其中业界案例标记为 `author_example`，未做项目侧独立核验。",
  "",
  "本制品不包含整书原文、整页图片、个人绝对路径、SCM 适用性结论、数据库写入或外部 provider 调用。",
  ""
];

for (const [chapter, sections] of groupedSections.entries()) {
  contentMapLines.push(`## ${chapter}`, "");
  contentMapLines.push("| 小节 | 页码 | 证据类型 | 忠实摘要 | 图表锚点 |", "|---|---:|---|---|---|");
  for (const section of sections) {
    const refs = section.figure_table_refs.length ? section.figure_table_refs.map((ref) => `\`${ref}\``).join("<br>") : "—";
    contentMapLines.push(`| ${section.section_id} ${section.title} | ${pageLabel(section.pdf_page_start, section.pdf_page_end)} | \`${section.claim_type}\` | ${section.summary} | ${refs} |`);
  }
  contentMapLines.push("");
}

contentMapLines.push(
  "## 审阅提示",
  "",
  "- 页码均为 PDF 物理页码，不是书内印刷页码。",
  "- `author_argument`、`author_framework` 与 `author_risk` 都表示作者主张，不等于当前项目已验证事实。",
  "- `author_example` 仅表明作者引用了该案例；品牌能力和效果需另行查证。",
  "- 图表锚点复用 M1 清单，视觉复核状态以 `m2a-source-spans.json` 为准。",
  ""
);

writeFileSync(contentMapPath, contentMapLines.join("\n"), "utf8");

const sourceSpans = sectionMap.sections.map((section) => {
  const referencedArtifacts = section.figure_table_refs.map((ref) => artifactById.get(ref));
  const visualReviewStatus = referencedArtifacts.length === 0
    ? "not_required"
    : section.figure_table_refs.every((artifactId) => reviewedArtifactIds.has(artifactId))
      ? "reviewed"
      : "pending";
  return {
    span_id: spanId(section),
    document_id: sectionMap.document_id,
    pdf_page_start: section.pdf_page_start,
    pdf_page_end: section.pdf_page_end,
    section_path: `${section.chapter} / ${section.parent_section ? `${section.parent_section} / ` : ""}${section.section_id} ${section.title}`,
    section_id: section.section_id,
    figure_or_table_refs: section.figure_table_refs,
    derived_summary_hash: sha256(section.summary),
    raw_text_persisted: false,
    visual_review_status: visualReviewStatus,
    extraction_status: "paraphrased_and_mapped"
  };
});

const sourceSpanManifest = {
  schema_version: "1.0.0",
  document_id: sectionMap.document_id,
  domain_id: sectionMap.domain_id,
  batch_id: "m2a-strategic-cognition-ch01-ch03",
  span_count: sourceSpans.length,
  physical_pdf_page_is_primary_locator: true,
  raw_full_text_persisted: false,
  source_spans: sourceSpans
};
writeFileSync(sourceSpansPath, `${JSON.stringify(sourceSpanManifest, null, 2)}\n`, "utf8");

const cardManifestRecords = [];
for (const seed of cardSeeds.cards) {
  const sections = seed.section_ids.map((sectionId) => sectionById.get(sectionId));
  const id = cardId(seed);
  const filename = `${id}.md`;
  const path = resolve(cardsDirectory, filename);
  const content = buildCardMarkdown(seed, sectionById);
  writeFileSync(path, content, "utf8");
  cardManifestRecords.push({
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

const cardManifest = {
  schema_version: "1.0.0",
  document_id: cardSeeds.document_id,
  domain_id: cardSeeds.domain_id,
  batch_id: "m2a-strategic-cognition-ch01-ch03",
  id_policy: cardSeeds.id_policy,
  card_count: cardManifestRecords.length,
  cards: cardManifestRecords
};
writeFileSync(cardManifestPath, `${JSON.stringify(cardManifest, null, 2)}\n`, "utf8");

const claimTypeCounts = Object.fromEntries(
  [...new Set(sectionMap.sections.map((section) => section.claim_type))]
    .sort()
    .map((claimType) => [claimType, sectionMap.sections.filter((section) => section.claim_type === claimType).length])
);
const visualReviewCounts = Object.fromEntries(
  [...new Set(sourceSpans.map((span) => span.visual_review_status))]
    .sort()
    .map((status) => [status, sourceSpans.filter((span) => span.visual_review_status === status).length])
);
const batchSummary = {
  schema_version: "1.0.0",
  batch_id: "m2a-strategic-cognition-ch01-ch03",
  scope: "第 1–3 章来源内萃取",
  section_record_count: sectionMap.sections.length,
  substantive_subsection_count: sectionMap.sections.filter((section) => /^\d+\.\d+\.\d+$/.test(section.section_id)).length,
  chapter_summary_count: sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length,
  card_count: cardManifestRecords.length,
  pdf_page_start: 8,
  pdf_page_end: 52,
  claim_type_counts: claimTypeCounts,
  visual_review_counts: visualReviewCounts,
  boundaries: {
    faithful_source_paraphrase_only: true,
    scm_crosswalk_performed: false,
    importer_modified: false,
    database_write: false,
    provider_call: false,
    full_raw_text_persisted: false,
    full_page_images_persisted: false,
    personal_absolute_path_persisted: false
  }
};
writeFileSync(batchSummaryPath, `${JSON.stringify(batchSummary, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({
  status: "m2a_content_built",
  section_records: sectionMap.sections.length,
  source_spans: sourceSpans.length,
  cards: cardManifestRecords.length
})}\n`);
