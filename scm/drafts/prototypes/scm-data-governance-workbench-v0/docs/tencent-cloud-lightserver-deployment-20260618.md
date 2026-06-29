---
title: 腾讯云轻量服务器部署说明
doc_type: deployment_guide
module: scm
topic: scm-data-governance-workbench
status: draft
created: 2026-06-18
updated: 2026-06-26
owner: self
source: human+ai
production_status: production_readonly_smoke_passed
provider_call_status: not_called
erp_writeback_status: not_called
---

# 腾讯云轻量服务器部署说明

## 部署边界

- 当前版本是供应链数据治理工作台原型，不写回积加、ERP、WMS、TMS 或生产数据库。
- SQLite 数据库只来自本项目已萃取的知识库和指标资产导入。
- ChatBI 只做认证语义 dry-run，不执行真实 SQL。

## 推荐进程结构

- Node 进程：Docker 容器内 `server/index.mjs` 同时提供 API 和静态前端。
- 进程守护：Docker Compose + `restart: unless-stopped`。
- 外部访问：Nginx 反代到 `127.0.0.1:5174`。
- 防火墙：仅开放 80/443，Node 端口不直接暴露公网。
- 隔离边界：独立目录、独立 Compose project、独立 bridge network、独立容器名。

## 初始化

```bash
cd /opt/scm-governance-workbench/current
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.tencent.yml up -d --build
```

## 2026-06-22 前置包

| item | value |
|---|---|
| package_root | `/Users/pray/project/ecom_ana_overview/scm/tmp/deploy/scm-workbench-preflight-20260622/` |
| archive | `/Users/pray/project/ecom_ana_overview/scm/tmp/deploy/scm-workbench-preflight-20260622.tar.gz` |
| archive_sha256_file | `/Users/pray/project/ecom_ana_overview/scm/tmp/deploy/scm-workbench-preflight-20260622.tar.gz.sha256` |
| archive_sha256 | `b13317ea7ad6cdc5707a2ff9056fb48fdba6d0c2e27750c86d78cdb8bf1aa43a` |
| manifest | `/Users/pray/project/ecom_ana_overview/scm/tmp/deploy/scm-workbench-preflight-20260622/PREDEPLOY-MANIFEST.json` |
| handoff | `/Users/pray/project/ecom_ana_overview/scm/tmp/deploy/scm-workbench-preflight-20260622/DEPLOY-HANDOFF.md` |
| package_scope | scoped app package with `dist`, `data/governance_workbench.sqlite`, `server`, `scripts`, `docs`, Docker/PM2/package config |
| package_db_receipts | 7 owner receipts: 4 OMS/WMS A receipts plus 3 runtime A-A-A receipts |
| runtime_metadata_projection | A-A-A, 88 candidate fields, 62 allowlist fields, 26 excluded sensitive identifier fields |
| current_target | `https://scm.lute-tlz-dddd.top/`, release `scm-workbench-runtime-metadata-a3-20260622182004`, gitSha `runtime-metadata-a3-20260622` |
| live_sync_status | `completed_authorized` |
| live_backup_dir | `/opt/scm-governance-workbench/backups/20260622182036-before-scm-workbench-runtime-metadata-a3-20260622182004` |
| post_sync_evidence | `tmp/outputs/scm-production-runtime-metadata-live-sync-evidence-20260622.json` |
| post_sync_smoke | `SCM_WORKBENCH_READONLY_BASE_URL=https://scm.lute-tlz-dddd.top npm run smoke:readonly` passed |
| remaining_gate | business-row runtime import, provider calls and ERP/OMS/WMS writeback require separate explicit approval |

Post-sync read-only validation:

```bash
SCM_WORKBENCH_READONLY_BASE_URL=https://scm.lute-tlz-dddd.top npm run smoke:readonly
```

## 2026-06-26 履约看板生产发布补充

| item | value |
|---|---|
| release | `scm-workbench-fulfillment-dashboard-202606260358` |
| gitSha label | `c1633fe-fulfillment-dashboard-20260626` |
| module | `fulfillment-dashboard` / `F1` / `供应链履约看板` |
| static path | `/fulfillment-dashboard/index.html` |
| static data path | `/fulfillment-dashboard/data/fulfillment_chart_data_binding_20260626.csv` |
| production data boundary | external Docker volume `scm_governance_workbench_scm-governance-data` mounted at `/app/data` |
| network boundary | service attached to `scm_governance_net` and `lighthouse_ai_video_net` |
| provider/ERP boundary | `providerCalls=false`, `erpWriteback=false` |

Production deploy invariant:

- The Docker image must copy `public/` before `npm run build`, otherwise the Vite build will not include `dist/fulfillment-dashboard/data/*.csv`.
- The production Compose override is `docker-compose.production.yml`; it must keep the external SQLite volume `scm_governance_workbench_scm-governance-data` and `lighthouse_ai_video_net`. Local embedded-data Compose is only for standalone prototype runs.
- After switching `/opt/scm-governance-workbench/current` to a new release, verify `docker inspect scm-governance-workbench` shows the external volume mount before calling the deployment complete.

Pre-production local gate:

```bash
SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check
```

The gate is read-only. It can pass the read-only prototype release while still reporting manual gates for owner sign-off, field mappings, SCEI weight source, provider calls, production writes and ERP/OMS/WMS writeback.

Post-sync read-only validation:

```bash
SCM_WORKBENCH_READONLY_BASE_URL=https://scm.lute-tlz-dddd.top npm run smoke:readonly
curl -fsS https://scm.lute-tlz-dddd.top/api/deploy/health
curl -fsS -I https://scm.lute-tlz-dddd.top/fulfillment-dashboard/data/fulfillment_chart_data_binding_20260626.csv
```

## 本地启动验证

```bash
docker compose -p scm_governance_workbench ps
curl http://127.0.0.1:5174/api/deploy/health
docker exec ai_video_nginx getent hosts scm-governance-workbench
```

健康检查接口：

```bash
curl http://127.0.0.1:5174/api/deploy/health
```

## Docker Compose 启停

```bash
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml up -d --build
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml logs --tail=80
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml down
```

## Nginx 反代示例

```nginx
server {
    listen 80;
    server_name scm.lute-tlz-dddd.top;

    location / {
        proxy_pass http://127.0.0.1:5174;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 上线验收

- `curl /api/deploy/health` 返回 `ok=true`，releaseId=`scm-workbench-runtime-metadata-a3-20260622182004`。
- `/api/workbench/modules` 返回 13 个模块，包含 `strategy-panorama` 与 `current-risk-radar`。
- `/api/source-coverage/lineage` 返回 12 条 source coverage export/API lineage projection。
- `/api/decision/receipt-summary` 返回 7 个 packet、7 条 receipt、12 条 runtime-gated row。
- `/api/runtime-import/metadata-projection` 返回 A-A-A、88 个候选字段、62 个 allowlist 字段、26 个 excluded 敏感运营标识字段。
- `SCM_WORKBENCH_READONLY_BASE_URL=https://scm.lute-tlz-dddd.top npm run smoke:readonly` 通过。
- Provider call、ERP/OMS/WMS writeback 和业务明细行 runtime import 仍保持关闭。
