import {
  Badge,
  RefPills,
  cellValue,
  type AnyRow
} from "../shared/ui";

type KnowledgeCardDetail = AnyRow & {
  domain?: { name?: string };
  domain_id?: string;
  topic: string;
  source_path: string;
  summary: string;
  status: string;
  evidence_level: string;
  chunks: AnyRow[];
  crosswalks: AnyRow[];
};

type KnowledgeSupportItem = AnyRow & {
  crosswalk_id: string;
  card_id: string;
  title: string;
  topic: string;
  summary: string;
  source_path: string;
  relation_type: string;
  confidence: number;
  domain_name: string;
  evidencePolicy: string;
  objectRefs: string[];
  metricRefs: string[];
};

type KnowledgeSupportPayload = {
  matchedTargetIds: string[];
  count: number;
  supports: KnowledgeSupportItem[];
  policy: string;
  doesNotProve: string[];
};

export function KnowledgeCardDetailSection({
  card,
  onOpenLinkedAsset
}: {
  card: KnowledgeCardDetail;
  onOpenLinkedAsset?: (targetType: string, targetId: string) => void;
}) {
  function openCrosswalk(row: AnyRow) {
    const targetType = String(row.target_type || "");
    const targetId = String(row.target_id || "");
    if (!targetId || !onOpenLinkedAsset) return;
    if (targetType === "object") onOpenLinkedAsset("ontology_object", targetId);
    if (targetType === "metric") onOpenLinkedAsset("metric", targetId);
  }

  return (
    <section className="drawerSection knowledgeDetailSection">
      <div className="object360Head">
        <div>
          <p className="eyebrow">Knowledge card</p>
          <h3>证据与关系</h3>
        </div>
        <Badge tone={card.status === "active" ? "blue" : "warn"}>{card.evidence_level}</Badge>
      </div>
      <div className="knowledgeSourceBox">
        <div>
          <span>知识库</span>
          <strong>{card.domain?.name || card.domain_id}</strong>
        </div>
        <div>
          <span>主题</span>
          <strong>{card.topic}</strong>
        </div>
        <div>
          <span>来源</span>
          <strong>{card.source_path}</strong>
        </div>
      </div>
      <div className="knowledgeSummary">
        <strong>摘要</strong>
        <p>{card.summary}</p>
      </div>
      <div className="knowledgeDrawerGrid">
        <div className="knowledgeDrawerBlock">
          <div className="object360ListHead">
            <strong>证据块</strong>
            <Badge>{card.chunks.length}</Badge>
          </div>
          {card.chunks.length ? card.chunks.map((chunk) => (
            <article className="chunkItem" key={String(chunk.id)}>
              <span>#{cellValue(chunk.chunk_index)} · {cellValue(chunk.evidence_level)}</span>
              <p>{cellValue(chunk.text)}</p>
              <small>{cellValue(chunk.keywords)}</small>
            </article>
          )) : <p className="ledgerEmpty">暂无证据块</p>}
        </div>
        <div className="knowledgeDrawerBlock">
          <div className="object360ListHead">
            <strong>Crosswalk</strong>
            <Badge>{card.crosswalks.length}</Badge>
          </div>
          {card.crosswalks.length ? card.crosswalks.slice(0, 24).map((row) => (
            <article className="crosswalkItem" key={String(row.id)}>
              <div>
                <span>{cellValue(row.target_type)}</span>
                <strong>{cellValue(row.target_id)}</strong>
              </div>
              <p>{cellValue(row.relation_type)} · confidence {cellValue(row.confidence)}</p>
              <small>{cellValue(row.note)}</small>
              <button onClick={() => openCrosswalk(row)}>
                {row.target_type === "object" ? "打开对象" : "打开指标"}
              </button>
            </article>
          )) : <p className="ledgerEmpty">暂无 crosswalk</p>}
        </div>
      </div>
    </section>
  );
}

export function KnowledgeSupportSection({
  support,
  onOpenLinkedAsset
}: {
  support: KnowledgeSupportPayload;
  onOpenLinkedAsset?: (targetType: string, targetId: string) => void;
}) {
  return (
    <section className="drawerSection knowledgeSupportSection">
      <div className="object360Head">
        <div>
          <p className="eyebrow">Knowledge support</p>
          <h3>支持该资产的知识卡</h3>
        </div>
        <Badge tone={support.count ? "blue" : "neutral"}>{support.count} cards</Badge>
      </div>
      <div className="knowledgeSupportMeta">
        <div>
          <span>匹配目标</span>
          <strong>{support.matchedTargetIds.join(" / ")}</strong>
        </div>
        <div>
          <span>证据策略</span>
          <strong>{support.policy}</strong>
        </div>
      </div>
      {support.supports.length ? (
        <div className="supportCardGrid">
          {support.supports.slice(0, 12).map((item) => (
            <article className="supportCard" key={item.crosswalk_id}>
              <div className="supportCardHead">
                <div>
                  <span>{item.domain_name} / {item.topic}</span>
                  <strong>{item.title}</strong>
                </div>
                <Badge tone={item.evidencePolicy === "usable_as_local_evidence" ? "blue" : "warn"}>
                  {item.relation_type}
                </Badge>
              </div>
              <p>{item.summary}</p>
              <div className="supportMetaLine">
                <span>confidence {item.confidence}</span>
                <span>{item.source_path}</span>
              </div>
              <RefPills label="Object" refs={item.objectRefs} />
              <RefPills label="Metric" refs={item.metricRefs} />
              {onOpenLinkedAsset ? (
                <div className="evidenceActions">
                  <button onClick={() => onOpenLinkedAsset("knowledge_card", item.card_id)}>打开知识卡</button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : <p className="ledgerEmpty">当前对象/指标还没有本地知识卡支持证据。</p>}
      <div className="doesNotProve">
        {support.doesNotProve.map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}
