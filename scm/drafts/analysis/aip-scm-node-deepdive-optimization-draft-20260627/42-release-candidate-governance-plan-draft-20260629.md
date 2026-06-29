---
title: "Release Candidate Governance Plan Draft"
date: "2026-06-29"
status: "executed_via_43_50_local_only"
scope: "Next-batch first-principles plan after pre-production readiness hard gate reached zero"
debt_ids:
  - "release-readiness"
  - "manual-gates"
  - "worktree-governance"
  - "production-readonly-handoff"
depends_on:
  - "41-preproduction-readiness-plan-and-execution-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  actionCeiling: "suggestion_review_replay"
---

# B42 下一批计划：Release Candidate Governance Pack

> 2026-06-29 状态同步：本文件保留 B42 原计划。执行结果已落到 `43`–`50`，其中 `49` 记录 release branch commit/push/PR 状态，`50` 记录 PR closeout 与 manual gate CSV/SQLite handoff。Manual gates 仍未解除，生产部署、provider call、ERP/OMS/WMS writeback 均未执行。

## 1. 第一性原理

上一批已经证明：当前本地版本在 **read-only prototype production** 边界内 hard blockers 为 0。下一批的核心不应继续扩功能，而应把 release candidate 从“本地可跑”推进到“可审计、可审批、可回滚、可由人工授权发布”。

上线前剩余工作可分成四类：

| 类别 | 本质问题 | 是否能由代码自动完成 |
|---|---|---|
| Release 边界 | 哪些改动属于同一个发布候选包，哪些不属于 | 可由 Codex 盘点和出 manifest，但不能自动 stage/commit |
| Manual gates | owner sign-off、字段映射、SCEI 权重来源 | 不能自动完成，只能生成审批包 |
| Production handoff | 运维应执行哪些命令、如何回滚、如何验收 | 可生成 runbook，不执行生产 |
| Scope freeze | 继续 T8 拆分还是冻结候选版本 | 需要人工选择；默认发布前冻结业务代码 |

## 2. 当前事实输入

| 输入 | 当前值 |
|---|---|
| preprod hard blockers | 0 |
| preprod manual gates | 3 |
| preprod warning | dirty worktree 53 |
| certified metrics | 20 |
| certified lineage targets | 12 |
| active tags | 8 |
| recommendation cards | 15 |
| agent traces | 61 |
| production write/provider/ERP boundary | 全 false |
| 本轮目标 | 只规划下一批，不执行生产，不 stage/commit |

Manual gates：

| gate | 当前值 | 下一批处理 |
|---|---:|---|
| P0 owner sign-offs | 30 | 生成 owner approval packet，不代签。 |
| P0 field mappings | 18 | 生成 field mapping evidence request，不编造映射。 |
| SCEI weight source | 1 | 生成 SCEI weight decision packet，不填权重。 |

## 3. 成功定义

下一批完成不等于生产上线。下一批完成定义为：

1. 有一个可审计 release candidate manifest，明确包含文件、排除文件、证据来源、验证命令。
2. 有一个 manual gate packet，列出 owner sign-off、field mapping、SCEI weight source 的审批对象、输入材料和接受标准。
3. 有一个 production read-only handoff runbook，包含部署前检查、部署命令、部署后只读 smoke、回滚命令和停止条件。
4. 有一个 clean release branch / PR staging 计划，能把当前 dirty worktree 拆成最小安全批次。
5. 全部仍保持 `productionWrites=false` / `providerCalls=false` / `erpWriteback=false`。

## 4. Milestones

| # | Milestone | Owner | Success Criteria |
|---|---|---|---|
| M1 | Release scope frozen | Codex + 人工确认 | 发布候选只包含 read-only prototype readiness 相关文件，不混入无关 dirty。 |
| M2 | Manual gate packets ready | Codex | 3 个 manual gates 有审批包、证据入口、接受标准和拒绝后处理。 |
| M3 | Production handoff ready | Codex + Ops | Runbook 可交给运维执行，且包含只读 smoke 与回滚。 |
| M4 | Release PR plan ready | Codex | 一卡一 PR / atomic staging 清单明确，未执行自动提交。 |

## 5. Phase 1：Release Candidate Scope Freeze

| Task | Effort | Owner | Depends On | Done Criteria |
|---|---:|---|---|---|
| B42-1 盘点 dirty worktree | 2h | Codex | 41 preprod gate | 输出 scoped dirty manifest，按 release-critical / support-evidence / unrelated / unknown 分类。 |
| B42-2 定义 release candidate 文件集合 | 2h | Codex | B42-1 | 明确 RC 必含、可选、排除文件；不 stage。 |
| B42-3 生成 RC manifest 草稿 | 3h | Codex | B42-2 | Manifest 包含文件路径、purpose、evidence、rollback note、verification command。 |
| B42-4 定义 freeze rule | 1h | Codex + 人工 | B42-2 | 发布前默认暂停新的 T8 代码拆分，只允许 readiness / docs / release packaging 改动。 |

验收：

```bash
git status --short
find /Users/pray/project/ecom_ana_overview/scm -name '*.pem' -print
```

## 6. Phase 2：Manual Gate Packets

