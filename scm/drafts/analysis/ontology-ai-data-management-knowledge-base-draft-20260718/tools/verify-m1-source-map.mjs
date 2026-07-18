import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultOutputRoot = resolve(__dirname, "..");

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const value = argv[index + 1];
    if (value && !value.startsWith("--")) {
      values.set(argument, value);
      index += 1;
    }
  }
  return values;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseJsonl(path) {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${path}:${index + 1}: ${error.message}`);
      }
    });
}

function walkFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

const args = parseArgs(process.argv.slice(2));
const pdfPath = args.get("--pdf");
const outputRoot = resolve(args.get("--output-root") || defaultOutputRoot);
const failures = [];

function verify(condition, message) {
  if (!condition) failures.push(message);
}

if (!pdfPath) throw new Error("Missing required --pdf argument.");
if (!existsSync(pdfPath)) throw new Error(`PDF does not exist: ${pdfPath}`);

const governanceDir = resolve(outputRoot, "00-governance");
const sourceMapDir = resolve(outputRoot, "01-source-map");
const manifest = JSON.parse(readFileSync(resolve(governanceDir, "source-manifest.json"), "utf8"));
const coverage = parseJsonl(resolve(sourceMapDir, "page-coverage.jsonl"));
const artifacts = parseJsonl(resolve(sourceMapDir, "figure-table-manifest.jsonl"));
const structure = readFileSync(resolve(sourceMapDir, "book-structure.md"), "utf8");
const pdfBuffer = readFileSync(pdfPath);

verify(manifest.sha256 === sha256(pdfBuffer), "source SHA-256 does not match the provided PDF");
verify(manifest.file_size_bytes === pdfBuffer.length, "source file size does not match the provided PDF");
verify(manifest.pdf_metadata.pages === 211, "manifest page count must be 211");
verify(manifest.source_absolute_path_persisted === false, "manifest must declare that absolute source path is not persisted");
verify(manifest.extraction_policy.raw_full_text_persisted === false, "raw full text must not be persisted");
verify(manifest.extraction_policy.full_page_images_persisted === false, "full page images must not be persisted");

verify(coverage.length === 211, `page coverage must contain 211 records, got ${coverage.length}`);
const pageNumbers = coverage.map((row) => row.pdf_page);
verify(new Set(pageNumbers).size === 211, "page coverage contains duplicate page numbers");
verify(pageNumbers.every((page, index) => page === index + 1), "page coverage must be ordered from page 1 through 211");
verify(coverage.every((row) => /^[a-f0-9]{64}$/.test(row.text_sha256)), "every page must have a valid text SHA-256");

const emptyPages = coverage.filter((row) => row.extraction_status === "empty_text_layer").map((row) => row.pdf_page);
const lowTextPages = coverage.filter((row) => row.extraction_status === "low_text_requires_visual_review").map((row) => row.pdf_page);
verify(JSON.stringify(emptyPages) === JSON.stringify([2, 211]), `unexpected empty text pages: ${emptyPages.join(",")}`);
verify(JSON.stringify(lowTextPages) === JSON.stringify([1]), `unexpected low text pages: ${lowTextPages.join(",")}`);

const headingEntries = new Map();
coverage.flatMap((row) => row.headings).forEach((heading) => {
  headingEntries.set(`${heading.kind}|${heading.label}`, heading);
});
const headingCounts = {
  front_matter: [...headingEntries.values()].filter((entry) => entry.kind === "front_matter").length,
  parts: [...headingEntries.values()].filter((entry) => entry.kind === "part").length,
  chapters: [...headingEntries.values()].filter((entry) => entry.kind === "chapter").length,
  sections: [...headingEntries.values()].filter((entry) => entry.kind === "section").length,
  subsections: [...headingEntries.values()].filter((entry) => entry.kind === "subsection").length
};
verify(JSON.stringify(headingCounts) === JSON.stringify(manifest.structure_summary), "structure summary does not match page headings");
verify(headingCounts.parts === 4, `expected 4 parts, got ${headingCounts.parts}`);
verify(headingCounts.chapters === 10, `expected 10 chapters, got ${headingCounts.chapters}`);
const chapterNumbers = [...headingEntries.values()]
  .filter((entry) => entry.kind === "chapter")
  .map((entry) => Number(entry.label.match(/^第\s*(\d+)\s*章/)?.[1]))
  .sort((a, b) => a - b);
verify(JSON.stringify(chapterNumbers) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), `chapter sequence is invalid: ${chapterNumbers.join(",")}`);
verify(structure.includes("篇：4") && structure.includes("章：10"), "book structure summary is missing expected part/chapter counts");

const artifactIds = artifacts.map((row) => row.artifact_id);
const artifactNumbers = artifacts.map((row) => `${row.artifact_type}:${row.number}`);
verify(new Set(artifactIds).size === artifacts.length, "figure/table manifest contains duplicate artifact IDs");
verify(new Set(artifactNumbers).size === artifacts.length, "figure/table manifest contains duplicate figure/table numbers");
verify(artifacts.every((row) => row.pdf_page >= 1 && row.pdf_page <= 211), "figure/table manifest contains an invalid page number");
const figureCount = artifacts.filter((row) => row.artifact_type === "figure").length;
const tableCount = artifacts.filter((row) => row.artifact_type === "table").length;
verify(figureCount === 74, `expected 74 figures, got ${figureCount}`);
verify(tableCount === 21, `expected 21 tables, got ${tableCount}`);
verify(manifest.coverage_summary.figure_records === figureCount, "manifest figure count does not match artifact manifest");
verify(manifest.coverage_summary.table_records === tableCount, "manifest table count does not match artifact manifest");

const artifactRefs = new Set(artifactNumbers);
const unresolvedRefs = coverage.flatMap((row) => row.figure_table_refs).filter((ref) => !artifactRefs.has(ref));
verify(unresolvedRefs.length === 0, `page coverage contains unresolved figure/table refs: ${[...new Set(unresolvedRefs)].join(",")}`);

const expectedReviewedPages = [1, 2, 40, 91, 97, 126, 145, 211];
verify(
  JSON.stringify(manifest.coverage_summary.visually_reviewed_pages) === JSON.stringify(expectedReviewedPages),
  "manifest visual review pages do not match the M1 review set"
);
verify(
  expectedReviewedPages.every((page) => coverage[page - 1].visual_review_status === "reviewed"),
  "one or more reviewed pages are not marked reviewed in page coverage"
);

const persistedFiles = [...walkFiles(governanceDir), ...walkFiles(sourceMapDir)];
const forbiddenExtensions = new Set([".pdf", ".png", ".jpg", ".jpeg", ".txt"]);
verify(!persistedFiles.some((path) => forbiddenExtensions.has(extname(path).toLowerCase())), "persisted M1 artifacts contain raw PDF/text/page images");
const persistedContent = persistedFiles.map((path) => readFileSync(path, "utf8")).join("\n");
verify(!/\/Users\/pray|Desktop|Pray\.Chow|MacBook/.test(persistedContent), "persisted M1 artifacts contain a personal absolute path");

const summary = {
  status: failures.length ? "m1_verification_failed" : "m1_verification_passed",
  failures,
  source_sha256: manifest.sha256,
  pages: coverage.length,
  empty_text_pages: emptyPages,
  low_text_pages: lowTextPages,
  structure: headingCounts,
  figures: figureCount,
  tables: tableCount,
  visually_reviewed_pages: expectedReviewedPages,
  persisted_artifact_files: persistedFiles.length
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exit(1);
