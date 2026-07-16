import {
  Badge,
  DataTable,
  RefPills,
  humanizeBoundary,
  humanizeOperationalLabel,
  sourceEvidenceTone,
  type AnyRow
} from "../shared/ui";
import type {
  OwnerDecisionChoice,
  OwnerDecisionPacket
} from "./decisionLoopModels";
import type {
  FinanceCostEvidencePacket,
  FinanceCostGovernancePayload,
  RiskThresholdGovernancePayload,
  RiskThresholdVersion,
  ThresholdValueReviewPacket
} from "./governanceModels";

export function RiskThresholdGovernancePanel({
  data,
  busy,
  receipt,
  onRecord,
  onOwnerChoice,
  onValueReview
}: {
  data: RiskThresholdGovernancePayload;
  busy: string;
  receipt: AnyRow | null;
  onRecord: (threshold: RiskThresholdVersion, status: string, label: string) => void;
  onOwnerChoice: (packet: OwnerDecisionPacket, choice: OwnerDecisionChoice) => void;
  onValueReview: (packet: ThresholdValueReviewPacket, choice: OwnerDecisionChoice) => void;
}) {
  const policy = data.policySummary;
  const valueSummary = data.valueReviewSummary;
  return (
    <section className="surface riskThresholdPanel">
      <div className="surfaceHead">
        <div>
          <p className="eyebrow">Risk Threshold Governance</p>
          <h3>阈值版本台账</h3>
          <p>将风险分级阈值做成草稿治理版本，绑定场景、证据来源和本地决策回执；自动评分保持关闭。</p>
        </div>
        <div className="inlineBadges">
          <Badge tone="warn">草稿治理</Badge>
          <Badge>{String(data.summary.thresholdVersionCount || data.thresholdVersions.length)} 个版本</Badge>
        </div>
      </div>

      <div className="thresholdVersionGrid">
        {data.thresholdVersions.map((threshold) => (
          <article className="thresholdVersionCard" key={threshold.id}>
            <div className="thresholdVersionHead">
              <div>
                <span>{threshold.code} · {threshold.version}</span>
                <strong>{threshold.name}</strong>
              </div>
              <Badge tone={threshold.severityBand.includes("P0") ? "warn" : "blue"}>{threshold.severityBand}</Badge>
            </div>
            <p>{threshold.ruleDraft}</p>
            <div className="thresholdMetaGrid">
              <div><span>责任人</span><strong>{threshold.owner}</strong></div>
              <div><span>门禁</span><strong>{threshold.gateId}</strong></div>
              <div><span>状态</span><strong>{humanizeOperationalLabel(threshold.status)}</strong></div>
              <div><span>评分</span><strong>{humanizeOperationalLabel(threshold.activationState)}</strong></div>
            </div>
            <RefPills label="Scenario" refs={threshold.scenarioRefs} />
            <RefPills label="Metric" refs={threshold.linkedMetricIds} />
            <div className="sourceEvidenceBadges">
              <span>来源证据</span>
              {threshold.sourceEvidence.slice(0, 3).map((item) => (
                <Badge key={String(item.id)} tone={sourceEvidenceTone(String(item.evidence_level || ""))}>
                  {String(item.source_system || "")} · {humanizeOperationalLabel(item.evidence_level)}
                </Badge>
              ))}
              <small>{threshold.evidenceRefs.length} 条证据引用 · 仅本地复核</small>
            </div>
            <div className="thresholdReviewActions">
              <button disabled={Boolean(busy)} onClick={() => onRecord(threshold, "approved_for_governance_view", "批准阈值治理视图")}>
                {busy === `${threshold.id}-approved_for_governance_view` ? "记录中..." : "批准阈值治理视图"}
              </button>
              <button disabled={Boolean(busy)} onClick={() => onRecord(threshold, "sample_only", "样本展示")}>
                {busy === `${threshold.id}-sample_only` ? "记录中..." : "样本展示"}
              </button>
              <button disabled={Boolean(busy)} onClick={() => onRecord(threshold, "deferred", "暂缓启用")}>
                {busy === `${threshold.id}-deferred` ? "记录中..." : "暂缓启用"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="thresholdPolicySummary">
        <div className="surfaceHead">
          <div>
            <p className="eyebrow">Threshold Owner Choice Pack</p>
            <h3>{policy.title || "风险阈值治理策略摘要"}</h3>
            <p>把阈值值域、自动评分和异常流转拆成责任人 A/B/C 选择；推荐路径保持草稿治理和责任人复核，不开启自动评分。</p>
          </div>
          <div className="inlineBadges">
            <Badge tone="warn">{policy.recommendedPath}</Badge>
            <Badge>{data.ownerDecisionPackets.length} 个决策项</Badge>
          </div>
        </div>
        <div className="thresholdPolicyGrid">
          <div className="thresholdOwnerChoiceGrid">
            {data.ownerDecisionPackets.map((packet) => (
              <article className="thresholdOwnerChoiceCard" key={packet.id}>
                <div className="thresholdVersionHead">
                  <div>
                    <span>{packet.id} · {packet.owner}</span>
                    <strong>{packet.title}</strong>
                  </div>
                  <Badge>{packet.linkedMetricId}</Badge>
                </div>
                <p>{packet.recommendation}</p>
                <div className="decisionChoiceGrid thresholdOwnerDecisionChoices">
                  {packet.choices.map((choice) => (
                    <button
                      key={`${packet.id}-${choice.code}`}
                      disabled={Boolean(busy)}
                      onClick={() => onOwnerChoice(packet, choice)}
                    >
                      <span>{choice.code}</span>
                      <strong>{choice.label}</strong>
                    </button>
                  ))}
                </div>
                <small>{humanizeBoundary(packet.actionBoundary)}</small>
              </article>
            ))}
          </div>
          <div className="thresholdPolicyRules">
            <section>
              <strong>推荐策略</strong>
              <span>{humanizeOperationalLabel(policy.ownerChoiceStatus)}</span>
              <span>{humanizeOperationalLabel(policy.status)}</span>
              <span>{humanizeOperationalLabel(policy.scope)}</span>
            </section>
            <section>
              <strong>允许用途</strong>
              {policy.effectiveUse.map((item) => <span key={item}>{humanizeOperationalLabel(item)}</span>)}
            </section>
            <section>
              <strong>关闭动作</strong>
              {policy.closedActions.map((item) => <span key={item}>{humanizeOperationalLabel(item)}</span>)}
            </section>
          </div>
        </div>
      </section>

      <section className="thresholdValueReviewSummary">
        <div className="surfaceHead">
          <div>
            <p className="eyebrow">Threshold Value Owner Review Pack</p>
            <h3>{valueSummary.title || "真实阈值值域 Owner Review Pack"}</h3>
            <p>把真实阈值值域拆成责任人可决策的 A/B/C 选择题；当前只记录评审基线和口径校准，不批准生产阈值、不开启评分。</p>
          </div>
          <div className="inlineBadges">
            <Badge tone="warn">{valueSummary.recommendedPath || "A-A-A-A-A"}</Badge>
            <Badge>{data.valueReviewPackets.length} 类阈值</Badge>
          </div>
        </div>
        <div className="thresholdPolicyGrid">
          <div className="thresholdValueReviewGrid">
            {data.valueReviewPackets.map((packet) => (
              <article className="thresholdValueReviewCard" key={packet.id}>
                <div className="thresholdVersionHead">
                  <div>
                    <span>{packet.id} · {packet.owner}</span>
                    <strong>{packet.title}</strong>
                  </div>
                  <Badge tone={packet.severityBand.includes("P0") ? "warn" : "blue"}>{humanizeOperationalLabel(packet.approvalState)}</Badge>
                </div>
                <p>{packet.thresholdName}</p>
                <div className="thresholdValueFacts">
                  <div><span>触发条件</span><strong>{packet.suggestedRange.triggerExpression}</strong></div>
                  <div><span>评审区间</span><strong>{packet.suggestedRange.reviewBand}</strong></div>
                  <div><span>校准需求</span><strong>{humanizeOperationalLabel(packet.suggestedRange.calibrationNeed)}</strong></div>
                </div>
                <small>{packet.currentRuleDraft}</small>
                <RefPills label="Scenario" refs={packet.scenarioRefs} />
                <RefPills label="Metric" refs={packet.metricRefs} />
                <div className="decisionChoiceGrid thresholdValueActions">
                  {packet.choices.map((choice) => (
                    <button
                      key={`${packet.id}-${choice.code}`}
                      disabled={Boolean(busy)}
                      onClick={() => onValueReview(packet, choice)}
                    >
                      <span>{choice.code}</span>
                      <strong>{choice.label}</strong>
                    </button>
                  ))}
                </div>
                <small>{humanizeBoundary(packet.actionBoundary)}</small>
              </article>
            ))}
          </div>
          <div className="thresholdValueSummaryRules">
            <section>
              <strong>值域评审状态</strong>
              <span>{humanizeOperationalLabel(valueSummary.ownerValueStatus)}</span>
              <span>{humanizeOperationalLabel(valueSummary.status)}</span>
              <span>{humanizeOperationalLabel(valueSummary.scope)}</span>
            </section>
            <section>
              <strong>允许用途</strong>
              {valueSummary.effectiveUse.map((item) => <span key={item}>{humanizeOperationalLabel(item)}</span>)}
            </section>
            <section>
              <strong>关闭动作</strong>
              {valueSummary.closedActions.map((item) => <span key={item}>{humanizeOperationalLabel(item)}</span>)}
            </section>
            <section>
              <strong>正式批准回执</strong>
              <span>{valueSummary.formalApprovalReceiptCount}</span>
            </section>
          </div>
        </div>
      </section>

      <div className="thresholdBindingGrid">
        <section>
          <div className="object360ListHead">
            <strong>场景绑定</strong>
            <Badge>{data.scenarioBindings.length}</Badge>
          </div>
          <div className="thresholdBindingList">
            {data.scenarioBindings.map((binding) => (
              <article key={binding.scenarioId}>
                <span>{binding.priority} · {binding.targetObjectType}</span>
                <strong>{binding.scenarioName}</strong>
                <p>{binding.boundThresholdNames.join(" / ")}</p>
                <small>{humanizeOperationalLabel(binding.operationalScoring)} · {binding.ownerGate}</small>
              </article>
            ))}
          </div>
        </section>
        <section>
          <div className="object360ListHead">
            <strong>最近阈值复核</strong>
            <Badge>{data.latestThresholdReviews.length}</Badge>
          </div>
          {receipt ? (
            <div className="decisionReceipt thresholdReceipt">
              <span>阈值复核回执</span>
              <strong>{String(receipt.insight_title || "")}</strong>
              <p>{humanizeOperationalLabel(receipt.status)} · {humanizeBoundary(receipt.action_boundary)}</p>
            </div>
          ) : null}
          <DataTable rows={data.latestThresholdReviews.slice(0, 5)} columns={["id", "subject_ref", "status", "review_note"]} />
        </section>
      </div>
    </section>
  );
}

export function FinanceCostGovernancePanel({
  data,
  busy,
  receipt,
  onRecord,
  onOwnerChoice
}: {
  data: FinanceCostGovernancePayload;
  busy: string;
  receipt: AnyRow | null;
  onRecord: (packet: FinanceCostEvidencePacket, status: string, label: string) => void;
  onOwnerChoice: (packet: OwnerDecisionPacket, choice: OwnerDecisionChoice) => void;
}) {
  const policy = data.policySummary;
  return (
    <section className="surface financeCostPanel">
      <div className="surfaceHead">
        <div>
          <p className="eyebrow">Finance Cost Evidence</p>
          <h3>财务成本 owner review 包</h3>
          <p>把 OMS 费用统计、履约成本、仓储成本、退货成本和成本异常阈值串成本地治理证据；账单钻取和交易明细导入保持关闭。</p>
        </div>
        <div className="inlineBadges">
          <Badge tone="warn">财务责任人待确认</Badge>
          <Badge>{data.evidencePackets.length} 个证据包</Badge>
        </div>
      </div>

      <div className="financeCostGrid">
        {data.evidencePackets.map((packet) => (
          <article className="financeCostCard" key={packet.id}>
            <div className="financeCostHead">
              <div>
                <span>{packet.id} · {packet.costDomain}</span>
                <strong>{packet.title}</strong>
              </div>
              <Badge tone="blue">{humanizeOperationalLabel(packet.evidenceLevel)}</Badge>
            </div>
            <p>{packet.nextOwnerDecision}</p>
            <div className="financeMetaGrid">
              <div><span>责任人</span><strong>{packet.owner}</strong></div>
              <div><span>对象</span><strong>{packet.targetObjectType}</strong></div>
              <div><span>门禁</span><strong>{packet.reviewGate}</strong></div>
              <div><span>状态</span><strong>{humanizeOperationalLabel(packet.status)}</strong></div>
            </div>
            <RefPills label="Cost type" refs={packet.costTypes} />
            <RefPills label="Target field" refs={packet.targetProperties} />
            <div className="sourceEvidenceBadges">
              <span>来源证据</span>
              {packet.sourceEvidence.map((item) => (
                <Badge key={String(item.id)} tone={sourceEvidenceTone(String(item.evidence_level || ""))}>
                  {String(item.source_system || "")} · {String(item.source_surface || "")}
                </Badge>
              ))}
              <small>{packet.sourceRefs.length} 条来源引用 · 未开启账单钻取</small>
            </div>
            <div className="financeReviewActions">
              <button disabled={Boolean(busy)} onClick={() => onRecord(packet, "approved_for_governance_view", "批准财务治理视图")}>
                {busy === `${packet.id}-approved_for_governance_view` ? "记录中..." : "批准财务治理视图"}
              </button>
              <button disabled={Boolean(busy)} onClick={() => onRecord(packet, "needs_bill_drilldown", "需要账单钻取")}>
                {busy === `${packet.id}-needs_bill_drilldown` ? "记录中..." : "需要账单钻取"}
              </button>
              <button disabled={Boolean(busy)} onClick={() => onRecord(packet, "deferred", "暂缓成本口径")}>
                {busy === `${packet.id}-deferred` ? "记录中..." : "暂缓成本口径"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="financePolicySummary">
        <div className="surfaceHead">
          <div>
            <p className="eyebrow">Finance Cost Policy Summary</p>
            <h3>{policy.title || "财务成本治理政策摘要"}</h3>
            <p>{policy.ownerChoice === "A-A-A-A"
              ? "把已授权的 A-A-A-A 转成可读规则：费用口径进入治理视图，账单钻取、交易明细、会计写入和生产同步保持关闭。"
              : "按实际责任人回执呈现受限政策；未获批准或未识别的用途不生效，写入与外部副作用继续关闭。"}</p>
          </div>
          <div className="inlineBadges">
            <Badge tone={policy.ownerChoice === "A-A-A-A" ? "good" : "warn"}>{policy.ownerChoice}</Badge>
            <Badge>{policy.receiptCount} 条回执</Badge>
          </div>
        </div>
        <div className="financePolicyGrid">
          <div className="financePolicyDecisionList">
            {policy.decisions.map((decision) => (
              <article key={decision.packetId}>
                <span>{decision.packetId} · {decision.selectedChoice}</span>
                <strong>{decision.title}</strong>
                <p>{decision.policy}</p>
                <small>{humanizeOperationalLabel(decision.recordedStatus)} · {decision.receiptId || "待责任人确认"}</small>
              </article>
            ))}
          </div>
          <div className="financePolicyRules">
            <section>
              <strong>允许用途</strong>
              {policy.effectiveUse.map((item) => <span key={item}>{humanizeOperationalLabel(item)}</span>)}
            </section>
            <section>
              <strong>关闭动作</strong>
              {policy.closedActions.map((item) => <span key={item}>{humanizeOperationalLabel(item)}</span>)}
            </section>
            <section>
              <strong>证据引用</strong>
              {policy.evidenceRefs.map((item) => <span key={item}>{item}</span>)}
            </section>
          </div>
        </div>
      </section>

      <section className="financeOwnerChoicePack">
        <div className="surfaceHead">
          <div>
            <p className="eyebrow">Finance Owner Choice Pack</p>
            <h3>财务 owner 四步决策</h3>
            <p>把费用口径、账单钻取、交易明细导入和对账规则拆成 A/B/C 选择；所有选择只写本地台账。</p>
          </div>
          <Badge tone="warn">{data.ownerDecisionPackets.length} 个决策项</Badge>
        </div>
        <div className="financeOwnerChoiceGrid">
          {data.ownerDecisionPackets.map((packet) => (
            <article className="financeOwnerChoiceCard" key={packet.id}>
              <div className="financeCostHead">
                <div>
                  <span>{packet.id} · {packet.owner}</span>
                  <strong>{packet.title}</strong>
                </div>
                <Badge>{packet.linkedMetricId}</Badge>
              </div>
              <p>{packet.recommendation}</p>
              <div className="decisionChoiceGrid financeOwnerDecisionChoices">
                {packet.choices.map((choice) => (
                  <button
                    key={`${packet.id}-${choice.code}`}
                    disabled={Boolean(busy)}
                    onClick={() => onOwnerChoice(packet, choice)}
                  >
                    <span>{choice.code}</span>
                    <strong>{choice.label}</strong>
                  </button>
                ))}
              </div>
              <small>{humanizeBoundary(packet.actionBoundary)}</small>
            </article>
          ))}
        </div>
      </section>

      <div className="financeCostLedgerGrid">
        <section>
          <div className="object360ListHead">
            <strong>对账 Gate</strong>
            <Badge>{data.reconciliationGates.length}</Badge>
          </div>
          <div className="financeGateList">
            {data.reconciliationGates.map((gate) => (
              <article key={gate.id}>
                <span>{gate.id} · {humanizeOperationalLabel(gate.status)}</span>
                <strong>{gate.name}</strong>
                <p>{gate.reason}</p>
              </article>
            ))}
          </div>
        </section>
        <section>
          <div className="object360ListHead">
            <strong>成本异常阈值</strong>
            <Badge>{data.costThresholds.length}</Badge>
          </div>
          <div className="financeGateList">
            {data.costThresholds.map((threshold) => (
              <article key={threshold.id}>
                <span>{threshold.version} · {threshold.severityBand}</span>
                <strong>{threshold.name}</strong>
                <p>{threshold.ruleDraft}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="financeCostLedgerGrid">
        <section>
          <div className="object360ListHead">
            <strong>来源血缘</strong>
            <Badge>{data.financeLineage.length}</Badge>
          </div>
          <DataTable rows={data.financeLineage} columns={["source_coverage_id", "source_surface", "target_object_type", "api_candidate", "import_gate"]} />
        </section>
        <section>
          <div className="object360ListHead">
            <strong>财务复核台账</strong>
            <Badge>{data.latestFinanceReviews.length}</Badge>
          </div>
          {receipt ? (
            <div className="decisionReceipt financeReceipt">
              <span>{String(receipt.subject_ref || receipt.linked_metric_id || "").startsWith("finance_owner.") ? "财务责任人选择回执" : "财务成本回执"}</span>
              <strong>{String(receipt.insight_title || "")}</strong>
              <p>{humanizeOperationalLabel(receipt.status)} · {humanizeBoundary(receipt.action_boundary)}</p>
            </div>
          ) : null}
          <DataTable rows={data.latestFinanceReviews.slice(0, 5)} columns={["id", "subject_ref", "status", "review_note"]} />
        </section>
      </div>
    </section>
  );
}
