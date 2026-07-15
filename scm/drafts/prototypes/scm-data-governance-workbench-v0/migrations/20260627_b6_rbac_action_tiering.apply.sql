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
  '20260627_b6_rbac_action_tiering',
  'B6 RBAC and action-tiering additive schema review',
  '2026-06-27T17:45:00+08:00',
  'local_sqlite_only_no_production_write_no_provider_call_no_erp_writeback',
  'migrations/20260627_b6_rbac_action_tiering.rollback.sql',
  'Apply on disposable copy first; runtime auth and external writeback stay out of scope.'
);

CREATE TABLE IF NOT EXISTS action_tier_policy (
  tier TEXT PRIMARY KEY CHECK (tier IN ('L0', 'L1', 'L2', 'L3', 'L4', 'L5')),
  tier_order INTEGER NOT NULL UNIQUE CHECK (tier_order BETWEEN 0 AND 5),
  tier_name TEXT NOT NULL,
  is_currently_allowed INTEGER NOT NULL CHECK (is_currently_allowed IN (0, 1)),
  local_sqlite_writes INTEGER NOT NULL CHECK (local_sqlite_writes IN (0, 1)),
  controlled_file_export INTEGER NOT NULL CHECK (controlled_file_export IN (0, 1)),
  provider_calls INTEGER NOT NULL CHECK (provider_calls = 0),
  erp_writeback INTEGER NOT NULL CHECK (erp_writeback = 0),
  production_writes INTEGER NOT NULL CHECK (production_writes = 0),
  requires_owner INTEGER NOT NULL CHECK (requires_owner IN (0, 1)),
  requires_approval INTEGER NOT NULL CHECK (requires_approval IN (0, 1)),
  requires_trace INTEGER NOT NULL CHECK (requires_trace IN (0, 1)),
  action_ceiling_status TEXT NOT NULL,
  policy_note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO action_tier_policy (
  tier,
  tier_order,
  tier_name,
  is_currently_allowed,
  local_sqlite_writes,
  controlled_file_export,
  provider_calls,
  erp_writeback,
  production_writes,
  requires_owner,
  requires_approval,
  requires_trace,
  action_ceiling_status,
  policy_note
) VALUES
  ('L0', 0, 'read_only_evidence', 1, 0, 0, 0, 0, 0, 0, 0, 0, 'read_only', 'GET and HEAD evidence access only.'),
  ('L1', 1, 'governed_suggestion', 1, 1, 0, 0, 0, 0, 0, 0, 1, 'suggestion_review_replay', 'Local annotations and suggestion drafts only.'),
  ('L2', 2, 'approval_task', 1, 1, 0, 0, 0, 0, 1, 1, 1, 'suggestion_review_replay', 'Local approval tasks, trace review, and replay ledgers only.'),
  ('L3', 3, 'controlled_export', 0, 1, 1, 0, 0, 0, 1, 1, 1, 'review_required_before_opening', 'Future local export package after RBAC and audit review.'),
  ('L4', 4, 'api_assisted_writeback', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'prohibited_current_boundary', 'External API writeback is out of current boundary.'),
  ('L5', 5, 'policy_automation', 0, 0, 0, 0, 0, 0, 1, 1, 1, 'prohibited_current_boundary', 'Automated policy execution is out of current boundary.');

CREATE TABLE IF NOT EXISTS rbac_roles (
  role_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  responsibility TEXT NOT NULL,
  default_tier_ceiling TEXT NOT NULL REFERENCES action_tier_policy(tier),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  boundary TEXT NOT NULL DEFAULT 'local_sqlite_only_no_provider_no_external_write',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO rbac_roles (
  role_id,
  display_name,
  responsibility,
  default_tier_ceiling,
  enabled,
  boundary
) VALUES
  ('executive_viewer', 'Executive Viewer', 'Read-only management view for KPI, storylines, and recommendation summaries.', 'L0', 1, 'read_only_evidence'),
  ('supply_chain_owner', 'Supply Chain Owner', 'End-to-end supply-chain owner for object-scoped tasks and recommendations.', 'L2', 1, 'suggestion_review_replay'),
  ('inventory_ops_owner', 'Inventory Ops Owner', 'Inventory and replenishment owner for warehouse, SKU, and batch evidence.', 'L2', 1, 'suggestion_review_replay'),
  ('fulfillment_owner', 'Fulfillment Owner', 'Fulfillment owner for shipment, warehouse, and FBA/FBT task evidence.', 'L2', 1, 'suggestion_review_replay'),
  ('finance_owner', 'Finance Owner', 'Finance owner for cost metrics, attribution output, and finance evidence packets.', 'L2', 1, 'suggestion_review_replay'),
  ('data_governance_owner', 'Data Governance Owner', 'Metric, tag, lineage, certification, and annotation governance owner.', 'L2', 1, 'suggestion_review_replay'),
  ('ai_operator', 'AI Operator', 'Local AI run, trace, and suggestion-card operator.', 'L1', 1, 'local_suggestion_only'),
  ('audit_reviewer', 'Audit Reviewer', 'Review owner for trace, decision, and approval-task ledgers.', 'L2', 1, 'suggestion_review_replay'),
  ('admin_local_config', 'Admin Local Config', 'Future local prototype configuration and reviewed export package owner; disabled until the L3 gate is approved.', 'L3', 0, 'disabled_until_l3_review');

CREATE TABLE IF NOT EXISTS rbac_role_bindings (
  id TEXT PRIMARY KEY,
  actor_ref TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES rbac_roles(role_id),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'object_type', 'object_instance', 'metric', 'domain', 'scenario')),
  scope_ref TEXT NOT NULL,
  binding_status TEXT NOT NULL DEFAULT 'draft' CHECK (binding_status IN ('draft', 'reviewed', 'active', 'revoked')),
  granted_by TEXT NOT NULL DEFAULT 'pending_owner_review',
  evidence_ref TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  UNIQUE (actor_ref, role_id, scope_type, scope_ref)
);

