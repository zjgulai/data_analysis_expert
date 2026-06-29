---
title: "Palantir 核心要义 → 供应链 AIP 落地方案（MECE）"
doc_type: deepdive_plan
module: scm
topic: "aip-scm-node-deepdive-06-palantir-core-aip"
status: draft
created: 2026-06-27
updated: 2026-06-27
owner: self
source: human+ai
node_code: "AIP / Palantir 核心要义（贯穿节点）"
boundary: "analysis only；不改动现有代码；继承平台受控边界 productionWrites=false / providerCalls=false / erpWriteback=false"
upstream: "drafts/analysis/palantir-aipcon10-scm-aip-plan-draft-20260619（本篇在其上做核心要义提炼 + 与 02/03/04/05 的接驳总装，不重复其逐段拆解）"
---

# Palantir 核心要义 → 供应链 AIP 落地方案（MECE）

> 节点深化系列第 06 篇，也是**总装篇**。前 4 篇（标签 02 / 指标工程 03 / 指标体系 04 / 洞察故事线 05）是"零件"，本篇讲 Palantir 的**核心要义**如何把这些零件装成一台"供应链 AIP 操作系统"。本篇在既有 `palantir-aipcon10-scm-aip-plan` 蓝图之上做**要义提炼 + 节点接驳**，不重复其逐段视频拆解。

## 1. 节点定位与边界

**一句话定义**：Palantir 核心要义不是某一个页面，而是贯穿所有节点的**操作系统内核**——它规定"AI/数据/动作如何围绕对象本体协同"，把平台从"指标治理工作台"升级为"持续完成『发现异常→解释原因→推荐动作→审批执行→复盘沉淀』的 AIP 系统"。

边界：本篇负责**跨节点的内核能力与总装**（对象骨架、对象 360、执行轨迹、推荐动作、动作分级、证据链、多智能体）。不重复各节点内部细节（已在 02–05 各篇）。继承平台受控边界，**不碰生产写回**。

## 2. Palantir 核心要义（提炼为 7 条）

| # | 要义 | 原文锚点（来源见 00-index）| 一句话 |
|---|---|---|---|
| 1 | **AI 必须进入业务操作层** | AIP 定位为连接 AI/数据/运营流程的平台 | ChatBI 只是入口，不是终点；AI 要服务计划/采购/仓储/物流/成本的具体动作 |
| 2 | **Ontology 是运营骨架** | Ontology = 组织的 operational layer，映射对象/属性/关系/动作/安全 | 不以表格/报表为中心，以对象为中心 |
| 3 | **Actions 是洞察→执行闭环** | Action type = 对对象/属性/链接的一组受控变更 + side effects | 洞察必须能落到受控动作 |
| 4 | **AIP Logic 受同一安全模型约束** | 无代码 LLM 函数构建于平台安全模型，最小权限授予 | AI 只拿到完成任务所必需的访问权 |
| 5 | **页面是角色型工作台，不是通用 BI** | 演示页面嵌入真实操作流程而非独立聊天窗 | 工作台是"任务完成器" |
| 6 | **关键对象可被提升认证** | 2026 Ontology 可把对象类型 promote 为 core/critical（紫色 verified）| 认证信号随对象在全平台流动 |
| 7 | **治理先行，动作逐步开放** | read-only → recommendation → approved task → controlled export → write-back | 与本平台现有边界完全一致 |

## 3. 现状精确画像（实测证据）

| 内核能力 | 实测 | 判断 |
|---|---|---|
| 对象类型 | `ontology_objects` 14（sku/listing/supplier/warehouse/po/shipment/inventory_batch/…）| 类型骨架完整 |
| 对象实例 | `ontology_object_instances` 10，全 `seeded_demo`/`prototype_seed` | **实例未入真图**——要义 2 未落地 |
| 对象 360 | 无统一对象详情页 | 要义 5 缺口 |
| **执行轨迹** | `agent_traces=0`，但 `AgentTracePanel`（`main.tsx:1684`）已写好 | **要义 1/4 的组件就绪、数据为 0** |
| 推荐动作卡 | `recommendation_cards` 3（结构含 action_options/approval_status/execution_status/trace_id/sla）| 要义 3 结构到位，仅种子 |
| 场景 | `aip_scenarios` 3（如 FBA 负可用，P0，review_ready）| 闭环样例存在 |
| 决策/动作 | `decision_logs` 10 / `action_tasks` 3，止于 `suggestion_review_replay` | 要义 7 边界正确 |
| 权限 | 无 RBAC/登录 | 要义 4 的"对象/动作级权限"缺口 |
| 既有蓝图 | `palantir-aipcon10-scm-aip-plan` 已有 SOP1–5、gap 表 5.2、Phase1–6 路线 | **方法论已成熟，缺的是落地与数据** |

