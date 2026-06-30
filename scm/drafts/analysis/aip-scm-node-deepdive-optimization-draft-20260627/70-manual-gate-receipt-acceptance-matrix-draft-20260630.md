---
title: "SCM Manual Gate Receipt Acceptance Matrix"
doc_type: execution_evidence
module: scm
topic: "manual-gate-receipt-acceptance-matrix"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "receipt acceptance matrix and release gate checklist; fixture and dry-run only; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
base_branch: "codex/scm-manual-gate-receipt-negative-fixture-20260630"
acceptance_matrix_csv: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630/manual-gate-receipt-acceptance-matrix-20260630.csv"
release_gate_checklist_md: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630/manual-gate-receipt-release-gate-checklist-20260630.md"
---

# SCM Manual Gate Receipt Acceptance Matrix

## 1. 结论先行

B70 在 B69 negative fixture 之后，补齐 receipt acceptance matrix 与 release gate checklist，把 template、formal intake、positive fixture、negative fixture 四类 validator 模式统一成可审计验收表。

事实：

- acceptance matrix CSV：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630/manual-gate-receipt-acceptance-matrix-20260630.csv`
- release gate checklist：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630/manual-gate-receipt-release-gate-checklist-20260630.md`
- 覆盖模式：`template`、`formal_intake_blank`、`positive_fixture`、`negative_fixture`
- strict mode 适用：template、formal intake、positive fixture、未来真实 owner receipt intake
- expected-blockers mode 仅适用：fixture-only negative rows
- 所有模式均保持 `expected_status_mutations=0`

推断：

- reviewer 可以不读 validator 源码，也能判断每类 receipt 输出的接受标准。
- expected-blockers 的使用边界已经从脚本实现提升为 release checklist，降低后续误用于真实 receipt intake 的风险。
- 当前工作仍是内容治理与验收契约整理，不改变运行时行为。

不确定项：

- 真实 owner receipt 尚未导入；本矩阵只定义导入前门禁。
- 后续是否需要把 checklist 拆成每个 owner packet 的签署附件，取决于实际审批流。

## 2. 完整 Todo

| Step | 工作 | 状态 | 验收 |
|---|---|---|---|
| B70-1 | 从 #18/B69 创建 stacked 分支，复核 PR/边界并备份将修改文件 | done | 分支 `codex/scm-manual-gate-receipt-acceptance-matrix-20260630`；`*.pem` 扫描为空；`00-index` 已备份 |
| B70-2 | 新增 receipt acceptance matrix CSV，覆盖 template/formal/positive/negative 四类模式 | done | 新增 `manual-gate-receipt-acceptance-matrix-20260630.csv` |
| B70-3 | 新增 release gate checklist，明确 strict 与 expected-blockers 使用边界 | done | 新增 `manual-gate-receipt-release-gate-checklist-20260630.md` |
| B70-4 | 新增 70 执行证据文档并更新 `00-index` | done | 本文件 + `00-index` |
| B70-5 | 跑 validation/check/build/preprod/smoke，恢复 SQLite 并核验边界 | done | validation / `npm run check` / `npm run build` / `preprod:check` / `smoke:api` / `smoke:readonly` 均完成；SQLite hash 已恢复 |
| B70-6 | 提交、推送并创建 stacked draft PR | pending | PR base 指向 B69/#18 分支 |

## 3. Acceptance Matrix

| Mode | Expected Rows | Eligible | Blocked | Status Mutations | Gate |
|---|---:|---:|---:|---:|---|
| template | 53 | 0 | 0 | 0 | schema + blank human fields |
| formal_intake_blank | 53 | 0 | 53 | 0 | blocked dry-run until real owner receipt exists |
| positive_fixture | 2 | 2 | 0 | 0 | complete receipt routes to manual review queues |
| negative_fixture | 3 | 0 | 3 | 0 | expected blockers only; strict mode still returns nonzero |

## 4. Strict vs Expected-Blockers

Strict mode is mandatory for:

- receipt templates
- formal intake
- positive fixture
- any future real owner receipt intake

Expected-blockers mode is allowed only when all conditions are true:

