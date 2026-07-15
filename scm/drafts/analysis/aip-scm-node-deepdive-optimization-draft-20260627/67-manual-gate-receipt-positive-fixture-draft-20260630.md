---
title: "SCM Manual Gate Receipt Positive Fixture"
doc_type: execution_evidence
module: scm
topic: "manual-gate-receipt-positive-fixture"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "fixture-only receipt dry-run; CSV read-only validation; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
base_branch: "codex/scm-manual-gate-receipt-intake-dry-run-20260630"
positive_fixture_csv: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/fixtures/manual-gate-receipt-positive-fixture-20260630.csv"
positive_fixture_validation_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-positive-fixture-validation-20260630.json"
positive_fixture_status_plan_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-positive-fixture-status-update-plan-20260630.json"
---

# SCM Manual Gate Receipt Positive Fixture

## 1. 结论先行

B67 在 B66 receipt intake dry-run 之后，增加 fixture-only 正向样例，用两行虚拟 receipt 验证“回执字段完整时”的 dry-run 分支与 `packet_type` 级人工复核路由。正式 intake 文件保持空白，fixture 与正式 intake 分离。

事实：

- fixture CSV：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/fixtures/manual-gate-receipt-positive-fixture-20260630.csv`
- fixture validation JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-positive-fixture-validation-20260630.json`
- fixture status plan：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-positive-fixture-status-update-plan-20260630.json`
- fixture 行数：`2`
- fixture 完整回执行：`2`
- fixture dry-run eligible rows：`2`
- fixture blocked rows：`0`
- fixture proposed status mutations：`0`
- `readyForStatusMutation=false`
- `status_mutation=false`

推断：

- validator 已能区分“字段完整，进入人工复核队列”和“字段缺失，停留在 blocker”的两类 dry-run 行。
- `owner_signoff` 会路由到 `manual_owner_signoff_review_queue`。
- `field_mapping` 会路由到 `manual_field_mapping_review_queue`。
- `scei_weight_source` 的 route 逻辑已在 validator 中定义为 `manual_scei_weight_review_queue`；正式 intake 当前包含 5 行该类型，但仍因回执字段空白而保持 blocked。

不确定项：

- fixture 仅验证 dry-run 逻辑，不代表真实 owner receipt。
- fixture 不进入正式 intake、不改变 governance task 状态、不生成状态变更 SQL。
- SCEI 权重来源仍需真实 owner 回执后单独验证完整行路径。

## 2. 完整 Todo

| Step | 工作 | 状态 | 验收 |
|---|---|---|---|
| B67-1 | 基于 #15/B66 创建 stacked 分支，扫描 pem，并备份 validator/export/index | done | 分支 `codex/scm-manual-gate-receipt-positive-fixture-20260630`；`*.pem` 扫描为空；备份已写入 `~/.Codex/file-history/` |
| B67-2 | 扩展 intake dry-run：为完整 receipt 行输出 `packet_type` 级 review route | done | status plan rows 含 `proposedReviewRoute` |
| B67-3 | 新增 fixture-only positive intake 样例与 validation/status-plan 产物，验证完整行 dry-run 分支 | done | fixture `eligibleRows=2`、`blockedRows=0`、`proposedStatusMutations=0` |
| B67-4 | 新增 67 执行证据文档并更新 `00-index` | done | 本文件 + `00-index` |
| B67-5 | 跑 node check/export/template/intake/fixture/check/build/preprod/smoke，并恢复 SQLite | done | `npm run check` / `npm run build` / `preprod:check` / `smoke:api` / `smoke:readonly` 均完成；SQLite hash 已恢复 |
| B67-6 | 提交、推送并创建 stacked draft PR | pending | PR base 指向 B66/#15 分支 |

## 3. Review Route 规则

| `packet_type` | `proposedReviewRoute` | 状态变更 |
|---|---|---:|
| `owner_signoff` | `manual_owner_signoff_review_queue` | false |
| `field_mapping` | `manual_field_mapping_review_queue` | false |
| `scei_weight_source` | `manual_scei_weight_review_queue` | false |
| other | `manual_gate_exception_review_queue` | false |

## 4. Fixture 样例

fixture 只包含两行：

| Row | Type | Gate | Route | Receipt Status |
|---:|---|---|---|---|
| 1 | `owner_signoff` | `signoff_26` | `manual_owner_signoff_review_queue` | `complete_pending_manual_review` |
| 2 | `field_mapping` | `mapping_61` | `manual_field_mapping_review_queue` | `complete_pending_manual_review` |

字段值均为 fixture 命名空间：

- `decision_result=approved_for_manual_review`
- `evidence_ref=fixture://manual-gate-positive/...`
- `scope=fixture_only_no_runtime_effect`
- `rollback_rule=revert_fixture_only_row`
- `status_mutation=false`

## 5. 本批产物计数