**结论**：Palantir 内核**"设计已到位、数据未灌注"**。表结构、组件、边界、蓝图都对，但对象实例是种子、执行轨迹为空、动作卡仅 3 条。总装的关键不是"再设计"，而是**用 02–05 四节点的产出去填充内核，并跑通 3 个端到端闭环**。

## 4. 目标能力 MECE 拆解（内核 7 域）

### A. 对象本体即运营骨架（Ontology as Operating Layer）
把对象从"类型/元数据"推进到"实例 + 状态 + 事件 + 责任人 + SLA + 关联指标/标签/任务"。链路：`Object Type → Instance → Property → Link → State → Event → Action`。实例入图是一切自动化的前提。

### B. 对象 360（Object 360）
统一对象详情页：一屏联动**属性（01）+ 指标（03/04）+ 标签（02）+ 事件 + 任务 + 证据**。任何异常都能"点开对象看全貌"。

### C. Agent Execution Trace（执行轨迹）
落地空表 `agent_traces`：每次 AI 作业输出可审计步骤——`识别对象/意图 → 检索认证指标/维度/知识卡 → 遍历对象关系与历史事件 → 结论 + 证据 + 置信度 + 缺口 → 生成建议动作 → 等待审批`。这是"AI 不自由作答"的可信凭证。

### D. 推荐动作卡（Recommendation Card）
每个异常自动形成：建议 + 影响评估 + owner + SLA + 风险等级 + 可选动作 + 证据链 + trace 引用。结构已在 `recommendation_cards`，需从 3 条扩到覆盖核心场景。

### E. 动作分级与权限（Action Tiering & RBAC）
动作开放阶梯（要义 7）：`只读证据 → 受治理建议 → 审批任务 → 受控导出 → API 辅助写回 → 策略化自动化`。配最小权限 RBAC（对象级/动作级/指标级/知识库级）。当前停在前两级——**这是正确的起点**，逐级开放须各自过门禁。

### F. 证据链分层（Evidence Chain Tiering）
每个 AI 结论标注证据等级：`prototype_seed`（种子）/ `real`（真实）/ `certified`（认证）。低等级证据不得驱动高风险动作。直接解 D-P0-04（种子混入）。

### G. 多智能体编排（Agent Orchestration）
角色型 agent（计划/采购/仓储/物流/成本/管理层）沿对象图谱协作，全部受语义层（03）+ 审计（C）+ 权限（E）约束。属中长期，但编排原则须现在定。

> MECE 自检：A 建骨架 / B 看全貌 / C 留轨迹 / D 出建议 / E 管开放 / F 分证据 / G 编排 agent——七域无重叠，并集覆盖"对象→洞察→建议→受控执行→多 agent"的 AIP 操作系统全栈。

## 5. 四节点如何接驳内核（总装图）

```text
                    ┌─────────── 对象本体 01（A 骨架 / B 对象360）───────────┐
                    │                                                        │
  标签工程 02 ──打标/升维属性&Links──► 对象实例           指标工程 03 ──认证口径&血缘──► 对象指标
        │                                  │                                   │
        │                                  ▼                                   │
        └──► 异常信号 ──► 指标体系 04 归因（驱动因子链 + owner）◄── 可信指标 ───┘
                                   │
                                   ▼
                洞察故事线 05（页面级：结论先行→归因→建议）
                                   │
                                   ▼
        C 执行轨迹 + D 推荐动作卡 ──► E 动作分级（止于建议/审批）──► 决策闭环 10（复盘回流）
                                   │
                                   ▼
                        F 证据链分层贯穿全程（种子/真实/认证）
```

要义对应：02 落"标签即属性/Links"（要义 2/3）；03 落"认证语义层 + 最小权限可答"（要义 4）；04 落"归因让 AI 会算账"（要义 1）；05 落"角色页面里的洞察→建议"（要义 5）；内核 C/D/E/F 落"可审计的受控动作"（要义 3/6/7）。

## 6. 自动化闭环：3 个端到端样例（首批要跑通）

