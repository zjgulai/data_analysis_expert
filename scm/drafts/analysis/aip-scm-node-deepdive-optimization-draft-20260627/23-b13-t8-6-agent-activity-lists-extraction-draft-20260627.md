---
title: "B13 T8-6 Agent Activity Lists Extraction Draft"
date: "2026-06-27"
status: "agent_activity_lists_extracted_and_smoke_verified"
scope: "T8-6 behavior-preserving reusable activity list split"
debt_ids:
  - "T8"
depends_on:
  - "21-b11-t8-4-knowledge-sections-extraction-draft-20260627.md"
  - "22-b12-t8-5-object360-sections-extraction-draft-20260627.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B13 T8-6 复用活动列表抽取

## 1. 批次目标

B13 执行 T8-6：把 `AgentTraceList`、`AgentRunList`、`RecommendationCardList`、`SourceCoverageList` 从 `src/main.tsx` 移到 `src/panels/agentActivityLists.tsx`。本批只移动复用展示列表，并把 `sourceEvidenceTone` 移到 `src/shared/ui.tsx` 供多处共享；不移动 `DetailDrawer` 的本地写入表单，不移动 `ExportButton`，不改 `useApi` / `api`，不动服务端。

## 2. Codebase-Memory 依据

B13 开工前刷新 codebase-memory 索引：

| 项 | 值 |
|---|---:|
| project | `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` |
| nodes | 848 |
| edges | 1866 |

图谱判断：

| Symbol | 直接依赖 | 调用方 | B13 判断 |
|---|---|---|---|
| `AgentTraceList` | `Badge`、`humanizeOperationalLabel` | `Object360Section` | 可抽为证据链列表。 |
| `AgentRunList` | `Badge`、`RefPills`、`toneFromStatus`、`humanizeBoundary`、`humanizeOperationalLabel` | `AiKnowledgePanel`、`ChatBiDryRunResult`、`AipScenarioBoard`、`DecisionPanel`、`Object360Section`、`ObjectInstance360Section` | 多页面复用，适合独立模块。 |
| `RecommendationCardList` | `Badge`、`RefPills`、`toneFromStatus`、`humanizeOperationalLabel` | `CurrentRiskRadarPanel`、`DecisionPanel`、`Object360Section`、`ObjectInstance360Section` | 多页面复用，适合独立模块。 |
| `SourceCoverageList` | `Badge`、`RefPills`、`sourceEvidenceTone`、`humanizeOperationalLabel` | `Object360Section`、`ObjectInstance360Section` | 可抽为来源覆盖列表；`sourceEvidenceTone` 同步移入 shared。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 增加 activity lists imports；删除本地四个列表定义和本地 `sourceEvidenceTone`。 |
| `src/panels/agentActivityLists.tsx` | 新增四个复用列表组件和对应结构类型。 |
| `src/panels/object360Sections.tsx` | 直接导入复用列表与 `Object360List`，移除 renderer props。 |
| `src/shared/ui.tsx` | 新增共享 `sourceEvidenceTone`。 |
| `src/panels/detailPrimitives.tsx` | 本批不编辑。 |
| `src/panels/knowledgeSections.tsx` | 本批不编辑。 |
| `src/panels/catalogPanels.tsx` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/agentActivityLists.tsx` | `AgentTraceList` | 对象 360 的关联证据链迷你列表。 |
| `src/panels/agentActivityLists.tsx` | `AgentRunList` | AI 知识、ChatBI、场景诊断、决策台账共用的运行记录卡片。 |
| `src/panels/agentActivityLists.tsx` | `RecommendationCardList` | 风险雷达、决策闭环、对象 360 共用的建议卡列表。 |
| `src/panels/agentActivityLists.tsx` | `SourceCoverageList` | 对象 360 与实例 360 共用的来源覆盖列表。 |
| `src/shared/ui.tsx` | `sourceEvidenceTone` | 来源证据等级到 badge tone 的共享映射。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `DetailDrawer` | 含注解、评论、修订建议提交，属于本地写入 UI，单独成批。 |
| `ExportButton` | 含导出 POST 链路，单独成批。 |
| `AssetTable` | 连接详情抽屉和导出动作，需单独验收。 |
| `TraceReviewBoard` / `AgentTracePanel` | 证据链复盘面板仍含复盘按钮，留到后续行为边界批次。 |
| `useApi` / `api` | 数据 hook 与请求状态后续单独处理。 |
| `server/index.mjs` | 后端拆分留到 T8-7。 |

## 6. 行数变化

| 文件 | B12 后 | B13 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 6323 | 6127 | -196 |
| `src/panels/agentActivityLists.tsx` | 0 | 264 | +264 |
| `src/panels/object360Sections.tsx` | 308 | 213 | -95 |
| `src/shared/ui.tsx` | 359 | 365 | +6 |

## 7. 边界不变量

| 不变量 | B13 状态 |
|---|---|
| `productionWrites` | `false` |
| `providerCalls` | `false` |
| `erpWriteback` | `false` |
| action ceiling | `suggestion_review_replay` |
| 唯一写目标 | 本地 `data/governance_workbench.sqlite` |
| 密钥扫描 | `find ... -name '*.pem'` 输出为空 |

## 8. 回归脚本

```bash
npm run check
npm run build
npm run smoke:api
npm run smoke:readonly
npm run smoke:ui
```

smoke 产生的本地 SQLite 变化必须归档后恢复，最终以恢复后的 `smoke:readonly` 作为收口证据。

## 9. 本批验收记录

| 检查项 | 结果 |
|---|---|
| `git diff --check -- src/main.tsx src/panels/agentActivityLists.tsx src/panels/object360Sections.tsx src/shared/ui.tsx` | 通过 |
| `npm run check` | 通过 |
| `npm run build` | 通过 |
| `npm run smoke:api` | 通过；provider gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | 通过；`productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三视口横向溢出为 0，console/page 事件计数为 0 |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T230000-b13-t8-6-agent-activity-lists/ui-smoke-artifacts/ui-smoke-2026-06-27T15-19-40-731Z/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T230000-b13-t8-6-agent-activity-lists/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260627T230000-b13-t8-6-agent-activity-lists/governance_workbench.post-b13-pre-smoke.sqlite` |
| SQLite 记录 | `annotation_b13_t8_6_agent_activity_lists_20260627`、`decision_b13_t8_6_agent_activity_lists_20260627` |

## 10. 下一批建议

B14 执行 T8-7：按图谱处理 `AssetTable` 与 `DetailDrawer` 的分层边界，先把只读 shell 与本地写入表单拆开；继续暂缓 `ExportButton` 导出链路和 `server/index.mjs`。
