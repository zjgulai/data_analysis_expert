import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const batchId = "m2e-agent-governance-future-enterprise-ch09-ch10";
const at = (value) => resolve(root, value);
const paths = {
  sectionMap: at("manifests/m2e-section-map.json"), cardSeeds: at("manifests/m2e-card-seeds.json"),
  termSeeds: at("manifests/m2e-term-seeds.json"), relationSeeds: at("manifests/m2e-relation-seeds.json"),
  visualReview: at("manifests/m2e-visual-review.json"), pageCoverage: at("01-source-map/page-coverage.jsonl"),
  artifacts: at("01-source-map/figure-table-manifest.jsonl"),
  priorSectionMaps: ["m2a", "m2b", "m2c", "m2d"].map((id) => at(`manifests/${id}-section-map.json`)),
  priorCards: ["m2a", "m2b", "m2c", "m2d"].map((id) => at(`manifests/${id}-knowledge-card-manifest.json`)),
  priorTerms: ["m2b", "m2c", "m2d"].map((id) => at(`manifests/${id}-knowledge-term-manifest.json`)),
  priorRelations: ["m2b", "m2c", "m2d"].map((id) => at(`manifests/${id}-knowledge-relation-manifest.json`)),
  priorSpans: ["m2a", "m2b", "m2c", "m2d"].map((id) => at(`manifests/${id}-source-spans.json`)),
  contentDir: at("06-agent-governance-future-enterprise"), cardsDir: at("06-agent-governance-future-enterprise/cards"),
  contentMap: at("06-agent-governance-future-enterprise/00-agent-governance-future-enterprise-content-map.md"),
  termTable: at("06-agent-governance-future-enterprise/01-agent-governance-future-enterprise-terms.md"),
  relationTable: at("06-agent-governance-future-enterprise/02-agent-governance-future-enterprise-relations.md"),
  spans: at("manifests/m2e-source-spans.json"), cardManifest: at("manifests/m2e-knowledge-card-manifest.json"),
  aggregateCards: at("manifests/knowledge-card-manifest.json"), termManifest: at("manifests/m2e-knowledge-term-manifest.json"),
  aggregateTerms: at("manifests/knowledge-term-manifest.json"), relationManifest: at("manifests/m2e-knowledge-relation-manifest.json"),
  aggregateRelations: at("manifests/knowledge-relation-manifest.json"), summary: at("manifests/m2e-batch-summary.json"),
  qualityJson: at("manifests/full-book-quality-report.json"), qualityMd: at("00-governance/full-book-coverage-quality-report.md")
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => Array.isArray(value) ? `[${value.map(canonicalize).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}` : JSON.stringify(value);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readJsonl = (path) => readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const cardId = (seed) => `oadm-${seed.semantic_slug}-${sha256(seed.semantic_key).slice(0, 10)}`;
const termId = (seed) => `oadm-term-${seed.term_key.split(":").at(-1)}-${sha256(seed.term_key).slice(0, 8)}`;
const relationId = (seed) => `oadm-rel-${sha256(`${seed.subject_key}|${seed.predicate}|${seed.object_key}`).slice(0, 12)}`;
const spanId = (section) => `oadm-span-s${section.section_id.replaceAll(".", "-")}-p${String(section.pdf_page_start).padStart(3, "0")}-p${String(section.pdf_page_end).padStart(3, "0")}`;
const pageLabel = (start, end) => start === end ? `PDF p.${start}` : `PDF pp.${start}–${end}`;
const list = (items) => items.map((item) => `- ${item}`).join("\n");
const duplicates = (items) => [...new Set(items.filter((item, index) => items.indexOf(item) !== index))].sort();
const countBy = (items, key) => Object.fromEntries([...new Set(items.map((item) => item[key]))].sort().map((value) => [value, items.filter((item) => item[key] === value).length]));

const sectionMap = readJson(paths.sectionMap);
const cardSeeds = readJson(paths.cardSeeds);
const termSeeds = readJson(paths.termSeeds);
const relationSeeds = readJson(paths.relationSeeds);
const visualReview = readJson(paths.visualReview);
const priorSectionMaps = paths.priorSectionMaps.map(readJson);
const priorCardManifests = paths.priorCards.map(readJson);
const priorTermManifests = paths.priorTerms.map(readJson);
const priorRelationManifests = paths.priorRelations.map(readJson);
const priorSpanManifests = paths.priorSpans.map(readJson);
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
  "---", "title: 第 9–10 章 Agent 治理与未来企业形态忠实内容地图", "doc_type: content-map", "module: scm",
  "topic: ontology-ai-data-management-m2e", "status: draft", "created: 2026-07-18", "updated: 2026-07-18", "owner: self", "source: human+ai", "---", "",
  "# 第 9–10 章 Agent 治理与未来企业形态忠实内容地图", "", "## 范围与边界", "",
  "本地图覆盖 23 个三级正文小节和 2 个章末小结，共 25 条来源记录。所有摘要均为来源观点释义，证据等级为 `published-book-derived-candidate`。", "",
  "区块链、DID、VC、NFT、零知识证明、智能合约、业界项目、性能阈值和未来企业效果均未在本项目独立核验；本批未执行 SCM 映射、导入、数据库写入或外部调用。", ""
];
for (const chapter of [...new Set(sectionMap.sections.map((section) => section.chapter))]) {
  contentLines.push(`## ${chapter}`, "", "| 小节 | 页码 | 证据类型 | 忠实摘要 | 图表锚点 |", "|---|---:|---|---|---|");
  for (const section of sectionMap.sections.filter((item) => item.chapter === chapter)) {
    const refs = section.figure_table_refs.length ? section.figure_table_refs.map((id) => `\`${id}\``).join("<br>") : "—";
    contentLines.push(`| ${section.section_id} ${section.title} | ${pageLabel(section.pdf_page_start, section.pdf_page_end)} | \`${section.claim_type}\` | ${section.summary} | ${refs} |`);
  }
  contentLines.push("");
}
contentLines.push("## 解释边界", "", "- `author_industry_example` 只表示作者列举的案例，未执行外部事实核验。", "- 区块链只是来源提出的候选可信底座，不代表本项目选择了该技术路线。", "- 第 10 章关于指数增长、零边际成本和 Agent 中心组织均为作者前瞻判断。", "");
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
    "## SCM 候选映射", "", "M2-E 仅完成来源内 Agent 治理与未来企业形态萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。", "",
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
writeFileSync(paths.aggregateCards, `${JSON.stringify({ schema_version: "1.0.0", document_id: cardSeeds.document_id, domain_id: cardSeeds.domain_id, manifest_scope: "aggregate-through-m2e", batch_counts: Object.fromEntries([...priorCardManifests.map((manifest) => [manifest.batch_id, manifest.card_count]), [batchId, cardRecords.length]]), card_count: aggregateCards.length, cards: aggregateCards }, null, 2)}\n`);

