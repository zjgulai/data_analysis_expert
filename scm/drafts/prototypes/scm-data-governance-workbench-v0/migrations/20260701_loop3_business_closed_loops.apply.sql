-- Deterministic local-only ledger delta reconstructed from the 2026-07-01 Loop 3 SQLite snapshot.
-- Boundary: no provider call, no production write, no accounting write, no ERP/OMS/WMS writeback.
PRAGMA foreign_keys = ON;

BEGIN;

INSERT OR IGNORE INTO ontology_object_instances (
  id, object_type_id, business_key, display_name, status, owner, properties,
  source_system, evidence_level, created_at
) VALUES (
  'cost_event_loop3_tail_warehouse_return_20260701',
  'cost_event',
  'COST-LOOP3-TAIL-WH-RETURN-20260701',
  'Loop3 tail-mile warehouse return cost governance event',
  'governance_review',
  '财务/成本 Owner',
  '{"costTypes":["尾程费用","仓租费用","退货费用","异常服务费用"],"channels":["Amazon","TikTok Shop","Walmart"],"countries":["US"],"evidenceSource":"local_finance_owner_decision_logs","billDrilldown":false,"transactionDetailImport":false,"businessRowsImported":false}',
  'local_sqlite_governance_ledger',
  'local_governance_review_packet',
  '2026-07-01T09:36:31+08:00'
);

INSERT OR IGNORE INTO aip_scenarios (
  id, name, scenario_type, priority, status, owner, trigger_condition,
  target_object_type, target_object_id, linked_metric_ids,
  linked_knowledge_card_ids, linked_recommendation_card_ids,
  diagnostic_question, decision_boundary, evidence_level, next_action
) VALUES
  (
    'scenario_loop3_inventory_stockout_three_way_20260701',
    'Loop3 库存风险：核心 SKU 缺货三分法',
    'inventory_availability_closed_loop',
    'P0',
    'review_ready',
    '计划 Owner',
    'coverage_days < 14 或 stockout_loss_amount 进入 P0 风险池；拆分为可售覆盖、采购未交和在途承接三类。',
    'sku',
    'sku_momcozy_pump_s12',
    '["SCM-MECE-L3-035","SCM-MECE-L3-033","SCM-MECE-L3-034","SCM-MECE-L3-113"]',
    '["business-supply-chain-card-0072","business-supply-chain-card-0101","stocking-rules-card-0010"]',
    '["rec_t5_t6_20260627_stockout_three_way"]',
    '核心 SKU 缺货风险应拆成覆盖不足、采购未交还是在途承接不足？',
    'suggestion_review_replay_only_no_provider_no_production_no_erp_writeback',
    'local_sqlite_storyline_review_ready_with_scei_residual',
    '计划 Owner 复核补货、调拨和活动节奏建议；SCEI 权重仍待人工签署。'
  ),
  (
    'scenario_loop3_finance_cost_tail_warehouse_return_20260701',
    'Loop3 成本风险：尾程/仓储/退货费用异常',
    'finance_cost_closed_loop',
    'P0',
    'review_ready',
    '财务/成本 Owner',
    'last_mile_cost_rate、warehousing_cost_rate、reverse_after_sales_cost_rate 或 logistics_estimate_actual_variance_rate 异常上升；账单 drill-down 和交易明细导入仍关闭。',
    'cost_event',
    'cost_event_loop3_tail_warehouse_return_20260701',
    '["SCM-MECE-L3-077","SCM-MECE-L3-080","SCM-MECE-L3-081","SCM-MECE-L3-083","SCM-MECE-L3-084","SCM-MECE-L3-088"]',
    '[]',
    '["rec_loop3_20260701_finance_cost_tail_warehouse_return"]',
    '尾程、仓储和退货费用异常应先进入费用口径治理，还是允许账单 drill-down 与交易明细导入？',
    'finance_cost_governance_local_review_only_no_provider_no_production_no_accounting_write_no_erp_writeback',
    'local_sqlite_finance_owner_decision_replay',
    '财务/成本 Owner 按费用类型和科目映射口径复核；不下载账单、不导入交易明细、不写会计系统。'
  ),
  (
    'scenario_loop3_fulfillment_eta_delivery_exception_20260701',
    'Loop3 履约风险：ETA/配送异常复核',
    'fulfillment_logistics_closed_loop',
    'P0',
    'review_ready_with_metric_gap',
    '履约运营 Owner',
    'ETA deviation、承运商 SLA、妥投或轨迹停滞出现异常；审核时效和 ETA 口径仍需认证。',
    'shipment',
    'shipment_fba_us_202606_01',
    '["SCM-MECE-L3-019","SCM-MECE-L3-064","SCM-MECE-L3-066","SCM-MECE-L3-068","SCM-MECE-L3-070","SCM-MECE-L3-129"]',
    '["business-supply-chain-card-0107","business-supply-chain-card-0168","business-supply-chain-card-0174"]',
    '["rec_t5_t6_20260627_review_efficiency_dual_metric"]',
    '履约异常应归因到 ETA/承运商 SLA/配送轨迹，还是先补齐审核节点时间戳和口径证据？',
    'suggestion_review_replay_only_no_provider_no_production_no_erp_writeback',
    'local_sqlite_storyline_review_ready_with_metric_gap',
    '履约运营 Owner 补齐审核节点时间戳并认证 ETA/配送异常口径后，再进入运营处置建议。'
  );

