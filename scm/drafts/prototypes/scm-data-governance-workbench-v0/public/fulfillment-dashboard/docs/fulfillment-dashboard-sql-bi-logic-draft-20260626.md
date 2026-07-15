---
title: "供应链履约看板 SQL 与 BI 口径样例草稿"
doc_type: sql_bi_logic
module: scm
topic: fulfillment-dashboard
status: draft
created: 2026-06-26
updated: 2026-06-26
source:
  - "docs/fulfillment-dashboard-readonly-data-contract-draft-20260626.md"
  - "data/fulfillment_chart_data_binding_20260626.csv"
  - "data/fulfillment_source_table_contract_20260626.csv"
boundary: local_logic_draft_no_production_write_no_provider_call
---

# 供应链履约看板 SQL 与 BI 口径样例草稿

## 1. 使用边界

这些 SQL 是 BI 口径样例，用于确认分子、分母、字段血缘和聚合粒度。它们不是生产 SQL，也没有连接真实库执行。

默认约定：

- `biz_date` 使用北京时间自然日。
- `:start_date` 与 `:end_date` 为看板付款时间筛选区间。
- 所有比率输出 `num`、`den`、`rate` 三列。
- 妥投签收时间只使用 `tms_sign_time`。
- 审核效能先按 `audit_actor_type` 拆分系统自动审核与人工审核。
- 缺货分析只允许三类：订单缺货、库存缺货、预测缺货。

## 2. 总览 KPI 聚合

用途：驱动总览 KPI 卡、履约链路漏斗和趋势组合图。

```sql
with order_base as (
  select
    biz_date,
    ref_no,
    erp_code,
    order_status,
    issue_type,
    pay_time,
    os_auth_time,
    send_time
  from fact_order_fulfillment_order_daily
  where biz_date between :start_date and :end_date
),
item_base as (
  select
    biz_date,
    erp_code,
    sum(item_qty) as item_qty,
    sum(item_send_qty) as item_send_qty,
    sum(case when item_send_time <= item_pay_time + interval '24' hour then item_send_qty else 0 end) as item_ship_24h_qty
  from fact_order_fulfillment_item_daily
  where biz_date between :start_date and :end_date
  group by biz_date, erp_code
),
package_base as (
  select
    biz_date,
    erp_code,
    count(distinct track_order_code) as package_den,
    count(distinct case when tms_sign_time <= send_time + interval '10' day then track_order_code end) as delivery_10d_num
  from fact_order_package_delivery_daily
  where biz_date between :start_date and :end_date
  group by biz_date, erp_code
)
select
  o.biz_date,
  count(distinct o.ref_no) as raw_order_count,
  count(distinct o.erp_code) as split_order_count,
  count(distinct case when o.os_auth_time is null then o.erp_code end) as unaudited_order_count,
  count(distinct case when o.issue_type is not null then o.erp_code end) as issue_order_count,
  count(distinct case when o.os_auth_time <= o.pay_time + interval '24' hour then o.erp_code end) as audit_sla_24h_num,
  count(distinct o.erp_code) as audit_sla_24h_den,
  count(distinct case when o.send_time <= o.pay_time + interval '48' hour then o.erp_code end) as pay_ship_sla_48h_num,
  count(distinct o.erp_code) as pay_ship_sla_48h_den,
  sum(i.item_ship_24h_qty) as item_ship_sla_24h_num,
  sum(i.item_qty) as item_ship_sla_24h_den,
  sum(p.delivery_10d_num) as delivery_10d_num,
  sum(p.package_den) as delivery_10d_den
from order_base o
left join item_base i on o.biz_date = i.biz_date and o.erp_code = i.erp_code
left join package_base p on o.biz_date = p.biz_date and o.erp_code = p.erp_code
group by o.biz_date;
```

BI 计算：

| 指标 | 计算 |
|---|---|
| 24h 审单及时率 | `audit_sla_24h_num / audit_sla_24h_den` |
| 48h 付款发货及时率 | `pay_ship_sla_48h_num / pay_ship_sla_48h_den` |
| 24h 商品发货及时率 | `item_ship_sla_24h_num / item_ship_sla_24h_den` |
| 10 天妥投率 | `delivery_10d_num / delivery_10d_den` |

## 3. 未发货预警

用途：独立模块，按 7/10/15 天超期分层输出 P0 清单。

