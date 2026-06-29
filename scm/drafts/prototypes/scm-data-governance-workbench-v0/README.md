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
- 只写入本原型目录下的 SQLite 文件。
- 不接入积加、ERP、TMS 或生产数据源。
- ChatBI 页面只做认证语义上下文和 dry-run，不执行真实 SQL。

## 运行

单端口运行方式：

```bash
cd /Users/pray/project/ecom_ana_overview/scm/drafts/prototypes/scm-data-governance-workbench-v0
npm install
npm run init
npm run start
```

访问 `http://127.0.0.1:5174`。

前后端分离开发方式：

```bash
cd /Users/pray/project/ecom_ana_overview/scm/drafts/prototypes/scm-data-governance-workbench-v0
npm run import
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
npm run import
npm run build
SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check
PORT=5174 npm run start
```

另开终端执行：

```bash
PORT=5174 npm run health
SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5174 npm run smoke:api
SCM_WORKBENCH_READONLY_BASE_URL=http://127.0.0.1:5174 npm run smoke:readonly
SCM_WORKBENCH_BASE_URL=http://127.0.0.1:5174 npm run smoke:ui
```

`smoke:api` 和 `smoke:ui` 只写本地 SQLite ledger 与 `tmp/` 证据目录，不写生产系统、不调用 provider、不回写 ERP。`smoke:readonly` 只执行 GET/HEAD 读取，可通过 `SCM_WORKBENCH_READONLY_BASE_URL` 指向后续生产只读目标。

`preprod:check` 是上线前只读 gate：检查构建产物、Docker/Compose 生产边界、本地 SQLite 可信最低线、密钥文件扫描和 provider/ERP/writeback 关闭状态。它会把 owner sign-off、字段映射和 SCEI 权重来源列为 manual gates；这些不阻塞只读原型发布，但阻塞任何 provider、生产写入或 ERP/OMS/WMS 回写能力开放。

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

部署建议见 [docs/tencent-cloud-lightserver-deployment-20260618.md](/Users/pray/project/ecom_ana_overview/scm/drafts/prototypes/scm-data-governance-workbench-v0/docs/tencent-cloud-lightserver-deployment-20260618.md)。

Docker 部署入口：

```bash
docker compose -p scm_governance_workbench up -d --build
curl http://127.0.0.1:5174/api/deploy/health
```

腾讯云服务器接入现有边缘 Nginx 网络时使用：

```bash
SCM_PREPROD_SCAN_ROOT=/Users/pray/project/ecom_ana_overview/scm npm run preprod:check
docker compose -p scm_governance_workbench -f docker-compose.yml -f docker-compose.production.yml up -d --build
```