const termRecords = termSeeds.terms.map((seed) => ({ term_id: termId(seed), term_key: seed.term_key, preferred_label: seed.preferred_label, aliases: seed.aliases, definition: seed.definition, not_equivalent_to: seed.not_equivalent_to, section_ids: seed.section_ids, source_span_ids: seed.section_ids.map((id) => spanId(sectionById.get(id))), content_hash: sha256(canonicalize(seed)), evidence_level: termSeeds.evidence_level, review_status: "pending" }));
writeFileSync(paths.termManifest, `${JSON.stringify({ schema_version: "1.0.0", document_id: termSeeds.document_id, domain_id: termSeeds.domain_id, batch_id: batchId, term_count: termRecords.length, terms: termRecords }, null, 2)}\n`);
const aggregateTerms = [...priorTermManifests.flatMap((manifest) => manifest.terms.map((term) => ({ ...term, source_batch_id: manifest.batch_id }))), ...termRecords.map((term) => ({ ...term, source_batch_id: batchId }))].sort((a, b) => a.term_key.localeCompare(b.term_key));
writeFileSync(paths.aggregateTerms, `${JSON.stringify({ schema_version: "1.0.0", document_id: termSeeds.document_id, domain_id: termSeeds.domain_id, manifest_scope: "aggregate-through-m2e", batch_counts: Object.fromEntries([...priorTermManifests.map((manifest) => [manifest.batch_id, manifest.term_count]), [batchId, termRecords.length]]), term_count: aggregateTerms.length, terms: aggregateTerms }, null, 2)}\n`);
const termLines = ["---", "title: 第 9–10 章新增治理与未来企业术语", "doc_type: glossary", "module: scm", "topic: ontology-ai-data-management-m2e", "status: draft", "created: 2026-07-18", "updated: 2026-07-18", "owner: self", "source: human+ai", "---", "", "# 第 9–10 章新增治理与未来企业术语", "", "仅收录相对 M2-D 新增的来源派生术语。", "", "| 首选词 | 检索别名 | 来源内定义 | 不等同于 | 来源小节 |", "|---|---|---|---|---|"];
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
writeFileSync(paths.aggregateRelations, `${JSON.stringify({ schema_version: "1.0.0", document_id: relationSeeds.document_id, domain_id: relationSeeds.domain_id, manifest_scope: "aggregate-through-m2e", allowed_predicates: relationSeeds.allowed_predicates, batch_counts: Object.fromEntries([...priorRelationManifests.map((manifest) => [manifest.batch_id, manifest.relation_count]), [batchId, relationRecords.length]]), relation_count: aggregateRelations.length, relations: aggregateRelations }, null, 2)}\n`);
const relationLines = ["---", "title: 第 9–10 章治理与未来企业候选关系", "doc_type: relation-map", "module: scm", "topic: ontology-ai-data-management-m2e", "status: draft", "created: 2026-07-18", "updated: 2026-07-18", "owner: self", "source: human+ai", "---", "", "# 第 9–10 章治理与未来企业候选关系", "", "以下关系均为 `candidate/pending`，没有 SCM crosswalk。", "", "| 主体 | 关系 | 客体 | 理由 | 来源小节 |", "|---|---|---|---|---|"];
for (const relation of relationSeeds.relations) relationLines.push(`| \`${relation.subject_key}\` | \`${relation.predicate}\` | \`${relation.object_key}\` | ${relation.rationale} | ${relation.section_ids.join("、")} |`);
relationLines.push(""); writeFileSync(paths.relationTable, relationLines.join("\n"));

