---
title: "Loop 18 DeepSeek Billing vs Runtime Key Gate Execution"
doc_type: execution_log
module: scm
topic: loop18-deepseek-billing-vs-runtime-key-gate
status: draft_loop18_blocked_runtime_key_absent_billing_user_reported_unverified
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
  - "88-loop17-provider-live-smoke-gate-recheck-execution-draft-20260702.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop18-deepseek-billing-vs-runtime-key-gate-20260702/deepseek-billing-vs-runtime-key-gate-20260702.json"
---

# Loop 18 DeepSeek Billing vs Runtime Key Gate Execution

## 1. 本轮目标

用户确认“DeepSeek API key 已经充值”，并同意进入下一步。本轮将这个输入拆成两个 gate：

1. **Billing / quota gate**：用户确认已充值，这是 conversation evidence；
2. **Runtime key gate**：生产服务必须实际看到 `DEEPSEEK_API_KEY`，这是 production runtime evidence。

只有第二个 gate 变为 `configured=true` 后，才进入 knowledge-mode provider live smoke。

## 2. 执行动作

| 动作 | 结果 | 证据层级 |
|---|---|---|
| 记录用户充值确认 | 已确认充值 | conversation evidence |
| GET production `/api/ai-chat/deepseek/status` | HTTP 200，`configured=false` | production read-only GET |
| GET production `/api/deploy/health` | HTTP 200，服务健康 | production read-only GET |
| 本地 env presence check | 本地没有 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL` 或 provider 授权 flag 常驻值 | local env presence check |
| SSH 只读检查 Node runtime env | `keyPresent=false`，`model=null`，`baseUrlPresent=false` | production remote read-only shell |
| SSH 只读检查容器 env 文件 | `/app/.env` absent，`/app/.env.local` absent | production remote read-only shell |
| SSH 只读检查当前 release 候选 env 文件 | `.env` 存在但不含 key；`.env.local`、`.env.production.local`、`docker-compose.override.yml` absent | production remote read-only shell |
| SSH 只读检查 shell env | `DEEPSEEK_API_KEY` absent，相关 DeepSeek env absent | production remote read-only shell |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop18-deepseek-billing-vs-runtime-key-gate-20260702/deepseek-billing-vs-runtime-key-gate-20260702.json
```

## 3. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 未验证输入 | 用户口头确认 DeepSeek 充值完成；本轮没有 DeepSeek 账户侧账单或额度证据，不能视为 provider/account 已验证事实。 |
| 事实 | 当前 production provider status 仍为 `configured=false`。 |
| 事实 | 当前生产 Node runtime、容器 env 文件、当前 release 候选 env 文件和 SSH shell env 仍没有可见 `DEEPSEEK_API_KEY`。 |
| 事实 | 本轮没有执行 provider live smoke、production env mutation、container restart/recreate、production business write、ERP/OMS/WMS writeback 或 local SQLite write。 |
| 推断 | 充值只解除 billing/quota 风险，不解除 runtime key visibility blocker；继续 provider live smoke 仍会停在 runtime key gate。 |
| 不确定项 | 真实 key 是否已经在 DeepSeek 控制台可用、是否在外部 secret manager 中配置、是否由 Ops 配在另一台机器，本轮无法从当前生产 runtime 验证。 |

## 4. Gate 结论

**Loop 18 停在 `blocked_runtime_key_absent_billing_user_reported_unverified`。** 历史标签 `blocked_billing_confirmed_runtime_key_absent` 已废弃，因为它会把用户口头输入误写成账户侧已验证事实。

本轮没有进入 provider call，因为 `configured=true` 前置条件未满足。下一步必须把真实 `DEEPSEEK_API_KEY` 注入当前生产 runtime；billing 口头确认不能替代 provider、数据库写入或运行时门禁。

## 5. 可执行的 Ops 输入

下一步需要完成其一：

1. 在受限 Ops inventory 指定的 production app root 与 server-side secret/env 路径配置真实 `DEEPSEEK_API_KEY`，并重建或重启容器；
2. 或把真实 key 配入容器运行时环境，使 Node runtime `keyPresent=true`；
3. 或提供 `/api/ai-chat/deepseek/status` 返回 `configured=true` 的只读证据。

满足后仍需分别取得本次明确的 knowledge-mode live-call approval 与目标 workbench SQLite trace/run 写入授权，并由新鲜 status 证明 `providerCallAuthorized=true`、`configured=true`、`databaseWriteAuthorized=true`、`available=true`；只在单次命令内设置 client flag，才可执行 knowledge-mode provider live smoke。
