-- Restore the exact certification rows captured before the 2026-07-16 remediation.
-- Run only on a disposable/local SQLite copy unless separately authorized.
PRAGMA foreign_keys = ON;

BEGIN;

UPDATE metrics
SET lifecycle_status = (
      SELECT s.lifecycle_status
      FROM migration_20260716_cert_metric_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation'
        AND s.metric_id = metrics.id
    ),
    certification_status = (
      SELECT s.certification_status
      FROM migration_20260716_cert_metric_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation'
        AND s.metric_id = metrics.id
    )
WHERE id IN (
  SELECT metric_id
  FROM migration_20260716_cert_metric_snapshot
  WHERE migration_id = '20260716_certification_gate_remediation'
);

UPDATE certifications
SET asset_type = (
      SELECT s.asset_type FROM migration_20260716_cert_ledger_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = certifications.id
    ),
    asset_ref = (
      SELECT s.asset_ref FROM migration_20260716_cert_ledger_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = certifications.id
    ),
    status = (
      SELECT s.status FROM migration_20260716_cert_ledger_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = certifications.id
    ),
    certified_by = (
      SELECT s.certified_by FROM migration_20260716_cert_ledger_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = certifications.id
    ),
    evidence = (
      SELECT s.evidence FROM migration_20260716_cert_ledger_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = certifications.id
    )
WHERE id IN (
  SELECT id
  FROM migration_20260716_cert_ledger_snapshot
  WHERE migration_id = '20260716_certification_gate_remediation'
);

UPDATE lineage_edges
SET source_ref = (
      SELECT s.source_ref FROM migration_20260716_cert_lineage_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = lineage_edges.id
    ),
    target_ref = (
      SELECT s.target_ref FROM migration_20260716_cert_lineage_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = lineage_edges.id
    ),
    edge_type = (
      SELECT s.edge_type FROM migration_20260716_cert_lineage_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = lineage_edges.id
    ),
    confidence = (
      SELECT s.confidence FROM migration_20260716_cert_lineage_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = lineage_edges.id
    ),
    evidence = (
      SELECT s.evidence FROM migration_20260716_cert_lineage_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = lineage_edges.id
    ),
    status = (
      SELECT s.status FROM migration_20260716_cert_lineage_snapshot s
      WHERE s.migration_id = '20260716_certification_gate_remediation' AND s.id = lineage_edges.id
    )
WHERE id IN (
  SELECT id
  FROM migration_20260716_cert_lineage_snapshot
  WHERE migration_id = '20260716_certification_gate_remediation'
);

INSERT INTO chatbi_contexts (
  id, metric_id, question_sample, allowed_dimensions, evidence_chain, answer_policy
)
SELECT id, metric_id, question_sample, allowed_dimensions, evidence_chain, answer_policy
FROM migration_20260716_cert_chatbi_snapshot
WHERE migration_id = '20260716_certification_gate_remediation'
ON CONFLICT(id) DO UPDATE SET
  metric_id = excluded.metric_id,
  question_sample = excluded.question_sample,
  allowed_dimensions = excluded.allowed_dimensions,
  evidence_chain = excluded.evidence_chain,
  answer_policy = excluded.answer_policy;

DELETE FROM schema_migrations
WHERE id = '20260716_certification_gate_remediation';

DROP TABLE migration_20260716_cert_lineage_snapshot;
DROP TABLE migration_20260716_cert_chatbi_snapshot;
DROP TABLE migration_20260716_cert_ledger_snapshot;
DROP TABLE migration_20260716_cert_metric_snapshot;

COMMIT;
