# 跨境电商Claude Skills库 - 实施指南

> **版本**: 1.0  
> **目标**: 指导用户如何创建、部署和使用跨境电商数据分析Skills

---

## 目录

1. [前置要求](#前置要求)
2. [快速开始](#快速开始)
3. [Skill创建详细步骤](#skill创建详细步骤)
4. [Skill部署与测试](#skill部署与测试)
5. [业务场景工作流](#业务场景工作流)
6. [进阶配置](#进阶配置)
7. [故障排除](#故障排除)

---

## 前置要求

### 账号要求

- **Claude账号**: Pro、Max、Team或Enterprise版本
- **权限**: 需要启用Code execution和Skills功能

### 功能启用步骤

1. **登录Claude.ai**
2. **进入设置**: 点击右上角头像 → Settings
3. **启用Code Execution**:
   - 选择 "Capabilities" 标签
   - 开启 "Code execution and file creation"
4. **启用Skills功能**:
   - 在Capabilities页面
   - 开启 "Skills" (Feature Preview)
5. **启用skill-creator**:
   - 进入 "Skills" 页面
   - 找到 "skill-creator" Skill
   - 点击启用

### 环境检查

完成上述步骤后，发送以下消息验证:
```
请列出你已加载的所有Skills
```

应能看到 "skill-creator" 在列表中。

---

## 快速开始

### 5分钟创建第一个Skill

**步骤1**: 打开Claude对话，输入:
```
使用skill-creator帮我创建一个跨境电商数据清洗Skill。

要求:
- Skill名称: cbec-data-cleaning
- 功能: 自动清洗销售数据，处理缺失值、异常值、重复数据
- 输入: CSV文件，包含订单号、日期、SKU、数量、价格字段
- 输出: 清洗后的数据 + 数据质量报告
- 触发词: "数据清洗"、"清理数据"、"预处理"

请生成完整的SKILL.md文件。
```

**步骤2**: Claude会生成SKILL.md内容，复制保存为文件。

**步骤3**: 打包并上传:
```bash
# 创建Skill文件夹
mkdir cbec-data-cleaning
cd cbec-data-cleaning

# 保存SKILL.md
# 然后打包
cd ..
zip -r cbec-data-cleaning.zip cbec-data-cleaning/
```

**步骤4**: 在Claude.ai → Settings → Capabilities → Skills中上传zip文件

**步骤5**: 测试Skill:
```
请帮我清洗这个销售数据文件 [上传CSV文件]
```

---

## Skill创建详细步骤

### 完整创建流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. 规划    │ → │  2. 编写    │ → │  3. 创建    │
│  Skill结构  │    │  SKILL.md   │    │  辅助文件   │
└─────────────┘    └─────────────┘    └─────────────┘
       ↓
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  6. 迭代    │ ← │  5. 测试    │ ← │  4. 打包    │
│  优化       │    │  验证       │    │  上传       │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 步骤1: 规划Skill结构

每个Skill的标准结构:
```
skill-name/
├── SKILL.md              # 核心文件(必须)
├── references/           # 参考文档(可选)
│   ├── algorithms.md     # 算法详细说明
│   ├── formulas.md       # 公式汇总
│   └── examples.md       # 更多示例
├── scripts/              # 辅助脚本(可选)
│   ├── calculation.py    # 计算脚本
│   ├── visualization.py  # 可视化脚本
│   └── utils.py          # 工具函数
└── examples/             # 示例文件(可选)
    ├── sample_input.csv
    └── sample_output.xlsx
```

**文件说明**:

| 文件/文件夹 | 必需 | 说明 |
|------------|------|------|
| SKILL.md | 是 | Skill的核心说明文件 |
| references/ | 否 | 详细参考文档，减少SKILL.md长度 |
| scripts/ | 否 | Python脚本，辅助计算和可视化 |
| examples/ | 否 | 示例数据，帮助用户理解 |

### 步骤2: 编写SKILL.md

**标准模板**:
```markdown
---
name: skill-name
description: |
  Skill的详细描述，包括:
  1. 主要功能
  2. 触发条件（关键词、场景）
  3. 输入要求
  4. 输出内容
---

# Skill标题

## 概述
简要介绍Skill的目的和价值主张

## 核心功能
- 功能1: 详细说明
- 功能2: 详细说明

## 使用方法
### 输入要求
- 数据格式
- 必需字段
- 可选字段

### 分析流程
1. 步骤1
2. 步骤2
3. 步骤3

### 输出说明
- 输出内容
- 格式规范

## 算法说明
### 核心公式
```
公式内容
```

### 参数说明
| 参数 | 说明 | 默认值 |

## 示例
### 示例1: 场景描述
输入: ...
输出: ...

## 注意事项
- 注意点1
- 注意点2

## 参考资料
- 链接1
- 链接2
```

**编写技巧**:
1. **描述要具体**: 避免模糊词汇，使用具体数字和场景
2. **触发条件明确**: 列出所有可能触发Skill的关键词
3. **示例丰富**: 提供2-3个不同场景的示例
4. **算法清晰**: 公式用代码块包裹，便于阅读

### 步骤3: 创建辅助文件

**references/algorithms.md** 示例:
```markdown
# 算法详细说明

## 链式替代法

### 原理
详细解释算法原理...

### 计算步骤
1. 步骤1
2. 步骤2

### 代码实现
```python
def chain_substitution(base_values, current_values):
    # 实现代码
    pass
```
```

**scripts/calculation.py** 示例:
```python
"""
计算辅助函数
"""
import pandas as pd
import numpy as np

def calculate_growth_rate(current, previous):
    """计算增长率"""
    if previous == 0:
        return None
    return (current - previous) / previous * 100

def calculate_contribution(factor_change, base_factors):
    """计算因素贡献"""
    return factor_change * np.prod(base_factors)
```

### 步骤4: 打包与上传

**打包命令**:
```bash
# Linux/Mac
zip -r skill-name.zip skill-name/

# Windows
# 右键文件夹 → 发送到 → 压缩文件夹
```

**上传步骤**:
1. 打开Claude.ai
2. 点击右上角头像 → Settings
3. 选择 "Capabilities" 标签
4. 点击 "Skills" 区域的 "Upload Skill" 按钮
5. 选择打包好的zip文件
6. 等待上传完成

### 步骤5: 测试验证

**测试清单**:

| 测试项 | 测试方法 | 期望结果 |
|--------|----------|----------|
| Skill触发 | 输入触发关键词 | Skill自动加载 |
| 数据理解 | 上传测试数据 | 正确识别字段 |
| 分析执行 | 请求分析 | 执行分析流程 |
| 输出质量 | 检查结果 | 结果准确、格式正确 |
| 边界情况 | 测试异常数据 | 正确处理或报错 |

**测试对话示例**:
```
用户: 请帮我进行杜邦分析 [上传财务数据]

Claude: [加载cbec-dupont-analysis Skill]
"我将为您进行杜邦财务分析..."

[执行分析]

Claude: [输出分析报告]
```

### 步骤6: 迭代优化

**优化方向**:
1. **补充示例**: 根据用户反馈添加更多示例
2. **完善触发**: 添加更多触发关键词
3. **优化输出**: 改进报告格式和可视化
4. **增强鲁棒性**: 处理更多边界情况

**迭代流程**:
```
收集反馈 → 分析问题 → 修改SKILL.md → 重新打包 → 重新上传 → 测试
```

---

## Skill部署与测试

### 部署检查清单

- [ ] SKILL.md格式正确
- [ ] 文件编码为UTF-8
- [ ] 文件夹名称与Skill名称一致
- [ ] zip文件大小<10MB
- [ ] 测试数据准备完毕

### 测试用例设计

**测试用例1: 正常流程**
```
输入: 标准格式的销售数据
操作: 请求数据清洗
期望: 成功清洗，输出质量报告
```

**测试用例2: 异常数据**
```
输入: 包含大量缺失值的数据
操作: 请求数据清洗
期望: 正确处理缺失值，给出处理说明
```

**测试用例3: 边界情况**
```
输入: 空文件或单条记录
操作: 请求分析
期望: 友好提示，不崩溃
```

### 性能测试

**大数据测试**:
```
数据量: 10万行以上
期望: 在合理时间内完成(<5分钟)
```

**多文件测试**:
```
输入: 同时上传多个文件
期望: 正确处理，不混淆
```

---

## 业务场景工作流

### 场景1: 月度业绩复盘

**参与Skills**:
- `cbec-data-cleaning`
- `cbec-yoy-mom-analysis`
- `cbec-contribution-calculation`
- `cbec-profitability-matrix`

**工作流程**:
```
1. 数据准备
   └── 收集销售数据、成本数据、产品数据

2. 数据清洗 [cbec-data-cleaning]
   └── 上传原始数据
   └── 执行清洗
   └── 获得干净数据

3. 趋势分析 [cbec-yoy-mom-analysis]
   └── 输入清洗后的销售数据
   └── 计算YoY、MoM增长率
   └── 生成趋势报告

4. 归因分析 [cbec-contribution-calculation]
   └── 输入销售额、访客、转化、客单价
   └── 计算各因素贡献度
   └── 识别增长驱动因素

5. 产品分析 [cbec-profitability-matrix]
   └── 输入SKU销售数据
   └── 生成盈利矩阵
   └── 识别明星和瘦狗产品

6. 综合报告
   └── 整合各分析结果
   └── 生成复盘PPT/报告
```

**预期输出**:
- 月度业绩复盘报告(PDF)
- 趋势分析图表
- 产品优化建议清单

---

### 场景2: 新品定价决策

**参与Skills**:
- `cbec-cost-structure-analysis`
- `cbec-price-elasticity`
- `cbec-unit-economics`

**工作流程**:
```
1. 成本分析 [cbec-cost-structure-analysis]
   └── 输入产品成本数据
   └── 计算各项费率
   └── 确定成本基准

2. 价格弹性分析 [cbec-price-elasticity]
   └── 输入历史价格-销量数据
   └── 计算弹性系数
   └── 确定定价区间

3. 单位经济分析 [cbec-unit-economics]
   └── 输入预计销量、定价方案
   └── 计算LTV、CAC
   └── 评估盈利可行性

4. 定价决策
   └── 综合成本、竞争、盈利目标
   └── 确定最终售价
```

**预期输出**:
- 定价分析报告
- 不同价格方案的利润模拟
- 定价建议

---

### 场景3: 库存优化

**参与Skills**:
- `cbec-category-management`
- `cbec-demand-forecasting`
- `cbec-lstm-sales-prediction`

**工作流程**:
```
1. ABC分类 [cbec-category-management]
   └── 输入SKU销售数据
   └── 执行ABC分类
   └── 确定管理策略

2. 需求预测 [cbec-demand-forecasting]
   └── 输入历史销售数据
   └── 训练预测模型
   └── 生成未来需求预测

3. 库存优化
   └── 结合ABC分类和预测结果
   └── 计算安全库存、补货点
   └── 生成补货计划

4. 监控仪表板
   └── 建立库存监控表
   └── 设置预警阈值
```

**预期输出**:
- ABC分类结果
- 需求预测报告
- 库存优化方案
- 补货计划表

---

### 场景4: 财务健康诊断

**参与Skills**:
- `cbec-data-cleaning`
- `cbec-dupont-analysis`
- `cbec-financial-health-check`

**工作流程**:
```
1. 数据整合 [cbec-data-cleaning]
   └── 收集利润表、资产负债表
   └── 清洗和标准化数据

2. 杜邦分析 [cbec-dupont-analysis]
   └── 输入财务数据
   └── 计算ROE分解
   └── 识别驱动因素

3. 财务比率分析
   └── 计算盈利能力、偿债能力、运营效率比率
   └── 与行业对比

4. 综合诊断
   └── 整合分析结果
   └── 评估财务健康度
   └── 提出改进建议
```

**预期输出**:
- 杜邦分析金字塔图
- 财务比率报告
- 财务健康诊断书

---

### 场景5: 促销活动评估

**参与Skills**:
- `cbec-data-cleaning`
- `cbec-variance-attribution`
- `cbec-cost-structure-analysis`
- `cbec-association-analysis`

**工作流程**:
```
1. 数据准备 [cbec-data-cleaning]
   └── 收集活动期间订单数据
   └── 清洗数据

2. 销售归因 [cbec-variance-attribution]
   └── 对比活动期vs非活动期
   └── 计算活动带来的增量销售

3. 成本分析 [cbec-cost-structure-analysis]
   └── 计算促销成本、广告成本
   └── 计算ROI

4. 关联分析 [cbec-association-analysis]
   └── 分析活动订单的购物篮
   └── 识别关联购买模式

5. 效果评估
   └── 综合销售、成本、关联分析
   └── 评估活动效果
   └── 提出改进建议
```

**预期输出**:
- 活动效果评估报告
- ROI分析
- 关联购买洞察
- 下次活动建议

---

## 进阶配置

### 自定义触发规则

在SKILL.md的description中精确定义触发条件:
```yaml
---
name: my-skill
description: |
  触发条件:
  1. 关键词: "分析"、"报告"、"计算"
  2. 文件类型: .csv, .xlsx
  3. 字段包含: "sales", "revenue", "订单"
  4. 问题类型: "为什么"、"多少"、"趋势"
---
```

### 多语言支持

为不同语言用户创建多版本:
```
skill-name/
├── SKILL.md          # 默认英文版
├── SKILL.zh.md       # 中文版
└── SKILL.ja.md       # 日文版
```

### 版本管理

**版本命名**:
```
v1.0.0 - 初始版本
v1.1.0 - 新增功能
v1.1.1 - Bug修复
v2.0.0 - 重大更新
```

**更新日志**:
```markdown
# 更新日志

## v1.1.0 (2024-03-01)
- 新增: 支持多币种分析
- 优化: 提升大数据处理性能
- 修复: 处理缺失值时的bug
```

### 团队协作

**Skill共享**:
1. 将Skill文件上传至团队共享盘
2. 团队成员下载并本地安装
3. 统一使用相同版本

**版本控制**:
```bash
# 使用Git管理Skill
git init
git add .
git commit -m "Initial skill version"
git tag v1.0.0
```

---

## 故障排除

### 常见问题

**Q1: Skill无法触发**
```
问题: 输入关键词但Skill未加载

排查:
1. 检查Skill是否已上传
2. 检查description中的触发关键词
3. 尝试更明确的触发语句

解决:
- 重新上传Skill
- 在description中添加更多触发词
- 使用明确的语句: "使用[skill-name]分析..."
```

**Q2: 数据处理错误**
```
问题: 上传数据后分析失败

排查:
1. 检查数据格式是否符合要求
2. 检查必需字段是否存在
3. 检查数据类型是否正确

解决:
- 按照SKILL.md要求准备数据
- 使用提供的示例数据格式
- 先进行数据清洗
```

**Q3: 输出不符合预期**
```
问题: 分析完成但结果不正确

排查:
1. 检查输入数据是否正确
2. 检查算法参数设置
3. 对比示例验证逻辑

解决:
- 核对输入数据
- 调整算法参数
- 参考示例验证
```

**Q4: 大文件处理超时**
```
问题: 数据量大时处理缓慢或超时

解决:
1. 数据分块处理
2. 先采样测试
3. 优化算法性能
4. 使用更强大的计算资源
```

### 调试技巧

**查看Skill加载状态**:
```
请告诉我当前加载了哪些Skills
```

**测试Skill理解**:
```
请解释你将如何分析这类数据
```

**分步执行**:
```
请只执行步骤1: 数据加载和检查
```

### 性能优化

**大数据处理**:
- 使用分块读取
- 避免循环，使用向量化操作
- 减少内存占用

**算法优化**:
- 选择合适算法
- 使用近似计算
- 缓存中间结果

---

## 附录

### Skill模板下载

提供以下模板供参考:
- [基础Skill模板](./templates/basic-skill.zip)
- [高级Skill模板](./templates/advanced-skill.zip)
- [完整示例Skill](./templates/example-skill.zip)

### 示例数据

提供测试数据:
- [销售数据示例](./examples/sales_data.csv)
- [财务数据示例](./examples/financial_data.csv)
- [产品数据示例](./examples/product_data.csv)

### 参考资源

- [Claude Skills官方文档](https://docs.anthropic.com/claude/skills)
- [Python数据分析教程](https://pandas.pydata.org/docs/)
- [跨境电商运营指南](https://sellercentral.amazon.com/learn)

---

**文档版本**: 1.0  
**最后更新**: 2026-03-03  
**反馈建议**: 欢迎提出改进建议
