-- Roll back only the namespaced Loop 3 local ledger rows.
-- Boundary: disposable/local SQLite only; no provider or external writeback.
PRAGMA foreign_keys = ON;

BEGIN;

DELETE FROM action_tasks
WHERE id = 'action_loop3_20260701_finance_cost_tail_warehouse_return';

DELETE FROM trace_reviews
WHERE id = 'trace_review_loop3_20260701_finance_cost_tail_warehouse_return';

DELETE FROM agent_traces
WHERE id = 'trace_loop3_20260701_finance_cost_tail_warehouse_return';

DELETE FROM decision_logs
WHERE id = 'decision_loop3_20260701_finance_cost_tail_warehouse_return';

DELETE FROM recommendation_cards
WHERE id = 'rec_loop3_20260701_finance_cost_tail_warehouse_return';

DELETE FROM aip_scenarios
WHERE id IN (
  'scenario_loop3_inventory_stockout_three_way_20260701',
  'scenario_loop3_finance_cost_tail_warehouse_return_20260701',
  'scenario_loop3_fulfillment_eta_delivery_exception_20260701'
);

DELETE FROM ontology_object_instances
WHERE id = 'cost_event_loop3_tail_warehouse_return_20260701';

COMMIT;
