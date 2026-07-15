import { useEffect, useState } from "react";
import type { AnyRow } from "../shared/ui";
import {
  AssetDetailSection,
  DetailDrawerFrame,
  LedgerHistorySection,
  LedgerWriteSection,
  RevisionProposalSection
} from "./detailDrawerSections";
import {
  KnowledgeCardDetailSection,
  KnowledgeSupportSection
} from "./knowledgeSections";
import {
  Object360Section,
  ObjectInstance360Section
} from "./object360Sections";

type WorkbenchApi = <T>(path: string, init?: RequestInit) => Promise<T>;
type Ledger = Parameters<typeof LedgerHistorySection>[0]["ledger"];
type Object360Payload = Parameters<typeof Object360Section>[0]["data"];
type ObjectInstance360Payload = Parameters<typeof ObjectInstance360Section>[0]["data"];
type KnowledgeCardDetailPayload = Parameters<typeof KnowledgeCardDetailSection>[0]["card"];
type KnowledgeSupportPayload = Parameters<typeof KnowledgeSupportSection>[0]["support"];

const emptyLedger: Ledger = {
  annotations: [],
  comments: [],
  revisionProposals: [],
  auditEvents: []
};

export type DetailDrawerProps = {
  row: AnyRow | null;
  targetType: string;
  targetId: string;
  onClose: () => void;
  onOpenLinkedAsset?: (targetType: string, targetId: string) => void;
  api: WorkbenchApi;
};

function DetailReadOnlySections({
  entries,
  object360,
  objectInstance360,
  knowledgeDetail,
  knowledgeSupport,
  onOpenLinkedAsset
}: {
  entries: Array<[string, unknown]>;
  object360: Object360Payload | null;
  objectInstance360: ObjectInstance360Payload | null;
  knowledgeDetail: KnowledgeCardDetailPayload | null;
  knowledgeSupport: KnowledgeSupportPayload | null;
  onOpenLinkedAsset?: (targetType: string, targetId: string) => void;
}) {
  return (
    <>
      <AssetDetailSection entries={entries} />
      {object360 && <Object360Section data={object360} />}
      {objectInstance360 && <ObjectInstance360Section data={objectInstance360} />}
      {knowledgeDetail && (
        <KnowledgeCardDetailSection
          card={knowledgeDetail}
          onOpenLinkedAsset={onOpenLinkedAsset}
        />
      )}
      {knowledgeSupport && (
        <KnowledgeSupportSection
          support={knowledgeSupport}
          onOpenLinkedAsset={onOpenLinkedAsset}
        />
      )}
    </>
  );
}

function DetailLedgerWriteBoundary({
  saving,
  onSubmit
}: {
  saving: string;
  onSubmit: (path: string, payload: Record<string, unknown>, clear: () => void, mode: string) => void;
}) {
  const [annotation, setAnnotation] = useState("");
  const [comment, setComment] = useState("");

  return (
    <LedgerWriteSection
      annotation={annotation}
      comment={comment}
      saving={saving}
      onAnnotationChange={setAnnotation}
      onCommentChange={setComment}
      onSubmitAnnotation={() => onSubmit("/api/annotations", { body: annotation }, () => setAnnotation(""), "annotation")}
      onSubmitComment={() => onSubmit("/api/comments", { body: comment }, () => setComment(""), "comment")}
    />
  );
}

function DetailRevisionProposalBoundary({
  saving,
  onSubmit
}: {
  saving: string;
  onSubmit: (path: string, payload: Record<string, unknown>, clear: () => void, mode: string) => void;
}) {
  const [revisionTitle, setRevisionTitle] = useState("");
  const [revisionProposal, setRevisionProposal] = useState("");

  return (
    <RevisionProposalSection
      revisionTitle={revisionTitle}
      revisionProposal={revisionProposal}
      saving={saving}
      onRevisionTitleChange={setRevisionTitle}
      onRevisionProposalChange={setRevisionProposal}
      onSubmitRevision={() =>
        onSubmit(
          "/api/revision-proposals",
          { title: revisionTitle || "修订建议", proposal: revisionProposal },
          () => {
            setRevisionTitle("");
            setRevisionProposal("");
          },
          "revision"
        )
      }
    />
  );
}

