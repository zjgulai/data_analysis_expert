---
card_id: "oadm-bit-to-token-a10e8a8d88"
semantic_key: "oadm:information-unit:bit-to-token"
card_type: "concept"
title: "信息处理单元从比特扩展到 Token"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s1-1-1-p008-p009"]
section_ids: ["1.1.1"]
fact_reason_action_class: "mechanism"
scm_applicability: "not_assessed_in_m2a"
review_status: "pending"
version: 1
content_hash: "03dabbbb74ab2511182f6958fe75d5c4c093e298e893a7a00ddbc5526ed57a33"
---

# 信息处理单元从比特扩展到 Token

## 核心结论

作者认为，比特擅长表达可精确传输和计算的符号，而 Token 让模型能够以语义单元处理上下文和意图；这标志着信息处理重点从符号传输扩展到语义理解。

## 关键要素

- 比特对应符号编码、传输和计算的确定性基础。
- Token 是模型处理文本及其他模态时使用的语义单元。
- 语义理解并不否定比特基础，而是在其上增加对上下文与意图的建模。

## 适用场景

- 解释传统信息系统与生成式 AI 的处理差异
- 设计面向 AI 的语义数据表示

## 不适用边界

- 本卡是作者的概念性论述，不构成特定模型 Tokenizer 的技术规范。
- 不能把 Token 等同于稳定业务概念或本体节点。

## 与其他卡片的候选关系

- `oadm:ai-capability:reasoning-memory-action`（候选关系，尚未建模）

## SCM 候选映射

M2-A 仅完成来源内萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：1.1.1 信息处理单元从比特到 Token
- 页码：PDF pp.8–9
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 不同模型的 Token 切分方式和粒度并不相同，工程实现需另行核验。