| Artifact | Count |
|---|---:|
| formal intake rows | 53 |
| formal intake blocked rows | 53 |
| formal intake proposed status mutations | 0 |
| fixture rows | 2 |
| fixture complete rows | 2 |
| fixture eligible rows | 2 |
| fixture blocked rows | 0 |
| fixture proposed status mutations | 0 |

## 6. 回归脚本

正式 intake dry-run：

```bash
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false \
SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T05:15:00.000Z" \
SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-intake-validation-20260630.json" \
SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-status-update-plan-20260630.json" \
node scripts/validate-manual-gate-receipts.mjs
```

fixture dry-run：

```bash
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false \
SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV="tmp/fixtures/manual-gate-receipt-positive-fixture-20260630.csv" \
SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS=2 \
SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T05:45:00.000Z" \
SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-positive-fixture-validation-20260630.json" \
SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-positive-fixture-status-update-plan-20260630.json" \
node scripts/validate-manual-gate-receipts.mjs
```

完整验收脚本：

```bash
find . -name '*.pem' -print
node --check scripts/export-manual-gate-resolution-pack.mjs
node --check scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_GENERATED_AT="2026-06-30T04:30:00.000Z" node scripts/export-manual-gate-resolution-pack.mjs
SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T04:35:00.000Z" node scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T05:15:00.000Z" SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-intake-validation-20260630.json" SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-status-update-plan-20260630.json" node scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV="tmp/fixtures/manual-gate-receipt-positive-fixture-20260630.csv" SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS=2 SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T05:45:00.000Z" SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-positive-fixture-validation-20260630.json" SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-positive-fixture-status-update-plan-20260630.json" node scripts/validate-manual-gate-receipts.mjs
git diff --check
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="$(git rev-parse --show-toplevel)/scm" npm run preprod:check
npm run smoke:api
npm run smoke:readonly
```

验收事实：

- `find . -name '*.pem' -print` 结果为空。
- `node --check scripts/export-manual-gate-resolution-pack.mjs` 通过。
- `node --check scripts/validate-manual-gate-receipts.mjs` 通过。
- `export-manual-gate-resolution-pack.mjs` 复跑通过，输出 `receiptIntakeRows=53`。
- `templateMode=true` validator 通过，输出 `receiptFiles=8`、`totalRows=53`、`validationIssueCount=0`。
- 正式 intake dry-run 通过，输出 `totalRows=53`、`blockedReceiptRows=53`、`statusPlanEligibleRows=0`、`validationIssueCount=0`。
- 正式 intake route counts：`manual_owner_signoff_review_queue=30`、`manual_field_mapping_review_queue=18`、`manual_scei_weight_review_queue=5`。
- fixture dry-run 通过，输出 `totalRows=2`、`filledReceiptRows=2`、`blockedReceiptRows=0`、`statusPlanEligibleRows=2`、`validationIssueCount=0`。
- fixture status plan 输出 `eligibleRows=2`、`blockedRows=0`、`proposedStatusMutations=0`、`readyForStatusMutation=false`。
- `git diff --check` 通过。
- `npm run check` 通过。
- `npm run build` 通过。
- `SCM_PREPROD_SCAN_ROOT="$(git rev-parse --show-toplevel)/scm" npm run preprod:check` 通过，输出 `hardBlockers=[]`，manual gates 仍为 `ownerSignoff=30`、`fieldMapping=18`、`sceiWeight=1`。
- `npm run smoke:api` 通过；DeepSeek missing-key gate 返回 `status=503`、`providerCallAttempted=false`，本地 ledger 写入后已用 pre-smoke SQLite 快照恢复。
- `npm run smoke:readonly` 通过；输出 `productionWrites=false`、`providerCalls=false`、`erpWriteback=false`、`localSqliteWrites=false`，方法仅为 `GET/HEAD`。
- SQLite pre-smoke 与最终 hash 一致：`8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92`。
- `lsof -nP -iTCP:5200 -sTCP:LISTEN` 最终无监听输出，5200 已释放。

## 7. 边界

- `status_mutation=false`
- `readyForStatusMutation=false`
- `dryRunOnly=true`
- `proposedStatusMutations=0`
- `source_read_mode=csv_read_only` for validator/status plan
- `providerCalls=false`
- `productionWrites=false`
- `erpWriteback=false`
- `controlledWritebackProduction=false`
- fixture 与正式 intake 分离。
- local SQLite 状态不变；smoke 如产生本地写入，必须用快照恢复后再记录最终 hash。

## 8. 下一批建议

B68 建议进入“真实 receipt 导入前的人工门禁说明书”：

1. 生成 owner-facing receipt 填写说明与字段合法值表。
2. 增加 `decision_result` 枚举校验，如 `approved_for_manual_review`、`rejected_needs_rework`、`approved_with_conditions`。
3. 继续保持 dry-run 和人工审批分层，状态变更仍需单独授权。
