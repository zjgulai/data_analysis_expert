---
title: "B29 T8-22 AI Knowledge Review Models Draft"
date: "2026-06-29"
status: "ai_knowledge_review_models_extracted_and_smoke_verified"
scope: "T8-22 behavior-preserving AI knowledge quality review model and request payload extraction"
debt_ids:
  - "T8"
depends_on:
  - "39-b28-t8-21-role-workbench-models-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  actionCeiling: "suggestion_review_replay"
---

# B29 T8-22 AI 知识质量复核模型抽取

## 1. 批次目标

B29 继续 T8 巨石拆分。B28 之后图谱显示 `RoleWorkbenchesPanel` 仍绑定 `useApi`、财务治理 panel、shared UI 和多条 mutation handlers，因此本批不整块移动该面板，转向 `AI Knowledge Quality Review` 中更稳的纯类型与请求体构造。

本批只把 AI 知识质量复核的类型、空 payload factory、DecisionLog request builder 从 `src/main.tsx` 抽出。API POST、busy/receipt/error 状态、UI 按钮行为和 server 路由保持原位。

## 2. Codebase-Memory 依据

| 阶段 | nodes | edges |
|---|---:|---:|
| B28 抽取后 | 908 | 2017 |
| B29 抽取后 | 912 | 2029 |

抽取后图谱确认：

| Symbol | 调用方 / 使用方 | B29 判断 |
|---|---|---|
| `buildAiKnowledgeQualityReviewDecisionLog` | `recordAiKnowledgeQualityReview` | 纯请求体 builder，可独立于 API POST。 |
| `createEmptyAiKnowledgeQualityReviewPayload` | `AiKnowledgePanel` | 纯 fallback 数据，替代主文件内联对象。 |
| `AiKnowledgeQualityReviewPacket` | `AiKnowledgePanel` / builder | 纯类型，可移动到 model 文件。 |
| `AiKnowledgePanel` | `App` | 仍持有检索、local chat、DeepSeek gate、质量复核状态，暂不移动。 |

## 3. 文件范围

| 文件 | 本批处理 |
|---|---|
| `src/main.tsx` | 删除原地 AI 知识质量复核类型和 fallback 对象；`recordAiKnowledgeQualityReview` 改为调用 builder。 |
| `src/panels/aiKnowledgeReviewModels.ts` | 新增 AI 知识质量复核类型、空 payload factory 和 request payload builder。 |
| `src/panels/governanceReviewPayloads.ts` | 本批不编辑。 |
| `server/index.mjs` | 本批不编辑。 |
| `data/governance_workbench.sqlite` | 只写本地治理记录与验收证据。 |

## 4. 抽取清单

| 新位置 | Symbol | 说明 |
|---|---|---|
| `src/panels/aiKnowledgeReviewModels.ts` | `AiKnowledgeQualityReviewPacket` | AI 知识质量复核包类型。 |
| `src/panels/aiKnowledgeReviewModels.ts` | `AiKnowledgeQualityReviewPayload` | `/api/knowledge/evidence-quality-review` payload 类型。 |
| `src/panels/aiKnowledgeReviewModels.ts` | `createEmptyAiKnowledgeQualityReviewPayload` | `useApi` fallback 数据，保持边界默认值。 |
| `src/panels/aiKnowledgeReviewModels.ts` | `buildAiKnowledgeQualityReviewDecisionLog` | 本地 decision log request payload builder。 |

## 5. 明确延后

| Symbol / Area | 延后原因 |
|---|---|
| `recordAiKnowledgeQualityReview` | 仍持有 API POST、qualityBusy、qualityReceipt、refresh 与 error 状态，暂不移动。 |
| `AiKnowledgePanel` | 同时编排知识检索、本地 chat、DeepSeek gate、证据卡 drawer 和质量复核，需后续单独按图谱拆。 |
| `RuntimeBusinessRowDesignGatePanel` | 本批未触碰；可作为 B30 备选纯 builder/类型抽取点。 |

## 6. 行数变化

| 文件 | B28 后 | B29 后 | 变化 |
|---|---:|---:|---:|
| `src/main.tsx` | 3858 | 3768 | -90 |
| `src/panels/aiKnowledgeReviewModels.ts` | 0 | 111 | +111 |
| `src/panels/roleWorkbenchModels.ts` | 113 | 113 | 0 |
| `src/panels/governanceReviewPayloads.ts` | 107 | 107 | 0 |

## 7. 边界不变量

| 不变量 | B29 状态 |
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

`smoke:api` 和 `smoke:ui` 需要本地 API server 监听 `127.0.0.1:5174`。本机缺少 Playwright Chromium runtime 时，先执行：

```bash
npx playwright install chromium
```

## 9. 本批验收记录

| 检查项 | 结果 |
|---|---|
| `npm run check` | 通过 |
| `npm run build` | 通过；46 modules transformed；JS 产物 `index-DnUoNKpW.js`；CSS 产物 `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；`ai-knowledge-quality-review-pack` 返回 4 个 review packets，`providerCalls=false`；DeepSeek missing-key gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | API smoke 后通过；临时 recommendations 为 16，边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三档桌面视口横向溢出为 0，console/page 事件计数为 0；输出归档到 file-history |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15，`localSqliteWrites=false` |
| UI 产物归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T030000-b29-t8-22-ai-knowledge-review-models/ui-smoke-artifacts/` |
| SQLite smoke 归档 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T030000-b29-t8-22-ai-knowledge-review-models/governance_workbench.post-smoke.sqlite` |
| SQLite 恢复源 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T030000-b29-t8-22-ai-knowledge-review-models/governance_workbench.post-b29-pre-smoke.sqlite` |
| SQLite 最终恢复态 | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T030000-b29-t8-22-ai-knowledge-review-models/governance_workbench.final-restored.sqlite` |
| SQLite 最终计数 | `recommendation_cards=15`、`agent_traces=61`、`agent_runs=81`、`action_tasks=15`、`decision_logs=151`、`trace_reviews=13`、`annotations=34` |
| SQLite 记录 | `annotation_b29_t8_22_ai_knowledge_review_models_20260629`、`decision_b29_t8_22_ai_knowledge_review_models_20260629` |

## 10. 下一批建议

B30 继续 T8：优先抽 `RuntimeBusinessRowDesign` 的类型、空 payload factory 与 `recordRuntimeBusinessDesignChoice` request builder；该路径同样是纯数据构造，风险低于移动 `AiKnowledgePanel` 或 `RoleWorkbenchesPanel` 本体。
