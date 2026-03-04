# 母婴跨境电商数据分析项目

## 自动Skills查找机制

当用户询问数据分析相关问题时，**必须首先**使用Skills搜索工具查找相关的Skills。

### 使用方法

```bash
# 在回答用户问题之前，先执行搜索
python3 cross_border_ecommerce_skills/skills_index.py "用户的查询内容"
```

### 工作流程

1. **用户提问** → 例如: "帮我做指标归因分析"
2. **自动搜索Skills** → 执行搜索命令
3. **阅读相关SKILL.md** → 使用Read工具读取匹配的Skills
4. **应用Skill方法论** → 按照Skill指导进行分析

### 示例

当用户问: "帮我分析销售额下降的原因"

```bash
# Step 1: 搜索相关Skills
python3 cross_border_ecommerce_skills/skills_index.py "销售额下降原因分析"

# 输出示例:
# 找到 3 个相关Skills:
# 1. cbec-contribution-calculation (贡献度计算)
# 2. cbec-yoy-mom-analysis (同比环比分析)
# 3. cbec-anomaly-detection (异常检测)
```

```bash
# Step 2: 读取最相关的Skill
# Read: cross_border_ecommerce_skills/skills/02-attribution-analysis/contribution-calculation/SKILL.md

# Step 3: 按照Skill方法论进行分析
```

### Skills目录结构

```
cross_border_ecommerce_skills/skills/
├── 00-data-foundation/          # 数据基础
├── 01-financial-analysis/       # 财务分析
├── 02-attribution-analysis/     # 归因分析 ⭐
├── 03-cost-analysis/            # 成本分析
├── 04-product-analysis/         # 产品分析
├── 05-trend-analysis/           # 趋势分析
├── 06-predictive-analysis/      # 预测分析
├── 07-monitoring-analysis/      # 监控分析
├── 08-customer-analysis/        # 客户分析
├── 09-pricing-analysis/         # 定价分析
├── 10-supply-chain-analysis/    # 供应链分析
├── 11-user-behavior-analysis/   # 用户行为分析
├── 12-marketing-analysis/       # 营销分析
├── 13-methodology-analysis/     # 方法论分析
├── 14-reporting-analysis/       # 报告分析
├── 15-campaign-analysis/        # 活动分析
├── 16-channel-analysis/         # 渠道分析 ✨NEW
├── 17-content-analysis/         # 内容分析 ✨NEW
└── 19-risk-analysis/            # 风险分析 ✨NEW
```

### 关键词到Skills映射（快速参考）

| 关键词 | 推荐Skills |
|--------|-----------|
| 归因、贡献度、因素分解 | contribution-calculation, complex-contribution |
| 偏微分、全微分、弹性系数 | complex-contribution |
| 毛利率、毛利 | margin-attribution |
| 同比、环比、趋势 | yoy-mom-analysis |
| 用户、客户、分群、RFM | customer-segmentation |
| 留存、群组、LTV | cohort-analysis |
| 漏斗、转化 | conversion-funnel |
| 广告、营销 | ad-attribution, ad-performance-analysis |
| 渠道、流量 | channel-effect-analysis, traffic-source-analysis |
| 异常、监控、预警 | anomaly-detection, alert-management |
| 库存、供应商 | inventory-optimization, supplier-performance |
| 风险 | risk-warning-system |
| 定价、价格 | pricing-optimization |
| A/B测试、因果 | ab-testing, causal-inference |

### Python API使用

```python
import sys
sys.path.insert(0, 'cross_border_ecommerce_skills')
from skills_index import SkillsIndex

# 创建索引
index = SkillsIndex()

# 搜索相关Skills
results = index.search("帮我做指标归因分析")
for r in results:
    print(f"{r['name']}: 相关性 {r['relevance']}")

# 获取Skill完整内容
content = index.get_skill_content('cbec-complex-contribution')
```

---

## 项目概述

本项目是母婴跨境电商数据分析Skills库，包含38个专业分析技能，覆盖19个业务领域。

**主要能力**:
- 数据清洗与预处理
- 指标归因与贡献度分析
- 财务分析与ROI计算
- 用户行为与客户分析
- 营销效果与渠道分析
- 供应链与风险分析

**文档参考**:
- `cross_border_ecommerce_skills/README.md` - 项目介绍
- `cross_border_ecommerce_skills/SKILLS_SUMMARY.md` - 完整Skills指南
- `cross_border_ecommerce_skills/USAGE_GUIDE.md` - 使用指南
