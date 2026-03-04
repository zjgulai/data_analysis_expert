---
name: cbec-knowledge-query
description: |
  跨境电商知识库查询Skill。提供Biji知识库访问能力，支持查询跨境电商分析方法、业务模型、最佳实践等知识。

  触发条件:
  1. 用户询问分析方法（如"RFM模型怎么用"、"如何做客户分群"）
  2. 用户需要业务知识支持（如"定价策略有哪些"、"库存管理方法"）
  3. 其他Skills需要外部知识增强

  输出内容:
  - 结构化的知识回答
  - 参考来源（可选）
  - 相关知识推荐
---

# 跨境电商知识库查询 Skill

## 概述

本Skill封装Biji知识库API，为跨境电商数据分析提供外部知识支持。知识库包含丰富的跨境电商分析方法、业务模型、最佳实践等内容，可以帮助分析师快速获取领域知识，提升分析质量。

## 核心功能

### 1. 知识库搜索
- **深度搜索模式**: 更准确的语义理解，适合复杂问题
- **快速搜索模式**: 更快的响应速度，适合简单查询
- **引用返回**: 提供知识来源，便于追溯

### 2. 批量查询
- 支持同时提交多个问题
- 自动去重和缓存
- 速率限制处理

### 3. 预定义查询
- 客户分析: RFM模型、CLV计算、客户生命周期
- 定价策略: 价格弹性、动态定价、竞品分析
- 库存管理: 安全库存、周转分析、EOQ模型
- 用户行为: 转化漏斗、留存分析、同期群分析
- 广告优化: ROAS优化、归因模型、投放策略

## 使用方法

### 基础调用

```python
from utils.biji_client import BijiClient

# 初始化客户端
client = BijiClient()

# 搜索单个问题
result = client.search("RFM模型如何应用于跨境电商客户分群？")
print(result["answer"])

# 获取简化回答
answer = client.get_answer("如何计算价格弹性？")
```

### 批量查询

```python
# 批量搜索
questions = [
    "跨境电商安全库存计算方法？",
    "库存周转率如何计算？",
    "EOQ模型如何应用？"
]
results = client.batch_search(questions)
for r in results:
    print(r["answer"])
```

### Skill集成查询

```python
from utils.biji_client import query_knowledge_for_skill

# 查询特定Skill相关知识
results = query_knowledge_for_skill("customer_segmentation")
for result in results:
    print(result["answer"])
```

### 格式化输出

```python
# 格式化为Markdown
result = client.search("转化漏斗分析方法", refs=True)
markdown = client.format_result(result)
print(markdown)
```

## API参数说明

### search() 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| question | str | 必填 | 查询问题 |
| deep_seek | bool | True | 深度搜索模式，更准确但更慢 |
| refs | bool | False | 是否返回引用来源 |
| use_cache | bool | True | 是否使用缓存 |

### 返回格式

```json
{
  "answer": "回答内容...",
  "refs": [
    {
      "title": "来源标题",
      "url": "来源URL"
    }
  ]
}
```

## 预定义查询主题

### customer_segmentation (客户分群)
- RFM模型如何应用于跨境电商客户分群？
- 跨境电商客户生命周期分析方法有哪些？
- 如何计算客户价值CLV？

### pricing_optimization (定价优化)
- 跨境电商价格弹性分析方法有哪些？
- 跨境电商动态定价模型如何构建？
- 如何进行竞品定价分析？

### inventory_management (库存管理)
- 跨境电商安全库存计算方法？
- 跨境电商库存周转分析方法？
- EOQ经济订货量模型如何应用？

### user_behavior (用户行为)
- 跨境电商转化漏斗分析方法？
- 跨境电商用户留存分析方法？
- 同期群分析Cohort Analysis如何实施？

### advertising (广告优化)
- 跨境电商广告归因模型有哪些？
- 如何优化ROAS？
- 多触点归因分析方法？

## 命令行使用

