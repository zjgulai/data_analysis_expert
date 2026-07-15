---
title: "Loop 16 Production Runtime Key Injection Execution"
doc_type: execution_log
module: scm
topic: loop16-production-runtime-key-injection
status: draft_loop16_blocked_no_production_key_source_available
created: 2026-07-02
updated: 2026-07-02
owner: self
source: human+ai
evidence_level: production_readonly_remote_presence_diagnostic
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
  remoteShellMode: read_only_presence_diagnostic
  envMutationExecuted: false
  containerRestartExecuted: false
related:
  - "72-loop-engineering-execution-plan-draft-20260701.md"
  - "86-loop15-runtime-key-visibility-diagnostic-execution-draft-20260702.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop16-production-runtime-key-injection-20260702/runtime-key-injection-20260702.json"
---

# Loop 16 Production Runtime Key Injection Execution

## 1. 本轮目标

用户已同意进入 Loop 16。Loop 16 原目标是：在生产侧已有真实 `DEEPSEEK_API_KEY` 来源的前提下，把 key 注入正在服务 `scm.lute-tlz-dddd.top` 的 server-side runtime，并在必要时重建或重启 `scm-governance-workbench` 容器。

本轮实际执行采用最小风险路径：

1. 先进入远端做只读 key visibility diagnostic；
2. 只输出布尔值、路径或 redacted 信息，不输出 secret；
3. 只有发现真实可用的 server-side key 来源时，才执行 env 注入和容器重建；
4. 若没有真实 key 来源，则停止在 Ops key input gate。

## 2. 执行动作

| 动作 | 结果 | 证据层级 |
|---|---|---|
| GET production `/api/ai-chat/deepseek/status` | HTTP 200，`configured=false` | production read-only GET |
| GET production `/api/deploy/health` | HTTP 200，服务仍健康 | production read-only GET |
| SSH 进入 `tencent-lighthouse` | 成功，用户 `ubuntu`，目标目录存在 | production remote read-only shell |
| 检查 Compose 渲染结果 | 未发现 `DEEPSEEK` 或 `env_file` 注入项 | production remote read-only shell |
| 检查容器 env | 未发现 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL`、`DEEPSEEK_ENABLE_WEB_SEARCH` | production remote read-only shell |
| 检查 Node runtime env | `keyPresent=false`，`model=null`，`baseUrlPresent=false` | production remote read-only shell |
| 检查容器内 env 文件 | `/app/.env` absent，`/app/.env.local` absent | production remote read-only shell |
| 检查当前 release 候选 env 文件 | `.env` 存在但不含 key，`.env.local` absent，`.env.production.local` absent，`docker-compose.override.yml` absent | production remote read-only shell |
| 检查 SSH shell env | `DEEPSEEK_API_KEY` absent，相关 DeepSeek env absent | production remote read-only shell |
| sudo/root/systemd 常见位置引用搜索 | 未发现真实 key 配置引用；只发现源码、脚本和 `.env.example` 中的变量名 | production remote read-only shell |
| 本地 env presence check | 本地无 `DEEPSEEK_API_KEY` 和授权 flag 常驻值 | local env presence check |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop16-production-runtime-key-injection-20260702/runtime-key-injection-20260702.json
```

## 3. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | 当前公网 status endpoint 仍返回 `configured=false`。 |
| 事实 | 当前可访问生产容器的 env、Node runtime、容器内 `.env/.env.local` 均没有 `DEEPSEEK_API_KEY`。 |
| 事实 | 当前 release 目录 `.env` 文件存在但不含 `DEEPSEEK_API_KEY`；`.env.local`、`.env.production.local`、`docker-compose.override.yml` 不存在。 |
| 事实 | 远端 SSH shell、sudo/root/systemd 常见位置、本地 shell 均没有可直接注入的 `DEEPSEEK_API_KEY` 来源。 |
| 事实 | 本轮没有执行 production env mutation、container restart/recreate、provider call、production business write、ERP/OMS/WMS writeback 或 local SQLite write。 |
| 推断 | 用户侧“production server-side key 已配置”的确认与当前可访问生产 runtime 不一致；最可能原因是 key 配到了错误实例、错误用户/session、未被 Compose 注入、或尚未落到该服务器。 |
| 不确定项 | 真实 key 当前是否存在于外部 secret manager、人工运维终端、另一台服务器或未授权访问路径，本轮无法验证。 |

## 4. 停止原因

**Loop 16 停在 `blocked_no_production_key_source_available`。**

没有真实 key 来源时，继续执行 env 注入只能产生空配置或占位配置，无法让 `/api/ai-chat/deepseek/status` 变为 `configured=true`，也会制造错误的完成证据。因此本轮没有修改生产配置，也没有重启容器。

## 5. 下一 Gate

进入下一步前需要 Ops 完成以下任一动作：

1. 在当前服务器 `/opt/scm-governance-workbench/current` 可用的 server-side secret 文件中配置真实 `DEEPSEEK_API_KEY`；
2. 或确认真实 key 位于哪个 secret manager / 运维路径，并授权读取或注入；
3. 或由 Ops 直接完成容器 env 注入后，重新提供 status endpoint `configured=true` 的只读证据。

只有当 status endpoint 变为 `configured=true` 后，才能再次进入 knowledge-mode provider live smoke gate。