INSERT OR IGNORE INTO recommendation_cards (
  id, scenario, title, target_object_type, target_object_id, linked_metric_ids,
  linked_knowledge_card_ids, business_impact, confidence_level, risk_level,
  owner, sla_due_at, action_options, approval_status, execution_status,
  trace_id, replay_note, created_at, updated_at
) VALUES (
  'rec_loop3_20260701_finance_cost_tail_warehouse_return',
  'scenario_loop3_finance_cost_tail_warehouse_return_20260701',
  '尾程/仓储/退货费用异常治理复核',
  'cost_event',
  'cost_event_loop3_tail_warehouse_return_20260701',
  '["SCM-MECE-L3-077","SCM-MECE-L3-080","SCM-MECE-L3-081","SCM-MECE-L3-083","SCM-MECE-L3-084","SCM-MECE-L3-088"]',
  '[]',
  '把跨平台尾程费、仓租费、退货/补发费和异常服务费先纳入费用口径治理，避免在账单明细未授权时直接做成本归因或会计写入。',
  'owner_decision_supported_local_only',
  'P0',
  '财务/成本 Owner',
  '2026-07-03T18:00:00+08:00',
  '["复核费用类型与科目映射","保持 billDrilldown=false","保持 transactionDetailImport=false","生成成本异常治理任务"]',
  'review_pending',
  'suggestion_review_replay',
  'trace_loop3_20260701_finance_cost_tail_warehouse_return',
  'Loop3 local finance-cost governance replay only; no bill download, no transaction import, no accounting write, no ERP writeback.',
  '2026-07-01T09:36:31+08:00',
  '2026-07-01T09:36:31+08:00'
);

