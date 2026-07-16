import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const port = process.env.PORT || "5174";
const baseUrl = process.env.SCM_WORKBENCH_BASE_URL || `http://127.0.0.1:${port}`;
const chromeExecutablePath = process.env.CHROME_EXECUTABLE_PATH || "";
const requestTimeoutMs = Number(process.env.SCM_SMOKE_REQUEST_TIMEOUT_MS || 10000);
const expectedScenarioCount = Number(process.env.SCM_UI_SMOKE_EXPECTED_SCENARIOS || 6);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = process.env.SCM_UI_SMOKE_OUTPUT_DIR || path.join("tmp", `ui-smoke-${timestamp}`);

assert(Number.isInteger(expectedScenarioCount) && expectedScenarioCount > 0, "SCM_UI_SMOKE_EXPECTED_SCENARIOS must be a positive integer");

function envFlag(name) {
  return ["1", "true", "yes", "on"].includes(String(process.env[name] || "").toLowerCase());
}

function assertMutatingSmokeTarget(targetUrl, finalDestination = false) {
  const hostname = new URL(targetUrl).hostname;
  const loopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname);
  if (!loopback && !envFlag("SCM_MUTATING_SMOKE_REMOTE_AUTHORIZED")) {
    if (finalDestination) {
      throw new Error("Mutating UI smoke final destination is restricted to loopback. Redirected remote targets require SCM_MUTATING_SMOKE_REMOTE_AUTHORIZED=1 and explicit disposable-target approval.");
    }
    throw new Error("Mutating UI smoke is restricted to loopback. Set SCM_MUTATING_SMOKE_REMOTE_AUTHORIZED=1 only for an explicitly approved disposable remote target.");
  }
}

async function waitForFixture(promise, label, timeoutMs = requestTimeoutMs) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

assertMutatingSmokeTarget(baseUrl);

const viewports = [
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 }
];

const screens = [
  {
    id: "overview",
    nav: null,
    expect: ["AI 搜索对话", "治理任务中心与资产盘点", "工作台模块"]
  },
  {
    id: "strategy-panorama",
    nav: /战略供应链全景工作台/,
    expect: ["Strategic North Star", "Capability Map", "Target Operating Model", "Strategic Roadmap", "Gap-to-Action Board"]
  },
  {
    id: "current-risk-radar",
    nav: /业务现状与风险雷达/,
    setup: async (page) => {
      await page.getByText("来源证据").first().waitFor({ timeout: 10000 });
    },
    expect: ["Current Object Facts", "Risk Radar", "来源覆盖", "来源证据", "高级治理层", "阈值版本", "Defense Attribution", "Root Cause Lens", "Action Queue"]
  },
  {
    id: "role-workbenches",
    nav: /角色作战工作台/,
    expect: ["Dedicated role routes", "管理层 Command Center", "计划员工作台", "采购员工作台", "仓库库存工作台", "物流控制塔", "财务成本工作台", "Role Flow"]
  },
  {
    id: "fulfillment-dashboard",
    nav: /供应链履约看板/,
    setup: async (page) => {
      await page.locator('iframe[title="供应链履约看板知识原型"]').waitFor({ timeout: 10000 });
      await page.waitForFunction(() => Array.from(document.querySelectorAll("iframe")).some((frame) => frame.src.includes("/fulfillment-dashboard/index.html")), undefined, { timeout: 10000 });
      const frame = page.frame({ url: /\/fulfillment-dashboard\/index\.html/ });
      assert(frame, "Fulfillment dashboard iframe did not load");
      await frame.getByText("指标体系与指标字典").first().waitFor({ timeout: 10000 });
      await frame.getByRole("button", { name: "未发货预警" }).click();
      await frame.getByRole("heading", { name: "未发货预警" }).waitFor({ timeout: 10000 });
      await frame.getByRole("button", { name: "缺货分析" }).click();
      await frame.getByRole("heading", { name: "缺货分析" }).waitFor({ timeout: 10000 });
      await frame.getByRole("button", { name: "故事线与PRD" }).click();
      await frame.getByText("图表-数据绑定矩阵").waitFor({ timeout: 10000 });
      await frame.getByRole("button", { name: "指标体系" }).click();
    },
    expect: ["供应链履约看板", "Static knowledge prototype", "UI/交互验收", "静态知识原型"]
  },
  {
    id: "ontology-instance-360",
    nav: /对象本体工作台/,
    setup: async (page) => {
      await page.getByRole("button", { name: "关键实例治理" }).click();
      await page.getByText("FBA negative available batch").click();
      await page.getByText("关键对象实例视图").waitFor({ timeout: 10000 });
    },
    expect: ["OBJECT INSTANCE 360", "关键对象实例视图", "实例来源覆盖", "关联 AIP 场景", "治理台账"]
  },
  {
    id: "ai-knowledge",
    nav: /AI 知识库/,
    expect: ["本地证据检索", "知识卡片台账", "AI 对话草稿", "DeepSeek 多轮对话", "知识库模式", "联网模式"]
  },
  {
    id: "chatbi",
    nav: /ChatBI/,
    expect: ["可回答性判断", "认证上下文", "试运行"]
  },
  {
    id: "lineage-quality",
    nav: /血缘与质量工作台/,
    setup: async (page) => {
      await page.getByText("Source Coverage Export/API Lineage").first().waitFor({ timeout: 10000 });
    },
    expect: ["Source Coverage Lineage", "Export/API lineage 前置门禁", "Runtime Metadata Projection", "A-A-A 元数据投影 allowlist", "Runtime Business Row Design Gate", "业务行导入设计门禁", "仅设计门禁，不导入", "Runtime Metadata Projection Allowlist", "Source Coverage Export/API Lineage", "未开启运行时导入"]
  },
  {
    id: "kpi-system",
    nav: /指标体系编排台/,
    setup: async (page) => {
      await page.locator(".canvasShell").first().waitFor({ timeout: 10000 });
    },
    expect: ["Mind Map", "Object Graph", "Table", "导出 JSON", "L0-L3"]
  },
  {
    id: "decision-loop",
    nav: /决策闭环/,
    setup: async (page) => {
      await page.getByRole("tab", { name: /责任人收件箱/ }).click();
      await page.getByText("责任人决策收件箱").waitFor({ timeout: 10000 });
    },
    expect: ["责任人决策收件箱", "责任人收件箱", "场景诊断", "治理视图", "运行与建议", "审计台账", "建议处理队列", "高优先级场景"]
  }
];