| Task | Effort | Owner | Depends On | Done Criteria |
|---|---:|---|---|---|
| B42-5 Owner sign-off packet | 3h | Codex | B42-1 | 30 个 P0 sign-off 按 owner/metric/domain 分组，生成审批模板。 |
| B42-6 Field mapping evidence request | 4h | Codex | B42-1 | 18 个 P0 field mapping 按 source system 与 metric 分组，列出所需真实字段证据。 |
| B42-7 SCEI weight source packet | 2h | Codex | B42-1 | 给出五维权重所需决策项，不填数值，不做 MECE 平账。 |
| B42-8 Manual gate tracking ledger | 2h | Codex | B42-5/6/7 | 写入 draft ledger，不把 pending 状态改成完成。 |

验收：

```sql
select task_type, priority, status, count(*)
from governance_tasks
where priority='P0'
group by task_type, priority, status;
```

## 7. Phase 3：Production Read-only Handoff

| Task | Effort | Owner | Depends On | Done Criteria |
|---|---:|---|---|---|
| B42-9 Deploy preflight runbook | 3h | Codex + Ops | B42-2 | 包含外部 volume、network、release id、env、healthcheck、backup 命令。 |
| B42-10 Post-deploy readonly smoke plan | 2h | Codex | B42-9 | 明确 `SCM_WORKBENCH_READONLY_BASE_URL=https://... npm run smoke:readonly`、health、CSV HEAD。 |
| B42-11 Rollback plan | 2h | Codex + Ops | B42-9 | 明确 current symlink / compose rollback / DB volume 不覆盖规则。 |
| B42-12 Stop conditions | 1h | Codex | B42-9 | 只要 provider/writeback/open production flags 出现，立即停止并回滚。 |

验收：

```bash
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml config
SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check
```

## 8. Phase 4：Release PR Plan

| Task | Effort | Owner | Depends On | Done Criteria |
|---|---:|---|---|---|
| B42-13 Atomic staging map | 2h | Codex | B42-1/2/3 | 产出 `git add` 路径清单，不执行 staging。 |
| B42-14 PR checklist | 2h | Codex | B42-13 | 包含 check/build/preprod/smoke evidence、SQLite restore evidence、manual gates。 |
| B42-15 PR risk note | 1h | Codex | B42-14 | 明确 local-only 与 production-readonly 的证据边界。 |
| B42-16 Approval prompt | 1h | Codex | B42-14 | 给人工一个明确选择：打 RC PR / 继续处理 manual gates / 暂停。 |

验收：

```bash
git diff --check
npm run check
npm run build
npm run preprod:check
```

## 9. Dependencies Map

```text
41 preprod readiness
  └─> B42-1 dirty manifest
        ├─> B42-2 release file set ──> B42-3 RC manifest ──> B42-13 staging map ──> B42-14 PR checklist
        ├─> B42-5 owner packet ─┐
        ├─> B42-6 mapping packet ├─> B42-8 manual gate ledger
        └─> B42-7 SCEI packet ───┘

B42-2 release file set ──> B42-9 deploy preflight ──> B42-10 smoke plan ──> B42-11 rollback plan
```

Critical path：`B42-1 → B42-2 → B42-3 → B42-13 → B42-14`。

## 10. 风险与缓解

| Risk | Impact | Probability | Mitigation |
|---|---|---:|---|
| dirty worktree 混入无关改动 | High | High | 先 manifest，后 atomic staging；不使用 `git add .`。 |
| manual gates 被误写成完成 | High | Medium | 只生成审批包；SQLite 状态最多标为 `review_packet_ready`。 |
| 生产 Compose 覆盖外部 SQLite volume | High | Medium | 使用 `docker-compose.production.yml`，部署前后检查 volume mount。 |
| 把 local smoke 当生产验收 | High | Medium | 文档和 PR checklist 强制分层：local / production-readonly / live side effect。 |
| 继续 T8 拆分导致 RC 不稳定 | Medium | Medium | 发布前 freeze；T8 后续拆分另开批次。 |

## 11. 下一批不做

| 不做 | 原因 |
|---|---|
| 不执行生产部署 | 需要人工授权和生产窗口。 |
| 不 stage/commit | 当前 worktree 仍需人工确认 atomic grouping。 |
| 不补 SCEI 权重数值 | 缺 owner/文档来源。 |
| 不开放 provider call | 当前目标是 read-only prototype。 |
| 不继续 T8 大块拆分 | Release candidate 前应冻结业务代码面。 |

## 12. 推荐执行顺序

1. 先执行 B42-1/B42-2/B42-3，得到 release candidate manifest。
2. 并行执行 B42-5/B42-6/B42-7，得到 manual gate packets。
3. 执行 B42-9/B42-10/B42-11，得到 production read-only handoff。
4. 执行 B42-13/B42-14/B42-15/B42-16，给出是否进入 RC PR 的人工选择。

## 13. 完成声明模板

下一批完成时只能声明：

> 本地 release candidate governance pack 已准备完成；read-only prototype 可进入人工发布审批。Manual gates 仍未解除，provider/production write/ERP writeback 仍关闭，未执行生产部署。

不能声明：

> 生产已上线、owner 已签字、字段映射已全部认证、SCEI 权重已确认、provider 或 ERP 写回已开放。
