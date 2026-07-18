import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultOutputRoot = resolve(__dirname, "..");

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      values.set(argument, "true");
    } else {
      values.set(argument, value);
      index += 1;
    }
  }
  return values;
}

function commandOutput(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
}

function commandVersion(command) {
  const result = spawnSync(command, ["-v"], { encoding: "utf8" });
  const combined = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  return combined.split(/\r?\n/).find(Boolean) || "unknown";
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parsePdfInfo(text) {
  const info = {};
  text.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) return;
    info[match[1].trim()] = match[2].trim();
  });
  return info;
}

function parseImageObjects(text) {
  const byPage = new Map();
  let totalObjects = 0;
  text.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*(\d+)\s+\d+\s+(image|smask|mask)\s+/);
    if (!match) return;
    const page = Number(match[1]);
    const type = match[2];
    const record = byPage.get(page) || { image: 0, smask: 0, mask: 0, total: 0 };
    record[type] += 1;
    record.total += 1;
    totalObjects += 1;
    byPage.set(page, record);
  });
  return { byPage, totalObjects };
}

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function detectHeading(line, page) {
  const normalized = normalizeLine(line);
  if (!normalized) return null;

  const partNames = new Set(["战略认知篇", "核心理论篇", "落地实施篇", "未来展望篇"]);
  if (partNames.has(normalized)) {
    return { kind: "part", label: normalized, page };
  }

  const chapter = normalized.match(/^第\s*(\d+)\s*章\s+(.+)$/);
  if (chapter) {
    return {
      kind: "chapter",
      number: Number(chapter[1]),
      label: `第 ${chapter[1]} 章 ${chapter[2]}`,
      page
    };
  }

  const subsection = normalized.match(/^(\d+)\.(\d+)\.(\d+)\s+(.+)$/);
  if (subsection) {
    return {
      kind: "subsection",
      number: `${subsection[1]}.${subsection[2]}.${subsection[3]}`,
      label: normalized,
      page
    };
  }

  const section = normalized.match(/^(\d+)\.(\d+)\s+(.+)$/);
  if (section) {
    return {
      kind: "section",
      number: `${section[1]}.${section[2]}`,
      label: normalized,
      page
    };
  }

  if (page <= 7 && ["序", "前言", "本书主要内容", "本书读者对象", "本书内容特色", "资源和勘误", "致谢"].includes(normalized)) {
    return { kind: "front_matter", label: normalized, page };
  }

  return null;
}

function snapshotSection(state) {
  return {
    part: state.part || null,
    chapter: state.chapter || null,
    section: state.section || null,
    subsection: state.subsection || null
  };
}

function updateSectionState(state, heading) {
  if (heading.kind === "part") {
    state.part = heading.label;
    state.chapter = null;
    state.section = null;
    state.subsection = null;
  } else if (heading.kind === "chapter") {
    state.chapter = heading.label;
    state.section = null;
    state.subsection = null;
  } else if (heading.kind === "section") {
    state.section = heading.label;
    state.subsection = null;
  } else if (heading.kind === "subsection") {
    state.subsection = heading.label;
  } else if (heading.kind === "front_matter") {
    state.part = "前置内容";
    state.chapter = heading.label;
    state.section = null;
    state.subsection = null;
  }
}

function detectCaptions(lines, page, sectionSnapshots) {
  const captions = [];
  lines.forEach((line, index) => {
    const normalized = normalizeLine(line);
    const match = normalized.match(/^(图|表)\s*(\d+)\s*[-–—]\s*(\d+)\s*(.*)$/);
    if (!match) return;
    let caption = normalizeLine(match[4]);
    if (!caption) {
      const next = lines.slice(index + 1).map(normalizeLine).find(Boolean) || "";
      if (next.length <= 240 && !detectHeading(next, page)) caption = next;
    }
    if (/^(?:展示|所示|对比(?:了)?|）)/.test(caption)) return;
    captions.push({
      artifact_type: match[1] === "图" ? "figure" : "table",
      number: `${match[2]}-${match[3]}`,
      caption: caption.slice(0, 240),
      section_path: sectionSnapshots[index]
    });
  });
  return captions;
}

