---
title: "Loop 20 Production Key Injection Scaffold Execution"
doc_type: execution_log
module: scm
topic: loop20-production-key-injection-scaffold
status: draft_loop20_scaffold_ready_manual_secret_file_required
created: 2026-07-02
updated: 2026-07-02
owner: self
source: human+ai
evidence_level: production_config_scaffold_no_secret_no_restart
boundary:
  productionWrites: false
  productionConfigMutation: true
  providerCalls: false
  erpWriteback: false
  omsWmsWriteback: false
  localSqliteWrites: false
  sourceSystemRead: false
  businessRowImport: false
  deepseekApiKeyPersisted: false
  providerLiveAcceptanceExecuted: false
  remoteShellExecuted: true
  envMutationExecuted: false
  containerRestartExecuted: false
related:
  - "72-loop-engineering-execution-plan-draft-20260701.md"
  - "90-loop19-production-runtime-key-injection-ops-handoff-draft-20260702.md"
  - "../../prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop20-production-key-injection-scaffold-20260702/key-injection-scaffold-20260702.json"
---

# Loop 20 Production Key Injection Scaffold Execution

## 1. 本轮目标

用户继续授权下一步后，本轮执行 Loop 19 handoff 中无需真实 key 的前置 scaffold：

1. 创建 production server-side secret 目录；
2. 创建 Compose override 文件；
3. 不创建 secret file；
4. 不重建或重启容器；
5. 不执行 provider call。

## 2. 执行动作

| 动作 | 结果 | 证据层级 |
|---|---|---|
| 创建 `/opt/scm-governance-workbench/secrets` | present | production config scaffold |
| 创建 `/opt/scm-governance-workbench/current/docker-compose.deepseek-runtime.yml` | present | production config scaffold |
| 检查 `/opt/scm-governance-workbench/secrets/deepseek.env` | absent | production read-only check |
| 检查容器状态 | `scm-governance-workbench Up 5 days (healthy)` | production read-only check |
| GET production `/api/ai-chat/deepseek/status` | HTTP 200，`configured=false` | production read-only GET |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop20-production-key-injection-scaffold-20260702/key-injection-scaffold-20260702.json
```

## 3. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 事实 | no-secret scaffold 已在生产服务器落地：secret 目录和 Compose override 文件存在。 |
| 事实 | 真实 secret file 仍不存在，`deepseekApiKeyPersisted=false`。 |
| 事实 | 容器没有重建或重启，`containerRestartExecuted=false`。 |
| 事实 | production provider status 仍为 `configured=false`，`providerCalls=false`。 |
| 推断 | Ops 下一步只需写入真实 secret file，然后使用三份 compose 文件重建当前容器。 |
| 不确定项 | 真实 key 何时输入、重建后 health/status 是否通过，仍需下一轮 production evidence。 |

## 4. 下一 Gate

下一步仍需要 Ops 在服务器交互式写入真实 secret file：

```bash
cd /opt/scm-governance-workbench/current
set +o history
umask 077
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

随后执行容器重建与验收：

```bash
docker compose -p scm_governance_workbench \
  -f docker-compose.yml \
  -f docker-compose.production.yml \
  -f docker-compose.deepseek-runtime.yml \
  up -d --no-build --force-recreate scm-governance-workbench

docker exec scm-governance-workbench node -e \
  'console.log(JSON.stringify({keyPresent:Boolean(process.env.DEEPSEEK_API_KEY), model:process.env.DEEPSEEK_MODEL||null, webModel:process.env.DEEPSEEK_WEB_MODEL||null}))'

curl -fsS https://scm.lute-tlz-dddd.top/api/ai-chat/deepseek/status
```

只有出现 `keyPresent=true` 或 `configured=true` 后，才进入 knowledge-mode provider live smoke。
