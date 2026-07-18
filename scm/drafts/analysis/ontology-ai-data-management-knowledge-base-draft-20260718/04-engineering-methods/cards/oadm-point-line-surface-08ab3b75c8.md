---
card_id: "oadm-point-line-surface-08ab3b75c8"
semantic_key: "oadm:implementation:point-line-surface"
card_type: "implementation-path"
title: "从场景点到领域线再到企业面的迭代路径"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s6-5-1-p121-p122","oadm-span-s6-5-2-p122-p124","oadm-span-s6-5-3-p124-p126"]
section_ids: ["6.5.1","6.5.2","6.5.3"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2c"
review_status: "pending"
version: 1
content_hash: "c2a7b12cf5ea9d9c3d1f24f297def09104265bf69621d1f30f5e0686d4d534a5"
---

# 从场景点到领域线再到企业面的迭代路径

## 核心结论

作者建议先用高价值小切口 MVP 验证单点价值，再沿四层架构统一领域内场景，最后用映射、桥接本体和联邦查询实现跨领域协同。

## 关键要素

- 点以最小数据集和量化规则快速验证。
- 线统一领域术语、关系、规则和动作。
- 面通过交互点、映射和桥接保持跨域互操作。
- 各领域在联邦式架构中保留自主演进。

## 适用场景

- 制定本体工程分阶段路线图
- 控制企业级建模范围膨胀

## 不适用边界

- 点线面顺序是作者建议，不排除组织已有跨域标准的情形。
- MVP 成功不能自动证明企业级扩展可行。

## 与其他卡片或术语的候选关系

- `oadm:engineering:five-loop-method`（候选关系，尚未晋升）
- `oadm:implementation:legacy-asset-evolution`（候选关系，尚未晋升）

## SCM 候选映射

M2-C 仅完成来源内工程方法萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：6.5.1 “小切口”场景：驱动构建本体模型；6.5.2 纵轴整合：领域级拉通各场景语义；6.5.3 横轴整合：跨领域贯通
- 页码：PDF pp.121–126
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 各阶段退出标准和投入规模需结合真实业务验证。
