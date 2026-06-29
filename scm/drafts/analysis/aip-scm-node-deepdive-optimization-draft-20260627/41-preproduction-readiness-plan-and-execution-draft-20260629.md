---
title: "Pre-production Readiness Plan and Execution Draft"
date: "2026-06-29"
status: "preprod_readiness_gate_verified_local_only"
scope: "First-principles plan and local execution for SCM read-only prototype production readiness"
debt_ids:
  - "release-readiness"
  - "T1"
  - "T2"
  - "T8"
depends_on:
  - "40-b29-t8-22-ai-knowledge-review-models-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  actionCeiling: "suggestion_review_replay"
---

# 上线生产环境前 readiness 计划与执行

## 1. 第一性原理定义

生产前的核心在于证明即将上线的 release 在目标边界内可运行、可回滚、可审计，而非把全部 backlog 清零。

本项目当前目标只允许 **read-only prototype production**：

| 问题 | 本轮判定 |
|---|---|
| 能否发布只读原型到生产环境 | 可以进入本地预生产合格态；仍需人工部署授权。 |
| 能否开放 provider call | 不能；`providerCalls=false`。 |
| 能否写生产库或 ERP/OMS/WMS | 不能；`productionWrites=false`、`erpWriteback=false`。 |
| 能否开放业务明细行 runtime import | 不能；需要单独审批与 owner gate。 |
| 能否把全部 SCM 指标当作 certified | 不能；当前 certified 20/178，Top-12 已坐实。 |

## 2. 上线前不变量

| 层 | 必须成立 | 检查方式 |
|---|---|---|
| 安全 | 仓库无 `*.pem`，SQLite 不含明显 key material | `preprod:check` + `find ... -name '*.pem'` |
| 数据可信 | certified metrics >=20，Top-12 lineage confidence >=0.8，active tags >=8 | SQLite read-only queries |
| 边界 | provider/writeback/production write 全关闭 | `preprod:check` + smoke outputs |
| 构建 | TypeScript 与 Vite build 通过，`public/` 被复制进 dist | `npm run check`、`npm run build` |
| 运行 | API health、readonly API、UI smoke 通过 | `smoke:api`、`smoke:readonly`、`smoke:ui` |
| 部署 | 生产 Compose 使用外部 SQLite volume 与 edge network | `docker-compose.production.yml` |
| 审计 | 本轮证据落本地 SQLite 与 Markdown | `annotation_preprod_readiness_gate_20260629`、本文件 |

## 3. 本轮完成项

| 输出 | 文件 / 记录 | 作用 |
|---|---|---|
| 生产 Compose override | `drafts/prototypes/scm-data-governance-workbench-v0/docker-compose.production.yml` | 固化外部 SQLite volume `scm_governance_workbench_scm-governance-data` 与 `lighthouse_ai_video_net`。 |
| 预生产检查脚本 | `drafts/prototypes/scm-data-governance-workbench-v0/scripts/preprod-check.mjs` | 只读检查构建产物、Compose 边界、SQLite 可信最低线、密钥扫描和 manual gates。 |
| npm 入口 | `preprod:check` | 统一上线前本地 gate。 |
| README 更新 | `README.md` | 将 `preprod:check` 加入本地验收与腾讯云部署命令。 |
| 部署说明更新 | `docs/tencent-cloud-lightserver-deployment-20260618.md` | 将生产命令从旧 tencent override 收敛到 `docker-compose.production.yml`。 |
| 预生产 JSON 证据 | `tmp/outputs/preprod-readiness-check-20260629.json` | 记录 hard blockers、manual gates、warnings 与核心计数。 |
| SQLite 证据 | `annotation_preprod_readiness_gate_20260629`、`decision_preprod_readiness_gate_20260629` | 本地 ledger 固化本轮验收。 |

## 4. preprod gate 结果

| 项 | 结果 |
|---|---|
| `readOnlyPrototypeProduction` | `true` |
| hard blockers | 0 |
| manual gates | 3 |
| warnings | 1 |
| certified metrics | 20 |
| certified lineage targets | 12 |
| active tags | 8 |
| recommendation cards | 15 |
| agent traces | 61 |
| non-seed object instances | 1 |
| DB secret pattern hits | 0 |
| `.pem` scan | 0 |

