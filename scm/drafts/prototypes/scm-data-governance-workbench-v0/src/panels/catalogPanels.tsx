import { useState, type ReactElement } from "react";
import {
  Badge,
  ModuleHeader,
  WorkflowStrip,
  type AnyRow
} from "../shared/ui";

type CatalogModule = {
  code: string;
  title: string;
  focus: string;
  stage: string;
  status: string;
  primaryMetric: string;
  secondaryMetric: string;
};

export type CatalogAssetTableProps = {
  title: string;
  rows: AnyRow[];
  columns: string[];
  assetType: string;
  targetType: string;
  empty?: string;
};

type CatalogAssetTableComponent = (props: CatalogAssetTableProps) => ReactElement;

export function OntologyCatalogPanel({
  module,
  objects,
  links,
  instances,
  instanceLinks,
  errorMessage,
  AssetTable
}: {
  module: CatalogModule;
  objects: AnyRow[];
  links: AnyRow[];
  instances: AnyRow[];
  instanceLinks: AnyRow[];
  errorMessage?: string;
  AssetTable: CatalogAssetTableComponent;
}) {
  const [view, setView] = useState<"types" | "instances">("types");
  const liveModule = {
    ...module,
    primaryMetric: `${objects.length} object types`,
    secondaryMetric: `${instances.length} instances`
  };
  return (
    <section className="panel">
      <ModuleHeader module={liveModule} />
      <WorkflowStrip steps={["浏览对象类型", "核查关键实例", "打开 360 抽屉", "注解/修订建议", "导出对象资产"]} />
      <div className="segmentedTabs">
        <button className={view === "types" ? "active" : ""} onClick={() => setView("types")}>对象类型图谱</button>
        <button className={view === "instances" ? "active" : ""} onClick={() => setView("instances")}>关键实例治理</button>
      </div>
      {errorMessage ? <div className="error">{errorMessage}</div> : null}
      {view === "types" ? (
        <div className="split">
          <AssetTable
            title="对象类型"
            rows={objects}
            columns={["id", "name", "object_type", "grain", "owner", "status"]}
            assetType="ontology_objects"
            targetType="ontology_object"
          />
          <AssetTable
            title="对象关系"
            rows={links}
            columns={["source_object_id", "link_type", "target_object_id", "business_meaning", "status"]}
            assetType="ontology_links"
            targetType="ontology_link"
          />
        </div>
      ) : (
        <div className="split">
          <AssetTable
            title="关键对象实例"
            rows={instances}
            columns={["id", "display_name", "object_type_id", "business_key", "status", "owner", "source_system", "evidence_level"]}
            assetType="ontology_object_instances"
            targetType="object_instance"
          />
          <AssetTable
            title="实例关系"
            rows={instanceLinks}
            columns={["source_instance_id", "link_type", "target_instance_id", "evidence_level", "note"]}
            assetType="ontology_instance_links"
            targetType="ontology_instance_link"
          />
        </div>
      )}
    </section>
  );
}

export function TagsCatalogPanel({
  module,
  tags,
  AssetTable
}: {
  module: CatalogModule;
  tags: AnyRow[];
  AssetTable: CatalogAssetTableComponent;
}) {
  return (
    <section className="panel">
      <ModuleHeader module={module} />
      <WorkflowStrip />
      <AssetTable
        title="标签资产"
        rows={tags}
        columns={["id", "name", "tag_type", "target_object_id", "rule_expression", "lifecycle_status", "owner", "quality_status"]}
        assetType="tags"
        targetType="tag"
      />
    </section>
  );
}

export function DimensionsCatalogPanel({
  module,
  dimensions,
  AssetTable
}: {
  module: CatalogModule;
  dimensions: AnyRow[];
  AssetTable: CatalogAssetTableComponent;
}) {
  return (
    <section className="panel">
      <ModuleHeader module={module} />
      <WorkflowStrip />
      <AssetTable
        title="维度资产"
        rows={dimensions}
        columns={["id", "name", "dimension_type", "hierarchy", "bound_object_id", "lifecycle_status", "owner"]}
        assetType="dimensions"
        targetType="dimension"
      />
    </section>
  );
}

export function MetricsCatalogPanel({
  module,
  dictionary = false,
  query,
  metrics,
  onQueryChange,
  AssetTable
}: {
  module: CatalogModule;
  dictionary?: boolean;
  query: string;
  metrics: AnyRow[];
  onQueryChange: (value: string) => void;
  AssetTable: CatalogAssetTableComponent;
}) {
  const l3Count = metrics.filter((metric) => String(metric.level || "") === "L3").length;
  return (
    <section className="panel">
      <ModuleHeader module={module} />
      <WorkflowStrip steps={dictionary ? ["检索口径", "查看指标详情", "注解口径边界", "提交修订建议", "导出字典"] : undefined} />
      <div className="toolbar">
        <div className="searchBox">
          <span>Search</span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="指标、code、口径" />
        </div>
        <Badge tone="blue">{l3Count} L3 visible</Badge>
      </div>
      <AssetTable
        title={dictionary ? "指标字典 2.0" : "指标工程资产"}
        rows={metrics}
        columns={["code", "name", "level", "metric_type", "l1_domain", "l2_group", "lifecycle_status", "certification_status", "owner"]}
        assetType="metrics"
        targetType="metric"
      />
    </section>
  );
}
