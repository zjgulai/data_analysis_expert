import { useState } from "react";

export type ExportFormat = "json" | "csv" | "excel";

export type ExportJob = {
  downloadUrl: string;
  file_name: string;
};

export function ExportButton({
  assetType,
  filters = {},
  onExport
}: {
  assetType: string;
  filters?: Record<string, unknown>;
  onExport: (assetType: string, format: ExportFormat, filters: Record<string, unknown>) => Promise<ExportJob>;
}) {
  const [running, setRunning] = useState<ExportFormat | "">("");

  async function exportAsset(format: ExportFormat) {
    setRunning(format);
    try {
      const exportJob = await onExport(assetType, format, filters);
      const anchor = document.createElement("a");
      anchor.href = exportJob.downloadUrl;
      anchor.download = exportJob.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setRunning("");
    }
  }

  return (
    <div className="exportButtons">
      <button onClick={() => exportAsset("json")} disabled={Boolean(running)}>
        {running === "json" ? "导出中..." : "导出 JSON"}
      </button>
      <button onClick={() => exportAsset("csv")} disabled={Boolean(running)}>
        {running === "csv" ? "导出中..." : "导出 CSV"}
      </button>
      <button onClick={() => exportAsset("excel")} disabled={Boolean(running)}>
        {running === "excel" ? "导出中..." : "导出 Excel"}
      </button>
    </div>
  );
}