```sql
with unshipped as (
  select
    biz_date,
    erp_code,
    sku_code,
    warehouse_code,
    issue_type,
    owner_domain,
    pay_time,
    datediff('day', pay_time, current_timestamp) as waiting_days
  from fact_order_fulfillment_order_daily
  where biz_date between :start_date and :end_date
    and send_time is null
    and pay_time <= current_timestamp - interval '7' day
)
select
  biz_date,
  case
    when waiting_days >= 15 then '15天以上'
    when waiting_days >= 10 then '10-15天'
    else '7-10天'
  end as overdue_bucket,
  owner_domain,
  warehouse_code,
  sku_code,
  issue_type,
  count(distinct erp_code) as unshipped_orders
from unshipped
group by
  biz_date,
  case
    when waiting_days >= 15 then '15天以上'
    when waiting_days >= 10 then '10-15天'
    else '7-10天'
  end,
  owner_domain,
  warehouse_code,
  sku_code,
  issue_type;
```

校验规则：

- `send_time is null` 是未发货基础条件。
- 超期分层固定为 `7-10天`、`10-15天`、`15天以上`。
- 下钻键保留 `erp_code`、`sku_code`、`warehouse_code`。

## 4. TMS 妥投阶梯

用途：区域渠道妥投页，输出 3/5/7/10/12 天签收率。

```sql
select
  biz_date,
  country_code,
  logistics_channel,
  warehouse_code,
  count(distinct track_order_code) as delivery_den,
  count(distinct case when tms_sign_time <= send_time + interval '3' day then track_order_code end) as delivery_3d_num,
  count(distinct case when tms_sign_time <= send_time + interval '5' day then track_order_code end) as delivery_5d_num,
  count(distinct case when tms_sign_time <= send_time + interval '7' day then track_order_code end) as delivery_7d_num,
  count(distinct case when tms_sign_time <= send_time + interval '10' day then track_order_code end) as delivery_10d_num,
  count(distinct case when tms_sign_time <= send_time + interval '12' day then track_order_code end) as delivery_12d_num,
  count(distinct case when tms_sign_time is null and send_time <= current_timestamp - interval '12' day then track_order_code end) as overdue_undelivered_package_count
from fact_order_package_delivery_daily
where biz_date between :start_date and :end_date
group by biz_date, country_code, logistics_channel, warehouse_code;
```

关键点：`tms_sign_time` 是唯一签收时间字段。物流商后台时间只能作为核对字段，不进入正式妥投率。

## 5. 审核效能

用途：区分系统自动审核与人工审核，再看人工审核人排行。

```sql
with latest_audit as (
  select
    biz_date,
    erp_code,
    audit_actor_type,
    audit_user,
    audit_time,
    pay_time
  from fact_audit_event_daily
  where biz_date between :start_date and :end_date
    and is_latest_audit = 1
)
select
  biz_date,
  audit_actor_type,
  case when audit_actor_type = '系统自动审核' then 'system_auto' else audit_user end as audit_user_group,
  count(distinct erp_code) as audit_orders,
  avg(extract(epoch from audit_time - pay_time) / 3600.0) as avg_audit_interval_h,
  count(distinct case when audit_time <= pay_time + interval '24' hour then erp_code end) as audit_sla_24h_num,
  count(distinct erp_code) as audit_sla_24h_den
from latest_audit
group by biz_date, audit_actor_type, case when audit_actor_type = '系统自动审核' then 'system_auto' else audit_user end;
```

BI 展示规则：

- 系统自动审核单独展示，不进入人工审核人排行榜。
- 人工审核排行榜只筛选 `audit_actor_type = '人工审核'`。
- 多次审核必须用 `is_latest_audit` 或等价规则固定。

## 6. 缺货三分法

用途：缺货分析页，分别回答当下履约、当前库存、未来覆盖三个问题。

```sql
select
  biz_date,
  stockout_type,
  sku_code,
  warehouse_code,
  sum(order_stockout_qty) as order_stockout_qty,
  min(available_qty) as available_qty,
  min(in_transit_qty) as in_transit_qty,
  min(forecast_cover_days) as forecast_cover_days,
  min(target_cover_days) as target_cover_days
from fact_stockout_signal_daily
where biz_date between :start_date and :end_date
  and stockout_type in ('订单缺货', '库存缺货', '预测缺货')
group by biz_date, stockout_type, sku_code, warehouse_code;
```

BI 展示规则：

