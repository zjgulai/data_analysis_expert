import type { ReactNode } from "react";
import { cellValue, columnLabels } from "../shared/ui";
import { LedgerList } from "./detailPrimitives";

type DetailEntry = [string, unknown];

type LedgerRecord = {
  id: string;
  body?: string;
  title?: string;
  proposal?: string;
  reason?: string;
  author?: string;
  proposed_by?: string;
  actor?: string;
  event_type?: string;
  status?: string;
  created_at: string;
};

type Ledger = {
  annotations: LedgerRecord[];
  comments: LedgerRecord[];
  revisionProposals: LedgerRecord[];
  auditEvents: LedgerRecord[];
};

export function DetailDrawerFrame({
  targetType,
  title,
  onClose,
  children
}: {
  targetType: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="drawerOverlay" onClick={onClose}>
      <aside className="detailDrawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawerHead">
          <div>
            <p className="eyebrow">{targetType}</p>
            <h2>{title}</h2>
          </div>
          <button className="ghostButton" onClick={onClose}>关闭</button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function AssetDetailSection({ entries }: { entries: DetailEntry[] }) {
  return (
    <section className="drawerSection">
      <h3>资产详情</h3>
      <div className="detailGrid">
        {entries.map(([key, value]) => (
          <div key={key}>
            <span>{columnLabels[key] || key}</span>
            <strong>{cellValue(value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LedgerWriteSection({
  annotation,
  comment,
  saving,
  onAnnotationChange,
  onCommentChange,
  onSubmitAnnotation,
  onSubmitComment
}: {
  annotation: string;
  comment: string;
  saving: string;
  onAnnotationChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onSubmitAnnotation: () => void;
  onSubmitComment: () => void;
}) {
  return (
    <section className="drawerSection">
      <h3>注解与评论</h3>
      <div className="ledgerForm">
        <textarea
          value={annotation}
          onChange={(event) => onAnnotationChange(event.target.value)}
          placeholder="写入治理注解，例如口径边界、样本异常或 owner 判断..."
        />
        <button disabled={!annotation.trim() || Boolean(saving)} onClick={onSubmitAnnotation}>
          {saving === "annotation" ? "保存中..." : "保存注解"}
        </button>
      </div>
      <div className="ledgerForm compact">
        <input
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          placeholder="补充评论或协作说明"
        />
        <button disabled={!comment.trim() || Boolean(saving)} onClick={onSubmitComment}>
          {saving === "comment" ? "保存中..." : "发表评论"}
        </button>
      </div>
    </section>
  );
}

export function RevisionProposalSection({
  revisionTitle,
  revisionProposal,
  saving,
  onRevisionTitleChange,
  onRevisionProposalChange,
  onSubmitRevision
}: {
  revisionTitle: string;
  revisionProposal: string;
  saving: string;
  onRevisionTitleChange: (value: string) => void;
  onRevisionProposalChange: (value: string) => void;
  onSubmitRevision: () => void;
}) {
  return (
    <section className="drawerSection">
      <h3>修订建议</h3>
      <div className="ledgerForm">
        <input
          value={revisionTitle}
          onChange={(event) => onRevisionTitleChange(event.target.value)}
          placeholder="修订标题"
        />
        <textarea
          value={revisionProposal}
          onChange={(event) => onRevisionProposalChange(event.target.value)}
          placeholder="描述建议修订内容、业务原因和期望 owner 复核点..."
        />
        <button disabled={!revisionProposal.trim() || Boolean(saving)} onClick={onSubmitRevision}>
          {saving === "revision" ? "提交中..." : "提交修订建议"}
        </button>
      </div>
    </section>
  );
}

export function LedgerHistorySection({ ledger }: { ledger: Ledger }) {
  return (
    <section className="drawerSection">
      <h3>治理台账</h3>
      <LedgerList title="注解" records={ledger.annotations} />
      <LedgerList title="评论" records={ledger.comments} />
      <LedgerList title="修订建议" records={ledger.revisionProposals} />
      <LedgerList title="审计事件" records={ledger.auditEvents} />
    </section>
  );
}
