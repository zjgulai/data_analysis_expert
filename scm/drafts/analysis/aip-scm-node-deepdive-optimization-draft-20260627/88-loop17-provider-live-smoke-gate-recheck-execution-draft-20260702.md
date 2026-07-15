---
title: "Loop 17 Provider Live Smoke Gate Recheck Execution"
doc_type: execution_log
module: scm
topic: loop17-provider-live-smoke-gate-recheck
status: draft_loop17_blocked_configured_false_key_source_absent
created: 2026-07-02
updated: 2026-07-02
owner: self
source: human+ai
evidence_level: production_readonly_provider_gate_recheck
boundary:
  productionWrites: false
  productionConfigMutation: false
  providerCalls: false
  erpWriteback: false
  omsWmsWriteback: false
  localSqliteWrites: false
  sourceSystemRead: false
  businessRowImport: false
  deepseekApiKeyPersisted: false
  providerLiveAcceptanceExecuted: false
  remoteShellExecuted: true
  remoteShellMode: read_only_presence_recheck
  envMutationExecuted: false
  containerRestartExecuted: false
related:
  - "72-loop-engineering-execution-plan-draft-20260701.md"
  - "87-loop16-production-runtime-key-injection-execution-draft-20260702.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop17-provider-live-smoke-gate-recheck-20260702/provider-live-smoke-gate-recheck-20260702.json"
---

# Loop 17 Provider Live Smoke Gate Recheck Execution

## 1. 本轮目标

用户同意进入下一步后，本轮不直接触发 provider call，而是先复核 Loop 16 的下一 gate 是否已经满足：

1. production status endpoint 必须变为 `configured=true`；
2. 当前生产 runtime 必须能看到真实 `DEEPSEEK_API_KEY` 来源；
3. 若前置条件不满足，则不执行 knowledge-mode provider live smoke。

## 2. 执行动作

| 动作 | 结果 | 证据层级 |
|---|---|---|
| GET production `/api/ai-chat/deepseek/status` | HTTP 200，`configured=false` | production read-only GET |
| GET production `/api/deploy/health` | HTTP 200，服务健康 | production read-only GET |
| 本地 env presence check | 本地没有 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL` 或 provider 授权 flag 常驻值 | local env presence check |
| SSH 只读检查 Node runtime env | `keyPresent=false`，`model=null`，`baseUrlPresent=false` | production remote read-only shell |
| SSH 只读检查容器 env 文件 | `/app/.env` absent，`/app/.env.local` absent | production remote read-only shell |
| SSH 只读检查当前 release 候选 env 文件 | `.env` 存在但不含 key；`.env.local`、`.env.production.local`、`docker-compose.override.yml` absent | production remote read-only shell |
| SSH 只读检查 shell env | `DEEPSEEK_API_KEY` absent，相关 DeepSeek env absent | production remote read-only shell |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop17-provider-live-smoke-gate-recheck-20260702/provider-live-smoke-gate-recheck-20260702.json
```

## 3. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | 当前 production provider status 仍为 `configured=false`。 |
| 事实 | 当前生产 Node runtime、容器 env 文件、当前 release 候选 env 文件和 SSH shell env 仍没有可见 `DEEPSEEK_API_KEY`。 |
| 事实 | 本轮没有执行 provider live smoke、production env mutation、container restart/recreate、production business write、ERP/OMS/WMS writeback 或 local SQLite write。 |
| 事实 | `/api/deploy/health` 仍返回服务健康，边界显示 `productionWrites=false`、`providerCalls=false`、`erpWriteback=false`。 |
| 推断 | Loop 16 的 blocker 仍未解除；继续 provider live smoke 只会再次停在 runtime key gate。 |
| 不确定项 | health 中 `agentTraces` 与 `agentRuns` 当前计数较上一轮公开输出有变化；本轮没有 POST 或 provider call，因此该变化不归因于本轮，若影响审计需单独追踪来源。 |

## 4. Gate 结论

**Loop 17 停在 `blocked_configured_false_key_source_absent`。**

未满足 `configured=true` 和真实 key 来源可见两个前置条件，因此没有执行 knowledge-mode provider live smoke。

## 5. 下一步所需输入

下一步不是继续重复 smoke，而是完成以下任一 Ops 输入：

1. 将真实 `DEEPSEEK_API_KEY` 配入当前生产 runtime 可读取的 server-side secret/env 路径；
2. 或提供真实 key 所在的 secret manager / 运维路径，并授权只读确认或注入；
3. 或由 Ops 直接完成注入并提供 `/api/ai-chat/deepseek/status` 返回 `configured=true` 的只读证据。

满足后再进入 knowledge-mode provider live smoke gate。