function normalizeSemanticText(value) {
  return value.replace(/[\s，。、“”‘’：:；;（）()《》—–-]+/g, "");
}

function resolveCaptionSectionPath(caption, fallback, subsectionCandidates) {
  const normalizedCaption = normalizeSemanticText(caption);
  if (normalizedCaption.length < 12) return fallback;
  const match = subsectionCandidates.findLast((candidate) => {
    if (candidate.section_path.chapter !== fallback.chapter || candidate.section_path.section !== fallback.section) return false;
    const normalizedLabel = normalizeSemanticText(candidate.label);
    return normalizedLabel.includes(normalizedCaption) || normalizedCaption.includes(normalizedLabel.replace(/^\d+(?:\.\d+){2}/, ""));
  });
  return match?.section_path || fallback;
}

function yamlFrontmatter(title, topic) {
  return [
    "---",
    `title: ${title}`,
    "doc_type: source-map",
    "module: scm",
    `topic: ${topic}`,
    "status: draft",
    "created: 2026-07-18",
    "updated: 2026-07-18",
    "owner: self",
    "source: generated-from-user-provided-pdf",
    "---",
    ""
  ].join("\n");
}

function buildStructureMarkdown(entries, summary) {
  const lines = [
    yamlFrontmatter("《本体驱动的 AI 数据管理》章节结构与页码索引", "ontology-ai-data-management-book-structure"),
    "# 《本体驱动的 AI 数据管理》章节结构与页码索引",
    "",
    "## 生成边界",
    "",
    "- 本索引只保存标题与 PDF 物理页码，不保存整书原文。",
    "- 页码均为 PDF 物理页码，不等同于纸书印刷页码。",
    "- 章节标题来自 PDF 文本层，并由 M1 结构规则自动识别。",
    "",
    "## 结构统计",
    "",
    `- 篇：${summary.parts}`,
    `- 章：${summary.chapters}`,
    `- 二级节：${summary.sections}`,
    `- 三级节：${summary.subsections}`,
    "",
    "## 章节树",
    ""
  ];

  entries.forEach((entry) => {
    if (entry.kind === "front_matter") {
      lines.push(`- ${entry.label}（PDF p.${entry.page}）`);
    } else if (entry.kind === "part") {
      lines.push("", `## ${entry.label}（PDF p.${entry.page}）`, "");
    } else if (entry.kind === "chapter") {
      lines.push(`### ${entry.label}（PDF p.${entry.page}）`, "");
    } else if (entry.kind === "section") {
      lines.push(`- ${entry.label}（PDF p.${entry.page}）`);
    } else if (entry.kind === "subsection") {
      lines.push(`  - ${entry.label}（PDF p.${entry.page}）`);
    }
  });

  lines.push("");
  return lines.join("\n");
}

const args = parseArgs(process.argv.slice(2));
const pdfPath = args.get("--pdf");
const outputRoot = resolve(args.get("--output-root") || defaultOutputRoot);
const generatedAt = args.get("--generated-at");
const reviewedPages = new Set(
  String(args.get("--visual-reviewed-pages") || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0)
);

if (!pdfPath) {
  throw new Error("Missing required --pdf argument.");
}
if (!generatedAt) {
  throw new Error("Missing required --generated-at argument.");
}
if (Number.isNaN(Date.parse(generatedAt))) {
  throw new Error(`Invalid --generated-at value: ${generatedAt}`);
}
if (!existsSync(pdfPath)) {
  throw new Error(`PDF does not exist: ${pdfPath}`);
}

const governanceDir = resolve(outputRoot, "00-governance");
const sourceMapDir = resolve(outputRoot, "01-source-map");
mkdirSync(governanceDir, { recursive: true });
mkdirSync(sourceMapDir, { recursive: true });

