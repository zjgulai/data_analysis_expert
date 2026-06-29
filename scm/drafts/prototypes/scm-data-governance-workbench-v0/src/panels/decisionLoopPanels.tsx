import {
  AgentRunList,
  RecommendationCardList,
  type AgentRun,
  type AgentTrace,
  type RecommendationCard
} from "./agentActivityLists";
import { ExportButton, type ExportFormat, type ExportJob } from "./exportControls";
import { AgentTracePanel, TraceReviewBoard, type TraceReview } from "./traceReviewPanels";
import {
  Badge,
  DataTable,
  GovernanceBoundaryStrip,
  RefPills,
  humanizeBoundary,
  humanizeOperationalLabel,
  type AnyRow
} from "../shared/ui";
import type {
  DecisionReceiptSummary,
  OmsWmsUsagePolicyChoice,
  OmsWmsUsagePolicyPacket,
  OmsWmsUsagePolicyPayload,
  OwnerDecisionChoice,
  OwnerDecisionPacket,
  ScenarioDiagnosticPayload
} from "./decisionLoopModels";

export type {
  DecisionReceiptSummary,
  OmsWmsUsagePolicyChoice,
  OmsWmsUsagePolicyPacket,
  OmsWmsUsagePolicyPayload,
  OwnerDecisionChoice,
  OwnerDecisionPacket,
  ScenarioDiagnosticPayload
} from "./decisionLoopModels";

export type DecisionView = "inbox" | "scenarios" | "governance" | "runs" | "audit";

export type DecisionInboxScenario = AnyRow & {
  id: string;
  name: string;
  scenario_type: string;
  priority: string;
  status: string;
  owner: string;
  trigger_condition: string;
  target_object_type: string;
  target_object_id: string;
  diagnostic_question: string;
  decision_boundary: string;
  evidence_level: string;
  next_action: string;
  linkedMetricIds: string[];
  linkedKnowledgeCardIds: string[];
  linkedRecommendationCardIds: string[];
  recommendationCards?: RecommendationCard[];
  agentRuns?: AgentRun[];
};

const decisionViewItems: Array<{ id: DecisionView; label: string; helper: string }> = [
  { id: "inbox", label: "责任人收件箱", helper: "待办优先" },
  { id: "scenarios", label: "场景诊断", helper: "AIP 场景" },
  { id: "governance", label: "治理视图", helper: "回执与策略包" },
  { id: "runs", label: "运行与建议", helper: "Run / Card" },
  { id: "audit", label: "审计台账", helper: "Trace / Action" }
];

export function DecisionViewTabs({
  activeView,
  onChange
}: {
  activeView: DecisionView;
  onChange: (view: DecisionView) => void;
}) {
  return (
    <div className="decisionViewTabs" role="tablist" aria-label="决策闭环视图">
      {decisionViewItems.map((view) => (
        <button
          className={activeView === view.id ? "active" : ""}
          key={view.id}
          role="tab"
          aria-selected={activeView === view.id}
          onClick={() => onChange(view.id)}
        >
          <span>{view.label}</span>
          <small>{view.helper}</small>
        </button>
      ))}
    </div>
  );
}

function priorityRank(value: string) {
  return ({ P0: 0, P1: 1, P2: 2 } as Record<string, number>)[value] ?? 3;
}

