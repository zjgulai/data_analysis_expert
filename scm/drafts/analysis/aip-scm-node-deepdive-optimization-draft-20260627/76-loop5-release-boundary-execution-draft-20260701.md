---
title: "Loop 5 Release Boundary Execution Draft"
doc_type: execution_summary
module: scm
topic: loop5-release-boundary
status: draft_loop5_done_release_boundary_review_required
created: 2026-07-01
updated: 2026-07-01
owner: self
source: codex
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  omsWmsWriteback: false
  gitIndexModified: false
  commitCreated: false
  pushCreated: false
  productionDeploy: false
  actionCeiling: "release_boundary_packet_only"
---

# Loop 5 Release Boundary Execution

## 1. Loop 5 Objective

把 Loop 1-4 的代码、SQLite、本地证据和治理文档收敛成一个可审计的 release packet，明确哪些文件可以进入 RC 评审，哪些必须 hold-out。

本轮只做 release boundary packet 和 temp-index staging preview：

1. 不执行真实 `git add`、commit、push。
2. 不部署生产。
3. 不调用 provider。
4. 不写 ERP/OMS/WMS。
5. 不导入真实业务行。

## 2. Dirty Worktree 分类

| Bucket | Count | 处理 |
|---|---:|---|
| release-critical | 8 | 可进入 RC staging chunk A/B/C。 |
| release-evidence | 4 | Loop 2-5 机器可读证据目录，可作为 RC evidence pack。 |
| provider-gated release support | 1 | `package.json` 已引用，纳入但默认不执行 live provider smoke。 |
| support-evidence | 2 | 可选支持材料，不作为 runtime 必需文件。 |
| hold-out | 19 | 不进入本轮 release packet。 |

## 3. Release Packet 输出

| Artifact | Path | Purpose |
|---|---|---|
| Dirty worktree classification | `tmp/outputs/loop5-release-boundary-20260701/loop5-dirty-worktree-classification-20260701.csv` | 34 个 dirty entries 的分类、chunk 和处理建议。 |
| Historical release file set manifest | `tmp/outputs/loop5-release-boundary-20260701/loop5-release-file-set-manifest-20260701.csv` | 2026-07-01 整合前候选集快照；重编号与脚本加固后不再作为当前 tree hash 证明。 |
| Post-stack reconciliation | `tmp/outputs/loop5-release-boundary-20260701/loop5-post-stack-reconciliation-20260716.json` | 相对 `7101700` 的当前候选文件、大小、SHA-256 与边界对账；清单本身不自哈希。 |
| Atomic staging plan | `tmp/outputs/loop5-release-boundary-20260701/loop5-atomic-staging-plan-20260701.csv` | Chunk A/B/C/D 的 staging 或 hold-out 指令。 |
| Approval options | `tmp/outputs/loop5-release-boundary-20260701/loop5-approval-options-20260701.csv` | PR / manual gate / cleanup / pause 的人工选择。 |
| Temp-index preview | `tmp/outputs/loop5-release-boundary-20260701/loop5-temp-index-preview-20260701.json` | 真实 index 不变的 staging 预演结果。 |
| Evidence summary | `tmp/outputs/loop5-release-boundary-20260701/loop5-evidence-summary-20260701.json` | 机器可读 summary。 |

## 4. RC Inclusion Logic

| Chunk | Include | Reason |
|---|---|---|
| A governance docs | `72`-`76` Loop docs, plus optional `71` business value doc | 形成从能力价值到 Loop execution 的审批链。 |
| B prototype validation | `scripts/import-assets.mjs`, `scripts/smoke-ui.mjs`, `scripts/smoke-deepseek-live.mjs` | 修复 sourceRoot preflight；授权 rebuild 按固定 allowlist 重放 migrations；UI smoke 锁定当前六场景基线；补齐 gated provider smoke 文件但默认不执行。 |
| C local data and evidence | `governance_workbench.sqlite`, Loop 2/3/4/5 output packets | 本地 SQLite ledger 与机器可读 evidence。 |
| D hold-out | 旧删除项、`system_data/`、`skills-lock.json`、父目录分析稿 | 与本轮 read-only RC 没有 ownership proof，避免污染发布边界。 |

