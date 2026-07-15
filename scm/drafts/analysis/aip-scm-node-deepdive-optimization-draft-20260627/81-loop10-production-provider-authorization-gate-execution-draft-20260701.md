---
title: "Loop 10 Production Provider Authorization Gate Execution"
doc_type: execution_log
module: scm
topic: loop10-production-provider-authorization-gate
status: draft_loop10_production_provider_authorization_gate_done_live_not_called
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
evidence_level: production_readonly_authorization_gate
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  omsWmsWriteback: false
  localSqliteWrites: false
  sourceSystemRead: false
  businessRowImport: false
  deepseekApiKeyPersisted: false
  providerLiveAcceptanceExecuted: false
related:
  - "72-loop-engineering-execution-plan-draft-20260701.md"
  - "80-loop9-provider-live-readiness-execution-draft-20260701.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop10-production-provider-authorization-gate-20260701/deepseek-live-production-authorization-gate-20260701.json"
---

# Loop 10 Production Provider Authorization Gate Execution

## 1. 本轮目标

Loop 9 已确认生产 provider status 为 `configured=false`。Loop 10 进一步用生产 base URL 执行 `smoke:deepseek-live`，但不设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`，验证生产路径下的授权门禁仍会停在 `blocked_authorization_flag_missing`。

本轮只允许脚本读取生产 provider status，并写本地 evidence；不允许 provider live call、POST chat、生产写入、ERP/OMS/WMS 回写、源系统读取或业务行导入。

## 2. 执行命令

工作目录：

```bash
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0
```

命令：

```bash
SCM_WORKBENCH_BASE_URL=https://scm.lute-tlz-dddd.top \
SCM_DEEPSEEK_LIVE_EVIDENCE_PATH=tmp/outputs/loop10-production-provider-authorization-gate-20260701/deepseek-live-production-authorization-gate-20260701.json \
npm run smoke:deepseek-live
```

## 3. 结果

| 检查项 | 结果 | 证据层级 |
|---|---|---|
| Base URL | `https://scm.lute-tlz-dddd.top` | production read-only |
| Authorization flag | 未设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1` | local command env |
| Provider status endpoint | `configured=false`；`secretPolicy=server_side_env_only_key_never_returned_to_browser` | production GET |
| Authorization gate | `blocked_authorization_flag_missing` | production authorization gate |
| Provider call | `providerCalls=false`、`providerModeCalled=not_called` | local evidence JSON |
| Write boundary | `productionWrites=false`、`erpWriteback=false`、`localSqliteWrites=false` | local evidence JSON |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop10-production-provider-authorization-gate-20260701/deepseek-live-production-authorization-gate-20260701.json
```

## 4. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | 生产 base URL 的 `smoke:deepseek-live` 在未设置授权 flag 时停在 `blocked_authorization_flag_missing`。 |
| 事实 | evidence 显示 `providerCalls=false`、`providerModeCalled=not_called`、`webModeCalled=false`、`productionWrites=false`、`localSqliteWrites=false`。 |
| 事实 | 本轮未执行 provider live call、POST chat、生产写入、ERP/OMS/WMS 回写、source system read 或 business row import。 |
| 推断 | 生产路径下授权门禁有效；授权 flag 是进入 key gate 或 live call 的必要条件。 |
| 不确定项 | 真实 provider call、trace/run 写入、usage 计量、latency 和回答质量仍需 server-side key 与单独 live call 授权。 |

## 5. 下一 Gate

继续推进只能进入两条路径之一：

1. **生产 runtime key gate**：在确认生产 `configured=false` 时，不执行 live call，只记录 key gate 状态。
2. **authorized live side effect**：Ops 配置 server-side key，用户明确授权单 prompt knowledge mode live call，再执行 provider live smoke。
