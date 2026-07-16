import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { countWorkstationHomePaths, redactWorkstationPaths, workstationHomeRedaction } from "./workstation-paths.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceAppRoot = resolve(scriptDir, "..");
const sourceDatabasePath = join(sourceAppRoot, "data", "governance_workbench.sqlite");
const sandboxRepositoryRoot = mkdtempSync(join(tmpdir(), "scm-import-gate-"));
const sandboxRoot = join(sandboxRepositoryRoot, "scm", "drafts", "prototypes", "scm-data-governance-workbench-v0");
const sandboxScriptDir = join(sandboxRoot, "scripts");
const sandboxDatabasePath = join(sandboxRoot, "data", "governance_workbench.sqlite");
const metricBlueprintFile = "supply-chain-metric-system-l0-l3-blueprint-mece-v2-20260618.json";
const loop3Rows = {
  action_tasks: ["action_loop3_20260701_finance_cost_tail_warehouse_return"],
  agent_traces: ["trace_loop3_20260701_finance_cost_tail_warehouse_return"],
  aip_scenarios: [
    "scenario_loop3_inventory_stockout_three_way_20260701",
    "scenario_loop3_finance_cost_tail_warehouse_return_20260701",
    "scenario_loop3_fulfillment_eta_delivery_exception_20260701"
  ],
  decision_logs: ["decision_loop3_20260701_finance_cost_tail_warehouse_return"],
  ontology_object_instances: ["cost_event_loop3_tail_warehouse_return_20260701"],
  recommendation_cards: ["rec_loop3_20260701_finance_cost_tail_warehouse_return"],
  trace_reviews: ["trace_review_loop3_20260701_finance_cost_tail_warehouse_return"]
};

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function countDatabasePersonalPaths(db) {
  let hits = 0;
  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  for (const { name } of tables) {
    const columns = db.prepare(`PRAGMA table_info(${quoteIdentifier(name)})`).all()
      .filter((column) => /(CHAR|CLOB|TEXT)/i.test(String(column.type || "")));
    for (const column of columns) {
      const values = db.prepare(`SELECT ${quoteIdentifier(column.name)} AS value FROM ${quoteIdentifier(name)} WHERE ${quoteIdentifier(column.name)} IS NOT NULL`).all();
      hits += values.filter(({ value }) => countWorkstationHomePaths(value) > 0).length;
    }
  }
  return hits;
}

function countRawDatabasePersonalPaths(path) {
  return countWorkstationHomePaths(readFileSync(path).toString("latin1"));
}

