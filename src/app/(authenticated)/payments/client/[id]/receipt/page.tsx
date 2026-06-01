import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientPaymentDetail } from "@/lib/queries/accounts";
import { formatLKR } from "@/lib/currency";
import { formatSriLankaPhoneNumber } from "@/lib/utils";
import { PrintLayout } from "@/components/shared/print-layout";
import { COMPANY_NAME } from "@/lib/branding";

export default async function ClientReceiptPage({
  params,
}: {
  params: { id: string };
}) {
  const payment = await getClientPaymentDetail(params.id);
  if (!payment) notFound();

  return (
    <div className="pt-6">
      <PrintLayout>
        <div className="p-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-emerald-700 pb-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-emerald-900">
                {COMPANY_NAME}
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

          {/* Client Details */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Received From
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-bold text-gray-900">
                {payment.client.companyName
                  ? `${payment.client.companyName} (${payment.client.name})`
                  : payment.client.name}
              </p>
              {payment.client.phone && (
                <p className="text-sm text-gray-600">
                  Phone: {formatSriLankaPhoneNumber(payment.client.phone)}
                </p>
              )}
              {payment.client.email && (
                <p className="text-sm text-gray-600">
                  Email: {payment.client.email}
                </p>
              )}
              {payment.client.address && (
                <p className="text-sm text-gray-600">
                  Address: {payment.client.address}
                </p>
              )}
            </div>
          </div>

          {/* Payment Against — single block for one allocation, table for many */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Payment Against
            </h3>
            <div className="bg-blue-50 rounded-lg p-4">
              {payment.allocationSummaries.length === 1 ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Invoice</span>
                    <Link
                      href={`/orders/${payment.allocationSummaries[0].order.id}`}
                      className="font-mono font-medium text-emerald-700 hover:underline print:text-gray-900 print:no-underline"
                    >
                      {payment.allocationSummaries[0].order.invoiceNumber}
                    </Link>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Order Number</span>
                    <span className="font-mono font-medium">
                      {payment.allocationSummaries[0].order.orderNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1 mt-1">
                    <span className="text-gray-600">Order Total</span>
                    <span className="font-medium">
                      {formatLKR(payment.allocationSummaries[0].orderTotal)}
                    </span>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-200">
                      <th className="text-left py-1 text-xs font-bold text-gray-700">
                        Invoice / Order
                      </th>
                      <th className="text-right py-1 text-xs font-bold text-gray-700">
                        Order Total
                      </th>
                      <th className="text-right py-1 text-xs font-bold text-gray-700">
                        Allocated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.allocationSummaries.map((a) => (
                      <tr key={a.id} className="border-b border-blue-100">
                        <td className="py-1.5 font-mono">
                          <Link
                            href={`/orders/${a.order.id}`}
                            className="text-emerald-700 hover:underline print:text-gray-900 print:no-underline"
                          >
                            {a.order.invoiceNumber}
                          </Link>{" "}
                          <span className="text-gray-500">
                            ({a.order.orderNumber})
                          </span>
                        </td>
                        <td className="py-1.5 text-right text-gray-600">
                          {formatLKR(a.orderTotal)}
                        </td>
                        <td className="py-1.5 text-right font-medium">
                          {formatLKR(a.thisAllocation)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} className="py-1.5 text-right font-bold">
                        Total
                      </td>
                      <td className="py-1.5 text-right font-bold text-emerald-900">
                        {formatLKR(payment.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Payment Amount */}
          <div className="border-t-2 border-emerald-700 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">
                AMOUNT RECEIVED
              </span>
              <span className="text-2xl font-bold text-emerald-900">
                {formatLKR(payment.amount)}
              </span>
            </div>
          </div>

          {/* Balance Summary */}
          {payment.allocationSummaries.length === 1 ? (
            <div className="mb-6 text-sm border rounded-lg p-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">
                Balance Summary
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Total</span>
                  <span className="font-medium">
                    {formatLKR(payment.allocationSummaries[0].orderTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Previously Received</span>
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
          ) : payment.allocationSummaries.length > 1 ? (
            <div className="mb-6 text-sm border rounded-lg p-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">
                Per-Order Balance After This Payment
              </h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 text-xs font-bold text-gray-500">
                      Order
                    </th>
                    <th className="text-right py-1 text-xs font-bold text-gray-500">
                      Total
                    </th>
                    <th className="text-right py-1 text-xs font-bold text-gray-500">
                      Received to-date
                    </th>
                    <th className="text-right py-1 text-xs font-bold text-gray-500">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payment.allocationSummaries.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="py-1 font-mono">{a.order.orderNumber}</td>
                      <td className="py-1 text-right">{formatLKR(a.orderTotal)}</td>
                      <td className="py-1 text-right text-green-600">
                        {formatLKR(a.orderTotalPaid)}
                      </td>
                      <td
                        className={`py-1 text-right font-medium ${
                          a.orderRemaining > 0
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatLKR(Math.max(0, a.orderRemaining))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

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
            <span>CHPMS — {COMPANY_NAME}</span>
          </div>
        </div>
      </PrintLayout>
    </div>
  );
}
