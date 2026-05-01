import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/queries/orders";
import { formatLKR } from "@/lib/currency";
import { PrintLayout } from "@/components/shared/print-layout";

export default async function OrderInvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getOrderDetail(params.id);
  if (!order) notFound();

  return (
    <div className="pt-6">
      <PrintLayout backHref={`/orders/${order.id}`}>
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
                SALES INVOICE
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Date:{" "}
                {new Date(order.orderDate).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Invoice & Order Number */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-emerald-50 rounded-lg p-4">
            <div>
              <p className="text-xs text-emerald-700 uppercase font-medium">
                Invoice Number
              </p>
              <p className="text-xl font-bold font-mono text-emerald-900">
                {order.invoiceNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 uppercase font-medium">
                Order Reference
              </p>
              <p className="text-xl font-bold font-mono text-emerald-900">
                {order.orderNumber}
              </p>
            </div>
          </div>

          {/* Client Details */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">
              Bill To
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-bold text-gray-900">
                {order.client.name}
                {order.client.companyName
                  ? ` (${order.client.companyName})`
                  : ""}
              </p>
              {order.client.phone && (
                <p className="text-sm text-gray-600">
                  Phone: {order.client.phone}
                </p>
              )}
              {order.client.email && (
                <p className="text-sm text-gray-600">
                  Email: {order.client.email}
                </p>
              )}
              {order.client.address && (
                <p className="text-sm text-gray-600">
                  Address: {order.client.address}
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-xs text-gray-500">Order Date</p>
              <p className="font-medium">
                {new Date(order.orderDate).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Expected Delivery</p>
              <p className="font-medium">
                {order.expectedDelivery
                  ? new Date(order.expectedDelivery).toLocaleDateString(
                      "en-LK",
                      { year: "numeric", month: "long", day: "numeric" }
                    )
                  : "Not set"}
              </p>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-bold text-gray-700">
                    Product
                  </th>
                  <th className="text-center py-2 font-bold text-gray-700">
                    Qty
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
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-3">
                      {item.product.name}
                      <span className="text-gray-500 ml-1">
                        ({item.product.unit})
                      </span>
                      {item.chipSize && (
                        <span className="ml-1 text-blue-600">
                          [{item.chipSize}]
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {Number(item.quantityOrdered).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      {formatLKR(item.unitPrice)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {formatLKR(
                        Number(item.quantityOrdered) * Number(item.unitPrice)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="border-t-2 border-emerald-700 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">
                TOTAL AMOUNT
              </span>
              <span className="text-2xl font-bold text-emerald-900">
                {formatLKR(order.totalValue)}
              </span>
            </div>
          </div>

          {/* Payment Info */}
          {(order.client.paymentMethod || order.client.paymentTerms) && (
            <div className="mb-6 text-sm bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">
                Payment Information
              </h3>
              {order.client.paymentMethod && (
                <p className="text-gray-600">
                  Method: {order.client.paymentMethod}
                </p>
              )}
              {order.client.paymentTerms && (
                <p className="text-gray-600">
                  Terms: {order.client.paymentTerms}
                </p>
              )}
            </div>
          )}

          {/* Payments Received */}
          {order.payments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">
                Payments Received
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 font-bold text-gray-700">
                      Receipt #
                    </th>
                    <th className="text-left py-2 font-bold text-gray-700">
                      Date
                    </th>
                    <th className="text-left py-2 font-bold text-gray-700">
                      Method
                    </th>
                    <th className="text-left py-2 font-bold text-gray-700">
                      Reference
                    </th>
                    <th className="text-right py-2 font-bold text-gray-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-200">
                      <td className="py-2 font-mono">{p.receiptNumber}</td>
                      <td className="py-2">
                        {new Date(p.paymentDate).toLocaleDateString("en-LK")}
                      </td>
                      <td className="py-2">{p.paymentMethod}</td>
                      <td className="py-2 text-gray-600">{p.reference || "—"}</td>
                      <td className="py-2 text-right font-medium">
                        {formatLKR(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment Summary */}
          <div className="mb-8 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Total Paid</span>
              <span className="font-medium text-green-600">
                {formatLKR(order.totalPaid)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t">
              <span className="font-medium">Outstanding Balance</span>
              <span
                className={`font-bold ${
                  order.outstandingBalance > 0
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {formatLKR(order.outstandingBalance)}
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
