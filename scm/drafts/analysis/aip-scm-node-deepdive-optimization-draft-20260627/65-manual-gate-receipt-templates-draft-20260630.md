---
title: "SCM Manual Gate Receipt Templates"
doc_type: execution_evidence
module: scm
topic: "manual-gate-receipt-templates"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "receipt template generation only; SQLite read-only export; CSV read-only validation; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
base_branch: "codex/scm-manual-gate-owner-packets-20260630"
summary_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-resolution-summary-20260630.json"
receipt_template_dir: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-templates-20260630"
receipt_validation_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-validation-20260630.json"
---

# SCM Manual Gate Receipt Templates

## 1. 结论先行

B65 在 B64 owner packets 之后，补齐 owner-facing packet 的回执模板层：每个 owner packet 增配一个 receipt-template CSV，人工只需在固定字段内填写审批结果、证据引用、签核日期、适用范围和回滚规则。

事实：

- 扩展脚本：`drafts/prototypes/scm-data-governance-workbench-v0/scripts/export-manual-gate-resolution-pack.mjs`
- 新增校验脚本：`drafts/prototypes/scm-data-governance-workbench-v0/scripts/validate-manual-gate-receipts.mjs`
- receipt template 目录：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-templates-20260630/`
- receipt template 数量：`8`
- receipt template 行数：`53`
- validator 输出：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-receipt-validation-20260630.json`
- validator 结果：`schemaValid=true`、`readyForStatusMutation=false`、`errors=[]`
- 所有模板行均为 `status_mutation=false`。
- 所有人工回执字段当前均为空，`templateRowsAwaitingReceipt=53`。

推断：

- B65 把“可发起审批材料”推进到“可接收审批回执”的最小契约层，但未改变 manual gates 的业务状态。
- 后续只有当 owner 提供真实 receipt 且通过校验后，才具备进入状态回填 dry-run 的输入条件。

不确定项：

- owner 的实际审批结果、证据引用和签核日期仍需人工提供。
- SCEI 五维权重仍缺业务 owner 的权重和依据回执。
- `preprod:check` 的 manual gates 仍应保持 open_by_design，直到真实回执通过独立流程进入。

## 2. 完整 Todo

| Step | 工作 | 状态 | 验收 |
|---|---|---|---|
| B65-1 | 核验 #13 基线、创建 stacked 工作分支，并备份脚本/索引 | done | 分支 `codex/scm-manual-gate-receipt-templates-20260630`；备份已写入 `~/.Codex/file-history/` |
| B65-2 | 扩展 export 脚本，生成 8 个 owner receipt-template CSV 和 summary 索引 | done | `receiptTemplateCount=8`、`receiptTemplateRows=53` |
| B65-3 | 新增 read-only receipt validator，校验模板列、行数、空白回执状态和边界字段 | done | `schemaValid=true`、`templateRowsAwaitingReceipt=53`、`rowsWithStatusMutationFalse=53` |
| B65-4 | 生成并抽检 templates/validator summary，更新 `00-index` 与 B65 执行证据 | done | 本文件 + `00-index` + validator JSON |
| B65-5 | 跑 node check/export/validate/check/build/preprod/smoke，并恢复 SQLite | done | check/build/preprod/smoke 全部通过；SQLite hash 恢复为 `8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92` |
| B65-6 | 提交、推送并创建 stacked draft PR | pending | PR base 指向 B64/#13 分支 |

## 3. Receipt Template 契约

统一列结构：

| Column | 说明 | 当前状态 |
|---|---|---|
| `owner` | 回执责任 owner | 从 packet owner 继承 |
| `packet_type` | `owner_signoff` / `field_mapping` / `scei_weight_source` | 从 packet 继承 |
| `gate_id` | manual gate 或 tree edge 标识 | 从 packet 继承 |
| `target_ref` | 指标或目标引用 | 从 packet 继承 |
| `metric_code` | 指标 code | 从 packet 继承 |
| `metric_name` | 指标名称 | 从 packet 继承 |
| `decision_result` | 人工审批结果 | 待填 |
| `evidence_ref` | 证据引用 | 待填 |
| `signoff_date` | 签核日期 | 待填 |
| `scope` | 生效范围 | 待填 |
| `rollback_rule` | 回滚规则 | 待填 |
| `status_mutation` | 状态变更开关 | 固定 `false` |
| `boundary_note` | 边界说明 | 固定 `manual_receipt_template_only_status_mutation_false` |

