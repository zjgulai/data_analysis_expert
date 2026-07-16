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
: "${SCM_PRODUCTION_SSH_ALIAS:?set from restricted Ops inventory}"
ssh "${SCM_PRODUCTION_SSH_ALIAS}"

# 在远端 shell 中从受限 Ops inventory 设置以下路径变量；不要提交实际值。
: "${SCM_PRODUCTION_APP_ROOT:?set from restricted Ops inventory}"
: "${SCM_PRODUCTION_SECRET_DIR:?set from restricted Ops inventory}"
export SCM_PRODUCTION_SECRET_FILE="${SCM_PRODUCTION_SECRET_DIR}/deepseek.env"
cd "${SCM_PRODUCTION_APP_ROOT}"
```

### 4.2 预检查

```bash
docker ps --filter name=scm-governance-workbench
curl -fsS https://scm.lute-tlz-dddd.top/api/ai-chat/deepseek/status
```

### 4.3 创建 server-side secret file

```bash
(
set -euo pipefail
set +o history
umask 077
SECRET_DIR="${SCM_PRODUCTION_SECRET_DIR:?set from restricted Ops inventory}"
SECRET_FILE="${SECRET_DIR}/deepseek.env"
SECRET_BACKUP="${SECRET_FILE}.rollback"
SECRET_CANDIDATE=""

cleanup_candidate() {
  unset DEEPSEEK_RUNTIME_KEY
  if [ -n "${SECRET_CANDIDATE}" ]; then
    sudo rm -f -- "${SECRET_CANDIDATE}"
  fi
  set -o history
}
trap cleanup_candidate EXIT
trap 'exit 1' HUP INT TERM

sudo install -d -m 700 "${SECRET_DIR}"
if sudo test -e "${SECRET_BACKUP}"; then
  printf '%s\n' 'Unresolved secret rollback file exists; stop and review it first.' >&2
  exit 1
fi
if ! read -rsp "Paste DeepSeek API key: " DEEPSEEK_RUNTIME_KEY; then
  printf '\n%s\n' 'Secret input interrupted; no replacement written.' >&2
  exit 1
fi
printf "\n"
if [ -z "${DEEPSEEK_RUNTIME_KEY//[[:space:]]/}" ]; then
  printf '%s\n' 'Secret input must be non-empty.' >&2
  exit 1
fi

SECRET_CANDIDATE="$(sudo mktemp "${SECRET_DIR}/.deepseek.env.candidate.XXXXXX")"

{
  printf "%s=%s\n" "DEEPSEEK_API_KEY" "$DEEPSEEK_RUNTIME_KEY"
  printf "%s=%s\n" "DEEPSEEK_MODEL" "deepseek-v4-flash"
  printf "%s=%s\n" "DEEPSEEK_WEB_MODEL" "deepseek-v4-pro"
  printf "%s=%s\n" "DEEPSEEK_ENABLE_WEB_SEARCH" "true"
} | sudo tee "${SECRET_CANDIDATE}" >/dev/null

unset DEEPSEEK_RUNTIME_KEY
sudo chmod 600 "${SECRET_CANDIDATE}"
sudo test -s "${SECRET_CANDIDATE}"
if sudo test -f "${SECRET_FILE}"; then
  sudo cp -p -- "${SECRET_FILE}" "${SECRET_BACKUP}"
  sudo chmod 600 "${SECRET_BACKUP}"
fi
sudo mv -- "${SECRET_CANDIDATE}" "${SECRET_FILE}"
SECRET_CANDIDATE=""
set -o history
trap - EXIT HUP INT TERM
)
```

旧 secret（如存在）保留在 `deepseek.env.rollback`，直到新容器的 health 与 status 均通过；任何失败都按 §5 恢复，不得先删除备份。

### 4.4 创建 Compose override

```bash
cat > docker-compose.deepseek-runtime.yml <<'YAML'
services:
  scm-governance-workbench:
    env_file:
      - ${SCM_PRODUCTION_SECRET_FILE:?set_from_restricted_Ops_inventory}