const interactiveChecks = [
  {
    id: "overview-local-evidence-answer",
    run: async (page) => {
      await goToScreen(page, screenById("overview"));
      await page.getByRole("button", { name: "本地证据回答" }).click();
      await page.getByText("当前回答只基于本地知识库证据", { exact: false }).waitFor({ timeout: 10000 });
    },
    expect: ["当前回答只基于本地知识库证据"]
  },
  {
    id: "strategy-risk-crosslink",
    run: async (page) => {
      await goToScreen(page, screenById("strategy-panorama"));
      await page.getByRole("button", { name: "打开风险雷达" }).click();
      await page.getByText("当前事实 + 风险").waitFor({ timeout: 10000 });
    },
    expect: ["Defense Attribution", "Action Queue"]
  },
  {
    id: "ai-knowledge-search-and-chat",
    run: async (page) => {
      await goToScreen(page, screenById("ai-knowledge"));
      await page.getByText("Answer Quality Review").waitFor({ timeout: 10000 });
      await page.getByText("A-A-A-A").first().waitFor({ timeout: 10000 });
      await page.locator(".aiQualityReviewCard").first().getByRole("button", { name: "接受本地证据基线" }).click();
      await page.locator(".aiQualityReceipt").getByText("AI 知识库质量回执").waitFor({ timeout: 10000 });
      await page.getByRole("button", { name: "本地检索" }).click();
      await page.getByText(/条命中|local_kb_evidence_only_no_provider_call/, { exact: false }).first().waitFor({ timeout: 10000 });
      await page.getByRole("button", { name: "AI 对话" }).click();
      await page.getByText("本地知识对话证据链").waitFor({ timeout: 10000 });
    },
    expect: ["Answer Quality Review", "A-A-A-A", "AI 知识库质量回执", "本地知识对话证据链"]
  },
  {
    id: "detail-drawer-accessibility-and-write-boundaries",
    run: async (page) => {
      await goToScreen(page, screenById("ai-knowledge"));
      const cardTable = page.locator(".assetSurface").filter({ hasText: "知识卡片台账" }).first();
      const sourceRow = cardTable.getByRole("row").filter({ hasText: "BI 字段到业务知识库分类登记" }).first();
      await sourceRow.focus();
      await sourceRow.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ timeout: 10000 });
      assert(await dialog.getAttribute("aria-modal") === "true", "Detail drawer must expose aria-modal=true");
      const labelledTitleExists = await dialog.evaluate((element) => {
        const titleId = element.getAttribute("aria-labelledby");
        return Boolean(titleId && document.getElementById(titleId)?.textContent?.trim());
      });
      assert(labelledTitleExists, "Detail drawer must reference a non-empty labelled title");
      assert(await dialog.evaluate((element) => element.contains(document.activeElement)), "Initial drawer focus must move inside the dialog");
      for (let index = 0; index < 12; index += 1) {
        await page.keyboard.press("Tab");
        assert(await dialog.evaluate((element) => element.contains(document.activeElement)), "Tab focus must remain trapped inside the drawer");
      }

      let releaseDelayedWrite;
      let resolveDelayedWriteStarted;
      let resolveDelayedWriteCompleted;
      const delayedWriteStarted = new Promise((resolveStarted) => { resolveDelayedWriteStarted = resolveStarted; });
      const delayedWriteRelease = new Promise((resolveRelease) => { releaseDelayedWrite = resolveRelease; });
      const delayedWriteCompleted = new Promise((resolveCompleted) => { resolveDelayedWriteCompleted = resolveCompleted; });
      await page.evaluate(() => {
        window.__scmOriginalFetch = window.fetch;
        window.__scmAnnotationResponsesProcessed = 0;
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
          const response = await originalFetch(...args);
          const requestUrl = String(args[0] instanceof Request ? args[0].url : args[0]);
          if (requestUrl.includes("/api/annotations")) {
            const originalJson = response.json.bind(response);
            response.json = async () => {
              const payload = await originalJson();
              setTimeout(() => { window.__scmAnnotationResponsesProcessed += 1; }, 0);
              return payload;
            };
          }
          return response;
        };
      });
      await page.route("**/api/annotations", async (route) => {
        resolveDelayedWriteStarted();
        await delayedWriteRelease;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ledger: {
              annotations: [{ id: "stale-fixture", body: "stale-target-response", created_at: new Date().toISOString() }],
              comments: [],
              revisionProposals: [],
              auditEvents: []
            }
          })
        });
        resolveDelayedWriteCompleted();
      });
      const sourceDraft = dialog.getByPlaceholder("写入治理注解，例如口径边界、样本异常或 owner 判断...");
      await sourceDraft.fill("source-target-draft");
      await dialog.getByRole("button", { name: "保存注解" }).click();
      await waitForFixture(delayedWriteStarted, "delayed annotation request start");
      await dialog.getByRole("button", { name: /打开对象|打开指标/ }).first().click();
      const currentDraft = dialog.getByPlaceholder("写入治理注解，例如口径边界、样本异常或 owner 判断...");
      await currentDraft.waitFor({ timeout: 10000 });
      assert(await currentDraft.inputValue() === "", "Drawer write drafts must reset when the selected target changes");
      await currentDraft.fill("intermediate-target-draft");
      const sourceSupportCard = dialog.locator(".supportCard")
        .filter({ hasText: "BI 字段到业务知识库分类登记" })
        .first();
      await sourceSupportCard.getByRole("button", { name: "打开知识卡" }).click();
      await dialog.getByText("BI 字段到业务知识库分类登记").first().waitFor({ timeout: 10000 });
      assert(await currentDraft.inputValue() === "", "Drawer write drafts must reset when returning to the original target");
      await currentDraft.fill("current-target-draft");
      releaseDelayedWrite();
      await waitForFixture(delayedWriteCompleted, "delayed annotation route completion");
      await page.waitForFunction(
        () => window.__scmAnnotationResponsesProcessed >= 1,
        undefined,
        { timeout: requestTimeoutMs }
      );
      assert(await currentDraft.inputValue() === "current-target-draft", "An A-to-B-to-A stale submit completion must not clear the returned target draft");
      assert((await dialog.innerText()).includes("stale-target-response") === false, "An A-to-B-to-A stale submit completion must not replace the returned target ledger");
      await page.unroute("**/api/annotations");
      await page.evaluate(() => {
        window.fetch = window.__scmOriginalFetch;
        delete window.__scmOriginalFetch;
        delete window.__scmAnnotationResponsesProcessed;
      });

      await page.route("**/api/annotations", (route) => route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "fixture write rejected" })
      }));
      await dialog.getByRole("button", { name: "保存注解" }).click();
      const writeAlert = dialog.getByRole("alert");
      await writeAlert.waitFor({ timeout: 10000 });
      assert((await writeAlert.innerText()).includes("保存失败"), "Failed drawer writes must surface an error message");
      assert(await currentDraft.inputValue() === "current-target-draft", "Failed drawer writes must retain the current draft");
      await page.unroute("**/api/annotations");

      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached", timeout: 10000 });
      assert(await sourceRow.evaluate((element) => document.activeElement === element), "Closing the drawer must restore focus to its trigger");
    },
    expect: ["知识卡片台账"]
  },
  {
    id: "chatbi-dry-run-trace",
    run: async (page) => {
      await goToScreen(page, screenById("chatbi"));
      await page.getByRole("button", { name: "试运行" }).click();
      await page.getByText("ChatBI 试运行证据链").waitFor({ timeout: 10000 });
    },
    expect: ["ChatBI 试运行证据链"]
  },
  {
    id: "kpi-canvas-interaction",
    run: async (page) => {
      await goToScreen(page, screenById("kpi-system"));
      const metricNodes = page.locator("button.graphNode").filter({ hasNotText: "Object" });
      await metricNodes.first().click({ force: true });
      await page.getByText("PC CANVAS INSPECTOR").waitFor({ timeout: 10000 });
      await page.getByRole("button", { name: "打开详细抽屉" }).click();
      await page.getByText("资产详情").waitFor({ timeout: 10000 });
      await page.getByText("治理台账").waitFor({ timeout: 10000 });
      await page.getByRole("button", { name: "关闭" }).click();

      await page.locator(".canvasControls").getByRole("button", { name: "+" }).click();
      await page.locator(".canvasControls").getByRole("button", { name: "全屏预览" }).click();
      await page.locator(".fullScreenCanvas").waitFor({ timeout: 10000 });
      await page.locator(".canvasControls").getByRole("button", { name: "退出全屏" }).click();

      await page.getByRole("button", { name: "Object Graph" }).click();
      await page.getByText("Object Graph").first().waitFor({ timeout: 10000 });
      await page.locator("button.graphNode.object").first().click({ force: true });
      await page.getByText("PC CANVAS INSPECTOR").waitFor({ timeout: 10000 });
      await page.getByRole("button", { name: "打开详细抽屉" }).click();
      await page.getByText("资产详情").waitFor({ timeout: 10000 });
      await page.getByRole("button", { name: "关闭" }).click();

      await page.getByRole("button", { name: "Table" }).click();
      await page.getByText("KPI 树表格视图").waitFor({ timeout: 10000 });
    },
    expect: ["KPI 树表格视图", "导出 JSON"]
  },
  {
    id: "scenario-diagnostic-trace",
    run: async (page) => {
      await goToScreen(page, screenById("decision-loop"));
      await page.getByRole("tab", { name: /场景诊断/ }).click();
      await page.getByRole("button", { name: "运行本地诊断" }).first().click();
      await page.getByText("本次诊断证据链").waitFor({ timeout: 10000 });
    },
    expect: ["本次诊断证据链"]
  },
  {
    id: "trace-review-governance",
    run: async (page) => {
      await goToScreen(page, screenById("decision-loop"));
      await page.getByRole("tab", { name: /审计台账/ }).click();
      const board = page.locator(".traceReviewBoard").first();
      await board.getByText("证据链复盘工作台").waitFor({ timeout: 10000 });
      await board.getByRole("button", { name: "批准证据链治理视图" }).first().click();
      await board.getByText("证据链复盘回执").waitFor({ timeout: 10000 });
      await board.getByText("approved_for_governance_view").first().waitFor({ timeout: 10000 });
    },
    expect: ["Trace Review Governance", "证据链复盘回执", "approved_for_governance_view"]
  },
  {
    id: "role-workbench-review",
    run: async (page) => {
      await goToScreen(page, screenById("role-workbenches"));
      await page.locator(".roleTabs").getByRole("button", { name: /计划员工作台/ }).click();
      await page.getByText("供应链计划 Owner").first().waitFor({ timeout: 10000 });
      await page.locator(".roleReviewActions").getByRole("button", { name: "批准治理视图" }).click();
      await page.getByText("角色复核回执").waitFor({ timeout: 10000 });
      await page.getByText("已纳入治理视图").first().waitFor({ timeout: 10000 });
    },
    expect: ["角色复核回执", "已纳入治理视图", "计划员工作台"]
  },
  {
    id: "finance-cost-governance-review",
    run: async (page) => {
      await goToScreen(page, screenById("role-workbenches"));
      await page.locator(".roleTabs").getByRole("button", { name: /财务成本工作台/ }).click();
      await page.getByText("Finance Cost Evidence").waitFor({ timeout: 10000 });
      await page.getByText("Finance Cost Policy Summary").waitFor({ timeout: 10000 });
      await page.getByText("A-A-A-A").first().waitFor({ timeout: 10000 });
      await page.getByText("transaction detail import closed").first().waitFor({ timeout: 10000 });
      await page.getByText("Finance Owner Choice Pack").waitFor({ timeout: 10000 });
      await page.locator(".financeCostCard").first().getByRole("button", { name: "批准财务治理视图" }).click();
      await page.getByText("财务成本回执").waitFor({ timeout: 10000 });
      await page.getByText("已纳入治理视图").first().waitFor({ timeout: 10000 });
      await page.locator(".financeOwnerChoiceCard").first().getByRole("button", { name: /批准费用口径/ }).click();
      await page.getByText("财务责任人选择回执").waitFor({ timeout: 10000 });
      await page.getByText("approved cost type mapping").first().waitFor({ timeout: 10000 });
    },
    expect: ["Finance Cost Evidence", "Finance Cost Policy Summary", "A-A-A-A", "财务责任人选择回执", "approved cost type mapping"]
  },
  {
    id: "risk-threshold-governance-review",
    run: async (page) => {
      await goToScreen(page, screenById("current-risk-radar"));
      await page.getByRole("button", { name: /高级治理层/ }).click();
      await page.getByText("Risk Threshold Governance").waitFor({ timeout: 10000 });
      await page.getByText("Threshold Owner Choice Pack").waitFor({ timeout: 10000 });
      await page.getByText("Threshold Value Owner Review Pack").waitFor({ timeout: 10000 });
      await page.getByText("A-A-A").first().waitFor({ timeout: 10000 });
      await page.getByText("A-A-A-A-A").first().waitFor({ timeout: 10000 });
      await page.locator(".thresholdVersionCard").first().getByRole("button", { name: "批准阈值治理视图" }).click();
      await page.getByText("阈值复核回执").waitFor({ timeout: 10000 });
      await page.getByText("已纳入治理视图").first().waitFor({ timeout: 10000 });
      await page.locator(".thresholdOwnerChoiceCard").first().getByRole("button", { name: "仅治理视图" }).click();
      await page.getByText("threshold policy draft only").first().waitFor({ timeout: 10000 });
      await page.locator(".thresholdValueReviewCard").first().getByRole("button", { name: "作为评审基线" }).click();
      await page.getByText("value review baseline only").first().waitFor({ timeout: 10000 });
    },
    expect: ["Threshold Owner Choice Pack", "Threshold Value Owner Review Pack", "A-A-A-A-A", "value review baseline only", "Risk Threshold Governance"]
  },
  {
    id: "scenario-matrix-diagnostics",
    run: async (page) => {
      await goToScreen(page, screenById("decision-loop"));
      await page.getByRole("tab", { name: /场景诊断/ }).click();
      await page.getByRole("button", { name: "运行全部场景诊断" }).click();
      await page.getByText("场景矩阵诊断回执").waitFor({ timeout: 15000 });
      const matrixReceiptText = await page
        .locator(".scenarioMatrixReceipt")
        .getByText(/\d+ \/ \d+ 个场景已进入本地运行记录复盘/)
        .textContent({ timeout: 10000 });
      const matrixReceiptMatch = matrixReceiptText?.match(/(\d+)\s*\/\s*(\d+)\s*个场景/);
      assert(
        matrixReceiptMatch
          && Number(matrixReceiptMatch[1]) === Number(matrixReceiptMatch[2])
          && Number(matrixReceiptMatch[2]) === expectedScenarioCount,
        `Scenario matrix receipt should complete exactly ${expectedScenarioCount} scenarios, got: ${matrixReceiptText || "empty"}`
      );
    },
    expect: ["Scenario Matrix Receipt", "场景矩阵诊断回执"]
  },
  {
    id: "recommendation-workflow",
    run: async (page) => {
      await goToScreen(page, screenById("decision-loop"));
      await page.getByRole("tab", { name: /运行与建议/ }).click();
      await page.getByRole("button", { name: "创建异常诊断卡" }).click();
      await page.getByText("推荐闭环回执").waitFor({ timeout: 10000 });
      const receipt = page.locator(".workflowReceipt").filter({ hasText: "推荐闭环回执" }).first();
      const approveButton = receipt.getByRole("button", { name: "批准最近建议卡" });
      await approveButton.click();
      await receipt.getByText("已批准").waitFor({ timeout: 10000 });
      assert(await approveButton.isDisabled(), "Approved recommendation must not remain approvable");
      await receipt.getByRole("button", { name: "转最近 Action Task" }).click();
      await receipt.getByText("行动任务已创建").first().waitFor({ timeout: 10000 });
    },
    expect: ["Recommendation Workflow Receipt", "行动任务已创建"]
  },
  {
    id: "owner-decision-packet",
    run: async (page) => {
      await goToScreen(page, screenById("decision-loop"));
      await page.getByRole("tab", { name: /治理视图/ }).click();
      await page.getByRole("button", { name: /A 批准当前阈值/ }).click();
      await page.getByText("最近人工决策已记录").waitFor({ timeout: 10000 });
    },
    expect: ["Manual Review Receipt", "最近人工决策已记录"]
  },
  {
    id: "omswms-owner-decision-packet",
    run: async (page) => {
      await goToScreen(page, screenById("decision-loop"));
      await page.getByRole("tab", { name: /治理视图/ }).click();
      const card = page.locator(".decisionPacketCard").filter({ hasText: "OMSWMS-001" }).first();
      await card.getByRole("button", { name: /A 治理视图/ }).click();
      await page.locator(".decisionReceipt").getByText("Source coverage 对象入治理视图 - A").waitFor({ timeout: 10000 });
      await page.locator(".decisionReceiptGovernance").getByText("已纳入治理视图").first().waitFor({ timeout: 10000 });
    },
    expect: ["Manual Review Receipt", "Source coverage 对象入治理视图 - A", "Decision Receipt Governance"]
  },
  {
    id: "omswms-usage-policy-pack",
    run: async (page) => {
      await goToScreen(page, screenById("decision-loop"));
      await page.getByRole("tab", { name: /治理视图/ }).click();
      await page.getByText("OMS/WMS Usage Policy Pack").waitFor({ timeout: 10000 });
      const card = page.locator(".omsWmsUsageCard").filter({ hasText: "OMSWMS-USE-001" }).first();
      await card.getByRole("button", { name: /A 元数据治理基线/ }).click();
      await page.locator(".omsWmsUsageReceipt").getByText("字段使用策略已记录").waitFor({ timeout: 10000 });
      await page.locator(".omsWmsUsageReceipt").getByText("usage policy metadata only accepted").waitFor({ timeout: 10000 });
    },
    expect: ["OMS/WMS Usage Policy Pack", "字段使用策略已记录", "usage policy metadata only accepted"]
  },
  {
    id: "runtime-business-row-design-gate",
    run: async (page) => {
      await goToScreen(page, screenById("lineage-quality"));
      await page.getByText("Runtime Business Row Design Gate").waitFor({ timeout: 10000 });
      const card = page.locator(".runtimeBusinessCard").filter({ hasText: "RUNTIME-BIZ-001" }).first();
      await card.getByRole("button", { name: /A\s+只登记设计契约/ }).click();
      await page.locator(".runtimeBusinessReceipt").getByText("业务行导入设计已记录").waitFor({ timeout: 10000 });
      await page.locator(".runtimeBusinessReceipt").getByText("runtime row design contract only").waitFor({ timeout: 10000 });
    },
    expect: ["Runtime Business Row Design Gate", "业务行导入设计已记录", "runtime row design contract only"]
  }
];

