---
title: "Loop 7 Provider Gate Preflight Execution"
doc_type: execution_log
module: scm
topic: loop7-provider-gate-preflight
status: draft_loop7_provider_gate_preflight_done_live_not_called
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
evidence_level: local_gate_preflight
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
  - "77-loop6-production-readonly-smoke-execution-draft-20260701.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop7-provider-gate-preflight-20260701/deepseek-live-gate-preflight-20260701.json"
---

# Loop 7 Provider Gate Preflight Execution

## 1. 本轮目标

Loop 7 原计划是 Provider 单点验收；该动作属于 live side effect，必须同时满足：

1. 人工授权 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`。
2. `DEEPSEEK_API_KEY` 仅存在于 server-side runtime。
3. 仅执行单 prompt knowledge mode smoke。
4. evidence 必须 redacted。
5. 不做 web mode，不做外部写入，不证明生产业务事实。

本轮只执行 **provider gate preflight**：验证未授权、无 key 时系统是否停在门禁层，并确认不会发起 provider call。

## 2. 执行命令

工作目录：

```bash
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0
```

本地 API：

```bash
PORT=5207 npm run start
```

门禁预检：

```bash
SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5207 \
SCM_DEEPSEEK_LIVE_EVIDENCE_PATH=tmp/outputs/loop7-provider-gate-preflight-20260701/deepseek-live-gate-preflight-20260701.json \
npm run smoke:deepseek-live
```

## 3. 结果

| 检查项 | 结果 | 证据层级 |
|---|---|---|
| 授权变量 | `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED` 未设置 | local env presence check |
| Runtime key | `DEEPSEEK_API_KEY` 未设置 | local env presence check |
| DeepSeek status endpoint | 可读；`configured=false`；`secretPolicy=server_side_env_only_key_never_returned_to_browser` | local API GET |
| Provider gate | `blocked_authorization_flag_missing` | local gate preflight |
| Provider call | `providerCalls=false`、`providerModeCalled=not_called` | local evidence JSON |
| SQLite | hash 保持 `cb91dd0d63dad2d62d73f7da5c7058254b08ac36feb139921a38121dcf61cc99` | local file hash |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop7-provider-gate-preflight-20260701/deepseek-live-gate-preflight-20260701.json
```

## 4. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | 本轮没有设置 provider 授权变量，没有提供或读取明文 key。 |
| 事实 | `smoke:deepseek-live` 停在 `blocked_authorization_flag_missing`，证据中 `providerCalls=false`、`providerModeCalled=not_called`、`webModeCalled=false`。 |
| 事实 | 本轮没有 production write、provider call、ERP/OMS/WMS writeback、source system read、business row import。 |
| 推断 | Provider 单点验收脚本具备 fail-closed 门禁：未授权时不会进入 live call 分支。 |
| 不确定项 | 未验证真实 DeepSeek provider 返回质量、trace/run 写入结果、usage 计量和 latency；这些只能在单独授权并配置 server-side key 后验证。 |

## 5. 下一 Gate

若要从 preflight 进入 live provider 单点验收，需要新的明确授权，并满足：

1. 在 server-side runtime 设置 `DEEPSEEK_API_KEY`，不得写入仓库、文档或证据正文。
2. 明确允许本地单 prompt knowledge mode provider call。
3. 设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`。
4. 执行后检查 evidence redaction、trace/run ID、`providerCalls=true` 的范围说明，以及 `productionWrites=false` / `erpWriteback=false`。