| 场景 | 链路（节点协同）| 边界 |
|---|---|---|
| FBA 负可用库存（已有 P0 场景）| 标签`负可用异常`(02) → 批次对象 360(B) → 区分 oversell/预留/同步延迟(C 轨迹) → 推荐"复核而非改规则"(D) → 审批任务(E) | 仅建议+审批 |
| 断货高危补货 | 标签`断货高危`(02) → SCEI↓归因到可售覆盖不足(04) → 故事线"未发货/缺货"页(05) → 推荐补货/调拨评审(D) | 止于评审任务 |
| 成本异常 | 标签`成本异常`(02) → 成本效率指数归因(04) → 推荐核查异常成本事件(D) → 受控导出(E) | 不写回财务 |

每个样例都要产出一条 `agent_trace`（C）+ 一张 `recommendation_card`（D）+ 一条 `decision_log`/复盘——把空表灌成"可演示的真闭环"。

## 7. 数据模型增量（设计先行，不改代码）

| 新增/扩展 | 关键字段（设计）| 说明 |
|---|---|---|
| `ontology_object_instances`（扩展）| +state, +sla, +event_refs；新增真实实例（非 seed）| A |
| `object_event`（新）| object_instance_id, event_type, at, payload, evidence_level | A 事件流 |
| `agent_traces`（灌数据）| 按现有 schema 填充 3 场景轨迹 | C |
| `recommendation_cards`（扩展覆盖）| 扩到核心场景 | D |
| `rbac_policy`（新）| principal, scope(object/action/metric/kb), permission | E |
| `evidence_tier`（约定）| 全表统一 `evidence_level` 枚举与 UI 水印规则 | F |

## 8. 落地路线（接驳既有 Phase，对齐 4 节点）

| 波次 | 目标 | 与节点/既有 Phase 的关系 |
|---|---|---|
| **P0（30 天）** | 跑通第 6 节 3 个端到端闭环；灌 `agent_traces`；扩 `recommendation_cards` | = 既有蓝图 Phase 1「AIP-ready 基座」+ 本系列 02/03/04/05 的 P0 |
| P1 | 对象实例入真图（A）+ 对象 360（B）+ evidence 分层（F）| 既有 Phase 2「对象图谱」|
| P1 | 角色工作台接洞察故事线（05）+ 推荐卡（D）| 既有 Phase 3「角色型工作台」|
| P2 | 动作分级逐级开放（E）+ RBAC + 受控导出 | 既有 Phase 4/5「受控 agent / write-back」|
| P3 | 多智能体编排（G）+ 经营指挥中心 | 既有 Phase 6「AIP Operating System」|

## 9. 验收标准与度量

| 维度 | 当前 | 目标（P0）|
|---|---|---|
| 端到端闭环数 | 0（仅静态场景）| ≥ 3 可演示闭环 |
| `agent_traces` | 0 | ≥ 3（每场景 1 条可审计轨迹）|
| 推荐动作卡覆盖 | 3 | 覆盖 3 个 P0 场景，含 owner/SLA/证据 |
| 真实对象实例 | 0 | ≥ 1 类对象有非种子实例 |
| 证据分层 | 混用 | 全链路标注 seed/real/certified |
| 边界合规 | 合规 | 保持 productionWrites/providerCalls/erpWriteback=false |

## 10. 节点接口与依赖（本篇是 hub）

| 方向 | 对象 | 接口 |
|---|---|---|
| 依赖 ← | 02/03/04/05 全部 | 标签、认证指标、归因、页面洞察 |
| 依赖 ← | 对象本体 01 | 对象/实例/Links |
| 编排 → | 决策闭环 10 / 角色台 R2 / ChatBI 09 | 推荐卡、轨迹、受控动作 |
| 受约束 | 审计 01（D-P0-04/05、D-P1-07）| 证据分层、轨迹灌注、RBAC |
| 上游 | `palantir-aipcon10-scm-aip-plan` | SOP1–5 与 Phase1–6（本篇接驳而非重复）|

## 11. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 急于开放写回动作 | 严守 E 阶梯，逐级过门禁；P0 只到"建议+审批" |
| 种子数据驱动真决策 | F 证据分层 + UI 水印；低证据禁高风险动作 |
| 执行轨迹流于形式 | C 轨迹须含"缺口与置信度"，不只记成功路径 |
| RBAC 迟迟不上 → 动作无法开放 | P1 先出 RBAC 模型设计，与动作分级同步推进 |
| 与既有蓝图重复/冲突 | 本篇定位"接驳总装"，引用既有 Phase 不另起炉灶 |

---
*下一篇：`07-cross-audit-and-mece-register` 交叉审计与 MECE 一致性登记。*
