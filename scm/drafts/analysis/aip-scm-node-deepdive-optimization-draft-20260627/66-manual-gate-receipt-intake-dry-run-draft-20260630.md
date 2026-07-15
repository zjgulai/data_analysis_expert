---
title: "SCM Manual Gate Receipt Intake Dry Run"
doc_type: execution_evidence
module: scm
topic: "manual-gate-receipt-intake-dry-run"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "receipt intake dry-run only; SQLite read-only export; CSV read-only validation; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
base_branch: "codex/scm-manual-gate-receipt-templates-20260630"
receipt_intake_csv: "drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-receipts-intake-20260630.csv"
receipt_intake_validation_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-intake-validation-20260630.json"
status_update_plan_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-status-update-plan-20260630.json"
---

# SCM Manual Gate Receipt Intake Dry Run

## 1. 结论先行

B66 在 B65 receipt-template 之后，增加真实回执 intake 的 dry-run 入口。当前生成的是可填报的合并版 intake CSV，并用 `templateMode=false` 对它做只读校验，输出 owner/gate 级 blocker 和 dry-run status plan。

事实：

- 合并 intake CSV：`drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-receipts-intake-20260630.csv`
- intake validation JSON：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-intake-validation-20260630.json`
- dry-run status plan：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-status-update-plan-20260630.json`
- intake 行数：`53`
- validator 模式：`templateMode=false`
- validator 结果：`schemaValid=true`、`errors=[]`、`readyForStatusMutation=false`
- status plan 结果：`eligibleRows=0`、`blockedRows=53`、`proposedStatusMutations=0`
- 所有行均为 `status_mutation=false`。

推断：

- B66 已把“人工回执文件应该长什么样、如何读、如何解释 blocker、如何形成状态更新 dry-run 计划”固化为本地 CSV/JSON 契约。
- 当前 intake 仍是空白回执 shell，因此所有 53 行都被标记为 `blocked_missing_receipt_fields`。
- 只有真实 owner receipt 填入 `decision_result`、`evidence_ref`、`signoff_date`、`scope`、`rollback_rule` 并再次通过 dry-run 后，才进入下一层人工审批判断。

不确定项：

- owner 的实际审批结果、证据引用、签核日期、适用范围和回滚规则尚未提供。
- 本批未生成状态变更 SQL、未改 governance task 状态、未写生产系统。
- SCEI 五维权重仍需 owner 给出权重、依据和签核回执。

## 2. 完整 Todo

| Step | 工作 | 状态 | 验收 |
|---|---|---|---|
| B66-1 | 基于 #14/B65 创建 stacked 分支，扫描 pem，并备份 validator/export/index | done | 分支 `codex/scm-manual-gate-receipt-intake-dry-run-20260630`；`*.pem` 扫描为空；备份已写入 `~/.Codex/file-history/` |
| B66-2 | 扩展 receipt validator：支持 `templateMode=false` 的真实 intake CSV dry-run | done | `node --check scripts/validate-manual-gate-receipts.mjs` 通过 |
| B66-3 | 生成 manual-gate-receipts-intake CSV 示例与 status-update-plan JSON，保持 `status_mutation=false` | done | intake `totalRows=53`；status plan `eligibleRows=0`、`blockedRows=53`、`proposedStatusMutations=0` |
| B66-4 | 新增 66 执行证据文档并更新 `00-index` | done | 本文件 + `00-index` |
| B66-5 | 跑 node check/export/validate/check/build/preprod/smoke，并恢复 SQLite | done | check/build/preprod/smoke 全部通过；SQLite hash 恢复为 `8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92` |
| B66-6 | 提交、推送并创建 stacked draft PR | pending | PR base 指向 B65/#14 分支 |

## 3. Intake 契约

B66 复用 B65 receipt-template 列结构：

| Column | 说明 | dry-run 判定 |
|---|---|---|
| `owner` | 回执责任 owner | 必填 |
| `packet_type` | `owner_signoff` / `field_mapping` / `scei_weight_source` | 必填 |
| `gate_id` | manual gate 或 tree edge 标识 | 必填 |
| `target_ref` | 指标或目标引用 | 必填 |
| `metric_code` | 指标 code | 必填 |
| `metric_name` | 指标名称 | 必填 |
| `decision_result` | 人工审批结果 | 真实回执必填 |
| `evidence_ref` | 证据引用 | 真实回执必填 |
| `signoff_date` | 签核日期 | 真实回执必填 |
| `scope` | 生效范围 | 真实回执必填 |
| `rollback_rule` | 回滚规则 | 真实回执必填 |
| `status_mutation` | 状态变更开关 | 固定 `false` |
| `boundary_note` | 边界说明 | 必须包含 `status_mutation_false` |

