---
title: "SCM 数据治理工作台项目价值分析与立项建议"
doc_type: analysis
module: scm
topic: scm-business-value-and-investment-case
status: draft
created: 2026-06-30
updated: 2026-06-30
owner: self
source: human+ai
boundary:
  productionWrites: false
  providerCalls: false
  erpWriteback: false
  evidence_scope: "repo-local analysis plus local preprod/check evidence"
---

# SCM 数据治理工作台项目价值分析与立项建议

## 0. 核心结论

**事实**：当前目录已经不只是供应链资料库，而是由"供应链指标体系 + 真实业务导出样本 + AIP 数据治理工作台原型 + 履约看板原型 + preprod gate"组成的产品雏形。核心原型位于 `drafts/prototypes/scm-data-governance-workbench-v0/README.md`。

**战略判断**：它的不可替代性不在于"多一个 BI 看板"，而在于把跨境电商供应链中的指标口径、字段来源、Owner 审批、AI 建议、行动任务和审计追溯串成闭环。它解决的是"数据能不能信、问题能不能归因、建议能不能审批、动作能不能复盘"。

**边界**：当前是 **read-only prototype production-ready 的本地合格态**，不是生产闭环已上线。`preprod:check` 新鲜结果为 hard blockers 0，但仍有 3 个 manual gates：30 个 P0 owner sign-off、18 个 P0 field mapping、1 个 SCEI 权重来源；`providerCalls=false`、`productionWrites=false`、`erpWriteback=false`。

## 1. 项目能力剖析

### 核心能力

| 能力 | 项目事实依据 | 本质上解决了什么 |
|---|---|---|
| 供应链语义层与指标认证 | SQLite 当前有 178 个 metrics、20 个 certified metrics、278 条 lineage_edges、177 条 KPI tree；KPI 体系覆盖 FBA/FBM/DTC、头程、仓储、尾程、退货、库存周转等 | 解决跨平台、跨区域、跨角色"同名指标不同口径"的信任问题 |
| 多源库存/履约口径治理 | `system_data/` 含 FBA、Shopify、TikTok、Walmart、中仓、三方库存对账、全链路库存快照；`system_data/库存指标说明.md` 区分计划库存、在途、可用、预占、冻结等 | 解决多平台铺货后库存口径不一致、对账慢、错判缺货/积压的问题 |
| AIP 式证据链与决策闭环 | DB 中有 61 条 agent_traces、13 条 trace_reviews、15 张 recommendation_cards、15 个 action_tasks、154 条 decision_logs、486 条 audit_events | 解决 AI 建议"说得像对但不可追责"的问题，把建议变成可审批、可复盘的业务动作 |
| 角色化经营工作台 | 前端模块覆盖 Strategy Panorama、Current Risk Radar、Role Workbenches、Object 360、AI Knowledge、ChatBI、Decision Loop | 解决供应链 VP、计划、物流、财务、仓储、客服看到同一堆数据但无法各自行动的问题 |
| 只读发布与安全边界 | `preprod:check` 检查 Docker、Compose、SQLite、密钥扫描、provider/writeback 关闭；Docker 使用外部 SQLite volume 和 edge network | 解决从本地原型走向可演示、可部署时的安全与运维边界问题 |

### 拓展能力

| 拓展能力 | 当前基础 | 本质上解决了什么 |
|---|---|---|
| ChatBI 语义治理 | `POST /api/chatbi/dry-run` 只做 certified metric dry-run，不执行真实 SQL | 让业务问答先受指标认证约束，避免 ChatBI 直接撞生产库或编造口径 |
| 受控 provider 接入 | DeepSeek live smoke 有授权 flag、runtime key、secret redaction 和 no-write 设计 | 让大模型能力进入供应链场景时有闸门、有证据、有失败边界 |
| 履约时效看板产品化 | fulfillment dashboard 有 114 行指标字典、11 个图表绑定矩阵、只读数据表契约 | 可把"物流时效、异常、成本、库存"从静态报表升级为经营看板 |
| Runtime metadata projection | 88 个候选字段、62 个 allowlist、26 个敏感标识排除；仍保持 `business_rows_included=false` | 为后续接 OMS/WMS/ERP 样本行提供安全分层，而不是直接拉明细 |
| 多业务域复制 | 当前 SCM 已形成"指标-字段-知识-建议-审批-审计"的骨架 | 可复用到选品、广告 ROI、合规、评论运营、逆向物流等跨境电商核心域 |

