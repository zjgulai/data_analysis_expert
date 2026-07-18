---
title: M2-B 核心理论篇内容萃取复核清单
doc_type: checklist
module: scm
topic: ontology-ai-data-management-m2b
status: draft
created: 2026-07-18
updated: 2026-07-18
owner: self
source: human+ai
---

# M2-B 核心理论篇内容萃取复核清单

## 批次范围

- PDF 第 4–5 章，物理页 PDF p.53–95。
- 36 个三级正文小节、2 个章末小结，共 38 条来源记录。
- 24 张核心理论知识卡、33 个受控术语、36 条候选关系。
- 本批不执行 SCM crosswalk、importer 改造、数据库写入或标准落地。

## 内容复核

- [x] 标题、页码和章节与 PDF 文本层对应。
- [x] 作者案例、规模数字、效率数据和模型能力判断均保留未独立核验边界。
- [x] W3C 技术角色标记为 `author_standard_mapping`，未冒充官方推荐架构。
- [x] 治理建议标记为 `author_governance_rule`，未冒充项目已生效制度。
- [x] 术语别名只用于检索，`not_equivalent_to` 显式防止概念误并。
- [x] PDF p.55、60、65、66、70、73、77、81、82、85、91 已视觉复核。
- [x] PDF p.91 表题歧义保留原 artifact ID，并标记为待出版源确认。
- [ ] 其余 8 个带图表 source span 保持 `pending`，后续按卡片扩展复核。

## 工程复核

- [x] 24 张卡片、33 个术语和 36 条关系均使用稳定语义键生成 ID。
- [x] 内容哈希与 ID 分离；内容变化不改变实体 ID。
- [x] 关系主体、客体和来源 span 全部可解析，M2-B 卡片孤儿数为 0。
- [x] M2-A 与 M2-B 卡片语义键无重复。
- [x] 批次卡片清单分别保存，聚合清单包含 12 + 24 = 36 张卡片。
- [x] 生成结果连续两次运行字节一致。
- [x] 附件哈希与页数复核通过，SQLite 批次前后哈希一致。
- [x] 未发现个人绝对路径、完整原文或整页图像持久化。

## 验证经验

首轮门禁因“需出版源确认”和“待出版源确认”边界字符串不一致失败。边界文案应由生成器作为单一事实源输出，验证器只核验该稳定表述；修正后完整门禁通过。

## 证据边界

- `evidence_level=published-book-derived-candidate`
- `relation_status=candidate`
- `review_status=pending`
- `author_examples_independently_verified=false`
- `official_standards_verified=false`
- `scm_crosswalk_performed=false`
- `database_write=false`
- `provider_call=false`
- `production_unchanged=true`