export function DetailDrawer({
  row,
  targetType,
  targetId,
  onClose,
  onOpenLinkedAsset,
  api
}: DetailDrawerProps) {
  const [ledger, setLedger] = useState<Ledger>(emptyLedger);
  const [saving, setSaving] = useState("");
  const [object360, setObject360] = useState<Object360Payload | null>(null);
  const [objectInstance360, setObjectInstance360] = useState<ObjectInstance360Payload | null>(null);
  const [assetDetail, setAssetDetail] = useState<AnyRow | null>(null);
  const [knowledgeDetail, setKnowledgeDetail] = useState<KnowledgeCardDetailPayload | null>(null);
  const [knowledgeSupport, setKnowledgeSupport] = useState<KnowledgeSupportPayload | null>(null);

  async function refreshLedger() {
    if (!targetId) return;
    setLedger(await api<Ledger>(`/api/ledger/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}`));
  }

  useEffect(() => {
    if (!row || !targetId) return;
    setAssetDetail(null);
    setKnowledgeDetail(null);
    setKnowledgeSupport(null);
    setObjectInstance360(null);
    refreshLedger().catch(() => setLedger(emptyLedger));
    if (targetType === "ontology_object") {
      api<Object360Payload>(`/api/ontology/object-360/${encodeURIComponent(targetId)}`)
        .then(setObject360)
        .catch(() => setObject360(null));
    } else {
      setObject360(null);
    }
    if (targetType === "object_instance") {
      api<ObjectInstance360Payload>(`/api/ontology/instances/${encodeURIComponent(targetId)}`)
        .then(setObjectInstance360)
        .catch(() => setObjectInstance360(null));
    }
    if (targetType === "metric") {
      api<AnyRow>(`/api/metrics/${encodeURIComponent(targetId)}`)
        .then(setAssetDetail)
        .catch(() => setAssetDetail(null));
    }
    if (targetType === "knowledge_card") {
      api<KnowledgeCardDetailPayload>(`/api/knowledge/cards/${encodeURIComponent(targetId)}`)
        .then(setKnowledgeDetail)
        .catch(() => setKnowledgeDetail(null));
    }
    if (targetType === "ontology_object" || targetType === "metric") {
      api<KnowledgeSupportPayload>(
        `/api/knowledge/support?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`
      )
        .then(setKnowledgeSupport)
        .catch(() => setKnowledgeSupport(null));
    }
  }, [row, targetType, targetId]);

  if (!row) return null;

  async function submit(path: string, payload: Record<string, unknown>, clear: () => void, mode: string) {
    setSaving(mode);
    try {
      const result = await api<{ ledger: Ledger }>(path, {
        method: "POST",
        body: JSON.stringify({ targetType, targetId, ...payload })
      });
      setLedger(result.ledger);
      clear();
    } finally {
      setSaving("");
    }
  }

  const displayRow = assetDetail || row;
  const title = String(displayRow.name || displayRow.title || displayRow.code || displayRow.id || targetId);
  const entries = Object.entries(displayRow).filter(([, value]) => value !== null && value !== "");

  return (
    <DetailDrawerFrame targetType={targetType} title={title} onClose={onClose}>
      <DetailReadOnlySections
        entries={entries}
        object360={object360}
        objectInstance360={objectInstance360}
        knowledgeDetail={knowledgeDetail}
        knowledgeSupport={knowledgeSupport}
        onOpenLinkedAsset={onOpenLinkedAsset}
      />
      <DetailLedgerWriteBoundary saving={saving} onSubmit={submit} />
      <DetailRevisionProposalBoundary saving={saving} onSubmit={submit} />
      <LedgerHistorySection ledger={ledger} />
    </DetailDrawerFrame>
  );
}
