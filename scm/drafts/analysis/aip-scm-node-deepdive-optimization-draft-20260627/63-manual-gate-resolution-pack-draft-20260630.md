---
title: "SCM Manual Gate Resolution Pack"
doc_type: execution_evidence
module: scm
topic: "manual-gate-resolution-pack"
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: codex
boundary: "manual-gate evidence pack only; SQLite read-only source; no status mutation; no owner signoff fabrication; no provider call; no production write; no ERP/WMS/TMS writeback"
base_branch: "codex/scm-risk-radar-second-pass-20260630"
summary_json: "drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-resolution-summary-20260630.json"
---

# SCM Manual Gate Resolution Pack

## 1. 结论先行

B63 从 UI proof 切回上线前可信债收口，目标是把 `preprod:check` 中剩余的 3 类 manual gates 拆成可审材料，而不是绕过人工门禁。本批新增一个只读导出脚本，从本地 SQLite 生成 owner 可消费的 intake CSV 与 summary JSON；不修改 `governance_tasks` 状态，不把任何待确认项标成已完成。

事实：

- 新增脚本：`drafts/prototypes/scm-data-governance-workbench-v0/scripts/export-manual-gate-resolution-pack.mjs`
- 新增 owner signoff intake：`drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-owner-signoff-intake-20260630.csv`
- 新增 field mapping intake：`drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-field-mapping-intake-20260630.csv`
- 新增 SCEI weight intake：`drafts/prototypes/scm-data-governance-workbench-v0/data/manual-gate-scei-weight-intake-20260630.csv`
- 新增 summary：`drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/manual-gate-resolution-summary-20260630.json`
- `ownerSignoffOpen=30`
- `fieldMappingOpen=18`
- `sceiWeightSourceOwnerDecisionPacketsReady=1`
- `sceiWeightChildrenAwaitingOwnerWeights=5`
- 导出脚本使用 `DatabaseSync(..., { readOnly: true })`。
- 导出后 `data/governance_workbench.sqlite` hash 仍为 `8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92`。

推断：

- `manual-p0-owner-signoffs` 的真实阻塞不是技术缺失，而是 30 个 L3 P0 指标缺少具名 owner、签核日期、口径版本和 evidence receipt。
- `manual-p0-field-mappings` 的真实阻塞是 18 个 P0 指标仍缺少具体 `source_system/source_table/source_field/join_key/grain/refresh_cadence`。
- `manual-scei-weight-source` 的真实阻塞是五维 SCEI 顶层权重没有 owner 给出的五个合计 1.0 的数值与依据；已有证据只支持历史两轴 cost 50% + fulfillment 50%，不能自动外推成五维权重。

不确定项：

- 本批无法关闭 manual gates，因为没有新增人工签核回执、源系统字段回执或 SCEI 权重审批。
- 本批没有接生产库、没有读取真实 ERP/WMS/TMS 源系统、没有调用 provider。
- `preprod:check` 仍会报告三项 manual gates；这是正确状态，不是本批遗漏。

## 2. 完整 Todo

| Step | 工作 | 状态 | 验收 |
|---|---|---|---|
| B63-1 | 核验 #11 基线、创建 stacked 工作分支，并隔离主 worktree dirty | done | #11 为 draft/open/clean；新分支 `codex/scm-manual-gate-resolution-pack-20260630` |
| B63-2 | 只读盘点 manual gates 来源 | done | SQLite 查询得到 `30 + 18 + 1` |
| B63-3 | 生成 manual-gate resolution pack | done | 3 份 CSV + 1 份 JSON；SQLite hash 不变 |
| B63-4 | 更新总纲索引和 B63 执行证据 | done | 本文件 + `00-index` |
| B63-5 | 跑 check/build/preprod/smoke/audit | done | 回归命令全部通过，SQLite hash 保持不变 |
| B63-6 | 提交、推送并创建 stacked draft PR | pending | PR base 指向 B62/#11 分支 |

## 3. 代码图谱依据

`codebase-memory-mcp` 显示：