| 缺货类型 | 解释 | 典型动作 |
|---|---|---|
| 订单缺货 | 已下单履约链路中的缺货问题 | 进入未发货预警和问题件闭环 |
| 库存缺货 | 当前可售或可用库存不足 | 核对可售、占用、在途和调拨 |
| 预测缺货 | 未来覆盖天数低于阈值 | 触发计划补货或采购动作 |

## 7. 跨区发货

用途：解释目的国家与发货仓国家不一致对时效和成本占位的影响。

```sql
select
  o.biz_date,
  o.country_code as destination_country_code,
  w.country_code as warehouse_country_code,
  o.warehouse_code,
  count(distinct o.erp_code) as total_orders,
  count(distinct case when o.country_code <> w.country_code then o.erp_code end) as cross_region_orders,
  count(distinct case when p.tms_sign_time <= o.send_time + interval '10' day then p.track_order_code end) as delivery_10d_num,
  count(distinct p.track_order_code) as delivery_10d_den,
  cast(null as decimal(18, 4)) as avg_shipping_cost_placeholder
from fact_order_fulfillment_order_daily o
left join dim_warehouse w on o.warehouse_code = w.warehouse_code
left join fact_order_package_delivery_daily p on o.erp_code = p.erp_code
where o.biz_date between :start_date and :end_date
group by o.biz_date, o.country_code, w.country_code, o.warehouse_code;
```

关键点：

- 跨区判断使用目的国家与发货仓国家。
- 平均发货成本只输出占位字段，不参与核心 KPI。
- 跨区率和妥投率可以共同解释时效损失，但成本解释需要后续成本表确认。

## 8. 问题件闭环

用途：把订单小状态转成问题件类型、责任域和下一步动作。

```sql
select
  o.biz_date,
  coalesce(i.issue_type, '未分类') as issue_type,
  coalesce(i.owner_domain, '待分配') as owner_domain,
  count(distinct o.erp_code) as issue_orders,
  count(distinct case when s.stockout_type is not null then o.erp_code end) as linked_stockout_orders
from fact_order_fulfillment_order_daily o
left join fact_order_fulfillment_item_daily oi
  on o.biz_date = oi.biz_date
  and o.erp_code = oi.erp_code
left join dim_issue_type i on o.issue_type = i.issue_type
left join fact_stockout_signal_daily s
  on o.biz_date = s.biz_date
  and o.warehouse_code = s.warehouse_code
  and oi.sku_code = s.sku_code
  and s.stockout_type in ('订单缺货', '库存缺货', '预测缺货')
where o.biz_date between :start_date and :end_date
  and o.issue_type is not null
group by o.biz_date, coalesce(i.issue_type, '未分类'), coalesce(i.owner_domain, '待分配');
```

校验规则：

- 问题件类型必须能映射到责任域。
- 与缺货相关的问题件必须先通过订单明细关联到同一 `sku_code`，再联动到三类 `stockout_type`；禁止仅按日期和仓库放大关联。
- 不能只有数量排行而没有处理动作。

## 9. 前端或 BI 取数字段

| 页面组件 | 推荐读取对象 | 必带字段 |
|---|---|---|
| KPI 卡 | `agg_fulfillment_kpi_daily` | `*_num`、`*_den`、`*_rate` |
| 趋势组合图 | `agg_fulfillment_kpi_daily` | `biz_date`、订单量、及时率 |
| 妥投阶梯 | `agg_delivery_channel_daily` | 3/5/7/10/12 天分子分母 |
| 审核排行 | `agg_audit_efficiency_daily` | `audit_actor_type`、`audit_user`、`avg_audit_interval_h` |
| 缺货卡 | `fact_stockout_signal_daily` | `stockout_type`、SKU、仓库、可售、覆盖天数 |
| 未发货表 | `agg_unshipped_warning_daily` | `overdue_bucket`、SKU、仓库、责任域 |
| 跨区矩阵 | `agg_cross_region_fulfillment_daily` | 目的国家、仓库国家、跨区率、10 天妥投率 |

## 10. 结论

事实：本文件已给出总览、未发货、TMS 妥投、审核、缺货、跨区和问题件的样例 SQL/BI 口径。

推断：真实接数时应先把这些样例转成数仓 SQL 或 BI 语义层指标，再让业务 owner 用小样本核对分子分母。

不确定项：实际 SQL 方言、源表名称、时间函数、状态码和字段权限仍需数据 owner 与 BI owner 确认。
