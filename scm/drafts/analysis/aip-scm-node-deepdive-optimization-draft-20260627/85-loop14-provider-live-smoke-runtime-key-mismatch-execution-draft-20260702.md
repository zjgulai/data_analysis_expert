---
title: "Loop 14 Provider Live Smoke Runtime Key Mismatch Execution"
doc_type: execution_log
module: scm
topic: loop14-provider-live-smoke-runtime-key-mismatch
status: draft_loop14_authorized_live_smoke_blocked_runtime_key_missing
created: 2026-07-02
updated: 2026-07-02
owner: self
source: human+ai
evidence_level: authorized_live_gate_preflight
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
  - "84-loop13-provider-live-authorization-hold-gate-execution-draft-20260702.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop14-provider-live-smoke-20260702/deepseek-provider-live-smoke-20260702.json"
---

# Loop 14 Provider Live Smoke Runtime Key Mismatch Execution

## 1. 本轮目标

用户已明确授权一次 `knowledge-mode DeepSeek provider live smoke`，并确认 production server-side `DEEPSEEK_API_KEY` 已配置。

本轮目标是在该授权边界内执行 Loop 14：先复核 production provider status，再运行带 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1` 的 smoke 脚本。若 production status 显示 key 未生效，脚本必须停在 runtime key gate，保持 `providerCalls=false`。

## 2. 前置复核

| 检查项 | 结果 | 证据层级 |
|---|---|---|
| User live authorization | explicit knowledge-mode provider live smoke authorized | conversation authorization |
| User key confirmation | production server-side `DEEPSEEK_API_KEY` confirmed configured | human confirmation |
| Production health GET | HTTP 200 | production read-only GET |
| Production provider status GET | HTTP 200 | production read-only GET |
| Production provider configured | `false` | production read-only GET |

事实：人工确认与 production status endpoint 不一致。继续执行 smoke 脚本时，必须以 runtime status endpoint 为执行真相。

## 3. 执行命令

工作目录：

```bash
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0
```

命令：

```bash
SCM_WORKBENCH_BASE_URL=https://scm.lute-tlz-dddd.top \
SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1 \
SCM_DEEPSEEK_LIVE_EVIDENCE_PATH=tmp/outputs/loop14-provider-live-smoke-20260702/deepseek-provider-live-smoke-20260702.json \
npm run smoke:deepseek-live
```

## 4. 结果

| 检查项 | 结果 | 证据层级 |
|---|---|---|
| Smoke script status | `blocked_runtime_key_missing` | authorized live gate preflight |
| Provider status endpoint | `configured=false` | evidence JSON |
| Provider call | `providerCalls=false`、`providerModeCalled=not_called` | evidence JSON |
| Web mode | `webModeCalled=false` | evidence JSON |
| Write boundary | `productionWrites=false`、`erpWriteback=false`、`localSqliteWrites=false` | evidence JSON |
| Provider key persistence | `deepseekApiKeyPersisted=false` | evidence JSON |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop14-provider-live-smoke-20260702/deepseek-provider-live-smoke-20260702.json
```

## 5. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | 用户已给出一次 knowledge-mode provider live smoke 授权。 |
| 事实 | production status endpoint 返回 `configured=false`，脚本停在 `blocked_runtime_key_missing`。 |
| 事实 | 本轮未执行 provider live call，未 POST chat，未写生产业务数据，未回写 ERP/OMS/WMS，未读取源系统，未导入业务行。 |
| 事实 | evidence 显示 `providerCalls=false`、`providerModeCalled=not_called`、`productionWrites=false`、`localSqliteWrites=false`。 |
| 推断 | production server-side key 尚未被当前运行中的 workbench runtime 识别；可能需要 Ops 检查环境变量注入、容器重启或部署实例一致性。 |
| 不确定项 | 尚未验证真实 DeepSeek 响应、trace/run 写入、usage 计量、latency、回答质量与 live evidence redaction。 |

## 6. 下一 Gate

Loop 15 进入条件：

1. Ops 复核 production runtime 对 `DEEPSEEK_API_KEY` 的实际可见性；
2. production `/api/ai-chat/deepseek/status` 返回 `configured=true`；
3. 用户重新确认一次 knowledge-mode provider live smoke 授权；
4. 继续保持 web mode closed、ERP/OMS/WMS writeback closed、production business writes closed。
