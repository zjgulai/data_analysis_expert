-- DESTRUCTIVE SCHEMA ROLLBACK.
-- Run with a fail-fast SQL runner only. The guard below aborts when any target table is populated.
-- Run only on a disposable database copy or after verifying every table below is empty.
-- A populated database requires separate destructive authorization and a verified backup record.
PRAGMA foreign_keys = OFF;

BEGIN;

CREATE TEMP TABLE scm_b3_rollback_guard (
  total_rows INTEGER NOT NULL CHECK (total_rows = 0)
);

INSERT INTO scm_b3_rollback_guard (total_rows)
SELECT
  (SELECT COUNT(*) FROM storyline_template)
  + (SELECT COUNT(*) FROM insight_unit)
  + (SELECT COUNT(*) FROM kpi_health)
  + (SELECT COUNT(*) FROM kpi_mece_check)
  + (SELECT COUNT(*) FROM kpi_attribution_path)
  + (SELECT COUNT(*) FROM kpi_contribution)
  + (SELECT COUNT(*) FROM metric_dimension_review)
  + (SELECT COUNT(*) FROM metric_validation_log)
  + (SELECT COUNT(*) FROM metric_field_mapping)
  + (SELECT COUNT(*) FROM tag_property_projection)
  + (SELECT COUNT(*) FROM tag_assignment);

DROP TABLE scm_b3_rollback_guard;

DROP TABLE IF EXISTS storyline_template;
DROP INDEX IF EXISTS idx_insight_unit_page_status;
DROP TABLE IF EXISTS insight_unit;
DROP TABLE IF EXISTS kpi_health;
DROP TABLE IF EXISTS kpi_mece_check;
DROP TABLE IF EXISTS kpi_attribution_path;
DROP INDEX IF EXISTS idx_kpi_contribution_parent_period;
DROP TABLE IF EXISTS kpi_contribution;
DROP TABLE IF EXISTS metric_dimension_review;
DROP INDEX IF EXISTS idx_metric_validation_log_metric;
DROP TABLE IF EXISTS metric_validation_log;
DROP INDEX IF EXISTS idx_metric_field_mapping_metric_status;
DROP TABLE IF EXISTS metric_field_mapping;
DROP TABLE IF EXISTS tag_property_projection;
DROP INDEX IF EXISTS idx_tag_assignment_object;
DROP INDEX IF EXISTS idx_tag_assignment_tag_status;
DROP TABLE IF EXISTS tag_assignment;

DELETE FROM schema_migrations
WHERE id = '20260627_b3_t7_additive_schema';

COMMIT;

PRAGMA foreign_keys = ON;
