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

| group | paths | purpose | evidence | rollback note | verification |
|---|---|---|---|---|---|
| package contract | `drafts/prototypes/scm-data-governance-workbench-v0/package.json`、`package-lock.json` | 固化 scripts/deps。 | `preprod-readiness-check-20260629.json` package-script checks。 | 回滚到上一 package lock。 | `npm run check && npm run build` |
| runtime server | `drafts/prototypes/scm-data-governance-workbench-v0/server/index.mjs` | API、deploy health、readonly endpoints、local SQLite reads。 | `smoke:api`、`smoke:readonly` 历史通过。 | 回滚 server 文件或容器镜像。 | `npm run smoke:api && npm run smoke:readonly` |
| frontend | `drafts/prototypes/scm-data-governance-workbench-v0/src/main.tsx`、`src/styles.css`、`src/panels/`、`src/shared/` | SCM workbench UI 与 T8 分块后模块。 | `npm run check`、`npm run smoke:ui` 历史通过。 | 回滚 UI source；dist 重新 build。 | `npm run check && npm run build && npm run smoke:ui` |
| validation scripts | `scripts/preprod-check.mjs`、`scripts/smoke-api.mjs`、`scripts/smoke-readonly.mjs`、`scripts/smoke-ui.mjs` | 本地 gate 和 smoke。 | preprod hard blockers 0。 | 回滚 scripts；保留旧 smoke。 | `npm run preprod:check` |
| deployment | `Dockerfile`、`docker-compose.yml`、`docker-compose.production.yml` | 容器构建、外部 SQLite volume、edge network。 | preprod checks: external volume and edge network true。 | compose rollback 到上一 override；不覆盖 volume。 | `docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml config` |
| local data pack | `data/governance_workbench.sqlite`、`data/import-summary.json`、`data/runtime-metadata-projection.json` | 本地 SQLite truth/evidence/runtime projection。 | certified metrics 20、lineage targets 12、active tags 8。 | 使用 file-history SQLite snapshot restore；禁止生产库覆盖。 | SQLite read-only queries + `preprod:check` |
| migrations | `migrations/20260627_b3_t7_additive_schema.*.sql`、`migrations/20260627_b6_rbac_action_tiering.*.sql` | additive schema/rollback evidence。 | T7/RBAC execution docs。 | 使用 paired rollback SQL。 | `sqlite3 ...` schema inspection, no production DB |
| static fulfillment dashboard | `public/fulfillment-dashboard/` | 只读 CSV dashboard and docs。 | CSV HEAD and build copy checks。 | Remove static folder from deployed image. | `npm run build`; post-deploy `curl -I ...csv` |
| docs | `README.md`、`docs/tencent-cloud-lightserver-deployment-20260618.md`、`docs/fulfillment-dashboard-aip-scm-integration-plan-draft-20260626.md` | local acceptance and production read-only handoff instructions。 | 41/42/43 plan chain。 | docs-only revert。 | markdown review + commands below |

## 3. RC 证据包

| group | paths | purpose |
|---|---|---|
| deepdive analysis | `drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/00-*.md` to `42-*.md` | 从 03 指标工程到 preprod readiness 的审计/执行链。 |
| B42 execution docs | `43-release-candidate-dirty-worktree-manifest-draft-20260629.md` to `47-release-pr-staging-checklist-draft-20260629.md` | release governance pack。 |
| local evidence JSON | `drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/preprod-readiness-check-20260629.json` | preprod gate machine-readable evidence。 |
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
cd /Users/pray/project/ecom_ana_overview/scm/drafts/prototypes/scm-data-governance-workbench-v0
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check
npm run smoke:api
npm run smoke:readonly
npm run smoke:ui
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml config
find /Users/pray/project/ecom_ana_overview/scm -name '*.pem' -print
```

## 7. B42-2/B42-3/B42-4 Done Criteria

| criteria | status |
|---|---|
| RC 必含/证据/排除集合已定义 | done |
| 每个关键组有 purpose/evidence/rollback/verification | done |
| freeze rule 已定义 | done |
| 未执行 staging/commit/deploy | done |
