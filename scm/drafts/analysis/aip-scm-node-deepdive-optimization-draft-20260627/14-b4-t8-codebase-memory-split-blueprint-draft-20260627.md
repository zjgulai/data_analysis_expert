---
title: "B4 T8 codebase-memory 巨石拆分蓝图"
date: "2026-06-27"
status: "split_blueprint_ready"
batch: "B4"
scope: "T8 codebase-memory dependency graph split blueprint for src/main.tsx and server/index.mjs; behavior-preserving refactor plan only"
boundary: "draft and local SQLite governance only; productionWrites=false; providerCalls=false; erpWriteback=false; actions stop at suggestion_review_replay"
depends_on:
  - "01-engineering-debt-and-fragility-audit-draft-20260627.md"
  - "08-codebase-memory-mcp-install-plan-draft-20260627.md"
  - "09-codex-execution-handoff-draft-20260627.md"
  - "10-current-product-state-execution-register-draft-20260627.md"
  - "13-b3-t7-additive-migration-plan-draft-20260627.md"
---

# B4 T8 codebase-memory 巨石拆分蓝图

## 1. 批次目标

B4 只处理 T8 的设计冻结：用 codebase-memory MCP 的真实依赖图，把 `src/main.tsx` 和 `server/index.mjs` 拆成可逐 PR 执行、可回滚、行为保持的蓝图。本批不移动源码、不抽组件、不改路由、不做 UI/API 行为变化。

## 2. 图谱事实

| 项 | 当前事实 |
|---|---|
| Indexed project | `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` |
| Index status | `ready` |
| Graph size | 814 nodes / 1874 edges |
| Node mix | Function 302、Variable 272、Section 77、Type 65、File 33、Module 33、EnvVar 20 |
| Edge mix | DEFINES 749、CALLS 726、SEMANTICALLY_RELATED 146、USAGE 118、CONFIGURES 43 |
| Current file sizes | `src/main.tsx` 7026 lines；`server/index.mjs` 4596 lines |
| Current task | `aip_20260627_t8_codebase_memory_split_blueprint` = `ready_for_blueprint` |

## 3. 架构聚类

| Cluster | Members | Cohesion | Top nodes | 拆分含义 |
|---|---:|---:|---|---|
| `src` | 52 | 0.738 | `Badge`、`humanizeOperationalLabel`、`DecisionPanel`、`AiKnowledgePanel`、`RefPills` | 前端共享 UI / formatter / 高风险决策域混在同文件。 |
| `server` | 49 | 0.905 | `deepSeekAiChat`、`recordAudit`、`createAgentRun`、`makeId`、`nowIso` | 写入、审计、provider gate 和 agent run 可独立成 service。 |
| `server` | 42 | 0.830 | `all`、`get`、`getWorkbenchModule`、`getSourceCoverage`、`getOverview` | DB helper、read model 和 workbench module 聚在一起。 |
| `src` | 34 | 0.579 | `CurrentRiskRadarPanel`、`App`、`ModuleHeader`、`useApi`、`AssetTable` | App shell、共享组件和风险雷达页面耦合。 |
| `public` | 28 | 1.000 | `qs`、`boot`、`renderStorylineAnalysis`、`setupInteractions`、`renderMetricTable` | 履约静态页面已天然独立，T8 不优先触碰。 |
| `scripts` | 23 | 0.723 | `json`、`text`、`callDeepSeekWebMode`、`main`、`callDeepSeekKnowledgeMode` | smoke/deepseek 脚本保持独立验证层。 |
| `scripts` | 13 | 0.944 | `runViewportSmoke`、`runInteractiveSmoke`、`assert`、`assertTexts`、`assertNoDocumentOverflow` | UI smoke 是拆分回归关键资产。 |

## 4. 热点与风险

| Hotspot | Fan-in | 风险 | 拆分策略 |
|---|---:|---|---|
| `Badge` | 41 | UI 基础件被所有页面复用。 | 先抽纯展示组件，并保持 className/DOM 结构不变。 |
| `all` | 29 | 服务端所有查询依赖 DB helper。 | 抽 `server/db.mjs` 时只搬函数，不改 SQL。 |
| `humanizeOperationalLabel` | 28 | 状态文案跨页面复用。 | 与 formatter 一起抽出，保留输入输出快照。 |
| `get` | 22 | 服务端单行查询基础件。 | 与 `all/run/insert/scalar/tableCount` 成组搬迁。 |
| `RefPills` | 15 | 证据引用 UI 横跨多页面。 | 进入 `src/shared/reference-ui.tsx`。 |
| `recordAudit` | 13 | POST 写入链路共用审计。 | 后端写入 service 抽分时最后迁移。 |