writeFileSync(paths.summary, `${JSON.stringify({ schema_version: "1.0.0", batch_id: batchId, scope: "第 9–10 章来源内 Agent 治理与未来企业形态萃取", section_record_count: sectionMap.sections.length, substantive_subsection_count: sectionMap.sections.filter((section) => /^(9|10)\.\d+\.\d+$/.test(section.section_id)).length, chapter_summary_count: sectionMap.sections.filter((section) => section.claim_type === "chapter_summary").length, card_count: cardRecords.length, term_count: termRecords.length, relation_count: relationRecords.length, pdf_page_start: 179, pdf_page_end: 209, claim_type_counts: countBy(sectionMap.sections, "claim_type"), visual_review_counts: countBy(sourceSpans, "visual_review_status"), selected_visual_review_page_count: visualReview.reviews.length, boundaries: { faithful_source_paraphrase_only: true, blockchain_architecture_selected: false, industry_examples_independently_verified: false, author_metrics_independently_verified: false, scm_crosswalk_performed: false, importer_modified: false, database_write: false, provider_call: false, full_raw_text_persisted: false, full_page_images_persisted: false, personal_absolute_path_persisted: false } }, null, 2)}\n`);

const allSections = [...priorSectionMaps.flatMap((manifest) => manifest.sections), ...sectionMap.sections];
const m1SubsectionIds = [...new Set(readJsonl(paths.pageCoverage).flatMap((page) => page.headings.filter((heading) => heading.kind === "subsection").map((heading) => heading.label.match(/^(\d+\.\d+\.\d+)\s/)?.[1]).filter(Boolean)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const extractedSubsectionIds = allSections.filter((section) => /^\d+\.\d+\.\d+$/.test(section.section_id)).map((section) => section.section_id).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const allSpans = [...priorSpanManifests.flatMap((manifest) => manifest.source_spans), ...sourceSpans];
const spanIds = new Set(allSpans.map((span) => span.span_id));
const nodeKeys = new Set([...aggregateCards.map((card) => card.semantic_key), ...aggregateTerms.map((term) => term.term_key)]);
const participatingKeys = new Set(aggregateRelations.flatMap((relation) => [relation.subject_key, relation.object_key]));
const normalizedTitleGroups = Object.entries(Object.groupBy(aggregateCards, (card) => card.title.toLowerCase().replace(/[\s—–：:、“”‘’（）()]+/g, ""))).filter(([, cards]) => cards.length > 1).map(([normalized_title, cards]) => ({ normalized_title, semantic_keys: cards.map((card) => card.semantic_key) }));
const quality = {
  schema_version: "1.0.0", report_scope: "full-book-m1-through-m2e", document_id: sectionMap.document_id,
  coverage: { chapter_count: 10, source_content_pdf_page_start: 8, source_content_pdf_page_end: 209, section_record_count: allSections.length, substantive_subsection_count: extractedSubsectionIds.length, chapter_summary_count: allSections.filter((section) => section.claim_type === "chapter_summary").length, m1_subsection_count: m1SubsectionIds.length, missing_subsection_ids: m1SubsectionIds.filter((id) => !extractedSubsectionIds.includes(id)), unexpected_subsection_ids: extractedSubsectionIds.filter((id) => !m1SubsectionIds.includes(id)) },
  inventory: { card_count: aggregateCards.length, term_count: aggregateTerms.length, relation_count: aggregateRelations.length, source_span_count: allSpans.length },
  exact_duplicates: { card_semantic_keys: duplicates(aggregateCards.map((card) => card.semantic_key)), card_ids: duplicates(aggregateCards.map((card) => card.card_id)), term_keys: duplicates(aggregateTerms.map((term) => term.term_key)), term_ids: duplicates(aggregateTerms.map((term) => term.term_id)), relation_ids: duplicates(aggregateRelations.map((relation) => relation.relation_id)), relation_edges: duplicates(aggregateRelations.map((relation) => `${relation.subject_key}|${relation.predicate}|${relation.object_key}`)) },
  semantic_duplicate_candidates: normalizedTitleGroups,
  relation_integrity: { missing_subject_nodes: aggregateRelations.filter((relation) => !nodeKeys.has(relation.subject_key)).map((relation) => relation.relation_id), missing_object_nodes: aggregateRelations.filter((relation) => !nodeKeys.has(relation.object_key)).map((relation) => relation.relation_id), m2e_orphan_card_keys: cardRecords.filter((card) => !participatingKeys.has(card.semantic_key)).map((card) => card.semantic_key), m2e_orphan_term_keys: termRecords.filter((term) => !participatingKeys.has(term.term_key)).map((term) => term.term_key), explicit_contradiction_relation_ids: aggregateRelations.filter((relation) => relation.predicate === "CONTRADICTS").map((relation) => relation.relation_id), explicit_contradiction_edge_count: aggregateRelations.filter((relation) => relation.predicate === "CONTRADICTS").length, semantic_contradiction_review_status: "manual_review_required" },
  source_integrity: { missing_card_source_span_ids: aggregateCards.flatMap((card) => card.source_span_ids.filter((id) => !spanIds.has(id))), missing_term_source_span_ids: aggregateTerms.flatMap((term) => term.source_span_ids.filter((id) => !spanIds.has(id))), missing_relation_source_span_ids: aggregateRelations.flatMap((relation) => relation.source_span_ids.filter((id) => !spanIds.has(id))), pending_visual_review_span_ids: allSpans.filter((span) => span.visual_review_status === "pending").map((span) => span.span_id) },
  boundaries: { exact_duplicate_scan_complete: true, normalized_title_candidate_scan_complete: true, semantic_equivalence_fully_proven: false, semantic_contradiction_fully_proven: false, scm_crosswalk_performed: false, database_write: false, provider_call: false }
};
writeFileSync(paths.qualityJson, `${JSON.stringify(quality, null, 2)}\n`);
const qualityLines = [
  "---", "title: 全书覆盖与知识图谱质量报告", "doc_type: quality-report", "module: scm", "topic: ontology-ai-data-management-full-book", "status: draft", "created: 2026-07-18", "updated: 2026-07-18", "owner: self", "source: human+ai", "---", "",
  "# 全书覆盖与知识图谱质量报告", "", "## 结论", "",
  `M1–M2E 已覆盖第 1–10 章的 ${quality.coverage.substantive_subsection_count} 个三级正文小节和 ${quality.coverage.chapter_summary_count} 个章末小结，共 ${quality.coverage.section_record_count} 条来源记录。当前聚合清单包含 ${quality.inventory.card_count} 张卡片、${quality.inventory.term_count} 个术语、${quality.inventory.relation_count} 条候选关系。`, "",
  "## 机器检查结果", "", `- M1 三级小节基线：${quality.coverage.m1_subsection_count}；M2 未覆盖：${quality.coverage.missing_subsection_ids.length}；意外新增：${quality.coverage.unexpected_subsection_ids.length}。`,
  `- 精确重复：卡片语义键 ${quality.exact_duplicates.card_semantic_keys.length}、卡片 ID ${quality.exact_duplicates.card_ids.length}、术语键 ${quality.exact_duplicates.term_keys.length}、术语 ID ${quality.exact_duplicates.term_ids.length}、关系 ID ${quality.exact_duplicates.relation_ids.length}、关系边 ${quality.exact_duplicates.relation_edges.length}。`,
  `- 归一化标题语义重复候选：${quality.semantic_duplicate_candidates.length} 组；关系缺失主体 ${quality.relation_integrity.missing_subject_nodes.length}，缺失客体 ${quality.relation_integrity.missing_object_nodes.length}。`,
  `- M2-E 关系孤儿：卡片 ${quality.relation_integrity.m2e_orphan_card_keys.length}、术语 ${quality.relation_integrity.m2e_orphan_term_keys.length}；显式 \`CONTRADICTS\` 候选边 ${quality.relation_integrity.explicit_contradiction_edge_count} 条。`,
  `- 来源跨度缺失：卡片 ${quality.source_integrity.missing_card_source_span_ids.length}、术语 ${quality.source_integrity.missing_term_source_span_ids.length}、关系 ${quality.source_integrity.missing_relation_source_span_ids.length}。`,
  `- 仍标记 pending 的图表来源跨度：${quality.source_integrity.pending_visual_review_span_ids.length}；这表示选择性视觉复核尚未覆盖所有含图表跨度，不等于正文遗漏。`, "",
  "## 不能由自动检查证明的事项", "", "- 标题不重复不能证明语义上完全不重复；归一化标题扫描只生成候选。", "- 显式 `CONTRADICTS` 候选边用于表达反模式与目标模式的冲突，不等于已经完成全书语义矛盾审查，仍需人工主题评审。", "- 作者案例、技术项目、效果数字和未来判断没有晋升为项目实证。", "- 本报告没有进行 SCM crosswalk、数据库写入、provider 调用或上线验证。", "",
  "## 下一门禁", "", "只有在人工接受本报告的证据边界后，才进入 M3-A：设计 SCM 候选映射规则与只读映射评审；不得直接导入数据库。", ""
];
writeFileSync(paths.qualityMd, qualityLines.join("\n"));
process.stdout.write(`${JSON.stringify({ status: "m2e_content_built", section_records: sourceSpans.length, cards: cardRecords.length, terms: termRecords.length, relations: relationRecords.length, full_book_sections: allSections.length, full_book_subsections: extractedSubsectionIds.length })}\n`);
