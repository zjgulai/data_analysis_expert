---
title: "SCM Manual Gate Receipt Owner Guide"
doc_type: execution_evidence
module: scm
topic: "manual-gate-receipt-owner-guide"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "owner-facing receipt guide and enum validation; CSV read-only validation; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
base_branch: "codex/scm-manual-gate-receipt-positive-fixture-20260630"
owner_guide_md: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630/manual-gate-receipt-owner-guide-20260630.md"
field_values_csv: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630/manual-gate-receipt-field-values-20260630.csv"
---

# SCM Manual Gate Receipt Owner Guide

## 1. 结论先行

B68 在 B67 positive fixture 之后，补齐真实 owner receipt 导入前的人工门禁材料，并把 `decision_result` 从自由文本收敛为三值枚举。正式 intake 仍保持空白；fixture 只用于 dry-run 正向路径验证。

事实：

- owner-facing guide：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630/manual-gate-receipt-owner-guide-20260630.md`
- field values CSV：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630/manual-gate-receipt-field-values-20260630.csv`
- validator 新增 `decision_result` 三值枚举校验：
  - `approved_for_manual_review`
  - `approved_with_conditions`
  - `rejected_needs_rework`
- fixture CSV 改为使用真实枚举 `approved_for_manual_review`，fixture-only 边界继续由 `scope/evidence_ref/boundary_note` 表达。
- 正式 intake dry-run：`totalRows=53`、`blockedReceiptRows=53`、`statusPlanEligibleRows=0`、`invalidDecisionResultRows=0`。
- positive fixture dry-run：`totalRows=2`、`filledReceiptRows=2`、`statusPlanEligibleRows=2`、`decisionResultCounts.approved_for_manual_review=2`、`invalidDecisionResultRows=0`。

推断：

- 真实 owner 回执导入前，填写人已有单一字段说明与合法值表。
- validator 已能阻断非枚举 `decision_result`，不需要为了“让 AI 能答”放宽认证门禁。
- 当前变更仍只是 receipt 契约治理，不改变 task 状态、不写 SQLite、不触发 ERP 写回。

不确定项：

- 真实 owner 尚未填写 receipt；本批不代表人工签核完成。
- `approved_with_conditions` 的条件文本质量仍需人工复核，本批只校验枚举与字段完整性。
- 后续是否将合法值表拆分到每个 owner packet，需要真实审批流使用反馈后再决定。

## 2. 完整 Todo

| Step | 工作 | 状态 | 验收 |
|---|---|---|---|
| B68-1 | 从 #16/B67 创建 stacked 分支，复核边界和备份将修改文件 | done | 分支 `codex/scm-manual-gate-receipt-owner-guide-20260630`；`*.pem` 扫描为空；备份已写入 `~/.Codex/file-history/` |
| B68-2 | 设计 owner-facing receipt 填写说明和字段合法值表 | done | 新增 guide Markdown + field values CSV |
| B68-3 | 扩展 validator 的 `decision_result` 枚举校验，并保留 fixture/formal dry-run 分层 | done | template 允许空白；非 template 校验三值枚举 |
| B68-4 | 生成/刷新 validation 与 status-plan 产物，新增 68 执行证据并更新 `00-index` | done | 本文件 + `00-index` + refreshed JSON outputs |
| B68-5 | 跑 check/build/preprod/smoke，恢复 SQLite 并核验边界 | done | `npm run check` / `npm run build` / `preprod:check` / `smoke:api` / `smoke:readonly` 均完成；SQLite hash 已恢复 |
| B68-6 | 提交、推送并创建 stacked draft PR | pending | PR base 指向 B67/#16 分支 |

## 3. `decision_result` 契约

| Value | 含义 | 是否触发状态变更 |
|---|---|---:|
| `approved_for_manual_review` | owner 同意该回执进入人工复核 | false |
| `approved_with_conditions` | owner 有条件同意，条件必须写在 `scope` 或 `evidence_ref` 指向材料中 | false |
| `rejected_needs_rework` | owner 不同意当前门禁结论，需要补证或重做 | false |

非法值处理：

