const metricDictionary = [
  {
    level: "L0",
    name: "履约体验达成率",
    definition: "订单从付款、审核、发货到妥投的 SLA 综合达成比例。",
    grain: "period + channel + country + logistics_channel + warehouse",
    source: "知识库已有 L0；Excel 补充订单级时效口径",
    chart: "管理层总览 KPI、趋势线"
  },
  {
    level: "L1",
    name: "订单规模",
    definition: "原始总单量、拆分总单量、待审核量、异常量、标发失败量。",
    grain: "付款日期 + 平台单号/系统自发货单号",
    source: "Excel sheet 2 + Readdy 样例数值",
    chart: "横向 KPI 卡片、订单分布表"
  },
  {
    level: "L2",
    name: "原始总单量",
    definition: "平台订单量，已付款状态后的订单总量，包含已付款取消。",
    grain: "平台单号去重",
    source: "lute_os.t_erp_order.ref_no",
    chart: "总览规模 KPI、趋势左轴"
  },
  {
    level: "L2",
    name: "拆分总单量",
    definition: "已付款的有效自发货订单量；拆单废弃不统计，其他废弃需计入。",
    grain: "系统自发货单号 erp_code",
    source: "lute_os.t_erp_order.erp_code",
    chart: "分母基准、订单分布"
  },
  {
    level: "L2",
    name: "24h/48h 审单及时率",
    definition: "末次审核时间 - 付款时间小于阈值的单量 / 总有效订单数量。",
    grain: "拆分总单量；比率需展示分子分母",
    source: "pay_time + os_auth_time；多次审核日志待补",
    chart: "及时率 KPI、审核效能"
  },
  {
    level: "L2",
    name: "24h/48h 审核发货及时率",
    definition: "发货时间 - 审核时间小于阈值的单量 / 已审核单量。",
    grain: "已审核订单",
    source: "os_auth_time + send_time",
    chart: "及时率 KPI、发货效能"
  },
  {
    level: "L2",
    name: "24h/48h 付款发货及时率",
    definition: "发货时间 - 付款时间小于阈值的单量 / 总单量。",
    grain: "拆分总单量",
    source: "pay_time + send_time",
    chart: "链路压缩效率趋势"
  },
  {
    level: "L2",
    name: "24h/48h 商品发货及时率",
    definition: "发货时间 - 付款时间小于阈值的商品数 / 总订单商品数量。",
    grain: "供应链 SKU 商品行",
    source: "lute_os.t_erp_order_item.sku_code + num",
    chart: "商品履约分布、SKU 慢发排行"
  },
  {
    level: "L2",
    name: "3/5/10 天妥投率",
    definition: "客户签收时间 - 发货时间小于阈值的包裹数 / 总发货包裹数。",
    grain: "包裹/跟踪号",
    source: "track_order_code + TMS sign_time；TMS 为签收时间权威来源",
    chart: "妥投阶梯、区域渠道妥投"
  },
  {
    level: "L2",
    name: "累计妥投率",
    definition: "累计签收订单包裹数 / 总发货包裹数。",
    grain: "包裹/跟踪号",
    source: "TMS package_status + sign_time",
    chart: "区域渠道妥投趋势"
  },
  {
    level: "L2",
    name: "超期未发货率",
    definition: "截至当日，付款时间大于 7 天仍未发货的订单 / 总订单数。",
    grain: "拆分总单量",
    source: "pay_time + send_time + order_status",
    chart: "可点击 KPI、明细列表"
  },
  {
    level: "L2",
    name: "超期未妥投率",
    definition: "截至当日，发货时间大于 12 天仍未签收的包裹数 / 总发货包裹数。",
    grain: "包裹/跟踪号",
    source: "send_time + TMS sign_time",
    chart: "可点击 KPI、妥投异常明细"
  },
  {
    level: "L2",
    name: "未发货预警",
    definition: "付款后超过 SLA 仍未发货的订单预警，按 7/10/15 天和责任域分层。",
    grain: "拆分总单量 + 订单当前状态",
    source: "pay_time + send_time + order_status + warehouse_code + sku_code",
    chart: "独立预警模块、超期分层表、明细下钻"
  },
  {
    level: "L2",
    name: "拆单率",
    definition: "有效自发货订单量 / 原始订单量 - 1。",
    grain: "原始平台单号与拆分单号映射",
    source: "ref_no + erp_code",
    chart: "订单类别 KPI、拆单结构"
  },
  {
    level: "L2",
    name: "异常订单率",
    definition: "异常订单量 / 总单量。",
    grain: "拆分总单量",
    source: "order_status 小状态映射",
    chart: "异常问题件、风险提示"
  },
  {
    level: "L2",
    name: "跨区发货率",
    definition: "目的国家/地区与实际发货仓所在国家/地区不一致的订单占比。",
    grain: "订单 + 发货仓库",
    source: "order_receive.country + t_lute_warehouse.country_code",
    chart: "跨区矩阵、成本时效解释"
  },
  {
    level: "L2",
    name: "预售单比率",
    definition: "带预售标签的平台订单量 / 原始总单量。",
    grain: "平台订单",
    source: "t_erp_order_label.label_name",
    chart: "总览 KPI、预售影响说明"
  },
  {
    level: "L2",
    name: "平均发货成本",
    definition: "V0 占位指标：已发货成本 / 已发货单量，暂不作为核心指标。",
    grain: "已发货订单",
    source: "物流商后台，Excel 标注待补充",
    chart: "成本占位卡，不进入核心 KPI"
  },
  {
    level: "L3",
    name: "订单履约明细字段",
    definition: "平台单号、系统单号、国家、状态、SKU、数量、付款、审核、跟踪号、发货、签收、仓库、物流渠道。",
    grain: "订单行/商品行",
    source: "t_erp_order + t_erp_order_item + t_erp_order_receive",
    chart: "明细表、点击下钻"
  },
  {
    level: "L3",
    name: "订单履约分布字段",
    definition: "付款日期、区域/国家、原始单量、自发货有效单量、未审核量、待发货量、已发货量、累计发货率。",
    grain: "日期 + 区域/国家 + 可选维度",
    source: "订单事实聚合",
    chart: "热力、排名、分布表"
  },
  {
    level: "L3",
    name: "商品履约分布字段",
    definition: "SKU、SPU、三级品类、GTM 组、商品总数量、已发货数量、3/5/7 天发货率。",
    grain: "供应链 SKU",
    source: "dim_sku_info + order_item",
    chart: "SKU 慢发排行、商品发货率表"
  },
  {
    level: "L3",
    name: "发货效能",
    definition: "发货时间、发货单量、发货商品数量、小包仓处理单量/商品量、海外仓处理单量/商品量。",
    grain: "发货日期 + 仓库类型",
    source: "send_time + warehouse_code；仓库类型映射待确认",
    chart: "堆叠条、仓型对比"
  },
  {
    level: "L3",
    name: "审核效能",
    definition: "系统自动审核与人工审核分开统计；人工审核再看审核人、累计审核单量、平均审核间隔小时。",
    grain: "审核方式 + 审核人 + 审核事件",
    source: "审核日志，需包含 audit_actor_type、audit_user、audit_time",
    chart: "审核方式对比、审核人排行、时效分布"
  },
  {
    level: "L3",
    name: "异常订单-问题件",
    definition: "按 ERP 当前最新问题件类型展示数量、比例和明细。",
    grain: "异常订单 + 异常标识",
    source: "order_status 小状态 + error_remark",
    chart: "问题件帕累托、明细列表"
  },
  {
    level: "L3",
    name: "缺货分析",
    definition: "缺货拆成订单缺货、库存缺货、预测缺货三类，分别定位履约异常、可售不足和未来覆盖风险。",
    grain: "订单 + SKU + 仓库 + 库存快照 + 预测周期",
    source: "订单异常 + 可售库存 + 在途 + 需求预测/覆盖天数",
    chart: "三类缺货卡、SKU 风险列表、库存覆盖趋势"
  }
];

function rateFromCounts(numerator, denominator) {
  return denominator === 0 ? null : Number(((numerator / denominator) * 100).toFixed(1));
}

function displayRate(value) {
  return value === null ? "—" : value.toFixed(1);
}