YAML
```

### 4.5 重建当前容器并验收（fail-closed transaction）

以下事务在任一 `up`、Node presence、health 或 status 检查失败时恢复旧 secret；原先无 secret 时停用 override 并回到两文件 Compose。实际路径只从受限 Ops inventory 注入。

```bash
(
set -euo pipefail
: "${SCM_PRODUCTION_APP_ROOT:?set from restricted Ops inventory}"
: "${SCM_PRODUCTION_SECRET_FILE:?set from restricted Ops inventory}"
cd "${SCM_PRODUCTION_APP_ROOT}"

SECRET_FILE="${SCM_PRODUCTION_SECRET_FILE}"
SECRET_BACKUP="${SECRET_FILE}.rollback"
HAD_PREVIOUS_SECRET=0
if sudo test -f "${SECRET_BACKUP}"; then
  HAD_PREVIOUS_SECRET=1
fi

compose_with_runtime() {
  docker compose -p scm_governance_workbench \
    -f docker-compose.yml \
    -f docker-compose.production.yml \
    -f docker-compose.deepseek-runtime.yml "$@"
}

compose_without_runtime() {
  docker compose -p scm_governance_workbench \
    -f docker-compose.yml \
    -f docker-compose.production.yml "$@"
}

restore_secret_only() {
  if [ "${HAD_PREVIOUS_SECRET}" -eq 1 ]; then
    sudo mv -- "${SECRET_BACKUP}" "${SECRET_FILE}"
  else
    sudo rm -f -- "${SECRET_FILE}"
  fi
}

rollback_runtime() {
  set +e
  restore_secret_only
  if [ "${HAD_PREVIOUS_SECRET}" -eq 1 ]; then
    compose_with_runtime config --quiet >/dev/null && \
      compose_with_runtime up -d --no-build --force-recreate scm-governance-workbench
  else
    mv docker-compose.deepseek-runtime.yml \
      "docker-compose.deepseek-runtime.yml.disabled.$(date +%Y%m%d%H%M%S)"
    compose_without_runtime config --quiet >/dev/null && \
      compose_without_runtime up -d --no-build --force-recreate scm-governance-workbench
  fi
  printf '%s\n' 'New runtime failed; rollback was attempted. Verify health before any further action.' >&2
  exit 1
}

if ! compose_with_runtime config --quiet >/dev/null; then
  restore_secret_only
  printf '%s\n' 'Compose preflight failed; container was not recreated and prior secret state was restored.' >&2
  exit 1
fi

if ! compose_with_runtime up -d --no-build --force-recreate scm-governance-workbench; then
  rollback_runtime
fi

if ! docker exec scm-governance-workbench node -e \
  'const present=Boolean(process.env.DEEPSEEK_API_KEY); console.log(JSON.stringify({keyPresent:present})); if(!present) process.exit(1)'; then
  rollback_runtime
fi

if ! HEALTH_JSON="$(curl -fsS https://scm.lute-tlz-dddd.top/api/deploy/health)"; then
  rollback_runtime
fi
if ! STATUS_JSON="$(curl -fsS https://scm.lute-tlz-dddd.top/api/ai-chat/deepseek/status)"; then
  rollback_runtime
fi
if ! HEALTH_JSON="${HEALTH_JSON}" STATUS_JSON="${STATUS_JSON}" node -e \
  'const h=JSON.parse(process.env.HEALTH_JSON); const s=JSON.parse(process.env.STATUS_JSON); if(h.ok!==true||s.configured!==true) process.exit(1)'; then
  rollback_runtime
fi

sudo rm -f -- "${SECRET_BACKUP}"
unset HEALTH_JSON STATUS_JSON
)
```

### 4.6 验收结果

通过标准：

| 检查 | 目标 |
|---|---|
| Node runtime | `keyPresent=true` |
| Status endpoint | `configured=true` |
| Health endpoint | `ok=true` |
| Provider call | 仍未执行，直到下一轮单独授权 live smoke |

事务仅在以上三项全部通过后删除保留的旧 secret；它不执行 provider call。

## 5. 回滚命令

如容器重建后 health/status 异常，优先恢复旧 secret；若原先没有 secret，则移除新 secret 与 override，回到无 key 注入状态：

```bash
(
set -euo pipefail
: "${SCM_PRODUCTION_APP_ROOT:?set from restricted Ops inventory}"
: "${SCM_PRODUCTION_SECRET_FILE:?set from restricted Ops inventory}"
cd "${SCM_PRODUCTION_APP_ROOT}"
SECRET_FILE="${SCM_PRODUCTION_SECRET_FILE}"
SECRET_BACKUP="${SECRET_FILE}.rollback"

if sudo test -f "${SECRET_BACKUP}"; then
  sudo mv -- "${SECRET_BACKUP}" "${SECRET_FILE}"
  if ! docker compose -p scm_governance_workbench \
    -f docker-compose.yml \
    -f docker-compose.production.yml \
    -f docker-compose.deepseek-runtime.yml \
    config --quiet >/dev/null; then
    printf '%s\n' 'Rollback Compose preflight failed; container was not recreated.' >&2
    exit 1
  fi
  docker compose -p scm_governance_workbench \
    -f docker-compose.yml \
    -f docker-compose.production.yml \
    -f docker-compose.deepseek-runtime.yml \
    up -d --no-build --force-recreate scm-governance-workbench
else
  sudo rm -f -- "${SECRET_FILE}"
  mv docker-compose.deepseek-runtime.yml docker-compose.deepseek-runtime.yml.disabled.$(date +%Y%m%d%H%M%S)
  if ! docker compose -p scm_governance_workbench \
    -f docker-compose.yml \
    -f docker-compose.production.yml \
    config --quiet >/dev/null; then
    printf '%s\n' 'Rollback Compose preflight failed; container was not recreated.' >&2
    exit 1
  fi
  docker compose -p scm_governance_workbench \
    -f docker-compose.yml \
    -f docker-compose.production.yml \
    up -d --no-build --force-recreate scm-governance-workbench
fi

curl -fsS https://scm.lute-tlz-dddd.top/api/deploy/health
)
```

如需同时撤销 secret file，先确认不再需要该 key，再由 Ops 执行安全删除。

## 6. 下一 Gate

Ops 完成注入并提供以下任一证据后，进入下一轮：

1. `/api/ai-chat/deepseek/status` 返回 `configured=true`；
2. `docker exec` 布尔检查返回 `keyPresent=true`；
3. health endpoint 仍为 `ok=true`。

本 handoff 不授权 provider call 或数据库写入。后续 live smoke 必须分别取得 live-call 与目标 workbench SQLite trace/run 写入授权，status 同时返回 `providerCallAuthorized=true`、`configured=true`、`databaseWriteAuthorized=true`、`available=true`；通过的 live POST 会写 trace/run，边界应记录 `productionBusinessWrites=false`、`erpWriteback=false` 与实际 workbench SQLite write，不能声称 `localSqliteWrites=false`。