## 5. 前端切分证据

`App` outbound trace 直接调用 `useApi`、`Badge`、`StrategyPanoramaPanel`、`CurrentRiskRadarPanel`、`OverviewPanel`、`OntologyPanel`、`TagsPanel`、`DimensionsPanel`、`MetricsPanel`、`KpiTreePanel`、`LineagePanel`、`AiKnowledgePanel`、`ChatBiPanel`、`RoleWorkbenchesPanel`、`DecisionPanel`、`FulfillmentDashboardPanel`、`Sidebar`。这说明 `App` 应先变成 thin shell，页面级 Panel 应按路由/模块边界搬出。

| Panel / Helper | Lines | Out degree | Suggested module |
|---|---:|---:|---|
| `useApi` | 1049 | - | `src/api/client.ts` |
| `Badge` | 1188 | fan-in 41 | `src/shared/ui/Badge.tsx` |
| `DataTable` | 1227 | - | `src/shared/ui/DataTable.tsx` |
| `ModuleHeader` | 1293 | - | `src/shared/ui/ModuleHeader.tsx` |
| `WorkflowStrip` | 1310 | - | `src/shared/ui/WorkflowStrip.tsx` |
| `AgentTracePanel` | 1684-1728 | 4 | `src/features/decision/AgentTracePanel.tsx` |
| `AssetTable` | 2112 | - | `src/shared/ui/AssetTable.tsx` |
| `RiskThresholdGovernancePanel` | 2293-2531 | 6 | `src/features/risk/RiskThresholdGovernancePanel.tsx` |
| `FinanceCostGovernancePanel` | 2576-2783 | 6 | `src/features/finance/FinanceCostGovernancePanel.tsx` |
| `RuntimeMetadataProjectionPanel` | 2873-2965 | 4 | `src/features/runtime/RuntimeMetadataProjectionPanel.tsx` |
| `RuntimeBusinessRowDesignGatePanel` | 2967-3088 | 4 | `src/features/runtime/RuntimeBusinessRowDesignGatePanel.tsx` |
| `StrategyPanoramaPanel` | 3315-3482 | 8 | `src/features/strategy/StrategyPanoramaPanel.tsx` |
| `CurrentRiskRadarPanel` | 3499-3936 | 16 | `src/features/risk/CurrentRiskRadarPanel.tsx` |
| `OverviewPanel` | 4199-4239 | 9 | `src/features/overview/OverviewPanel.tsx` |
| `OntologyPanel` | 4241-4300 | 4 | `src/features/ontology/OntologyPanel.tsx` |
| `TagsPanel` | 4302-4317 | 4 | `src/features/reference/TagsPanel.tsx` |
| `DimensionsPanel` | 4319-4334 | 4 | `src/features/reference/DimensionsPanel.tsx` |
| `MetricsPanel` | 4336-4365 | 5 | `src/features/metrics/MetricsPanel.tsx` |
| `KpiTreePanel` | 4617-4749 | 10 | `src/features/kpi/KpiTreePanel.tsx` |
| `LineagePanel` | 4751-4874 | 7 | `src/features/lineage/LineagePanel.tsx` |
| `AiKnowledgePanel` | 4876-5335 | 15 | `src/features/knowledge/AiKnowledgePanel.tsx` |
| `ChatBiPanel` | 5337-5375 | 5 | `src/features/chatbi/ChatBiPanel.tsx` |
| `RoleWorkbenchesPanel` | 6170-6415 | 10 | `src/features/roles/RoleWorkbenchesPanel.tsx` |
| `DecisionPanel` | 6417-6878 | 17 | `src/features/decision/DecisionPanel.tsx` |
| `FulfillmentDashboardPanel` | 6880-6905 | 1 | `src/features/fulfillment/FulfillmentDashboardPanel.tsx` |
| `App` | 6963-7024 | 17 | keep in `src/main.tsx` as shell |

## 6. 后端切分证据

服务端当前把 DB helper、schema bootstrap、read models、POST mutation、provider gate、HTTP dispatcher 放在一个文件。静态行号显示 route dispatcher 位于 `server/index.mjs:4376-4564`，GET/POST 路径和 SQL helper 混在同一文件中。

