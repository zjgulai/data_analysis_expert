---
title: "Loop 19 Production Runtime Key Injection Ops Handoff"
doc_type: ops_handoff
module: scm
topic: loop19-production-runtime-key-injection-ops-handoff
status: draft_loop19_handoff_ready_manual_secret_input_required
created: 2026-07-02
updated: 2026-07-02
owner: self
source: human+ai
evidence_level: ops_handoff_no_runtime_mutation
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
  remoteShellExecuted: false
  envMutationExecuted: false
  containerRestartExecuted: false
related:
  - "72-loop-engineering-execution-plan-draft-20260701.md"
  - "89-loop18-deepseek-billing-vs-runtime-key-gate-execution-draft-20260702.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop19-production-runtime-key-injection-ops-handoff-20260702/key-injection-ops-handoff-20260702.json"
---

# Loop 19 Production Runtime Key Injection Ops Handoff

## 1. 本轮目标

Loop 18 已确认：DeepSeek 充值只覆盖 billing/quota gate，当前 production runtime 仍没有可见 `DEEPSEEK_API_KEY`。Loop 19 的目标不是继续重复 smoke，而是给 Ops 一个可执行、可回滚、可验收的 **server-side key injection handoff packet**。

本轮不执行生产配置修改、不重启容器、不调用 provider。

## 2. 当前状态

| 类型 | 结论 | 证据层级 |
|---|---|---|
| 事实 | production `/api/ai-chat/deepseek/status` fresh GET 仍返回 `configured=false`。 | production read-only GET |
| 事实 | 应用从 Node runtime env 读取 `DEEPSEEK_API_KEY`，也会在容器内 `/app/.env`、`/app/.env.local` 存在时加载。 | local code inspection |
| 事实 | 当前 Compose 未声明 `DEEPSEEK_API_KEY` 或 `env_file`。 | local config inspection |
| 推断 | 最小可控方案是新增生产机本地 secret file + compose override，把 key 注入容器 env，再重建当前服务容器。 | config pattern |
| 不确定项 | 真实 key 值不在当前会话、仓库或生产 runtime 中；必须由 Ops 在服务器交互式输入。 | manual secret input required |

## 3. 执行边界

| 项 | 边界 |
|---|---|
| 允许 | Ops 在生产服务器交互式输入真实 key，写入 root/ubuntu 可控的 server-side secret file。 |
| 允许 | 使用额外 Compose override 注入 env，并重建 `scm-governance-workbench` 容器。 |
| 禁止 | 将真实 key 粘贴到聊天、Markdown、git、日志、证据 JSON 或命令行历史。 |
| 禁止 | 在 `configured=true` 前执行 provider live smoke。 |
| 禁止 | 修改业务数据库、ERP/OMS/WMS、local SQLite 或生产业务数据。 |

## 4. Ops 执行命令

以下命令需要在生产服务器上由 Ops 执行。真实 key 只在交互式 prompt 中输入，不进入本文档。

### 4.1 进入目标目录

```bash
ssh tencent-lighthouse
cd /opt/scm-governance-workbench/current
```

### 4.2 预检查

```bash
docker ps --filter name=scm-governance-workbench
curl -fsS https://scm.lute-tlz-dddd.top/api/ai-chat/deepseek/status
```

### 4.3 创建 server-side secret file

```bash
set +o history
umask 077
sudo install -d -m 700 /opt/scm-governance-workbench/secrets
read -rsp "Paste DeepSeek API key: " DEEPSEEK_RUNTIME_KEY
printf "\n"

{
  printf "%s=%s\n" "DEEPSEEK_API_KEY" "$DEEPSEEK_RUNTIME_KEY"
  printf "%s=%s\n" "DEEPSEEK_MODEL" "deepseek-v4-flash"
  printf "%s=%s\n" "DEEPSEEK_WEB_MODEL" "deepseek-v4-pro"
  printf "%s=%s\n" "DEEPSEEK_ENABLE_WEB_SEARCH" "true"
} | sudo tee /opt/scm-governance-workbench/secrets/deepseek.env >/dev/null

unset DEEPSEEK_RUNTIME_KEY
sudo chmod 600 /opt/scm-governance-workbench/secrets/deepseek.env
set -o history
```

### 4.4 创建 Compose override

```bash
cat > docker-compose.deepseek-runtime.yml <<'YAML'
services:
  scm-governance-workbench:
    env_file:
      - /opt/scm-governance-workbench/secrets/deepseek.env
YAML
```

### 4.5 重建当前容器

```bash
docker compose -p scm_governance_workbench \
  -f docker-compose.yml \
  -f docker-compose.production.yml \
  -f docker-compose.deepseek-runtime.yml \
  config | grep -E "env_file|DEEPSEEK" || true

docker compose -p scm_governance_workbench \
  -f docker-compose.yml \
  -f docker-compose.production.yml \
  -f docker-compose.deepseek-runtime.yml \
  up -d --no-build --force-recreate scm-governance-workbench
```

### 4.6 验收

```bash
docker exec scm-governance-workbench node -e \
  'console.log(JSON.stringify({keyPresent:Boolean(process.env.DEEPSEEK_API_KEY), model:process.env.DEEPSEEK_MODEL||null, webModel:process.env.DEEPSEEK_WEB_MODEL||null}))'

curl -fsS https://scm.lute-tlz-dddd.top/api/deploy/health
curl -fsS https://scm.lute-tlz-dddd.top/api/ai-chat/deepseek/status
```

通过标准：

| 检查 | 目标 |
|---|---|
| Node runtime | `keyPresent=true` |
| Status endpoint | `configured=true` |
| Health endpoint | `ok=true` |
| Provider call | 仍未执行，直到下一轮单独授权 live smoke |

## 5. 回滚命令

如容器重建后 health 异常，按以下方式移除 override 并回到无 key 注入状态：

```bash
cd /opt/scm-governance-workbench/current
mv docker-compose.deepseek-runtime.yml docker-compose.deepseek-runtime.yml.disabled.$(date +%Y%m%d%H%M%S)

docker compose -p scm_governance_workbench \
  -f docker-compose.yml \
  -f docker-compose.production.yml \
  up -d --no-build --force-recreate scm-governance-workbench

curl -fsS https://scm.lute-tlz-dddd.top/api/deploy/health
```

如需同时撤销 secret file，先确认不再需要该 key，再由 Ops 执行安全删除。

## 6. 下一 Gate

Ops 完成注入并提供以下任一证据后，进入下一轮：

1. `/api/ai-chat/deepseek/status` 返回 `configured=true`；
2. `docker exec` 布尔检查返回 `keyPresent=true`；
3. health endpoint 仍为 `ok=true`。

下一轮才执行一次 knowledge-mode provider live smoke，并继续保持 `productionWrites=false`、`erpWriteback=false`、`localSqliteWrites=false`。