const sourceHashBefore = hashFile(sourceDatabasePath);
let gateError;
let gateSummary;
let rebuiltPersonalPathHits = null;
let rebuiltRawPersonalPathHits = null;
let rebuiltKnowledgePathFixtureVerified = false;
try {
  mkdirSync(join(sandboxRepositoryRoot, ".git"), { recursive: true });
  cpSync(join(sourceAppRoot, "scripts"), sandboxScriptDir, { recursive: true });
  cpSync(join(sourceAppRoot, "data"), join(sandboxRoot, "data"), { recursive: true });
  cpSync(join(sourceAppRoot, "migrations"), join(sandboxRoot, "migrations"), { recursive: true });

  const sandboxHashBefore = hashFile(sandboxDatabasePath);
  const result = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: { ...process.env, SCM_DATABASE_REBUILD_AUTHORIZED: "" },
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const failures = [];

  if (result.status === 0) failures.push("import must be rejected when database rebuild authorization is absent");
  if (!output.includes("SCM_DATABASE_REBUILD_AUTHORIZED")) {
    failures.push("rejected import must name SCM_DATABASE_REBUILD_AUTHORIZED");
  }
  if (sandboxHashBefore !== hashFile(sandboxDatabasePath)) failures.push("rejected import must preserve the sandbox SQLite hash");

  const missingSourceResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: {
      ...process.env,
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: join(sandboxRoot, "missing-primary-source"),
      SCM_IMPORT_SOURCE_ROOT: join(sandboxRoot, "missing-secondary-source")
    },
    encoding: "utf8"
  });
  const missingSourceOutput = `${missingSourceResult.stdout || ""}\n${missingSourceResult.stderr || ""}`;
  if (missingSourceResult.status !== 2) failures.push(`missing source must exit 2, got ${missingSourceResult.status}`);
  if (!missingSourceOutput.includes("blocked_source_required")) {
    failures.push("missing source must emit blocked_source_required");
  }
  if (sandboxHashBefore !== hashFile(sandboxDatabasePath)) failures.push("missing-source preflight must preserve the sandbox SQLite hash");
  if (readdirSync(join(sandboxRoot, "data")).some((name) => name.includes(".build-"))) {
    failures.push("missing-source preflight must not create a temporary SQLite build file");
  }

  const primarySource = join(sandboxRoot, "primary-source");
  const secondarySource = join(sandboxRoot, "secondary-source");
  mkdirSync(primarySource, { recursive: true });
  mkdirSync(secondarySource, { recursive: true });
  writeFileSync(join(primarySource, metricBlueprintFile), "{}\n");
  writeFileSync(join(secondarySource, metricBlueprintFile), "{}\n");
  const precedenceResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: {
      ...process.env,
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_IMPORT_PREFLIGHT_ONLY: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: primarySource,
      SCM_IMPORT_SOURCE_ROOT: secondarySource
    },
    encoding: "utf8"
  });
  const precedenceOutput = `${precedenceResult.stdout || ""}\n${precedenceResult.stderr || ""}`;
  if (precedenceResult.status !== 0) failures.push(`source preflight must pass, got ${precedenceResult.status}`);
  if (!precedenceOutput.includes("preflight_ok")) failures.push("source preflight must emit preflight_ok");
  if (!precedenceOutput.includes(primarySource)) failures.push("SCM_WORKBENCH_IMPORT_SOURCE_ROOT must take precedence");
  if (precedenceOutput.includes(`\"sourceRoot\": \"${secondarySource}`)) {
    failures.push("lower-precedence SCM_IMPORT_SOURCE_ROOT must not be selected when the primary source is ready");
  }
  if (sandboxHashBefore !== hashFile(sandboxDatabasePath)) failures.push("source-only preflight must preserve the sandbox SQLite hash");
  if (!existsSync(join(primarySource, metricBlueprintFile))) failures.push("source-only preflight must not mutate source fixtures");

  const rebuildSource = join(sandboxRoot, "authorized-rebuild-source");
  mkdirSync(rebuildSource, { recursive: true });
  writeFileSync(join(rebuildSource, metricBlueprintFile), `${JSON.stringify({ metrics: [] }, null, 2)}\n`);
  const knowledgeFixtureRoot = resolve(sandboxRoot, "../../analysis/jijia-scm-knowledge-base-draft-20260604");
  const knowledgeFixtureFile = join(knowledgeFixtureRoot, "portable-path-fixture.md");
  const chunkBoundaryUrlFixtureFile = join(knowledgeFixtureRoot, "chunk-boundary-url-fixture.md");
  const chunkBoundaryNestedFixtureFile = join(knowledgeFixtureRoot, "chunk-boundary-nested-fixture.md");
  const windowsSeparator = String.fromCharCode(92);
  const workstationPathFixtures = {
    mac: ["", "Users", "smoke-user", "private", "evidence.md"].join("/"),
    linux: ["", "home", "smoke-user", "private", "evidence.md"].join("/"),
    windows: ["C:", "Users", "Alice Smith", "private", "evidence.md"].join(windowsSeparator),
    windowsForwardDoubleSlash: "C://Users/Alice Smith/private/evidence.md",
    windowsAmpersandDescendant: ["C:", "Users", "Alice & Bob", "private"].join(windowsSeparator),
    windowsExtendedLength: `${windowsSeparator}${windowsSeparator}?${windowsSeparator}${["C:", "Users", "Alice", "private"].join(windowsSeparator)}`,
    mixed: `C:${windowsSeparator}Users/smoke-user/private/evidence.md`,
    macRoot: ["", "Users", "smoke-root"].join("/"),
    linuxRoot: ["", "home", "smoke-root"].join("/"),
    windowsRoot: ["C:", "Users", "smoke-root"].join(windowsSeparator),
    rootedWindowsRoot: ["", "Users", "smoke-root"].join(windowsSeparator),
    macRootWithSpace: ["", "Users", "Alice Smith"].join("/"),
    windowsRootWithSpace: ["C:", "Users", "Alice Smith"].join(windowsSeparator),
    windowsDescendantWithApostrophe: ["C:", "Users", "O'Brien", "private", "evidence.md"].join(windowsSeparator),
    wrappedMacRoot: `(${["", "Users", "alice"].join("/")})`,
    wrappedLinuxRoot: `[${["", "home", "alice"].join("/")}]`,
    commaMacRoot: `${["", "Users", "alice"].join("/")},`,
    periodLinuxRoot: `${["", "home", "alice"].join("/")}.`,
    fileUri: `file://${["", "Users", "alice", "file"].join("/")}`,
    fileUriSpacedDescendant: "file:///Users/Alice Smith/private/report.md",
    fileUriParticleDescendant: "file:///Users/Juan Carlos de la Cruz/private/report.md",
    fileUriConnectorDescendant: "file:///Users/Alice & Bob/private/report.md",
    localhostFileUriSpacedDescendant: "file://localhost/Users/Alice Smith/private/report.md",
    nestedMac: ["", "Users", "alice", "Users", "bob"].join("/"),
    nestedLinux: ["", "home", "alice", "home", "bob"].join("/"),
    nestedWindows: ["C:", "Users", "alice", "Users", "bob"].join(windowsSeparator),
    nestedFileUri: `file://${["", "Users", "alice", "Users", "bob"].join("/")}`,
    localhostFileUri: "file://localhost/Users/alice/private",
    loopbackFileUri: "file://127.0.0.1/home/alice/private",
    exclamationMacRoot: `${["", "Users", "alice"].join("/")}!`,
    questionLinuxRoot: `${["", "home", "alice"].join("/")}?`,
    chinesePunctuationMacRoot: `${["", "Users", "alice"].join("/")}，。！？；：`,
    escapedJsonMacRoot: `{"path":"${windowsSeparator}/Users${windowsSeparator}/alice"}`
  };
  const benignUrlFixtures = [
    "https://example.com/users/42",
    "https://example.com/Users/alice/private",
    "https://example.com/home/alice/private",
    "https://example.com/#/Users/alice/private",
    "https://example.com//home/alice/private",
    "https://example.com/(group)/Users/alice/private",
    "https://[::1]/Users/alice/private"
  ];
  const markdownUrlFixtures = [
    "before-image ![private-image-alt](https://example.com/(group)/Users/alice/private) after-image",
    "before-link [private-link-label](https://example.com/(group)/Users/alice/private) after-link"
  ];
  const expectedMarkdownUrlText = [
    "before-image after-image",
    "before-link private-link-label after-link"
  ];
  const expectedFixtureRedactions = {
    mac: `${workstationHomeRedaction}/private/evidence.md`,
    linux: `${workstationHomeRedaction}/private/evidence.md`,
    windows: `${workstationHomeRedaction}${windowsSeparator}private${windowsSeparator}evidence.md`,
    windowsForwardDoubleSlash: `${workstationHomeRedaction}/private/evidence.md`,
    windowsAmpersandDescendant: `${workstationHomeRedaction}${windowsSeparator}private`,
    windowsExtendedLength: `${workstationHomeRedaction}${windowsSeparator}private`,
    mixed: `${workstationHomeRedaction}/private/evidence.md`,
    macRoot: workstationHomeRedaction,
    linuxRoot: workstationHomeRedaction,
    windowsRoot: workstationHomeRedaction,
    rootedWindowsRoot: workstationHomeRedaction,
    macRootWithSpace: workstationHomeRedaction,
    windowsRootWithSpace: workstationHomeRedaction,
    windowsDescendantWithApostrophe: `${workstationHomeRedaction}${windowsSeparator}private${windowsSeparator}evidence.md`,
    wrappedMacRoot: `(${workstationHomeRedaction})`,
    wrappedLinuxRoot: `[${workstationHomeRedaction}]`,
    commaMacRoot: `${workstationHomeRedaction},`,
    periodLinuxRoot: `${workstationHomeRedaction}.`,
    fileUri: `file://${workstationHomeRedaction}/file`,
    fileUriSpacedDescendant: `file://${workstationHomeRedaction}/private/report.md`,
    fileUriParticleDescendant: `file://${workstationHomeRedaction}/private/report.md`,
    fileUriConnectorDescendant: `file://${workstationHomeRedaction}/private/report.md`,
    localhostFileUriSpacedDescendant: `file://localhost${workstationHomeRedaction}/private/report.md`,
    nestedMac: `${workstationHomeRedaction}/Users/bob`,
    nestedLinux: `${workstationHomeRedaction}/home/bob`,
    nestedWindows: `${workstationHomeRedaction}${windowsSeparator}Users${windowsSeparator}bob`,
    nestedFileUri: `file://${workstationHomeRedaction}/Users/bob`,
    localhostFileUri: `file://localhost${workstationHomeRedaction}/private`,
    loopbackFileUri: `file://127.0.0.1${workstationHomeRedaction}/private`,
    exclamationMacRoot: `${workstationHomeRedaction}!`,
    questionLinuxRoot: `${workstationHomeRedaction}?`,
    chinesePunctuationMacRoot: `${workstationHomeRedaction}，。！？；：`,
    escapedJsonMacRoot: `{"path":"${workstationHomeRedaction}"}`
  };
  const workstationTextFixtures = {
    inlineProse: {
      value: "home=/Users/alice is local.",
      expectedCount: 1,
      expectedRedaction: `home=${workstationHomeRedaction} is local.`
    },
    independentHomes: {
      value: "/Users/alice and /home/bob",
      expectedCount: 2,
      expectedRedaction: `${workstationHomeRedaction} and ${workstationHomeRedaction}`
    },
    jsonIndependentHomes: {
      value: `{"paths":"/Users/alice and /home/bob"}`,
      expectedCount: 2,
      expectedRedaction: `{"paths":"${workstationHomeRedaction} and ${workstationHomeRedaction}"}`,
      json: true
    },
    inlineSpacedRoot: {
      value: "- /Users/Alice Smith",
      expectedCount: 1,
      expectedRedaction: `- ${workstationHomeRedaction}`
    },
    jsonSpacedHomes: {
      value: `{"paths":"/Users/Alice Smith and /home/Bob Jones"}`,
      expectedCount: 2,
      expectedRedaction: `{"paths":"${workstationHomeRedaction} and ${workstationHomeRedaction}"}`,
      json: true
    },
    commaWithoutSpace: {
      value: "/Users/alice,next",
      expectedCount: 1,
      expectedRedaction: `${workstationHomeRedaction},next`
    },
    chinesePunctuationWithoutSpace: {
      value: "路径=/Users/alice，下一步",
      expectedCount: 1,
      expectedRedaction: `路径=${workstationHomeRedaction}，下一步`
    },
    lowercaseProfileFollowedByProse: {
      value: "/Users/alice works remotely.",
      expectedCount: 1,
      expectedRedaction: `${workstationHomeRedaction} works remotely.`
    },
    titleCasedProseAfterLowercaseProfile: {
      value: "/Users/alice Read This Important Note",
      expectedCount: 1,
      expectedRedaction: `${workstationHomeRedaction} Read This Important Note`
    },
    titleCasedProseAfterTitleProfile: {
      value: "/Users/Alice Read This Important Note",
      expectedCount: 1,
      expectedRedaction: `${workstationHomeRedaction} Read This Important Note`
    },
    titleCasedProseAfterSpacedFileUriProfile: {
      value: "file:///Users/Alice Smith Read This Important Note",
      expectedCount: 1,
      expectedRedaction: `file://${workstationHomeRedaction} Read This Important Note`
    },
    unknownTitleProseAfterSpacedProfile: {
      value: "/Users/Alice Smith Project Status",
      expectedCount: 1,
      expectedRedaction: `${workstationHomeRedaction} Project Status`
    },
    threePartRootProfile: {
      value: "/Users/Alice Mary Smith",
      expectedCount: 1,
      expectedRedaction: workstationHomeRedaction
    },
    spacedProfileFollowedByProse: {
      value: "/Users/Alice Smith reviewed evidence.",
      expectedCount: 1,
      expectedRedaction: `${workstationHomeRedaction} reviewed evidence.`
    },
    chineseProseAfterProfile: {
      value: "路径=/Users/alice 下一步",
      expectedCount: 1,
      expectedRedaction: `路径=${workstationHomeRedaction} 下一步`
    },
    spacedHanProfile: {
      value: "/Users/张 三",
      expectedCount: 1,
      expectedRedaction: workstationHomeRedaction
    },
    hanProseAfterProfile: {
      value: "/Users/张 下一步",
      expectedCount: 1,
      expectedRedaction: `${workstationHomeRedaction} 下一步`
    },
    titleCasedConjunctionProfile: {
      value: ["C:", "Users", "Alice And Bob"].join(windowsSeparator),
      expectedCount: 1,
      expectedRedaction: workstationHomeRedaction
    },
    ampersandProfile: {
      value: ["C:", "Users", "Alice & Bob"].join(windowsSeparator),
      expectedCount: 1,
      expectedRedaction: workstationHomeRedaction
    },
    multiPartDescendantProfile: {
      value: ["C:", "Users", "Juan Carlos de la Cruz", "private"].join(windowsSeparator),
      expectedCount: 1,
      expectedRedaction: `${workstationHomeRedaction}${windowsSeparator}private`
    },
    parenthesizedUrlThenHome: {
      value: "(https://example.com/docs)/Users/alice/private",
      expectedCount: 1,
      expectedRedaction: `(https://example.com/docs)${workstationHomeRedaction}/private`
    },
    nestedParenthesizedUrlThenHome: {
      value: "(https://example.com/(group))/Users/alice/private",
      expectedCount: 1,
      expectedRedaction: `(https://example.com/(group))${workstationHomeRedaction}/private`
    },
    bracketedUrlThenHome: {
      value: "[https://example.com/docs]/home/bob/private",
      expectedCount: 1,
      expectedRedaction: `[https://example.com/docs]${workstationHomeRedaction}/private`
    },
    markdownLinkThenHome: {
      value: "before [label](https://example.com/(group))/Users/Alice Smith/private after",
      expectedCount: 1,
      expectedRedaction: `before [label](https://example.com/(group))${workstationHomeRedaction}/private after`,
      importExpectedRedaction: `before label ${workstationHomeRedaction}/private after`
    }
  };
  for (const [name, value] of Object.entries(workstationPathFixtures)) {
    const redacted = redactWorkstationPaths(value);
    if (countWorkstationHomePaths(value) !== 1) failures.push(`${name} workstation fixture must have exactly one matcher hit`);
    if (redacted !== expectedFixtureRedactions[name]) failures.push(`${name} workstation fixture must redact exactly the home prefix`);
    if (countWorkstationHomePaths(redacted) !== 0) failures.push(`${name} redacted workstation fixture must have zero matcher hits`);
    if (redactWorkstationPaths(redacted) !== redacted) failures.push(`${name} workstation redaction must be idempotent`);
  }
  for (const [name, fixture] of Object.entries(workstationTextFixtures)) {
    const redacted = redactWorkstationPaths(fixture.value);
    if (countWorkstationHomePaths(fixture.value) !== fixture.expectedCount) failures.push(`${name} workstation text fixture must have ${fixture.expectedCount} matcher hits`);
    if (redacted !== fixture.expectedRedaction) failures.push(`${name} workstation text fixture must preserve non-path content`);
    if (countWorkstationHomePaths(redacted) !== 0) failures.push(`${name} redacted workstation text fixture must have zero matcher hits`);
    if (redactWorkstationPaths(redacted) !== redacted) failures.push(`${name} workstation text redaction must be idempotent`);
    if (fixture.json) {
      try {
        JSON.parse(redacted);
      } catch {
        failures.push(`${name} redacted workstation text fixture must remain valid JSON`);
      }
    }
  }
  for (const benignUrlFixture of benignUrlFixtures) {
    if (countWorkstationHomePaths(benignUrlFixture) !== 0) failures.push("benign URL must have zero workstation matcher hits");
    if (redactWorkstationPaths(benignUrlFixture) !== benignUrlFixture) failures.push("benign URL must remain unchanged by redaction");
  }
  mkdirSync(knowledgeFixtureRoot, { recursive: true });
  const expectedImportedRedactions = Object.keys(workstationPathFixtures).length
    + Object.values(workstationTextFixtures).reduce((sum, fixture) => sum + fixture.expectedCount, 0);
  const knowledgeFixtureContent = [
    "# Portable path fixture",
    "",
    ...benignUrlFixtures,
    ...Object.entries(workstationPathFixtures).map(([name, value]) => name === "escapedJsonMacRoot" ? value : JSON.stringify(value)),
    ...Object.values(workstationTextFixtures).map((fixture) => JSON.stringify(fixture.value)),
    ...markdownUrlFixtures,
    ""
  ].join("\n");
  const combinedFixtureCount = countWorkstationHomePaths(knowledgeFixtureContent);
  const individualLineCount = knowledgeFixtureContent
    .split("\n")
    .reduce((sum, line) => sum + countWorkstationHomePaths(line), 0);
  if (combinedFixtureCount !== expectedImportedRedactions) {
    failures.push(`combined workstation fixture must have ${expectedImportedRedactions} matcher hits (combined ${combinedFixtureCount}, individual lines ${individualLineCount})`);
  }
  const redactedKnowledgeFixtureContent = redactWorkstationPaths(knowledgeFixtureContent);
  if (benignUrlFixtures.some((value) => !redactedKnowledgeFixtureContent.includes(value))) {
    failures.push("combined workstation fixture must preserve benign URLs");
  }
  writeFileSync(
    knowledgeFixtureFile,
    knowledgeFixtureContent
  );
  const urlBoundaryTitle = "Chunk boundary URL fixture";
  const urlBoundaryPrefix = "https://example.com/#";
  const urlBoundaryFillerLength = 900 - urlBoundaryTitle.length - 1 - urlBoundaryPrefix.length;
  const chunkBoundaryBenignUrl = `${urlBoundaryPrefix}${"x".repeat(urlBoundaryFillerLength)}/Users/alice/private`;
  writeFileSync(chunkBoundaryUrlFixtureFile, `# ${urlBoundaryTitle}\n\n${chunkBoundaryBenignUrl}\n`);

  const nestedBoundaryTitle = "Chunk boundary nested fixture";
  const nestedBoundaryFillerLength = 900 - nestedBoundaryTitle.length - 1 - workstationHomeRedaction.length - 1;
  const nestedBoundaryFiller = "x".repeat(nestedBoundaryFillerLength);
  const chunkBoundaryNestedPath = `/Users/alice/${nestedBoundaryFiller}/Users/bob`;
  const expectedChunkBoundaryNestedPath = `${workstationHomeRedaction}/${nestedBoundaryFiller}/Users/bob`;
  writeFileSync(chunkBoundaryNestedFixtureFile, `# ${nestedBoundaryTitle}\n\n${chunkBoundaryNestedPath}\n`);
  const rebuildResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: {
      ...process.env,
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_IMPORT_PREFLIGHT_ONLY: "",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: rebuildSource,
      SCM_IMPORT_SOURCE_ROOT: ""
    },
    encoding: "utf8"
  });
  const rebuildOutput = `${rebuildResult.stdout || ""}\n${rebuildResult.stderr || ""}`;
  if (rebuildResult.status !== 0) {
    failures.push(`authorized rebuild fixture must pass, got ${rebuildResult.status}: ${rebuildOutput.slice(-800)}`);
  } else {
    const rebuiltDb = new DatabaseSync(sandboxDatabasePath, { readOnly: true });
    try {
      const scenarioCount = Number(rebuiltDb.prepare("SELECT COUNT(*) AS count FROM aip_scenarios").get().count);
      if (scenarioCount !== 6) failures.push(`authorized rebuild must retain six scenarios, got ${scenarioCount}`);
      for (const [tableName, ids] of Object.entries(loop3Rows)) {
        for (const id of ids) {
          const rowCount = Number(rebuiltDb.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE id = ?`).get(id).count);
          if (rowCount !== 1) failures.push(`authorized rebuild missing Loop 3 row ${tableName}/${id}`);
        }
      }
      const migrationCount = Number(rebuiltDb.prepare(`
        SELECT COUNT(*) AS count
        FROM schema_migrations
        WHERE id IN ('20260627_b3_t7_additive_schema', '20260627_b6_rbac_action_tiering')
      `).get().count);
      if (migrationCount !== 2) failures.push(`authorized rebuild must replay additive schema migrations, got ${migrationCount}`);
      if (rebuiltDb.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") {
        failures.push("authorized rebuild SQLite integrity_check must be ok");
      }
      rebuiltPersonalPathHits = countDatabasePersonalPaths(rebuiltDb);
      if (rebuiltPersonalPathHits !== 0) {
        failures.push(`authorized rebuild must contain zero personal workstation paths, got ${rebuiltPersonalPathHits}`);
      }
      rebuiltRawPersonalPathHits = countRawDatabasePersonalPaths(sandboxDatabasePath);
      if (rebuiltRawPersonalPathHits !== 0) {
        failures.push(`authorized rebuild raw bytes must contain zero personal workstation paths, got ${rebuiltRawPersonalPathHits}`);
      }
      const domainFixture = rebuiltDb.prepare("SELECT source_path FROM knowledge_domains WHERE id = ?").get("jijia-scm-main");
      const cardFixture = rebuiltDb.prepare("SELECT id, source_path, summary FROM knowledge_cards WHERE title = ?").get("Portable path fixture");
      const chunkFixtures = cardFixture
        ? rebuiltDb.prepare("SELECT text FROM knowledge_chunks WHERE card_id = ? ORDER BY chunk_index").all(cardFixture.id)
        : [];
      const expectedDomainPath = "scm/drafts/analysis/jijia-scm-knowledge-base-draft-20260604";
      const expectedCardPath = `${expectedDomainPath}/portable-path-fixture.md`;
      const summaryFixture = String(cardFixture?.summary || "");
      const chunkTextFixture = chunkFixtures.map((chunk) => String(chunk.text || "")).join(" ");
      const actualImportedRedactions = (chunkTextFixture.match(/<workstation-home>/g) || []).length;
      const missingChunkBenignUrls = benignUrlFixtures.filter((value) => !chunkTextFixture.includes(value));
      const missingTextFixtureRedactions = Object.values(workstationTextFixtures)
        .map((fixture) => JSON.stringify(fixture.importExpectedRedaction ?? fixture.expectedRedaction))
        .filter((value) => !chunkTextFixture.includes(value));
      const missingMarkdownUrlText = expectedMarkdownUrlText.filter((value) => !chunkTextFixture.includes(value));
      const boundaryCards = rebuiltDb.prepare("SELECT id, title FROM knowledge_cards WHERE title IN (?, ?) ORDER BY title")
        .all(nestedBoundaryTitle, urlBoundaryTitle);
      const boundaryChunks = new Map(boundaryCards.map((card) => [
        card.title,
        rebuiltDb.prepare("SELECT text FROM knowledge_chunks WHERE card_id = ? ORDER BY chunk_index").all(card.id)
      ]));
      const urlBoundaryChunks = boundaryChunks.get(urlBoundaryTitle) || [];
      const nestedBoundaryChunks = boundaryChunks.get(nestedBoundaryTitle) || [];
      const allBoundaryChunks = [...urlBoundaryChunks, ...nestedBoundaryChunks].map((chunk) => String(chunk.text || ""));
      const boundaryChunksPortable = allBoundaryChunks.every((chunk) => countWorkstationHomePaths(chunk) === 0 && redactWorkstationPaths(chunk) === chunk);
      const reconstructedUrlBoundary = urlBoundaryChunks.map((chunk) => String(chunk.text || "")).join("");
      const reconstructedNestedBoundary = nestedBoundaryChunks.map((chunk) => String(chunk.text || "")).join("");
      const fixtureChecks = [
        [domainFixture?.source_path === expectedDomainPath, "authorized rebuild knowledge domain path must be repository-relative"],
        [cardFixture?.source_path === expectedCardPath, "authorized rebuild knowledge card path must be repository-relative"],
        [(summaryFixture.match(/<workstation-home>/g) || []).length >= 2, "authorized rebuild knowledge summary must redact path-bearing content"],
        [actualImportedRedactions === expectedImportedRedactions, `authorized rebuild knowledge chunks must redact all workstation homes (${actualImportedRedactions}/${expectedImportedRedactions})`],
        [missingTextFixtureRedactions.length === 0, `authorized rebuild knowledge chunks must preserve non-path text fixture content (missing ${missingTextFixtureRedactions.join(", ") || "none"})`],
        [missingMarkdownUrlText.length === 0, `authorized rebuild must strip balanced Markdown URLs without losing surrounding text (missing ${missingMarkdownUrlText.join(", ") || "none"})`],
        [!chunkTextFixture.includes("private-image-alt"), "authorized rebuild must remove image alt text with its balanced Markdown URL"],
        [benignUrlFixtures.slice(0, 3).every((value) => summaryFixture.includes(value)), "authorized rebuild knowledge summary must preserve its benign URL excerpt"],
        [missingChunkBenignUrls.length === 0, `authorized rebuild knowledge chunks must preserve benign URLs (missing ${missingChunkBenignUrls.join(", ") || "none"})`],
        [boundaryCards.length === 2, "authorized rebuild must import both chunk-boundary fixtures"],
        [boundaryChunksPortable, "authorized rebuild must not split a benign URL or redacted nested path into a new workstation-home candidate"],
        [reconstructedUrlBoundary.includes(chunkBoundaryBenignUrl), "authorized rebuild must preserve the boundary-spanning benign URL"],
        [reconstructedNestedBoundary.includes(expectedChunkBoundaryNestedPath), "authorized rebuild must preserve one idempotently redacted nested path across chunk boundaries"]
      ];
      for (const [ok, message] of fixtureChecks) {
        if (!ok) failures.push(message);
      }
      rebuiltKnowledgePathFixtureVerified = fixtureChecks.every(([ok]) => ok);
    } finally {
      rebuiltDb.close();
    }
  }

  if (failures.length) throw new Error(`Import authorization gate failed:\n- ${failures.join("\n- ")}`);
  gateSummary = {
    ok: true,
    unauthorizedImportStatus: result.status,
    sandboxedImportTarget: true,
    unauthorizedSandboxDatabaseHashPreserved: true,
    missingSourceStatus: missingSourceResult.status,
    sourcePreflightStatus: precedenceResult.status,
    sourcePrecedenceVerified: true,
    authorizedRebuildStatus: rebuildResult.status,
    migrationsReplayed: true,
    loop3RowsRetained: Object.values(loop3Rows).reduce((total, ids) => total + ids.length, 0),
    rebuiltPersonalPathHits,
    rebuiltRawPersonalPathHits,
    rebuiltKnowledgePathFixtureVerified,
    sourceDatabaseHashPreserved: sourceHashBefore === hashFile(sourceDatabasePath),
    databaseRebuild: "disposable_fixture_only",
    sourceDatabaseRebuild: false,
    productionWrites: false
  };
} catch (error) {
  gateError = error instanceof Error ? error : new Error(String(error));
}

let cleanupError;
try {
  rmSync(sandboxRepositoryRoot, { recursive: true, force: true });
} catch (error) {
  cleanupError = error instanceof Error ? error : new Error(String(error));
}

let sourceIntegrityError;
try {
  if (sourceHashBefore !== hashFile(sourceDatabasePath)) {
    sourceIntegrityError = new Error("Source SQLite database changed during import authorization gate smoke");
  }
} catch (error) {
  sourceIntegrityError = error instanceof Error ? error : new Error(String(error));
}

const gateErrors = [gateError, cleanupError, sourceIntegrityError].filter(Boolean);
if (gateErrors.length === 1) throw gateErrors[0];
if (gateErrors.length > 1) {
  throw new AggregateError(gateErrors, "Import authorization gate failed and a cleanup or source-integrity check also failed");
}

console.log(JSON.stringify(gateSummary, null, 2));
