import { notFound } from "next/navigation";
import { getLotDetail } from "@/lib/queries/supplier-lots";
import { formatLKR } from "@/lib/currency";
import { formatSupplierBankDetails } from "@/lib/bank-details";
import { PrintLayout } from "@/components/shared/print-layout";

export default async function InvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const lot = await getLotDetail(params.id);
  if (!lot) notFound();

  const supplierBankDetails = formatSupplierBankDetails(
    {
      bankName: lot.supplier.bankName,
      branchName: lot.supplier.branchName,
      accountNumber: lot.supplier.accountNumber,
    }
  );

  return (
    <div className="pt-6">
      <PrintLayout backHref={`/supplier-lots/${lot.id}`}>
        <div className="p-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-emerald-700 pb-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-emerald-900">
                T C Liyanage
              </h1>
              <p className="text-sm text-gray-500">
                Coconut Husk Processing
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-emerald-900">
                PURCHASE INVOICE
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Date:{" "}
                {new Date(lot.dateReceived).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Invoice & Lot Number */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-emerald-50 rounded-lg p-4">
            <div>
              <p className="text-xs text-emerald-700 uppercase font-medium">
                Invoice Number
              </p>
              <p className="text-xl font-bold font-mono text-emerald-900">
                {lot.invoiceNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 uppercase font-medium">
                Lot Reference
              </p>
              <p className="text-xl font-bold font-mono text-emerald-900">
                {lot.lotNumber}
              </p>
            </div>
          </div>

          {/* Supplier Details */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Supplier
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-bold text-gray-900">{lot.supplier.name}</p>
              {lot.supplier.phone && (
                <p className="text-sm text-gray-600">
                  Phone: {lot.supplier.phone}
                </p>
              )}
              {lot.supplier.location && (
                <p className="text-sm text-gray-600">
                  Location: {lot.supplier.location}
                </p>
              )}
              {supplierBankDetails && (
                <div className="mt-2">
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Bank Details
                  </p>
                  <p className="whitespace-pre-line text-sm text-gray-600">
                    {supplierBankDetails}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-xs text-gray-500">Harvest Date</p>
              <p className="font-medium">
                {new Date(lot.harvestDate).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Date Received</p>
              <p className="font-medium">
                {new Date(lot.dateReceived).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-bold text-gray-700">
                    Description
                  </th>
                  <th className="text-center py-2 font-bold text-gray-700">
                    Quantity
                  </th>
                  <th className="text-right py-2 font-bold text-gray-700">
                    Unit Price
                  </th>
                  <th className="text-right py-2 font-bold text-gray-700">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-3">
                    Coconut Husks
                    {lot.qualityGrade && (
                      <span className="text-gray-500 ml-2">
                        (Grade {lot.qualityGrade})
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    {lot.huskCount.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    {formatLKR(lot.perHuskRate)}
                  </td>
                  <td className="py-3 text-right font-medium">
                    {formatLKR(lot.totalCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="border-t-2 border-emerald-700 pt-4 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">
                TOTAL AMOUNT
              </span>
              <span className="text-2xl font-bold text-emerald-900">
                {formatLKR(lot.totalCost)}
              </span>
            </div>
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
