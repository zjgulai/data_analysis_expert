---
title: "供应链履约看板只读数据接入契约草稿"
doc_type: data_contract
module: scm
topic: fulfillment-dashboard
status: draft
created: 2026-06-26
updated: 2026-06-26
source:
  - "dashboard/供应链履约相关指标.xlsx"
  - "data/fulfillment_metric_dictionary_20260625.csv"
  - "data/fulfillment_metric_decision_overlay_20260625.csv"
  - "data/fulfillment_chart_data_binding_20260626.csv"
  - "data/fulfillment_source_table_contract_20260626.csv"
boundary: local_design_contract_no_production_write_no_provider_call
---

# 供应链履约看板只读数据接入契约草稿

## 1. 本轮范围

本文件把原型页面、指标体系、图表组件和只读数据表连接起来。它用于后续 BI 或前端接数评审，不代表已经接入生产库。

本轮只做：

- 定义事实表、聚合表、维表的最小字段契约。
- 把 11 个业务模块的图表绑定到表、字段、分母和下钻键。
- 标出哪些字段来自 Excel 已给出的 ERP/OMS 口径，哪些需要 TMS、审核日志、库存或预测 owner 继续确认。

本轮不做：

- 不连接生产库。
- 不写回 ERP、OMS、WMS、TMS 或外部系统。
- 不调用 provider。
- 不声明真实数据口径已验收完成。

## 2. 输入材料

| 材料 | 用途 | 当前状态 |
|---|---|---|
| `dashboard/供应链履约相关指标.xlsx` | 原始指标、业务需求、筛选器、主题 | 已只读解析，包含 `指标`、`需求`、`指标-副本` |
| `data/fulfillment_metric_dictionary_20260625.csv` | Excel `指标` sheet 的结构化指标字典 | 已生成，114 行 |
| `data/fulfillment_metric_decision_overlay_20260625.csv` | 5 条业务确认口径 | 已生成，状态均为 confirmed |
| `data/fulfillment_chart_data_binding_20260626.csv` | 页面图表到数据表字段的绑定矩阵 | 本轮新增 |
| `data/fulfillment_source_table_contract_20260626.csv` | 事实表、聚合表、维表的表级契约 | 本轮新增 |

## 3. 已确认业务口径

| 口径 | 数据建模影响 |
|---|---|
| 缺货分析拆成订单缺货、库存缺货、预测缺货 | `fact_stockout_signal_daily.stockout_type` 必须为三类枚举；图表和 SQL 不允许只输出单一缺货字段 |
| 妥投签收时间以 TMS 为准 | `fact_order_package_delivery_daily.tms_sign_time` 是签收时点权威字段 |
| 平均发货成本 V0 先占位 | 只保留 `avg_shipping_cost_placeholder`；不进入总览核心 KPI 或风险排序 |
| 未发货预警保留独立模块 | `agg_unshipped_warning_daily` 独立建模，不并入明细页或缺货页 |
| 审核效能区分系统自动审核与人工审核 | `fact_audit_event_daily.audit_actor_type` 是 P0 字段；人工审核排行必须过滤或分组 |

## 4. 数据层分工

| 层级 | 表 | 作用 |
|---|---|---|
| 订单事实 | `fact_order_fulfillment_order_daily` | 订单主链路，承接总览、明细、未发货、发货时效 |
| 商品行事实 | `fact_order_fulfillment_item_daily` | 商品件数 `item_qty` 分母，承接商品履约和商品维度及时率；商品行数只做质量核对 |
| 包裹事实 | `fact_order_package_delivery_daily` | TMS 妥投，承接签收阶梯和超期未妥投 |
| 审核事件事实 | `fact_audit_event_daily` | 审核人机拆分、多次审核和人工排行 |
| 缺货信号事实 | `fact_stockout_signal_daily` | 订单缺货、库存缺货、预测缺货三分法 |
| 聚合层 | `agg_*_daily` | 页面图表直接读取，保留分子、分母、下钻键 |
| 维表层 | `dim_*` | SKU、国家、仓库、物流渠道、审核人、问题件类型、责任域 |

完整表级清单见 `data/fulfillment_source_table_contract_20260626.csv`。

## 5. 页面到数据的绑定原则

| 页面 | 主表 | 最小下钻键 | 关键校验 |
|---|---|---|---|
| 指标体系 | `fulfillment_metric_dictionary_20260625.csv` | `metric_name` | 指标必须能追溯到定义、公式、来源表和字段 |
| 履约总览 | `agg_fulfillment_kpi_daily` | `biz_date + filter_hash` | 所有比率返回分子和分母 |
| 订单履约明细 | `fact_order_fulfillment_order_daily` | `erp_code` | 平台单号和系统单号同时保留 |
| 订单履约分布 | `agg_order_distribution_daily` | `country_code + sku_code + order_status` | 订单状态大类、小类映射一致 |
| 区域渠道妥投 | `agg_delivery_channel_daily` | `country_code + logistics_channel` | 签收时点只用 TMS |
| 商品履约分布 | `agg_product_fulfillment_daily` | `sku_code` | 商品件数 `item_qty` 分母不能用订单数或商品行数替代 |
| 发货效能 | `agg_shipping_efficiency_daily` | `warehouse_code` | 仓型来自维表，不在订单事实中硬编码 |
| 审核效能 | `agg_audit_efficiency_daily` | `audit_actor_type + audit_user` | 系统自动审核和人工审核先拆再汇总 |
| 异常订单-问题件 | `agg_order_issue_daily` | `issue_type + owner_domain` | 问题件类型必须能落到责任域和动作 |
| 未发货预警 | `agg_unshipped_warning_daily` | `overdue_bucket + owner_domain` | 7/10/15 天超期分层固定 |
| 缺货分析 | `fact_stockout_signal_daily` | `stockout_type + sku_code` | 缺货类型必须三分 |
| 跨区发货 | `agg_cross_region_fulfillment_daily` | `destination_country_code + warehouse_code` | 目的国家和发货仓国家来自不同字段 |

