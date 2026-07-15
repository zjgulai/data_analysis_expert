---
title: "AIP-SCM 节点深化方案对当前产品状态的执行登记"
date: "2026-06-27"
status: "draft_execution_register"
scope: "对 00-09 提案逐项核对当前本地原型状态，并登记下一步内容优先执行项"
boundary: "local SQLite / draft documents only; productionWrites=false; providerCalls=false; erpWriteback=false; actions stop at suggestion_review_replay"
evidence:
  - "data/governance_workbench.sqlite"
  - "tmp/outputs/t2-metric-certification-evidence-20260627.json"
  - "tmp/outputs/t3-tag-certification-evidence-20260627.json"
  - "tmp/outputs/t4-kpi-tree-weight-evidence-20260627.json"
  - "tmp/outputs/t5-t6-storyline-closure-evidence-r2-20260627.json"
---

# AIP-SCM 节点深化方案对当前产品状态的执行登记

## 1. 事实基线

本登记基于 2026-06-27 本地原型状态，不代表生产环境状态。

| 事实项 | 当前状态 |
|---|---|
| 私钥治理 | 仓库内未检出 `*.pem` / `ai_video.pem`；原 `ai_video.pem` 已移到 `~/.Codex/file-history/...`。密钥轮换仍需人工确认。 |
| codebase-memory-mcp | 项目 `Users-pray-project-ecom_ana_overview-scm-drafts-prototypes-scm-data-governance-workbench-v0` 已 ready，814 nodes / 1874 edges。 |
| 指标认证 | `metrics` 共 178，`certified` 共 20；Top-12 相关 `lineage_edges` 有 12 个 target 的 certified lineage confidence >= 0.8。 |
| 维度白名单 | `metric_dimensions` 中 confirmed/forbidden 共 48 条，覆盖 Top-12 认证后的可答范围。 |
| 标签工程 | 8 个标签全部 `active`，且 `rule_expression` 均含 `threshold_version`、`basis` 与五轴分类字段。 |
| 指标体系 | `kpi_tree` 共 177 边，只有 3 条有权重；SCEI L0 主干有 5 条边但权重仍为空。 |
| 履约故事线 | 已有 3 条 `fulfillment_storyline_page` annotation：未发货预警、缺货三分法、审核效能双口径。 |
| AIP 闭环 | `recommendation_cards` 共 15，T5/T6 新增 3 条；`agent_traces` 共 61，T5/T6 新增 3 条；`trace_reviews` 共 13。 |
| 对象实例证据 | `ontology_object_instances` 有 10 条 `prototype_seed`，1 条 `system_data_contract_20260627` 非种子本地契约实例。 |
| 受控边界 | 新增 T5/T6 推荐卡 `execution_status=suggestion_review_replay`。既有 `decision_logs.action_boundary` 仍存在多种 no-write 表达，需后续枚举标准化。 |

## 2. 总判断

事实：关键路径已经按 07/09 要求推进到 W3 内容层：先清密钥与索引，再做 03 指标认证，然后做 02 标签、04 体系安全部分，再灌 05 故事线和 06 轨迹闭环。

推断：当前最大剩余风险不再是“完全没有可信地基”，而是“可信地基只覆盖首批 Top-12/20 certified 指标，04 权重与 07 枚举仍不足以支撑全局自动归因”。因此下一步仍应优先补内容证据和 owner 决策，不应直接拆 `main.tsx` 或开放任何生产动作。

不确定项：SCEI 到五个 L0 驱动的权重未在可引用文档中找到明确数值；审核效能专属时效指标未完成认证；密钥是否需要轮换属于人工安全流程，本登记不宣称已完成。

## 3. 逐篇核对

| 文档 | 提出的核心内容 | 当前产品状态 | 执行判定 |
|---|---|---|---|
| 00 index | 固化关键路径、术语枚举、边界与当前版本指针。 | 关键路径已作为执行顺序；边界保持本地 SQLite 与 no provider。 | 基本满足。仍需把 evidence_level 与 action_boundary 的枚举落到统一契约。 |
| 01 debt audit | D-P0-01 密钥、D-P0-02/03 指标血缘认证、D-P0-04 种子隔离、D-P0-05 轨迹空缺、D-P1-01/02 巨石。 | 密钥已移出；指标认证到 20；轨迹已灌 3 场景；种子隔离有非种子契约实例但枚举未统一；巨石未动。 | P0 多数完成或进入样本闭环；D-P0-04 枚举统一、D-P1 巨石拆分仍待 W4。 |
| 02 tag engineering | 8 标签阈值/依据/分类/生命周期 active；后续 `tag_assignment` 与标签链。 | 8 标签全部 active，阈值依据与五轴分类齐全。没有 `tag_assignment` 物化表，也未做 2 条标签链。 | P0 满足；P1 后置到模型评审。 |
| 03 metric engineering | Top-12 字段映射、三签认证、维度白名单；后续全量 `calc_type`、metric DAG、validation log。 | certified 指标 20；12 个目标指标有 confidence >= 0.8 的 certified lineage；维度确认 48 条。 | P0 达成首阶段门槛；P1/P2 仍需全量类型标注、DAG 与验证日志设计。 |
| 04 metric system | SCEI 到五维 L0 权重、MECE 残差、owner 绑定、归因路径样例。 | 已有 SCEI -> 5 L0 结构边，但权重 0/5；仅履约体验与数据可信部分有 3 条安全权重。 | 部分满足。无来源数值时必须 blocked，不能编造权重或强行平账。 |
| 05 insight storyline | 3 个履约核心页 SCQA 故事骨架、洞察单元、证据链与建议叠加。 | 已写 3 条页面故事 annotation，并挂推荐卡/轨迹；未新增 UI 行为。 | P0 内容层满足；独立 `insight_unit`/`storyline_template` 契约仍待设计评审。 |
| 06 Palantir core | 3 个端到端闭环、`agent_traces`、推荐动作卡、非种子对象实例、证据分层。 | 已有 3 条 T5/T6 trace + 3 推荐卡 + 3 action task + reviews；有 1 条本地 system_data 契约实例。 | P0 样本闭环满足；真实对象图、RBAC、动作分级开放仍未进入实施。 |
| 07 cross audit | 03 是总瓶颈；统一术语与 evidence/action 边界；列出 U-01..U-05 风险。 | 执行顺序已遵守；但 evidence_level 和 action_boundary 在数据库里仍有多种历史表达。 | 关键路径满足；枚举标准化进入后续治理任务。 |
| 08 codebase-memory | 清密钥、准备 `.cbmignore`、索引巨石，用依赖图拆分。 | `.cbmignore` 已存在；索引 ready；架构聚类显示 `src`、`server`、`public`、`scripts` 等真实模块。 | 前置满足；只可用于 T8 蓝图，不直接触发代码重构。 |
| 09 handoff | T1-T8 一卡一 PR；先内容后代码；每卡跑 check/build/smoke；严守边界。 | T1-T6 已在内容层推进；T4 有证据阻塞；T7/T8 未执行代码。 | 当前应收口为内容执行登记 + SQLite 治理任务，后续再分卡。 |

