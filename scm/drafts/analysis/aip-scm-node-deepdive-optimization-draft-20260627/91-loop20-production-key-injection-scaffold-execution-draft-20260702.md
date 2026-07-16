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
  productionBusinessWrites: false
  productionConfigMutation: true
  currentPrProductionConfigMutation: false
  historicalAuthorizationEvidence: not_attached
  historicalRollbackEvidence: not_recorded
  currentRemoteStateReverified: false
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
| 创建 restricted production secret directory | present；绝对路径仅保留在受限 Ops inventory | production config scaffold |
| 在 restricted production app root 创建 `docker-compose.deepseek-runtime.yml` | present | production config scaffold |
| 检查 restricted production secret file | absent | production read-only check |
| 检查容器状态 | `scm-governance-workbench Up 5 days (healthy)` | production read-only check |
| GET production `/api/ai-chat/deepseek/status` | HTTP 200，`configured=false` | production read-only GET |

证据文件：

```text
<repo-root>/scm/drafts/prototypes/scm-data-governance-workbench-v0/tmp/outputs/loop20-production-key-injection-scaffold-20260702/key-injection-scaffold-20260702.json
```

## 3. 事实 / 推断 / 不确定项

| 类型 | 结论 |
|---|---|
| 历史事实 | 2026-07-02 evidence 记录 no-secret scaffold 已在生产服务器落地：secret 目录和 Compose override 文件当时存在。 |
| 事实 | 上述动作是 `productionConfigMutation=true`，不是 production no-op；本次 2026-07-16 PR 整合没有重放该远端动作。 |
| 事实 | 真实 secret file 仍不存在，`deepseekApiKeyPersisted=false`。 |
| 事实 | 容器没有重建或重启，`containerRestartExecuted=false`。 |
| 事实 | production provider status 仍为 `configured=false`，`providerCalls=false`。 |
| 推断 | Ops 下一步只需写入真实 secret file，然后使用三份 compose 文件重建当前容器。 |
| 不确定项 | 真实 key 何时输入、重建后 health/status 是否通过，仍需下一轮 production evidence。 |
| 不确定项 | 历史授权附件与历史回滚结果未记录；当前远端状态未在本次 PR 整合中重新核验。 |

## 4. 下一 Gate

下一步仍需要 Ops 在服务器交互式写入真实 secret file：

```bash
(
set -euo pipefail
: "${SCM_PRODUCTION_APP_ROOT:?set from restricted Ops inventory}"
: "${SCM_PRODUCTION_SECRET_DIR:?set from restricted Ops inventory}"
export SCM_PRODUCTION_SECRET_FILE="${SCM_PRODUCTION_SECRET_DIR}/deepseek.env"
cd "${SCM_PRODUCTION_APP_ROOT}"
set +o history
umask 077
SECRET_DIR="${SCM_PRODUCTION_SECRET_DIR}"
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

旧 secret（如存在）保留在 `deepseek.env.rollback`，直到新容器 health/status 全部通过；失败时使用 Loop 19 §5 的分支回滚流程。

随后必须原样执行 Loop 19 §4.5 的 **fail-closed transaction**，不得使用省略版命令。该事务先运行三文件 `docker compose config --quiet`；只有 exit 0 才允许 `up --force-recreate`，并在 `up`、Node key presence、health 或 status 任一失败时显式恢复旧 secret/运行态。实际路径仍从受限 Ops inventory 注入。

只有 `keyPresent=true`、health `ok=true`、status `configured=true` 全部成立后，才删除 `deepseek.env.rollback`。进入 knowledge-mode provider live smoke 还必须分别取得本次明确 live-call approval 与目标 workbench SQLite trace/run 写入授权，并由 status 同时证明 `providerCallAuthorized=true`、`databaseWriteAuthorized=true`、`available=true`；上述任一条件缺失都不得调用 provider。
