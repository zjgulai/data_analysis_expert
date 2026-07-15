---
title: "Release Candidate File Set and Manifest Draft"
date: "2026-06-29"
status: "executed_local_manifest"
batch: "B42-2/B42-3/B42-4"
scope: "SCM read-only prototype release candidate file set, manifest, and freeze rule"
depends_on:
  - "43-release-candidate-dirty-worktree-manifest-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  actionCeiling: "suggestion_review_replay"
---

# B42-2/B42-3/B42-4 Release Candidate Manifest

## 1. Release Candidate 定义

事实：上一批 `preprod:check` 输出 `readOnlyPrototypeProduction=true`、hard blockers `0`、manual gates `3`。本批 RC 只覆盖本地 SQLite 支撑的只读治理原型。

推断：RC 的最小可发布单元是 prototype runtime + local SQLite data pack + validation scripts + deployment docs + governance evidence，而非整个 dirty worktree。

不确定项：生产部署窗口、线上 volume/network 当前状态、owner manual gates 仍需人工确认。

## 2. RC 必含文件集合

本节路径均相对 `$SCM_REPO_ROOT/scm`；命令从 Git 仓库根目录动态解析 `$SCM_REPO_ROOT`，不依赖开发机绝对路径。

| group | paths | purpose | evidence | rollback note | verification |
|---|---|---|---|---|---|
| package/build contract | `drafts/prototypes/scm-data-governance-workbench-v0/package.json`、`package-lock.json`、`index.html`、`tsconfig.json`、`vite.config.ts` | 固化 scripts/deps 与可复现前端构建入口。 | `preprod-readiness-check-20260629.json` package-script checks。 | 回滚到上一 package/build contract。 | `npm run check && npm run build` |
| runtime server | `drafts/prototypes/scm-data-governance-workbench-v0/server/index.mjs` | API、deploy health、readonly endpoints、local SQLite reads。 | `smoke:api`、`smoke:readonly` 历史通过。 | 回滚 server 文件或容器镜像。 | `npm run smoke:api && npm run smoke:readonly` |
| frontend | `drafts/prototypes/scm-data-governance-workbench-v0/src/main.tsx`、`src/styles.css`、`src/panels/`、`src/shared/` | SCM workbench UI 与 T8 分块后模块。 | `npm run check`、`npm run smoke:ui` 历史通过。 | 回滚 UI source；dist 重新 build。 | `npm run check && npm run build && npm run smoke:ui` |
| validation scripts | `scripts/preprod-check.mjs`、`scripts/smoke-api.mjs`、`scripts/smoke-database-gate.mjs`、`scripts/smoke-import-gate.mjs`、`scripts/smoke-path-contract.mjs`、`scripts/smoke-provider-gate.mjs`、`scripts/smoke-readonly.mjs`、`scripts/smoke-ui.mjs` | 本地 gate 和 smoke。 | preprod hard blockers 0。 | 回滚 scripts；保留旧 smoke。 | `npm run preprod:check` |
| deployment | `Dockerfile`、`docker-compose.yml`、`docker-compose.production.yml` | 容器构建、外部 SQLite volume、edge network。 | preprod checks: external volume and edge network true。 | compose rollback 到上一 override；不覆盖 volume。 | `docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml config` |
| local data pack | `data/governance_workbench.sqlite`、`data/import-summary.json`、`data/runtime-metadata-projection.json` | 本地 SQLite truth/evidence/runtime projection。 | certified metrics 20、lineage targets 12、active tags 8。 | 使用已记录 hash 的 SQLite snapshot restore；禁止生产库覆盖。 | SQLite read-only queries + `preprod:check` |
| immutable runtime evidence | `runtime/evidence/ai-knowledge-evidence-quality-review-20260622.json` | standalone/container 不依赖可变 `/app/data` volume 即可读取证据。 | `smoke:path-contract` 与 preprod runtime-evidence checks。 | 回滚到上一已校验 evidence artifact。 | `npm run smoke:path-contract` |
| manual-gate handoff | `data/manual-gate-handoff-20260629.csv`、`data/manual-gate-owner-rollup-20260629.csv`、`data/manual-gate-owner-signoff-intake-20260629.csv`、`data/manual-gate-field-mapping-intake-20260629.csv`、`data/manual-gate-scei-weight-intake-20260629.csv` 与对应 SQLite governance task evidence | 只记录待人工确认的 owner/mapping/SCEI intake，不代表 gate 已通过。 | 45/50/51 handoff docs + preprod manual gates。 | 删除错误 intake 行或恢复上一只读数据包；不得伪造 sign-off。 | `npm run preprod:check`，预期 manual gates 保留 |
| migrations | `migrations/20260627_b3_t7_additive_schema.*.sql`、`migrations/20260627_b6_rbac_action_tiering.*.sql` | additive schema/rollback evidence。 | T7/RBAC execution docs。 | 使用 paired rollback SQL。 | `sqlite3 ...` schema inspection, no production DB |
| static fulfillment dashboard | `public/fulfillment-dashboard/` | 只读 CSV dashboard and docs。 | CSV HEAD and build copy checks。 | Remove static folder from deployed image. | `npm run build`; post-deploy `curl -I ...csv` |
| docs | `README.md`、`docs/tencent-cloud-lightserver-deployment-20260618.md`、`docs/fulfillment-dashboard-aip-scm-integration-plan-draft-20260626.md` | local acceptance and production read-only handoff instructions。 | 41/42/43 plan chain。 | docs-only revert。 | markdown review + commands below |

