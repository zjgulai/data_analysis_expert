---
title: "Release PR Staging Checklist Draft"
date: "2026-06-29"
status: "staging_plan_ready_not_staged"
batch: "B42-13/B42-14/B42-15/B42-16"
scope: "Atomic staging map, PR checklist, risk note, and approval prompt for SCM read-only prototype RC"
depends_on:
  - "43-release-candidate-dirty-worktree-manifest-draft-20260629.md"
  - "44-release-candidate-file-set-and-manifest-draft-20260629.md"
  - "45-manual-gate-packets-and-ledger-draft-20260629.md"
  - "46-production-readonly-handoff-runbook-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  actionCeiling: "suggestion_review_replay"
---

# B42-13/B42-16 Release PR Staging Checklist

## 1. PR 原则

事实：当前 worktree 仍在 `main`，本轮没有 stage、commit、push、PR。dirty worktree 中有 RC 相关文件，也有明显不相关删除项。

推断：若进入 PR，应先建 `codex/scm-readonly-rc-governance-20260629` 之类分支，再按白名单 staging；不得用 `git add .`。

不确定项：是否以一个 RC PR 收敛，还是拆成 docs/evidence/runtime 多个 PR，需要人工选择。

## 2. Atomic Staging Map

推荐拆成四个 staging chunk：

### Chunk A: Governance docs

```bash
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/00-index-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/01-engineering-debt-and-fragility-audit-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/02-tag-engineering-deepdive-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/03-metric-engineering-deepdive-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/04-metric-system-deepdive-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/05-insight-storyline-deepdive-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/06-palantir-core-aip-deepdive-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/07-cross-audit-and-mece-register-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/08-codebase-memory-mcp-install-plan-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/09-codex-execution-handoff-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/10-current-product-state-execution-register-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/11-b1-boundary-enum-normalization-plan-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/12-b2-scei-weight-source-decision-package-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/13-b3-t7-additive-migration-plan-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/14-b4-t8-codebase-memory-split-blueprint-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/15-b5-rbac-action-tiering-model-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/16-b6-rbac-additive-migration-review-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/17-b7-t8-baseline-package-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/18-b8-t8-1-shared-ui-primitives-extraction-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/19-b9-t8-2-catalog-panels-extraction-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/20-b10-t8-3-detail-primitives-extraction-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/21-b11-t8-4-knowledge-sections-extraction-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/22-b12-t8-5-object360-sections-extraction-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/23-b13-t8-6-agent-activity-lists-extraction-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/24-b14-t8-7-detail-drawer-sections-extraction-draft-20260627.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/25-b15-t8-8-export-controls-extraction-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/26-b16-t8-9-asset-table-extraction-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/27-b17-t8-10-detail-drawer-boundary-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/28-b18-t8-11-trace-review-panels-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/29-b19-t8-12-decision-ledger-panels-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/30-b20-t8-13-decision-inbox-panels-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/31-b20-worktree-ownership-cleanup-register-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/32-b21-t8-14-scenario-board-panels-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/33-b22-t8-15-decision-governance-panels-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/34-b23-t8-16-decision-loop-models-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/35-b24-t8-17-decision-static-models-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/36-b25-t8-18-governance-models-draft-20260628.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/37-b26-t8-19-governance-panels-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/38-b27-t8-20-governance-review-payloads-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/39-b28-t8-21-role-workbench-models-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/40-b29-t8-22-ai-knowledge-review-models-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/41-preproduction-readiness-plan-and-execution-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/42-release-candidate-governance-plan-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/43-release-candidate-dirty-worktree-manifest-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/44-release-candidate-file-set-and-manifest-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/45-manual-gate-packets-and-ledger-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/46-production-readonly-handoff-runbook-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/47-release-pr-staging-checklist-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/48-release-candidate-governance-execution-summary-draft-20260629.md
git add scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/49-release-branch-staging-execution-summary-draft-20260629.md
```

### Chunk B: Prototype runtime and validation

```bash
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/.gitignore
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/.cbmignore
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/Dockerfile
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/README.md
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/index.html
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/tsconfig.json
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/vite.config.ts
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/package.json
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/package-lock.json
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/server/index.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/src/main.tsx
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/src/styles.css
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/src/shared/ui.tsx
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/src/panels
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/import-assets.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/preprod-check.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/smoke-api.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/smoke-database-gate.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/smoke-import-gate.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/smoke-path-contract.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/smoke-provider-gate.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/smoke-readonly.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/scripts/smoke-ui.mjs
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/docker-compose.yml
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/docker-compose.production.yml
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/docs/tencent-cloud-lightserver-deployment-20260618.md
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/docs/fulfillment-dashboard-aip-scm-integration-plan-draft-20260626.md
```

