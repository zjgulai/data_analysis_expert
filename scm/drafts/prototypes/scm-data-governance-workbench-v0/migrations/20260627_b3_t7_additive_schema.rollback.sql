PRAGMA foreign_keys = OFF;

BEGIN;

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

DROP TABLE IF EXISTS schema_migrations;

COMMIT;

PRAGMA foreign_keys = ON;
