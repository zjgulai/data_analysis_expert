import {
  AgentRunList,
  AgentTraceList,
  RecommendationCardList,
  SourceCoverageList,
  type AgentRun,
  type AgentTrace,
  type RecommendationCard,
  type SourceCoverage
} from "./agentActivityLists";
import { Object360List } from "./detailPrimitives";
import {
  Badge,
  cellValue,
  columnLabels,
  humanizeOperationalLabel,
  type AnyRow
} from "../shared/ui";

type AgentTraceStep = {
  step: string;
  status: string;
  summary: string;
};

type ObjectInstance = AnyRow & {
  id: string;
  object_type_id: string;
  business_key: string;
  display_name: string;
  status: string;
  owner: string;
  properties: string;
  propertiesJson?: Record<string, unknown>;
  source_system: string;
  evidence_level: string;
  created_at: string;
};

type AipScenario = AnyRow & {
  id: string;
  name: string;
  scenario_type: string;
  priority: string;
  status: string;
  owner: string;
  trigger_condition: string;
  target_object_type: string;
  target_object_id: string;
  diagnostic_question: string;
  decision_boundary: string;
  evidence_level: string;
  next_action: string;
  linkedMetricIds: string[];
  linkedKnowledgeCardIds: string[];
  linkedRecommendationCardIds: string[];
  targetInstance?: ObjectInstance | null;
  recommendationCards?: RecommendationCard[];
  agentRuns?: AgentRun[];
};

type Object360 = {
  object: AnyRow;
  outboundLinks: AnyRow[];
  inboundLinks: AnyRow[];
  tags: AnyRow[];
  dimensions: AnyRow[];
  metrics: AnyRow[];
  tasks: AnyRow[];
  recommendations?: RecommendationCard[];
  traces?: AgentTrace[];
  agentRuns?: AgentRun[];
  sourceCoverage?: SourceCoverage[];
  summary: Record<string, number>;
};

type ObjectInstance360 = {
  instance: ObjectInstance;
  outboundLinks: AnyRow[];
  inboundLinks: AnyRow[];
  scenarios: AipScenario[];
  recommendations: RecommendationCard[];
  agentRuns: AgentRun[];
  sourceCoverage?: SourceCoverage[];
  summary: Record<string, number>;
};

export function Object360Section({
  data
}: {
  data: Object360;
}) {
  const statCards: Array<[string, number]> = [
    ["关系", data.summary.relationCount || 0],
    ["标签", data.summary.tagCount || 0],
    ["维度", data.summary.dimensionCount || 0],
    ["指标", data.summary.metricCount || 0],
    ["任务", data.summary.taskCount || 0],
    ["建议卡", data.summary.recommendationCount || 0],
    ["证据链", data.summary.traceCount || 0],
    ["运行记录", data.summary.agentRunCount || 0],
    ["来源覆盖", data.summary.sourceCoverageCount || 0]
  ];

  return (
    <section className="drawerSection object360">
      <div className="object360Head">
        <div>
          <p className="eyebrow">Object 360</p>
          <h3>对象关联视图</h3>
        </div>
        <Badge tone="blue">只读</Badge>
      </div>
      <div className="object360Stats">
        {statCards.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="object360Grid">
        <Object360List title="出向关系" rows={data.outboundLinks} columns={["link_type", "target_object_id", "business_meaning"]} />
        <Object360List title="入向关系" rows={data.inboundLinks} columns={["source_object_id", "link_type", "business_meaning"]} />
        <Object360List title="适用标签" rows={data.tags} columns={["name", "tag_type", "lifecycle_status"]} />
        <Object360List title="绑定维度" rows={data.dimensions} columns={["name", "dimension_type", "hierarchy"]} />
        <Object360List title="关联指标" rows={data.metrics} columns={["code", "name", "level", "certification_status"]} />
        <Object360List title="治理任务" rows={data.tasks} columns={["task_type", "title", "status", "priority"]} />
        <SourceCoverageList title="来源覆盖" coverage={data.sourceCoverage || []} />
        <AgentTraceList traces={data.traces || []} />
      </div>
      <div className="object360Followup">
        <AgentRunList runs={data.agentRuns || []} title="对象运行记录" />
        <div className="object360ListHead">
          <strong>关联推荐动作卡</strong>
          <Badge>{data.recommendations?.length || 0}</Badge>
        </div>
        <RecommendationCardList cards={data.recommendations || []} />
      </div>
    </section>
  );
}

export function ObjectInstance360Section({
  data
}: {
  data: ObjectInstance360;
}) {
  const properties = data.instance.propertiesJson || {};
  const statCards: Array<[string, number]> = [
    ["实例关系", data.summary.relationCount || 0],
    ["AIP 场景", data.summary.scenarioCount || 0],
    ["建议卡", data.summary.recommendationCount || 0],
    ["运行记录", data.summary.agentRunCount || 0],
    ["来源覆盖", data.summary.sourceCoverageCount || 0]
  ];

  return (
    <section className="drawerSection object360 instance360">
      <div className="object360Head">
        <div>
          <p className="eyebrow">Object instance 360</p>
          <h3>关键对象实例视图</h3>
        </div>
        <Badge tone={data.instance.status.includes("risk") || data.instance.status.includes("exception") ? "warn" : "blue"}>
          {humanizeOperationalLabel(data.instance.status)}
        </Badge>
      </div>
      <div className="instanceHero">
        <div>
          <span>实例</span>
          <strong>{data.instance.display_name}</strong>
          <small>{data.instance.object_type_id} · {data.instance.business_key}</small>
        </div>
        <div>
          <span>责任人</span>
          <strong>{data.instance.owner}</strong>
          <small>{data.instance.source_system} · {humanizeOperationalLabel(data.instance.evidence_level)}</small>
        </div>
      </div>
      <div className="object360Stats">
        {statCards.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="instancePropertyGrid">
        {Object.entries(properties).map(([key, value]) => (
          <div key={key}>
            <span>{columnLabels[key] || key}</span>
            <strong>{cellValue(value)}</strong>
          </div>
        ))}
      </div>
      <div className="object360Grid">
        <Object360List title="出向实例关系" rows={data.outboundLinks} columns={["link_type", "target_instance_id", "evidence_level", "note"]} />
        <Object360List title="入向实例关系" rows={data.inboundLinks} columns={["source_instance_id", "link_type", "evidence_level", "note"]} />
        <Object360List title="关联 AIP 场景" rows={data.scenarios} columns={["name", "priority", "status", "next_action"]} />
        <SourceCoverageList title="实例来源覆盖" coverage={data.sourceCoverage || []} />
      </div>
      <div className="object360Followup">
        <div className="object360ListHead">
          <strong>关联推荐动作卡</strong>
          <Badge>{data.recommendations.length}</Badge>
        </div>
        <RecommendationCardList cards={data.recommendations} />
        <AgentRunList runs={data.agentRuns || []} title="实例运行记录" />
      </div>
    </section>
  );
}
