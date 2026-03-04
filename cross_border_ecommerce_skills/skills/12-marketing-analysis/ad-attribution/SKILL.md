---
name: cbec-ad-attribution
description: |
  跨境电商广告归因分析Skill。提供多触点归因、ROAS分析、渠道效率评估、投放优化建议，帮助优化广告投放ROI。

  触发条件:
  1. 用户提到"广告归因"、"ROAS"、"广告效果"
  2. 用户询问"渠道效率"、"投放优化"、"多触点归因"
  3. 用户需要"广告ROI"、"获客成本"分析

  输出内容:
  - 多触点归因分析
  - ROAS计算与评估
  - 渠道效率对比
  - 投放优化建议
---

# 跨境电商广告归因分析 Skill

## 概述

本Skill帮助跨境电商卖家科学评估广告投放效果。通过多触点归因模型、ROAS分析、渠道效率评估，找到最优的广告组合和预算分配方案，最大化广告投资回报。

## 核心功能

### 1. 多触点归因
- **首次触点归因**: 100%归功于首次接触渠道
- **最后触点归因**: 100%归功于最后接触渠道
- **线性归因**: 各触点平均分配
- **时间衰减归因**: 越接近转化的触点权重越高
- **位置归因**: 首尾触点权重高，中间平分

### 2. ROAS分析
- **ROAS计算**: 广告带来收入 / 广告支出
- **ROAS评估**: 与目标ROAS对比
- **趋势分析**: ROAS随时间变化

### 3. 渠道效率评估
- **CPA/CAC**: 各渠道获客成本
- **转化率**: 各渠道转化效率
- **LTV/CAC**: 长期价值与成本比

### 4. 预算优化
- **边际ROAS**: 增量投入的回报
- **预算分配**: 基于效率的最优分配
- **饱和度分析**: 渠道投放上限

## 使用方法

### 输入要求

**必需字段**:
| 字段 | 类型 | 说明 |
|------|------|------|
| date | date | 日期 |
| channel | string | 广告渠道 |
| spend | numeric | 广告支出 |
| impressions | numeric | 曝光数 |
| clicks | numeric | 点击数 |
| conversions | numeric | 转化数 |
| revenue | numeric | 广告带来收入 |

**多触点归因需要**:
| 字段 | 类型 | 说明 |
|------|------|------|
| customer_id | string | 客户ID |
| touchpoint_order | integer | 触点顺序 |
| touchpoint_channel | string | 触点渠道 |
| conversion_value | numeric | 转化价值 |

### 分析流程

```
步骤1: 数据准备
- 加载广告数据
- 数据清洗与验证
- 按渠道分组

步骤2: 计算基础指标
- CTR、CPC、CPA
- ROAS、ROI
- 转化率

步骤3: 多触点归因
- 构建用户触点路径
- 应用归因模型
- 计算各渠道归因收入

步骤4: 渠道效率评估
- 对比各渠道指标
- 计算LTV/CAC
- 评估渠道质量

步骤5: 预算优化
- 计算边际ROAS
- 推荐预算分配
- 生成优化建议
```

### 输出内容

**1. 渠道效率概览**

```markdown
# 广告归因分析报告

## 渠道效率概览

| 渠道 | 支出 | 收入 | ROAS | CPA | 转化率 | LTV/CAC |
|------|------|------|------|-----|--------|---------|
| Google搜索 | $50,000 | $200,000 | 4.0 | $25 | 3.2% | 4.2 |
| Facebook | $40,000 | $120,000 | 3.0 | $32 | 2.1% | 3.1 |
| Instagram | $25,000 | $62,500 | 2.5 | $40 | 1.8% | 2.4 |
| TikTok | $15,000 | $30,000 | 2.0 | $50 | 1.5% | 1.8 |
| 邮件营销 | $5,000 | $40,000 | 8.0 | $8 | 5.5% | 12.5 |
| 总计 | $135,000 | $452,500 | 3.4 | $29 | 2.8% | 4.0 |

### 关键发现
1. 邮件营销ROAS最高(8.0)，但规模有限
2. Google搜索量最大且ROAS良好(4.0)
3. TikTok ROAS偏低，需优化或缩减
4. 整体ROAS 3.4，超过目标3.0
```