const auditSlaCounts = Object.freeze({
  denominator: 135892,
  within24h: 121777,
  within48h: 126145
});
const payShipSlaCounts = Object.freeze({
  denominator: 135892,
  within24h: 115780
});
const auditSla24hRate = rateFromCounts(auditSlaCounts.within24h, auditSlaCounts.denominator);
const auditSla48hRate = rateFromCounts(auditSlaCounts.within48h, auditSlaCounts.denominator);
const payShipSla24hRate = rateFromCounts(payShipSlaCounts.within24h, payShipSlaCounts.denominator);
const auditToShipGap = auditSla24hRate === null || payShipSla24hRate === null
  ? null
  : Number((auditSla24hRate - payShipSla24hRate).toFixed(1));
const auditVolumeCounts = Object.freeze({
  system: 58920,
  manual: 76972
});
const auditVolumeTotal = auditVolumeCounts.system + auditVolumeCounts.manual;
const systemAuditShare = rateFromCounts(auditVolumeCounts.system, auditVolumeTotal);
const manualAuditShare = rateFromCounts(auditVolumeCounts.manual, auditVolumeTotal);

const kpis = [
  ["volume", "原始总单量", "128,456", "单", "", "5.2%", false],
  ["volume", "拆分总单量", "135,892", "单", "", "6.1%", false],
  ["volume", "待审核订单量", "2,341", "单", "", "12.5%", false],
  ["volume", "异常订单数量", "2,312", "单", "", "13.3%", false],
  ["volume", "标发失败量", "156", "单", "", "20.4%", false],
  ["volume", "拆单率", "5.8", "%", "7,436 / 128,456", "0.3%", false],
  ["volume", "异常订单率", "1.8", "%", "2,446 / 135,892", "0.3%", false],
  ["volume", "预售单比率", "6.2", "%", "7,964 / 128,456", "1.8%", false],
  ["rate", "24小时审单及时率", displayRate(auditSla24hRate), "%", `${auditSlaCounts.within24h.toLocaleString("en-US")} / ${auditSlaCounts.denominator.toLocaleString("en-US")}`, "2.1%", true],
  ["rate", "48小时审单及时率", displayRate(auditSla48hRate), "%", `${auditSlaCounts.within48h.toLocaleString("en-US")} / ${auditSlaCounts.denominator.toLocaleString("en-US")}`, "0.5%", true],
  ["rate", "24小时审核发货及时率", "89.5", "%", "109,220 / 121,900", "1.2%", true],
  ["rate", "48小时审核发货及时率", "96.3", "%", "117,390 / 121,900", "1.8%", true],
  ["rate", "24小时付款发货及时率", "85.2", "%", "115,780 / 135,892", "2.0%", true],
  ["rate", "48小时付款发货及时率", "95.8", "%", "130,185 / 135,892", "0.8%", true],
  ["rate", "24小时商品发货及时率", "82.5", "%", "168,166 / 203,838", "1.5%", true],
  ["rate", "48小时商品发货及时率", "93.6", "%", "190,792 / 203,838", "0.6%", true],
  ["rate", "未发货率", "4.1", "%", "5,572 / 135,892", "1.5%", false],
  ["rate", "超期未发货率", "3.7", "%", "5,028 / 135,892", "0.8%", false],
  ["time", "平均已等待间隔h", "15.2", "h", "", "3.2%", false],
  ["time", "平均审单间隔h", "8.5", "h", "", "5.6%", false],
  ["time", "平均审核发货间隔h", "26.3", "h", "", "2.1%", false],
  ["time", "平均付款发货间隔h", "34.8", "h", "", "2.8%", false]
].map(([group, name, value, unit, denom, delta, good]) => ({ group, name, value, unit, denom, delta, good }));

const alignmentItems = [
  {
    title: "吻合点：履约体验达成率与 sheet 2 高度吻合",
    body: "知识库已有 L0 履约体验达成率，sheet 2 把它拆到付款、审核、发货、签收四段，可直接形成履约时效指标树。"
  },
  {
    title: "差异：知识库偏企业级 SCM，Excel 偏订单运营",
    body: "知识库覆盖采购、库存、成本、数据治理等宏观域；Excel 更强调订单级口径、拆单、虚拟商品、审核人、问题件和明细下钻。"
  },
  {
    title: "已确认：妥投签收时间以 TMS 为准",
    body: "妥投、超期未妥投和签收阶梯都以 TMS 的 sign_time/package_status 为权威来源；物流商后台只作为补充核对。"
  },
  {
    title: "已确认：未发货预警保留独立模块",
    body: "即使 Excel 中有会议删除备注，当前业务决策是保留独立预警页，专门治理付款后超过 SLA 仍未发货的订单。"
  },
  {
    title: "已确认：缺货分析拆成三类",
    body: "缺货不再混成单一字段，拆成订单缺货、库存缺货、预测缺货三类；V0 需要在字典和数据表中分别建口径。"
  },
  {
    title: "已确认：平均发货成本 V0 只占位",
    body: "平均发货成本暂不作为核心指标，不参与总览核心 KPI 和履约故事线判断，只在成本字段接入后补充展示。"
  },
  {
    title: "已确认：审核效能必须双口径",
    body: "审核看板必须先区分系统自动审核与人工审核，再对人工审核做审核人排行和时效分布，避免把自动化吞吐误判为人效。"
  }
];

const trend = [
  ["06-01", 96, 92],
  ["06-03", 101, 93],
  ["06-05", 88, 91],
  ["06-07", 112, 95],
  ["06-09", 118, 94],
  ["06-11", 122, 96],
  ["06-13", 109, 94],
  ["06-15", 133, 97],
  ["06-17", 126, 96],
  ["06-19", 140, 95],
  ["06-21", 131, 94],
  ["06-23", 136, 96],
  ["06-25", 128, 95]
];

const regions = [
  ["美国", 38600, 30],
  ["中国", 19200, 14.9],
  ["德国", 14100, 11],
  ["英国", 11500, 9],
  ["法国", 8900, 6.9],
  ["日本", 7700, 6],
  ["加拿大", 6400, 5],
  ["澳大利亚", 5200, 4],
  ["墨西哥", 4500, 3.5],
  ["意大利", 3800, 3],
  ["西班牙", 3200, 2.5],
  ["荷兰", 2600, 2],
  ["巴西", 2100, 1.6],
  ["韩国", 1800, 1.4]
];

const orderRows = [
  ["AMZ-100245", "SO-100245-1", "美国", "已发货", "S12-PUMP-US", "1", "06-24 09:31", "06-24 14:20", "06-25 10:08", "未签收", "FBA US West / UPS"],
  ["SHP-882003", "SO-882003-1", "德国", "异常", "M5-WARM-DE", "2", "06-23 21:44", "待审核", "未发货", "未签收", "DE WH / DHL"],
  ["TT-770128", "SO-770128-1", "英国", "待发货", "S12-PUMP-UK", "1", "06-22 08:12", "06-22 13:05", "未发货", "未签收", "UK WH / Royal Mail"],
  ["SHP-882118", "SO-882118-2", "法国", "已发货", "GIFT-CARD", "1", "06-21 19:18", "06-21 19:19", "06-21 19:20", "虚拟完结", "虚拟商品自动发货"],
  ["AMZ-100399", "SO-100399-1", "加拿大", "标发失败", "S9-BOTTLE-CA", "1", "06-20 11:02", "06-20 13:26", "06-20 22:45", "未签收", "CA WH / Canada Post"]
];

const productRows = [
  ["S12-PUMP-US", "S12", "吸奶器", "North America", "28,420", "24,318", "85.6%", "74.8%", "商品维度发货慢于订单维度"],
  ["M5-WARM-DE", "M5", "暖奶器", "Europe", "9,870", "9,132", "92.5%", "88.7%", "正常"],
  ["S9-BOTTLE-CA", "S9", "奶瓶配件", "North America", "6,420", "5,106", "79.5%", "69.3%", "仓库覆盖不足"],
  ["GIFT-CARD", "Virtual", "虚拟商品", "Global", "3,210", "3,210", "100%", "100%", "需保留自动发货标识"]
];