Manual gates 不阻塞只读原型发布，但阻塞任何 provider、生产写入、ERP/OMS/WMS 回写或业务明细行导入：

| gate | 当前值 | 处理方式 |
|---|---:|---|
| P0 owner sign-offs | 30 | 需要 owner 人工签字，不由代码补齐。 |
| P0 field mappings | 18 | 需要真实字段/owner 依据，不编造。 |
| SCEI weight source | 1 | 需要 owner 或方法论文档提供五维权重来源。 |
| dirty worktree warning | 52 | 发布前需做 atomic staging/branch/PR 或从干净 release worktree 打包。 |

## 5. 执行过的本地验收

| 检查项 | 结果 |
|---|---|
| `node --check scripts/preprod-check.mjs` | 通过 |
| `SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check` | 通过；hard blockers 0 |
| `npm run check` | 通过 |
| `npm run build` | 通过；46 modules transformed；JS `index-DnUoNKpW.js`；CSS `index-1sC8dsok.css` |
| `npm run smoke:api` | 通过；DeepSeek missing-key gate 保持 `providerCallAttempted=false` |
| `npm run smoke:readonly` | API smoke 后通过；边界仍为 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false` / `localSqliteWrites=false` |
| `npm run smoke:ui` | 通过；三档桌面视口和交互检查横向溢出 0，console/page 事件计数 0 |
| 恢复后最终 `npm run smoke:readonly` | 通过；recommendations 回到 15 |

Smoke 写入处理：

| artifact | 路径 |
|---|---|
| pre-smoke SQLite | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T121500-preprod-readiness-gate/governance_workbench.post-preprod-gate-pre-smoke.sqlite` |
| post-smoke SQLite | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T121500-preprod-readiness-gate/governance_workbench.post-smoke.sqlite` |
| final restored SQLite | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T121500-preprod-readiness-gate/governance_workbench.final-restored.sqlite` |
| UI smoke artifacts | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T121500-preprod-readiness-gate/ui-smoke-artifacts/` |

## 6. 上线前剩余动作

这些动作不应由本地代码自动完成：

| 剩余动作 | 类型 | 原因 |
|---|---|---|
| 人工确认密钥轮换 | security manual gate | 仓库无 `.pem` 只证明未检出，不能证明外部密钥已轮换。 |
| owner sign-off / field mapping / SCEI 权重来源 | business manual gate | 需要 owner 或真实来源，不能由 agent 编造。 |
| atomic staging / release branch / PR | release governance gate | 当前 worktree 有大量既有 dirty/untracked，发布前必须从干净边界打包。 |
| 生产部署授权 | operations manual gate | 本轮只做到本地 preprod 合格，不执行生产 sync。 |
| 生产只读 smoke | production read-only gate | 需在部署后用 `SCM_WORKBENCH_READONLY_BASE_URL=https://scm.lute-tlz-dddd.top npm run smoke:readonly` 验证。 |

## 7. 推荐上线命令序列

```bash
cd /Users/pray/project/ecom_ana_overview/scm/drafts/prototypes/scm-data-governance-workbench-v0
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check
SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5174 npm run smoke:api
SCM_WORKBENCH_READONLY_BASE_URL=http://127.0.0.1:5174 npm run smoke:readonly
SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5174 npm run smoke:ui
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml config
```

生产服务器执行前必须确认：

```bash
docker volume inspect scm_governance_workbench_scm-governance-data
docker network inspect lighthouse_ai_video_net
```

上线后只读验证：

```bash
SCM_WORKBENCH_READONLY_BASE_URL=https://scm.lute-tlz-dddd.top npm run smoke:readonly
curl -fsS https://scm.lute-tlz-dddd.top/api/deploy/health
curl -fsS -I https://scm.lute-tlz-dddd.top/fulfillment-dashboard/data/fulfillment_chart_data_binding_20260626.csv
```

## 8. 结论

事实：本地只读原型生产 readiness 的硬 gate 已通过，且 release boundary 明确保持 no provider / no production write / no ERP writeback。

推断：若目标是把当前工作台作为只读治理原型发布，当前代码与本地证据已具备进入人工发布审批的条件。

不确定项：真实生产环境外部 volume、edge network、当前线上版本和 owner 审批状态需要部署窗口或生产只读检查确认；本轮未执行生产 sync。
