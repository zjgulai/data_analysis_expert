-- Separate governance subject/policy references from metric identifiers in decision_logs.
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

CREATE TABLE IF NOT EXISTS decision_subject_refs (
  decision_id TEXT PRIMARY KEY,
  subject_ref TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  FOREIGN KEY (decision_id) REFERENCES decision_logs(id) ON DELETE CASCADE
);

INSERT INTO decision_subject_refs (decision_id, subject_ref, subject_type)
SELECT d.id, d.linked_metric_id, 'governance_subject'
FROM decision_logs d
WHERE d.linked_metric_id <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM metrics m
    WHERE m.id = d.linked_metric_id OR m.code = d.linked_metric_id
  )
ON CONFLICT(decision_id) DO UPDATE SET
  subject_ref = excluded.subject_ref,
  subject_type = excluded.subject_type;

UPDATE decision_logs
SET linked_metric_id = ''
WHERE id IN (SELECT decision_id FROM decision_subject_refs);

DROP VIEW IF EXISTS decision_logs_with_subject;
CREATE VIEW decision_logs_with_subject AS
SELECT
  decision_logs.*,
  coalesce(decision_subject_refs.subject_ref, '') AS subject_ref,
  coalesce(decision_subject_refs.subject_type, '') AS subject_type
FROM decision_logs
LEFT JOIN decision_subject_refs ON decision_subject_refs.decision_id = decision_logs.id;

INSERT INTO schema_migrations (
  id, title, applied_at, boundary, rollback_script, verification_note
) VALUES (
  '20260716_decision_subject_reference',
  'Separate governance subject references from metric identifiers',
  '2026-07-16T18:30:00+08:00',
  'local_sqlite_only_no_provider_no_production_no_erp_writeback',
  'migrations/20260716_decision_subject_reference.rollback.sql',
  'Every non-empty decision_logs.linked_metric_id resolves to metrics.id/code; governance policy references use decision_subject_refs.'
)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  applied_at = excluded.applied_at,
  boundary = excluded.boundary,
  rollback_script = excluded.rollback_script,
  verification_note = excluded.verification_note;

COMMIT;
