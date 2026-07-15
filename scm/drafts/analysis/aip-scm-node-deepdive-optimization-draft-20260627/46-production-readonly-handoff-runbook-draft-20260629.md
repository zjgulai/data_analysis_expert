---
title: "Production Read-only Handoff Runbook Draft"
date: "2026-06-29"
status: "handoff_ready_not_executed"
batch: "B42-9/B42-10/B42-11/B42-12"
scope: "Production read-only deployment handoff, smoke plan, rollback, and stop conditions"
depends_on:
  - "44-release-candidate-file-set-and-manifest-draft-20260629.md"
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  controlledWritebackProduction: false
  actionCeiling: "suggestion_review_replay"
---

# B42-9/B42-12 Production Read-only Handoff Runbook

## 1. Handoff 边界

事实：当前 runbook 只为人工授权后的生产只读原型发布准备命令和停止条件。本轮未执行生产部署、未连接生产服务器、未执行生产只读 smoke。

推断：生产 handoff 的核心在于让 Ops 能在授权窗口内验证外部 SQLite volume、edge network、容器健康、只读 API 与静态 CSV；本文件本身不代表上线完成。

不确定项：生产服务器当前 volume、network、旧容器、域名证书、nginx 状态需要部署窗口内只读检查确认。

## 2. Preflight

本地执行：

```bash
export SCM_REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$SCM_REPO_ROOT/scm/drafts/prototypes/scm-data-governance-workbench-v0"
npm run check
npm run build
SCM_PREPROD_SCAN_ROOT="$SCM_REPO_ROOT/scm" npm run preprod:check
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml config
test -z "$(rg --files "$SCM_REPO_ROOT/scm" -g '*.pem' -g '*.key')"
```

生产服务器只读检查，必须在任何 `up -d` 前完成：

```bash
docker volume inspect scm_governance_workbench_scm-governance-data
docker network inspect lighthouse_ai_video_net
docker ps --filter name=scm-governance-workbench
```

必须确认：

| item | required |
|---|---|
| SQLite data | 使用外部 volume `scm_governance_workbench_scm-governance-data`。 |
| network | `lighthouse_ai_video_net` 已存在。 |
| write boundary | 不配置生产写入、ERP writeback、provider call 授权变量。 |
| backup | 部署前保留当前 compose、image tag、SQLite volume backup 或 snapshot。 |
| release id | 设置 `SCM_RELEASE_ID`、`SCM_GIT_SHA`。 |

## 3. Deploy Command Template

仅在人工授权后执行：

```bash
cd /opt/scm-governance-workbench
export SCM_RELEASE_ID=scm-readonly-rc-20260629
export SCM_GIT_SHA=<approved_git_sha>
test -n "$SCM_GIT_SHA"
test -z "$(git status --porcelain)"
git cat-file -e "${SCM_GIT_SHA}^{commit}"
git switch --detach "$SCM_GIT_SHA"
test "$(git rev-parse HEAD)" = "$(git rev-parse "${SCM_GIT_SHA}^{commit}")"
export SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=0
export SCM_DATABASE_WRITES_AUTHORIZED=0
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml config
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

`SCM_GIT_SHA` 必须是 owner 批准的完整 commit SHA；源码校验失败或工作树非 clean 时立即停止。设置环境变量本身不构成源码一致性证明。

不允许：

```bash
export SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=1
export PRODUCTION_WRITES_ENABLED=1
export ERP_WRITEBACK_ENABLED=1
```

## 4. Post-deploy Read-only Smoke

生产发布后只读验证：

```bash
cd /opt/scm-governance-workbench
SCM_WORKBENCH_READONLY_BASE_URL=https://scm.lute-tlz-dddd.top npm run smoke:readonly
curl -fsS https://scm.lute-tlz-dddd.top/api/deploy/health
curl -fsS -I https://scm.lute-tlz-dddd.top/fulfillment-dashboard/data/fulfillment_chart_data_binding_20260626.csv
```

需要记录：

| check | expected |
|---|---|
| `/api/deploy/health` | 返回 release id、git sha、data mount type，不泄漏 secret。 |
| `smoke:readonly` | 只读 API 通过，边界仍为 production/provider/ERP false。 |
| static CSV HEAD | `200`，content-type 可接受，不能触发写入。 |
| browser smoke | 可选；只观察，不创建 review/action。 |

## 5. Rollback Plan

如果 health/read-only smoke 失败：

```bash
cd /opt/scm-governance-workbench
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml logs --tail=200 scm-governance-workbench
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml down
# restore previous compose/image or previous release directory
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml up -d
```

SQLite volume 规则：

1. 不用新镜像覆盖外部 volume。
2. 不在失败排障中运行 import/seed。
3. 如需还原，只使用部署前 snapshot。
4. 回滚后重新跑 production read-only smoke。

## 6. Stop Conditions

出现任一情况立即停止：

| condition | action |
|---|---|
| `providerCalls=true` 或 provider live smoke 被触发 | 停止部署，回滚。 |
| `productionWrites=true`、`erpWriteback=true`、`controlledWritebackProduction=true` | 停止部署，回滚。 |
| compose 未挂载外部 SQLite volume | 停止部署，不启动。 |
| `lighthouse_ai_video_net` 不存在 | 停止部署，先补 Ops 前置条件。 |
| `.pem` 或明显 secret 被检出 | 停止发布，先做 security review。 |
| owner/mapping/SCEI 被文档误写成完成 | 停止 PR，修正 manual gate 状态。 |

## 7. Handoff Statement

可对 Ops 声明：

> 当前包是 SCM read-only prototype release candidate。它只读本地 SQLite/外部 Docker volume，不开放 provider call，不写生产库，不做 ERP/OMS/WMS writeback。Manual gates 仍保留，生产执行需单独授权窗口。

不可声明：

> owner 已签字、字段映射已认证、SCEI 权重已确认、生产已经上线、provider 或 ERP 写回已开放。

## 8. B42-9/B42-12 Done Criteria

| criteria | status |
|---|---|
| deploy preflight 已定义 | done |
| post-deploy readonly smoke 已定义 | done |
| rollback plan 已定义 | done |
| stop conditions 已定义 | done |
| 本轮未执行生产部署 | done |