export function AipScenarioBoard({
  scenarios,
  busy,
  diagnostic,
  matrixResults,
  onRun,
  onRunAll,
  onExport
}: {
  scenarios: DecisionInboxScenario[];
  busy: string;
  diagnostic: ScenarioDiagnosticPayload<DecisionInboxScenario> | null;
  matrixResults: ScenarioDiagnosticPayload<DecisionInboxScenario>[];
  onRun: (scenario: DecisionInboxScenario) => void;
  onRunAll: () => void;
  onExport: (assetType: string, format: ExportFormat, filters: Record<string, unknown>) => Promise<ExportJob>;
}) {
  return (
    <div className="surface scenarioBoard">
      <div className="surfaceHead">
        <div>
          <p className="eyebrow">AIP scenario closed loop</p>
          <h3>三大供应链场景闭环</h3>
          <p>以对象实例为入口，串联指标、知识证据、推荐卡、运行记录和人工审批边界；当前不写回 ERP/积加。</p>
        </div>
        <div className="inlineActions">
          <Badge tone="warn">不调用外部模型，不回写业务系统</Badge>
          <button onClick={onRunAll} disabled={Boolean(busy) || !scenarios.length}>
            {busy === "scenario-matrix" ? "矩阵诊断中..." : "运行全部场景诊断"}
          </button>
          <ExportButton assetType="aip_scenarios" onExport={onExport} />
        </div>
      </div>
      <div className="scenarioGrid">
        {scenarios.length ? scenarios.map((scenario) => (
          <article className="scenarioCard" key={scenario.id}>
            <div className="scenarioCardHead">
              <div>
                <span>{scenario.scenario_type} · {humanizeOperationalLabel(scenario.status)}</span>
                <strong>{scenario.name}</strong>
              </div>
              <Badge tone={scenario.priority === "P0" ? "warn" : "blue"}>{scenario.priority}</Badge>
            </div>
            <p>{scenario.trigger_condition}</p>
            <div className="scenarioTarget">
              <div>
                <span>目标对象</span>
                <strong>{scenario.target_object_type}</strong>
                <small>{scenario.target_object_id}</small>
              </div>
              <div>
                <span>Owner</span>
                <strong>{scenario.owner}</strong>
                <small>{scenario.evidence_level}</small>
              </div>
            </div>
            <div className="scenarioQuestion">
              <span>诊断问题</span>
              <strong>{scenario.diagnostic_question}</strong>
            </div>
            <RefPills label="Metric" refs={scenario.linkedMetricIds || []} />
            <RefPills label="Knowledge" refs={scenario.linkedKnowledgeCardIds || []} />
            <div className="scenarioBoundary">
              <span>边界</span>
              <strong>{humanizeBoundary(scenario.decision_boundary)}</strong>
            </div>
            <div className="recommendationActions">
              <button disabled={Boolean(busy)} onClick={() => onRun(scenario)}>
                {busy === scenario.id ? "诊断中..." : "运行本地诊断"}
              </button>
            </div>
            <small>{scenario.next_action}</small>
          </article>
        )) : <p className="ledgerEmpty">暂无 AIP 场景</p>}
      </div>
      {diagnostic ? (
        <div className="scenarioResult">
          <div className="object360Head">
            <div>
              <p className="eyebrow">diagnostic result</p>
              <h3>{diagnostic.scenario.name}</h3>
            </div>
            <Badge tone="blue">已写入本地台账</Badge>
          </div>
          <div className="scenarioOutcome">
            <div>
              <span>下一步</span>
              <strong>{diagnostic.nextAction}</strong>
            </div>
            <div>
              <span>决策边界</span>
              <strong>{humanizeBoundary(diagnostic.boundary)}</strong>
            </div>
          </div>
          <AgentRunList runs={[diagnostic.run]} title="本次诊断运行记录" limit={1} />
          <AgentTracePanel trace={diagnostic.trace} title="本次诊断证据链" />
        </div>
      ) : null}
      {matrixResults.length ? (
        <div className="workflowReceipt scenarioMatrixReceipt">
          <div>
            <p className="eyebrow">Scenario Matrix Receipt</p>
            <h3>场景矩阵诊断回执</h3>
            <p>{matrixResults.length} / {scenarios.length} 个场景已进入本地运行记录复盘。</p>
          </div>
          <div className="receiptGrid">
            {matrixResults.map((item) => (
              <div key={item.run.id}>
                <span>{item.scenario.priority} · {humanizeOperationalLabel(item.scenario.status)}</span>
                <strong>{item.scenario.name}</strong>
                <small>{item.run.id}</small>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DecisionReceiptGovernance({
  data,
  onExport
}: {
  data: DecisionReceiptSummary;
  onExport: (assetType: string, format: ExportFormat, filters: Record<string, unknown>) => Promise<ExportJob>;
}) {
  return (
    <div className="surface decisionReceiptGovernance">
      <div className="surfaceHead">
        <div>
          <p className="eyebrow">Decision Receipt Governance</p>
          <h3>OMS/WMS owner gate 回执治理</h3>
          <p>把 OMSWMS-001..004 的阶段性选择、来源覆盖行和运行时导入边界放在同一个治理面。</p>
        </div>
        <div className="inlineActions">
          <Badge tone="warn">人工复核</Badge>
          <ExportButton assetType="decision_logs" onExport={onExport} />
        </div>
      </div>
      <div className="receiptGovernanceStats">
        <div>
          <span>门禁包</span>
          <strong>{data.summary.packetCount}</strong>
        </div>
        <div>
          <span>已记录回执</span>
          <strong>{data.summary.receiptCount}</strong>
        </div>
        <div>
          <span>来源覆盖行</span>
          <strong>{data.summary.sourceCoverageRows}</strong>
        </div>
        <div>
          <span>导入关闭行</span>
          <strong>{data.summary.runtimeClosedRows}</strong>
        </div>
      </div>
      <div className="receiptGovernanceGrid">
        {data.packets.map((packet) => (
          <article className="receiptGovernanceCard" key={packet.packetId}>
            <div>
              <span>{packet.packetId}</span>
              <strong>{packet.title}</strong>
            </div>
            <Badge tone={packet.latestDecisionId ? "blue" : "warn"}>{humanizeOperationalLabel(packet.latestStatus)}</Badge>
            <p>{packet.latestReviewNote}</p>
            <small>{packet.coverageCount} 行来源覆盖 · {packet.runtimeClosedCount} 行导入关闭</small>
            <small>{packet.latestDecisionId || "待责任人决策"}</small>
          </article>
        ))}
      </div>
      {data.recentReceipts.length ? (
        <div className="recentReceiptStrip">
          {data.recentReceipts.slice(0, 4).map((receipt) => (
            <div key={String(receipt.id)}>
              <span>{humanizeOperationalLabel(receipt.status)}</span>
              <strong>{String(receipt.insight_title || "")}</strong>
              <small>{String(receipt.id || "")}</small>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OmsWmsUsagePolicyPanel({
  data,
  busy,
  receipt,
  onRecord
}: {
  data: OmsWmsUsagePolicyPayload;
  busy: string;
  receipt: AnyRow | null;
  onRecord: (packet: OmsWmsUsagePolicyPacket, choice: OmsWmsUsagePolicyChoice) => void;
}) {
  const boundaryFacts = Object.entries(data.summary.boundary || {}).slice(0, 9);
  return (
    <div className="surface omsWmsUsagePolicyPanel">
      <div className="surfaceHead">
        <div>
          <p className="eyebrow">OMS/WMS Usage Policy Pack</p>
          <h3>来源字段使用策略选择包</h3>
          <p>把字段用途、导出/API 血缘、敏感字段和来源系统证据水位纳入责任人复核；当前只写本地决策台账。</p>
        </div>
        <div className="inlineActions">
          <Badge tone="warn">{data.summary.recommendedPath}</Badge>
          <Badge>{humanizeOperationalLabel(data.summary.scope)}</Badge>
        </div>
      </div>

      <div className="omsWmsUsageStats">
        <div>
          <span>策略包</span>
          <strong>{data.summary.reviewPacketCount}</strong>
        </div>
        <div>
          <span>回执</span>
          <strong>{data.summary.receiptCount}</strong>
        </div>
        <div>
          <span>来源覆盖行</span>
          <strong>{data.summary.sourceCoverageRows}</strong>
        </div>
        <div>
          <span>血缘行</span>
          <strong>{data.summary.lineageRows}</strong>
        </div>
        <div>
          <span>准入 / 排除</span>
          <strong>{data.summary.activeAllowlistFields} / {data.summary.excludedSensitiveIdentifierFields}</strong>
        </div>
      </div>

      <div className="omsWmsUsageBoundary">
        {boundaryFacts.map(([key, value]) => (
          <span key={key}>{humanizeOperationalLabel(key)}: {value ? "开启" : "关闭"}</span>
        ))}
      </div>

      <div className="omsWmsUsageGrid">
        {data.reviewPackets.map((packet) => (
          <article className="omsWmsUsageCard" key={packet.id}>
            <div className="decisionPacketHead">
              <div>
                <span>{packet.id} · {packet.owner}</span>
                <strong>{packet.title}</strong>
              </div>
              <Badge tone={packet.recorded ? "blue" : "warn"}>{humanizeOperationalLabel(packet.recordedStatus)}</Badge>
            </div>
            <p>{packet.recommendation}</p>
            <div className="omsWmsUsageFacts">
              <span>{packet.sourceEvidence.length} 行来源覆盖</span>
              <span>{packet.lineageEvidence.length} 行血缘</span>
              <span>{packet.recommendedChoice} · {humanizeOperationalLabel(packet.recommendedStatus)}</span>
            </div>
            <div className="decisionChoiceGrid">
              {packet.choices.map((choice) => (
                <button
                  key={`${packet.id}-${choice.code}`}
                  disabled={Boolean(busy)}
                  onClick={() => onRecord(packet, choice)}
                >
                  <span>{choice.code}</span>
                  <strong>{choice.label}</strong>
                </button>
              ))}
            </div>
            <small>{humanizeBoundary(packet.actionBoundary)}</small>
            {packet.receiptId ? <small>{packet.receiptId}</small> : <small>字段使用策略待责任人确认</small>}
          </article>
        ))}
      </div>

      {receipt ? (
        <div className="workflowReceipt omsWmsUsageReceipt">
          <div>
            <p className="eyebrow">OMS/WMS usage policy receipt</p>
            <h3>字段使用策略已记录</h3>
            <p>{String(receipt.insight_title || "")}</p>
          </div>
          <div className="receiptGrid">
            <div>
              <span>决策</span>
              <strong>{String(receipt.id || "")}</strong>
              <small>{humanizeOperationalLabel(receipt.status)}</small>
            </div>
            <div>
              <span>边界</span>
              <strong>{humanizeBoundary(receipt.action_boundary)}</strong>
              <small>仅本地台账</small>
            </div>
            <div>
              <span>外部模型 / 回写</span>
              <strong>关闭 / 关闭</strong>
              <small>不调用外部模型，不回写 OMS/WMS/ERP</small>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DecisionInboxPanel({
  scenarios,
  recommendations,
  actions,
  receiptSummary,
  traces,
  runs,
  busy,
  onReview,
  onConvert,
  onRunScenario,
  onCreateRecommendation,
  onCreateScenarioRun,
  onViewChange
}: {
  scenarios: DecisionInboxScenario[];
  recommendations: RecommendationCard[];
  actions: AnyRow[];
  receiptSummary: DecisionReceiptSummary;
  traces: AgentTrace[];
  runs: AgentRun[];
  busy: string;
  onReview: (card: RecommendationCard, status: string) => void;
  onConvert: (card: RecommendationCard) => void;
  onRunScenario: (scenario: DecisionInboxScenario) => void;
  onCreateRecommendation: () => void;
  onCreateScenarioRun: () => void;
  onViewChange: (view: DecisionView) => void;
}) {
  const pendingCards = [...recommendations]
    .filter((card) => !["approved", "reviewed", "rejected"].includes(card.approval_status))
    .sort((left, right) => priorityRank(left.risk_level) - priorityRank(right.risk_level));
  const visibleCards = (pendingCards.length ? pendingCards : recommendations)
    .slice(0, 5);
  const highPriorityScenarios = [...scenarios]
    .filter((scenario) => ["P0", "P1"].includes(scenario.priority))
    .sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority))
    .slice(0, 3);
  const openActions = actions.filter((action) => !["done", "completed", "closed"].includes(String(action.status || "")));
  const reviewReadyRuns = runs.filter((run) => ["review_ready", "blocked", "running"].includes(run.status));
  const latestReceipts = receiptSummary.recentReceipts.slice(0, 3);
  const latestTraces = traces.slice(0, 3);

  return (
    <div className="surface decisionInbox">
      <div className="surfaceHead decisionInboxHead">
        <div>
          <p className="eyebrow">Owner decision inbox</p>
          <h3>责任人决策收件箱</h3>
          <p>默认聚焦待复核建议、P0/P1 场景、未收口任务和最近证据链；深入诊断、策略包和审计台账放入分视图。</p>
        </div>
        <div className="inlineActions">
          <GovernanceBoundaryStrip
            items={[
              { label: "PC 治理工作台", tone: "warn" },
              { label: "本地台账", tone: "blue" }
            ]}
          />
          <button onClick={onCreateRecommendation} disabled={Boolean(busy)}>
            {busy === "create" ? "创建中..." : "新建异常诊断卡"}
          </button>
        </div>
      </div>

      <div className="decisionInboxStats">
        <div>
          <span>待复核建议</span>
          <strong>{pendingCards.length}</strong>
          <small>{recommendations.length} 张建议卡</small>
        </div>
        <div>
          <span>P0/P1 场景</span>
          <strong>{highPriorityScenarios.length}</strong>
          <small>{scenarios.length} 个场景</small>
        </div>
        <div>
          <span>本地回执</span>
          <strong>{receiptSummary.summary.receiptCount}</strong>
          <small>{receiptSummary.summary.packetCount} 个门禁包</small>
        </div>
        <div>
          <span>待推进任务</span>
          <strong>{openActions.length}</strong>
          <small>{reviewReadyRuns.length} 条运行待复盘</small>
        </div>
      </div>

      <div className="decisionInboxGrid">
        <section className="decisionInboxQueue">
          <div className="object360ListHead">
            <strong>建议处理队列</strong>
            <button className="secondaryAction" onClick={() => onViewChange("runs")}>查看全部</button>
          </div>
          {visibleCards.length ? visibleCards.map((card) => {
            const canConvert = ["approved", "reviewed"].includes(card.approval_status);
            const isRejected = card.approval_status === "rejected";
            return (
              <article className="decisionInboxCard" key={card.id}>
                <div className="decisionInboxCardHead">
                  <div>
                    <span>{card.scenario} · {card.owner}</span>
                    <strong>{card.title}</strong>
                  </div>
                  <Badge tone={card.risk_level === "P0" ? "warn" : "blue"}>{card.risk_level}</Badge>
                </div>
                <p>{card.business_impact}</p>
                <div className="decisionInboxMeta">
                  <span>{humanizeOperationalLabel(card.approval_status)}</span>
                  <span>{humanizeOperationalLabel(card.execution_status)}</span>
                  <span>{card.sla_due_at || "SLA 待定"}</span>
                </div>
                <div className="decisionInboxActions">
                  {isRejected ? (
                    <button className="secondaryAction" onClick={() => onViewChange("audit")}>查看记录</button>
                  ) : (
                    <button disabled={Boolean(busy)} onClick={() => canConvert ? onConvert(card) : onReview(card, "approved")}>
                      {canConvert ? "转行动任务" : "批准建议"}
                    </button>
                  )}
                  <button className="secondaryAction" onClick={() => onViewChange("audit")}>证据链</button>
                </div>
              </article>
            );
          }) : <p className="ledgerEmpty">暂无待复核建议</p>}
        </section>

        <section className="decisionInboxQueue">
          <div className="object360ListHead">
            <strong>高优先级场景</strong>
            <button className="secondaryAction" onClick={() => onViewChange("scenarios")}>查看场景</button>
          </div>
          {highPriorityScenarios.length ? highPriorityScenarios.map((scenario) => (
            <article className="decisionInboxCard compact" key={scenario.id}>
              <div className="decisionInboxCardHead">
                <div>
                  <span>{scenario.scenario_type} · {scenario.owner}</span>
                  <strong>{scenario.name}</strong>
                </div>
                <Badge tone={scenario.priority === "P0" ? "warn" : "blue"}>{scenario.priority}</Badge>
              </div>
              <p>{scenario.diagnostic_question}</p>
              <div className="decisionInboxActions">
                <button disabled={Boolean(busy)} onClick={() => onRunScenario(scenario)}>
                  {busy === scenario.id ? "诊断中..." : "本地诊断"}
                </button>
                <button className="secondaryAction" onClick={() => onViewChange("governance")}>治理边界</button>
              </div>
            </article>
          )) : <p className="ledgerEmpty">暂无 P0/P1 场景</p>}
          <div className="decisionInboxMiniList">
            <button className="secondaryAction" onClick={onCreateScenarioRun} disabled={Boolean(busy)}>
              {busy === "run" ? "创建中..." : "创建运行记录"}
            </button>
            <button className="secondaryAction" onClick={() => onViewChange("governance")}>查看治理视图</button>
          </div>
        </section>

        <section className="decisionInboxQueue">
          <div className="object360ListHead">
            <strong>最近回执与证据链</strong>
            <button className="secondaryAction" onClick={() => onViewChange("audit")}>打开审计</button>
          </div>
          <div className="decisionInboxMiniList">
            {latestReceipts.length ? latestReceipts.map((receipt) => (
              <div key={String(receipt.id)}>
                <span>{humanizeOperationalLabel(String(receipt.status || ""))}</span>
                <strong>{String(receipt.insight_title || receipt.id || "")}</strong>
                <small>{String(receipt.review_note || "")}</small>
              </div>
            )) : <p className="ledgerEmpty">暂无阶段回执</p>}
          </div>
          <div className="decisionInboxMiniList">
            {latestTraces.length ? latestTraces.map((trace) => (
              <div key={trace.id}>
                <span>{trace.source_type} · {humanizeOperationalLabel(trace.answerability)}</span>
                <strong>{trace.question}</strong>
                <small>{humanizeBoundary(trace.policy)}</small>
              </div>
            )) : <p className="ledgerEmpty">暂无证据链</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function RecommendationWorkflowReceipt({
  card,
  actionTask,
  busy,
  onApprove,
  onConvert
}: {
  card: RecommendationCard | null;
  actionTask: AnyRow | null;
  busy: string;
  onApprove: (card: RecommendationCard) => void;
  onConvert: (card: RecommendationCard) => void;
}) {
  if (!card) return null;
  const canConvert = ["approved", "reviewed"].includes(card.approval_status);
  return (
    <div className="workflowReceipt">
      <div>
        <p className="eyebrow">Recommendation Workflow Receipt</p>
        <h3>推荐闭环回执</h3>
        <p>{card.title}</p>
      </div>
      <div className="receiptGrid">
        <div>
          <span>建议卡</span>
          <strong>{card.id}</strong>
          <small>{humanizeOperationalLabel(card.approval_status)}</small>
        </div>
        <div>
          <span>执行状态</span>
          <strong>{humanizeOperationalLabel(card.execution_status)}</strong>
          <small>{card.owner}</small>
        </div>
        <div>
          <span>行动任务</span>
          <strong>{actionTask?.id ? String(actionTask.id) : "未创建"}</strong>
          <small>{actionTask ? "行动任务已创建" : "待转为行动任务"}</small>
        </div>
      </div>
      <div className="recommendationActions">
        <button disabled={Boolean(busy)} onClick={() => onApprove(card)}>批准最近建议卡</button>
        <button disabled={Boolean(busy) || !canConvert} onClick={() => onConvert(card)}>转最近 Action Task</button>
      </div>
    </div>
  );
}

export function DecisionRunsPanel({
  runs,
  recommendations,
  workflowCard,
  workflowActionTask,
  busy,
  onCreateScenarioRun,
  onCreateRecommendation,
  onReviewRecommendation,
  onConvertRecommendation,
  onExport
}: {
  runs: AgentRun[];
  recommendations: RecommendationCard[];
  workflowCard: RecommendationCard | null;
  workflowActionTask: AnyRow | null;
  busy: string;
  onCreateScenarioRun: () => void;
  onCreateRecommendation: () => void;
  onReviewRecommendation: (card: RecommendationCard, status: string) => void;
  onConvertRecommendation: (card: RecommendationCard) => void;
  onExport: (assetType: string, format: ExportFormat, filters: Record<string, unknown>) => Promise<ExportJob>;
}) {
  return (
    <>
      <div className="surface decisionHero">
        <div className="surfaceHead">
          <div>
            <p className="eyebrow">Agent run control plane</p>
            <h3>运行记录控制面</h3>
            <p>把问题、对象、指标、知识证据、推荐卡和行动任务串成一次可复盘的治理运行。</p>
          </div>
          <div className="inlineActions">
            <button onClick={onCreateScenarioRun} disabled={Boolean(busy)}>
              {busy === "run" ? "创建中..." : "创建场景运行记录"}
            </button>
            <ExportButton assetType="agent_runs" onExport={onExport} />
          </div>
        </div>
        <AgentRunList runs={runs} title="运行台账" />
      </div>

      <div className="surface decisionHero">
        <div className="surfaceHead">
          <div>
            <p className="eyebrow">Recommendation card ledger</p>
            <h3>推荐动作卡</h3>
            <p>把 ChatBI、对象图谱和知识库证据形成可审批、可转任务、可复盘的建议卡；当前只写本地 SQLite 台账。</p>
          </div>
          <div className="inlineActions">
            <button onClick={onCreateRecommendation} disabled={Boolean(busy)}>
              {busy === "create" ? "创建中..." : "创建异常诊断卡"}
            </button>
          </div>
        </div>
        <RecommendationWorkflowReceipt
          card={workflowCard}
          actionTask={workflowActionTask}
          busy={busy}
          onApprove={(card) => onReviewRecommendation(card, "approved")}
          onConvert={onConvertRecommendation}
        />
        <RecommendationCardList
          cards={recommendations}
          onReview={onReviewRecommendation}
          onConvert={onConvertRecommendation}
          busy={busy}
        />
      </div>
    </>
  );
}

export function DecisionAuditPanel({
  decisions,
  actions,
  traces,
  traceReviews,
  traceReviewReceipt,
  busy,
  onReviewTrace
}: {
  decisions: AnyRow[];
  actions: AnyRow[];
  traces: AgentTrace[];
  traceReviews: TraceReview[];
  traceReviewReceipt: TraceReview | null;
  busy: string;
  onReviewTrace: (trace: AgentTrace, status: string) => void;
}) {
  return (
    <>
      <div className="split decisionSplit">
        <div className="surface">
          <div className="surfaceHead">
            <h3>洞察记录</h3>
            <Badge>{decisions.length} 条记录</Badge>
          </div>
          <DataTable rows={decisions} columns={["id", "insight_title", "linked_metric_id", "recommendation", "status", "review_note"]} />
        </div>
        <div className="surface">
          <div className="surfaceHead">
            <h3>Action 任务</h3>
            <Badge>{actions.length} 个任务</Badge>
          </div>
          <DataTable rows={actions} columns={["id", "insight_ref", "action_name", "owner", "status", "approval_required", "replay_note"]} />
        </div>
      </div>

      <div className="surface decisionTraceSurface">
        <div className="surfaceHead">
          <div>
            <h3>智能体证据链审计台账</h3>
            <p>记录 AI 对话与 ChatBI 试运行的意图、命中对象、命中指标、证据链和拒答边界。</p>
          </div>
          <Badge>{traces.length} 条证据链</Badge>
        </div>
        <div className="decisionTraceGrid">
          <AgentTracePanel trace={traces[0]} title="最近一次智能体证据链" />
          <DataTable rows={traces} columns={["id", "source_type", "question", "intent", "answerability", "policy", "created_at"]} />
        </div>
      </div>

      <TraceReviewBoard
        traces={traces}
        reviews={traceReviews}
        receipt={traceReviewReceipt}
        busy={busy}
        onReview={onReviewTrace}
      />
    </>
  );
}

export function OwnerDecisionPacketPanel({
  packets,
  busy,
  receipt,
  onRecord
}: {
  packets: OwnerDecisionPacket[];
  busy: string;
  receipt: AnyRow | null;
  onRecord: (packet: OwnerDecisionPacket, choice: OwnerDecisionChoice) => void;
}) {
  return (
    <div className="surface ownerDecisionPanel">
      <div className="surfaceHead">
        <div>
          <p className="eyebrow">Owner Decision Packet</p>
          <h3>人工复核与阶段决策</h3>
          <p>把阈值、源系统证据、财务成本、促销输入和采购生命周期纳入工作台治理记录；只写入本地决策台账。</p>
        </div>
        <Badge tone="warn">人工复核 / 本地台账</Badge>
      </div>
      <div className="decisionPacketGrid">
        {packets.map((packet) => (
          <article className="decisionPacketCard" key={packet.id}>
            <div className="decisionPacketHead">
              <div>
                <span>{packet.id} · {packet.owner}</span>
                <strong>{packet.title}</strong>
              </div>
              <Badge>{packet.linkedMetricId}</Badge>
            </div>
            <p>{packet.recommendation}</p>
            <div className="decisionChoiceGrid">
              {packet.choices.map((choice) => (
                <button
                  key={`${packet.id}-${choice.code}`}
                  disabled={Boolean(busy)}
                  onClick={() => onRecord(packet, choice)}
                >
                  <span>{choice.code}</span>
                  <strong>{choice.label}</strong>
                </button>
              ))}
            </div>
            <small>{humanizeBoundary(packet.actionBoundary)}</small>
          </article>
        ))}
      </div>
      {receipt ? (
        <div className="workflowReceipt decisionReceipt">
          <div>
            <p className="eyebrow">Manual Review Receipt</p>
            <h3>最近人工决策已记录</h3>
            <p>{String(receipt.insight_title || "")}</p>
          </div>
          <div className="receiptGrid">
            <div>
              <span>决策</span>
              <strong>{String(receipt.id || "")}</strong>
              <small>{humanizeOperationalLabel(receipt.status)}</small>
            </div>
            <div>
              <span>边界</span>
              <strong>{humanizeBoundary(receipt.action_boundary)}</strong>
              <small>仅本地台账</small>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
