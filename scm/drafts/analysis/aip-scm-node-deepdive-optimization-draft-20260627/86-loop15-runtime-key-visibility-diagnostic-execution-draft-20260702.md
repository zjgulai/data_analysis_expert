---
title: "Loop 15 Runtime Key Visibility Diagnostic Execution"
doc_type: execution_log
module: scm
topic: loop15-runtime-key-visibility-diagnostic
status: draft_loop15_runtime_key_visibility_diagnostic_done_remote_mutation_not_executed
created: 2026-07-02
updated: 2026-07-02
owner: self
source: human+ai
evidence_level: production_readonly_config_diagnostic
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
  remoteShellExecuted: false
  envMutationExecuted: false
  containerRestartExecuted: false
related:
  - "72-loop-engineering-execution-plan-draft-20260701.md"
  - "85-loop14-provider-live-smoke-runtime-key-mismatch-execution-draft-20260702.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop15-runtime-key-visibility-diagnostic-20260702/runtime-key-visibility-diagnostic-20260702.json"
---

# Loop 15 Runtime Key Visibility Diagnostic Execution

## 1. 本轮目标

Loop 14 已在明确 live smoke 授权下执行到 runtime key gate，但 production `/api/ai-chat/deepseek/status` 仍返回 `configured=false`，因此没有进入 provider POST 分支。

Loop 15 的目标是做 **read-only runtime key visibility diagnostic**：核对应用实际读取 key 的位置、生产 Compose 是否注入 key、production status endpoint 的当前状态，并形成 Ops 只读命令包。
本轮不执行远端 shell、不改 production env、不重启容器、不调用 provider。

## 2. 诊断动作

| 动作 | 结果 | 证据层级 |
|---|---|---|
| GET production `/api/deploy/health` | HTTP 200 | production read-only GET |
| GET production `/api/ai-chat/deepseek/status` | HTTP 200，`configured=false` | production read-only GET |
| 检查 `server/index.mjs` key 读取路径 | 读取 `process.env.DEEPSEEK_API_KEY`，并加载容器内 `/app/.env`、`/app/.env.local` | local code inspection |
| 检查 `docker-compose.yml` | 未注入 `DEEPSEEK_API_KEY`，未声明 `env_file` | local config inspection |
| 检查 `docker-compose.production.yml` | 未注入 `DEEPSEEK_API_KEY`，未声明 `env_file` | local config inspection |
| 检查 `Dockerfile` | 未设置 `DEEPSEEK_API_KEY` | local config inspection |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop15-runtime-key-visibility-diagnostic-20260702/runtime-key-visibility-diagnostic-20260702.json
```

## 3. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | production provider status endpoint 当前返回 `configured=false`。 |
| 事实 | server 只会从 Node runtime env 或容器内 `.env/.env.local` 读取 `DEEPSEEK_API_KEY`。 |
| 事实 | 当前仓库内 production Compose override 没有把 `DEEPSEEK_API_KEY` 或 `env_file` 注入到容器。 |
| 事实 | 本轮没有执行远端 shell、production env 修改、容器重启、provider call、production write 或 ERP/OMS/WMS writeback。 |
| 推断 | 当前最强 root-cause candidate 是：服务端 key 未进入正在服务 `scm.lute-tlz-dddd.top` 的 Node 进程环境。 |
| 不确定项 | 远端实际 Compose config、container env、`/app/.env.local` 文件存在性和容器最近一次重启时间尚未通过远端只读命令确认。 |

## 4. Ops 只读确认命令

以下命令只输出布尔或 redacted 信息，不输出 secret 正文：

```bash
cd /opt/scm-governance-workbench/current

docker compose -p scm_governance_workbench \
  -f docker-compose.yml \
  -f docker-compose.production.yml \
  config | grep -E "DEEPSEEK|env_file" || true

docker inspect scm-governance-workbench \
  --format "{{range .Config.Env}}{{println .}}{{end}}" \
  | grep -E "^DEEPSEEK_(API_KEY|MODEL|BASE_URL|ENABLE_WEB_SEARCH)=" \
  | sed "s/=.*/=<redacted>/" || true

docker exec scm-governance-workbench node -e \
  "console.log(JSON.stringify({keyPresent:Boolean(process.env.DEEPSEEK_API_KEY), model:process.env.DEEPSEEK_MODEL||null, baseUrlPresent:Boolean(process.env.DEEPSEEK_BASE_URL)}))"

docker exec scm-governance-workbench sh -lc \
  "test -f /app/.env && echo app_env_present || echo app_env_absent; test -f /app/.env.local && echo app_env_local_present || echo app_env_local_absent"

curl -fsS https://scm.lute-tlz-dddd.top/api/ai-chat/deepseek/status
```

## 5. 下一 Gate

Loop 16 需要新的生产操作授权，因为它可能涉及：

1. 将 `DEEPSEEK_API_KEY` 注入 production Compose env 或 ignored env file；
2. 重新创建或重启 `scm-governance-workbench` 容器；
3. 复核 status endpoint 到 `configured=true`；
4. 再次授权一次 knowledge-mode provider live smoke。

在此之前，边界保持 `providerCalls=false`、`productionWrites=false`、`erpWriteback=false`。