### Chunk C: Local SQLite/data/evidence

```bash
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/data/governance_workbench.sqlite
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/data/import-summary.json
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/data/runtime-metadata-projection.json
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-handoff-20260629.csv
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-owner-rollup-20260629.csv
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-owner-signoff-intake-20260629.csv
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-field-mapping-intake-20260629.csv
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-scei-weight-intake-20260629.csv
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/migrations
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/public/fulfillment-dashboard
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/runtime/evidence/ai-knowledge-evidence-quality-review-20260622.json
git add scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/preprod-readiness-check-20260629.json
git add scm/tmp/outputs/t2-metric-certification-evidence-20260627.json
git add scm/tmp/outputs/t3-tag-certification-evidence-20260627.json
git add scm/tmp/outputs/t4-kpi-tree-weight-evidence-20260627.json
git add scm/tmp/outputs/t5-t6-storyline-closure-evidence-20260627.json
git add scm/tmp/outputs/t5-t6-storyline-closure-evidence-r2-20260627.json
git add scm/tmp/outputs/ai-knowledge-evidence-quality-review-20260622.json
```

### Chunk D: Explicit hold-out

不要 stage：

```bash
# Do not stage unrelated deletes or unknown files.
# No git add for knowledge_base/data_ability/**
# No git add for drafts/analysis/*.baiduyun.uploading.cfg
# No git add for scm/drafts/docs/*.baiduyun.uploading.cfg
# No git add for scm/system_data/**
# No git add for scm/tmp/outputs/*20260604*
# No git add for scm/tmp/scripts/*20260604*
# No git add for scm/skills-lock.json unless separate infra approval exists.
```

## 3. PR Checklist

在任何 PR 前必须重新跑：

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
cd "$SCM_REPO_ROOT"
git diff --check -- scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627
git status --short -uall
```

`smoke:api` 与 `smoke:ui` 是写入型本地 smoke，只能在 loopback 可丢弃 SQLite 副本上执行并恢复 hash；完整 clean-checkout CI 会执行该生命周期。`smoke:readonly` 需先启动默认只读 server。

PR body 必须包含：

| section | required content |
|---|---|
| Boundary | `productionWrites=false`, `providerCalls=false`, `erpWriteback=false`, action ceiling `suggestion_review_replay`。 |
| Evidence | check/build/preprod/smoke command output timestamps。 |
| Manual gates | owner signoff 30, field mapping 18, SCEI weight source 1 remain manual. |
| Release scope | included/excluded file sets from 43/44。 |
| Rollback | compose rollback and SQLite volume rule from 46。 |
| Non-goals | no provider, no production write, no ERP/OMS/WMS writeback, no live import。 |

## 4. Risk Note

| risk | status | mitigation |
|---|---|---|
| Dirty worktree unrelated deletes | active | Hold-out list; no `git add .`。 |
| Main branch current worktree | active | Create `codex/` branch before staging, or use clean release worktree after manifest review。 |
| Manual gates pending | active | PR can be RC governance/read-only only; cannot claim full business certification。 |
| SQLite binary diff large | active | Include restore snapshot/evidence; verify DB secret scan and counts。 |
| Provider/writeback accidental enablement | active | Preprod and PR body must list false boundary; no live smoke env vars。 |

## 5. Approval Prompt

人工需要选择下一步：

| option | action | consequence |
|---|---|---|
| A | 进入 RC PR 准备 | 创建 `codex/scm-readonly-rc-governance-20260629`，按 Chunk A/B/C staging；D 保持 hold-out。 |
| B | 先清 manual gates | 不创建 RC PR，先收 owner signoff、field mapping、SCEI 权重。 |
| C | 暂停并清理 worktree | 不动 RC，先处理 unrelated deletes/unknown dirty。 |

推荐：A，但 PR 标题和 body 必须写明 manual gates 未解除、production 未部署。

## 6. B42-13/B42-16 Done Criteria

| criteria | status |
|---|---|
| atomic staging map 已生成 | done |
| PR checklist 已生成 | done |
| risk note 已生成 | done |
| approval prompt 已生成 | done |
| 本轮未 stage/commit | done |
