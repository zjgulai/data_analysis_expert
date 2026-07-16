-- Downgrade seed metrics whose P0 owner-signoff or field-mapping gates remain unresolved.
-- Boundary: deterministic local SQLite migration; no provider call, production write, or ERP/OMS/WMS writeback.
PRAGMA foreign_keys = ON;

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  boundary TEXT NOT NULL,
  rollback_script TEXT NOT NULL,
  verification_note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS migration_20260716_cert_metric_snapshot (
  migration_id TEXT NOT NULL,
  metric_id TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL,
  certification_status TEXT NOT NULL,
  PRIMARY KEY (migration_id, metric_id)
);

CREATE TABLE IF NOT EXISTS migration_20260716_cert_ledger_snapshot (
  migration_id TEXT NOT NULL,
  id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  asset_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  certified_by TEXT,
  evidence TEXT NOT NULL,
  PRIMARY KEY (migration_id, id)
);

CREATE TABLE IF NOT EXISTS migration_20260716_cert_chatbi_snapshot (
  migration_id TEXT NOT NULL,
  id TEXT NOT NULL,
  metric_id TEXT NOT NULL,
  question_sample TEXT NOT NULL,
  allowed_dimensions TEXT NOT NULL,
  evidence_chain TEXT NOT NULL,
  answer_policy TEXT NOT NULL,
  PRIMARY KEY (migration_id, id)
);

CREATE TABLE IF NOT EXISTS migration_20260716_cert_lineage_snapshot (
  migration_id TEXT NOT NULL,
  id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  confidence REAL,
  evidence TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (migration_id, id)
);

INSERT INTO migration_20260716_cert_metric_snapshot (
  migration_id, metric_id, lifecycle_status, certification_status
)
SELECT
  '20260716_certification_gate_remediation',
  m.id,
  m.lifecycle_status,
  m.certification_status
FROM metrics m
WHERE m.certification_status = 'certified'
  AND EXISTS (
    SELECT 1
    FROM governance_tasks g
    WHERE g.target_ref = m.id
      AND g.priority = 'P0'
      AND NOT (
        g.status IN ('certified', 'done')
        OR (g.task_type = 'owner_signoff' AND g.status = '已签字')
        OR (g.task_type = 'field_mapping' AND g.status = '已映射')
      )
  )
ON CONFLICT(migration_id, metric_id) DO NOTHING;

INSERT INTO migration_20260716_cert_ledger_snapshot (
  migration_id, id, asset_type, asset_ref, status, certified_by, evidence
)
SELECT
  '20260716_certification_gate_remediation',
  c.id,
  c.asset_type,
  c.asset_ref,
  c.status,
  c.certified_by,
  c.evidence
FROM certifications c
JOIN migration_20260716_cert_metric_snapshot s
  ON s.migration_id = '20260716_certification_gate_remediation'
  AND s.metric_id = c.asset_ref
WHERE c.asset_type = 'metric'
ON CONFLICT(migration_id, id) DO NOTHING;

INSERT INTO migration_20260716_cert_chatbi_snapshot (
  migration_id, id, metric_id, question_sample, allowed_dimensions, evidence_chain, answer_policy
)
SELECT
  '20260716_certification_gate_remediation',
  ctx.id,
  ctx.metric_id,
  ctx.question_sample,
  ctx.allowed_dimensions,
  ctx.evidence_chain,
  ctx.answer_policy
FROM chatbi_contexts ctx
JOIN migration_20260716_cert_metric_snapshot s
  ON s.migration_id = '20260716_certification_gate_remediation'
  AND s.metric_id = ctx.metric_id
WHERE 1 = 1
ON CONFLICT(migration_id, id) DO NOTHING;

INSERT INTO migration_20260716_cert_lineage_snapshot (
  migration_id, id, source_ref, target_ref, edge_type, confidence, evidence, status
)
SELECT
  '20260716_certification_gate_remediation',
  edge.id,
  edge.source_ref,
  edge.target_ref,
  edge.edge_type,
  edge.confidence,
  edge.evidence,
  edge.status
FROM lineage_edges edge
JOIN migration_20260716_cert_metric_snapshot s
  ON s.migration_id = '20260716_certification_gate_remediation'
  AND s.metric_id = edge.target_ref
WHERE 1 = 1
ON CONFLICT(migration_id, id) DO NOTHING;

UPDATE metrics
SET lifecycle_status = 'seed_only',
    certification_status = 'not_certified'
WHERE id IN (
  SELECT metric_id
  FROM migration_20260716_cert_metric_snapshot
  WHERE migration_id = '20260716_certification_gate_remediation'
);

UPDATE certifications
SET status = 'not_certified',
    certified_by = '',
    evidence = 'Certification seed retained, but P0 owner-signoff or field-mapping gates remain unresolved.'
WHERE id IN (
  SELECT id
  FROM migration_20260716_cert_ledger_snapshot
  WHERE migration_id = '20260716_certification_gate_remediation'
);

UPDATE lineage_edges
SET status = 'seed_only'
WHERE target_ref IN (
  SELECT metric_id
  FROM migration_20260716_cert_metric_snapshot
  WHERE migration_id = '20260716_certification_gate_remediation'
);

DELETE FROM chatbi_contexts
WHERE metric_id IN (
  SELECT metric_id
  FROM migration_20260716_cert_metric_snapshot
  WHERE migration_id = '20260716_certification_gate_remediation'
);

INSERT INTO schema_migrations (
  id, title, applied_at, boundary, rollback_script, verification_note
) VALUES (
  '20260716_certification_gate_remediation',
  'Certification gate remediation for unresolved P0 metrics',
  '2026-07-16T18:00:00+08:00',
  'local_sqlite_only_no_provider_no_production_no_erp_writeback',
  'migrations/20260716_certification_gate_remediation.rollback.sql',
  'Unresolved P0 metrics remain seed_only/not_certified and are excluded from certified ChatBI contexts.'
)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  applied_at = excluded.applied_at,
  boundary = excluded.boundary,
  rollback_script = excluded.rollback_script,
  verification_note = excluded.verification_note;

COMMIT;