const pdfBuffer = readFileSync(pdfPath);
const pdfInfoText = commandOutput("pdfinfo", [pdfPath]);
const pdfInfo = parsePdfInfo(pdfInfoText);
const pageCount = Number(pdfInfo.Pages);
if (!Number.isInteger(pageCount) || pageCount < 1) {
  throw new Error(`Invalid PDF page count: ${pdfInfo.Pages}`);
}

const extractedText = commandOutput("pdftotext", ["-layout", pdfPath, "-"]);
const rawPages = extractedText.split("\f");
while (rawPages.length > pageCount && rawPages.at(-1).trim() === "") rawPages.pop();
if (rawPages.length !== pageCount) {
  throw new Error(`Page split mismatch: expected ${pageCount}, got ${rawPages.length}`);
}

const imageObjects = parseImageObjects(commandOutput("pdfimages", ["-list", pdfPath]));
const sectionState = { part: null, chapter: null, section: null, subsection: null };
const structureEntries = [];
const pageCoverage = [];
const artifactRows = [];
const artifactKeys = new Set();
const subsectionCandidates = [];

rawPages.forEach((pageText, pageIndex) => {
  const page = pageIndex + 1;
  const lines = pageText.split(/\r?\n/);
  const sectionAtStart = snapshotSection(sectionState);
  const headings = [];
  const sectionSnapshots = [];

  lines.forEach((line, index) => {
    const heading = detectHeading(line, page);
    if (heading) {
      const key = `${heading.kind}|${heading.label}`;
      if (!structureEntries.some((entry) => `${entry.kind}|${entry.label}` === key)) {
        structureEntries.push(heading);
      }
      headings.push(heading);
      updateSectionState(sectionState, heading);
      if (heading.kind === "subsection") {
        subsectionCandidates.push({
          label: heading.label,
          section_path: snapshotSection(sectionState)
        });
      }
    }
    sectionSnapshots[index] = snapshotSection(sectionState);
  });

  const sectionAtEnd = snapshotSection(sectionState);
  const visibleCharacters = pageText.replace(/\s+/g, "").length;
  const extractionStatus = visibleCharacters === 0
    ? "empty_text_layer"
    : visibleCharacters < 100
      ? "low_text_requires_visual_review"
      : "text_extracted";
  const pageImages = imageObjects.byPage.get(page) || { image: 0, smask: 0, mask: 0, total: 0 };
  const captions = detectCaptions(lines, page, sectionSnapshots);

  captions.forEach((caption) => {
    const artifactKey = `${caption.artifact_type}|${caption.number}|${page}|${caption.caption}`;
    if (artifactKeys.has(artifactKey)) return;
    artifactKeys.add(artifactKey);
    artifactRows.push({
      artifact_id: `oadm-${caption.artifact_type}-${caption.number.replace("-", "-")}-p${String(page).padStart(3, "0")}`,
      document_id: "book-ontology-ai-data-management-2026",
      artifact_type: caption.artifact_type,
      number: caption.number,
      caption: caption.caption || null,
      pdf_page: page,
      section_path: resolveCaptionSectionPath(caption.caption, caption.section_path, subsectionCandidates),
      page_image_object_count: pageImages.total,
      detection_method: "pdf_text_caption_pattern",
      extraction_status: "caption_detected",
      visual_review_status: reviewedPages.has(page) ? "reviewed" : "pending"
    });
  });

  pageCoverage.push({
    span_id: `oadm-page-${String(page).padStart(3, "0")}`,
    document_id: "book-ontology-ai-data-management-2026",
    pdf_page: page,
    printed_page: null,
    extraction_status: extractionStatus,
    visible_character_count: visibleCharacters,
    line_count: lines.filter((line) => normalizeLine(line)).length,
    text_sha256: sha256(pageText),
    section_path_start: sectionAtStart,
    section_path_end: sectionAtEnd,
    headings: headings.map(({ kind, label }) => ({ kind, label })),
    figure_table_refs: captions.map((caption) => `${caption.artifact_type}:${caption.number}`),
    image_objects: pageImages,
    visual_review_status: reviewedPages.has(page)
      ? "reviewed"
      : extractionStatus !== "text_extracted" || pageImages.total > 0 || captions.length > 0
        ? "pending"
        : "not_required_for_m1"
  });
});