- manual gate 判定集中在 `scripts/preprod-check.mjs`。
- `server/index.mjs` 的 `/api/governance/tasks` 与 `LineagePanel` 只读展示 `governance_tasks`，本批不需要修改 UI 或 server 行为。
- 允许通过 tooling/content 生成 CSV/JSON evidence pack，不需要触碰 `main.tsx`。

关键 SQL 判定：

```sql
select count(*) from governance_tasks
where priority='P0'
  and task_type='owner_signoff'
  and status in ('未发起','待确认');

select count(*) from governance_tasks
where priority='P0'
  and task_type='field_mapping'
  and status in ('未发起','待确认');

select count(*) from governance_tasks
where id='aip_20260627_d_p1_05_scei_weight_source_required'
  and status='owner_decision_packet_ready';
```

## 4. 产物说明

### 4.1 Owner Signoff Intake

`manual-gate-owner-signoff-intake-20260630.csv`：

- 30 行。
- 每行包含 `gate_id`、`target_ref`、`metric_code`、`metric_name`、`metric_owner_current`、`required_decision`。
- `required_evidence_fields` 固化为：`owner; signoff_date; scope; definition_version; denominator; grain; exception_rules; evidence_ref`。
- `resolution_rule` 固化为：`do_not_mark_confirmed_until_named_owner_supplies_signoff_receipt`。

### 4.2 Field Mapping Intake

`manual-gate-field-mapping-intake-20260630.csv`：

- 18 行。
- owner 分布：仓储运营 3、库存运营 6、数据治理 3、财务/成本 6。
- `required_evidence_fields` 固化为：`source_system; source_table; source_field; join_key; grain; refresh_cadence; field_owner; sample_extract_ref`。
- `resolution_rule` 固化为：`do_not_mark_confirmed_until_source_fields_are_named_and_owner_receipt_exists`。

### 4.3 SCEI Weight Intake

`manual-gate-scei-weight-intake-20260630.csv`：

- 5 行，对应 `供应链综合效能指数` 的五个 L0 子项。
- 当前 `current_weight` 保持空。
- `proposed_weight`、`basis_type`、`basis_description`、`owner`、`signoff_date`、`evidence_ref`、`decision_result` 保持空。
- `boundary_note` 固化为：`weights_must_sum_to_1_and_remain_blank_until_owner_signoff`。

## 5. 回归脚本

生成本批内容包：

```bash
SCM_MANUAL_GATE_GENERATED_AT="2026-06-30T04:00:00.000Z" \
node scripts/export-manual-gate-resolution-pack.mjs
```

完整验收脚本：

```bash
find . -name '*.pem' -print
node --check scripts/export-manual-gate-resolution-pack.mjs
SCM_MANUAL_GATE_GENERATED_AT="2026-06-30T04:00:00.000Z" node scripts/export-manual-gate-resolution-pack.mjs
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
- `export-manual-gate-resolution-pack.mjs` 复跑通过，输出计数为 `30/18/1/5`，boundary 为 `productionWrites=false / providerCalls=false / erpWriteback=false / localSqliteWrites=false`。
- `git diff --check` 通过。
- `npm run check` 通过。
- `npm run build` 通过。
- `preprod:check` 通过且 hard blockers 为空；manual gates 仍为 `manual-p0-owner-signoffs=30`、`manual-p0-field-mappings=18`、`manual-scei-weight-source=1`。
- `smoke:api` 通过；DeepSeek missing-key gate 返回 `503` 且 `providerCallAttempted=false`。
- 已用 smoke 前快照恢复 `data/governance_workbench.sqlite`，最终 hash 为 `8d767c623b8f8476fb55aaa4990a3dca885d84cccb82fa428e74d2ee8dad8c92`。
- `smoke:readonly` 通过且 `localSqliteWrites=false`。
- 本地服务已停止，`127.0.0.1:5200` 无残留监听。

## 6. 下一批建议

B64 不建议继续用代码绕开 manual gates。下一步应二选一：

1. 若已有 owner 回执：把 CSV 中的 owner/signoff/evidence_ref 字段填回一个人工回执文件，再由单独 PR 回填 SQLite 或 import source。
2. 若没有 owner 回执：继续做 `manual-gate-owner-packet`，按 owner 拆成四个可发起审批的 Markdown/CSV packet，仍保持 production/provider/writeback 全关。