## 2. 价值金字塔：从能力倒推三层问题

| 层级 | 核心问题 | 本项目的价值定位 |
|---|---|---|
| 微观·执行层 | 一线人员每天在 ERP、OMS、WMS、FBA、Shopify、TikTok、Walmart 间查数、复制、对账、解释差异 | 用统一指标字典、字段映射、知识卡和 ChatBI dry-run 降低重复查询与口径错误 |
| 中观·管理层 | 计划、仓储、物流、财务、客服各看各的报表，问题难归因，Owner 难落位 | 用 Role Workbenches、Risk Radar、Recommendation Card、Decision Log 把问题转成责任人与行动台账 |
| 宏观·战略层 | 公司想降本、控库存、提升履约体验，但缺少可复制的数据治理和 AI 决策底座 | 把供应链从"人工经验 + 零散 BI"升级为可审计、可扩展、可跨区域复制的经营操作系统 |

## 3. 经典场景闭环举例

| 层级 | 业务问题 | 本项目解法 | 价值收益 |
|---|---|---|---|
| 微观 | TikTok US、Walmart、Shopify、FBA 的"可用库存/计划库存/在途库存"口径不同，计划员每周人工对账，容易把 MSKU、供应链 SKU、国家仓维度混在一起 | 用库存指标口径、source coverage、field mapping gate 和 ChatBI dry-run 固定"字段来源、粒度、公式、Owner"，对差异生成可追溯解释 | 推断收益：库存对账工时可作为 30%-50% 降幅目标；更重要的是降低错补、漏补、超卖和断货误判 |
| 微观 | 一线问"为什么某 SKU 北美缺货但仓库看还有库存"，普通 AI/BI 很容易混用在途、预占、冻结、不可售 | AI Knowledge + Agent Trace 只基于本地知识卡和证据链回答，并记录不确定项；DeepSeek provider 默认关闭 | 可感知收益：把口径解释从"找人问半天"变成"分钟级拿到证据链"，同时避免未授权 provider call |
| 中观 | 供应链周会发现北美尾程成本高、FBA 长库龄上升、TikTok 国家仓断货，但责任分散 | Risk Radar 把风险信号关联到 Object 360、Recommendation Card、Action Task 和 Decision Log，区分计划、物流、仓储、财务 Owner | 推断收益：减少会议对齐成本；把"发现问题"升级为"谁审批、谁执行、何时复盘" |
| 中观 | 履约看板要上线，但 BI、数据仓库、业务 Owner 对字段、分母、下钻键理解不一致 | fulfillment dashboard 已有 114 行指标字典、11 个图表绑定、只读表契约和 SQL/BI 口径草稿 | 可感知收益：降低 BI 返工；让数据团队按契约开发，而不是按页面截图猜字段 |
| 宏观 | 公司降本不能只盯物流费，采购上行、库存积压、尾程结构和区域渠道差异会互相抵消 | 项目把成本率、库存周转、超龄库存、履约满意度、退货处理成本放进统一 KPI 与 AIP 闭环 | 推断收益：报告中已有 12 个月总成本率从 36%+ 向 32%-33% 改善的经营目标，可作为立项验收北极星 |
| 宏观 | 跨境品牌扩平台、扩国家、扩品类后，运营复杂度指数级上升，靠人工经验不可复制 | 以"语义层 + 审批台账 + AI 证据链 + 只读发布边界"沉淀公司级供应链智能底座 | 商业意义：形成跨平台复制能力，未来可延展到选品、合规、本地化营销、广告 ROI、评论/VOC 与逆向物流闭环 |

## 4. 完成度评估

