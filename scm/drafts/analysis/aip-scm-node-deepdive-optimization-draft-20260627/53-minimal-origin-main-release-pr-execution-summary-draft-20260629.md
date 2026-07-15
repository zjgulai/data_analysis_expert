---
title: "Minimal Origin Main Release PR Execution Summary Draft"
doc_type: execution_summary
module: scm
topic: "minimal-origin-main-release-pr"
status: draft_verified_local_only
created: 2026-06-29
updated: 2026-06-29
owner: self
source: codex
boundary: "local validation only; no merge; no deploy; no provider call; no production write"
related:
  - "52-unmerged-branch-ui-priority-and-execution-plan-draft-20260629.md"
  - "47-release-pr-staging-checklist-draft-20260629.md"
  - "51-owner-intake-kit-execution-summary-draft-20260629.md"
invariants:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  maxActionBoundary: suggestion_review_replay
---

# Minimal Origin Main Release PR Execution Summary

## 1. Why This Batch Exists

B52 found that PR #1 was technically open and previously mergeable, but its remote-base review surface was too large because local `main` was ahead of `origin/main`. B53 executes the recommended split path: create a clean branch from `origin/main` and add only the SCM release candidate file set.

## 2. Branch And Scope

| Field | Value |
|---|---|
| Branch | `codex/scm-readonly-rc-minimal-20260629` |
| Base | `origin/main` (`a680ed1`) |
| Worktree | `/Users/pray/.config/superpowers/worktrees/ecom_ana_overview/scm-readonly-rc-minimal-20260629` |
| File count | 127 staged files |
| Main paths | `scm/drafts/analysis/aip-scm-node-deepdive-optimization-draft-20260627/`, `scm/drafts/prototypes/scm-data-governance-workbench-v0/`, `scm/tmp/outputs/*20260622/27.json` |
| Excluded | root skills/knowledge_base history, `tmp/outputs/*20260604*`, provider keys, production sync artifacts |

## 3. Scope Adjustment During Validation

Initial minimal checkout used only the analysis and prototype paths. `smoke:api`, `smoke:readonly`, and `smoke:ui` then failed at the AI knowledge quality review gate because the server reads `scm/tmp/outputs/ai-knowledge-evidence-quality-review-20260622.json` from outside the prototype directory.

This was a real file-set gap, not a test to loosen. B53 added the release checklist evidence JSONs:

| Added evidence file | Reason |
|---|---|
| `scm/tmp/outputs/ai-knowledge-evidence-quality-review-20260622.json` | Runtime API source for AI knowledge quality review pack. |
| `scm/tmp/outputs/t2-metric-certification-evidence-20260627.json` | Metric certification evidence referenced by the RC docs. |
| `scm/tmp/outputs/t3-tag-certification-evidence-20260627.json` | Tag evidence referenced by the RC docs. |
| `scm/tmp/outputs/t4-kpi-tree-weight-evidence-20260627.json` | KPI tree weight evidence referenced by the RC docs. |
| `scm/tmp/outputs/t5-t6-storyline-closure-evidence-20260627.json` | Storyline/closure evidence referenced by the RC docs. |
| `scm/tmp/outputs/t5-t6-storyline-closure-evidence-r2-20260627.json` | Current storyline/closure evidence revision. |

## 4. Verification Results

| Command | Result |
|---|---|
| `find .../scm -name '*.pem' -print` | passed; no output |
| `npm ci` | passed; npm reported 1 low severity dependency advisory, not changed in this batch |
| `npm run check` | passed |
| `npm run build` | passed |
| `SCM_PREPROD_SCAN_ROOT=.../scm npm run preprod:check` | passed after build; hard blockers 0; manual gates 3; dirty warning 127 staged files |
| `SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5191 npm run smoke:api` | passed; DeepSeek missing-key gate kept `providerCallAttempted=false` |
| `SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5191 SCM_UI_SMOKE_OUTPUT_DIR=... npm run smoke:ui` | passed; desktop 1366/1440/1920 + interactions; horizontal overflow 0 |
| `SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5191 npm run smoke:readonly` | passed after API/UI smoke; `localSqliteWrites=false` |
| restore SQLite then `npm run smoke:readonly` | passed; recommendations returned to 15; `localSqliteWrites=false` |
| `git diff --cached --check` | passed |

SQLite snapshots and UI smoke artifacts are archived at `/Users/pray/.Codex/file-history/ecom_ana_overview_scm/20260629T213000-minimal-rc-worktree/`.

## 5. Boundary Statement

Facts:
- No merge was executed.
- No deployment was executed.
- No provider call was executed.
- No production write or ERP/OMS/WMS writeback was executed.
- The only runtime writes happened during local smoke against the local SQLite file and were restored before commit.

Remaining manual gates:
- `manual-p0-owner-signoffs`
- `manual-p0-field-mappings`
- `manual-scei-weight-source`

Uncertainty:
- GitHub PR diff rendering and mergeability must be rechecked after push.
- Production read-only smoke remains a post-deploy gate, not part of this local validation.
