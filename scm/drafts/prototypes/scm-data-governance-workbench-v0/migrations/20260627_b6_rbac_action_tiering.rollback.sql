PRAGMA foreign_keys = OFF;

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  boundary TEXT NOT NULL,
  rollback_script TEXT NOT NULL,
  verification_note TEXT NOT NULL
);

DROP INDEX IF EXISTS idx_permission_audit_log_resource;
DROP INDEX IF EXISTS idx_permission_audit_log_actor_created;
DROP TABLE IF EXISTS permission_audit_log;

DROP INDEX IF EXISTS idx_rbac_policy_rules_resource_tier;
DROP INDEX IF EXISTS idx_rbac_policy_rules_role_resource;
DROP TABLE IF EXISTS rbac_policy_rules;

DROP INDEX IF EXISTS idx_rbac_role_bindings_scope;
DROP INDEX IF EXISTS idx_rbac_role_bindings_actor_status;
DROP TABLE IF EXISTS rbac_role_bindings;

DROP TABLE IF EXISTS rbac_roles;
DROP TABLE IF EXISTS action_tier_policy;

DELETE FROM schema_migrations
WHERE id = '20260627_b6_rbac_action_tiering';

COMMIT;

PRAGMA foreign_keys = ON;