## 5. Boundary Statement

| 类型 | 结论 |
|---|---|
| 事实 | 本轮不修改真实 git index；只使用 temp-index 预演 staging。 |
| 事实 | 19 个 hold-out dirty entries 不进入 RC packet。 |
| 事实 | Temp-index staging preview 纳入 33 个路径，blocked staged path 为 0，真实 git index 未改变。 |
| 事实 | provider-gated script 只作为 package contract 补齐，不执行 live provider call。 |
| 推断 | 若人工选择继续 PR，推荐按 Chunk A/B/C 原子 staging，Chunk D 保持不纳入。 |
| 不确定项 | 是否创建新 PR、是否沿用当前 PR #1、是否先清 manual gates 仍需人工选择。 |

## 6. Verification Record

| Check | Result | Evidence |
|---|---|---|
| `npm run check` | passed | TypeScript static check |
| `npm run build` | passed | Vite build, 46 modules transformed |
| `SCM_PREPROD_SCAN_ROOT=... npm run preprod:check` | passed | hard blockers 0；manual gates 3；dirtyCount 34 |
| `git diff --check` | passed | no output |
| `.pem` scan | passed | 0 hits |
| `docker compose ... config` | passed | 45-line rendered config |
| temp-index staging preview | passed | 33 staged paths；blocked staged path 0；real index unchanged |
| `npm run smoke:readonly` before write smoke | passed | `localSqliteWrites=false` |
| `npm run smoke:api` | passed | DeepSeek missing-key gate kept `providerCallAttempted=false` |
| `npm run smoke:ui` | passed after assertion update | 3 desktop widths + interaction screenshots; overflow 0 |
| final `npm run smoke:readonly` after SQLite restore | passed | `localSqliteWrites=false`; `aipScenarios=6`; `recommendations=16` |

SQLite restore evidence:

| Artifact | Path / Value |
|---|---|
| before-smoke SQLite snapshot | `<external-file-history>/ecom_ana_overview_scm/20260701T101900-loop5-smoke/governance_workbench.before-loop5-smoke.sqlite` |
| final SQLite hash | `cb91dd0d63dad2d62d73f7da5c7058254b08ac36feb139921a38121dcf61cc99` |
| restored equals before-smoke snapshot | true |
| UI smoke artifacts | `<external-file-history>/ecom_ana_overview_scm/20260701T101900-loop5-smoke/ui-smoke-artifacts-rerun/` |

Smoke script note:

| Type | Detail |
|---|---|
| 事实 | 2026-07-16 review 发现“当前场景数且不少于 3”无法阻止六场景退化；现已同时断言 health 与矩阵回执均为预期 `6`，未来扩展必须显式更新预期。 |
| 推断 | 这能覆盖 Loop 3 扩展到 6 个 AIP 场景后的合法数据增长，避免发布验证与本地 ledger 增长脱节。 |
| 边界 | 只改验证脚本，不改业务 UI、API 或 SQLite 内容。 |

## 7. Next Gate

人工选择：

| Option | Action | Consequence |
|---|---|---|
| A | 按 Chunk A/B/C 进入真实 staging / PR refresh | 推进 read-only RC，但 manual gates 仍列账。 |
| B | 先处理 manual gates | 不推进 PR，先收 owner sign-off、field mapping、SCEI 权重。 |
| C | 先清 hold-out dirty entries | 不动 RC，先整理历史删除和 source/skill 区域。 |
| D | 暂停 release，进入 Loop 6 前置确认 | 需要生产 URL、volume/network 与只读 smoke 授权。 |