const auditRows = [
  ["系统自动审核", "58,920", "1.1", "99.2%", "自动审核单独统计，不进入人工排行"],
  ["人工审核 / 海浪", "22,410", "7.8", "95.4%", "多次审核日志字段待优化"],
  ["人工审核 / Lynn", "18,230", "9.6", "93.1%", "末次审核时间可用"],
  ["人工审核 / Mark", "14,920", "11.4", "90.6%", "需补审核动作类型"]
];

const unshippedWarnings = [
  ["7-10天未发货", "3,120", "62.1%", "核对仓库拣配、SKU 可售与标发状态", "P0"],
  ["10-15天未发货", "1,248", "24.8%", "升级仓库与供应链 Owner，检查缺货/异常标识", "P0"],
  ["15天以上未发货", "660", "13.1%", "进入专项清单，逐单确认取消、补发或客服同步", "P0"]
];

const issues = [
  ["缺货(OS)", 718, 31.1],
  ["仓库出库失败", 384, 16.6],
  ["未匹配仓库/物流", 312, 13.5],
  ["物流下单失败", 286, 12.4],
  ["MSKU未配对", 244, 10.6],
  ["标发异常", 156, 6.7]
];

const deliveries = [
  ["3天妥投率", 61, "签收时间 - 发货时间 < 3 天"],
  ["5天妥投率", 76, "签收时间 - 发货时间 < 5 天"],
  ["7天妥投率", 88, "签收时间 - 发货时间 < 7 天"],
  ["10天妥投率", 94, "签收时间 - 发货时间 < 10 天"],
  ["12天妥投率", 96, "签收时间 - 发货时间 < 12 天"]
];

const shippingEfficiency = [
  ["发货单量", 74200, 41400, "小包仓处理单量占 64%，海外仓占 36%。"],
  ["发货商品数量", 116800, 87038, "商品维度用于校准部分发货与拆单影响。"],
  ["平均处理负载", 58, 42, "需要后续接入仓库人效与拣配能力。"]
];

const stockoutDecisions = [
  {
    title: "订单缺货",
    body: "订单或商品行已经进入履约链路，但因缺货异常无法发货，直接影响未发货预警和异常问题件。",
    asks: ["分母：拆分总单量或商品行", "来源：ERP 问题件、订单异常、SKU 行状态"]
  },
  {
    title: "库存缺货",
    body: "当前可售库存不足或仓库库存不可用，重点解释仓库布点、调拨和 SKU 映射问题。",
    asks: ["分母：SKU + 仓库库存快照", "来源：可售库存、占用库存、在途库存"]
  },
  {
    title: "预测缺货",
    body: "未来需求预测或目标覆盖天数低于阈值，用于提前预警补货、采购和仓网调整。",
    asks: ["分母：SKU + 区域 + 预测周期", "来源：需求预测、目标覆盖天数、补货建议"]
  }
];

const stories = [
  {
    title: "1. 指标速览",
    problem: "先判断整体履约是否失控，再定位是订单规模、及时率还是时长异常。",
    metrics: "原始总单量、拆分总单量、24/48h 审单及时率、付款发货及时率、商品发货及时率、超期未发货率、妥投率。",
    charts: "横向 KPI 卡片、趋势组合图、异常诊断卡。",
    action: "点击比率指标进入对应明细，并保留分子分母。"
  },
  {
    title: "2. 订单履约明细",
    problem: "回答每一单卡在哪个环节、责任字段是什么、能否追溯到平台和仓库。",
    metrics: "平台单号、系统自发货单号、订单状态、异常标识、SKU、付款、审核、发货、签收、仓库、物流渠道。",
    charts: "高密度明细表、异常标识筛选、字段口径抽屉。",
    action: "支持从超期未发货、标发失败、超期未妥投点击下钻。"
  },
  {
    title: "3. 订单履约分布",
    problem: "解释发货率在区域、国家、订单状态和 SKU 维度的结构差异。",
    metrics: "原始单量、自发货有效单量、未审核量、待发货量、已发货量、累计发货率、商品维度累计发货率。",
    charts: "区域热力、排名表、发货率结构表。",
    action: "识别大促或区域集中波动。"
  },
  {
    title: "4. 区域渠道妥投分析",
    problem: "判断是仓库、渠道还是国家导致签收时效下降。",
    metrics: "发货包裹数、TMS 签收包裹数、累计签收率、3/5/7/10/12 天签收率。",
    charts: "妥投阶梯、区域渠道矩阵、超期明细。",
    action: "把超期未妥投推给物流渠道或仓库 owner。"
  },
  {
    title: "5. 商品履约分布",
    problem: "识别哪些 SKU 长期慢发，是否需要调整备货节奏、仓库覆盖或 SKU 映射。",
    metrics: "SKU、SPU、三级品类、GTM 组、商品总数量、已发货数量、商品维度 3/5/7 天发货率。",
    charts: "SKU 发货率表、慢发排行、品类分组。",
    action: "形成 SKU 层面的备货和仓储动作。"
  },
  {
    title: "6. 发货效能",
    problem: "判断发货压力由小包仓还是海外仓承接，是否出现仓型能力瓶颈。",
    metrics: "发货时间、发货单量、发货商品数量、小包仓处理单量/商品量、海外仓处理单量/商品量。",
    charts: "仓型堆叠条、日趋势、处理负载卡。",
    action: "为仓库排班、分仓和调拨提供输入。"
  },
  {
    title: "7. 审核效能",
    problem: "判断未审核和审单慢是否来自人员、系统自动审核或日志缺失。",
    metrics: "审核方式、审核人、累计审核单量、平均审核间隔h、24h 审单达成。",
    charts: "系统/人工审核对比、审核人排行、审单时长分布。",
    action: "先拆系统自动审核与人工审核，再评估人工审核人效和日志完整性。"
  },
  {
    title: "8. 异常订单-问题件",
    problem: "把异常状态从订单数量变成可处理的问题件类型和责任域。",
    metrics: "异常标识、异常信息、问题件类型、数量、比例、处理 owner。",
    charts: "问题件帕累托、明细下钻。",
    action: "把缺货、仓库失败、物流下单失败、SKU 映射拆成不同闭环。"
  },
  {
    title: "9. 未发货预警",
    problem: "判断付款后超过 SLA 仍未发货的订单集中在哪些仓库、SKU、异常类型和责任域。",
    metrics: "超期未发货订单数、7/10/15 天分层、未发货率、仓库、SKU、异常标识、当前 Owner。",
    charts: "超期分层表、责任域卡片、明细下钻。",
    action: "形成 P0 预警清单，逐单推进发货、取消、补发或客服同步。"
  },
  {
    title: "10. 缺货分析",
    problem: "区分缺货来自已下单履约异常、当前库存不足，还是未来预测覆盖不足。",
    metrics: "订单缺货、库存缺货、预测缺货、可售库存、覆盖天数、在途、预售标签、商品行缺货。",
    charts: "三类缺货卡、SKU 风险表、库存覆盖趋势。",
    action: "按订单、库存、预测三条链路分派到履约、仓库、计划或采购 Owner。"
  },
  {
    title: "11. 跨区发货",
    problem: "解释目的地与发货仓不一致对时效和成本的影响。",
    metrics: "跨区发货率、目的国家、发货仓国家、物流渠道、发货成本、妥投率。",
    charts: "国家-仓库矩阵、跨区率排行、成本时效对比。",
    action: "驱动仓网布点、调拨和库存前置。"
  }
];