## 3. RC 证据包

| group | paths | purpose |
|---|---|---|
| deepdive analysis | `drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/00-*.md` to `42-*.md` | 从 03 指标工程到 preprod readiness 的审计/执行链。 |
| B42 execution docs | `43-release-candidate-dirty-worktree-manifest-draft-20260629.md` to `47-release-pr-staging-checklist-draft-20260629.md` | release governance pack。 |
| local evidence JSON | `drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/preprod-readiness-check-20260629.json` | preprod gate machine-readable evidence。 |
| immutable runtime evidence | `drafts/prototypes/scm-data-governance-workbench-v0/runtime/evidence/ai-knowledge-evidence-quality-review-20260622.json` | standalone/container runtime evidence。 |
| manual-gate handoff | `drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-*.csv` 与 `data/governance_workbench.sqlite` 中对应 governance tasks | owner/mapping/SCEI 仍为 pending 的交接证据；不构成业务认证。 |
| historical evidence JSON | `tmp/outputs/t2-*.json`、`tmp/outputs/t3-*.json`、`tmp/outputs/t4-*.json`、`tmp/outputs/t5-t6-*.json`、`tmp/outputs/ai-knowledge-evidence-quality-review-20260622.json` | metric/tag/tree/storyline/AI quality evidence。 |

## 4. RC 排除集合

| paths | reason |
|---|---|
| `../knowledge_base/data_ability/**` deleted files | 大型二进制删除，与 read-only prototype RC 无关。 |
| `../drafts/analysis/*.baiduyun.uploading.cfg`、`drafts/docs/*.baiduyun.uploading.cfg`、`system_data/.*.baiduyun.uploading.cfg` | 上传中间态/旧删除，不能混入 RC。 |
| `system_data/库存指标说明.md` | 未证明属于本 RC。 |
| `tmp/outputs/alidocs-*20260604*`、`tmp/outputs/jijia-*20260604*`、`tmp/scripts/*20260604.mjs` | 旧 extraction artifacts，非本 RC runtime/evidence。 |
| `skills-lock.json` | 与 release runtime 的关系不明；需单独 infra PR。 |
| provider live smoke artifacts | 本 RC 不开放 provider call。 |

## 5. Freeze Rule

发布前默认冻结新增业务行为与继续 T8 拆分：

1. 允许：readiness docs、manual gate packets、release manifest、runbook、smoke/check 修正。
2. 暂停：新的 UI 行为、server endpoint 行为变更、继续拆大模块。
3. 禁止：生产写、ERP/OMS/WMS 写回、provider call、真实生产 DB 连接。
4. 若必须改代码，只能修复 release verification 的明确失败，并在 PR 中写明失败证据和最小修复范围。

## 6. RC 验收命令

```bash
export SCM_REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$SCM_REPO_ROOT/scm/drafts/prototypes/scm-data-governance-workbench-v0"
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="$SCM_REPO_ROOT/scm" npm run preprod:check
npm run smoke:provider-gate
npm run smoke:database-gate
npm run smoke:import-gate
npm run smoke:path-contract
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml config
test -z "$(rg --files "$SCM_REPO_ROOT/scm" -g '*.pem' -g '*.key')"
```

`smoke:readonly` 需启动默认只读本地 server；`smoke:api` 与 `smoke:ui` 只允许由 CI 或 README 所述的可丢弃 SQLite 副本流程执行，并在结束后恢复、核对原始 hash。

## 7. B42-2/B42-3/B42-4 Done Criteria

| criteria | status |
|---|---|
| RC 必含/证据/排除集合已定义 | done |
| 每个关键组有 purpose/evidence/rollback/verification | done |
| freeze rule 已定义 | done |
| 未执行 staging/commit/deploy | done |