const summary = {
  baseUrl,
  outputDir,
  expectedScenarioCount,
  chromeExecutablePath: chromeExecutablePath || "playwright-bundled-chromium",
  boundary: {
    productionWrites: false,
    providerCalls: false,
    erpWriteback: false,
    localSqliteWrites: true
  },
  screenshots: [],
  checks: []
};

function record(name, payload = {}) {
  summary.checks.push({ name, ...payload });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function screenById(id) {
  const screen = screens.find((item) => item.id === id);
  assert(screen, `Unknown smoke screen ${id}`);
  return screen;
}

async function getBodyText(page) {
  return page.locator("body").innerText({ timeout: 10000 });
}

async function assertTexts(page, expected) {
  const text = await getBodyText(page);
  const normalized = text.toLowerCase();
  for (const value of expected) {
    assert(normalized.includes(String(value).toLowerCase()), `Expected visible text "${value}"`);
  }
}

async function assertNoDocumentOverflow(page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));
  const overflow = Math.max(metrics.scrollWidth, metrics.bodyScrollWidth) - metrics.innerWidth;
  assert(overflow <= 2, `Horizontal document overflow ${overflow}px at ${metrics.innerWidth}px`);
  return { ...metrics, overflow };
}

async function goToScreen(page, screen) {
  if (screen.nav) {
    await page.getByRole("button", { name: screen.nav }).first().click();
  }
  if (screen.setup) {
    await screen.setup(page);
  }
  await assertTexts(page, screen.expect);
}