- template mode：人工字段必须为空，不做枚举判定。
- intake mode：`decision_result` 非空且不在三值内时，row blocker 增加 `invalid_decision_result`。
- 即使枚举合法，status plan 仍输出 `proposedStatusChange=null`、`statusMutation=false`、`dryRunOnly=true`。

## 4. Owner 填写材料

新增 guide 明确：

- 不修改身份字段：`owner`、`packet_type`、`gate_id`、`target_ref`、`metric_code`、`metric_name`。
- 只填写人工回执字段：`decision_result`、`evidence_ref`、`signoff_date`、`scope`、`rollback_rule`。
- `status_mutation` 必须保持 `false`。
- `boundary_note` 必须包含 `status_mutation_false`。
- 没有真实证据时保持空白，不用 fixture、示例值或推测值补齐。

新增 field values CSV 覆盖 13 个 receipt 字段：

- identity fields：6 个，不允许 owner 编辑。
- human receipt fields：5 个，需要 owner 填写。
- boundary fields：2 个，必须保持 `false` / `status_mutation_false`。

## 5. 本批产物计数

| Artifact | Count |
|---|---:|
| receipt fields documented | 13 |
| allowed `decision_result` values | 3 |
| formal intake rows | 53 |
| formal intake blocked rows | 53 |
| formal intake invalid decision rows | 0 |
| fixture rows | 2 |
| fixture complete rows | 2 |
| fixture invalid decision rows | 0 |
| fixture proposed status mutations | 0 |

## 6. 回归脚本

```bash
find . -name '*.pem' -print
node --check scripts/export-manual-gate-resolution-pack.mjs
node --check scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T06:10:00.000Z" node scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T06:15:00.000Z" SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-intake-validation-20260630.json" SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-status-update-plan-20260630.json" node scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false SCM_MANUAL_GATE_RECEIPT_INTAKE_CSV="tmp/fixtures/manual-gate-receipt-positive-fixture-20260630.csv" SCM_MANUAL_GATE_EXPECTED_RECEIPT_ROWS=2 SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T06:20:00.000Z" SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-positive-fixture-validation-20260630.json" SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-positive-fixture-status-update-plan-20260630.json" node scripts/validate-manual-gate-receipts.mjs
git diff --check
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="/Users/pray/.config/superpowers/worktrees/ecom_ana_overview/scm-readonly-rc-minimal-20260629" npm run preprod:check
npm run smoke:api
npm run smoke:readonly
```

当前已完成事实：

- `find . -name '*.pem' -print` 结果为空。
- `node --check scripts/export-manual-gate-resolution-pack.mjs` 通过。
- `node --check scripts/validate-manual-gate-receipts.mjs` 通过。
- template validator 通过，输出 `receiptFiles=8`、`totalRows=53`、`decisionResultAllowedValues=3`、`invalidDecisionResultRows=0`。
- 正式 intake dry-run 通过，输出 `totalRows=53`、`blockedReceiptRows=53`、`statusPlanEligibleRows=0`、`invalidDecisionResultRows=0`。
- positive fixture dry-run 通过，输出 `totalRows=2`、`filledReceiptRows=2`、`statusPlanEligibleRows=2`、`decisionResultCounts.approved_for_manual_review=2`、`invalidDecisionResultRows=0`。
- `git diff --check` 通过。
- `npm run check` 通过。
- `npm run build` 通过。
- `SCM_PREPROD_SCAN_ROOT="/Users/pray/.config/superpowers/worktrees/ecom_ana_overview/scm-readonly-rc-minimal-20260629" npm run preprod:check` 通过，输出 `hardBlockers=[]`，manual gates 仍为 `ownerSignoff=30`、`fieldMapping=18`、`sceiWeight=1`。
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

B69 建议进入“receipt negative fixture 与枚举拒绝样例”：

1. 新增一个 fixture-only negative CSV，覆盖非法 `decision_result`、非法 `packet_type`、`status_mutation=true` 三类 blocker。
2. 验证 validator 能清晰输出 `invalid_decision_result` 等阻断原因。
3. 继续保持 dry-run，不引入真实 owner 回执，不生成状态变更。
