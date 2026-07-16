-- Restore governance subject references to the legacy linked_metric_id field.
-- Run only on a disposable/local SQLite copy unless separately authorized.
PRAGMA foreign_keys = ON;

BEGIN;

DROP VIEW IF EXISTS decision_logs_with_subject;

UPDATE decision_logs
SET linked_metric_id = (
  SELECT subject_ref
  FROM decision_subject_refs
  WHERE decision_subject_refs.decision_id = decision_logs.id
)
WHERE linked_metric_id = ''
  AND id IN (SELECT decision_id FROM decision_subject_refs);

DROP TABLE decision_subject_refs;

DELETE FROM schema_migrations
WHERE id = '20260716_decision_subject_reference';

COMMIT;