INSERT OR IGNORE INTO agent_traces (
  id, source_type, source_id, question, intent, matched_objects, matched_metrics,
  matched_knowledge_cards, matched_lineage_edges, answerability, public_steps,
  recommendation_ref, policy, created_by, created_at
) VALUES (
  'trace_loop3_20260701_finance_cost_tail_warehouse_return',
  'scenario',
  'scenario_loop3_finance_cost_tail_warehouse_return_20260701',
  '尾程、仓储和退货费用异常应先进入费用口径治理，还是允许账单 drill-down 与交易明细导入？',
  'finance_cost_governance_replay',
  '["cost_event","cost_event_loop3_tail_warehouse_return_20260701","warehouse_3pl_us_nj","warehouse_fba_us_west"]',
  '["SCM-MECE-L3-077","SCM-MECE-L3-080","SCM-MECE-L3-081","SCM-MECE-L3-083","SCM-MECE-L3-084","SCM-MECE-L3-088"]',
  '[]',
  '["decision_fin-owner-001_a_20260627T000000","decision_fin-owner-002_a_20260627T000000","decision_fin-owner-003_a_20260627T000000"]',
  'owner_decision_review_ready_local_only',
  '[{"step":"identify_cost_event","status":"completed","summary":"绑定尾程、仓储、退货和异常服务费用的本地 CostEvent 治理样本"},{"step":"match_metrics","status":"completed","summary":"关联总成本率、仓储成本率、尾程成本率、逆向售后成本率、物流估实差异率和成本分摊覆盖率"},{"step":"apply_owner_boundary","status":"completed","summary":"继承财务 Owner 已批准的费用类型口径，同时保持 billDrilldown=false 与 transactionDetailImport=false"},{"step":"draft_recommendation","status":"completed","summary":"生成 suggestion_review_replay 建议卡和本地 action task，不触发账单下载或会计写入"}]',
  'rec_loop3_20260701_finance_cost_tail_warehouse_return',
  'local_finance_cost_governance_no_provider_no_production_no_accounting_write_no_erp_writeback',
  'Codex Loop3 local ledger',
  '2026-07-01T09:36:31+08:00'
);

INSERT OR IGNORE INTO trace_reviews (
  id, trace_id, source_type, intent, answerability, review_status, reviewer,
  review_note, decision_boundary, action_ref, created_at, updated_at
) VALUES (
  'trace_review_loop3_20260701_finance_cost_tail_warehouse_return',
  'trace_loop3_20260701_finance_cost_tail_warehouse_return',
  'scenario',
  'finance_cost_governance_replay',
  'owner_decision_review_ready_local_only',
  'approved_for_governance_view_with_boundary',
  'Codex local reviewer',
  'Finance owner decision logs support local governance view only. Bill drill-down, transaction import, accounting write, provider call, production write, and ERP writeback remain disabled.',
  'suggestion_review_replay_only_no_bill_download_no_transaction_import_no_accounting_write_no_provider_no_production_no_erp_writeback',
  'action_loop3_20260701_finance_cost_tail_warehouse_return',
  '2026-07-01T09:36:31+08:00',
  '2026-07-01T09:36:31+08:00'
);

INSERT OR IGNORE INTO decision_logs (
  id, insight_title, linked_metric_id, recommendation, action_boundary,
  status, review_note
) VALUES (
  'decision_loop3_20260701_finance_cost_tail_warehouse_return',
  'Loop3 成本风险闭环：尾程/仓储/退货费用异常治理复核',
  'SCM-MECE-L3-077',
  '将尾程成本率、仓储成本率、逆向售后成本率和物流估实差异率先纳入财务成本治理视图；账单 drill-down 和交易明细导入继续关闭。',
  'suggestion_review_replay_only_no_bill_download_no_transaction_import_no_accounting_write_no_provider_no_production_no_erp_writeback',
  'review_ready_local_only',
  'Loop3 local closed-loop ledger. Reuses finance owner choice A as governance boundary; does not approve source field mapping or real transaction import.'
);

INSERT OR IGNORE INTO action_tasks (
  id, insight_ref, action_name, owner, status, approval_required, replay_note
) VALUES (
  'action_loop3_20260701_finance_cost_tail_warehouse_return',
  'rec_loop3_20260701_finance_cost_tail_warehouse_return',
  '复核尾程/仓储/退货费用异常的费用类型与科目映射口径',
  '财务/成本 Owner',
  'suggestion_review_replay',
  1,
  'Local task only; billDrilldown=false; transactionDetailImport=false; accountingWrite=false; productionWrites=false; providerCalls=false; erpWriteback=false.'
);

COMMIT;
