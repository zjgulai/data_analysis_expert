import {
  Badge,
  RefPills,
  humanizeBoundary,
  humanizeOperationalLabel,
  sourceEvidenceTone,
  toneFromStatus,
  type AnyRow
} from "../shared/ui";

export type SourceCoverage = AnyRow & {
  id: string;
  source_system: string;
  source_surface: string;
  field_class: string;
  target_object_type: string;
  target_property: string;
  grain: string;
  evidence_level: string;
  scenarioRefs?: string[];
  gateIds?: string[];
  runtime_status: string;
  owner_gate_status: string;
};

export type AgentTraceStep = {
  step: string;
  status: string;
  summary: string;
};

export type AgentTrace = AnyRow & {
  id: string;
  source_type: string;
  source_id: string;
  question: string;
  intent: string;
  answerability: string;
  policy: string;
  recommendation_ref: string;
  created_at: string;
  matchedObjects: string[];
  matchedMetrics: string[];
  matchedKnowledgeCards: string[];
  matchedLineageEdges: string[];
  publicSteps: AgentTraceStep[];
};

export type RecommendationCard = AnyRow & {
  id: string;
  scenario: string;
  title: string;
  target_object_type: string;
  target_object_id: string;
  business_impact: string;
  confidence_level: string;
  risk_level: string;
  owner: string;
  sla_due_at: string;
  approval_status: string;
  execution_status: string;
  trace_id: string;
  replay_note: string;
  updated_at: string;
  linkedMetricIds: string[];
  linkedKnowledgeCardIds: string[];
  actionOptions: string[];
};

export type AgentRun = AnyRow & {
  id: string;
  scenario: string;
  run_type: string;
  target_object_type: string;
  target_object_id: string;
  question: string;
  intent: string;
  status: string;
  owner: string;
  started_at: string;
  completed_at: string;
  decision_boundary: string;
  replay_note: string;
  inputRefs: string[];
  outputRefs: string[];
  traceIds: string[];
  recommendationCardIds: string[];
  actionTaskIds: string[];
  publicSteps: AgentTraceStep[];
};

export function AgentTraceList({ traces }: { traces: AgentTrace[] }) {
  return (
    <div className="object360List traceList">
      <div className="object360ListHead">
        <strong>关联证据链</strong>
        <Badge>{traces.length}</Badge>
      </div>
      {traces.length ? traces.slice(0, 5).map((trace) => (
        <article className="miniTrace" key={trace.id}>
          <div>
            <span>{trace.source_type} · {trace.intent}</span>
            <strong>{trace.question}</strong>
          </div>
          <Badge tone={trace.answerability.startsWith("answerable") ? "blue" : "warn"}>{humanizeOperationalLabel(trace.answerability)}</Badge>
        </article>
      )) : <p className="ledgerEmpty">暂无关联证据链</p>}
    </div>
  );
}

export function AgentRunList({
  runs,
  title = "运行记录",
  limit = 6
}: {
  runs: AgentRun[];
  title?: string;
  limit?: number;
}) {
  return (
    <div className="runTraceBlock">
      <div className="object360ListHead">
        <strong>{title}</strong>
        <Badge>{runs.length}</Badge>
      </div>
      <div className="runTraceGrid">
        {runs.length ? runs.slice(0, limit).map((run) => (
          <article className="runTraceCard" key={run.id}>
            <div className="runTraceHead">
              <div>
                <span>{run.run_type} · {run.target_object_type}/{run.target_object_id}</span>
                <strong>{run.scenario}</strong>
              </div>
              <Badge tone={run.status === "completed" ? "blue" : toneFromStatus(run.status)}>{humanizeOperationalLabel(run.status)}</Badge>
            </div>
            <p>{run.question}</p>
            <div className="traceMeta compact">
              <div>
                <span>意图</span>
                <strong>{run.intent}</strong>
              </div>
              <div>
                <span>责任人</span>
                <strong>{run.owner}</strong>
              </div>
              <div>
                <span>边界</span>
                <strong>{humanizeBoundary(run.decision_boundary)}</strong>
              </div>
            </div>
            <div className="traceRefs">
              <RefPills label="Input" refs={run.inputRefs || []} />
              <RefPills label="Output" refs={run.outputRefs || []} />
              <RefPills label="证据链" refs={run.traceIds || []} />
            </div>
            {run.publicSteps?.length ? (
              <div className="miniStepList">
                {run.publicSteps.slice(0, 4).map((step, index) => (
                  <span key={`${run.id}-${step.step}-${index}`}>{index + 1}. {step.step}: {humanizeOperationalLabel(step.status)}</span>
                ))}
              </div>
            ) : null}
            <small>{run.replay_note}</small>
          </article>
        )) : <p className="ledgerEmpty">暂无运行记录</p>}
      </div>
    </div>
  );
}

