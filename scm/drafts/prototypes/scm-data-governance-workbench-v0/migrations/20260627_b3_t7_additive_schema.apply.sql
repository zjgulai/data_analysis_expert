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

INSERT OR IGNORE INTO schema_migrations (
  id,
  title,
  applied_at,
  boundary,
  rollback_script,
  verification_note
) VALUES (
  '20260627_b3_t7_additive_schema',
  'B3 T7 additive schema review for tag, metric, KPI, and storyline contracts',
  '2026-06-27T16:00:00+08:00',
  'local_sqlite_only_no_production_write_no_provider_call_no_erp_writeback',
  'migrations/20260627_b3_t7_additive_schema.rollback.sql',
  'Apply on disposable copy first; all tables are additive and existing columns are unchanged.'
);

CREATE TABLE IF NOT EXISTS tag_assignment (
  id TEXT PRIMARY KEY,
  tag_id TEXT NOT NULL REFERENCES tags(id),
  object_instance_id TEXT NOT NULL REFERENCES ontology_object_instances(id),
  hit_value TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('batch', 'stream', 'manual_review', 'replay')),
  assignment_status TEXT NOT NULL DEFAULT 'suggested' CHECK (assignment_status IN ('suggested', 'approved', 'rejected', 'expired')),
  assigned_at TEXT NOT NULL,
  expired_at TEXT,
  governance_note TEXT NOT NULL DEFAULT 'suggestion_review_replay_only',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tag_id, object_instance_id, assigned_at)
);

CREATE INDEX IF NOT EXISTS idx_tag_assignment_tag_status
  ON tag_assignment(tag_id, assignment_status);

CREATE INDEX IF NOT EXISTS idx_tag_assignment_object
  ON tag_assignment(object_instance_id);

CREATE TABLE IF NOT EXISTS tag_property_projection (
  id TEXT PRIMARY KEY,
  tag_id TEXT NOT NULL REFERENCES tags(id),
  target_object_type_id TEXT NOT NULL REFERENCES ontology_objects(id),
  target_property TEXT NOT NULL,
  projection_status TEXT NOT NULL DEFAULT 'candidate' CHECK (projection_status IN ('candidate', 'reviewed', 'active', 'retired')),
  evidence_ref TEXT NOT NULL,
  governance_note TEXT NOT NULL DEFAULT 'local_contract_only',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tag_id, target_object_type_id, target_property)
);

CREATE TABLE IF NOT EXISTS metric_field_mapping (
  id TEXT PRIMARY KEY,
  metric_id TEXT NOT NULL REFERENCES metrics(id),
  source_system TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_field TEXT NOT NULL,
  aggregation TEXT NOT NULL DEFAULT 'none',
  filter_expression TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_ref TEXT NOT NULL,
  confirmed_by TEXT NOT NULL DEFAULT 'pending_owner_review',
  confirmation_status TEXT NOT NULL DEFAULT 'candidate' CHECK (confirmation_status IN ('candidate', 'confirmed', 'rejected', 'retired')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (metric_id, source_system, source_table, source_field, aggregation, filter_expression)
);

CREATE INDEX IF NOT EXISTS idx_metric_field_mapping_metric_status
  ON metric_field_mapping(metric_id, confirmation_status);

CREATE TABLE IF NOT EXISTS metric_validation_log (
  id TEXT PRIMARY KEY,
  metric_id TEXT NOT NULL REFERENCES metrics(id),
  check_type TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'review', 'blocked')),
  detail_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metric_validation_log_metric
  ON metric_validation_log(metric_id, check_type);

CREATE TABLE IF NOT EXISTS metric_dimension_review (
  id TEXT PRIMARY KEY,
  metric_id TEXT NOT NULL REFERENCES metrics(id),
  dimension_id TEXT NOT NULL REFERENCES dimensions(id),
  compatibility TEXT NOT NULL CHECK (compatibility IN ('confirmed', 'candidate', 'forbidden')),
  reason TEXT NOT NULL,
  reviewer TEXT NOT NULL DEFAULT 'pending_owner_review',
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (metric_id, dimension_id)
);

CREATE TABLE IF NOT EXISTS kpi_contribution (
  id TEXT PRIMARY KEY,
  parent_metric_id TEXT NOT NULL REFERENCES metrics(id),
  child_metric_id TEXT NOT NULL REFERENCES metrics(id),
  period TEXT NOT NULL,
  contribution_pct REAL NOT NULL CHECK (contribution_pct >= -1 AND contribution_pct <= 1),
  residual REAL NOT NULL CHECK (residual >= 0),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (parent_metric_id, child_metric_id, period)
);

CREATE INDEX IF NOT EXISTS idx_kpi_contribution_parent_period
  ON kpi_contribution(parent_metric_id, period);

CREATE TABLE IF NOT EXISTS kpi_attribution_path (
  id TEXT PRIMARY KEY,
  root_metric_id TEXT NOT NULL REFERENCES metrics(id),
  period TEXT NOT NULL,
  ordered_driver_chain TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (root_metric_id, period, ordered_driver_chain)
);

CREATE TABLE IF NOT EXISTS kpi_mece_check (
  id TEXT PRIMARY KEY,
  parent_metric_id TEXT NOT NULL REFERENCES metrics(id),
  period TEXT NOT NULL,
  exhaustive_pass INTEGER NOT NULL CHECK (exhaustive_pass IN (0, 1)),
  exclusive_pass INTEGER NOT NULL CHECK (exclusive_pass IN (0, 1)),
  coverage REAL NOT NULL CHECK (coverage >= 0 AND coverage <= 1),
  residual REAL NOT NULL CHECK (residual >= 0),
  evidence_ref TEXT NOT NULL,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (parent_metric_id, period)
);

CREATE TABLE IF NOT EXISTS kpi_health (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  scope_ref TEXT NOT NULL,
  period TEXT NOT NULL,
  cert_rate REAL NOT NULL CHECK (cert_rate >= 0 AND cert_rate <= 1),
  lineage_score REAL NOT NULL CHECK (lineage_score >= 0 AND lineage_score <= 1),
  weight_completeness REAL NOT NULL CHECK (weight_completeness >= 0 AND weight_completeness <= 1),
  mece_pass_rate REAL NOT NULL CHECK (mece_pass_rate >= 0 AND mece_pass_rate <= 1),
  freshness_score REAL NOT NULL CHECK (freshness_score >= 0 AND freshness_score <= 1),
  score REAL NOT NULL CHECK (score >= 0 AND score <= 1),
  evidence_ref TEXT NOT NULL,
  calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (scope, scope_ref, period)
);

CREATE TABLE IF NOT EXISTS insight_unit (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  metric_ref TEXT NOT NULL,
  baseline TEXT NOT NULL,
  threshold_or_tag TEXT NOT NULL,
  attribution_ref TEXT NOT NULL,
  suggestion_ref TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_refs TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'active', 'retired')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insight_unit_page_status
  ON insight_unit(page_id, status);

CREATE TABLE IF NOT EXISTS storyline_template (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  scqa_json TEXT NOT NULL,
  evidence_refs TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'active', 'retired')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (page_id, template_name)
);

COMMIT;
