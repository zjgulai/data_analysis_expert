import {
  Badge,
  RefPills,
  cellValue,
  columnLabels,
  rowKey,
  type AnyRow
} from "../shared/ui";

type LedgerRecord = {
  id: string;
  body?: string;
  title?: string;
  proposal?: string;
  author?: string;
  proposed_by?: string;
  actor?: string;
  event_type?: string;
  status?: string;
  created_at: string;
};

type DetailEvidence = {
  chunk_id: string;
  card_id: string;
  title: string;
  topic: string;
  source_path: string;
  text: string;
  score: number;
  domain_name: string;
  evidencePolicy: string;
  objectRefs: string[];
  metricRefs: string[];
  ruleRefs: string[];
};

export function Object360List({ title, rows, columns }: { title: string; rows: AnyRow[]; columns: string[] }) {
  return (
    <div className="object360List">
      <div className="object360ListHead">
        <strong>{title}</strong>
        <Badge>{rows.length}</Badge>
      </div>
      {rows.length ? rows.slice(0, 5).map((row, index) => (
        <div className="object360Row" key={rowKey(row, index)}>
          {columns.map((column) => (
            <p key={column}>
              <span>{columnLabels[column] || column}</span>
              <strong>{cellValue(row[column])}</strong>
            </p>
          ))}
        </div>
      )) : <p className="ledgerEmpty">暂无关联</p>}
    </div>
  );
}

export function LedgerList({ title, records }: { title: string; records: LedgerRecord[] }) {
  return (
    <div className="ledgerList">
      <div className="ledgerTitle">
        <strong>{title}</strong>
        <Badge>{records.length}</Badge>
      </div>
      {records.length ? records.slice(0, 5).map((record) => (
        <div className="ledgerItem" key={record.id}>
          <p>{record.body || record.proposal || record.title || record.event_type || "记录"}</p>
          <span>{record.author || record.proposed_by || record.actor || "system"} · {record.status || "logged"} · {record.created_at}</span>
        </div>
      )) : <p className="ledgerEmpty">暂无记录</p>}
    </div>
  );
}

export function EvidenceList({
  evidence,
  empty = "暂无命中证据",
  onOpenCard
}: {
  evidence: DetailEvidence[];
  empty?: string;
  onOpenCard?: (cardId: string, title: string) => void;
}) {
  if (!evidence.length) return <div className="empty">{empty}</div>;
  return (
    <div className="evidenceList">
      {evidence.map((item, index) => (
        <article className="evidenceCard" key={`${item.chunk_id}-${index}`}>
          <div className="evidenceCardHead">
            <div>
              <p className="eyebrow">{item.domain_name} / {item.topic}</p>
              <h3>{item.title}</h3>
            </div>
            <Badge tone={item.evidencePolicy === "usable_as_local_evidence" ? "blue" : "warn"}>
              {item.evidencePolicy}
            </Badge>
          </div>
          <p>{item.text}</p>
          <div className="evidenceMeta">
            <span>score {item.score}</span>
            <span>{item.source_path}</span>
          </div>
          <RefPills label="Object" refs={item.objectRefs} />
          <RefPills label="Metric" refs={item.metricRefs} />
          <RefPills label="Rule" refs={item.ruleRefs} />
          {onOpenCard ? (
            <div className="evidenceActions">
              <button onClick={() => onOpenCard(item.card_id, item.title)}>打开知识卡</button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