const dataTables = [
  ["fact_order_fulfillment_order_daily", "系统自发货订单", "ref_no, erp_code, order_status, pay_time, os_auth_time, send_time, warehouse_code, channel, shop_account", "总览、明细、审单/发货时效"],
  ["fact_order_fulfillment_item_daily", "订单商品行", "erp_code, sku_code, seller_sku, supply_sku, num, virtual_flag, send_time", "商品发货率、商品履约分布"],
  ["fact_order_package_delivery_daily", "包裹/跟踪号", "track_order_code, erp_code, logistics_channel, send_time, tms_sign_time, tms_package_status", "妥投率、超期未妥投"],
  ["fact_audit_event_daily", "审核事件", "audit_event_id, erp_code, audit_actor_type, audit_user, audit_time, audit_action_type, is_latest_audit", "系统/人工审核拆分、人工审核排行"],
  ["fact_stockout_signal_daily", "日期 + 缺货类型 + SKU + 仓库", "stockout_type, sku_code, warehouse_code, order_stockout_qty, available_qty, in_transit_qty, forecast_cover_days", "订单缺货、库存缺货、预测缺货"],
  ["fact_inventory_snapshot_daily", "日期 + SKU + 仓库库存快照", "available_qty, reserved_qty, on_hand_qty, in_transit_qty, inventory_status", "库存缺货、未发货归因"],
  ["fact_demand_forecast_weekly", "SKU + 区域 + 预测周期", "forecast_week, sku_code, region, forecast_demand_qty, target_cover_days, forecast_cover_days", "预测缺货"],
  ["agg_fulfillment_kpi_daily", "日期 + 筛选维度", "raw_order_count, split_order_count, audit_sla_24h, ship_sla_48h, delivery_rate_10d", "核心 KPI 卡片与趋势"],
  ["agg_fulfillment_risk_daily", "日期 + 风险类型 + 责任域", "risk_type, risk_orders, risk_items, risk_share, owner_domain", "总览风险贡献"],
  ["agg_unshipped_warning_daily", "日期 + 超期层级 + 责任域", "unshipped_orders, overdue_bucket, warehouse_code, sku_code, issue_type, owner", "未发货预警"],
  ["agg_order_distribution_daily", "日期 + 国家/区域/状态/SKU", "raw_orders, valid_orders, unaudited_orders, waiting_ship_orders, shipped_orders", "订单履约分布"],
  ["agg_delivery_channel_daily", "日期 + 国家 + 物流渠道", "shipped_package_count, tms_signed_package_count, delivery_3d_rate, delivery_5d_rate, delivery_10d_rate, delivery_12d_rate", "区域渠道妥投"],
  ["agg_product_fulfillment_daily", "日期 + SKU/SPU/品类/GTM", "product_qty, shipped_qty, ship_rate_3d, ship_rate_5d, ship_rate_7d", "商品履约分布"],
  ["agg_shipping_efficiency_daily", "日期 + 仓库类型", "shipment_orders, shipment_items, small_packet_orders, overseas_orders", "发货效能"],
  ["agg_audit_efficiency_daily", "日期 + 审核方式 + 审核人", "audit_actor_type, audit_user, audit_orders, avg_audit_interval_h, audit_sla_24h", "审核效能"],
  ["agg_order_issue_daily", "日期 + 问题件类型 + 责任域", "issue_type, issue_orders, issue_share, owner_domain, stockout_type, next_action_status", "异常订单-问题件闭环"],
  ["agg_cross_region_fulfillment_daily", "日期 + 目的国家 + 发货仓国家 + 仓库", "destination_country_code, warehouse_country_code, warehouse_code, cross_region_orders, cross_region_rate, delivery_10d_rate", "跨区发货"],
  ["dim_sku_info", "SKU 主数据", "sku_code, product_line, category_level_3, spu_name, gtm_group, virtual_flag", "筛选、品类、虚拟商品标识"],
  ["dim_country_region", "国家/区域", "country_code, country_name, region", "区域筛选、跨区发货"],
  ["dim_warehouse", "仓库", "warehouse_code, warehouse_name, warehouse_type, country_code", "仓型、跨区、发货效能"],
  ["dim_logistics_channel", "物流渠道", "sp_code, sp_name, shipping_code, shipping_name, service_level", "物流方式、妥投分析"],
  ["dim_audit_user", "审核人", "audit_user, audit_user_name, team, shift_group, manual_audit_flag", "人工审核排行、班次分析"],
  ["dim_issue_type", "问题件类型", "issue_type, issue_big_type, owner_domain, default_action, sla_hours", "异常标识到责任域和动作"],
  ["dim_owner_responsibility", "责任域", "owner_domain, owner_team, primary_contact, escalation_level, default_sla_hours", "未发货预警、问题件闭环"]
];

const pageInsights = {
  detail: [
    { label: "核心判断", value: "明细是所有预警的落点", note: "超期、缺货、标发、妥投慢都必须能回到平台单号和系统单号。", tone: "green" },
    { label: "优先下钻", value: "未发货 + 标发失败", note: "当前最需要逐单处理的是未发货、标发失败和待审核订单。", tone: "red" },
    { label: "字段关键", value: "双单号 + 时点", note: "ref_no、erp_code、付款、审核、发货、TMS 签收是定位链路的最小闭环。", tone: "blue" }
  ],
  overview: [
    { label: "核心判断", value: "履约风险集中在发货前", note: `24h 付款发货及时率 ${displayRate(payShipSla24hRate)}%，低于审单及时率 ${displayRate(auditToShipGap)}pct。`, tone: "amber" },
    { label: "首要风险", value: "5,028 单", note: "超期未发货订单需要进入独立预警闭环。", tone: "red" },
    { label: "结构信号", value: "商品行更慢", note: "24h 商品发货及时率 82.5%，提示部分发货、拆单或 SKU 备货问题。", tone: "blue" }
  ],
  distribution: [
    { label: "核心判断", value: "区域集中度高", note: "美国、中国、德国、英国贡献超过 60%，波动会直接影响总览。", tone: "amber" },
    { label: "分布风险", value: "待发货结构上升", note: "区域和 SKU 组合要解释订单维度与商品维度发货率差异。", tone: "red" },
    { label: "分析入口", value: "国家 x SKU", note: "先看国家热力，再看 SKU 和订单状态结构。", tone: "blue" }
  ],
  delivery: [
    { label: "核心判断", value: "5天前掉速明显", note: "3天妥投率 61%，5天提升到 76%，前段末端配送承压。", tone: "amber" },
    { label: "事实源", value: "TMS", note: "签收时间以 TMS sign_time/package_status 为准。", tone: "green" },
    { label: "处理方向", value: "国家 x 渠道", note: "先定位慢国家和慢渠道，再推给物流 Owner。", tone: "blue" }
  ],
  product: [
    { label: "核心判断", value: "商品行慢于订单", note: "24h 商品发货及时率 82.5%，低于订单付款发货及时率。", tone: "red" },
    { label: "风险 SKU", value: "S12 / S9", note: "S12-PUMP-US 与 S9-BOTTLE-CA 是慢发和缺货交汇点。", tone: "amber" },
    { label: "动作方向", value: "备货 + 映射", note: "从 SKU 可售、仓库覆盖、MSKU 配对和虚拟商品标识处理。", tone: "blue" }
  ],
  shipping: [
    { label: "核心判断", value: "小包仓承压", note: "小包仓处理单量占 64%，是发货前链路的主要负载点。", tone: "amber" },
    { label: "商品数量压力", value: "116,800 件", note: "商品件数高于订单数，需要用商品维度校准仓内作业。", tone: "red" },
    { label: "优化方向", value: "排班 + 分仓", note: "用仓型负载和 SKU 风险决定排班、分仓、调拨。", tone: "blue" }
  ],
  audit: [
    { label: "核心判断", value: "自动审核不是人效", note: "系统自动审核 58,920 单，必须从人工审核排行中剥离。", tone: "green" },
    { label: "人工瓶颈", value: "Mark 11.4h", note: "人工审核平均间隔最高，需要看班次、异常单和日志完整性。", tone: "amber" },
    { label: "数据动作", value: "补 audit_actor_type", note: "没有审核方式字段时，人效判断会失真。", tone: "red" }
  ],
  exception: [
    { label: "核心判断", value: "缺货是最大异常", note: "缺货(OS) 占问题件 31.1%，要和缺货分析页面联动。", tone: "red" },
    { label: "第二归因", value: "仓库/物流失败", note: "仓库出库失败和物流下单失败合计 29.0%。", tone: "amber" },
    { label: "闭环重点", value: "问题件 Owner", note: "每类异常都需要责任域和下一步动作。", tone: "blue" }
  ],
  unshipped: [
    { label: "核心判断", value: "超期集中在 7-10 天", note: "7-10 天未发货 3,120 单，占 62.1%。", tone: "red" },
    { label: "归因方向", value: "仓库 + SKU", note: "先从可售、拣配、标发状态三条线定位。", tone: "amber" },
    { label: "处理方式", value: "P0 清单", note: "15 天以上必须逐单确认补发、取消或客服同步。", tone: "blue" }
  ],
  stockout: [
    { label: "核心判断", value: "缺货要分三类", note: "订单缺货处理当下履约，库存缺货处理可售，预测缺货处理未来覆盖。", tone: "green" },
    { label: "当前影响", value: "订单缺货优先", note: "它直接进入未发货和异常问题件。", tone: "red" },
    { label: "数据依赖", value: "库存 + 预测", note: "完整分析需要可售、在途、需求预测和覆盖天数。", tone: "amber" }
  ],
  crossRegion: [
    { label: "核心判断", value: "跨区解释成本和时效", note: "目的地与发货仓错配会同时影响尾程时效和履约成本。", tone: "amber" },
    { label: "高风险组合", value: "加拿大 -> US West", note: "加拿大目的地由 US West 发货占 6%，需要看库存前置。", tone: "red" },
    { label: "治理方向", value: "仓网 + 调拨", note: "跨区不是单点异常，要反馈到仓网布点、调拨和备货节奏。", tone: "blue" }
  ]
};

