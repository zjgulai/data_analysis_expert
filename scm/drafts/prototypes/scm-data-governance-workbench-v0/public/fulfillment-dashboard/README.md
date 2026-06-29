---
title: "SCM 履约时效看板 V0 原型"
doc_type: prototype_readme
module: scm
topic: fulfillment-dashboard
status: draft_local_prototype
created: 2026-06-25
updated: 2026-06-26
source: excel_dashboard_requirements_plus_readdy_reference_plus_local_kb
boundary: local_static_prototype_no_production_write_no_provider_call
---

# SCM 履约时效看板 V0 原型

## 范围

本目录是基于 `dashboard/供应链履约相关指标.xlsx`、本地 SCM 知识库和 Readdy 原型参照搭建的本地静态原型。

默认顺序：

1. 先做指标体系与指标字典。
2. 再做十大业务主题故事线，并按最新决策保留未发货预警独立模块。
3. 最后做页面、图表、PRD 和数据表。
4. 接真实数据前，先完成图表-数据绑定矩阵、只读表契约和 SQL/BI 口径样例。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 本地原型入口 |
| `styles.css` | 看板样式，贴近 Readdy 的白底、灰线、绿色主动作和 8px 卡片 |
| `app.js` | 样例数据、交互、指标字典、故事线和数据表渲染 |
| `data/fulfillment_metric_dictionary_20260625.csv` | 从 Excel `指标` sheet 生成的完整 114 行指标字典 |
| `data/fulfillment_metric_decision_overlay_20260625.csv` | 5 条业务确认口径的覆盖表 |
| `data/fulfillment_chart_data_binding_20260626.csv` | 11 个业务模块图表到表、字段、分母、筛选和下钻键的绑定矩阵 |
| `data/fulfillment_source_table_contract_20260626.csv` | 事实表、聚合表、维表的只读接入表级契约 |
| `docs/metric-system-and-dictionary-draft-20260625.md` | 指标体系、对齐、差异、缺口 |
| `docs/fulfillment-dashboard-prd-draft-20260625.md` | PRD、业务主题故事线、图表方案和执行计划 |
| `docs/fulfillment-dashboard-readonly-data-contract-draft-20260626.md` | 只读数据接入契约草稿 |
| `docs/fulfillment-dashboard-sql-bi-logic-draft-20260626.md` | SQL/BI 口径样例草稿 |

## 边界

- 本原型是 local static prototype。
- Readdy 页面中的数值被当作原型参照数据，不代表已接入生产数据源。
- 本轮新增的数据契约是 local design contract，不代表真实数据已经接入。
- 本轮没有 provider call。
- 本轮没有 production write。
- 本轮没有 ERP/OMS/WMS/TMS 写回。
