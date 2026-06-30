---
title: "SCM Manual Gate Owner Packets"
doc_type: execution_evidence
module: scm
topic: "manual-gate-owner-packets"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "owner packet generation only; SQLite read-only source; status_mutation=false; providerCalls=false; productionWrites=false; erpWriteback=false"
base_branch: "codex/scm-manual-gate-resolution-pack-20260630"
summary_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-resolution-summary-20260630.json"
packet_dir: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630"
---

# SCM Manual Gate Owner Packets

## 1. 结论先行

B64 在 B63 manual-gate resolution pack 之后，把待审项从通用 intake 进一步拆成 owner 可分发 packet。每个 packet 同时输出 Markdown 和 CSV，Markdown 带 frontmatter，CSV 便于审批系统或人工表格继续处理。

事实：

- 扩展脚本：`drafts/prototypes/scm-data-governance-workbench-v0/scripts/export-manual-gate-resolution-pack.mjs`
- packet 目录：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-owner-packets-20260630/`
- packet 数量：`8`
- packet 条目总数：`53`
- 覆盖：`ownerSignoffOpen=30`、`fieldMappingOpen=18`、`sceiWeightChildrenAwaitingOwnerWeights=5`
- `summary.ownerPackets` 已写入每个 owner 的 `csvPath`、`markdownPath`、`itemCount` 和分类计数。
- 导出脚本继续使用 `DatabaseSync(..., { readOnly: true })`。
- 导出后 `data/governance_workbench.sqlite` hash 仍为 `8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92`。

推断：

- owner signoff 的 `requested_owner` 仍为 `待确认`，但 metric 已有 `metric_owner_current`，因此本批按 `metric_owner_current` 路由到 owner packet，便于先发起口径确认。
- field mapping 的处理 owner 已在 `requested_owner` 中显式给出，因此按 `requested_owner` 路由。
- SCEI 权重来源属于顶层体系决策，路由到 `供应链数据治理 Owner`。

不确定项：

- packet 只是审批输入材料，owner receipt 仍需人工补充。
- packet 中的 SCEI `proposed_weight`、`basis_type`、`basis_description`、`owner`、`signoff_date`、`evidence_ref`、`decision_result` 继续留空。
- `preprod:check` 的 manual gates 仍保持 open_by_design，待回执进入后再单独处理状态回填。

## 2. 完整 Todo

| Step | 工作 | 状态 | 验收 |
|---|---|---|---|
| B64-1 | 核验 #12 基线、创建 stacked 工作分支，并确认只改内容/工具层 | done | #12 为 draft/open/clean；新分支 `codex/scm-manual-gate-owner-packets-20260630` |
| B64-2 | 扩展 manual-gate 导出脚本，生成 owner packet Markdown/CSV 和 packet index | done | 脚本输出 `ownerPacketCount=8` |
| B64-3 | 生成并抽检 owner packets | done | 抽检 `inventory-ops-owner.md` 与 `scm-data-governance-owner.md` |
| B64-4 | 更新总纲索引和 B64 执行证据 | done | 本文件 + `00-index` |
| B64-5 | 跑 node check/export/check/build/preprod/smoke | pending | 回归命令全部完成后更新 |
| B64-6 | 提交、推送并创建 stacked draft PR | pending | PR base 指向 B63/#12 分支 |

## 3. 路由规则

| Gate Type | Routing Field | 说明 |
|---|---|---|
| `owner_signoff` | `metric_owner_current` | `requested_owner` 当前为 `待确认`，先按 metric owner 发起口径确认 |
| `field_mapping` | `requested_owner` | 字段映射责任 owner 已显式给出 |
| `scei_weight_source` | `供应链数据治理 Owner` | 顶层 SCEI 五维权重属于体系 owner 决策 |

## 4. Packet 清单

| Owner | Slug | Owner Signoff | Field Mapping | SCEI Weight | Total |
|---|---|---:|---:|---:|---:|
| 财务/成本 Owner | `finance-cost-owner` | 4 | 6 | 0 | 10 |
| 采购与供应商 Owner | `procurement-supplier-owner` | 4 | 0 | 0 | 4 |
| 仓储运营 Owner | `warehouse-ops-owner` | 0 | 3 | 0 | 3 |
| 供应链数据治理 Owner | `scm-data-governance-owner` | 0 | 0 | 5 | 5 |
| 计划 Owner | `planning-owner` | 3 | 0 | 0 | 3 |
| 库存运营 Owner | `inventory-ops-owner` | 12 | 6 | 0 | 18 |
| 数据治理 Owner | `data-governance-owner` | 3 | 3 | 0 | 6 |
| 物流运营 Owner | `logistics-ops-owner` | 4 | 0 | 0 | 4 |

## 5. 产物说明

每个 owner packet 包含：

- Markdown：带 frontmatter、boundary、counts、closure inputs 和 open items 表。
- CSV：统一列结构，包含 `packet_owner`、`packet_type`、`gate_id`、`target_ref`、`metric_code`、`metric_name`、`current_status`、`required_decision`、`required_evidence_fields`、`resolution_rule`、`boundary_note`。

统一边界：

- `status_mutation=false`
- `source_read_mode=sqlite_read_only`
- `providerCalls=false`
- `productionWrites=false`
- `erpWriteback=false`
- `manual_review_required=true`

## 6. 回归脚本

生成本批 owner packet：

```bash
SCM_MANUAL_GATE_GENERATED_AT="2026-06-30T04:30:00.000Z" \
node scripts/export-manual-gate-resolution-pack.mjs
```

完整验收脚本：

```bash
find . -name '*.pem' -print
node --check scripts/export-manual-gate-resolution-pack.mjs
SCM_MANUAL_GATE_GENERATED_AT="2026-06-30T04:30:00.000Z" node scripts/export-manual-gate-resolution-pack.mjs
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
- `export-manual-gate-resolution-pack.mjs` 复跑通过，输出 `ownerPacketCount=8`、packet 条目总数 `53`，boundary 为 `productionWrites=false / providerCalls=false / erpWriteback=false / localSqliteWrites=false`。
- `git diff --check` 通过。
- `npm run check` 通过。
- `npm run build` 通过。
- `preprod:check` 通过且 hard blockers 为空；manual gates 保持 `manual-p0-owner-signoffs=30`、`manual-p0-field-mappings=18`、`manual-scei-weight-source=1`。
- `smoke:api` 通过；DeepSeek missing-key gate 返回 `503` 且 `providerCallAttempted=false`。
- 抽检 `inventory-ops-owner.md`：`owner_signoff=12`、`field_mapping=6`、`total=18`。
- 抽检 `scm-data-governance-owner.md`：`scei_weight_source=5`、`total=5`。
- 已用 smoke 前快照恢复 `data/governance_workbench.sqlite`，最终 hash 为 `8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92`。
- `smoke:readonly` 通过且 `localSqliteWrites=false`。
- 本地服务已停止，`127.0.0.1:5200` 无残留监听。

## 7. 下一批建议

B65 建议按 packet 进入回执模板层：

1. 为 8 个 owner packet 生成 `receipt-template` CSV，字段固定为 owner、decision_result、evidence_ref、signoff_date、scope、rollback_rule。
2. 新增只读校验脚本验证 receipt 文件格式与必填字段，但在人工回执到位前保持 `status_mutation=false`。
3. 继续维持 `providerCalls=false / productionWrites=false / erpWriteback=false`。