| 模块 | 当前状态 | 证据 | 判断 |
|---|---|---|---|
| 供应链方法论与 KPI 资产 | 已完成较成熟底座 | `00_供应链专题_项目分层蓝图.md`、`02_Momcozy_KPI体系设计.md`、`03_指标树图可视化/README.md` | 可用于汇报和产品设计 |
| 数据/口径资产 | 已有本地样本和说明 | `system_data/` 多平台库存与对账文件、库存口径文档 | 可支持 PoC，未等于生产接入 |
| AIP SCM 工作台 | 已实现本地原型 | React/Vite + Node + SQLite；API 覆盖 governance、ontology、metrics、knowledge、ChatBI、decision loop | 产品骨架成立 |
| 本地质量门禁 | 本次通过 | `npm run check` 通过；`preprod:check` hard blockers 0 | 只读原型可进入人工发布审批 |
| 生产闭环 | 未完成 | 未执行本次 production smoke；provider/writeback 均关闭 | 不能宣称生产业务闭环上线 |
| Owner/字段/权重会签 | 未完成 | 30 个 P0 owner sign-off、18 个 P0 field mapping、1 个 SCEI 权重 gate | 是下一阶段最大业务阻塞 |
| 可复现导入 | 存在风险 | `import-assets.mjs` 依赖的 `business-supply-chain-knowledge-base-draft-20260616/metric-system-blueprint` 本次未在当前目录找到 | 需补齐源资产或修正导入路径 |

**整体完成度判断（推断）**：资料与语义资产约 80%；只读治理原型约 70%；生产级业务闭环约 35%-45%。项目已超过"概念验证"，但还没到"可承载生产决策自动化"。

## 5. 待优化项

1. **先关 manual gates**：P0 owner sign-off、P0 field mapping、SCEI 权重来源必须由业务 Owner 确认，不能由代码补齐。
2. **修复可复现链路**：补齐或重定位 import sourceRoot，确保 SQLite 可从源资产重新生成。
3. **建立干净 release worktree**：当前 preprod 显示 dirtyCount 20，发布前必须 atomic staging / release branch / PR。
4. **接入只读样本包**：先接 OMS/WMS/ERP 脱敏样本和字段元数据，不直接导入业务明细。
5. **把价值指标产品化**：为库存对账时长、缺货率、超龄库存、尾程成本率、预警闭环率设上线前基线。
6. **Provider 分阶段开放**：先本地知识问答，再 DeepSeek knowledge mode 单点授权，最后再评估 web search；每步都保留 trace 和 no-write 边界。

## 6. 高价值演进路线

| 阶段 | 方向 | 打开的商业空间 |
|---|---|---|
| Phase 1：只读生产试点 | 发布 SCM Read-only Governance Workbench，面向计划、物流、财务、仓储 Owner 做周会试点 | 从"项目资料"变成"管理层可用的经营工作台" |
| Phase 2：真实样本校准 | 接入 OMS/WMS/ERP 脱敏样本，校准字段、粒度、阈值和指标认证 | 从"可演示"变成"可相信" |
| Phase 3：经营预警闭环 | 将缺货、负可用库存、超龄库存、尾程成本异常转为 recommendation/action task | 从"看板"变成"行动系统" |
| Phase 4：AI 决策助手 | 在 certified metric 和 evidence trace 约束下开放 ChatBI 与 DeepSeek provider | 从"人找数"变成"人审建议" |
| Phase 5：跨域复制 | 扩展到选品、合规、广告 ROI、评论运营、退货原因、用户反馈与供应链联动 | 从 SCM 单点产品变成跨境品牌出海的智能经营底座 |

## 7. 立项建议

建议立项方向定义为：**跨境电商供应链 AIP 数据治理与决策闭环平台**。

资源投入优先级：

1. 数据 Owner + 供应链 Owner：完成 P0 sign-off 和字段会签。
2. 数据工程：补齐只读样本、导入可复现、字段血缘和 DQ。
3. 产品/前端：把 Role Workbenches、Risk Radar、Decision Loop 收敛成管理层周会工作流。
4. AI 工程：在 no-write、trace-first、manual review 的边界内开放 provider 能力。
5. 业务运营：用 30/60/90 天指标证明价值，而不是只展示页面。

**一句话汇报**：这个项目值得立项，因为它不是在做一个供应链报表，而是在搭建跨境电商供应链"可信数据 + 可控 AI + 可复盘行动"的经营基础设施。