const detailFlow = [
  { label: "付款", value: "06-20~06-25", score: 100, note: "以北京时间付款时间作为筛选基准" },
  { label: "审核", value: "待审/已审", score: auditSla24hRate, note: "系统自动审核和人工审核必须分开" },
  { label: "发货", value: "未发/已发", score: 85.2, note: "超期未发货和标发失败优先处理" },
  { label: "TMS 签收", value: "未签/已签", score: 76, note: "签收以 TMS 为准，物流商后台辅助核对" }
];

const overviewFunnel = [
  { label: "原始总单量", value: "128,456", score: 100, note: "平台已付款订单基准" },
  { label: "拆分总单量", value: "135,892", score: 106, note: "拆单后履约对象放大 5.8%" },
  { label: "24h 审单达成", value: auditSlaCounts.within24h.toLocaleString("en-US"), score: auditSla24hRate, note: "审单环节需按分子/分母复核" },
  { label: "24h 付款发货达成", value: "115,780", score: 85.2, note: "发货前链路开始掉速" },
  { label: "24h 商品发货达成", value: "168,166", score: 82.5, note: "商品行慢于订单，提示 SKU 侧问题" }
];

const analysisBars = {
  detailCauses: [
    { label: "超期未发货", value: 38, note: "付款后超过 SLA 仍无发货时间", tone: "red" },
    { label: "标发失败", value: 24, note: "需要物流下单或平台标发重试", tone: "red" },
    { label: "待审核", value: 18, note: "进入审核效能页定位系统/人工", tone: "amber" },
    { label: "未签收", value: 12, note: "进入 TMS 妥投分析", tone: "blue" },
    { label: "虚拟商品标识", value: 8, note: "自动发货商品不剔除但要标记", tone: "blue" }
  ],
  overviewCauses: [
    { label: "商品行未及时发货", value: 36, note: "SKU/部分发货/拆单影响", tone: "red" },
    { label: "超期未发货", value: 28, note: "付款后 >7 天仍未发", tone: "red" },
    { label: "人工审核慢", value: 18, note: "系统与人工需拆开看", tone: "amber" },
    { label: "物流妥投慢", value: 12, note: "TMS 签收阶梯低于预期", tone: "amber" },
    { label: "跨区发货", value: 6, note: "仓网/库存布点解释", tone: "blue" }
  ],
  deliveryCauses: [
    { label: "德国 / DHL", value: 31, note: "5天签收低于区域均值", tone: "red" },
    { label: "英国 / Royal Mail", value: 24, note: "周末积压导致 3天掉速", tone: "amber" },
    { label: "加拿大 / Canada Post", value: 18, note: "跨区发货影响尾程", tone: "amber" },
    { label: "美国 / UPS", value: 16, note: "体量大但妥投稳定", tone: "blue" },
    { label: "法国 / DHL", value: 11, note: "仓库切换带来波动", tone: "blue" }
  ],
  auditLag: [
    { label: "Mark", value: 11.4, note: "平均审单间隔最高", tone: "red" },
    { label: "Lynn", value: 9.6, note: "需看异常单占比", tone: "amber" },
    { label: "海浪", value: 7.8, note: "人工作业相对稳定", tone: "blue" },
    { label: "系统自动审核", value: 1.1, note: "单独统计，不进人工排行", tone: "green" }
  ],
  exceptionCauses: [
    { label: "库存/缺货", value: 31.1, note: "缺货(OS) 是最大问题件", tone: "red" },
    { label: "仓库作业", value: 16.6, note: "仓库出库失败", tone: "amber" },
    { label: "仓配映射", value: 13.5, note: "未匹配仓库/物流", tone: "amber" },
    { label: "物流接口", value: 12.4, note: "物流下单失败", tone: "blue" },
    { label: "SKU 映射", value: 10.6, note: "MSKU 未配对", tone: "blue" }
  ],
  unshippedCauses: [
    { label: "SKU 可售不足", value: 34, note: "与库存缺货强相关", tone: "red" },
    { label: "仓库拣配积压", value: 27, note: "小包仓处理量承压", tone: "amber" },
    { label: "标发/物流失败", value: 19, note: "需要接口重试和日志", tone: "amber" },
    { label: "人工审核滞后", value: 12, note: "人工审核慢导致前置卡点", tone: "blue" },
    { label: "地址/异常待处理", value: 8, note: "进入问题件闭环", tone: "blue" }
  ],
  distributionCauses: [
    { label: "美国订单体量", value: 30, note: "单区体量最高，影响总览波动", tone: "amber" },
    { label: "中国自发货结构", value: 14.9, note: "需区分本地仓与跨区仓", tone: "blue" },
    { label: "德国妥投慢", value: 11, note: "与 DHL 签收阶梯联动", tone: "red" },
    { label: "英国待发货", value: 9, note: "Royal Mail 与仓库处理联动", tone: "amber" },
    { label: "法国跨区", value: 6.9, note: "DE WH 发货占比偏高", tone: "blue" }
  ],
  productCauses: [
    { label: "S12-PUMP-US", value: 28, note: "体量最大且商品行慢发", tone: "red" },
    { label: "S9-BOTTLE-CA", value: 22, note: "仓库覆盖不足", tone: "amber" },
    { label: "M5-WARM-DE", value: 15, note: "缺货和物流失败交叉", tone: "amber" },
    { label: "MSKU 未配对", value: 11, note: "影响标发与库存识别", tone: "blue" },
    { label: "虚拟商品标识", value: 6, note: "需单独保留自动发货状态", tone: "blue" }
  ],
  shippingLoad: [
    { label: "小包仓订单负载", value: 64, note: "处理单量占比最高", tone: "amber" },
    { label: "小包仓商品件数", value: 57, note: "商品件数压力高于订单视角", tone: "red" },
    { label: "海外仓订单负载", value: 36, note: "承接稳定但需看区域库存", tone: "blue" },
    { label: "标发失败批次", value: 19, note: "需系统和物流接口协同", tone: "red" }
  ],
  crossRegionCauses: [
    { label: "目的国缺可售", value: 34, note: "本地库存不足导致跨区", tone: "red" },
    { label: "仓库覆盖不足", value: 27, note: "仓网布点与 SKU 前置不足", tone: "amber" },
    { label: "调拨未到仓", value: 18, note: "在途与可售口径需联动", tone: "amber" },
    { label: "物流成本策略", value: 12, note: "部分低成本渠道牺牲时效", tone: "blue" },
    { label: "SKU 映射问题", value: 9, note: "仓库/SKU 映射导致错配", tone: "blue" }
  ]
};

const auditSplit = [
  { label: "系统自动审核", value: systemAuditShare, note: `${auditVolumeCounts.system.toLocaleString("en-US")} 单，平均 1.1h`, tone: "green" },
  { label: "人工审核", value: manualAuditShare, note: `${auditVolumeCounts.manual.toLocaleString("en-US")} 单，需要看人员和班次`, tone: "amber" }
];

