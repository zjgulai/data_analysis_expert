---
title: "Loop 8 Provider Runtime Key Gate Execution"
doc_type: execution_log
module: scm
topic: loop8-provider-runtime-key-gate
status: draft_loop8_provider_runtime_key_gate_done_live_not_called
created: 2026-07-01
updated: 2026-07-01
owner: self
source: human+ai
evidence_level: local_authorized_flag_key_gate
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
  - "78-loop7-provider-gate-preflight-execution-draft-20260701.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop8-provider-runtime-key-gate-20260701/deepseek-live-runtime-key-gate-20260701.json"
---

# Loop 8 Provider Runtime Key Gate Execution

## 1. 本轮目标

Loop 7 已验证未授权状态下会停在 `blocked_authorization_flag_missing`。本轮向前推进一个 gate：在单次命令中设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1`，验证 runtime 未配置 `DEEPSEEK_API_KEY` 时，脚本是否停在 key gate，并保持 `providerCalls=false`。

本轮仍然不执行 provider live call，不调用 web mode，不写生产，不回写 ERP/OMS/WMS，不读取源系统。

## 2. 前置确认

| 检查项 | 结果 |
|---|---|
| 常驻 `DEEPSEEK_API_KEY` | `DEEPSEEK_API_KEY_PRESENT=0` |
| 常驻 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED` | `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED_PRESENT=0` |
| 本地 API port | `5208` 未被占用 |

## 3. 执行命令

工作目录：

```bash
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0
```

本地 API：

```bash
PORT=5208 npm run start
```

Runtime key gate：

```bash
SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5208 \
SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1 \
SCM_DEEPSEEK_LIVE_EVIDENCE_PATH=tmp/outputs/loop8-provider-runtime-key-gate-20260701/deepseek-live-runtime-key-gate-20260701.json \
npm run smoke:deepseek-live
```

## 4. 结果

| 检查项 | 结果 | 证据层级 |
|---|---|---|
| Provider authorization flag | 单次命令内已设置 `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1` | local command env |
| Runtime key | `DEEPSEEK_API_KEY` 未配置 | local API status |
| DeepSeek status endpoint | `configured=false`；`secretPolicy=server_side_env_only_key_never_returned_to_browser` | local API GET |
| Runtime key gate | `blocked_runtime_key_missing` | local key gate |
| Provider call | `providerCalls=false`、`providerModeCalled=not_called` | local evidence JSON |
| SQLite | hash 保持 `cb91dd0d63dad2d62d73f7da5c7058254b08ac36feb139921a38121dcf61cc99` | local file hash |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop8-provider-runtime-key-gate-20260701/deepseek-live-runtime-key-gate-20260701.json
```

## 5. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | 授权 flag 在单次 smoke 命令中已设置。 |
| 事实 | runtime key 未配置，脚本停在 `blocked_runtime_key_missing`。 |
| 事实 | evidence 显示 `providerCalls=false`、`providerModeCalled=not_called`、`webModeCalled=false`、`localSqliteWrites=false`。 |
| 事实 | 本轮没有 production write、provider call、ERP/OMS/WMS writeback、source system read、business row import，也没有持久化 key。 |
| 推断 | 当前 provider live gate 的第二道 fail-closed 行为成立：授权 flag 已给出但 runtime key 缺失时，脚本不会进入 POST provider 分支。 |
| 不确定项 | 真实 DeepSeek 响应质量、trace/run 写入、usage 计量、latency 和 evidence redaction 仍需在 server-side key 配置后验证。 |

## 6. 下一 Gate

下一层只能是 **authorized live side effect**：

1. server-side runtime 提供 `DEEPSEEK_API_KEY`。
2. 明确允许单 prompt knowledge mode live call。
3. 保持 web mode closed。
4. 验收 evidence redacted、trace/run 生成、`productionWrites=false`、`erpWriteback=false`。
