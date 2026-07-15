---
title: "SCM Manual Gate Receipt Negative Fixture"
doc_type: execution_evidence
module: scm
topic: "manual-gate-receipt-negative-fixture"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "fixture-only negative receipt validation; expected blockers only; CSV read-only validation; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
base_branch: "codex/scm-manual-gate-receipt-owner-guide-20260630"
negative_fixture_csv: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/fixtures/manual-gate-receipt-negative-fixture-20260630.csv"
negative_fixture_validation_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-negative-fixture-validation-20260630.json"
negative_fixture_status_plan_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-negative-fixture-status-update-plan-20260630.json"
---

# SCM Manual Gate Receipt Negative Fixture

## 1. 结论先行

B69 在 B68 owner guide 与 `decision_result` 枚举契约之后，新增 fixture-only 负向样例，验证 validator 能识别并阻断三类不合规 receipt 输入：非法 `decision_result`、非法 `packet_type`、`status_mutation=true`。

事实：

- negative fixture CSV：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/fixtures/manual-gate-receipt-negative-fixture-20260630.csv`
- negative validation JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-negative-fixture-validation-20260630.json`
- negative status plan：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-negative-fixture-status-update-plan-20260630.json`
- expected-blockers 模式：`SCM_MANUAL_GATE_EXPECTED_BLOCKERS=true`
- required blockers：`invalid_decision_result`、`unsupported_packet_type`、`status_mutation_must_remain_false`
- negative rows：`3`
- blocked rows：`3`
- eligible rows：`0`
- proposed status mutations：`0`
- expected blocker validation：`satisfied=true`

推断：

- validator 现在有负向样例来证明认证门禁不会被非枚举值、未知包类型或状态突变输入绕过。
- expected-blockers 模式只服务 fixture 验收；未开启该模式时，negative fixture 会返回非零。
- 正式 intake 未被真实 owner 回执填充，仍保持 blocked。

不确定项：

- 本批不覆盖部分字段缺失的组合负向样例；正式 intake 已覆盖 53 行空白回执 blocker。
- 本批不验证真实审批系统的附件可访问性，只验证 CSV 契约和 dry-run status plan。

## 2. 完整 Todo

| Step | 工作 | 状态 | 验收 |
|---|---|---|---|
| B69-1 | 从 #17/B68 创建 stacked 分支，复核 PR/边界并备份将修改文件 | done | 分支 `codex/scm-manual-gate-receipt-negative-fixture-20260630`；`*.pem` 扫描为空；备份已写入 `~/.Codex/file-history/` |
| B69-2 | 扩展 validator：增加 expected-blockers fixture 模式，保留正式 intake 严格失败语义 | done | `SCM_MANUAL_GATE_EXPECTED_BLOCKERS=true` 时才允许 expected blocker fixture 返回 0 |
| B69-3 | 新增 negative fixture，覆盖非法 `decision_result`、非法 `packet_type`、`status_mutation=true` | done | 3 行 fixture 各覆盖一种 blocker |
| B69-4 | 刷新 positive/formal/negative validation 产物，新增 69 证据文档并更新 `00-index` | done | 本文件 + refreshed JSON outputs |
| B69-5 | 跑 check/build/preprod/smoke，恢复 SQLite 并核验边界 | done | `npm run check` / `npm run build` / `preprod:check` / `smoke:api` / `smoke:readonly` 均完成；SQLite hash 已恢复 |
| B69-6 | 提交、推送并创建 stacked draft PR | pending | PR base 指向 B68/#17 分支 |

## 3. Negative Fixture 覆盖面

| Row | 输入问题 | Expected Blocker | Status Plan |
|---:|---|---|---|
| 1 | `decision_result=approved_for_fixture_dry_run` | `invalid_decision_result` | blocked |
| 2 | `packet_type=ai_auto_approval` | `unsupported_packet_type` | blocked |
| 3 | `status_mutation=true` | `status_mutation_must_remain_false` | blocked |

三行均使用 fixture 命名空间：

- `evidence_ref=fixture://manual-gate-negative/...`
- `scope=fixture_only_negative_no_runtime_effect`
- `rollback_rule=revert_fixture_only_row`
- `boundary_note` 保留 `status_mutation_false`

## 4. Validator 模式

| Mode | Env | 作用 | 正式 intake 是否使用 |
|---|---|---|---:|
| normal strict | 默认 | 有 contract violation 时返回非零 | yes |
| expected blockers | `SCM_MANUAL_GATE_EXPECTED_BLOCKERS=true` | 仅用于负向 fixture，要求指定 blockers 全部出现且无额外 blockers | no |

expected-blockers 满足条件：

- `blockedReceiptRows === totalRows`
- `statusPlanEligibleRows === 0`
- required blockers 全部出现
- `unexpectedBlockers=[]`
- `disallowedValidationIssues=[]`

## 5. 本批产物计数

| Artifact | Count |
|---|---:|
| formal intake rows | 53 |
| formal intake blocked rows | 53 |
| positive fixture rows | 2 |
| positive fixture eligible rows | 2 |
| negative fixture rows | 3 |
| negative fixture blocked rows | 3 |
| negative fixture expected blocker types | 3 |
| negative fixture proposed status mutations | 0 |

## 6. 回归脚本

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
SCM_PREPROD_SCAN_ROOT="$(git rev-parse --show-toplevel)/scm" npm run preprod:check
npm run smoke:api
npm run smoke:readonly
```

当前已完成事实：

- `find . -name '*.pem' -print` 结果为空。
- `node --check scripts/export-manual-gate-resolution-pack.mjs` 通过。
- `node --check scripts/validate-manual-gate-receipts.mjs` 通过。
- template validator 通过，输出 `receiptFiles=8`、`totalRows=53`、`blockerCounts={}`。
- 正式 intake dry-run 通过，输出 `totalRows=53`、`blockedReceiptRows=53`、`statusPlanEligibleRows=0`。
- positive fixture dry-run 通过，输出 `totalRows=2`、`blockedReceiptRows=0`、`statusPlanEligibleRows=2`。
- negative fixture expected-blockers dry-run 通过，输出 `totalRows=3`、`blockedReceiptRows=3`、`statusPlanEligibleRows=0`、`expectedBlockerValidation.satisfied=true`。
- negative fixture strict check 返回 `strict_exit_code=1`，证明 expected-blockers 不是默认放宽。
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
- `providerCalls=false`
- `productionWrites=false`
- `erpWriteback=false`
- `controlledWritebackProduction=false`
- 不改 `main.tsx`
- 不改 `server/index.mjs`
- 不写 SQLite；如 smoke 产生本地 ledger 写入，必须用快照恢复后再记录最终 hash。

## 8. 下一批建议

B70 建议进入“receipt acceptance matrix”：

1. 汇总 template / formal intake / positive fixture / negative fixture 四类模式的验收矩阵。
2. 将 strict 与 expected-blockers 的使用边界写成 release gate checklist。
3. 继续保持真实 owner 回执导入为后续人工授权事项。