| Boundary | Current symbols | Suggested module |
|---|---|---|
| DB adapter | `all` 261、`get` 265、`run` 283、`insert` 287 | `server/db.mjs` |
| Audit / ids / time | `recordAudit` 1170、`makeId`、`nowIso` | `server/audit.mjs` / `server/ids.mjs` |
| Agent traces | `getAgentTraces` 1241、`createAgentTrace` 1214、`reviewAgentTrace` 1284、`createAgentRun` 1359 | `server/services/agent-traces.mjs` |
| Object / scenarios | `getObjectInstances` 1421、`getAipScenarios` 1491、`runScenarioDiagnostic` 1526 | `server/services/object-risk.mjs` |
| Workbench modules | `getWorkbenchModules` 1614、`getWorkbenchModule` 1806 | `server/services/workbench-modules.mjs` |
| Risk / finance governance | `getRiskThresholdGovernance` 1875、`getFinanceCostGovernance` 2357 | `server/services/governance-packets.mjs` |
| Overview | `getOverview` 2701 | `server/services/overview.mjs` |
| Metrics / KPI | `getMetrics` 2850、`getMetricByRef` 2880、`getKpiTree` 4019、`getKpiGraph` 4059 | `server/services/metrics-kpi.mjs` |
| Knowledge / AI | `getAiKnowledgeEvidenceQualityReview` 3210、`localAiChat` 3595、`deepSeekAiChat`、`dryRunChatbi` 4216 | `server/services/knowledge-ai.mjs` |
| Decisions | `getRecommendationCards` 3363、`createRecommendationCard` 3388、`insertDecisionLog` 3515、`insertActionTask` 4579 | `server/services/decision-loop.mjs` |
| HTTP routes | dispatcher 4376-4564 | `server/routes/*.mjs` with same handlers |

## 7. PR 拆分顺序

| PR | Goal | 可改文件范围 | 验收 |
|---|---|---|---|
| T8-0 | Baseline only | none or docs-only | `check/build/smoke:readonly` green; record current screenshot/summary. |
| T8-1 | Extract shared frontend primitives | `src/main.tsx`、`src/api/client.ts`、`src/shared/**` | DOM/className 保持；`smoke:ui` full pass。 |
| T8-2 | Extract low-risk reference panels | `src/features/reference/**`、`src/features/ontology/**`、`src/features/metrics/**`、`src/main.tsx` | Tags/Dimensions/Metrics/Ontology screens pass; no API payload change。 |
| T8-3 | Extract KPI / lineage / overview panels | `src/features/kpi/**`、`src/features/lineage/**`、`src/features/overview/**`、`src/main.tsx` | Kpi canvas interaction and lineage screen pass。 |
| T8-4 | Extract risk / finance / runtime panels | `src/features/risk/**`、`src/features/finance/**`、`src/features/runtime/**`、`src/main.tsx` | Risk threshold, finance cost, runtime gate interactions pass。 |
| T8-5 | Extract knowledge / ChatBI / decision panels | `src/features/knowledge/**`、`src/features/chatbi/**`、`src/features/decision/**`、`src/main.tsx` | AI knowledge search, ChatBI dry-run trace, recommendation workflow, trace review pass。 |
| T8-6 | Extract backend DB adapter + read services | `server/index.mjs`、`server/db.mjs`、`server/services/**` | `smoke:api` and `smoke:readonly` payload counts unchanged。 |
| T8-7 | Extract backend route dispatcher | `server/index.mjs`、`server/routes/**` | All GET/POST routes preserved; `smoke:api/ui/readonly` full pass。 |

## 8. Behavior-Preservation Gates

Every T8 implementation PR must satisfy:

| Gate | Rule |
|---|---|
| Source boundary | One PR extracts one bounded group only. |
| API contract | Same endpoint path, method, status code, and JSON field shape. |
| UI contract | Same visible screens, interaction labels, class names unless explicitly reviewed. |
| Local DB | Only local SQLite; no production DB. |
| Provider | No provider call; DeepSeek missing-key gate must remain `providerCallAttempted=false` when key absent. |
| ERP | No ERP/OMS/WMS writeback. |
| Smoke cleanup | API/UI smoke local writes must be snapshot-restored before closeout. |
| Rollback | Revert the PR or restore pre-PR file snapshot; no cross-PR entanglement. |

## 9. Done Definition

B4 is complete when this blueprint exists, codebase-memory evidence is recorded, `aip_20260627_t8_codebase_memory_split_blueprint` is moved to `split_blueprint_ready`, and regression verifies the current behavior while `src/main.tsx` and `server/index.mjs` remain unchanged by this batch.
