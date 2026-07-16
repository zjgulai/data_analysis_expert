import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { countWorkstationHomePaths, redactWorkstationPaths, workstationHomeRedaction } from "./workstation-paths.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceAppRoot = resolve(scriptDir, "..");
const sourceDatabasePath = join(sourceAppRoot, "data", "governance_workbench.sqlite");
const sandboxRepositoryRoot = mkdtempSync(join(tmpdir(), "scm-import-gate-"));
const sandboxExternalRoot = mkdtempSync(join(tmpdir(), "scm-import-gate-external-"));
const sandboxRoot = join(sandboxRepositoryRoot, "scm", "drafts", "prototypes", "scm-data-governance-workbench-v0");
const sandboxScriptDir = join(sandboxRoot, "scripts");
const sandboxDatabasePath = join(sandboxRoot, "data", "governance_workbench.sqlite");
const metricBlueprintFile = "supply-chain-metric-system-l0-l3-blueprint-mece-v2-20260618.json";
const fieldMappingFile = "supply-chain-metric-stage2-field-mapping-template-20260618.csv";
const p0SignoffFile = "supply-chain-metric-mece-v2-p0-owner-signoff-task-list-20260618.csv";
const knowledgeDomainFixtureRoots = {
  jijia: join(sandboxExternalRoot, "jijia"),
  stockingRules: join(sandboxExternalRoot, "stocking-rules"),
  businessSupplyChain: join(sandboxExternalRoot, "business-supply-chain"),
  erpSupplement: join(sandboxExternalRoot, "erp-supplement")
};
const knowledgeDomainEnv = {
  SCM_KNOWLEDGE_JIJIA_ROOT: knowledgeDomainFixtureRoots.jijia,
  SCM_KNOWLEDGE_STOCKING_RULES_ROOT: knowledgeDomainFixtureRoots.stockingRules,
  SCM_KNOWLEDGE_BUSINESS_SUPPLY_CHAIN_ROOT: knowledgeDomainFixtureRoots.businessSupplyChain,
  SCM_KNOWLEDGE_ERP_SUPPLEMENT_ROOT: knowledgeDomainFixtureRoots.erpSupplement
};
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

function importEnvironment(overrides = {}) {
  return { ...process.env, ...knowledgeDomainEnv, ...overrides };
}

