---
title: "Loop 9 Provider Live Readiness Execution"
doc_type: execution_log
module: scm
topic: loop9-provider-live-readiness
status: draft_loop9_provider_live_readiness_done_live_not_called
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
evidence_level: production_readonly_provider_status
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
  - "79-loop8-provider-runtime-key-gate-execution-draft-20260701.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop9-provider-live-readiness-20260701/provider-live-readiness-20260701.json"
---

# Loop 9 Provider Live Readiness Execution

## 1. 本轮目标

Loop 8 已验证授权 flag 给出但 runtime key 缺失时，脚本停在 `blocked_runtime_key_missing`。Loop 9 的目标是进入 **live-readiness**：只读确认本地 shell 与生产 runtime 的 provider 配置状态，并形成下一步 live smoke 的授权条件。

本轮只执行 GET 读取，不执行 provider live call，不设置生产环境变量，不写生产，不回写 ERP/OMS/WMS，不读取源系统。

## 2. 执行范围

| 范围 | 本轮动作 |
|---|---|
| 本地 shell | 检查 key/auth flag presence，只记录布尔值 |
| 生产 health | `GET https://scm.lute-tlz-dddd.top/api/deploy/health` |
| 生产 provider status | `GET https://scm.lute-tlz-dddd.top/api/ai-chat/deepseek/status` |
| Evidence | 写入 redacted JSON；不包含 key、token、请求头或 provider payload |

## 3. 结果

| 检查项 | 结果 | 证据层级 |
|---|---|---|
| 本地 key presence | `DEEPSEEK_API_KEY_PRESENT=false` | local env presence |
| 本地 auth flag presence | `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=false` | local env presence |
| 生产 health | 200；`productionWrites=false`、`providerCalls=false`、`erpWriteback=false` | production read-only GET |
| 生产 release | `scm-workbench-ui-polish-20260627003850` / `c1633fe-ui-polish-20260627` | production health |
| 生产 provider status | 200；`configured=false`；`secretPolicy=server_side_env_only_key_never_returned_to_browser` | production read-only GET |
| Provider call | `providerCalls=false` | evidence JSON |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop9-provider-live-readiness-20260701/provider-live-readiness-20260701.json
```

## 4. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | 生产 provider status 当前 `configured=false`，说明 production runtime 未暴露可用 provider key 状态。 |
| 事实 | 生产 health 当前仍显示 `productionWrites=false`、`providerCalls=false`、`erpWriteback=false`。 |
| 事实 | 本轮只执行 GET，未执行 provider live call、production write、ERP/OMS/WMS writeback、source system read、business row import，也未持久化 key。 |
| 推断 | 当前环境可以进入 live smoke 的 runbook 准备，但不能进入真实 provider 调用验收。 |
| 不确定项 | DeepSeek 响应质量、trace/run 写入、usage 计量、latency、evidence redaction 的 live 路径仍需 server-side key 与单独 live call 授权。 |

## 5. 下一 Gate

进入 provider live smoke 前，需要全部满足：

1. Ops 在 server-side runtime 设置 `DEEPSEEK_API_KEY`，不得写入仓库、文档、日志或证据正文。
2. 用户明确授权单 prompt knowledge mode live call。
3. 执行时设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`。
4. 仅允许 knowledge mode；web mode 保持 closed。
5. 输出 evidence 必须 redacted，并记录 traceId、runId、usage、answerLength、doesNotProve。
6. 结论只能作为候选知识/建议验收，不升级为生产业务事实。
