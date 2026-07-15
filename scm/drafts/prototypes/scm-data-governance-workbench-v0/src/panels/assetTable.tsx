import { useState, type ComponentType } from "react";
import { DataTable, rowKey, type AnyRow } from "../shared/ui";
import { ExportButton, type ExportFormat, type ExportJob } from "./exportControls";

export type AssetDetailDrawerProps = {
  row: AnyRow | null;
  targetType: string;
  targetId: string;
  onClose: () => void;
  onOpenLinkedAsset?: (targetType: string, targetId: string) => void;
};

export type AssetTableProps = {
  title: string;
  rows: AnyRow[];
  columns: string[];
  assetType: string;
  targetType: string;
  empty?: string;
  DetailDrawerComponent: ComponentType<AssetDetailDrawerProps>;
  onExport: (assetType: string, format: ExportFormat, filters: Record<string, unknown>) => Promise<ExportJob>;
};

export function AssetTable({
  title,
  rows,
  columns,
  assetType,
  targetType,
  empty,
  DetailDrawerComponent,
  onExport
}: AssetTableProps) {
  const [selected, setSelected] = useState<{ row: AnyRow; targetType: string } | null>(null);
  const selectedRow = selected?.row || null;
  const selectedTargetType = selected?.targetType || targetType;
  const selectedId = selectedRow ? rowKey(selectedRow) : "";
  const targetId = selectedId;

  return (
    <div className="surface assetSurface">
      <div className="surfaceHead">
        <div>
          <h3>{title}</h3>
          <p>{rows.length} 条资产 · 点击行打开详情、注解和修订建议</p>
        </div>
        <ExportButton assetType={assetType} onExport={onExport} />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        empty={empty}
        selectedId={selectedId}
        onRowSelect={(row) => setSelected({ row, targetType })}
      />
      <DetailDrawerComponent
        row={selectedRow}
        targetType={selectedTargetType}
        targetId={targetId}
        onClose={() => setSelected(null)}
        onOpenLinkedAsset={(linkedTargetType, linkedTargetId) =>
          setSelected({
            targetType: linkedTargetType,
            row: { id: linkedTargetId, name: linkedTargetId, title: linkedTargetId }
          })
        }
      />
    </div>
  );
}
