"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DashboardExportProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: { key: string; header: string }[];
}

export function DashboardExport({
  data,
  filename,
  columns,
}: DashboardExportProps) {
  function handleExport() {
    const header = columns.map((c) => c.header).join(",");
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const val = String(row[c.key] ?? "");
          if (val.includes(",") || val.includes('"') || val.includes("\n")) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(",")
    );

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (data.length === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      className="gap-1.5 text-gray-500 hover:text-gray-700"
    >
      <Download className="h-3.5 w-3.5" />
      CSV
    </Button>
  );
}
