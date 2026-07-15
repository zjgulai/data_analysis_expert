---
title: "Loop 6 Production Readonly Smoke Execution Draft"
doc_type: execution_summary
module: scm
topic: loop6-production-readonly-smoke
status: draft_loop6_done_production_readonly_verified
created: 2026-07-01
updated: 2026-07-01
owner: self
source: codex
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  omsWmsWriteback: false
  methods:
    - GET
    - HEAD
  deployExecuted: false
  serverShellAccess: false
  actionCeiling: "production_readonly_smoke_only"
---

# Loop 6 Production Readonly Smoke Execution

## 1. Objective

验证公开生产 URL 的只读健康状态，确认当前线上服务可通过 GET/HEAD 访问核心 health、静态 CSV 和 read-only API。

本轮边界：

1. 只访问 `https://scm.lute-tlz-dddd.top`。
2. 只使用 GET/HEAD。
3. 不登录生产服务器。
4. 不部署、不重启、不写生产。
5. 不调用 provider。
6. 不写 ERP/OMS/WMS。

## 2. Evidence Artifact

| Artifact | Path |
|---|---|
| Production readonly smoke JSON | `tmp/outputs/loop6-production-readonly-smoke-20260701/loop6-production-readonly-smoke-20260701.json` |

## 3. Readonly Probe Results

| Check | Method | Result | Key Evidence |
|---|---|---|---|
| `/api/deploy/health` | GET | passed, 200 | service `scm-data-governance-workbench`; staticBuild true |
| `/fulfillment-dashboard/data/fulfillment_chart_data_binding_20260626.csv` | HEAD | passed, 200 | content-type `text/csv; charset=utf-8` |
| `/` | HEAD | passed, 200 | content-type `text/html; charset=utf-8` |
| `npm run smoke:readonly` with production base URL | GET/HEAD | passed | `localSqliteWrites=false`; `productionWrites=false`; `providerCalls=false`; `erpWriteback=false` |

## 4. Production State Observed

| Field | Value |
|---|---|
| base URL | `https://scm.lute-tlz-dddd.top` |
| release id | `scm-workbench-ui-polish-20260627003850` |
| git sha label | `c1633fe-ui-polish-20260627` |
| data mount type | `docker_external_volume` |
| data volume name | `scm_governance_workbench_scm-governance-data` |
| metrics | 178 |
| governance tasks | 110 |
| AIP scenarios | 3 |
| recommendation cards | 3 |
| agent traces | 1 |
| trace reviews | 0 |

## 5. Boundary Statement

| 类型 | 结论 |
|---|---|
| 事实 | 生产 URL 当前可达，health、静态 CSV HEAD、app HEAD、production `smoke:readonly` 均通过。 |
| 事实 | 生产 health 显示 `productionWrites=false`、`providerCalls=false`、`erpWriteback=false`。 |
| 事实 | 本轮没有执行部署、服务器 shell、POST/PUT/DELETE、provider call 或生产写入。 |
| 推断 | 当前线上 read-only prototype 处于可访问状态，适合作为后续发布对照基线。 |
| 不确定项 | 这不证明 Loop 5 本地 release packet 已上线；生产 release id 仍是 `scm-workbench-ui-polish-20260627003850`。 |
| 不确定项 | 外部 Docker volume 和 network 只通过 health 字段间接确认，未执行生产服务器 `docker inspect`。 |

## 6. Next Gate

Loop 7 是 Provider 单点验收，必须另行授权，并满足：

1. `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`。
2. `DEEPSEEK_API_KEY` 只在 server side runtime。
3. 只做单 prompt knowledge mode smoke。
4. 证据必须 redacted。
5. 不做 web mode，不做外部写入，不证明生产业务事实。