const structureSummary = {
  front_matter: structureEntries.filter((entry) => entry.kind === "front_matter").length,
  parts: structureEntries.filter((entry) => entry.kind === "part").length,
  chapters: structureEntries.filter((entry) => entry.kind === "chapter").length,
  sections: structureEntries.filter((entry) => entry.kind === "section").length,
  subsections: structureEntries.filter((entry) => entry.kind === "subsection").length
};

const coverageSummary = {
  total_pages: pageCoverage.length,
  text_extracted_pages: pageCoverage.filter((page) => page.extraction_status === "text_extracted").length,
  low_text_pages: pageCoverage.filter((page) => page.extraction_status === "low_text_requires_visual_review").length,
  empty_text_pages: pageCoverage.filter((page) => page.extraction_status === "empty_text_layer").length,
  pages_with_image_objects: pageCoverage.filter((page) => page.image_objects.total > 0).length,
  image_and_mask_objects: imageObjects.totalObjects,
  figure_records: artifactRows.filter((item) => item.artifact_type === "figure").length,
  table_records: artifactRows.filter((item) => item.artifact_type === "table").length,
  visually_reviewed_pages: [...reviewedPages].sort((a, b) => a - b)
};

const sourceManifest = {
  schema_version: "1.0.0",
  generated_at: generatedAt,
  document_id: "book-ontology-ai-data-management-2026",
  domain_id: "ontology-ai-data-management-draft",
  status: "draft",
  evidence_level: "published-book-derived-candidate",
  source_locator: "user-provided-local-attachment://book-ontology-ai-data-management-2026",
  source_absolute_path_persisted: false,
  source_file_name: basename(pdfPath),
  media_type: "application/pdf",
  sha256: sha256(pdfBuffer),
  file_size_bytes: pdfBuffer.length,
  pdf_metadata: {
    title: pdfInfo.Title || null,
    author: pdfInfo.Author || null,
    creator: pdfInfo.Creator || null,
    creation_date: pdfInfo.CreationDate || null,
    modification_date: pdfInfo.ModDate || null,
    pages: pageCount,
    page_size: pdfInfo["Page size"] || null,
    tagged: pdfInfo.Tagged || null,
    encrypted: pdfInfo.Encrypted || null,
    javascript: pdfInfo.JavaScript || null,
    pdf_version: pdfInfo["PDF version"] || null
  },
  extraction_policy: {
    text_method: "pdftotext-layout",
    visual_method: "pdftoppm-selected-pages",
    raw_full_text_persisted: false,
    full_page_images_persisted: false,
    page_level_hashes_persisted: true,
    physical_pdf_page_is_primary_locator: true
  },
  toolchain: {
    node: process.version,
    pdfinfo: commandVersion("pdfinfo"),
    pdftotext: commandVersion("pdftotext"),
    pdfimages: commandVersion("pdfimages"),
    pdftoppm: commandVersion("pdftoppm")
  },
  structure_summary: structureSummary,
  coverage_summary: coverageSummary,
  rights_and_access: {
    access_scope: "private-project-derived-use",
    redistribution: "prohibited_by_project_policy",
    tracked_artifacts: "metadata-derived-structure-and-later-paraphrased-knowledge-cards-only",
    owner_review_required_for_promotion: true
  }
};

writeFileSync(resolve(governanceDir, "source-manifest.json"), `${JSON.stringify(sourceManifest, null, 2)}\n`);
writeFileSync(resolve(sourceMapDir, "page-coverage.jsonl"), `${pageCoverage.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeFileSync(resolve(sourceMapDir, "figure-table-manifest.jsonl"), `${artifactRows.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeFileSync(resolve(sourceMapDir, "book-structure.md"), buildStructureMarkdown(structureEntries, structureSummary));

console.log(JSON.stringify({
  status: "m1_source_map_generated",
  output_root: outputRoot,
  source_sha256: sourceManifest.sha256,
  structure_summary: structureSummary,
  coverage_summary: coverageSummary
}, null, 2));