const stockoutSplit = [
  { label: "订单缺货", value: 46, note: "影响当下未发货和问题件", tone: "red" },
  { label: "库存缺货", value: 34, note: "可售不足或仓库不可用", tone: "amber" },
  { label: "预测缺货", value: 20, note: "未来覆盖天数低于阈值", tone: "blue" }
];

const distributionStatusSplit = [
  { label: "已发货", value: 89, note: "主流状态，但商品行及时率偏低", tone: "green" },
  { label: "待发货", value: 4, note: "进入未发货预警", tone: "amber" },
  { label: "待审核", value: 3, note: "进入审核效能", tone: "blue" },
  { label: "问题件", value: 4, note: "进入异常闭环", tone: "red" }
];

const shippingCapacitySplit = [
  { label: "小包仓", value: 64, note: "处理单量主承压", tone: "amber" },
  { label: "海外仓", value: 36, note: "区域稳定性依赖库存前置", tone: "blue" }
];

const riskBoards = {
  unshipped: [
    { title: "S12-PUMP-US / US West", value: "1,086 单", meta: "可售不足 + 拣配积压", tone: "red" },
    { title: "S9-BOTTLE-CA / CA WH", value: "642 单", meta: "仓库覆盖不足", tone: "amber" },
    { title: "M5-WARM-DE / DE WH", value: "518 单", meta: "DHL 下单失败集中", tone: "amber" },
    { title: "GIFT-CARD / Virtual", value: "96 单", meta: "自动发货标识需核对", tone: "blue" }
  ],
  stockout: [
    { title: "S12-PUMP-US", value: "订单缺货 718", meta: "直接拉高未发货预警", tone: "red" },
    { title: "S9-BOTTLE-CA", value: "覆盖 3.2 天", meta: "库存缺货风险", tone: "amber" },
    { title: "M5-WARM-DE", value: "预测缺口 1,420", meta: "未来 14 天覆盖不足", tone: "amber" },
    { title: "S12-PUMP-UK", value: "在途 860", meta: "需确认到仓时间", tone: "blue" }
  ],
  product: [
    { title: "S12-PUMP-US", value: "24h 74.8%", meta: "体量大且慢发", tone: "red" },
    { title: "S9-BOTTLE-CA", value: "24h 69.3%", meta: "仓库覆盖不足", tone: "red" },
    { title: "M5-WARM-DE", value: "24h 88.7%", meta: "受德国物流影响", tone: "amber" },
    { title: "GIFT-CARD", value: "100%", meta: "保留自动发货标识", tone: "blue" }
  ],
  crossRegion: [
    { title: "加拿大 / US West", value: "6%", meta: "尾程变长且成本上升", tone: "red" },
    { title: "法国 / DE WH", value: "7%", meta: "区域仓替代发货", tone: "amber" },
    { title: "德国 / CN Hub", value: "5%", meta: "本地可售不足", tone: "amber" },
    { title: "美国 / CN Hub", value: "8%", meta: "需核查预售和补货", tone: "red" }
  ]
};

const actionLists = {
  detail: [
    { owner: "履约运营", action: "把未发货、标发失败、未签收三类下钻入口固定到明细", due: "今日", priority: "P0" },
    { owner: "BI", action: "明细表保留 ref_no、erp_code、SKU、仓库、物流和四段时点", due: "今日", priority: "P0" },
    { owner: "数据", action: "补 TMS 签收字段和审核事件日志字段", due: "本周", priority: "P1" }
  ],
  overview: [
    { owner: "履约运营", action: "拉出 5,028 单超期未发货 P0 清单", due: "今日", priority: "P0" },
    { owner: "仓库", action: "核对小包仓 SKU 拣配积压和标发失败", due: "今日", priority: "P0" },
    { owner: "BI", action: "补齐系统/人工审核字段和 TMS 签收事实源", due: "本周", priority: "P1" }
  ],
  delivery: [
    { owner: "物流", action: "复核德国 DHL 与英国 Royal Mail 的 5天签收掉速", due: "今日", priority: "P0" },
    { owner: "仓网", action: "确认加拿大跨区发货是否导致尾程延迟", due: "明日", priority: "P1" },
    { owner: "数据", action: "固化 TMS sign_time 与 package_status 同步口径", due: "本周", priority: "P1" }
  ],
  exception: [
    { owner: "供应链", action: "缺货(OS) 单独进入订单缺货清单", due: "今日", priority: "P0" },
    { owner: "仓库", action: "仓库出库失败建立按仓库/班次的处理队列", due: "明日", priority: "P1" },
    { owner: "系统", action: "物流下单失败补接口重试和失败码分类", due: "本周", priority: "P1" }
  ],
  unshipped: [
    { owner: "履约运营", action: "15天以上未发货逐单确认补发/取消/客服同步", due: "今日", priority: "P0" },
    { owner: "计划", action: "S12-PUMP-US 与 S9-BOTTLE-CA 拉库存和在途", due: "今日", priority: "P0" },
    { owner: "仓库", action: "核查小包仓拣配积压和标发失败批次", due: "明日", priority: "P1" }
  ],
  stockout: [
    { owner: "履约运营", action: "订单缺货并入未发货预警和异常问题件闭环", due: "今日", priority: "P0" },
    { owner: "库存", action: "库存缺货按 SKU + 仓库核对可售、占用和在途", due: "明日", priority: "P1" },
    { owner: "计划", action: "预测缺货按区域覆盖天数触发补货建议", due: "本周", priority: "P1" }
  ],
  distribution: [
    { owner: "履约运营", action: "把美国、中国、德国、英国设为区域日监控 Top 组", due: "今日", priority: "P0" },
    { owner: "BI", action: "订单状态结构按国家、SKU、仓库同步拆解", due: "明日", priority: "P1" },
    { owner: "仓网", action: "对德国、法国跨区和妥投慢区域做仓库覆盖复盘", due: "本周", priority: "P1" }
  ],
  product: [
    { owner: "计划", action: "S12-PUMP-US 和 S9-BOTTLE-CA 拉可售、在途和预测覆盖", due: "今日", priority: "P0" },
    { owner: "运营", action: "慢发 SKU 与预售标签、虚拟商品标识做交叉核对", due: "明日", priority: "P1" },
    { owner: "数据", action: "补 MSKU、seller_sku、supply_sku 的映射质量字段", due: "本周", priority: "P1" }
  ],
  shipping: [
    { owner: "仓库", action: "小包仓按订单量和商品件数双指标排班", due: "今日", priority: "P0" },
    { owner: "系统", action: "标发失败批次按物流渠道和失败码重试", due: "明日", priority: "P1" },
    { owner: "仓网", action: "结合跨区发货和库存缺货调整分仓策略", due: "本周", priority: "P1" }
  ],
  crossRegion: [
    { owner: "仓网", action: "加拿大、法国、德国高跨区组合做库存前置复盘", due: "明日", priority: "P1" },
    { owner: "计划", action: "跨区 SKU 纳入补货和调拨优先级", due: "本周", priority: "P1" },
    { owner: "财务", action: "平均发货成本 V0 占位，后续接入后验证跨区成本影响", due: "后续", priority: "P1" }
  ]
};

const executionTodos = [
  { status: "done", title: "指标体系和指标字典前置", detail: "已完成 L0-L3、P0 指标、5 条业务口径覆盖表。" },
  { status: "done", title: "页面级故事线容器", detail: "每个重点页面增加洞察摘要、主图、归因和行动清单位置。" },
  { status: "done", title: "高优先级图表分析", detail: "总览、未发货、缺货、审核、妥投、异常已落图表。" },
  { status: "done", title: "补齐次级页面图表", detail: "订单明细、订单分布、商品履约、发货效能、跨区发货已细化。" },
  { status: "done", title: "图表-数据绑定矩阵", detail: "每个页面图表已绑定主表、字段、分母、筛选和下钻键。" },
  { status: "done", title: "只读数据契约草稿", detail: "事实表、聚合表、维表、刷新频率和准备度已整理。" },
  { status: "next", title: "接真实只读数据", detail: "用已定义契约替换样例数据，校验分子分母和字段血缘。" },
  { status: "next", title: "页面级 E2E", detail: "验证 tab、筛选、下钻、弹窗、移动端和无控制台红项。" }
];

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function renderInsightStrip(target, items) {
  qs(target).innerHTML = items.map((item) => `
    <article class="insight-card ${item.tone}">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
      <p>${item.note}</p>
    </article>
  `).join("");
}