**2. 多触点归因分析**

```markdown
## 多触点归因分析

### 用户转化路径示例

```
用户A路径: 社交广告 → 搜索广告 → 直接访问 → 购买$150
用户B路径: 邮件 → 搜索广告 → 购买$80
用户C路径: 展示广告 → 社交广告 → 搜索广告 → 购买$200
```

### 各归因模型对比

| 渠道 | 首次触点 | 最后触点 | 线性 | 时间衰减 | 位置 |
|------|---------|---------|------|---------|------|
| Google搜索 | $80,000 | $180,000 | $140,000 | $160,000 | $130,000 |
| Facebook | $120,000 | $90,000 | $95,000 | $85,000 | $100,000 |
| Instagram | $60,000 | $40,000 | $50,000 | $45,000 | $55,000 |
| 邮件营销 | $50,000 | $70,000 | $55,000 | $60,000 | $60,000 |
| 直接访问 | $20,000 | $50,000 | $35,000 | $40,000 | $30,000 |

### 推荐归因模型
- 适用场景: 时间衰减归因
- 理由: 跨境电商决策周期较长，近期触点影响更大
- 权重: 触点越接近转化，权重越高

### 归因洞察
1. 搜索广告作为"收单"渠道，最后触点归因收入高
2. 社交广告更多承担"种草"角色，首次触点归因收入高
3. 邮件营销主要作用于老客户复购
```

**3. ROAS趋势分析**

```markdown
## ROAS趋势分析

### 月度ROAS变化

| 月份 | Google | Facebook | Instagram | TikTok | 邮件 | 整体 |
|------|--------|----------|-----------|--------|------|------|
| 10月 | 3.5 | 2.8 | 2.2 | 1.8 | 7.5 | 3.0 |
| 11月 | 3.8 | 3.0 | 2.4 | 1.9 | 7.8 | 3.2 |
| 12月 | 4.5 | 3.5 | 2.8 | 2.2 | 8.5 | 3.8 |
| 1月 | 4.0 | 3.0 | 2.5 | 2.0 | 8.0 | 3.4 |

### 趋势分析
- Q4旺季ROAS普遍提升
- 1月回落但仍高于Q3
- Google ROAS最稳定
- TikTok波动较大

### 目标vs实际
| 渠道 | 目标ROAS | 实际ROAS | 达成率 |
|------|---------|---------|--------|
| Google搜索 | 4.0 | 4.0 | 100% |
| Facebook | 3.5 | 3.0 | 86% |
| Instagram | 3.0 | 2.5 | 83% |
| TikTok | 2.5 | 2.0 | 80% |
```

**4. 预算优化建议**

```markdown
## 预算优化建议

### 当前预算分配 vs 推荐分配

| 渠道 | 当前预算 | 当前占比 | 推荐预算 | 推荐占比 | 变化 |
|------|---------|---------|---------|---------|------|
| Google搜索 | $50,000 | 37% | $60,000 | 44% | +20% |
| Facebook | $40,000 | 30% | $38,000 | 28% | -5% |
| Instagram | $25,000 | 19% | $22,000 | 16% | -12% |
| TikTok | $15,000 | 11% | $10,000 | 7% | -33% |
| 邮件营销 | $5,000 | 4% | $6,000 | 4% | +20% |

### 优化依据

**增加Google搜索预算**:
- 边际ROAS: 3.8（仍有提升空间）
- 规模扩大后ROAS稳定
- 建议: +$10,000

**减少TikTok预算**:
- 边际ROAS: 1.5（接近盈亏线）
- 规模扩大后效率下降明显
- 建议: -$5,000，专注高质量受众

### 预期效果
- 调整后整体ROAS: 3.4 → 3.6 (+6%)
- 月增收: $8,000
- 月节省成本: $5,000
```

**5. 渠道饱和度分析**

```markdown
## 渠道饱和度分析

### 边际ROAS曲线

```
ROAS
5.0 ┤●
4.0 ┤ ●●
3.0 ┤   ●●●
2.0 ┤      ●●●
1.0 ┤         ●●●
0.0 └─────────────────
     $0 $20K $40K $60K $80K 月投入

