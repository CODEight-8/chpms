import { notFound } from "next/navigation";
import { formatLKR } from "@/lib/currency";
import { calculateBatchAging } from "@/lib/aging";
import { getBatchDetail } from "@/lib/queries/production-batches";
import { PrintLayout } from "@/components/shared/print-layout";

export default async function ProductionReportPage({
  params,
}: {
  params: { id: string };
}) {
  const batch = await getBatchDetail(params.id);
  if (!batch) notFound();

  const gradeLabels: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    REJECT: "Rej",
  };

  return (
    <div className="pt-6">
      <PrintLayout backHref={`/production/${batch.id}`}>
        <div className="p-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center border-b-2 border-emerald-700 pb-4 mb-6">
            <h1 className="text-xl font-bold text-emerald-900">
              T C Liyanage
            </h1>
            <p className="text-sm text-gray-500">
              Coconut Husk Processing Management System
            </p>
            <h2 className="text-lg font-bold mt-3">PRODUCTION OUTPUT REPORT</h2>
          </div>

          {/* Batch Reference */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">
                Batch Number
              </p>
              <p className="text-lg font-bold font-mono">{batch.batchNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">
                Product
              </p>
              <p className="text-lg font-bold">{batch.product.name}</p>
            </div>
          </div>

          {/* Batch Info */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Batch Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ReportField
                label="Started"
                value={new Date(batch.startedAt).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
              <ReportField
                label="Completed"
                value={
                  batch.completedAt
                    ? new Date(batch.completedAt).toLocaleDateString("en-LK", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "In Progress"
                }
              />
              <ReportField
                label="Status"
                value={batch.status.replace("_", " ")}
              />
              <ReportField
                label="Total Input Husks"
                value={`${batch.totalInputHusks.toLocaleString()} husks`}
              />
            </div>
          </div>

          {/* Output Section */}
          <div className="mb-6 border-2 border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Production Output
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center py-3">
              <div>
                <p className="text-xs text-gray-500">Input</p>
                <p className="text-2xl font-bold text-gray-700">
                  {batch.totalInputHusks.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">husks</p>
              </div>
              <div className="flex items-center justify-center text-2xl text-gray-400">
                →
              </div>
              <div>
                <p className="text-xs text-gray-500">Output</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {batch.outputQuantity
                    ? Number(batch.outputQuantity).toLocaleString()
                    : "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {batch.outputUnit || "pending"}
                </p>
              </div>
            </div>
          </div>

          {/* Supplier Lots Table */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Supplier Lots Used
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-bold text-gray-700">
                    Lot #
                  </th>
                  <th className="text-left py-2 font-bold text-gray-700">
                    Supplier
                  </th>
                  <th className="text-center py-2 font-bold text-gray-700">
                    Grade
                  </th>
                  <th className="text-center py-2 font-bold text-gray-700">
                    Aging
                  </th>
                  <th className="text-center py-2 font-bold text-gray-700">
                    Husks
                  </th>
                  <th className="text-right py-2 font-bold text-gray-700">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {batch.batchLots.map((bl) => (
                  <tr key={bl.id} className="border-b border-gray-200">
                    <td className="py-2 font-mono text-xs">
                      {bl.supplierLot.lotNumber}
                    </td>
                    <td className="py-2">{bl.supplierLot.supplier.name}</td>
                    <td className="py-2 text-center">
                      {bl.supplierLot.qualityGrade
                        ? gradeLabels[bl.supplierLot.qualityGrade]
                        : "—"}
                    </td>
                    <td className="py-2 text-center">
                      {calculateBatchAging(bl.supplierLot.harvestDate)}d
                    </td>
                    <td className="py-2 text-center">
                      {bl.quantityUsed.toLocaleString()}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatLKR(
                        bl.quantityUsed * Number(bl.supplierLot.perHuskRate)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost Summary */}
          <div className="border-t-2 border-emerald-700 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">
                TOTAL RAW MATERIAL COST
              </span>
              <span className="text-2xl font-bold text-emerald-900">
                {formatLKR(batch.totalRawCost)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {batch.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                {batch.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 mt-8 text-xs text-gray-400 flex justify-between">
            <span>
              Generated: {new Date().toLocaleDateString("en-LK")} at{" "}
              {new Date().toLocaleTimeString("en-LK")}
            </span>
            <span>CHPMS — T C Liyanage</span>
          </div>
        </div>
      </PrintLayout>
    </div>
  );
}

function ReportField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
