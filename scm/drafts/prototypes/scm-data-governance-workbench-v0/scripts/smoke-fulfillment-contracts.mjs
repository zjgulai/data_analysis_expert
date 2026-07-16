import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const dashboardRoot = join(appRoot, "public", "fulfillment-dashboard");

function read(path) {
  return readFileSync(join(dashboardRoot, path), "utf8");
}

function readApp(path) {
  return readFileSync(join(appRoot, path), "utf8");
}

function section(markdown, heading, nextHeading) {
  const start = markdown.indexOf(heading);
  assert.notEqual(start, -1, `Missing section: ${heading}`);
  const end = nextHeading ? markdown.indexOf(nextHeading, start + heading.length) : markdown.length;
  assert.notEqual(end, -1, `Missing next section: ${nextHeading}`);
  return markdown.slice(start, end);
}

function colorToken(styles, name) {
  const match = styles.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
  assert(match, `Missing color token: ${name}`);
  return match[1];
}

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const sqlContract = read("docs/fulfillment-dashboard-sql-bi-logic-draft-20260626.md");
const metricDictionary = read("docs/metric-system-and-dictionary-draft-20260625.md");
const readonlyContract = read("docs/fulfillment-dashboard-readonly-data-contract-draft-20260626.md");
const dashboardApp = read("app.js");
const dashboardStyles = read("styles.css");
const integrationPlan = readApp("docs/fulfillment-dashboard-aip-scm-integration-plan-draft-20260626.md");
const deploymentGuide = readApp("docs/tencent-cloud-lightserver-deployment-20260618.md");

assert(
  contrastRatio(colorToken(dashboardStyles, "--muted"), "#ffffff") >= 4.5,
  "Muted text on white must meet WCAG AA 4.5:1 contrast"
);
assert(
  contrastRatio("#ffffff", colorToken(dashboardStyles, "--green")) >= 4.5,
  "White text on green must meet WCAG AA 4.5:1 contrast"
);

assert.match(
  sqlContract,
  /`:start_date`[^\n]+`:end_date`[^\n]+`biz_date`[^\n]+分区日期/,
  "Date parameters must have deterministic biz_date semantics"
);

const overviewSql = section(sqlContract, "## 2. 总览 KPI 聚合", "## 3. 未发货预警");
for (const field of [
  "audit_sla_24h_rate",
  "pay_ship_sla_48h_rate",
  "item_ship_sla_24h_rate",
  "delivery_10d_rate"
]) {
  assert.match(overviewSql, new RegExp(`\\bas ${field}\\b`), `Missing guarded rate field: ${field}`);
  assert.equal(overviewSql.includes("| `" + field + "` |"), true, `BI must consume ${field}`);
}
const biCalculation = overviewSql.slice(overviewSql.indexOf("BI 计算："));
assert.equal(
  /_num\s*\/\s*(?!NULLIF)/i.test(biCalculation),
  false,
  "BI formulas must not use unguarded division"
);
const orderBaseSql = section(overviewSql, "with order_base as (", "),\nitem_base as (");
for (const populationPredicate of [
  /paid_flag\s*=\s*1/,
  /valid_self_fulfillment_flag\s*=\s*1/,
  /paid_cancelled_flag\s*=\s*0/,
  /split_abandoned_flag\s*=\s*0/
]) {
  assert.match(orderBaseSql, populationPredicate, "Overview order_base must use the canonical valid self-fulfillment population");
}

const unshippedSql = section(sqlContract, "## 3. 未发货预警", "## 4. TMS 妥投阶梯");
assert.match(unshippedSql, /\)\s*select\s+biz_date,\s+erp_code,/s, "Unshipped output must include erp_code");
assert.match(unshippedSql, /group by\s+biz_date,\s+erp_code,/s, "Unshipped output must group by erp_code");

const crossRegionSql = section(sqlContract, "## 7. 跨区发货", "## 8. 问题件闭环");
assert.match(
  crossRegionSql,
  /on o\.erp_code = p\.erp_code\s+and o\.biz_date = p\.biz_date/,
  "Package snapshots must join on erp_code and biz_date"
);

const issueSql = section(sqlContract, "## 8. 问题件闭环", "## 9. 前端或 BI 取数字段");
assert.match(issueSql, /coalesce\(i\.default_action, '待制定'\) as next_action/, "Issue output must include next_action");
assert.match(issueSql, /group by[\s\S]+coalesce\(i\.default_action, '待制定'\)/, "Issue output must group by next_action");

