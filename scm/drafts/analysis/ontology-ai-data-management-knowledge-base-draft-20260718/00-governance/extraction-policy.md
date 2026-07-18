---
title: 《本体驱动的 AI 数据管理》内容抽取策略
doc_type: governance
module: scm
topic: ontology-ai-data-management-extraction-policy
status: draft
created: 2026-07-18
updated: 2026-07-18
owner: self
source: human+ai
---

# 《本体驱动的 AI 数据管理》内容抽取策略

## 目标

将用户提供的 PDF 转换为可追溯、可审阅、可重跑的派生知识制品，同时保持物理页码、章节层级、图表引用和证据等级。

## M1 抽取规则

1. 文本层使用 `pdftotext -layout` 抽取，按换页符恢复 211 个 PDF 物理页。
2. 每页只持久化字符数、行数、文本 SHA-256、章节路径、标题和图表引用，不持久化完整页文本。
3. 图像对象通过 `pdfimages -list` 计数；图表标题通过文本层模式识别。
4. 空文本页、低文本页、有图像对象页和图表标题页默认进入视觉复核队列。
5. PDF 物理页码是第一定位符；纸书印刷页码未可靠识别时保持 `null`。
6. M1 只建立来源地图，不产生正式知识结论。

## 后续知识卡规则

1. 一个知识卡只承载一个主要语义单元。
2. 释义与来源事实分开；不得把项目推断写成作者原意。
3. 每张卡必须引用至少一个 `source_span_id`。
4. 图表衍生结论必须先完成视觉复核。
5. 作者案例标记为 `author_example`，不得自动提升为 SCM 已验证事实。
6. 所有卡片默认 `draft` 和 `published-book-derived-candidate`。

## 可重跑命令

```bash
node tools/build-m1-source-map.mjs \
  --pdf "/path/to/user-provided.pdf" \
  --generated-at "2026-07-18T00:00:00.000Z"
```

命令行中的源路径只用于读取，不写入持久化制品。
