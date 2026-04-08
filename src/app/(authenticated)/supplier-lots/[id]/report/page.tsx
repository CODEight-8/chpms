import { notFound } from "next/navigation";
import { getLotDetail } from "@/lib/queries/supplier-lots";
import { formatLKR } from "@/lib/currency";
import { PrintLayout } from "@/components/shared/print-layout";

export default async function AuditReportPage({
  params,
}: {
  params: { id: string };
}) {
  const lot = await getLotDetail(params.id);
  if (!lot) notFound();

  const gradeLabels: Record<string, string> = {
    A: "A — Premium",
    B: "B — Good",
    C: "C — Fair",
    REJECT: "Rejected",
  };

  return (
    <div className="pt-6">
      <PrintLayout backHref={`/supplier-lots/${lot.id}`}>
        <div className="p-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center border-b-2 border-emerald-700 pb-4 mb-6">
            <h1 className="text-xl font-bold text-emerald-900">
              T C Liyanage
            </h1>
            <p className="text-sm text-gray-500">
              Coconut Husk Processing Management System
            </p>
            <h2 className="text-lg font-bold mt-3">QUALITY AUDIT REPORT</h2>
          </div>

          {/* Reference Numbers */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-lg p-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">
                Lot Number
              </p>
              <p className="text-lg font-bold font-mono">{lot.lotNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">
                Invoice Number
              </p>
              <p className="text-lg font-bold font-mono">{lot.invoiceNumber}</p>
            </div>
          </div>

          {/* Supplier Info */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Supplier Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ReportField label="Name" value={lot.supplier.name} />
              <ReportField label="Phone" value={lot.supplier.phone || "—"} />
              <ReportField
                label="Location"
                value={lot.supplier.location || "—"}
              />
              <ReportField
                label="Contact"
                value={lot.supplier.contactPerson || "—"}
              />
            </div>
          </div>

          {/* Lot Details */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Lot Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ReportField
                label="Harvest Date"
                value={new Date(lot.harvestDate).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
              <ReportField
                label="Date Received"
                value={new Date(lot.dateReceived).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
              <ReportField
                label="Batch Aging"
                value={`${lot.batchAging} days since harvest`}
              />
              <ReportField
                label="Husk Count"
                value={`${lot.huskCount.toLocaleString()} husks`}
              />
              <ReportField
                label="Per-Husk Rate"
                value={formatLKR(lot.perHuskRate)}
              />
              <ReportField
                label="Total Cost"
                value={formatLKR(lot.totalCost)}
                bold
              />
            </div>
          </div>

          {/* Quality Assessment */}
          <div className="mb-6 border-2 border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Quality Assessment
            </h3>
            <div className="text-center py-3">
              <p className="text-sm text-gray-500 mb-1">Quality Grade</p>
              <p
                className={`text-3xl font-bold ${
                  lot.qualityGrade === "A"
                    ? "text-emerald-700"
                    : lot.qualityGrade === "B"
                      ? "text-blue-700"
                      : lot.qualityGrade === "C"
                        ? "text-orange-700"
                        : lot.qualityGrade === "REJECT"
                          ? "text-red-700"
                          : "text-gray-400"
                }`}
              >
                {lot.qualityGrade
                  ? gradeLabels[lot.qualityGrade]
                  : "Pending Audit"}
              </p>
            </div>
          </div>

          {/* Notes */}
          {lot.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
                Inspector Notes
              </h3>
              <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                {lot.notes}
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
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={bold ? "font-bold" : "font-medium"}>{value}</p>
    </div>
  );
}
