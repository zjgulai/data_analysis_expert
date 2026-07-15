import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const port = process.env.PORT || "5174";
const baseUrl = process.env.SCM_WORKBENCH_BASE_URL || `http://127.0.0.1:${port}`;
const chromeExecutablePath = process.env.CHROME_EXECUTABLE_PATH || "";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = process.env.SCM_UI_BASELINE_OUTPUT_DIR || path.join("tmp", `ui-baseline-${timestamp}`);
const summaryPath = process.env.SCM_UI_BASELINE_SUMMARY_PATH || path.join(outputDir, "summary.json");
const viewport = { name: "desktop-1440", width: 1440, height: 900 };

const tokenNames = [
  "--ink",
  "--ink-2",
  "--muted",
  "--line",
  "--line-strong",
  "--paper",
  "--paper-lift",
  "--panel",
  "--panel-soft",
  "--sidebar-surface",
  "--sidebar-surface-strong",
  "--blue",
  "--blue-soft",
  "--teal",
  "--teal-soft",
  "--green",
  "--green-soft",
  "--amber",
  "--amber-soft",
  "--rose",
  "--rose-soft",
  "--shadow",
  "--shadow-soft"
];

const componentSelectors = [
  "body",
  ".shell",
  ".sidebar",
  ".brandMark",
  ".content",
  ".topbar",
  ".pageIntro",
  ".moduleCard",
  ".surface",
  ".panel",
  ".canvasShell",
  ".tableWrap",
  ".badge"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sanitize(value) {
  return String(value)
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function sha256(pathname) {
  return createHash("sha256").update(await readFile(pathname)).digest("hex");
}

async function request(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  if (!response.ok) throw new Error(`GET ${pathname} returned ${response.status}`);
  return response.json();
}

async function navigateToModule(page, module) {
  if (module.id === "overview") {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
  } else {
    await page.locator(".sidebarNav button").filter({ hasText: module.title }).click();
  }
  await page.getByRole("heading", { name: module.title }).first().waitFor({ timeout: 12000 });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(250);
}

async function collectPageMetrics(page) {
  return page.evaluate((selectors) => {
    const pick = (style) => ({
      display: style.display,
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      padding: style.padding,
      gap: style.gap
    });
    const componentStyles = {};
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) {
        componentStyles[selector] = { present: false };
        continue;
      }
      const rect = element.getBoundingClientRect();
      componentStyles[selector] = {
        present: true,
        rect: {
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100
        },
        style: pick(getComputedStyle(element))
      };
    }
    const documentElement = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(documentElement.scrollWidth, body.scrollWidth);
    const scrollHeight = Math.max(documentElement.scrollHeight, body.scrollHeight);
    return {
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth,
        scrollHeight,
        overflowX: Math.max(0, scrollWidth - window.innerWidth),
        heightRatio: Math.round((scrollHeight / window.innerHeight) * 100) / 100
      },
      componentStyles
    };
  }, componentSelectors);
}

async function collectTokens(page) {
  return page.evaluate((names) => {
    const rootStyle = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      names.map((name) => [name, rootStyle.getPropertyValue(name).trim()])
    );
  }, tokenNames);
}

await mkdir(outputDir, { recursive: true });
const screenshotDir = path.join(outputDir, "screenshots");
assert(
  path.dirname(path.resolve(summaryPath)) === path.resolve(outputDir),
  "SCM_UI_BASELINE_SUMMARY_PATH must stay inside SCM_UI_BASELINE_OUTPUT_DIR so screenshot references remain portable"
);
await mkdir(screenshotDir, { recursive: true });
await mkdir(path.dirname(summaryPath), { recursive: true });

const modules = await request("/api/workbench/modules");
assert(Array.isArray(modules), "workbench modules response must be an array");
assert(modules.length === 15, `expected 15 workbench modules, got ${modules.length}`);

const browser = await chromium.launch(
  chromeExecutablePath ? { executablePath: chromeExecutablePath } : {}
);
const consoleErrors = [];
const pageErrors = [];
const nonReadOnlyRequests = [];
const moduleAudits = [];
let rootTokens = {};

try {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }
  });
  await context.addInitScript(() => {
    window.localStorage.clear();
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("request", (request) => {
    const method = request.method();
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      nonReadOnlyRequests.push({ method, url: request.url() });
    }
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  rootTokens = await collectTokens(page);

  for (const module of modules) {
    await navigateToModule(page, module);
    const metrics = await collectPageMetrics(page);
    const screenshotName = `${viewport.name}-${module.code}-${sanitize(module.id)}.png`;
    await page.screenshot({
      path: path.join(screenshotDir, screenshotName),
      fullPage: true
    });
    moduleAudits.push({
      id: module.id,
      code: module.code,
      title: module.title,
      status: module.status,
      stage: module.stage,
      screenshot: `screenshots/${screenshotName}`,
      viewport: metrics.viewport,
      h1: metrics.h1,
      componentStyles: metrics.componentStyles
    });
  }
} finally {
  await browser.close();
}

const screenshotSha256 = Object.fromEntries(
  await Promise.all(moduleAudits.map(async (item) => [
    item.screenshot,
    await sha256(path.join(outputDir, item.screenshot))
  ]))
);

assert(nonReadOnlyRequests.length === 0, `UI baseline must not issue write requests: ${JSON.stringify(nonReadOnlyRequests)}`);
assert(consoleErrors.length === 0, `UI baseline must not emit console errors: ${consoleErrors.join(" | ")}`);
assert(pageErrors.length === 0, `UI baseline must not emit page errors: ${pageErrors.join(" | ")}`);
assert(moduleAudits.every((item) => item.viewport.overflowX === 0), "UI baseline must have zero horizontal overflow for every module");

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  artifactType: "scm_ui_screenshot_token_baseline",
  boundary: {
    productionWrites: false,
    providerCalls: false,
    erpWriteback: false,
    localSqliteWrites: false,
    methods: ["GET", "HEAD", "OPTIONS"]
  },
  viewport,
  moduleCount: modules.length,
  screenshotCount: moduleAudits.length,
  screenshotRoot: "screenshots",
  screenshotSha256,
  rootTokens,
  globalChecks: {
    nonReadOnlyRequests: nonReadOnlyRequests.length,
    consoleErrors: consoleErrors.length,
    pageErrors: pageErrors.length,
    maxOverflowX: Math.max(...moduleAudits.map((item) => item.viewport.overflowX)),
    maxHeightRatio: Math.max(...moduleAudits.map((item) => item.viewport.heightRatio))
  },
  modules: moduleAudits
};

await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
if (path.resolve(summaryPath) !== path.resolve(outputDir, "summary.json")) {
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

console.log(JSON.stringify({
  baseUrl,
  outputDir,
  summaryPath,
  moduleCount: summary.moduleCount,
  screenshotCount: summary.screenshotCount,
  boundary: summary.boundary,
  globalChecks: summary.globalChecks
}, null, 2));