function writeMarkdown(path, title, body = "fixture knowledge") {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `# ${title}\n\n${body}\n`, "utf8");
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
let stableKnowledgeCardIdVerified = false;
let stableKnowledgeCardIdBefore = null;
try {
  mkdirSync(join(sandboxRepositoryRoot, ".git"), { recursive: true });
  cpSync(join(sourceAppRoot, "scripts"), sandboxScriptDir, { recursive: true });
  cpSync(join(sourceAppRoot, "data"), join(sandboxRoot, "data"), { recursive: true });
  cpSync(join(sourceAppRoot, "migrations"), join(sandboxRoot, "migrations"), { recursive: true });

  writeMarkdown(join(knowledgeDomainFixtureRoots.jijia, "fixture.md"), "Jijia fixture");
  writeMarkdown(join(knowledgeDomainFixtureRoots.stockingRules, "fixture.md"), "Stocking rules fixture");
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.businessSupplyChain, "bi-field-extraction", "classification", "bi-field-to-business-kb-classification-register-draft-20260618.md"),
    "BI 字段到业务知识库分类登记"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.businessSupplyChain, "bi-field-extraction", "metric-system-foundation", "bi-field-dim-fact-candidate-model-draft-20260618.md"),
    "BI 字段维表事实表候选模型"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.businessSupplyChain, "operations", "scenario-cards", "fba-negative-available-inventory-scenario-draft-20260618.md"),
    "FBA 可用库存为负场景诊断"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.businessSupplyChain, "operations", "scenario-cards", "last-mile-cost-rate-anomaly-scenario-draft-20260618.md"),
    "尾程费率异常诊断场景"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.businessSupplyChain, "methodology", "framework-cards", "three-lines-forecast-inventory-execution-draft-20260617.md"),
    "三道防线：预测-库存-执行"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.businessSupplyChain, "metrics-and-data", "algorithm-cards", "safety-stock-rop-algorithm-draft-20260617.md"),
    "安全库存与 ROP 算法卡"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.businessSupplyChain, "metrics-and-data", "data-model-cards", "dwt-fulfillment-stability-data-model-draft-20260617.md"),
    "dwt_fulfillment_stability 履约稳定主题宽表"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.businessSupplyChain, "operations", "workflow-node-cards", "last-mile-node-draft-20260617.md"),
    "履约尾程节点"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.businessSupplyChain, "operations", "workflow-node-cards", "raw-book-012-new-commerce-logistics-network-node-draft-20260618.md"),
    "RAW-BOOK-012 新商业物流履约网络节点卡"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.stockingRules, "validation-and-implementation-plan-draft-20260604.md"),
    "备货库存规则核验与实施计划"
  );
  writeMarkdown(
    join(knowledgeDomainFixtureRoots.erpSupplement, "erp-object-dictionary-draft-20260620.md"),
    "路特 ERP 对象字典候选"
  );

  const sandboxHashBefore = hashFile(sandboxDatabasePath);
  const result = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: importEnvironment({ SCM_DATABASE_REBUILD_AUTHORIZED: "" }),
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
    env: importEnvironment({
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: join(sandboxRoot, "missing-primary-source"),
      SCM_IMPORT_SOURCE_ROOT: join(sandboxRoot, "missing-secondary-source")
    }),
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
  const invalidOverrideSource = join(sandboxRoot, "invalid-explicit-source");
  const invalidOverrideResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: importEnvironment({
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_IMPORT_PREFLIGHT_ONLY: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: invalidOverrideSource,
      SCM_IMPORT_SOURCE_ROOT: secondarySource
    }),
    encoding: "utf8"
  });
  const invalidOverrideOutput = `${invalidOverrideResult.stdout || ""}\n${invalidOverrideResult.stderr || ""}`;
  if (invalidOverrideResult.status !== 2) {
    failures.push(`invalid explicit source override must block instead of falling back, got ${invalidOverrideResult.status}`);
  }
  if (!invalidOverrideOutput.includes("blocked_source_required")) {
    failures.push("invalid explicit source override must emit blocked_source_required");
  }
  if (!invalidOverrideOutput.includes(invalidOverrideSource)) {
    failures.push("invalid explicit source override must report the rejected source");
  }
  const readOnlyPreflightResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: importEnvironment({
      SCM_DATABASE_REBUILD_AUTHORIZED: "",
      SCM_IMPORT_PREFLIGHT_ONLY: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: primarySource,
      SCM_IMPORT_SOURCE_ROOT: ""
    }),
    encoding: "utf8"
  });
  const readOnlyPreflightOutput = `${readOnlyPreflightResult.stdout || ""}\n${readOnlyPreflightResult.stderr || ""}`;
  if (readOnlyPreflightResult.status !== 0) {
    failures.push(`read-only source preflight must not require rebuild authorization, got ${readOnlyPreflightResult.status}`);
  }
  if (!readOnlyPreflightOutput.includes("preflight_ok")) {
    failures.push("read-only source preflight must emit preflight_ok without rebuild authorization");
  }
  if (sandboxHashBefore !== hashFile(sandboxDatabasePath)) {
    failures.push("read-only source preflight without rebuild authorization must preserve the sandbox SQLite hash");
  }
  const precedenceResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: importEnvironment({
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_IMPORT_PREFLIGHT_ONLY: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: primarySource,
      SCM_IMPORT_SOURCE_ROOT: secondarySource
    }),
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

  const missingKnowledgeRoot = join(sandboxExternalRoot, "missing-business-knowledge");
  const missingKnowledgeResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: importEnvironment({
      SCM_IMPORT_PREFLIGHT_ONLY: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: primarySource,
      SCM_KNOWLEDGE_BUSINESS_SUPPLY_CHAIN_ROOT: missingKnowledgeRoot
    }),
    encoding: "utf8"
  });
  const missingKnowledgeOutput = `${missingKnowledgeResult.stdout || ""}\n${missingKnowledgeResult.stderr || ""}`;
  if (missingKnowledgeResult.status !== 2) {
    failures.push(`missing configured knowledge domain must block preflight, got ${missingKnowledgeResult.status}`);
  }
  if (!missingKnowledgeOutput.includes("blocked_knowledge_domain_required")) {
    failures.push("missing configured knowledge domain must emit blocked_knowledge_domain_required");
  }
  if (sandboxHashBefore !== hashFile(sandboxDatabasePath)) {
    failures.push("missing knowledge-domain preflight must preserve the sandbox SQLite hash");
  }

  const emptyKnowledgeRoot = join(sandboxExternalRoot, "empty-business-knowledge");
  mkdirSync(emptyKnowledgeRoot, { recursive: true });
  const emptyKnowledgeResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: importEnvironment({
      SCM_IMPORT_PREFLIGHT_ONLY: "1",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: primarySource,
      SCM_KNOWLEDGE_BUSINESS_SUPPLY_CHAIN_ROOT: emptyKnowledgeRoot
    }),
    encoding: "utf8"
  });
  const emptyKnowledgeOutput = `${emptyKnowledgeResult.stdout || ""}\n${emptyKnowledgeResult.stderr || ""}`;
  if (emptyKnowledgeResult.status !== 2) {
    failures.push(`empty configured knowledge domain must block preflight, got ${emptyKnowledgeResult.status}`);
  }
  if (!emptyKnowledgeOutput.includes("blocked_knowledge_domain_required")) {
    failures.push("empty configured knowledge domain must emit blocked_knowledge_domain_required");
  }

  const rebuildSource = join(sandboxRoot, "authorized-rebuild-source");
  mkdirSync(rebuildSource, { recursive: true });
  writeFileSync(join(rebuildSource, metricBlueprintFile), `${JSON.stringify({
    metrics: [{
      metric_id: "SCM-MECE-L3-116",
      metric_code: "stockout_loss_amount",
      name: "断货损失金额",
      level: "L3",
      l1_domain: "库存风险",
      l2_group: "缺货损失",
      formula: "pending_owner_definition",
      grain: "period + channel + country + category + sku",
      direction: "lower_better",
      source_status: "blueprint_node",
      definition: "Owner and field mapping remain pending in this fixture."
    }, {
      metric_id: "SCM-MECE-L3-077",
      metric_code: "supply_chain_total_cost_rate",
      name: "供应链总成本率",
      level: "L3",
      l1_domain: "成本财务与资金效率",
      l2_group: "总成本与节点成本",
      formula: "total supply chain cost / sales amount",
      grain: "period + channel + country + category + sku",
      direction: "lower_better",
      source_status: "migration_reference_fixture",
      definition: "Loop 3 finance decision metric reference fixture."
    }, {
      metric_id: "SCM-MECE-L3-036",
      metric_code: "full_chain_turnover_days_amount",
      name: "全链条库存资金周转天数",
      level: "L3",
      l1_domain: "成本财务与资金效率",
      l2_group: "库存资金效率",
      formula: "inventory amount / daily cost",
      grain: "channel + country + category + sku + period",
      direction: "lower_better",
      source_status: "decision_reference_fixture",
      definition: "Seed decision metric reference fixture."
    }, {
      metric_id: "SCM-MECE-L3-126",
      metric_code: "transfer_success_rate",
      name: "调拨成功率",
      level: "L3",
      l1_domain: "物流运输与履约体验",
      l2_group: "头程与调拨运输",
      formula: "completed transfers / planned transfers",
      grain: "source warehouse + target warehouse + sku + period",
      direction: "higher_better",
      source_status: "decision_reference_fixture",
      definition: "Seed decision metric reference fixture."
    }, {
      metric_id: "SCM-MECE-L3-137",
      metric_code: "unmatched_planned_inventory_qty",
      name: "未匹配计划库存数量",
      level: "L3",
      l1_domain: "主数据指标治理与数据质量",
      l2_group: "SKU 映射质量",
      formula: "unmatched planned inventory quantity",
      grain: "source sku key type + platform + period",
      direction: "lower_better",
      source_status: "decision_reference_fixture",
      definition: "Seed decision metric reference fixture."
    }]
  }, null, 2)}\n`);
  writeFileSync(
    join(rebuildSource, fieldMappingFile),
    "metric_id,metric_code,name,owner,mapping_status,priority,source_fields,source_system,source_table,notes\n"
      + "SCM-MECE-L3-116,stockout_loss_amount,断货损失金额,库存运营 Owner,待确认,P0,,,,fixture_pending_mapping\n"
  );
  writeFileSync(
    join(rebuildSource, p0SignoffFile),
    "metric_id,metric_code,name,owner,signoff_status,target_date,confirm_focus,notes\n"
      + "SCM-MECE-L3-116,stockout_loss_amount,断货损失金额,库存运营 Owner,未发起,,confirm_denominator,fixture_pending_signoff\n"
  );
  const knowledgeFixtureRoot = knowledgeDomainFixtureRoots.jijia;
  const knowledgeFixtureFile = join(knowledgeFixtureRoot, "portable-path-fixture.md");
  const chunkBoundaryUrlFixtureFile = join(knowledgeFixtureRoot, "chunk-boundary-url-fixture.md");
  const chunkBoundaryNestedFixtureFile = join(knowledgeFixtureRoot, "chunk-boundary-nested-fixture.md");
  const keywordBoundaryFixtureFile = join(knowledgeFixtureRoot, "keyword-boundary-fixture.md");
  const standaloneKeywordFixtureFile = join(knowledgeFixtureRoot, "standalone-keyword-fixture.md");
  const longDocumentFixtureFile = join(knowledgeFixtureRoot, "long-document-fixture.md");
  const duplicateBasenameFixtureA = join(knowledgeFixtureRoot, "duplicate-a", "same-name.md");
  const duplicateBasenameFixtureB = join(knowledgeFixtureRoot, "duplicate-b", "same-name.md");
  const escapedKnowledgeFixtureFile = join(sandboxExternalRoot, "outside-configured-domain.md");
  const escapedKnowledgeFixtureLink = join(knowledgeFixtureRoot, "escaped-domain-link.md");
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
    vscodeWindowsUri: "vscode://file/C:/Users/Alice/project",
    queryLinuxUri: "https://example.com/view?path=/home/alice/private&mode=read",
    wrappedLowercaseMultiTokenRoot: `"${["C:", "Users", "jane doe"].join(windowsSeparator)}"`,
    wrappedLongTitleRoot: `"${["C:", "Users", "Mary Jane Watson Smith"].join(windowsSeparator)}"`,
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
    vscodeWindowsUri: `vscode://file/${workstationHomeRedaction}/project`,
    queryLinuxUri: `https://example.com/view?path=${workstationHomeRedaction}/private&mode=read`,
    wrappedLowercaseMultiTokenRoot: `"${workstationHomeRedaction}"`,
    wrappedLongTitleRoot: `"${workstationHomeRedaction}"`,
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
  writeFileSync(
    keywordBoundaryFixtureFile,
    "# Keyword boundary fixture\n\nimport support policy combined exhibit\n",
    "utf8"
  );
  writeFileSync(
    standaloneKeywordFixtureFile,
    "# Standalone keyword fixture\n\nPO and BI\n",
    "utf8"
  );
  writeMarkdown(
    longDocumentFixtureFile,
    "Long document fixture",
    `${Array.from({ length: 900 }, (_, index) => `token-${index}`).join(" ")} TAILSENTINEL`
  );
  writeMarkdown(duplicateBasenameFixtureA, "Duplicate basename A", "first hierarchy");
  writeMarkdown(duplicateBasenameFixtureB, "Duplicate basename B", "second hierarchy");
  writeMarkdown(escapedKnowledgeFixtureFile, "Escaped domain fixture", "must not be imported through a symlink");
  symlinkSync(escapedKnowledgeFixtureFile, escapedKnowledgeFixtureLink);
  const rebuildResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: importEnvironment({
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_IMPORT_PREFLIGHT_ONLY: "",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: rebuildSource,
      SCM_IMPORT_SOURCE_ROOT: ""
    }),
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
        WHERE id IN (
          '20260627_b3_t7_additive_schema',
          '20260627_b6_rbac_action_tiering',
          '20260701_loop3_business_closed_loops',
          '20260716_certification_gate_remediation',
          '20260716_decision_subject_reference'
        )
      `).get().count);
      if (migrationCount !== 5) failures.push(`authorized rebuild must replay all allowlisted migrations, got ${migrationCount}`);
      if (rebuiltDb.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") {
        failures.push("authorized rebuild SQLite integrity_check must be ok");
      }
      const pendingMetric = rebuiltDb.prepare(`
        SELECT lifecycle_status, certification_status
        FROM metrics
        WHERE id = 'SCM-MECE-L3-116'
      `).get();
      if (pendingMetric?.lifecycle_status !== "seed_only" || pendingMetric?.certification_status !== "not_certified") {
        failures.push(`pending P0 metric must remain seed_only/not_certified, got ${JSON.stringify(pendingMetric || null)}`);
      }
      const pendingCertificationCount = Number(rebuiltDb.prepare(`
        SELECT COUNT(*) AS count
        FROM certifications
        WHERE asset_ref = 'SCM-MECE-L3-116' AND status = 'certified'
      `).get().count);
      if (pendingCertificationCount !== 0) failures.push("pending P0 metric must not receive a certified ledger row");
      const pendingChatbiContextCount = Number(rebuiltDb.prepare(`
        SELECT COUNT(*) AS count
        FROM chatbi_contexts
        WHERE metric_id = 'SCM-MECE-L3-116'
      `).get().count);
      if (pendingChatbiContextCount !== 0) failures.push("pending P0 metric must not enter certified ChatBI contexts");
      const invalidDecisionMetricRefs = Number(rebuiltDb.prepare(`
        SELECT COUNT(*) AS count
        FROM decision_logs d
        WHERE d.linked_metric_id <> ''
          AND NOT EXISTS (
            SELECT 1 FROM metrics m
            WHERE m.id = d.linked_metric_id OR m.code = d.linked_metric_id
          )
      `).get().count);
      if (invalidDecisionMetricRefs !== 0) {
        failures.push(`authorized rebuild must keep non-metric subjects out of linked_metric_id, got ${invalidDecisionMetricRefs}`);
      }
      const governanceSubjectCount = Number(rebuiltDb.prepare(`
        SELECT COUNT(*) AS count
        FROM decision_logs_with_subject
        WHERE (id LIKE 'OMSWMS-%' OR id LIKE 'RUNTIME-IMPORT-%')
          AND linked_metric_id = ''
          AND subject_ref <> ''
      `).get().count);
      if (governanceSubjectCount !== 7) {
        failures.push(`authorized rebuild must retain seven governance subject references, got ${governanceSubjectCount}`);
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
      stableKnowledgeCardIdBefore = cardFixture?.id || null;
      const keywordBoundaryCard = rebuiltDb.prepare(
        "SELECT topic, object_refs FROM knowledge_cards WHERE title = ?"
      ).get("Keyword boundary fixture");
      const standaloneKeywordCard = rebuiltDb.prepare(
        "SELECT topic, object_refs FROM knowledge_cards WHERE title = ?"
      ).get("Standalone keyword fixture");
      const longDocumentCard = rebuiltDb.prepare(
        "SELECT id FROM knowledge_cards WHERE title = ?"
      ).get("Long document fixture");
      const longDocumentChunks = longDocumentCard
        ? rebuiltDb.prepare("SELECT chunk_index, text FROM knowledge_chunks WHERE card_id = ? ORDER BY chunk_index").all(longDocumentCard.id)
        : [];
      const duplicateBasenamePaths = rebuiltDb.prepare(
        "SELECT source_path FROM knowledge_cards WHERE title IN (?, ?) ORDER BY source_path"
      ).all("Duplicate basename A", "Duplicate basename B").map((row) => String(row.source_path));
      const escapedDomainCardCount = Number(rebuiltDb.prepare(
        "SELECT COUNT(*) AS count FROM knowledge_cards WHERE title = ?"
      ).get("Escaped domain fixture").count);
      const unresolvedKnowledgeReferences = Number(rebuiltDb.prepare(`
        WITH knowledge_references AS (
          SELECT CAST(linked.value AS TEXT) AS card_id
          FROM aip_scenarios AS scenario, json_each(scenario.linked_knowledge_card_ids) AS linked
          UNION ALL
          SELECT CAST(linked.value AS TEXT)
          FROM recommendation_cards AS recommendation, json_each(recommendation.linked_knowledge_card_ids) AS linked
          UNION ALL
          SELECT CAST(linked.value AS TEXT)
          FROM agent_traces AS trace, json_each(trace.matched_knowledge_cards) AS linked
          UNION ALL
          SELECT substr(CAST(linked.value AS TEXT), length('knowledge:') + 1)
          FROM agent_runs AS agent_run, json_each(agent_run.input_refs) AS linked
          WHERE CAST(linked.value AS TEXT) LIKE 'knowledge:%'
        )
        SELECT COUNT(*) AS count
        FROM knowledge_references AS reference
        WHERE reference.card_id = ''
           OR NOT EXISTS (SELECT 1 FROM knowledge_cards AS card WHERE card.id = reference.card_id)
      `).get().count);
      const chunkFixtures = cardFixture
        ? rebuiltDb.prepare("SELECT text FROM knowledge_chunks WHERE card_id = ? ORDER BY chunk_index").all(cardFixture.id)
        : [];
      const expectedDomainPath = "external-source/jijia-scm-main";
      const expectedCardPath = `${expectedDomainPath}/portable-path-fixture.md`;
      const expectedDuplicatePaths = [
        `${expectedDomainPath}/duplicate-a/same-name.md`,
        `${expectedDomainPath}/duplicate-b/same-name.md`
      ];
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
        [reconstructedNestedBoundary.includes(expectedChunkBoundaryNestedPath), "authorized rebuild must preserve one idempotently redacted nested path across chunk boundaries"],
        [longDocumentChunks.length > 4, `authorized rebuild must persist all long-document chunks, got ${longDocumentChunks.length}`],
        [
          longDocumentChunks.some((chunk) => String(chunk.text).includes("TAILSENTINEL")),
          "authorized rebuild must retain content after the former four-chunk boundary"
        ],
        [
          JSON.stringify(duplicateBasenamePaths) === JSON.stringify(expectedDuplicatePaths),
          `external knowledge paths must preserve domain namespace and hierarchy, got ${JSON.stringify(duplicateBasenamePaths)}`
        ],
        [escapedDomainCardCount === 0, "knowledge import must skip Markdown symlinks that escape the configured domain"],
        [unresolvedKnowledgeReferences === 0, `all active knowledge references must resolve, got ${unresolvedKnowledgeReferences}`],
        [keywordBoundaryCard?.topic === "general-supply-chain", "short po/bi keywords must not match substrings in ordinary English words"],
        [
          !JSON.parse(keywordBoundaryCard?.object_refs || "[]").includes("po"),
          "po object reference must require a standalone token"
        ],
        [
          standaloneKeywordCard?.topic === "procurement-and-supply"
            && JSON.parse(standaloneKeywordCard?.object_refs || "[]").includes("po"),
          "standalone po keyword must retain procurement topic and object reference"
        ]
      ];
      for (const [ok, message] of fixtureChecks) {
        if (!ok) failures.push(message);
      }
      rebuiltKnowledgePathFixtureVerified = fixtureChecks.every(([ok]) => ok);
    } finally {
      rebuiltDb.close();
    }
  }

  const earlierKnowledgeFixtureFile = join(knowledgeFixtureRoot, "0000-earlier-fixture.md");
  writeMarkdown(earlierKnowledgeFixtureFile, "Earlier fixture", "lexically earlier insertion");
  const stableIdRebuildResult = spawnSync(process.execPath, [join(sandboxScriptDir, "import-assets.mjs")], {
    cwd: sandboxRoot,
    env: importEnvironment({
      SCM_DATABASE_REBUILD_AUTHORIZED: "1",
      SCM_IMPORT_PREFLIGHT_ONLY: "",
      SCM_WORKBENCH_IMPORT_SOURCE_ROOT: rebuildSource,
      SCM_IMPORT_SOURCE_ROOT: ""
    }),
    encoding: "utf8"
  });
  const stableIdRebuildOutput = `${stableIdRebuildResult.stdout || ""}\n${stableIdRebuildResult.stderr || ""}`;
  if (stableIdRebuildResult.status !== 0) {
    failures.push(`stable-id rebuild fixture must pass, got ${stableIdRebuildResult.status}: ${stableIdRebuildOutput.slice(-800)}`);
  } else {
    const stableIdDb = new DatabaseSync(sandboxDatabasePath, { readOnly: true });
    try {
      const stableKnowledgeCardIdAfter = stableIdDb.prepare(
        "SELECT id FROM knowledge_cards WHERE title = ?"
      ).get("Portable path fixture")?.id || null;
      stableKnowledgeCardIdVerified = Boolean(stableKnowledgeCardIdBefore)
        && stableKnowledgeCardIdAfter === stableKnowledgeCardIdBefore;
      if (!stableKnowledgeCardIdVerified) {
        failures.push(`knowledge card ID changed after earlier-file insertion: ${stableKnowledgeCardIdBefore} -> ${stableKnowledgeCardIdAfter}`);
      }
    } finally {
      stableIdDb.close();
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
    stableKnowledgeCardIdVerified,
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
  rmSync(sandboxExternalRoot, { recursive: true, force: true });
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