export function RecommendationCardList({
  cards,
  onReview,
  onConvert,
  busy = ""
}: {
  cards: RecommendationCard[];
  onReview?: (card: RecommendationCard, status: string) => void;
  onConvert?: (card: RecommendationCard) => void;
  busy?: string;
}) {
  return (
    <div className="recommendationGrid">
      {cards.length ? cards.map((card) => (
        <article className="recommendationCard" key={card.id}>
          <div className="recommendationHead">
            <div>
              <span>{card.scenario} · {card.target_object_type}/{card.target_object_id}</span>
              <strong>{card.title}</strong>
            </div>
            <Badge tone={card.risk_level === "P0" ? "warn" : "blue"}>{card.risk_level}</Badge>
          </div>
          <p>{card.business_impact}</p>
          <div className="recommendationMeta">
            <span>责任人: {card.owner}</span>
            <span>SLA: {card.sla_due_at || "未设置"}</span>
            <span>置信度: {humanizeOperationalLabel(card.confidence_level)}</span>
          </div>
          <div className="recommendationStates">
            <Badge tone={toneFromStatus(card.approval_status)}>{humanizeOperationalLabel(card.approval_status)}</Badge>
            <Badge>{humanizeOperationalLabel(card.execution_status)}</Badge>
          </div>
          <RefPills label="Metric" refs={card.linkedMetricIds || []} />
          {card.actionOptions?.length ? (
            <div className="actionOptionList">
              {card.actionOptions.slice(0, 4).map((option) => <span key={option}>{option}</span>)}
            </div>
          ) : null}
          {onReview || onConvert ? (
            <div className="recommendationActions">
              {onReview ? (
                <>
                  <button disabled={Boolean(busy)} onClick={() => onReview(card, "reviewed")}>标记已复核</button>
                  <button disabled={Boolean(busy)} onClick={() => onReview(card, "approved")}>批准</button>
                  <button disabled={Boolean(busy)} onClick={() => onReview(card, "rejected")}>拒绝</button>
                </>
              ) : null}
              {onConvert ? (
                <button disabled={Boolean(busy) || !["approved", "reviewed"].includes(card.approval_status)} onClick={() => onConvert(card)}>
                  转行动任务
                </button>
              ) : null}
            </div>
          ) : null}
          <small>{card.replay_note}</small>
        </article>
      )) : <p className="ledgerEmpty">暂无推荐动作卡</p>}
    </div>
  );
}

export function SourceCoverageList({
  title,
  coverage,
  empty = "暂无 source coverage"
}: {
  title: string;
  coverage: SourceCoverage[];
  empty?: string;
}) {
  return (
    <div className="sourceCoverageList">
      <div className="object360ListHead">
        <strong>{title}</strong>
        <Badge>{coverage.length}</Badge>
      </div>
      {coverage.length ? coverage.slice(0, 6).map((item) => (
        <article className="sourceCoverageCard" key={item.id}>
          <div className="sourceCoverageHead">
            <div>
              <span>{item.source_system} · {item.source_surface}</span>
              <strong>{item.field_class}</strong>
            </div>
            <Badge tone={sourceEvidenceTone(item.evidence_level)}>{humanizeOperationalLabel(item.evidence_level)}</Badge>
          </div>
          <p>{item.target_object_type} · {item.grain}</p>
          <small>{humanizeOperationalLabel(item.runtime_status)} · {humanizeOperationalLabel(item.owner_gate_status)}</small>
          <RefPills label="Gate" refs={item.gateIds || []} />
        </article>
      )) : <p className="ledgerEmpty">{empty}</p>}
    </div>
  );
}
