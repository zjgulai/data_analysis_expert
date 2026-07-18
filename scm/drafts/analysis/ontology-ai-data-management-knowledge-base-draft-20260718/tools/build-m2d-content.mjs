import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const batchId = "m2d-agent-engineering-applications-ch07-ch08";
const at = (value) => resolve(root, value);
const paths = {
  sectionMap: at("manifests/m2d-section-map.json"), cardSeeds: at("manifests/m2d-card-seeds.json"),
  termSeeds: at("manifests/m2d-term-seeds.json"), relationSeeds: at("manifests/m2d-relation-seeds.json"),
  visualReview: at("manifests/m2d-visual-review.json"),
  priorCards: [at("manifests/m2a-knowledge-card-manifest.json"), at("manifests/m2b-knowledge-card-manifest.json"), at("manifests/m2c-knowledge-card-manifest.json")],
  priorTerms: [at("manifests/m2b-knowledge-term-manifest.json"), at("manifests/m2c-knowledge-term-manifest.json")],
  priorRelations: [at("manifests/m2b-knowledge-relation-manifest.json"), at("manifests/m2c-knowledge-relation-manifest.json")],
  contentDir: at("05-agent-engineering-applications"), cardsDir: at("05-agent-engineering-applications/cards"),
  contentMap: at("05-agent-engineering-applications/00-agent-engineering-applications-content-map.md"),
  termTable: at("05-agent-engineering-applications/01-agent-application-terms.md"),
  relationTable: at("05-agent-engineering-applications/02-agent-application-relations.md"),
  spans: at("manifests/m2d-source-spans.json"), cardManifest: at("manifests/m2d-knowledge-card-manifest.json"),
  aggregateCards: at("manifests/knowledge-card-manifest.json"), termManifest: at("manifests/m2d-knowledge-term-manifest.json"),
  aggregateTerms: at("manifests/knowledge-term-manifest.json"), relationManifest: at("manifests/m2d-knowledge-relation-manifest.json"),
  aggregateRelations: at("manifests/knowledge-relation-manifest.json"), summary: at("manifests/m2d-batch-summary.json")
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => Array.isArray(value) ? `[${value.map(canonicalize).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}` : JSON.stringify(value);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const cardId = (seed) => `oadm-${seed.semantic_slug}-${sha256(seed.semantic_key).slice(0, 10)}`;
const termId = (seed) => `oadm-term-${seed.term_key.split(":").at(-1)}-${sha256(seed.term_key).slice(0, 8)}`;
const relationId = (seed) => `oadm-rel-${sha256(`${seed.subject_key}|${seed.predicate}|${seed.object_key}`).slice(0, 12)}`;
const spanId = (section) => `oadm-span-s${section.section_id.replaceAll(".", "-")}-p${String(section.pdf_page_start).padStart(3, "0")}-p${String(section.pdf_page_end).padStart(3, "0")}`;
const pageLabel = (start, end) => start === end ? `PDF p.${start}` : `PDF pp.${start}–${end}`;
const list = (items) => items.map((item) => `- ${item}`).join("\n");

const sectionMap = readJson(paths.sectionMap);
const cardSeeds = readJson(paths.cardSeeds);
const termSeeds = readJson(paths.termSeeds);
const relationSeeds = readJson(paths.relationSeeds);
const visualReview = readJson(paths.visualReview);
const priorCardManifests = paths.priorCards.map(readJson);
const priorTermManifests = paths.priorTerms.map(readJson);
const priorRelationManifests = paths.priorRelations.map(readJson);
const sectionById = new Map(sectionMap.sections.map((section) => [section.section_id, section]));
const reviewedArtifacts = new Set(visualReview.reviews.flatMap((review) => review.status === "reviewed" ? review.artifact_ids : []));
mkdirSync(paths.cardsDir, { recursive: true });

const sourceSpans = sectionMap.sections.map((section) => ({
  span_id: spanId(section), document_id: sectionMap.document_id, pdf_page_start: section.pdf_page_start,
  pdf_page_end: section.pdf_page_end,
  section_path: `${section.chapter} / ${section.parent_section ? `${section.parent_section} / ` : ""}${section.section_id} ${section.title}`,
  section_id: section.section_id, figure_or_table_refs: section.figure_table_refs,
  derived_summary_hash: sha256(section.summary), raw_text_persisted: false,
  visual_review_status: section.figure_table_refs.length === 0 ? "not_required" : section.figure_table_refs.every((id) => reviewedArtifacts.has(id)) ? "reviewed" : "pending",
  extraction_status: "paraphrased_and_mapped"
}));
writeFileSync(paths.spans, `${JSON.stringify({ schema_version: "1.0.0", document_id: sectionMap.document_id, domain_id: sectionMap.domain_id, batch_id: batchId, span_count: sourceSpans.length, physical_pdf_page_is_primary_locator: true, raw_full_text_persisted: false, source_spans: sourceSpans }, null, 2)}\n`);

const contentLines = [
  "---", "title: 第 7–8 章 Agent 工程与应用场景忠实内容地图", "doc_type: content-map", "module: scm",
  "topic: ontology-ai-data-management-m2d", "status: draft", "created: 2026-07-18", "updated: 2026-07-18", "owner: self", "source: human+ai", "---", "",
  "# 第 7–8 章 Agent 工程与应用场景忠实内容地图", "", "## 范围与边界", "",
  "本地图覆盖 33 个三级正文小节和 2 个章末小结，共 35 条来源记录。所有摘要均为来源观点释义，证据等级为 `published-book-derived-candidate`。", "",
  "作者案例、效果数字、模型与平台能力、标准和产品推荐均未在本项目独立核验；本批未执行 SCM 映射、导入、数据库写入或外部调用。", ""
];
for (const chapter of [...new Set(sectionMap.sections.map((section) => section.chapter))]) {
  contentLines.push(`## ${chapter}`, "", "| 小节 | 页码 | 证据类型 | 忠实摘要 | 图表锚点 |", "|---|---:|---|---|---|");
  for (const section of sectionMap.sections.filter((item) => item.chapter === chapter)) {
    const refs = section.figure_table_refs.length ? section.figure_table_refs.map((id) => `\`${id}\``).join("<br>") : "—";
    contentLines.push(`| ${section.section_id} ${section.title} | ${pageLabel(section.pdf_page_start, section.pdf_page_end)} | \`${section.claim_type}\` | ${section.summary} | ${refs} |`);
  }
  contentLines.push("");
}
contentLines.push("## 解释边界", "", "- `author_application_pattern` 表示作者总结的应用模式，不代表本项目已有成功案例。", "- 图表中的效率、准确率、时长和业务收益均作为作者案例陈述保留，不能进入 certified evidence。", "- 作者对 MCP、ReAct、Graph RAG、W3C 标准和数据库产品的角色判断未通过官方文档核验。", "");
writeFileSync(paths.contentMap, contentLines.join("\n"));

function cardMarkdown(seed) {
  const sections = seed.section_ids.map((id) => sectionById.get(id));
  const start = Math.min(...sections.map((section) => section.pdf_page_start));
  const end = Math.max(...sections.map((section) => section.pdf_page_end));
  return [
    "---", `card_id: ${JSON.stringify(cardId(seed))}`, `semantic_key: ${JSON.stringify(seed.semantic_key)}`,
    `card_type: ${JSON.stringify(seed.card_type)}`, `title: ${JSON.stringify(seed.title)}`, `domain: ${JSON.stringify(cardSeeds.domain_id)}`,
    "status: \"draft\"", `evidence_level: ${JSON.stringify(cardSeeds.evidence_level)}`, `source_document_id: ${JSON.stringify(cardSeeds.document_id)}`,
    `source_span_ids: ${JSON.stringify(sections.map(spanId))}`, `section_ids: ${JSON.stringify(seed.section_ids)}`,
    `fact_reason_action_class: ${JSON.stringify(seed.fact_reason_action_class)}`, `scm_applicability: ${JSON.stringify(seed.scm_applicability)}`,
    "review_status: \"pending\"", "version: 1", `content_hash: ${JSON.stringify(sha256(canonicalize(seed)))}`, "---", "",
    `# ${seed.title}`, "", "## 核心结论", "", seed.core_conclusion, "", "## 关键要素", "", list(seed.key_elements), "",
    "## 适用场景", "", list(seed.applicable_scenarios), "", "## 不适用边界", "", list(seed.boundaries), "",
    "## 与其他卡片或术语的候选关系", "", seed.relation_candidates.map((key) => `- \`${key}\`（候选关系，尚未晋升）`).join("\n"), "",
    "## SCM 候选映射", "", "M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。", "",
    "## 来源", "", `- 文档：\`${cardSeeds.document_id}\``, `- 章节：${sections.map((section) => `${section.section_id} ${section.title}`).join("；")}`,
    `- 页码：${pageLabel(start, end)}`, `- 证据等级：\`${cardSeeds.evidence_level}\``, "", "## 不确定项", "", list(seed.uncertainties), ""
  ].join("\n");
}

const cardRecords = cardSeeds.cards.map((seed) => {
  const sections = seed.section_ids.map((id) => sectionById.get(id));
  const path = resolve(paths.cardsDir, `${cardId(seed)}.md`);
  const content = cardMarkdown(seed);
  writeFileSync(path, content);
  return { card_id: cardId(seed), semantic_key: seed.semantic_key, title: seed.title, card_type: seed.card_type, relative_path: relative(root, path), content_hash: sha256(canonicalize(seed)), file_hash: sha256(content), source_span_ids: sections.map(spanId), section_ids: seed.section_ids, pdf_page_start: Math.min(...sections.map((section) => section.pdf_page_start)), pdf_page_end: Math.max(...sections.map((section) => section.pdf_page_end)), evidence_level: cardSeeds.evidence_level, review_status: "pending", version: 1 };
});
writeFileSync(paths.cardManifest, `${JSON.stringify({ schema_version: "1.0.0", document_id: cardSeeds.document_id, domain_id: cardSeeds.domain_id, batch_id: batchId, id_policy: cardSeeds.id_policy, card_count: cardRecords.length, cards: cardRecords }, null, 2)}\n`);
const aggregateCards = [...priorCardManifests.flatMap((manifest) => manifest.cards.map((card) => ({ ...card, source_batch_id: manifest.batch_id }))), ...cardRecords.map((card) => ({ ...card, source_batch_id: batchId }))].sort((a, b) => a.semantic_key.localeCompare(b.semantic_key));
writeFileSync(paths.aggregateCards, `${JSON.stringify({ schema_version: "1.0.0", document_id: cardSeeds.document_id, domain_id: cardSeeds.domain_id, manifest_scope: "aggregate-through-m2d", batch_counts: Object.fromEntries([...priorCardManifests.map((manifest) => [manifest.batch_id, manifest.card_count]), [batchId, cardRecords.length]]), card_count: aggregateCards.length, cards: aggregateCards }, null, 2)}\n`);

const termRecords = termSeeds.terms.map((seed) => ({ term_id: termId(seed), term_key: seed.term_key, preferred_label: seed.preferred_label, aliases: seed.aliases, definition: seed.definition, not_equivalent_to: seed.not_equivalent_to, section_ids: seed.section_ids, source_span_ids: seed.section_ids.map((id) => spanId(sectionById.get(id))), content_hash: sha256(canonicalize(seed)), evidence_level: termSeeds.evidence_level, review_status: "pending" }));
writeFileSync(paths.termManifest, `${JSON.stringify({ schema_version: "1.0.0", document_id: termSeeds.document_id, domain_id: termSeeds.domain_id, batch_id: batchId, term_count: termRecords.length, terms: termRecords }, null, 2)}\n`);
const aggregateTerms = [...priorTermManifests.flatMap((manifest) => manifest.terms.map((term) => ({ ...term, source_batch_id: manifest.batch_id }))), ...termRecords.map((term) => ({ ...term, source_batch_id: batchId }))].sort((a, b) => a.term_key.localeCompare(b.term_key));
writeFileSync(paths.aggregateTerms, `${JSON.stringify({ schema_version: "1.0.0", document_id: termSeeds.document_id, domain_id: termSeeds.domain_id, manifest_scope: "aggregate-through-m2d", batch_counts: Object.fromEntries([...priorTermManifests.map((manifest) => [manifest.batch_id, manifest.term_count]), [batchId, termRecords.length]]), term_count: aggregateTerms.length, terms: aggregateTerms }, null, 2)}\n`);
const termLines = ["---", "title: 第 7–8 章新增 Agent 与应用术语", "doc_type: glossary", "module: scm", "topic: ontology-ai-data-management-m2d", "status: draft", "created: 2026-07-18", "updated: 2026-07-18", "owner: self", "source: human+ai", "---", "", "# 第 7–8 章新增 Agent 与应用术语", "", "仅收录相对 M2-C 新增的来源派生术语。", "", "| 首选词 | 检索别名 | 来源内定义 | 不等同于 | 来源小节 |", "|---|---|---|---|---|"];
for (const term of termRecords) termLines.push(`| ${term.preferred_label} | ${term.aliases.join("；") || "—"} | ${term.definition} | ${term.not_equivalent_to.join("；") || "—"} | ${term.section_ids.join("、")} |`);
termLines.push(""); writeFileSync(paths.termTable, termLines.join("\n"));

const nodeByKey = new Map();
for (const manifest of priorCardManifests) for (const card of manifest.cards) nodeByKey.set(card.semantic_key, { id: card.card_id, type: "KnowledgeCard" });
for (const card of cardRecords) nodeByKey.set(card.semantic_key, { id: card.card_id, type: "KnowledgeCard" });
for (const manifest of priorTermManifests) for (const term of manifest.terms) nodeByKey.set(term.term_key, { id: term.term_id, type: "Term" });
for (const term of termRecords) nodeByKey.set(term.term_key, { id: term.term_id, type: "Term" });
const relationRecords = relationSeeds.relations.map((seed) => ({ relation_id: relationId(seed), subject_id: nodeByKey.get(seed.subject_key).id, subject_type: nodeByKey.get(seed.subject_key).type, subject_key: seed.subject_key, predicate: seed.predicate, object_id: nodeByKey.get(seed.object_key).id, object_type: nodeByKey.get(seed.object_key).type, object_key: seed.object_key, source_span_ids: seed.section_ids.map((id) => spanId(sectionById.get(id))), section_ids: seed.section_ids, rationale: seed.rationale, relation_status: relationSeeds.relation_status, review_status: relationSeeds.review_status, content_hash: sha256(canonicalize(seed)) }));
writeFileSync(paths.relationManifest, `${JSON.stringify({ schema_version: "1.0.0", document_id: relationSeeds.document_id, domain_id: relationSeeds.domain_id, batch_id: batchId, allowed_predicates: relationSeeds.allowed_predicates, relation_count: relationRecords.length, relations: relationRecords }, null, 2)}\n`);
const aggregateRelations = [...priorRelationManifests.flatMap((manifest) => manifest.relations.map((relation) => ({ ...relation, source_batch_id: manifest.batch_id }))), ...relationRecords.map((relation) => ({ ...relation, source_batch_id: batchId }))].sort((a, b) => a.relation_id.localeCompare(b.relation_id));
writeFileSync(paths.aggregateRelations, `${JSON.stringify({ schema_version: "1.0.0", document_id: relationSeeds.document_id, domain_id: relationSeeds.domain_id, manifest_scope: "aggregate-through-m2d", allowed_predicates: relationSeeds.allowed_predicates, batch_counts: Object.fromEntries([...priorRelationManifests.map((manifest) => [manifest.batch_id, manifest.relation_count]), [batchId, relationRecords.length]]), relation_count: aggregateRelations.length, relations: aggregateRelations }, null, 2)}\n`);
const relationLines = ["---", "title: 第 7–8 章 Agent 与应用候选关系", "doc_type: relation-map", "module: scm", "topic: ontology-ai-data-management-m2d", "status: draft", "created: 2026-07-18", "updated: 2026-07-18", "owner: self", "source: human+ai", "---", "", "# 第 7–8 章 Agent 与应用候选关系", "", "以下关系均为 `candidate/pending`，没有 SCM crosswalk。", "", "| 主体 | 关系 | 客体 | 理由 | 来源小节 |", "|---|---|---|---|---|"];
for (const relation of relationSeeds.relations) relationLines.push(`| \`${relation.subject_key}\` | \`${relation.predicate}\` | \`${relation.object_key}\` | ${relation.rationale} | ${relation.section_ids.join("、")} |`);
relationLines.push(""); writeFileSync(paths.relationTable, relationLines.join("\n"));

const countBy = (items, key) => Object.fromEntries([...new Set(items.map((item) => item[key]))].sort().map((value) => [value, items.filter((item) => item[key] === value).length]));
writeFileSync(paths.summary, `${JSON.stringify({ schema_version: "1.0.0", batch_id: batchId, scope: "第 7–8 章来源内 Agent 工程与应用场景萃取", section_record_count: sectionMap.sections.length, substantive_subsection_count: sectionMap.sections.filter((section) => /^[78]\.\d+\.\d+$/.test(section.section_id)).length, chapter_summary_count: sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length, card_count: cardRecords.length, term_count: termRecords.length, relation_count: relationRecords.length, pdf_page_start: 128, pdf_page_end: 178, claim_type_counts: countBy(sectionMap.sections, "claim_type"), visual_review_counts: countBy(sourceSpans, "visual_review_status"), selected_visual_review_page_count: visualReview.reviews.length, boundaries: { faithful_source_paraphrase_only: true, author_examples_independently_verified: false, author_metrics_independently_verified: false, official_standards_verified: false, scm_crosswalk_performed: false, importer_modified: false, database_write: false, provider_call: false, full_raw_text_persisted: false, full_page_images_persisted: false, personal_absolute_path_persisted: false } }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: "m2d_content_built", section_records: sourceSpans.length, cards: cardRecords.length, terms: termRecords.length, relations: relationRecords.length })}\n`);