CREATE INDEX IF NOT EXISTS idx_rbac_role_bindings_actor_status
  ON rbac_role_bindings(actor_ref, binding_status);

CREATE INDEX IF NOT EXISTS idx_rbac_role_bindings_scope
  ON rbac_role_bindings(scope_type, scope_ref);

CREATE TABLE IF NOT EXISTS rbac_policy_rules (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES rbac_roles(role_id),
  resource TEXT NOT NULL,
  action_tier TEXT NOT NULL REFERENCES action_tier_policy(tier),
  permission TEXT NOT NULL CHECK (permission IN ('allow', 'requires_scope', 'requires_owner', 'review_required', 'prohibited')),
  scope_rule TEXT NOT NULL,
  policy_note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_id, resource, action_tier)
);

INSERT OR IGNORE INTO rbac_policy_rules (
  id,
  role_id,
  resource,
  action_tier,
  permission,
  scope_rule,
  policy_note
) VALUES
  ('policy_executive_viewer_metrics_l0', 'executive_viewer', 'metrics', 'L0', 'requires_scope', 'business_scope_only', 'Executive viewer can read scoped certified KPI evidence.'),
  ('policy_executive_viewer_recommendations_l0', 'executive_viewer', 'recommendation_cards', 'L0', 'requires_scope', 'summary_only', 'Executive viewer can read scoped recommendation summaries.'),
  ('policy_data_governance_metrics_l1', 'data_governance_owner', 'metrics', 'L1', 'allow', 'governance_scope', 'Metric annotations and mapping proposals are local-only.'),
  ('policy_data_governance_metrics_l2', 'data_governance_owner', 'metrics', 'L2', 'allow', 'governance_scope', 'Metric certification review remains local ledger only.'),
  ('policy_data_governance_tags_l1', 'data_governance_owner', 'tags', 'L1', 'allow', 'governance_scope', 'Tag lifecycle proposals are local-only.'),
  ('policy_data_governance_kpi_tree_l2', 'data_governance_owner', 'kpi_tree', 'L2', 'allow', 'governance_scope', 'KPI tree review must preserve certified evidence gates.'),
  ('policy_ai_operator_runs_l1', 'ai_operator', 'agent_runs', 'L1', 'allow', 'local_ai_scope', 'AI operator can create local run records without provider calls.'),
  ('policy_ai_operator_traces_l1', 'ai_operator', 'agent_traces', 'L1', 'allow', 'local_ai_scope', 'AI operator can create local traces bound to evidence refs.'),
  ('policy_ai_operator_recommendations_l1', 'ai_operator', 'recommendation_cards', 'L1', 'allow', 'local_ai_scope', 'AI operator can draft local recommendation cards.'),
  ('policy_audit_reviewer_trace_l2', 'audit_reviewer', 'trace_reviews', 'L2', 'allow', 'audit_scope', 'Audit reviewer can write local trace-review ledgers.'),
  ('policy_audit_reviewer_decisions_l2', 'audit_reviewer', 'decision_logs', 'L2', 'allow', 'audit_scope', 'Audit reviewer can write local decision ledgers.'),
  ('policy_supply_chain_owner_tasks_l2', 'supply_chain_owner', 'action_tasks', 'L2', 'requires_owner', 'owned_supply_chain_scope', 'Owner can review owned local approval tasks.'),
  ('policy_inventory_owner_tasks_l2', 'inventory_ops_owner', 'action_tasks', 'L2', 'requires_owner', 'owned_inventory_scope', 'Owner can review owned local approval tasks.'),
  ('policy_fulfillment_owner_tasks_l2', 'fulfillment_owner', 'action_tasks', 'L2', 'requires_owner', 'owned_fulfillment_scope', 'Owner can review owned local approval tasks.'),
  ('policy_finance_owner_tasks_l2', 'finance_owner', 'action_tasks', 'L2', 'requires_owner', 'owned_finance_scope', 'Owner can review owned local approval tasks.'),
  ('policy_admin_export_l3', 'admin_local_config', 'export_jobs', 'L3', 'review_required', 'local_reviewed_export_scope', 'Controlled export remains closed until separate review opens L3.'),
  ('policy_admin_migrations_l3', 'admin_local_config', 'schema_migrations', 'L3', 'review_required', 'local_schema_review_scope', 'Migration application requires explicit reviewed batch.');

CREATE INDEX IF NOT EXISTS idx_rbac_policy_rules_role_resource
  ON rbac_policy_rules(role_id, resource);

CREATE INDEX IF NOT EXISTS idx_rbac_policy_rules_resource_tier
  ON rbac_policy_rules(resource, action_tier);

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id TEXT PRIMARY KEY,
  actor_ref TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES rbac_roles(role_id),
  resource TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  action_tier TEXT NOT NULL REFERENCES action_tier_policy(tier),
  permission_result TEXT NOT NULL CHECK (permission_result IN ('allow', 'deny', 'review_required', 'prohibited')),
  boundary TEXT NOT NULL,
  approval_ref TEXT NOT NULL DEFAULT '',
  trace_ref TEXT NOT NULL DEFAULT '',
  request_payload_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_log_actor_created
  ON permission_audit_log(actor_ref, created_at);

CREATE INDEX IF NOT EXISTS idx_permission_audit_log_resource
  ON permission_audit_log(resource, resource_id);

COMMIT;