function renderFunnel(target, rows) {
  qs(target).innerHTML = rows.map((row, index) => {
    const width = Math.max(52, Math.min(100, row.score));
    return `
      <article class="funnel-row">
        <div class="funnel-label">
          <span>${index + 1}</span>
          <strong>${row.label}</strong>
        </div>
        <div class="funnel-track">
          <i style="width:${width}%"></i>
          <em>${row.value}</em>
        </div>
        <p>${row.note}</p>
      </article>
    `;
  }).join("");
}

function renderBarList(target, rows, unit = "%") {
  const max = Math.max(...rows.map((row) => row.value));
  qs(target).innerHTML = rows.map((row) => {
    const width = Math.max(8, Math.round((row.value / max) * 100));
    return `
      <article class="analysis-bar-row ${row.tone}">
        <div class="bar-row-head">
          <strong>${row.label}</strong>
          <span>${row.value}${unit}</span>
        </div>
        <div class="analysis-bar-track"><i style="width:${width}%"></i></div>
        <p>${row.note}</p>
      </article>
    `;
  }).join("");
}

function renderSplitChart(target, rows) {
  qs(target).innerHTML = `
    <div class="split-stack">
      ${rows.map((row) => `<i class="${row.tone}" style="width:${row.value}%"></i>`).join("")}
    </div>
    <div class="split-legend">
      ${rows.map((row) => `
        <article>
          <span class="dot ${row.tone}"></span>
          <div>
            <strong>${row.label} · ${row.value}%</strong>
            <p>${row.note}</p>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderRiskBoard(target, rows) {
  qs(target).innerHTML = rows.map((row) => `
    <article class="risk-card ${row.tone}">
      <span>${row.title}</span>
      <strong>${row.value}</strong>
      <p>${row.meta}</p>
    </article>
  `).join("");
}

function renderActionList(target, rows) {
  qs(target).innerHTML = rows.map((row) => `
    <article class="action-item">
      <span class="badge ${row.priority === "P0" ? "red" : "blue"}">${row.priority}</span>
      <div>
        <strong>${row.owner}</strong>
        <p>${row.action}</p>
      </div>
      <em>${row.due}</em>
    </article>
  `).join("");
}

function renderTodoBoard() {
  qs("#executionTodoBoard").innerHTML = executionTodos.map((item) => `
    <article class="todo-item ${item.status}">
      <span>${item.status === "done" ? "已完成" : item.status === "doing" ? "执行中" : "待执行"}</span>
      <strong>${item.title}</strong>
      <p>${item.detail}</p>
    </article>
  `).join("");
}

function renderMetricTable(search = "") {
  const needle = search.trim().toLowerCase();
  const rows = metricDictionary.filter((item) => {
    const text = `${item.level} ${item.name} ${item.definition} ${item.grain} ${item.source} ${item.chart}`.toLowerCase();
    return !needle || text.includes(needle);
  });
  qs("#metricTable").innerHTML = rows.map((item) => `
    <tr>
      <td><span class="badge ${item.level === "L0" ? "green" : item.level === "L1" ? "blue" : "amber"}">${item.level}</span></td>
      <td><strong>${item.name}</strong></td>
      <td>${item.definition}</td>
      <td>${item.grain}</td>
      <td>${item.source}</td>
      <td>${item.chart}</td>
    </tr>
  `).join("");
}

function renderAlignment() {
  qs("#alignmentList").innerHTML = alignmentItems.map((item) => `
    <article class="alignment-item">
      <strong>${item.title}</strong>
      <p>${item.body}</p>
    </article>
  `).join("");
}

function renderKpis(group = "all") {
  const visible = group === "all" ? kpis : kpis.filter((item) => item.group === group);
  qs("#kpiRail").innerHTML = visible.map((item) => `
    <article class="kpi-card">
      <span>${item.name}</span>
      <strong>${item.value}<em>${item.unit}</em></strong>
      <small>${item.denom || "Readdy 样例数据"}</small>
      <div class="delta ${item.good ? "good" : ""}">${item.good ? "提升" : "环比"} ${item.delta}</div>
    </article>
  `).join("");
}

function renderTrend() {
  const maxOrders = Math.max(...trend.map((item) => item[1]));
  qs("#trendChart").innerHTML = trend.map(([label, orders, rate]) => {
    const height = Math.max(28, Math.round((orders / maxOrders) * 260));
    const point = Math.max(18, Math.round((100 - rate) * 11));
    return `
      <div class="bar-column">
        <div class="bar" style="height:${height}px">
          <i class="line-point" style="top:${point}px"></i>
        </div>
        <span>${label}</span>
      </div>
    `;
  }).join("");
}

function renderRegions() {
  qs("#heatGrid").innerHTML = regions.slice(0, 12).map(([name, count, share]) => {
    const alpha = Math.max(0.15, Math.min(0.9, share / 32));
    return `
      <article class="heat-cell" style="background: rgba(0, 180, 42, ${alpha})">
        <strong>${name}</strong>
        <span>${count.toLocaleString()} 单 · ${share}%</span>
      </article>
    `;
  }).join("");
  qs("#regionRank").innerHTML = regions.map(([name, count, share], index) => `
    <div class="rank-row">
      <span class="index">${index + 1}</span>
      <div>
        <strong>${name}</strong>
        <div class="rank-bar"><i style="width:${share * 3.1}%"></i></div>
      </div>
      <span>${count.toLocaleString()} 单<br>${share}%</span>
    </div>
  `).join("");
}

function renderRows(target, rows) {
  qs(target).innerHTML = rows.map((row) => `
    <tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>
  `).join("");
}

function renderDelivery() {
  qs("#deliveryGrid").innerHTML = deliveries.map(([name, value, note]) => `
    <article class="delivery-card">
      <strong>${name}</strong>
      <div class="progress"><i style="width:${value}%"></i></div>
      <span class="badge ${value >= 90 ? "green" : value >= 75 ? "blue" : "amber"}">${value}%</span>
      <p>${note}</p>
    </article>
  `).join("");
}

function renderShipping() {
  qs("#shippingBars").innerHTML = shippingEfficiency.map(([name, smallPacket, overseas, note]) => {
    const total = smallPacket + overseas;
    const smallShare = Math.round((smallPacket / total) * 100);
    const overseasShare = 100 - smallShare;
    return `
      <article class="efficiency-card">
        <strong>${name}</strong>
        <div class="stack-bar">
          <i style="width:${smallShare}%"></i>
          <i style="width:${overseasShare}%"></i>
        </div>
        <p>小包仓 ${smallPacket.toLocaleString()} · 海外仓 ${overseas.toLocaleString()}</p>
        <p>${note}</p>
      </article>
    `;
  }).join("");
}

function renderIssues() {
  qs("#issueList").innerHTML = issues.map(([name, count, share]) => `
    <article class="issue-row">
      <div>
        <strong>${name}</strong>
        <small>${count.toLocaleString()} 单</small>
        <div class="progress"><i style="width:${share * 2.6}%"></i></div>
      </div>
      <span class="badge ${share > 20 ? "red" : "amber"}">${share}%</span>
    </article>
  `).join("");
}

function renderUnshippedWarnings() {
  renderRows("#unshippedRows", unshippedWarnings);
}

function renderStockoutDecisions() {
  qs("#stockoutDecisions").innerHTML = stockoutDecisions.map((item) => `
    <article class="decision-card">
      <strong>${item.title}</strong>
      <p>${item.body}</p>
      <ul>${item.asks.map((ask) => `<li>${ask}</li>`).join("")}</ul>
    </article>
  `).join("");
}

function renderCrossRegion() {
  const headers = ["目的地 / 发货仓", "US West", "DE WH", "UK WH", "CN Hub", "CA WH"];
  const rows = [
    ["美国", "30%", "4%", "2%", "8%", "1%"],
    ["德国", "3%", "11%", "2%", "5%", "0.4%"],
    ["英国", "2%", "3%", "9%", "4%", "0.5%"],
    ["加拿大", "6%", "1%", "0.5%", "2%", "5%"],
    ["法国", "2%", "7%", "1%", "3%", "0.2%"]
  ];
  const cells = [
    ...headers.map((h) => `<div class="matrix-cell header">${h}</div>`),
    ...rows.flatMap((row) => row.map((cell, index) => {
      const value = parseFloat(cell);
      const tone = index === 0 ? "header" : value >= 6 ? "risk" : value >= 3 ? "" : "ok";
      return `<div class="matrix-cell ${tone}">${cell}</div>`;
    }))
  ];
  qs("#crossRegionMatrix").innerHTML = cells.join("");
}

function renderStories() {
  qs("#storyGrid").innerHTML = stories.map((item) => `
    <article class="story-card">
      <div class="story-meta">
        <span class="badge green">指标后置故事线</span>
        <span class="badge blue">${item.charts.split("、")[0]}</span>
      </div>
      <strong>${item.title}</strong>
      <p><b>要解决的问题：</b>${item.problem}</p>
      <p><b>核心指标：</b>${item.metrics}</p>
      <p><b>图表设计：</b>${item.charts}</p>
      <p><b>业务动作：</b>${item.action}</p>
    </article>
  `).join("");
}

function renderDataTables() {
  qs("#dataTableRows").innerHTML = dataTables.map((row) => `
    <tr>${row.map((cell, index) => `<td>${index === 0 ? `<strong>${cell}</strong>` : cell}</td>`).join("")}</tr>
  `).join("");
}

function renderStorylineAnalysis() {
  renderInsightStrip("#detailInsights", pageInsights.detail);
  renderInsightStrip("#overviewInsights", pageInsights.overview);
  renderInsightStrip("#distributionInsights", pageInsights.distribution);
  renderInsightStrip("#deliveryInsights", pageInsights.delivery);
  renderInsightStrip("#productInsights", pageInsights.product);
  renderInsightStrip("#shippingInsights", pageInsights.shipping);
  renderInsightStrip("#auditInsights", pageInsights.audit);
  renderInsightStrip("#exceptionInsights", pageInsights.exception);
  renderInsightStrip("#unshippedInsights", pageInsights.unshipped);
  renderInsightStrip("#stockoutInsights", pageInsights.stockout);
  renderInsightStrip("#crossRegionInsights", pageInsights.crossRegion);
  renderFunnel("#detailFlow", detailFlow);
  renderFunnel("#overviewFunnel", overviewFunnel);
  renderBarList("#detailCauseBars", analysisBars.detailCauses);
  renderBarList("#overviewCauseBars", analysisBars.overviewCauses);
  renderBarList("#distributionCauseBars", analysisBars.distributionCauses);
  renderBarList("#deliveryCauseBars", analysisBars.deliveryCauses);
  renderBarList("#productCauseBars", analysisBars.productCauses);
  renderBarList("#shippingLoadBars", analysisBars.shippingLoad);
  renderBarList("#auditLagBars", analysisBars.auditLag, "h");
  renderBarList("#exceptionCauseBars", analysisBars.exceptionCauses);
  renderBarList("#unshippedCauseBars", analysisBars.unshippedCauses);
  renderBarList("#crossRegionCauseBars", analysisBars.crossRegionCauses);
  renderSplitChart("#distributionStatusChart", distributionStatusSplit);
  renderSplitChart("#shippingCapacityChart", shippingCapacitySplit);
  renderSplitChart("#auditSplitChart", auditSplit);
  renderSplitChart("#stockoutTypeChart", stockoutSplit);
  renderRiskBoard("#productRiskBoard", riskBoards.product);
  renderRiskBoard("#unshippedRiskBoard", riskBoards.unshipped);
  renderRiskBoard("#stockoutRiskBoard", riskBoards.stockout);
  renderRiskBoard("#crossRegionRiskBoard", riskBoards.crossRegion);
  renderActionList("#detailActions", actionLists.detail);
  renderActionList("#overviewActions", actionLists.overview);
  renderActionList("#distributionActions", actionLists.distribution);
  renderActionList("#deliveryActions", actionLists.delivery);
  renderActionList("#productActions", actionLists.product);
  renderActionList("#shippingActions", actionLists.shipping);
  renderActionList("#exceptionActions", actionLists.exception);
  renderActionList("#unshippedActions", actionLists.unshipped);
  renderActionList("#stockoutActions", actionLists.stockout);
  renderActionList("#crossRegionActions", actionLists.crossRegion);
  renderTodoBoard();
}

function showToast(message) {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 1700);
}