async function capture(page, viewportName, screenId) {
  const file = path.join(outputDir, `${viewportName}-${screenId}.png`);
  await page.screenshot({ path: file, fullPage: true });
  summary.screenshots.push(file);
  return file;
}

async function runViewportSmoke(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    assertMutatingSmokeTarget(page.url(), true);
    await page.getByText("供应链数据开发治理工作台").first().waitFor({ timeout: 10000 });

    for (const screen of screens) {
      await goToScreen(page, screen);
      const overflow = await assertNoDocumentOverflow(page);
      const screenshot = await capture(page, viewport.name, screen.id);
      record("ui-screen", { viewport: viewport.name, screen: screen.id, screenshot, overflow });
      if (screen.id === "ontology-instance-360") {
        await page.getByRole("button", { name: "关闭" }).click();
      }
    }

    assert(consoleErrors.length === 0, `Console errors found: ${consoleErrors.join(" | ")}`);
    assert(pageErrors.length === 0, `Page errors found: ${pageErrors.join(" | ")}`);
    record("viewport-complete", { viewport: viewport.name, consoleErrors: 0, pageErrors: 0 });
  } finally {
    await page.close();
  }
}

async function runInteractiveSmoke(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    assertMutatingSmokeTarget(page.url(), true);
    for (const check of interactiveChecks) {
      await check.run(page);
      await assertTexts(page, check.expect);
      const overflow = await assertNoDocumentOverflow(page);
      const screenshot = await capture(page, "desktop-1366", check.id);
      record("ui-interaction", { check: check.id, screenshot, overflow });
    }
  } finally {
    await page.close();
  }
}

await mkdir(outputDir, { recursive: true });

const healthResponse = await fetch(`${baseUrl}/api/deploy/health`, {
  signal: AbortSignal.timeout(requestTimeoutMs)
});
assertMutatingSmokeTarget(healthResponse.url, true);
const health = await healthResponse.json();
assert(healthResponse.ok && health.ok === true, "UI smoke target must be healthy");
assert(health.boundary?.databaseWriteAuthorized === true, "UI smoke requires SCM_DATABASE_WRITES_AUTHORIZED=1 on a disposable target");
assert(
  health.database?.aipScenarios === expectedScenarioCount,
  `UI smoke requires exactly ${expectedScenarioCount} scenarios, got ${health.database?.aipScenarios ?? "unknown"}`
);

const launchOptions = {
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
};

if (chromeExecutablePath) {
  launchOptions.executablePath = chromeExecutablePath;
}

const browser = await chromium.launch(launchOptions);

try {
  for (const viewport of viewports) {
    await runViewportSmoke(browser, viewport);
  }
  await runInteractiveSmoke(browser);
} finally {
  await browser.close();
}

const summaryPath = path.join(outputDir, "summary.json");
await writeFile(summaryPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, summaryPath }, null, 2));
