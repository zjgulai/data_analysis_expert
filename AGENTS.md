# 母婴跨境电商数据分析项目 - 操作手册

> **版本**: v2.2
> **更新日期**: 2024-03
> **维护者**: Claude Agent

---

## 目录

1. [项目概述](#1-项目概述)
2. [Skills系统](#2-skills系统)
   - 2.1 [母婴跨境电商Skills](#21-母婴跨境电商skills)
   - 2.2 [麦肯锡PPT Skills](#22-麦肯锡ppt-skills)
3. [语音输入集成](#3-语音输入集成)
4. [快速开始](#4-快速开始)
5. [最佳实践](#5-最佳实践)
6. [故障排除](#6-故障排除)

---

## 1. 项目概述

本项目包含两大核心Skills库：

| Skills库 | Skills数量 | 核心功能 |
|---------|-----------|---------|
| 母婴跨境电商Skills | 38个 | 数据分析、归因分析、用户分析等 |
| 麦肯锡PPT Skills | 18个 | PPT制作、图表设计、商业报告 |

**适用场景**：
- 母婴跨境电商数据分析
- 商业报告和PPT制作
- 用户行为分析
- 品牌健康度分析
- 渠道策略分析

---

## 2. Skills系统

### 2.1 母婴跨境电商Skills

**位置**: `cross_border_ecommerce_skills/`

**触发方式**：用户提问时自动搜索相关Skills

```bash
# 搜索示例
python3 cross_border_ecommerce_skills/skills_index.py "销售额下降原因分析"
```

**Skills分类**：

| 类别 | Skills示例 | 用途 |
|-----|-----------|------|
| 数据基础 | data-foundation | 数据清洗、预处理 |
| 财务分析 | financial-analysis | ROI、毛利率分析 |
| 归因分析 | attribution-analysis | 贡献度、因素分解 |
| 用户分析 | customer-analysis | 分群、RFM、留存 |
| 渠道分析 | channel-analysis | 渠道效果、流量分析 |
| 营销分析 | marketing-analysis | 广告归因、活动分析 |

**关键词映射**：

| 关键词 | 推荐Skills |
|--------|-----------|
| 归因、贡献度 | contribution-calculation, complex-contribution |
| 同比、环比 | yoy-mom-analysis |
| 用户分群、RFM | customer-segmentation |
| 留存、LTV | cohort-analysis |
| 渠道、流量 | channel-effect-analysis |
| 异常、监控 | anomaly-detection |

---

### 2.2 麦肯锡PPT Skills

**位置**: `mckinsey_ppt_skills/`

**触发方式**：用户提问时自动搜索相关Skills

```bash
# 搜索示例
python3 mckinsey_ppt_skills/skills_index.py "品牌健康度漏斗分析"
```

#### 2.2.1 Skills目录结构

```
mckinsey_ppt_skills/skills/
├── 01-content-planning/      # 内容规划
│   ├── core-insight/         # 核心观点提炼
│   └── pyramid-principle/    # 金字塔原理
│
├── 02-structure-design/      # 结构设计
│   └── slide-template/       # 幻灯片模板
│
├── 03-data-analysis/         # 数据分析
│   └── insight-extraction/   # 洞察提取
│
├── 04-chart-selection/       # 图表选择
│   ├── chart-type-guide/     # 图表类型指南
│   └── chart-classification/ # 图表分类体系
│
├── 05-chart-creation/        # 图表制作
│   ├── bar-chart/            # 条形图
│   ├── donut-chart/          # 环形图
│   ├── stacked-chart/        # 堆叠图
│   ├── combination-chart/    # 复合图表
│   ├── grouped-chart/        # 分组柱状图
│   └── multi-dimensional-charts/ # 多维分析图表
│
├── 06-business-application/  # 业务应用
│   ├── maternal-ecommerce-charts/  # 母婴电商图表
│   ├── consumer-analysis-charts/   # 消费者分析图表
│   ├── brand-health-charts/        # 品牌健康度图表
│   └── channel-strategy-charts/    # 渠道策略图表
│
├── 07-design-standards/      # 设计规范
│   └── color-standards/      # 颜色标准
│
├── 08-expression-methodology/# 观点表达
│   └── conclusion-first/     # 结论先行
│
└── 09-quality-review/        # 质量审核
```

#### 2.2.2 核心Skills说明

**内容规划类**：

| Skill | 用途 | 复杂度 |
|-------|------|--------|
| mckinsey-core-insight | 提炼核心观点 | 中级 |
| mckinsey-pyramid-principle | 构建逻辑结构 | 中级 |

**图表制作类**：

| Skill | 用途 | 复杂度 |
|-------|------|--------|
| mckinsey-bar-chart | 条形图制作 | 初级 |
| mckinsey-donut-chart | 环形图制作 | 初级 |
| mckinsey-stacked-chart | 堆叠图制作 | 中级 |
| mckinsey-combination-chart | 复合图表制作 | 中级 |
| mckinsey-grouped-chart | 分组柱状图制作 | 中级 |
| mckinsey-multi-dimensional-charts | 多维分析图表 | 高级 |

**业务应用类**：

| Skill | 图表类型数 | 用途 |
|-------|-----------|------|
| mckinsey-maternal-ecommerce-charts | 12种 | 母婴电商全场景 |
| mckinsey-consumer-analysis-charts | 10种 | 消费者分析 |
| mckinsey-brand-health-charts | 8种 | 品牌健康度分析 |
| mckinsey-channel-strategy-charts | 8种 | 渠道策略分析 |

#### 2.2.3 使用流程

```
┌─────────────────────────────────────────────────────────────┐
│                    PPT制作工作流                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: 内容规划                                           │
│  ├── core-insight: 提炼核心观点                             │
│  └── pyramid-principle: 构建逻辑结构                        │
│                                                             │
│  Step 2: 结构设计                                           │
│  └── slide-template: 应用幻灯片模板                         │
│                                                             │
│  Step 3: 数据分析                                           │
│  └── insight-extraction: 提取数据洞察                       │
│                                                             │
│  Step 4: 图表选择                                           │
│  ├── chart-type-guide: 图表类型指南                         │
│  └── chart-classification: 图表分类体系                     │
│                                                             │
│  Step 5: 图表制作                                           │
│  ├── 基础图表: bar-chart, donut-chart, stacked-chart        │
│  ├── 复合图表: combination-chart, grouped-chart             │
│  └── 多维分析: multi-dimensional-charts                     │
│                                                             │
│  Step 6: 业务应用                                           │
│  ├── consumer-analysis-charts: 消费者分析                   │
│  ├── brand-health-charts: 品牌分析                          │
│  └── channel-strategy-charts: 渠道分析                      │
│                                                             │
│  Step 7: 观点表达                                           │
│  └── conclusion-first: 结论先行表达                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2.4 关键词快速索引

**内容与结构**：
- 观点/结论/核心 → core-insight, conclusion-first
- 金字塔/MECE → pyramid-principle
- 模板/结构 → slide-template

**图表类型**：
- 条形图/柱状图 → bar-chart
- 环形图/饼图 → donut-chart
- 堆叠图 → stacked-chart
- 复合图表/双轴图 → combination-chart
- 分组图/对比图 → grouped-chart
- 瀑布图/竞争转换 → multi-dimensional-charts

**业务场景**：
- 用户分析/流失分析 → consumer-analysis-charts
- 品牌健康度/品牌漏斗 → brand-health-charts
- 渠道效率/促销分析 → channel-strategy-charts
- 母婴电商 → maternal-ecommerce-charts

#### 2.2.5 观点提炼公式

```
公式1: [主体]在[维度]上[状态/趋势]，建议[行动]
示例: 辅食品类增速领先达45%，建议加大资源投入

公式2: [A]与[B]相比[差异]，这意味着[含义]
示例: TikTok渠道ROI高于亚马逊14%，意味着内容营销效率更高

公式3: 基于[趋势/数据]，预计[结果]，建议[行动]
示例: 基于东南亚55%增速，预计2年内成为第二大市场，建议提前布局

公式4: [发现]表明[问题/机会]，应[行动]
示例: 缺货率5%表明库存管理存在问题，应增加安全库存
```

#### 2.2.6 麦肯锡设计标准

**颜色系统**：
```
主色: #051C2C (麦肯锡蓝)
辅助蓝: #1E3A5F, #3A5F8A, #5A7F9F
强调色: #FF6B35 (橙色)
中性色: #CCCCCC, #999999
```

**字体标准**：
```
标题: Arial Bold, 18-24pt
正文: Arial Regular, 12-14pt
数据标签: Arial, 10-12pt
注释: Arial, 9-10pt
```

**布局标准**：
```
左文字: 2/3宽度
右图表: 1/3宽度
边距: 上下左右各0.5英寸
```

---

## 3. 语音输入集成

项目已集成 **Whisper-Input-Next** 语音转文字工具。

**位置**: `tools/Whisper-Input-Next/`

**启动方式**：
```bash
cd tools/Whisper-Input-Next
source .venv/bin/activate
python main.py
```

**快捷键**：
- Mac: `Cmd+Option` 开始/结束录音
- Windows: `Ctrl+F` 开始/结束录音

**配置**：
- 推荐使用豆包流式ASR
- 在 `.env` 中设置 `TRANSCRIPTION_SERVICE=doubao`
- 填写 `DOUBAO_APP_KEY` 和 `DOUBAO_ACCESS_KEY`

---

## 4. 快速开始

### 4.1 数据分析场景

```bash
# 1. 搜索相关Skills
python3 cross_border_ecommerce_skills/skills_index.py "销售额下降原因分析"

# 2. 读取Skill内容
# 使用Read工具读取返回的SKILL.md路径

# 3. 按Skill方法论进行分析
```

### 4.2 PPT制作场景

```bash
# 1. 搜索相关Skills
python3 mckinsey_ppt_skills/skills_index.py "品牌健康度漏斗"

# 2. 读取Skill内容
# 使用Read工具读取返回的SKILL.md路径

# 3. 按Skill方法论制作PPT
```

### 4.3 常见工作流

**场景1: 销售分析报告**
```
1. 使用 yoy-mom-analysis 分析销售趋势
2. 使用 contribution-calculation 分析增长驱动因素
3. 使用 combination-chart 制作复合图表
4. 使用 conclusion-first 表达核心结论
```

**场景2: 用户分析报告**
```
1. 使用 customer-segmentation 进行用户分群
2. 使用 cohort-analysis 分析留存
3. 使用 consumer-analysis-charts 制作用户图表
4. 使用 insight-extraction 提取洞察
```

**场景3: 品牌分析报告**
```
1. 使用 brand-health-charts 制作品牌漏斗
2. 使用 multi-dimensional-charts 制作竞争分析
3. 使用 pyramid-principle 构建报告结构
4. 使用 core-insight 提炼核心观点
```

---

## 5. 最佳实践

### 5.1 Skills使用原则

1. **先搜索后使用**：使用skills_index.py搜索相关Skills
2. **理解后应用**：阅读SKILL.md理解方法论后再应用
3. **组合使用**：多个Skills组合使用形成完整工作流
4. **质量检查**：使用Skill中的质量检查清单验证结果

### 5.2 图表选择原则

```
数据维度 ≤ 3 → 单一复合图
数据维度 ≥ 4 → 多子图组合

维度有关联 → 复合图
维度独立 → 多子图
```

### 5.3 观点表达原则

1. **结论先行**：核心结论放在标题
2. **数据支撑**：每个观点有数据支撑
3. **行动导向**：结论指向具体行动
4. **简洁有力**：一句话表达核心观点

---

## 6. 故障排除

### 6.1 Skills搜索无结果

**原因**：关键词不匹配

**解决**：
1. 使用更通用的关键词
2. 查看skills_index.py中的KEYWORD_SKILL_MAP
3. 直接浏览skills目录

### 6.2 Skills索引未更新

**原因**：新增Skills未重建索引

**解决**：
```bash
python3 mckinsey_ppt_skills/skills_index.py
```

### 6.3 图表类型选择困难

**原因**：不清楚图表适用场景

**解决**：
1. 使用chart-classification Skill查看图表分类
2. 使用chart-type-guide Skill获取选择指南

---

## 附录

### A. Skills完整清单

**母婴跨境电商Skills (38个)**：
- 00-data-foundation (3个)
- 01-financial-analysis (2个)
- 02-attribution-analysis (4个)
- 03-cost-analysis (2个)
- 04-product-analysis (2个)
- 05-trend-analysis (2个)
- 06-predictive-analysis (2个)
- 07-monitoring-analysis (2个)
- 08-customer-analysis (4个)
- 09-pricing-analysis (2个)
- 10-supply-chain-analysis (2个)
- 11-user-behavior-analysis (2个)
- 12-marketing-analysis (3个)
- 13-methodology-analysis (1个)
- 14-reporting-analysis (1个)
- 15-campaign-analysis (1个)
- 16-channel-analysis (1个)
- 17-content-analysis (1个)
- 19-risk-analysis (1个)

**麦肯锡PPT Skills (18个)**：
- 01-content-planning (2个)
- 02-structure-design (1个)
- 03-data-analysis (1个)
- 04-chart-selection (2个)
- 05-chart-creation (6个)
- 06-business-application (4个)
- 07-design-standards (1个)
- 08-expression-methodology (1个)

### B. 版本历史

| 版本 | 日期 | 更新内容 |
|-----|------|---------|
| v2.2 | 2024-03 | 新增消费者/品牌/渠道分析图表Skills |
| v2.1 | 2024-03 | 新增多维分析图表Skill |
| v2.0 | 2024-03 | 新增复合图表、分组图表、母婴电商应用 |
| v1.0 | 2024-03 | 初始版本，10个核心Skills |

---

*本操作手册由Claude Agent自动生成和维护*
