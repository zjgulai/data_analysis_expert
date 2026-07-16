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

CREATE TEMP TABLE migration_20260716_allowed_decision_subjects (
  subject_ref TEXT PRIMARY KEY
);

INSERT INTO migration_20260716_allowed_decision_subjects (subject_ref) VALUES
  ('BOUNDARY-ENUM-B1'),
  ('SCM-RBAC-ACTION-TIERING'),
  ('SCM-RBAC-ACTION-TIERING-MIGRATION'),
  ('SCM-T8-1-SHARED-UI-PRIMITIVES'),
  ('SCM-T8-2-CATALOG-PANELS'),
  ('SCM-T8-3-DETAIL-PRIMITIVES'),
  ('SCM-T8-4-KNOWLEDGE-SECTIONS'),
  ('SCM-T8-CODEBASE-SPLIT-BASELINE'),
  ('SCM-WORKBENCH-T7'),
  ('SCM-WORKBENCH-T8'),
  ('T8'),
  ('T8-14'),
  ('T8-15'),
  ('T8-16'),
  ('T8-17'),
  ('ai_kb_quality.business-supply-chain'),
  ('aip_scm.t8.codebase_memory_split'),
  ('finance_cost.FCOST-OMS-FEE-STATS'),
  ('finance_owner.bill_drilldown_policy'),
  ('finance_owner.cost_type_policy'),
  ('finance_owner.reconciliation_rule_policy'),
  ('finance_owner.transaction_detail_import_policy'),
  ('oms_wms_candidate_extension_objects'),
  ('oms_wms_export_api_lineage_gate'),
  ('oms_wms_field_class_risk_radar'),
  ('oms_wms_source_coverage_objects'),
  ('oms_wms_usage_policy.field_usage_scope'),
  ('release_readiness.preprod_20260629'),
  ('risk_threshold.THR-INV-NEG-AVAILABLE-V0.1'),
  ('risk_threshold_owner.threshold_policy_scope'),
  ('risk_threshold_pack'),
  ('risk_threshold_value.THR-INV-NEG-AVAILABLE-V0.1'),
  ('role_workbench.planning'),
  ('runtime_business_row_design.grain_and_source_contract'),
  ('runtime_import_scope'),
  ('runtime_import_sensitive_identifier_policy'),
  ('runtime_import_threshold_activation_policy'),
  ('technical_debt.T8-18'),
  ('technical_debt.T8-19'),
  ('technical_debt.T8-20'),
  ('technical_debt.T8-21'),
  ('technical_debt.T8-22');

CREATE TEMP TABLE migration_20260716_unknown_subject_guard (
  unknown_count INTEGER NOT NULL CHECK (unknown_count = 0)
);

INSERT INTO migration_20260716_unknown_subject_guard (unknown_count)
SELECT COUNT(*)
FROM (
  SELECT d.linked_metric_id AS subject_ref
  FROM decision_logs d
  WHERE d.linked_metric_id <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM metrics m
      WHERE m.id = d.linked_metric_id OR m.code = d.linked_metric_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM migration_20260716_allowed_decision_subjects allowed
      WHERE allowed.subject_ref = d.linked_metric_id
    )
  UNION ALL
  SELECT refs.subject_ref
  FROM decision_subject_refs refs
  WHERE NOT EXISTS (
    SELECT 1
    FROM migration_20260716_allowed_decision_subjects allowed
    WHERE allowed.subject_ref = refs.subject_ref
  )
);

DROP TABLE migration_20260716_unknown_subject_guard;

INSERT INTO decision_subject_refs (decision_id, subject_ref, subject_type)
SELECT d.id, d.linked_metric_id, 'governance_subject'
FROM decision_logs d
JOIN migration_20260716_allowed_decision_subjects allowed
  ON allowed.subject_ref = d.linked_metric_id
ON CONFLICT(decision_id) DO NOTHING;

UPDATE decision_logs
SET linked_metric_id = ''
WHERE EXISTS (
  SELECT 1
  FROM decision_subject_refs refs
  WHERE refs.decision_id = decision_logs.id
    AND refs.subject_ref = decision_logs.linked_metric_id
);

DROP TABLE migration_20260716_allowed_decision_subjects;

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
ON CONFLICT(id) DO NOTHING;

COMMIT;
