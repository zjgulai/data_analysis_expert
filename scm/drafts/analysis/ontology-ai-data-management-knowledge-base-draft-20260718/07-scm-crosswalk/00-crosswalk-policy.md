---
title: M3-A SCM 候选 Crosswalk 规则与评审门禁
doc_type: governance
module: scm
topic: ontology-ai-data-management-m3a-crosswalk
status: draft
created: 2026-07-18
updated: 2026-07-19
owner: self
source: human+ai
---

# M3-A SCM 候选 Crosswalk 规则与评审门禁

## 范围与评审权限

M3-A 的原始快照把 89 张来源知识卡逐卡分为 `accept_candidate`、`reject_candidate` 或 `unmapped`。三组 card ID 必须在 seed 中显式列出、各自唯一、互不重叠，并与来源 manifest 精确等集；禁止用 fallback 隐式生成 `unmapped`。

2026-07-19 的语义评审采用单独的 `owner-review-decisions.json` 覆盖层，不改写原始 `mapping_status`。本轮身份固定为 `owner-delegated-codex`，授权依据固定为 `review_authority=user-authorized-2026-07-19`。这是用户授权的 AI 代理评审，不是人类 owner 亲自复核或签字；`human_owner_sign_off=false`。

评审覆盖原 10 条 accepted target edge 与 3 条 rejected considered edge，共 13 条。每条边必须且只能出现一次；遗漏、重复/重叠、未知边、非法 decision、reviewer 或 authority 不匹配均使 builder fail-fast。

## 三层证据

| 层级 | 字段 | 含义 | 可否直接作为 SCM 事实 |
|---|---|---|---|
| 书籍观点 | `book_evidence_level=published-book-derived-candidate` | 对附件内容的可追溯释义 | 否 |
| 项目适用推断 | `applicability_evidence_level=project-applicability-inference` | 将书籍方法与 SCM 目标进行语义比较后的候选判断 | 否 |
| SCM 已验证事实 | `scm_verified_fact` | 表示 crosswalk 是否已有 SCM 事实证据 | 本批固定为 `false` |

目标 ID 存在性是只读数据库检查结果，但不能把“目标存在”误写成“映射成立”。owner-delegated 评审也不等于 SCM verified、active 或 certified。

## 目标类型与语义 guardrail

- `object` 必须使用 `ontology_objects.id`，候选 runtime relation 为 `DESCRIBES_OBJECT`。
- `metric` 必须使用 `metrics.id`，候选 runtime relation 为 `SUPPORTS_METRIC`；`metrics.code` 不能替代主键。
- 当前 runtime 的 knowledge support 路径只稳定解析 `object|metric`。
- `knowledge_cards.rule_refs` 是 JSON 文本引用字段，不是稳定规则主键；当前 SQLite 也没有独立 rule registry。因此规则类内容保持 `unmapped`，不得映射到 `tags` 或自由文本 rule token。

两条边级 guardrail：

1. `DESCRIBES_OBJECT` 必须匹配 canonical object 的身份键与业务粒度；只提到预测、计划或库存概念，不足以映射到更细的对象资产。
2. `SUPPORTS_METRIC` 至少直接支持指标口径、采集/源字段或计算证据之一；一般流程、版本管理或工程追踪语义不足以支持指标。

## 原候选状态与覆盖层结果

原候选字段保留历史含义：

- `accept_candidate`：当时建议进入 owner 评审，不代表接受、批准或验证。
- `reject_candidate`：记录看似相关但语义不同的诱人映射，并保留 considered target 与冲突原因。
- `unmapped`：当前 SCM 尚无直接等价目标，不是抽取失败。

覆盖层在 disposition 上增加 `owner_review` 和 `effective_mapping_status`：9 张评审范围内卡为 `owner_review.status=completed`，80 张原 `unmapped` 卡为 `not_in_scope`；有效结果固定为 8 张 `rejected`、1 张 `deferred`、80 张 `unmapped`。边级决策固定为 0 approved、12 rejected、1 deferred，且 0 promotion。

原 `review_status=pending` 与 `reviewer=null` 是候选快照历史字段，不能据此否定覆盖层已完成；也不得把覆盖层字段反写成历史候选已被人类 owner 批准。

## 延期问题

`SCM-MECE-L3-110` 需要先定义 rule grain，并澄清“支持结论数 / 已分析规则数”的公式以及场景测试结果转为 evidence 的机制。目标模型未补齐前，该边保持 `defer_insufficient_target_model`。

## 质量检查

确定性 verifier 必须检查：

- 89 张卡显式一一覆盖，原始计数仍为 6/3/80。
- 13/13 条候选边精确评审，无遗漏、重复/重叠、未知边或非法 decision。
- reviewer、authority、reviewed date 精确匹配；结果为 0/12/1，覆盖 9 张卡，80 张 not-in-scope。
- `promotion_count=0`，所有 disposition 与边级 `scm_verified_fact=false`，没有 active/certified。
- canonical target 存在、精确重复、语义冲突、孤儿处置、反向引用、many-to-one 和 rule registry 缺口均被检查。
- SQLite 只通过 `readonly+immutable` 查询，预期哈希匹配且查询前后哈希不变。
- 从基线提交 `e99f7089791b31891a7b5bb9cc352f161852c8e3` 计算 committed diff，并与当前 porcelain 状态合并检查 allowlist 和 importer 变更。

固定生成物仅包括报告、candidate manifest 与 quality report；`owner-review-decisions.json` 是 source input，必须出现在确定性的 `scope_input_paths`，不得列入 `generated_artifact_paths`。所有动态检查共同决定 `final_gate`，任一核心检查失败时 builder 在写制品前失败。

provider call、外部 promotion、deploy 和 standalone sync 不是 builder 能直接观察的事实，只能记录为 `verification=not_verified_by_builder` 的本批执行声明，不参与自动通过判定。