--- Google搜索
--- Facebook
--- TikTok
```

### 饱和度评估

| 渠道 | 当前投入 | 推荐上限 | 饱和度 | 建议 |
|------|---------|---------|--------|------|
| Google搜索 | $50K | $80K | 63% | 可增加投入 |
| Facebook | $40K | $55K | 73% | 接近饱和 |
| Instagram | $25K | $35K | 71% | 接近饱和 |
| TikTok | $15K | $20K | 75% | 已接近饱和 |
| 邮件营销 | $5K | $8K | 63% | 可增加投入 |

### 洞察
- Google搜索和邮件营销仍有扩展空间
- TikTok在低投入时ROAS尚可，但快速饱和
- 建议优先扩展Google搜索
```

## 核心公式

### ROAS
```
ROAS = 广告带来收入 / 广告支出

示例:
- 广告支出: $50,000
- 带来收入: $200,000
- ROAS = 200000 / 50000 = 4.0
```

### CPA (Cost Per Acquisition)
```
CPA = 广告支出 / 转化数

示例:
- 广告支出: $50,000
- 转化数: 2,000
- CPA = 50000 / 2000 = $25
```

### CAC (Customer Acquisition Cost)
```
CAC = 总营销成本 / 新客户数

示例:
- 总营销成本: $100,000
- 新客户数: 3,000
- CAC = 100000 / 3000 = $33.3
```

### LTV/CAC比率
```
LTV/CAC = 客户终身价值 / 获客成本

评估标准:
- < 1: 不可持续，每获一客亏损
- 1-3: 需要优化
- > 3: 健康
- > 5: 非常健康，可加大投入

示例:
- LTV: $120
- CAC: $30
- LTV/CAC = 120 / 30 = 4.0（健康）
```

### 多触点归因权重

**线性归因**:
```
每个触点权重 = 1 / 触点总数

示例: 3个触点，每个触点33.3%权重
```

**时间衰减归因**:
```
权重_i = 2^(-i/half_life)

示例(half_life=7天):
- 1天前触点: 2^(-1/7) = 0.91
- 7天前触点: 2^(-7/7) = 0.50
- 14天前触点: 2^(-14/7) = 0.25
```

**位置归因**:
```
首次触点: 40%
最后触点: 40%
中间触点: 20% / 中间触点数

示例: 4个触点
- 首次: 40%
- 最后: 40%
- 中间2个: 各10%
```

## 示例

### 示例1: 全渠道归因分析

**场景**: 用户在多个渠道都有触点，如何分配归因？

**用户路径**:
```
Day 1: Facebook广告点击
Day 3: Google搜索品牌词
Day 5: 邮件打开
Day 7: 直接访问并购买 $200
```

**各模型归因**:

| 模型 | Facebook | Google | 邮件 | 直接 |
|------|----------|--------|------|------|
| 首次触点 | $200 | $0 | $0 | $0 |
| 最后触点 | $0 | $0 | $0 | $200 |
| 线性 | $50 | $50 | $50 | $50 |
| 时间衰减 | $28 | $40 | $56 | $76 |
| 位置 | $80 | $40 | $40 | $80 |

**推荐**: 使用时间衰减归因，因为近期触点对转化影响更大

### 示例2: 预算再分配优化

**场景**: 月预算$100,000，如何分配到各渠道？

**当前分配**:
- Google: $40K, ROAS=4.0
- Facebook: $35K, ROAS=3.2
- Instagram: $15K, ROAS=2.5
- TikTok: $10K, ROAS=2.0

**优化过程**:
1. 计算各渠道边际ROAS
2. 找到边际ROAS相等的点
3. 考虑渠道饱和度

**优化后分配**:
- Google: $50K, 预期ROAS=3.8
- Facebook: $30K, 预期ROAS=3.5
- Instagram: $12K, 预期ROAS=2.8
- TikTok: $8K, 预期ROAS=2.2

**预期收益**:
- 当前收入: $330K
- 优化后收入: $345K
- 提升: +4.5%

### 示例3: 新渠道测试评估

**场景**: 测试Pinterest广告，需要评估是否继续

