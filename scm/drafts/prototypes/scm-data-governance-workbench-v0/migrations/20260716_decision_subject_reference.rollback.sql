-- Restore governance subject references to the legacy linked_metric_id field.
-- Run only on a disposable/local SQLite copy unless separately authorized.
PRAGMA foreign_keys = ON;

BEGIN;

CREATE TEMP TABLE migration_20260716_subject_rollback_guard (
  dual_reference_count INTEGER NOT NULL CHECK (dual_reference_count = 0)
);

INSERT INTO migration_20260716_subject_rollback_guard (dual_reference_count)
SELECT COUNT(*)
FROM decision_logs d
JOIN decision_subject_refs refs ON refs.decision_id = d.id
WHERE d.linked_metric_id <> '';

DROP TABLE migration_20260716_subject_rollback_guard;

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