assert.match(
  metricDictionary,
  /拆分前有效平台订单量[^\n]+排除已付款取消/,
  "Split-rate denominator population must exclude paid cancellations"
);
assert.match(
  metricDictionary,
  /NULLIF\(拆分前有效平台订单量, 0\)[^\n]+分母为 0 时返回 `null`/,
  "Split-rate definition must guard a zero denominator"
);

assert.match(
  readonlyContract,
  /商品发货及时率 \| 商品件数 `item_qty`[^\n]+唯一分母/,
  "Product shipping timeliness must use one canonical denominator"
);
assert.match(
  readonlyContract,
  /妥投率 \| 跟踪号 `track_order_code` 去重[^\n]+唯一分母/,
  "Delivery rate must use one canonical denominator"
);

assert.match(dashboardApp, /const auditSlaCounts = Object\.freeze\(/, "Audit SLA counts must have one shared source");
assert.match(
  dashboardApp,
  /rateFromCounts\(auditSlaCounts\.within24h, auditSlaCounts\.denominator\)/,
  "24h audit SLA must be derived from counts"
);
assert.match(
  dashboardApp,
  /rateFromCounts\(auditSlaCounts\.within48h, auditSlaCounts\.denominator\)/,
  "48h audit SLA must be derived from counts"
);
assert.doesNotMatch(dashboardApp, /score:\s*94\.8/, "Audit funnel must not retain the inflated 94.8 score");
assert.doesNotMatch(dashboardApp, /低于审单及时率 9\.6pct/, "Overview must not retain the inflated 9.6 point gap");
assert.match(dashboardApp, /const auditVolumeCounts = Object\.freeze\(/, "Audit split counts must have one shared source");
assert.doesNotMatch(dashboardApp, /系统自动审核", value:\s*58,/, "Audit split must not hardcode 58%");
assert.doesNotMatch(dashboardApp, /人工审核", value:\s*42,/, "Audit split must not hardcode 42%");
function numericObject(name) {
  const match = dashboardApp.match(new RegExp(`const ${name} = Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\);`));
  assert(match, `Missing numeric object: ${name}`);
  return Object.fromEntries([...match[1].matchAll(/([A-Za-z0-9_]+):\s*(\d+)/g)]
    .map(([, key, value]) => [key, Number(value)]));
}
const auditSlaCounts = numericObject("auditSlaCounts");
const auditVolumeCounts = numericObject("auditVolumeCounts");
assert(auditSlaCounts.within24h <= auditSlaCounts.denominator, "24h audit numerator must not exceed its population");
assert(auditSlaCounts.within48h <= auditSlaCounts.denominator, "48h audit numerator must not exceed its population");
assert.equal(
  auditVolumeCounts.system + auditVolumeCounts.manual,
  auditSlaCounts.denominator,
  "System and manual audit volumes must partition the same population as audit SLA"
);

const deploymentSteps = section(integrationPlan, "## 5. 后续部署步骤", "## 6. 风险与缓解");
for (const requiredGate of [
  /30\s*项?\s*P0[^\n]*owner[^\n]*签字/i,
  /18\s*项?\s*P0[^\n]*字段映射/i,
  /1\s*项?\s*SCEI[^\n]*owner[^\n]*决策/i
]) {
  assert.match(deploymentSteps, requiredGate, "Deployment steps must require the exact manual-gate population");
}
assert.match(
  integrationPlan,
  /2026-06-26[^\n]+历史(?:生产)?快照[^\n]+scm-workbench-fulfillment-dashboard-202606260358/,
  "June 26 release and health evidence must be labeled as a historical production snapshot"
);
const acceptanceSection = section(deploymentGuide, "## 上线验收");
assert.match(
  acceptanceSection,
  /releaseId=`scm-workbench-fulfillment-dashboard-202606260358`/,
  "Active acceptance checklist must use the documented fulfillment-dashboard release"
);
assert.match(
  deploymentGuide,
  /scm-workbench-runtime-metadata-a3-20260622182004[^\n]+历史(?:发布)?快照/,
  "The older runtime-metadata release must be explicitly historical"
);

console.log(JSON.stringify({
  ok: true,
  contracts: [
    "date_filter_semantics",
    "guarded_rates",
    "unshipped_order_key",
    "package_snapshot_join",
    "issue_next_action",
    "split_rate_population",
    "deterministic_denominators",
    "audit_sla_arithmetic",
    "audit_split_arithmetic",
    "accessible_color_contrast",
    "deployment_manual_gate_prerequisites",
    "historical_release_labels",
    "deployment_release_consistency"
  ],
  databaseWrites: false,
  providerCalls: false,
  productionWrites: false
}, null, 2));
