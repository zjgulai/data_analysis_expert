---
title: "Loop 11 Production Provider Runtime Key Gate Execution"
doc_type: execution_log
module: scm
topic: loop11-production-provider-runtime-key-gate
status: draft_loop11_production_provider_runtime_key_gate_done_live_not_called
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
evidence_level: production_runtime_key_gate
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
  - "81-loop10-production-provider-authorization-gate-execution-draft-20260701.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop11-production-provider-runtime-key-gate-20260701/deepseek-live-production-runtime-key-gate-20260701.json"
---

# Loop 11 Production Provider Runtime Key Gate Execution

## 1. 本轮目标

Loop 10 已验证生产路径在未给授权 flag 时会停在 `blocked_authorization_flag_missing`。Loop 11 继续推进一个门禁层级：使用生产 base URL，并在单次命令中设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`，验证生产 runtime 未配置 `DEEPSEEK_API_KEY` 时会停在 `blocked_runtime_key_missing`。

本轮仍然不执行 provider live call，不 POST chat，不写生产，不回写 ERP/OMS/WMS，不读取源系统，不导入业务行。

## 2. 前置确认

| 检查项 | 结果 |
|---|---|
| 常驻 `DEEPSEEK_API_KEY` | `DEEPSEEK_API_KEY_PRESENT=0` |
| 常驻 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED` | `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=0` |

## 3. 执行命令

工作目录：

```bash
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0
```

命令：

```bash
SCM_WORKBENCH_BASE_URL=https://scm.lute-tlz-dddd.top \
SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1 \
SCM_DEEPSEEK_LIVE_EVIDENCE_PATH=tmp/outputs/loop11-production-provider-runtime-key-gate-20260701/deepseek-live-production-runtime-key-gate-20260701.json \
npm run smoke:deepseek-live
```

## 4. 结果

| 检查项 | 结果 | 证据层级 |
|---|---|---|
| Base URL | `https://scm.lute-tlz-dddd.top` | production runtime key gate |
| Authorization flag | 单次命令内设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1` | local command env |
| Server authorization fields | `providerCallAuthorized`、`databaseWriteAuthorized`、`available` 均未被原始 evidence 记录；不能由 command flag 推定 | historical evidence gap |
| Provider status endpoint | `configured=false`；其余 server authorization fields 未记录；`secretPolicy=server_side_env_only_key_never_returned_to_browser` | production GET |
| Runtime key gate | `blocked_runtime_key_missing` | production runtime key gate |
| Provider call | `providerCalls=false`、`providerModeCalled=not_called` | local evidence JSON |
| Write boundary | `productionWrites=false`、`erpWriteback=false`、`localSqliteWrites=false` | local evidence JSON |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop11-production-provider-runtime-key-gate-20260701/deepseek-live-production-runtime-key-gate-20260701.json
```

## 5. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | 生产 base URL 的 `smoke:deepseek-live` 在单次授权 flag 下停在 `blocked_runtime_key_missing`。 |
| 事实 | production provider status 仍为 `configured=false`，secret policy 为 `server_side_env_only_key_never_returned_to_browser`。 |
| 事实 | 原始 evidence 未记录 server-side `providerCallAuthorized`、`databaseWriteAuthorized` 与 `available`；当前 gate 必须在这些字段明确为 true 且取得相应独立授权后才能进入 provider POST。 |
| 事实 | evidence 显示 `providerCalls=false`、`providerModeCalled=not_called`、`webModeCalled=false`、`productionWrites=false`、`localSqliteWrites=false`。 |
| 事实 | 本轮未执行 provider live call、POST chat、production write、ERP/OMS/WMS writeback、source system read 或 business row import。 |
| 推断 | 生产路径下 runtime key gate 有效；server-side key 是进入 live provider call 的必要条件。 |
| 不确定项 | 真实 provider call、trace/run 写入、usage 计量、latency 和回答质量仍需 server-side key 与单独 live call 授权。 |

## 6. 下一 Gate

下一层只能是 **authorized live side effect**：

1. 用户明确授权单 prompt knowledge mode provider live smoke，并仅在单次命令内设置 client flag。
2. production status endpoint 明确返回 `providerCallAuthorized=true`。
3. Ops 在 production/server-side runtime 配置 `DEEPSEEK_API_KEY`，status 返回 `configured=true`；key 不写入仓库、文档、日志或 evidence 正文。
4. 独立批准目标 workbench SQLite 写入并设置 `SCM_DATABASE_WRITES_AUTHORIZED=1`；status 返回 `databaseWriteAuthorized=true` 与 `available=true`。live POST 会写 trace/run。
5. 仅允许 knowledge mode；web mode closed。
6. 输出 redacted evidence，记录 traceId、runId、usage、answerLength、doesNotProve 与实际 workbench SQLite write。
