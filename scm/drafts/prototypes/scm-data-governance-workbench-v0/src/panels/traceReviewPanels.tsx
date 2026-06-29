import { useMemo } from "react";
import type { AgentTrace } from "./agentActivityLists";
import {
  Badge,
  DataTable,
  RefPills,
  humanizeBoundary,
  humanizeOperationalLabel,
  type AnyRow
} from "../shared/ui";

export type { AgentTrace, AgentTraceStep } from "./agentActivityLists";

export type TraceReview = AnyRow & {
  id: string;
  trace_id: string;
  source_type: string;
  intent: string;
  answerability: string;
  review_status: string;
  reviewer: string;
  review_note: string;
  decision_boundary: string;
  action_ref: string;
  created_at: string;
  updated_at: string;
};

export function AgentTracePanel({
  trace,
  title = "Agent Execution Trace"
}: {
  trace?: AgentTrace | null;
  title?: string;
}) {
  if (!trace) return null;
  return (
    <section className="tracePanel">
      <div className="object360Head">
        <div>
          <p className="eyebrow">AIP trace</p>
          <h3>{title}</h3>
        </div>
        <Badge tone={trace.answerability.startsWith("answerable") ? "blue" : "warn"}>
          {humanizeOperationalLabel(trace.answerability)}
        </Badge>
      </div>
      <div className="traceMeta">
        <div>
          <span>意图</span>
          <strong>{trace.intent}</strong>
        </div>
        <div>
          <span>策略</span>
          <strong>{humanizeBoundary(trace.policy)}</strong>
        </div>
        <div>
          <span>证据链 ID</span>
          <strong>{trace.id}</strong>
        </div>
      </div>
      <div className="traceSteps">
        {trace.publicSteps?.map((step, index) => (
          <article className="traceStep" key={`${trace.id}-${step.step}-${index}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{step.step}</strong>
              <p>{step.summary}</p>
            </div>
            <Badge tone={step.status === "completed" ? "blue" : "warn"}>
              {humanizeOperationalLabel(step.status)}
            </Badge>
          </article>
        ))}
      </div>
      <div className="traceRefs">
        <RefPills label="Object" refs={trace.matchedObjects || []} />
        <RefPills label="Metric" refs={trace.matchedMetrics || []} />
        <RefPills label="Knowledge" refs={trace.matchedKnowledgeCards || []} />
      </div>
    </section>
  );
}

function TraceReviewSummary({
  reviewedCount,
  reviewQueueCount
}: {
  reviewedCount: number;
  reviewQueueCount: number;
}) {
  return (
    <div className="traceReviewSummary">
      <Badge tone="blue">{reviewedCount} 已复核</Badge>
      <Badge tone={reviewQueueCount ? "warn" : "neutral"}>{reviewQueueCount} 等待复核</Badge>
    </div>
  );
}

function TraceReviewReceipt({ receipt }: { receipt?: TraceReview | null }) {
  if (!receipt) return null;
  return (
    <div className="decisionReceipt traceReviewReceipt">
      <span>证据链复盘回执</span>
      <strong>{receipt.trace_id}</strong>
      <p>{humanizeOperationalLabel(receipt.review_status)} · {receipt.review_note}</p>
    </div>
  );
}

function TraceReviewActionCard({
  trace,
  latest,
  busy,
  onReview
}: {
  trace: AgentTrace;
  latest?: TraceReview;
  busy: string;
  onReview: (trace: AgentTrace, status: string) => void;
}) {
  return (
    <article className="traceReviewCard">
      <div className="runTraceHead">
        <div>
          <span>{trace.source_type} · {trace.intent}</span>
          <strong>{trace.question}</strong>
        </div>
        <Badge tone={latest ? "blue" : "warn"}>
          {humanizeOperationalLabel(latest?.review_status || "review_pending")}
        </Badge>
      </div>
      <p>{trace.policy}</p>
      <div className="traceRefs">
        <RefPills label="Object" refs={trace.matchedObjects || []} />
        <RefPills label="Metric" refs={trace.matchedMetrics || []} />
        <RefPills label="Knowledge" refs={trace.matchedKnowledgeCards || []} />
      </div>
      <div className="traceReviewActions">
        <button onClick={() => onReview(trace, "reviewed")} disabled={Boolean(busy)}>
          {busy === `${trace.id}-reviewed` ? "记录中..." : "标记已复核"}
        </button>
        <button onClick={() => onReview(trace, "approved_for_governance_view")} disabled={Boolean(busy)}>
          {busy === `${trace.id}-approved_for_governance_view` ? "记录中..." : "批准证据链治理视图"}
        </button>
        <button onClick={() => onReview(trace, "needs_follow_up")} disabled={Boolean(busy)}>
          {busy === `${trace.id}-needs_follow_up` ? "记录中..." : "需要补证据"}
        </button>
      </div>
      {latest ? <small>{latest.reviewer} · {latest.updated_at}</small> : <small>等待人工复核</small>}
    </article>
  );
}

function TraceReviewActionGrid({
  traces,
  latestReviewByTrace,
  busy,
  onReview
}: {
  traces: AgentTrace[];
  latestReviewByTrace: Map<string, TraceReview>;
  busy: string;
  onReview: (trace: AgentTrace, status: string) => void;
}) {
  const reviewable = traces.slice(0, 6);
  return (
    <div className="traceReviewGrid">
      {reviewable.length ? reviewable.map((trace) => (
        <TraceReviewActionCard
          key={trace.id}
          trace={trace}
          latest={latestReviewByTrace.get(trace.id)}
          busy={busy}
          onReview={onReview}
        />
      )) : <p className="ledgerEmpty">暂无可复核证据链</p>}
    </div>
  );
}

function TraceReviewHistoryTable({ reviews }: { reviews: TraceReview[] }) {
  return (
    <DataTable rows={reviews} columns={["id", "trace_id", "review_status", "reviewer", "review_note", "decision_boundary", "updated_at"]} />
  );
}

export function TraceReviewBoard({
  traces,
  reviews,
  receipt,
  busy,
  onReview
}: {
  traces: AgentTrace[];
  reviews: TraceReview[];
  receipt?: TraceReview | null;
  busy: string;
  onReview: (trace: AgentTrace, status: string) => void;
}) {
  const latestReviewByTrace = useMemo(() => {
    const map = new Map<string, TraceReview>();
    reviews.forEach((review) => {
      if (!map.has(review.trace_id)) map.set(review.trace_id, review);
    });
    return map;
  }, [reviews]);
  const reviewedCount = traces.filter((trace) => latestReviewByTrace.has(trace.id)).length;
  const reviewQueueCount = Math.max(0, traces.length - reviewedCount);

  return (
    <div className="surface traceReviewBoard">
      <div className="surfaceHead">
        <div>
          <p className="eyebrow">Trace Review Governance</p>
          <h3>证据链复盘工作台</h3>
          <p>把 AI 对话、ChatBI dry-run 和场景诊断证据链纳入人工复盘；只写本地治理台账，不调用外部模型，不回写 ERP/WMS/OMS。</p>
        </div>
        <TraceReviewSummary reviewedCount={reviewedCount} reviewQueueCount={reviewQueueCount} />
      </div>

      <TraceReviewReceipt receipt={receipt} />
      <TraceReviewActionGrid
        traces={traces}
        latestReviewByTrace={latestReviewByTrace}
        busy={busy}
        onReview={onReview}
      />
      <TraceReviewHistoryTable reviews={reviews} />
    </div>
  );
}