## 4. 任务卡状态

| 任务卡 | 当前状态 | 证据 | 下一步 |
|---|---|---|---|
| T1 D-P0-01 安全闭合 | 已做仓库内移除；轮换未确认。 | `find scm -name '*.pem'` 无输出。 | 人工轮换密钥；不要把密钥问题写成已完全闭环。 |
| T2 D-P0-02/03 指标认证 | 已完成首批 P0。 | 20 certified metrics；12 certified lineage targets confidence >= 0.8。 | 继续全量类型标注、DAG 与 validation log。 |
| T3 D-P1-03 标签坐实 | P0 完成。 | 8 active tags；8/8 threshold_version + basis + classification axes。 | 设计 `tag_assignment` 和 2 条标签链。 |
| T4 D-P1-05 体系回填 | 安全部分完成，主干权重 blocked。 | `SCM-MECE-L0-001` 有 5 边、0 权重；整体 177 边、3 权重。 | 请求 owner 或方法论文档给出 SCEI 五维权重；随后做 MECE 残差。 |
| T5 05-P0 故事线 | 内容层完成。 | 3 story annotations + 3 recommendation cards。 | 评审独立洞察单元契约，避免硬编码叙事。 |
| T6 06-P0 闭环灌注 | 内容层完成。 | T5/T6 3 traces、3 recs、3 action tasks、trace reviews。 | RBAC 和真实对象图进入 W4/P1。 |
| T7 数据模型增量迁移 | 未执行。 | 各篇第 7 节仍为设计。 | 先评审 additive schema，再写可重复迁移和回滚脚本。 |
| T8 巨石拆分 | 未执行。 | codebase-memory architecture ready；`src/main.tsx`/`server/index.mjs` 未在本轮修改。 | 先产出依赖图拆分蓝图，再行为保持小 PR。 |

## 5. 本轮继续执行的内容项

本轮不改业务代码，执行两类内容工作：

1. 增加本执行登记，作为 00-09 与当前产品状态的单一对照表。
2. 在 `governance_tasks` 中登记仍需人工依据或 W4 评审的后续项，避免把 blocked 项误写成完成项。

已登记的 SQLite 治理任务：

| task id | 状态 | 目的 |
|---|---|---|
| `aip_20260627_d_p0_04_evidence_enum_normalization` | pending_review | 统一 `evidence_level` 枚举与水印规则。 |
| `aip_20260627_boundary_action_enum_normalization` | pending_review | 统一 `action_boundary` 表达，保留 no-write flags。 |
| `aip_20260627_d_p1_05_scei_weight_source_required` | blocked_source_required | 等待 SCEI 五维权重来源，不编造。 |
| `aip_20260627_d_p1_05_relation_type_standardization` | pending_review | 标准化 `kpi_tree.relation_type`。 |
| `aip_20260627_t3_tag_assignment_model_review` | pending_model_review | 评审 `tag_assignment` 物化和标签链。 |
| `aip_20260627_t5_insight_unit_contract_review` | pending_contract_review | 评审 `insight_unit/storyline_template` 契约。 |
| `aip_20260627_t6_rbac_action_ladder_review` | pending_review | RBAC 与动作分级开放前置评审。 |
| `aip_20260627_t7_additive_migration_design` | pending_review | 加法式迁移与回滚设计。 |
| `aip_20260627_t8_codebase_memory_split_blueprint` | ready_for_blueprint | 基于图谱产出巨石拆分蓝图。 |

## 6. 后续不可越过的门槛

| 门槛 | 原因 |
|---|---|
| 不能补 SCEI 五维权重，除非有 owner/文档数值。 | 04 明确禁止拍脑袋权重；当前证据只能支撑结构边，不能支撑定量归因。 |
| 不能为了 ChatBI 可答而放宽认证门禁。 | 03/09 明确 certified metric only；当前应继续扩认证，而非绕过。 |
| 不能直接重构巨石。 | 08 只提供依赖图事实；T8 仍需蓝图、拆分边界、行为保持验证。 |
| 不能把本地 smoke 当生产验收。 | 当前证据层是 local prototype SQLite only；production/provider/ERP 均未触达。 |