完整图表级绑定见 `data/fulfillment_chart_data_binding_20260626.csv`。

## 6. 分母规则

| 指标域 | 分母 | 说明 |
|---|---|---|
| 原始总单量 | 平台单号 `ref_no` 去重 | 同一有效自发货群体内的已付款订单，排除已付款取消与拆单废弃 |
| 拆分总单量 | 系统自发货单号 `erp_code` | 与原始总单量使用同一有效自发货群体，排除已付款取消与拆单废弃 |
| 审单及时率 | 有效自发货订单 | 多次审核用末次审核或 `is_latest_audit` 标记 |
| 审核发货及时率 | 已审核订单 | 系统和人工审核可分开展示，但分母需一致 |
| 付款发货及时率 | 拆分总单量 | 发货时间为空的订单不进入及时分子 |
| 商品发货及时率 | 商品件数 `item_qty` | 以供应链 SKU 商品件数作为唯一分母；商品行数只做质量核对，不参与该比率 |
| 妥投率 | 跟踪号 `track_order_code` 去重 | 以已发货跟踪号去重数作为唯一分母；签收时间以 TMS 为准 |
| 未发货预警 | 拆分总单量 | `send_time` 为空且超过 SLA |
| 缺货三分 | 订单、库存快照、预测周期分别建分母 | 三类缺货不共用一个分母 |
| 跨区发货率 | 有发货仓和目的国家的订单 | 目的国家与发货仓国家不同计入跨区 |

## 7. 数据质量校验

| 校验项 | 方法 | 阻断条件 |
|---|---|---|
| 主键唯一性 | `erp_code` 在订单事实中唯一；商品行用 `erp_code + sku_code + line_id` | 主键重复且无法解释 |
| 时间链路 | `pay_time <= os_auth_time <= send_time <= tms_sign_time`，允许缺失但需标记 | 大量倒挂且无业务原因 |
| 分子分母 | 所有比率输出 numerator、denominator、rate | 只有 rate 没有分子分母 |
| TMS 签收 | 妥投图表只用 `tms_sign_time` | 使用物流商后台签收时间替代 |
| 审核方式 | `audit_actor_type` 不为空 | 自动审核与人工审核混在一起 |
| 缺货类型 | `stockout_type` 只允许三类枚举 | 单一缺货字段覆盖三类 |
| 维表映射 | SKU、国家、仓库、物流渠道维表匹配率 | P0 页面匹配率低于业务可接受阈值 |
| 刷新日期 | 所有聚合表有 `biz_date` 分区 | 无法按天刷新或回溯 |

## 8. 接入顺序

1. 先接 `fact_order_fulfillment_order_daily`、`fact_order_fulfillment_item_daily` 和 `agg_fulfillment_kpi_daily`，跑通总览和明细。
2. 接 TMS 包裹事实和 `agg_delivery_channel_daily`，替换妥投样例数据。
3. 接审核事件事实，完成系统自动审核与人工审核拆分。
4. 接库存快照和预测数据，完成缺货三分法。
5. 接未发货预警、问题件、跨区发货聚合表，完成运营闭环。
6. 最后接成本占位字段；平均发货成本不进入核心 KPI。

## 9. 待业务或数据 owner 决策

| 问题 | 影响 |
|---|---|
| 多次审核取末次、首次还是通过动作 | 影响审单及时率和人工审核排行 |
| 拆单废弃以哪些状态码排除 | 影响拆分总单量和所有订单分母 |
| 虚拟商品自动发货是否参与各及时率 | 当前要求保留标识，是否参与分母仍需签字 |
| 问题件类型到责任域映射 | 影响异常订单-问题件和未发货动作清单 |
| 预测缺货阈值 | 影响预测缺货风险池和计划动作 |
| 维表刷新频率 | 影响 SKU、国家、仓库、物流方式筛选稳定性 |

## 10. 结论

事实：本轮已把指标字典、业务确认口径、11 个页面故事线图表和数据表契约连接起来，新增了图表绑定矩阵和表级契约 CSV。

推断：下一步应优先用只读订单事实表跑通总览和明细，因为它们是所有下钻和分母校验的共同底座。

不确定项：TMS、审核事件、库存快照、需求预测和问题件责任域仍需数据 owner 提供字段、刷新频率和质量样本；未完成前不能声明真实数据接入已验收。