- input is fixture-only negative CSV
- `SCM_MANUAL_GATE_EXPECTED_BLOCKERS=true`
- required blockers are explicitly listed
- `expectedBlockerValidation.satisfied=true`
- strict mode for the same negative fixture returns nonzero

## 5. 回归脚本

```bash
find . -name '*.pem' -print
node --check scripts/export-manual-gate-resolution-pack.mjs
node --check scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T07:10:00.000Z" node scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T07:15:00.000Z" SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-intake-validation-20260630.json" SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-status-update-plan-20260630.json" node scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV="tmp/fixtures/manual-gate-receipt-positive-fixture-20260630.csv" SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS=2 SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T07:20:00.000Z" SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-positive-fixture-validation-20260630.json" SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-positive-fixture-status-update-plan-20260630.json" node scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false SCM_MANUAL_GATE_EXPECTED_BLOCKERS=true SCM_MANUAL_GATE_EXPECTED_BLOCKER_NAMES="invalid_decision_result,unsupported_packet_type,status_mutation_must_remain_false" SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV="tmp/fixtures/manual-gate-receipt-negative-fixture-20260630.csv" SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS=3 SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T07:25:00.000Z" SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-negative-fixture-validation-20260630.json" SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-negative-fixture-status-update-plan-20260630.json" node scripts/validate-manual-gate-receipts.mjs
git diff --check
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="/Users/pray/.config/superpowers/worktrees/ecom_ana_overview/scm-readonly-rc-minimal-20260629" npm run preprod:check
npm run smoke:api
npm run smoke:readonly
```

当前已完成事实：

- `find . -name '*.pem' -print` 结果为空。
- 本批新增内容不改 `main.tsx`、不改 `server/index.mjs`、不写 SQLite。
- `node --check scripts/export-manual-gate-resolution-pack.mjs` 通过。
- `node --check scripts/validate-manual-gate-receipts.mjs` 通过。
- template validator 通过，输出 `totalRows=53`、`templateRowsAwaitingReceipt=53`、`blockerCounts={}`。
- formal intake dry-run 通过，输出 `totalRows=53`、`blockedReceiptRows=53`、`statusPlanEligibleRows=0`。
- positive fixture dry-run 通过，输出 `totalRows=2`、`blockedReceiptRows=0`、`statusPlanEligibleRows=2`。
- negative fixture expected-blockers dry-run 通过，输出 `totalRows=3`、`blockedReceiptRows=3`、`statusPlanEligibleRows=0`、`expectedBlockerValidation.satisfied=true`。
- negative fixture strict check 返回 `strict_exit_code=1`。
- `git diff --check` 通过。
- `npm run check` 通过。
- `npm run build` 通过。
- `SCM_PREPROD_SCAN_ROOT="/Users/pray/.config/superpowers/worktrees/ecom_ana_overview/scm-readonly-rc-minimal-20260629" npm run preprod:check` 通过，输出 `hardBlockers=[]`，manual gates 仍为 `ownerSignoff=30`、`fieldMapping=18`、`sceiWeight=1`。
- `npm run smoke:api` 通过；DeepSeek missing-key gate 返回 `status=503`、`providerCallAttempted=false`，本地 ledger 写入后已用 pre-smoke SQLite 快照恢复。
- `npm run smoke:readonly` 通过；输出 `productionWrites=false`、`providerCalls=false`、`erpWriteback=false`、`localSqliteWrites=false`，方法仅为 `GET/HEAD`。
- SQLite pre-smoke 与最终 hash 一致：`8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92`。
- `lsof -nP -iTCP:5200 -sTCP:LISTEN` 最终无监听输出，5200 已释放。

## 6. 边界

- `status_mutation=false`
- `readyForStatusMutation=false`
- `dryRunOnly=true`
- `proposedStatusMutations=0`
- `providerCalls=false`
- `productionWrites=false`
- `erpWriteback=false`
- `controlledWritebackProduction=false`
- no `main.tsx` change
- no `server/index.mjs` change
- no real owner receipt import

## 7. 下一批建议

B71 建议进入“owner packet send-ready bundle”：

1. 将 owner guide、field values、acceptance matrix、release checklist 汇总成 owner packet 附件索引。
2. 为 8 个 owner packet 增加统一发送清单。
3. 仍保持真实发送、provider 调用和状态变更为后续人工授权事项。
