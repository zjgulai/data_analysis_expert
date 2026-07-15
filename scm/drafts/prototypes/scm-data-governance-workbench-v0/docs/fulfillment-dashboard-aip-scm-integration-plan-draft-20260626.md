---
title: "供应链履约看板 AIP-SCM 集成计划草稿"
doc_type: integration_plan
module: scm
topic: fulfillment-dashboard-aip-scm-integration
status: draft
created: 2026-06-26
updated: 2026-06-26
source:
  - "drafts/prototypes/scm-fulfillment-dashboard-v0"
  - "drafts/prototypes/scm-data-governance-workbench-v0"
boundary: static_knowledge_prototype_no_production_db_write_no_provider_call
---

# 供应链履约看板 AIP-SCM 集成计划草稿

## 1. 目标

把 `供应链履约看板` 集成到 AIP-SCM 主站侧边导航栏，并随 `scm.lute-tlz-dddd.top` 一起部署。看板保持独立静态知识原型，不接生产库，不写回 ERP/OMS/WMS/TMS。

## 2. 集成方案

| 项目 | 方案 |
|---|---|
| 侧边入口 | 新增 `供应链履约看板`，模块 id 为 `fulfillment-dashboard`，code 为 `F1` |
| 静态资源 | 放入 `public/fulfillment-dashboard/`，由 Vite 构建复制到 `dist/fulfillment-dashboard/` |
| 页面容器 | AIP-SCM React 中新增 `FulfillmentDashboardPanel` |
| 隔离方式 | 使用 iframe 加载 `/fulfillment-dashboard/index.html` |
| 样式隔离 | 履约看板保留自己的 `styles.css`，不复用主站 CSS |
| 数据边界 | 使用样例数值、指标字典、数据契约 CSV 和 Markdown；不接生产库 |
| 部署边界 | 随主站静态包部署，主站 API 与其他侧边页面不受影响 |

## 3. 文件落点

| 文件或目录 | 作用 |
|---|---|
| `public/fulfillment-dashboard/index.html` | 履约看板静态入口 |
| `public/fulfillment-dashboard/styles.css` | 履约看板独立样式 |
| `public/fulfillment-dashboard/app.js` | 履约看板独立交互 |
| `public/fulfillment-dashboard/data/` | 指标字典、图表绑定矩阵、表级契约 |
| `public/fulfillment-dashboard/docs/` | PRD、只读契约、SQL/BI 口径样例 |
| `src/main.tsx` | 侧边模块 fallback 与 iframe 容器 |
| `server/index.mjs` | 后端模块注册与静态文件 MIME 类型 |
| `scripts/smoke-ui.mjs` | UI smoke 覆盖新增页面与 iframe 内容 |

## 4. 验收清单

| 验收项 | 标准 |
|---|---|
| 侧边栏入口 | `供应链履约看板` 出现在 AIP-SCM 侧边栏 |
| 页面独立性 | 点击入口后只显示 iframe 容器，不改变其他模块逻辑 |
| 静态入口 | `/fulfillment-dashboard/index.html` 返回履约看板 |
| 履约看板首屏 | iframe 内可见 `指标体系与指标字典` |
| 核心主题 | iframe 内可见 `未发货预警`、`缺货分析`、`审核效能` 等模块 |
| 构建 | `npm run build` 后 `dist/fulfillment-dashboard/index.html` 存在 |
| UI smoke | `npm run smoke:ui` 覆盖新增页面 |
| 只读 smoke | `npm run smoke:readonly` 保持通过 |
| 边界 | 无生产库写入、无 provider call、无 ERP/OMS/WMS/TMS 写回 |

## 5. 后续部署步骤

1. 本地完成 `npm run check`、`npm run build`、`npm run smoke:ui`、`npm run smoke:readonly`。
2. 生成 scoped AIP-SCM 部署包，包含 `dist/fulfillment-dashboard/`。
3. 确认 Docker 构建上下文包含 `public/fulfillment-dashboard/`，否则 Vite 重新构建时会丢失 `data/*.csv`、`docs/*.md` 等静态知识原型资产。
4. 部署到当前 `scm.lute-tlz-dddd.top` 服务目录。
5. 生产环境必须保留外部 SQLite volume 和 `lighthouse_ai_video_net` 网络配置；不要用本地嵌入数据模式的 `docker-compose.yml` 覆盖生产 Compose。
6. 线上只读验证：
   - `/api/deploy/health`
   - `/api/workbench/modules`
   - `/fulfillment-dashboard/index.html`
   - 侧边栏点击 `供应链履约看板`
7. 截图留存桌面端和移动端页面。

## 6. 风险与缓解

| 风险 | 缓解 |
|---|---|
| iframe 高度导致双重滚动 | 容器固定高度，履约看板内部保持自己的滚动 |
| 主站 CSS 污染履约看板 | iframe 隔离样式和 DOM |
| API 模块列表覆盖 fallback | 同时修改后端 `getWorkbenchModules()` 和前端 `fallbackModules` |
| smoke 只看主页面不看 iframe | `smoke-ui.mjs` 使用 `frameLocator` 校验 iframe 内文本 |
| 真实数据边界被误读 | 文档、模块状态和页面徽标均标记为静态知识原型 |
| 生产 Compose 被本地 Compose 覆盖 | 发布时保留生产 Compose：`SCM_DATA_MOUNT_TYPE=docker_external_volume`、外部 volume `scm_governance_workbench_scm-governance-data`、外部网络 `lighthouse_ai_video_net` |

## 7. 当前结论

事实：集成方案以静态资源和 iframe 容器为核心，能把履约看板纳入 AIP-SCM 侧边栏，同时保持与其他侧边页面独立。

事实：2026-06-26 生产发布使用 release `scm-workbench-fulfillment-dashboard-202606260358`，线上 health 显示 `dataMountType=docker_external_volume`，`/fulfillment-dashboard/data/fulfillment_chart_data_binding_20260626.csv` 返回 `text/csv`。

推断：这是当前最稳妥的原型集成方式；后续如需深度 React 化，可以在业务验收后把 iframe 内页面拆成主站组件。

不确定项：后续如进入真实数据接入，仍需业务 owner 对 TMS 签收字段、审核事件表、库存与预测表逐项确认。
