---
card_id: "oadm-scenario-validation-loop-65cbb0ff79"
semantic_key: "oadm:engineering:scenario-validation-loop"
card_type: "quality-gate"
title: "可视化专家审核与场景测试闭环"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s6-2-3-p106-p109","oadm-span-s6-2-4-p109-p110"]
section_ids: ["6.2.3","6.2.4"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2c"
review_status: "pending"
version: 1
content_hash: "f54bb511f834d65542a84e1e7a7e906a2e14a6412f8dd2d30d60073918ddd644"
---

# 可视化专家审核与场景测试闭环

## 核心结论

作者把图形化结构审查、属性与规则路径复核、专家黄金用例和 AI 扩展测试矩阵组合为交付前验证链，使模型从形式正确进一步走向业务可用。

## 关键要素

- 拓扑审查检查类层级和对象关系。
- 局部穿透检查属性特征和约束。
- 规则回溯验证前置条件、权限与行动。
- 失败用例需区分模型、用例和规则根因。

## 适用场景

- 本体交付验收
- 构建可回归的业务测试集

## 不适用边界

- 可视化不能替代机器可执行的语法和推理校验。
- 测试覆盖率和性能指标需按真实工作负载制定。

## 与其他卡片或术语的候选关系

- `oadm:engineering:dual-model-validation`（候选关系，尚未晋升）
- `oadm:engineering:ontology-asset-registration`（候选关系，尚未晋升）

## SCM 候选映射

M2-C 仅完成来源内工程方法萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：6.2.3 可视化工具语法校验与专家内容把关；6.2.4 基于业务场景构建测试用例来验证本体模型
- 页码：PDF pp.106–110
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 书中测试示例和性能场景未在本项目运行。