let modalTrigger = null;

function closeModal() {
  const modal = qs("#modal");
  modal.classList.add("hidden");
  if (modalTrigger instanceof HTMLElement) modalTrigger.focus();
  modalTrigger = null;
}

function showModal(kind, trigger) {
  const modal = qs("#modal");
  const title = qs("#modalTitle");
  const body = qs("#modalBody");
  const content = {
    detail: {
      title: "订单履约明细口径",
      body: `
        <p>明细表默认包含未发货订单，核心主键为平台单号 ref_no 与系统自发货单号 erp_code。</p>
        <h4>关键规则</h4>
        <p>拆单废弃不统计；其他废弃需要计算在内。整单只有虚拟商品时暂不剔除，但必须保留虚拟商品自动发货标识。</p>
        <h4>缺口</h4>
        <p>审核时间需要支持多次审核日志，并区分系统自动审核与人工审核；签收时间以 TMS 为准。</p>
      `
    },
    exception: {
      title: "异常问题件字段契约",
      body: `
        <p>异常标识来自 order_status 小状态映射，异常信息来自 error_remark。问题件明细必须保留订单号、异常标识、异常信息、责任域、处理状态和 Owner。</p>
        <h4>建议分组</h4>
        <p>缺货、仓库出库失败、未匹配仓库/物流、物流下单失败、SKU 未配对、标发异常。</p>
      `
    },
    unshipped: {
      title: "未发货预警口径",
      body: `
        <p>未发货预警是独立模块，口径为付款后超过 SLA 仍没有发货时间的有效自发货订单。</p>
        <h4>分层规则</h4>
        <p>默认按 7-10 天、10-15 天、15 天以上分层，并保留仓库、SKU、异常标识、当前 Owner 和下一步动作。</p>
      `
    }
  }[kind];
  title.textContent = content.title;
  body.innerHTML = content.body;
  modalTrigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
  modal.classList.remove("hidden");
  window.requestAnimationFrame(() => qs("#closeModal").focus());
}

function setupInteractions() {
  qsa(".tabbar button").forEach((button) => {
    button.addEventListener("click", () => {
      qsa(".tabbar button").forEach((item) => item.classList.remove("active"));
      qsa("[data-page]").forEach((page) => page.classList.remove("active"));
      button.classList.add("active");
      qs(`#${button.dataset.tab}`).classList.add("active");
    });
  });

  qsa("#kpiMode button").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("#kpiMode button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderKpis(button.dataset.kpiGroup);
    });
  });

  qs("#metricSearch").addEventListener("input", (event) => {
    renderMetricTable(event.target.value);
  });

  qs("#saveView").addEventListener("click", () => showToast("视图已保存为本地原型状态"));
  qs("#clearFilters").addEventListener("click", () => showToast("筛选已恢复为样例默认值"));
  qs("#closeModal").addEventListener("click", closeModal);
  qs("#modal").addEventListener("click", (event) => {
    if (event.target.id === "modal") closeModal();
  });
  qs("#modal").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(qs("#modal").querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.disabled && element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  qsa("[data-drilldown]").forEach((button) => {
    button.addEventListener("click", () => showModal(button.dataset.drilldown, button));
  });
}

function boot() {
  renderMetricTable();
  renderAlignment();
  renderKpis();
  renderTrend();
  renderRegions();
  renderRows("#orderRows", orderRows);
  renderRows("#productRows", productRows);
  renderRows("#auditRows", auditRows);
  renderDelivery();
  renderShipping();
  renderIssues();
  renderUnshippedWarnings();
  renderStockoutDecisions();
  renderCrossRegion();
  renderStories();
  renderDataTables();
  renderStorylineAnalysis();
  setupInteractions();
}

boot();
