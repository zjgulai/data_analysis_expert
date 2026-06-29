---
title: "Release Branch Staging Execution Summary Draft"
date: "2026-06-29"
status: "branch_committed_pushed_pr_open_local_only"
batch: "B42-branch-staging"
scope: "Execution summary for creating the SCM read-only RC branch and staging only approved release candidate paths"
depends_on:
  - "47-release-pr-staging-checklist-draft-20260629.md"
  - "48-release-candidate-governance-execution-summary-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  actionCeiling: "suggestion_review_replay"
---

# Release Branch Staging Execution Summary

## 1. Scope

This document records the local git branch and index preparation step after B42 governance verification.

| item | value |
|---|---|
| branch | `codex/scm-readonly-rc-governance-20260629` |
| source branch | `main` |
| staging rule | Chunk A/B/C allowlist from `47-release-pr-staging-checklist-draft-20260629.md` |
| hold-out rule | Chunk D stays unstaged |
| commit status | committed: `5a1a21b chore(scm): prepare read-only RC governance pack` |
| push / PR status | pushed to `origin/codex/scm-readonly-rc-governance-20260629`; PR #1 open |
| staged path count | 112 |
| PR URL | `https://github.com/zjgulai/data_analysis_expert/pull/1` |

## 2. Staged Scope

The intended staged scope is:

1. Governance docs `00` through `49` under `drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/`.
2. Prototype runtime and validation files under `drafts/prototypes/scm-data-governance-workbench-v0/`.
3. Local SQLite/data/evidence paths explicitly listed in Chunk C.

## 3. Hold-out Scope

The following stay outside the release candidate index:

| path class | reason |
|---|---|
| `knowledge_base/data_ability/**` deleted binaries | unrelated high-risk deletion |
| `*.baiduyun.uploading.cfg` deletions | upload intermediate cleanup, unrelated to RC |
| `system_data/**` | source-data area, no RC ownership proof |
| `tmp/outputs/*20260604*` and `tmp/scripts/*20260604*` | old extraction artifacts |
| `skills-lock.json` | separate infra-governance candidate |

## 4. Verification Plan

After staging, verify:

```bash
git status --short
git diff --cached --name-status
git diff --check
find /Users/pray/project/ecom_ana_overview/scm -name '*.pem' -print
```

Then rerun prototype gates before any commit:

```bash
cd /Users/pray/project/ecom_ana_overview/scm/drafts/prototypes/scm-data-governance-workbench-v0
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check
```

## 5. Verification Result

| check | result |
|---|---|
| `git diff --cached --check` | passed |
| `git diff --check` | passed |
| staged hold-out scan | passed, no blocked path classes staged |
| `.pem` scan | passed, 0 hits |
| `npm run check` | passed |
| `npm run build` | passed, 46 modules transformed |
| `SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check` | passed, hard blockers 0 |
| `SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5185 npm run smoke:api` | passed, provider call attempted false |
| `SCM_WORKBENCH_READONLY_BASE_URL=http://127.0.0.1:5185 npm run smoke:readonly` | passed after SQLite restore, recommendations 15 |
| `SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5185 SCM_UI_SMOKE_OUTPUT_DIR=... npm run smoke:ui` | passed, console/page errors 0 |

## 6. Backup Artifacts

| artifact | path |
|---|---|
| before smoke SQLite | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T174500-rc-branch-staging/governance_workbench.before-staging-smoke.sqlite` |
| after smoke SQLite | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T174500-rc-branch-staging/governance_workbench.after-staging-smoke.sqlite` |
| final restored SQLite | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T174500-rc-branch-staging/governance_workbench.final-restored.sqlite` |
| final preprod JSON | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T174500-rc-branch-staging/preprod-readiness-check.final-after-staging.json` |
| UI smoke artifacts | `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T174500-rc-branch-staging/ui-smoke-artifacts/` |

## 7. Remaining Gates

| gate | status |
|---|---|
| P0 owner sign-off | 30 remain manual |
| P0 field mapping | 18 remain manual |
| SCEI weight source | 1 owner decision packet remains manual |
| production deployment | not executed |
| provider call | not executed |
| ERP/OMS/WMS writeback | not executed |

## 8. Current Remote Status

| item | value |
|---|---|
| PR | `https://github.com/zjgulai/data_analysis_expert/pull/1` |
| base | `main` |
| head | `codex/scm-readonly-rc-governance-20260629` |
| draft | `false` |
| state | `OPEN` |
| mergeable | `MERGEABLE` |
| status checks | none reported by GitHub at verification time |

Push note: GitHub accepted the branch and returned large-file warnings for existing repository history. The release branch still pushed successfully.

## 9. Boundary Statement

This step prepared, committed, pushed, and opened a PR for the local read-only release branch. It did not deploy to production, call providers, write production data, or enable ERP/OMS/WMS writeback.
