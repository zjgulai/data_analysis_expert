---
card_id: "oadm-intelligent-workflow-automation-daaab69b1f"
semantic_key: "oadm:application:intelligent-workflow-automation"
card_type: "application-pattern"
title: "本体驱动的智能流程自动化模式"
domain: "ontology-ai-data-management-draft"
status: "draft"
evidence_level: "published-book-derived-candidate"
source_document_id: "book-ontology-ai-data-management-2026"
source_span_ids: ["oadm-span-s8-2-1-p158-p161"]
section_ids: ["8.2.1"]
fact_reason_action_class: "action"
scm_applicability: "not_assessed_in_m2d"
review_status: "pending"
version: 1
content_hash: "e4791f39568679efcc1c2ecb4b1153a524d482929508aba77901082e97782418"
---

# 本体驱动的智能流程自动化模式

## 核心结论

作者把角色、权限、前提、效果和原子 Action 建成流程本体，由多个 Agent 理解自然语言需求、执行审批规则并调用后端 API，使流程从硬编码转成动态语义工作流。

## 关键要素

- OWL-S 表达输入、输出、前提和效果。
- 流程支持顺序、分支、并行和循环。
- 自注释 Action 对接 API 与 MCP。
- 推理和执行历史完整记录。

## 适用场景

- 复杂审批与跨系统工单
- 可审计的流程自动化

## 不适用边界

- 全自动审批仅适用于经过授权的低风险路径。
- 作者声称的行业实践效果未独立核验。

## 与其他卡片或术语的候选关系

- `oadm:agent-action:safe-dynamic-action-loop`（候选关系，尚未晋升）
- `oadm:application:autonomous-operations`（候选关系，尚未晋升）

## SCM 候选映射

M2-D 仅完成来源内 Agent 工程与应用场景萃取，本卡尚未进行 SCM 适用性评估，也不得作为 SCM 已验证事实。

## 来源

- 文档：`book-ontology-ai-data-management-2026`
- 章节：8.2.1 本体驱动的智能流程自动化
- 页码：PDF pp.158–161
- 证据等级：`published-book-derived-candidate`

## 不确定项

- 流程语义与现有 API 的适配成本需实测。