## 4. Template 清单

| Owner | Slug | Rows |
|---|---|---:|
| 财务/成本 Owner | `finance-cost-owner` | 10 |
| 采购与供应商 Owner | `procurement-supplier-owner` | 4 |
| 仓储运营 Owner | `warehouse-ops-owner` | 3 |
| 供应链数据治理 Owner | `scm-data-governance-owner` | 5 |
| 计划 Owner | `planning-owner` | 3 |
| 库存运营 Owner | `inventory-ops-owner` | 18 |
| 数据治理 Owner | `data-governance-owner` | 6 |
| 物流运营 Owner | `logistics-ops-owner` | 4 |

## 5. Validator 规则

`validate-manual-gate-receipts.mjs` 默认运行在 `templateMode=true`：

- 读取 `tmp/outputs/manual-gate-receipt-templates-20260630/*.csv`。
- 校验 CSV 数量为 `8`，总行数为 `53`。
- 校验列顺序与 template 契约完全一致。
- 校验 `owner`、`packet_type`、`gate_id`、`target_ref`、`metric_code`、`metric_name` 非空。
- 校验所有行 `status_mutation=false`。
- 校验 `decision_result`、`evidence_ref`、`signoff_date`、`scope`、`rollback_rule` 在模板阶段保持空白。
- 输出 `readyForStatusMutation=false`。

## 6. 回归脚本

生成 receipt templates：

```bash
SCM_MANUAL_GATE_GENERATED_AT="2026-06-30T04:30:00.000Z" \
node scripts/export-manual-gate-resolution-pack.mjs
```

校验 receipt templates：

```bash
SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T04:35:00.000Z" \
node scripts/validate-manual-gate-receipts.mjs
```

完整验收脚本：

```bash
find . -name '*.pem' -print
node --check scripts/export-manual-gate-resolution-pack.mjs
node --check scripts/validate-manual-gate-receipts.mjs
SCM_MANUAL_GATE_GENERATED_AT="2026-06-30T04:30:00.000Z" node scripts/export-manual-gate-resolution-pack.mjs
SCM_MANUAL_GATE_RECEIPT_VALIDATED_AT="2026-06-30T04:35:00.000Z" node scripts/validate-manual-gate-receipts.mjs
git diff --check
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="/Users/pray/.config/superpowers/worktrees/ecom_ana_overview/scm-readonly-rc-minimal-20260629" npm run preprod:check
npm run smoke:api
npm run smoke:readonly
```

验收事实：

- `find . -name '*.pem' -print` 结果为空。
- `node --check scripts/export-manual-gate-resolution-pack.mjs` 通过。
- `node --check scripts/validate-manual-gate-receipts.mjs` 通过。
- `export-manual-gate-resolution-pack.mjs` 复跑通过，输出 `receiptTemplateCount=8`、`receiptTemplateRows=53`。
- `validate-manual-gate-receipts.mjs` 通过，输出 `schemaValid=true`、`receiptFiles=8`、`totalRows=53`、`rowsWithStatusMutationFalse=53`、`templateRowsAwaitingReceipt=53`、`errors=[]`。
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
- `source_read_mode=sqlite_read_only` for export
- `source_read_mode=csv_read_only` for validator
- `providerCalls=false`
- `productionWrites=false`
- `erpWriteback=false`
- `controlledWritebackProduction=false`
- local SQLite 状态不变；smoke 如产生本地写入，必须用快照恢复后再记录最终 hash。

## 8. 下一批建议

B66 建议进入“真实回执 intake dry-run”：

1. 新增 `manual-gate-receipts-intake-20260630.csv` 的读取入口，但默认只读校验。
2. validator 增加 `templateMode=false` 路径，允许真实回执字段非空，并输出 owner/gate 级通过与阻塞原因。
3. 生成 `status-update-plan.json` 作为 dry-run 计划，继续保持 `status_mutation=false`，等待显式审批后再另开 PR 处理状态变更。
