import { notFound } from "next/navigation";
import { getSupplierPaymentDetail } from "@/lib/queries/accounts";
import { formatLKR } from "@/lib/currency";
import { PrintLayout } from "@/components/shared/print-layout";

export default async function SupplierReceiptPage({
  params,
}: {
  params: { id: string };
}) {
  const payment = await getSupplierPaymentDetail(params.id);
  if (!payment) notFound();

  return (
    <div className="pt-6">
      <PrintLayout>
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
                PAYMENT RECEIPT
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Date:{" "}
                {new Date(payment.paymentDate).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Receipt Number */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-emerald-50 rounded-lg p-4">
            <div>
              <p className="text-xs text-emerald-700 uppercase font-medium">
                Receipt Number
              </p>
              <p className="text-xl font-bold font-mono text-emerald-900">
                {payment.receiptNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 uppercase font-medium">
                Payment Method
              </p>
              <p className="text-xl font-bold text-emerald-900">
                {payment.paymentMethod === "CASH"
                  ? "Cash"
                  : payment.paymentMethod === "BANK"
                  ? "Bank Transfer"
                  : "Cheque"}
              </p>
            </div>
          </div>

          {/* Supplier Details */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Paid To
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-bold text-gray-900">{payment.supplier.name}</p>
              {payment.supplier.phone && (
                <p className="text-sm text-gray-600">
                  Phone: {payment.supplier.phone}
                </p>
              )}
              {payment.supplier.location && (
                <p className="text-sm text-gray-600">
                  Location: {payment.supplier.location}
                </p>
              )}
            </div>
          </div>

          {/* Payment Against */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Payment Against
            </h3>
            <div className="bg-blue-50 rounded-lg p-4">
              {payment.supplierLot ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Invoice</span>
                    <span className="font-mono font-medium">
                      {payment.supplierLot.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lot Number</span>
                    <span className="font-mono font-medium">
                      {payment.supplierLot.lotNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Husks: {payment.supplierLot.huskCount.toLocaleString()} @{" "}
                      {formatLKR(payment.supplierLot.perHuskRate)}
                    </span>
                    <span className="font-medium">
                      {formatLKR(payment.supplierLot.totalCost)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  General payment to supplier (not linked to a specific lot)
                </p>
              )}
            </div>
          </div>

          {/* Payment Amount */}
          <div className="border-t-2 border-emerald-700 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">
                AMOUNT PAID
              </span>
              <span className="text-2xl font-bold text-emerald-900">
                {formatLKR(payment.amount)}
              </span>
            </div>
          </div>

          {/* Balance Summary (if linked to lot) */}
          {payment.supplierLot && (
            <div className="mb-6 text-sm border rounded-lg p-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">
                Balance Summary
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Total</span>
                  <span className="font-medium">
                    {formatLKR(payment.supplierLot.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Previously Paid</span>
                  <span className="font-medium">
                    {formatLKR(payment.previouslyPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">This Payment</span>
                  <span className="font-medium text-green-600">
                    {formatLKR(payment.amount)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium">Remaining Balance</span>
                  <span
                    className={`font-bold ${
                      (payment.remainingBalance ?? 0) > 0
                        ? "text-orange-600"
                        : "text-green-600"
                    }`}
                  >
                    {formatLKR(Math.max(0, payment.remainingBalance ?? 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Reference & Notes */}
          {(payment.reference || payment.notes) && (
            <div className="mb-6 text-sm">
              {payment.reference && (
                <div className="mb-2">
                  <span className="text-gray-500">Reference: </span>
                  <span className="font-medium">{payment.reference}</span>
                </div>
              )}
              {payment.notes && (
                <div>
                  <span className="text-gray-500">Notes: </span>
                  <span>{payment.notes}</span>
                </div>
              )}
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
