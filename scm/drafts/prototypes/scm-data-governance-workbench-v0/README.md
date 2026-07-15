---
title: 供应链域数据开发治理工作台 V0 原型
doc_type: prototype
module: scm
topic: scm-data-governance-workbench
status: draft
created: 2026-06-18
updated: 2026-06-22
owner: self
source: human+ai
---

# 供应链域数据开发治理工作台 V0 原型

这是一个 React/Vite + Node + SQLite 的供应链数据开发治理工作台原型，目标是把当前供应链知识库中的 MECE V2 指标蓝图、字段映射、P0 owner 签字表转成一个可浏览、可检索、可演示、可部署到腾讯云轻量服务器的治理操作系统。

## 边界

- 只读取当前项目内的草稿知识资产。
- 默认以 SQLite readonly 模式启动，不写本地数据库；本地可丢弃副本上的写入必须显式授权。
- 不接入积加、ERP、TMS 或生产数据源。
- ChatBI 页面只做认证语义上下文和 dry-run，不执行真实 SQL。

## 运行

单端口运行方式：

```bash
cd "$SCM_REPO_ROOT/scm/drafts/prototypes/scm-data-governance-workbench-v0"
npm ci
npm run build
SCM_DATABASE_WRITES_AUTHORIZED=0 npm run start
```

访问 `http://127.0.0.1:5174`。

前后端分离开发方式：

```bash
cd "$SCM_REPO_ROOT/scm/drafts/prototypes/scm-data-governance-workbench-v0"
npm run dev:api
```

另开终端：

```bash
npm run dev:web
```

访问 `http://127.0.0.1:5173`。

## API

- `GET /api/workbench/modules`
- `GET /api/workbench/:moduleId`
- `GET /api/governance/overview`
- `GET /api/deploy/health`
- `GET /api/aip-scenarios`
- `GET /api/recommendation-cards`
- `POST /api/chatbi/dry-run`
- `POST /api/governance/tasks/:id/review`
- `POST /api/decision/action-task`
- `POST /api/exports`，支持 `json`、`csv`、`excel`

## 本地验收

```bash
npm run build
SCM_PREPROD_SCAN_ROOT="$(git rev-parse --show-toplevel)/scm" npm run preprod:check
SCM_DATABASE_WRITES_AUTHORIZED=0 PORT=5174 npm run start
```

另开终端执行：

```bash
PORT=5174 npm run health
npm run smoke:provider-gate
npm run smoke:database-gate
npm run smoke:import-gate
npm run smoke:path-contract
SCM_WORKBENCH_READONLY_BASE_URL=http://127.0.0.1:5174 npm run smoke:readonly
```

`smoke:api` 和 `smoke:ui` 只允许指向 loopback 上显式设置 `SCM_DATABASE_WRITES_AUTHORIZED=1` 的可丢弃 SQLite 副本；执行后必须恢复并核对 hash。它们不写生产系统、不调用 provider、不回写 ERP。`smoke:readonly` 只执行 GET/HEAD 读取，可通过 `SCM_WORKBENCH_READONLY_BASE_URL` 指向后续生产只读目标。`smoke:database-gate` 在临时目录证明默认只读、缺表 fail-closed 与显式授权写入。

`npm run import` 会重建并替换本地 SQLite ledger，只能在包含完整源资产的 monorepo 中、完成备份或明确同意替换后执行：`SCM_DATABASE_REBUILD_AUTHORIZED=1 npm run import`。脚本先在同目录临时数据库完成构建与 integrity check，成功后才原子替换目标文件；默认无授权时拒绝执行。

`preprod:check` 是上线前只读 gate：检查构建产物、Docker/Compose 生产边界、本地 SQLite 可信最低线、密钥文件扫描和 provider/ERP/writeback 关闭状态。它会把 owner sign-off、字段映射和 SCEI 权重来源列为 manual gates；这些不阻塞只读原型发布，但阻塞任何 provider、生产写入或 ERP/OMS/WMS 回写能力开放。

### Runtime 路径与显式授权

- `SCM_PROJECT_ROOT`：运行时项目根目录；容器和 standalone 布局使用 `/app`，monorepo 本地运行可自动探测。
- `SCM_AI_KNOWLEDGE_EVIDENCE_PATH`：AI 知识证据 JSON 路径；相对路径以 `SCM_PROJECT_ROOT` 为基准，默认优先使用 `runtime/evidence/`，避免被 `/app/data` SQLite 外部卷遮蔽。
- `SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED`：服务端 provider 调用授权，默认 `0`。即使配置了 `DEEPSEEK_API_KEY`，没有显式设为 `1` 时 endpoint 仍返回 403 且不会发起网络请求。
- `SCM_DATABASE_WRITES_AUTHORIZED`：本地 SQLite 写入授权，默认 `0`。默认模式以 SQLite readonly 打开数据库、只验证 schema 且拒绝 mutation POST；仅可在明确批准的本地/可丢弃副本流程中设为 `1`。
- `smoke:provider-gate` 只连接本地 fake provider；`smoke:path-contract` 只使用临时目录和临时 SQLite 副本。

## 页面

- 治理链路总览
- 战略供应链全景工作台
- 业务现状与风险雷达
- 对象本体工作台
- 标签工程工作台
- 维度工程工作台
- 指标工程工作台
- 指标字典工作台
- 指标体系编排台
- 血缘与质量工作台
- ChatBI 语义治理台
- 决策闭环工作台

## 腾讯云部署

部署建议见 `docs/tencent-cloud-lightserver-deployment-20260618.md`。

本机 standalone Docker 演示入口（使用镜像内置 SQLite，只绑定 loopback，不用于生产）：

```bash
docker compose -p scm_governance_workbench up -d --build
curl http://127.0.0.1:5174/api/deploy/health
```

腾讯云服务器接入现有边缘 Nginx 网络时使用：

```bash
SCM_PREPROD_SCAN_ROOT="$(git rev-parse --show-toplevel)/scm" npm run preprod:check
SCM_DEEPSEEK_PROVIDER_CALL_AUTHORIZED=0 SCM_DATABASE_WRITES_AUTHORIZED=0 \
  docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

生产命令只可在人工授权窗口内执行，并必须先按 runbook 校验 clean 工作树与 owner 批准的完整 commit SHA；设置 `SCM_GIT_SHA` 不能替代源码校验。