**测试数据** (2周):
- 支出: $3,000
- 曝光: 500,000
- 点击: 15,000 (CTR=3%)
- 转化: 120 (CVR=0.8%)
- 收入: $7,200
- ROAS: 2.4

**评估**:
| 指标 | Pinterest | 平均 | 评价 |
|------|-----------|------|------|
| CTR | 3.0% | 2.5% | 良好 |
| CVR | 0.8% | 2.0% | 偏低 |
| ROAS | 2.4 | 3.0 | 偏低 |

**建议**:
- 继续测试2周，优化受众定向
- 目标ROAS提升至3.0
- 如果无改善，考虑暂停

## 与其他Skills的集成

### 复用 cbec-contribution-calculation
- 计算各渠道对总收入的贡献
- 分析渠道贡献度变化

### 复用 cbec-cohort-analysis
- 分析不同渠道用户的LTV
- 评估渠道用户的留存

### 复用 cbec-conversion-funnel
- 分析各渠道的转化漏斗
- 优化渠道落地页

### 调用 cbec-knowledge-query
- 获取归因模型最佳实践
- 学习行业ROAS基准

## 注意事项

### 归因窗口
- 跨境电商决策周期长，建议14-30天
- 不同品类窗口期不同
- 考虑跨设备归因挑战

### 数据准确性
- 确保转化追踪正确设置
- 处理广告平台与后台数据差异
- 排除虚假点击和流量

### ROAS陷阱
- 高ROAS不一定代表最优
- 考虑规模与效率的平衡
- 结合LTV评估长期价值

## 高级功能

### 增量归因测试

```python
# 通过A/B测试测量真实增量
def incremental_analysis(test_group, control_group):
    """
    计算广告的真实增量贡献
    """
    test_conversion = test_group['conversions'] / test_group['users']
    control_conversion = control_group['conversions'] / control_group['users']

    incremental_lift = (test_conversion - control_conversion) / control_conversion
    incremental_conversions = test_group['users'] * (test_conversion - control_conversion)

    return {
        'incremental_lift': incremental_lift,
        'incremental_conversions': incremental_conversions,
        'true_roas': calculate_true_roas(incremental_conversions, test_group['spend'])
    }
```

### 马尔可夫链归因

```python
# 使用马尔可夫链计算移除效应
def markov_chain_attribution(user_paths):
    """
    基于马尔可夫链的归因模型
    计算每个渠道的移除效应
    """
    # 构建转移矩阵
    transition_matrix = build_transition_matrix(user_paths)

    # 计算各渠道移除效应
    channels = get_unique_channels(user_paths)
    removal_effects = {}

    for channel in channels:
        # 计算移除该渠道后的转化概率
        removed_matrix = remove_channel(transition_matrix, channel)
        conversion_rate_without = calculate_conversion_rate(removed_matrix)

        # 移除效应 = (原转化率 - 移除后转化率) / 原转化率
        removal_effects[channel] = (base_conversion_rate - conversion_rate_without) / base_conversion_rate

    return removal_effects
```

### 动态预算优化

```python
# 基于实时数据的动态预算分配
def dynamic_budget_allocation(current_performance, total_budget):
    """
    实时调整预算分配
    """
    allocations = {}

    for channel, metrics in current_performance.items():
        # 计算边际ROAS
        marginal_roas = calculate_marginal_roas(metrics)

        # 根据边际ROAS分配预算
        if marginal_roas > target_roas:
            allocations[channel] = increase_budget(channel)
        elif marginal_roas < target_roas * 0.8:
            allocations[channel] = decrease_budget(channel)
        else:
            allocations[channel] = maintain_budget(channel)

    # 归一化到总预算
    normalize_to_budget(allocations, total_budget)

    return allocations
```

## 参考资料

- [归因模型](https://en.wikipedia.org/wiki/Marketing_attribution)
- [ROAS优化](https://biji.com/topic/Q0GzOMDY)
- [多触点归因](https://biji.com/topic/Q0GzOMDY)

---

**Skill版本**: 1.0
**适用场景**: 跨境电商广告投放、渠道优化、预算分配
**复杂度**: 中高级
**前置Skill**: cbec-data-cleaning
**关联Skill**: cbec-contribution-calculation, cbec-cohort-analysis