```bash
# 搜索单个问题
python utils/biji_client.py "RFM模型怎么用"

# 查询Skill相关知识
python utils/biji_client.py --skill customer_segmentation

# 测试API连接
python utils/biji_client.py --test
```

## 错误处理

### 常见错误

| 错误类型 | 原因 | 解决方案 |
|---------|------|---------|
| BijiAuthError | API Key无效或未设置 | 检查环境变量BIJI_API_KEY |
| BijiAPIError | API调用失败 | 检查网络，稍后重试 |
| 超时错误 | 网络问题或服务器响应慢 | 增加timeout或使用快速模式 |

### 错误处理示例

```python
from utils.biji_client import BijiClient, BijiClientError

client = BijiClient()

try:
    result = client.search("问题")
    print(result["answer"])
except BijiClientError as e:
    print(f"知识库查询失败: {e}")
    # 使用默认知识或提示用户
```

## 缓存机制

- **自动缓存**: 相同查询会自动缓存结果
- **缓存大小**: 默认128个查询
- **缓存键**: 基于问题+参数生成唯一键
- **LRU策略**: 缓存满时自动清理旧条目

```python
# 禁用缓存（获取最新结果）
result = client.search("问题", use_cache=False)

# 完全禁用缓存
client = BijiClient(cache_enabled=False)
```

## 与其他Skills集成

### 作为知识源

其他Skills可以调用本Skill获取业务知识：

```python
# 在客户分群Skill中
from utils.biji_client import query_knowledge_for_skill

def get_rfm_guidance():
    """获取RFM模型指导"""
    results = query_knowledge_for_skill("customer_segmentation")
    # 解析结果，提取RFM相关指导
    return extract_rfm_guidance(results)
```

### 最佳实践

1. **优先使用预定义查询**: 确保查询质量一致
2. **合理使用缓存**: 减少API调用
3. **处理查询失败**: 提供降级方案
4. **结合内部知识**: 不要完全依赖外部知识库

## 配置要求

### 环境变量

```bash
# 设置API Key
export BIJI_API_KEY="your-api-key"
```

### 获取API Key

1. 访问 https://biji.com/settings/api
2. 创建API Key
3. 设置环境变量或代码中传入

## 示例场景

### 场景1: 分析方法查询

用户询问: "如何做RFM客户分群？"

```python
client = BijiClient()
result = client.search(
    "RFM模型如何应用于跨境电商客户分群？",
    deep_seek=True,
    refs=True
)
# 返回RFM方法的详细说明和参考来源
```

### 场景2: Skill知识增强

在创建客户分群Skill时，自动获取相关知识：

```python
# 获取客户分群相关知识
results = query_knowledge_for_skill("customer_segmentation")

# 提取RFM评分标准
rfm_guidance = extract_rfm_scoring(results)

# 应用到分析流程中
apply_rfm_scoring(data, rfm_guidance)
```

### 场景3: 最佳实践查询

```python
# 查询定价最佳实践
result = client.search(
    "跨境电商定价策略最佳实践",
    deep_seek=True
)
# 获取行业最佳实践指导
```

## 注意事项

### API使用限制
- 遵守API调用频率限制
- 批量查询时添加适当延迟
- 合理使用缓存减少调用

### 数据安全
- API Key不要硬编码
- 使用环境变量管理密钥
- 日志中避免输出敏感信息

### 结果验证
- 外部知识需要结合业务验证
- 不同场景可能需要调整方法
- 保持批判性思维

## 参考资料

- [Biji API文档](https://doc.biji.com/docs/QfMcwcoHqic5urkTBQKcAPIWnJe/)
- [Biji知识库](https://biji.com/topic/Q0GzOMDY)
- [跨境电商数据分析方法](https://biji.com/topic/Q0GzOMDY)

---

**Skill版本**: 1.0
**依赖**: biji_client.py, 环境变量BIJI_API_KEY
**适用场景**: 所有需要外部知识支持的分析场景
**复杂度**: 初级