## 4. Validator 模式

| Mode | 输入 | 允许人工字段非空 | 输出 | 状态变更 |
|---|---|---:|---|---:|
| `templateMode=true` | 8 个 owner receipt-template CSV | false | `manual-gate-receipt-validation-20260630.json` | false |
| `templateMode=false` | 1 个合并 intake CSV | true | `manual-gate-receipt-intake-validation-20260630.json` + `manual-gate-status-update-plan-20260630.json` | false |

`templateMode=false` 的 blocker 规则：

- 身份字段缺失：进入 hard validation error。
- `status_mutation` 不等于 `false`：进入 hard validation error。
- `boundary_note` 不包含 `status_mutation_false`：进入 hard validation error。
- 回执字段缺失：进入 row-level blocker，但脚本仍返回 0，便于 owner 分批补齐。
- 回执字段完整：进入 `complete_pending_manual_review`，但 `proposedStatusChange=null`、`statusMutation=false`。

## 5. 本批产物计数

| Artifact | Count |
|---|---:|
| receipt templates | 8 files / 53 rows |
| receipt intake CSV | 1 file / 53 rows |
| intake validation total rows | 53 |
| rows with `status_mutation=false` | 53 |
| filled receipt rows | 0 |
| blocked receipt rows | 53 |
| dry-run eligible rows | 0 |
| proposed status mutations | 0 |

## 6. 回归脚本

生成 intake：

```bash
SCM_MANUAL_GATE_GENERATED_AT="2026-06-30T04:30:00.000Z" \
node scripts/export-manual-gate-resolution-pack.mjs
```

模板校验：

```bash
SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T04:35:00.000Z" \
node scripts/validate-manual-gate-receipts.mjs
```

intake dry-run：

```bash
SCM_MANUAL_GATE_RECEIPT_TEMPLATE_MODE=false \
SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T05:15:00.000Z" \
SCM_MANUAL_GATE_RECEIPT_VALIDATION_JSON="tmp/outputs/manual-gate-receipt-intake-validation-20260630.json" \
SCM_MANUAL_GATE_STATUS_PLAN_JSON="tmp/outputs/manual-gate-status-update-plan-20260630.json" \
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
- `templateMode=true` validator 通过，输出 `schemaValid=true`、`receiptFiles=8`、`totalRows=53`、`errors=[]`。
- `templateMode=false` validator 通过，输出 `schemaValid=true`、`receiptFiles=1`、`totalRows=53`、`blockedReceiptRows=53`、`statusPlanEligibleRows=0`、`errors=[]`。
- `manual-gate-status-update-plan-20260630.json` 输出 `eligibleRows=0`、`blockedRows=53`、`proposedStatusMutations=0`、`readyForStatusMutation=false`。
- `git diff --check` 通过。
- `npm run check` 通过。
- `npm run build` 通过。
- `preprod:check` 通过且 hard blockers 为空；manual gates 保持 `manual-p0-owner-signoffs=30`、`manual-p0-field-mappings=18`、`manual-scei-weight-source=1`。
- `smoke:api` 通过；DeepSeek missing-key gate 返回 `503` 且 `providerCallAttempted=false`。
- `smoke:readonly` 通过，输出 `localSqliteWrites=false`。
- smoke 前后已用快照恢复 `data/governance_workbench.sqlite`，最终 hash 为 `8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92`。
- 本地服务已停止，`127.0.0.1:5200` 无残留监听。

## 7. 边界

- `status_mutation=false`
- `readyForStatusMutation=false`
- `source_read_mode=sqlite_read_only` for export
- `source_read_mode=csv_read_only` for validator/status plan
- `dryRunOnly=true`
- `providerCalls=false`
- `productionWrites=false`
- `erpWriteback=false`
- `controlledWritebackProduction=false`
- local SQLite 状态不变；smoke 如产生本地写入，必须用快照恢复后再记录最终 hash。

## 8. 下一批建议

B67 建议进入“真实 owner receipt 样例接入与状态计划精化”：

1. 增加一个 fixture-only positive intake 样例，填入 1-2 行虚拟 receipt，专门验证 complete row 的 dry-run 分支，但与正式 intake 分离。
2. 按 `packet_type` 输出更细的 proposed review route：owner signoff、field mapping、SCEI weight source 分别落到不同人工审批队列。
3. 继续保持 `status_mutation=false`，只在后续显式审批后再进入状态更新实现。
