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

  // ── Completeness audit ───────────────────────────────────────────────
  // Each entry: { label, ok, note (when missing) }. The completeness panel
  // at the top of the report surfaces every missing field so the operator
  // knows exactly what is — and is not — covered.
  const isCompleted = batch.status === "COMPLETED";
  const hasOutput =
    batch.outputQuantity !== null && batch.outputQuantity !== undefined;
  const hasQuality =
    batch.qualityScore !== null &&
    batch.qualityScore !== undefined &&
    !!batch.qualityGrade;
  const hasAdditionalCost =
    batch.additionalCost !== null &&
    batch.additionalCost !== undefined &&
    Number(batch.additionalCost) > 0;
  const hasFulfillments = batch.fulfillments.length > 0;
  const additionalCostReceipt = batch.miscTransactions.find(
    (m) => m.direction === "OUT"
  );

  const audit: Array<{ label: string; ok: boolean; note: string }> = [
    {
      label: "Batch completed",
      ok: isCompleted,
      note: "Batch is still in progress. Output and quality have not been recorded yet.",
    },
    {
      label: "Output quantity recorded",
      ok: hasOutput,
      note: "No output quantity captured — complete the batch to record kg produced.",
    },
    {
      label: "Quality score & grade recorded",
      ok: hasQuality,
      note: "No quality data captured — complete the batch to record score and grade.",
    },
    {
      label: "Additional cost recorded",
      ok: hasAdditionalCost,
      note: "No additional cost entered at completion (labor, electricity, fuel, packaging are not reflected in this report).",
    },
    {
      label: "Used in customer orders",
      ok: hasFulfillments,
      note: "Batch has not yet been used in any orders — revenue and profit cannot be calculated.",
    },
  ];

  const allComplete = audit.every((a) => a.ok);
  const missingItems = audit.filter((a) => !a.ok);

  // Computed cost summary using the SAME formula as analytics and order
  // detail: total production cost = raw material + additional operating cost.
  const rawCost = Number(batch.totalRawCost);
  const addCost = Number(batch.additionalCost ?? 0);
  const totalCost = rawCost + addCost;

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

          {/* Report Completeness — surfaces every nullable field so the
              reader knows exactly what is covered and what is missing. */}
          <div
            className={`mb-6 rounded-lg p-4 border ${
              allComplete
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold uppercase text-gray-700">
                Report Completeness
              </h3>
              <span
                className={`text-xs font-bold uppercase ${
                  allComplete ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {allComplete
                  ? "All fields present"
                  : `${missingItems.length} field(s) missing`}
              </span>
            </div>
            <ul className="space-y-1 text-xs">
              {audit.map((a) => (
                <li key={a.label} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 font-bold ${
                      a.ok ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {a.ok ? "✓" : "○"}
                  </span>
                  <div>
                    <span className="font-medium text-gray-800">{a.label}</span>
                    {!a.ok && (
                      <p className="text-gray-600">{a.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
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
                    : "Not yet completed"
                }
                missing={!batch.completedAt}
              />
              <ReportField
                label="Status"
                value={batch.status.replace("_", " ")}
              />
              <ReportField
                label="Total Input Husks"
                value={`${batch.totalInputHusks.toLocaleString()} husks`}
              />
              <ReportField
                label="Quality Score"
                value={
                  batch.qualityScore !== null && batch.qualityScore !== undefined
                    ? `${Number(batch.qualityScore)}%`
                    : "Not yet scored"
                }
                missing={batch.qualityScore === null || batch.qualityScore === undefined}
              />
              <ReportField
                label="Quality Grade"
                value={batch.qualityGrade ?? "Not yet assigned"}
                missing={!batch.qualityGrade}
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
                <p
                  className={`text-2xl font-bold ${
                    hasOutput ? "text-emerald-700" : "text-amber-600"
                  }`}
                >
                  {hasOutput
                    ? Number(batch.outputQuantity).toLocaleString()
                    : "Not yet recorded"}
                </p>
                <p className="text-xs text-gray-500">
                  {batch.outputUnit || "pending completion"}
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
                        : "-"}
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

          {/* Cost Summary — now shows the full breakdown: raw + additional. */}
          <div className="border-t-2 border-emerald-700 pt-4 mb-6">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Raw material cost</span>
                <span className="font-medium">{formatLKR(rawCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Additional cost{" "}
                  {additionalCostReceipt && (
                    <span className="text-xs text-gray-400">
                      ({additionalCostReceipt.receiptNumber})
                    </span>
                  )}
                </span>
                <span
                  className={`font-medium ${
                    !hasAdditionalCost ? "text-gray-400 italic" : ""
                  }`}
                >
                  {hasAdditionalCost ? formatLKR(addCost) : "Not recorded"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-base font-bold text-gray-900">
                  TOTAL PRODUCTION COST
                </span>
                <span className="text-xl font-bold text-emerald-900">
                  {formatLKR(totalCost)}
                </span>
              </div>
            </div>
          </div>

          {/* Used-In-Orders */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Used in Orders
            </h3>
            {hasFulfillments ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 font-bold text-gray-700">
                      Order #
                    </th>
                    <th className="text-left py-2 font-bold text-gray-700">
                      Client
                    </th>
                    <th className="text-right py-2 font-bold text-gray-700">
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batch.fulfillments.map((f) => (
                    <tr key={f.id} className="border-b border-gray-200">
                      <td className="py-2 font-mono text-xs">
                        {f.orderItem.order.orderNumber}
                      </td>
                      <td className="py-2">
                        {f.orderItem.order.client.name}
                      </td>
                      <td className="py-2 text-right">
                        {Number(f.quantityFulfilled).toLocaleString()} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs italic text-gray-500 bg-gray-50 rounded p-3">
                Not yet used in any orders. Revenue and profit per batch cannot
                be calculated until at least one order is fulfilled from this
                batch.
              </p>
            )}
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

          {/* Limitations footer — what CHPMS v1.0 does NOT track explicitly,
              so the reader does not infer the absence is a data issue. */}
          <div className="mb-6 rounded border border-dashed border-gray-300 bg-gray-50 p-3">
            <p className="text-xs font-bold text-gray-600 uppercase mb-1">
              Not tracked in this report
            </p>
            <p className="text-xs text-gray-500">
              Energy, labor hours, and equipment downtime are not tracked per
              batch in CHPMS v1.0. Any of these expenses entered during batch
              completion are aggregated into the single &ldquo;Additional
              Cost&rdquo; line above.
            </p>
          </div>

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
  missing = false,
}: {
  label: string;
  value: string;
  missing?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`font-medium ${
          missing ? "text-amber-700 italic" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
