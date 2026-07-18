import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(toolsDir, "..");
const manifestsDir = resolve(root, "manifests");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readJsonl(path) {
  return readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("verification helpers enforce page locators and portable personal-path detection", async () => {
  const helpers = await import(pathToFileURL(resolve(toolsDir, "verification-helpers.mjs")));

  assert.equal(helpers.artifactMatchesPage({ pdf_page: 12 }, 12), true);
  assert.equal(helpers.artifactMatchesPage({ pdf_page: 12 }, 13), false);
  assert.equal(helpers.artifactWithinPageRange({ pdf_page: 12 }, 11, 12), true);
  assert.equal(helpers.artifactWithinPageRange({ pdf_page: 12 }, 13, 14), false);

  for (const value of [
    "/Users/alice/Documents/source.pdf",
    "/home/alice/source.pdf",
    "C:\\Users\\alice\\Desktop\\source.pdf",
    "C:\\Users\\Alice Smith\\source.pdf",
    "source: `/Users/alice/Documents/source.pdf`",
    "source: `${HOME}/project/source.pdf`",
    "$HOME/Library/source.pdf",
    "~/Library/source.pdf",
    "%USERPROFILE%\\source.pdf",
    "$env:USERPROFILE\\source.pdf"
  ]) {
    assert.equal(helpers.containsPersonalAbsolutePath(value), true, value);
  }
  for (const value of [
    "user-provided-local-attachment://book-ontology-ai-data-management-2026",
    "/var/lib/ontology/source.pdf"
  ]) {
    assert.equal(helpers.containsPersonalAbsolutePath(value), false, value);
  }
});

test("M1 builder requires an explicit deterministic generated-at value", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "oadm-m1-generated-at-"));
  const fakePdf = resolve(sandbox, "source.pdf");
  writeFileSync(fakePdf, "not a pdf");
  try {
    const result = spawnSync(process.execPath, [
      resolve(toolsDir, "build-m1-source-map.mjs"),
      "--pdf", fakePdf,
      "--output-root", resolve(sandbox, "output")
    ], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /Missing required --generated-at argument/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("generated M1 captions retain their line-local subsection", () => {
  const artifacts = readJsonl(resolve(root, "01-source-map/figure-table-manifest.jsonl"));
  const byNumber = new Map(artifacts.map((artifact) => [artifact.number, artifact]));
  assert.match(byNumber.get("5-2").section_path.subsection, /^5\.1\.2\s/);
  assert.match(byNumber.get("9-7").section_path.subsection, /^9\.2\.5\s/);
});

test("every section artifact reference stays within its physical PDF page range", () => {
  const artifacts = readJsonl(resolve(root, "01-source-map/figure-table-manifest.jsonl"));
  const artifactById = new Map(artifacts.map((artifact) => [artifact.artifact_id, artifact]));
  const mismatches = [];
  for (const stage of ["m2a", "m2b", "m2c", "m2d", "m2e"]) {
    const sectionMap = readJson(resolve(manifestsDir, `${stage}-section-map.json`));
    for (const section of sectionMap.sections) {
      for (const artifactId of section.figure_table_refs) {
        const artifact = artifactById.get(artifactId);
        if (!artifact || artifact.pdf_page < section.pdf_page_start || artifact.pdf_page > section.pdf_page_end) {
          mismatches.push({ stage, section_id: section.section_id, artifact_id: artifactId, artifact_page: artifact?.pdf_page });
        }
      }
    }
  }
  assert.deepEqual(mismatches, []);
});

for (const stage of ["m2b", "m2c", "m2d"]) {
  test(`${stage.toUpperCase()} builder does not overwrite canonical full-book manifests`, () => {
    const sandbox = mkdtempSync(join(tmpdir(), `oadm-${stage}-canonical-`));
    const sandboxRoot = resolve(sandbox, "knowledge-base");
    cpSync(root, sandboxRoot, { recursive: true });
    const canonicalPaths = ["card", "term", "relation"].map((kind) =>
      resolve(sandboxRoot, "manifests", `knowledge-${kind}-manifest.json`)
    );
    const before = canonicalPaths.map(sha256);
    try {
      const result = spawnSync(process.execPath, [resolve(sandboxRoot, "tools", `build-${stage}-content.mjs`)], { encoding: "utf8" });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
      assert.deepEqual(canonicalPaths.map(sha256), before);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });
}
