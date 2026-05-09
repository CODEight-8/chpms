import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessModule, hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { getOrderDetail } from "@/lib/queries/orders";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { OrderActions } from "@/components/orders/order-actions";
import { FulfillForm } from "@/components/orders/fulfill-form";
import { RecordOrderPayment } from "@/components/accounts/record-order-payment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canEdit = hasPermission(role, "orders", "edit");
  const canViewClients = canAccessModule(role, "clients");

  const order = await getOrderDetail(params.id);
  if (!order) notFound();

  return (
    <div className="pt-6">
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Invoice: ${order.invoiceNumber} | Client: ${order.client.name}`}
        backHref="/orders"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={`/orders/${order.id}/invoice`}>
              <Button variant="outline" className="gap-2">
                <Receipt className="h-4 w-4" />
                Print Invoice
              </Button>
            </Link>
            <OrderActions
              orderId={order.id}
              currentStatus={order.status}
              canEdit={canEdit}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label="Order Number" value={order.orderNumber} />
                <InfoField
                  label="Status"
                  value={
                    <StatusBadge
                      status={
                        order.status === "CONFIRMED" &&
                        order.items.some((i) => Number(i.quantityFulfilled) > 0)
                          ? "PARTIALLY_FULFILLED"
                          : order.status
                      }
                    />
                  }
                />
                <InfoField
                  label="Client"
                  value={
                    canViewClients ? (
                      <Link
                        href={`/clients/${order.client.id}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {order.client.name}
                        {order.client.companyName
                          ? ` (${order.client.companyName})`
                          : ""}
                      </Link>
                    ) : (
                      <span>
                        {order.client.name}
                        {order.client.companyName
                          ? ` (${order.client.companyName})`
                          : ""}
                      </span>
                    )
                  }
                />
                <InfoField
                  label="Order Date"
                  value={new Date(order.orderDate).toLocaleDateString("en-LK")}
                />
                <InfoField
                  label="Expected Delivery"
                  value={
                    order.expectedDelivery
                      ? new Date(order.expectedDelivery).toLocaleDateString(
                          "en-LK"
                        )
                      : "Not set"
                  }
                />
                <InfoField
                  label="Payment Method"
                  value={order.client.paymentMethod || "—"}
                />
                <InfoField
                  label="Payment Terms"
                  value={order.client.paymentTerms || "—"}
                />
              </div>
              {order.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty Ordered</TableHead>
                    <TableHead className="text-center">Qty Fulfilled</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {(order.status === "CONFIRMED" || order.status === "FULFILLED") && canEdit && (
                      <TableHead className="text-center">Action</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const remaining =
                      Number(item.quantityOrdered) - Number(item.quantityFulfilled);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product.name}
                          <span className="text-gray-500 ml-1 text-xs">
                            ({item.product.unit})
                          </span>
                          {item.chipSize && (
                            <span className="ml-1 text-xs font-medium text-blue-600">
                              [{item.chipSize}]
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {Number(item.quantityOrdered).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {Number(item.quantityFulfilled) > 0 ? (
                            <span
                              className={
                                remaining <= 0
                                  ? "text-green-600"
                                  : "text-orange-600"
                              }
                            >
                              {Number(item.quantityFulfilled).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatLKR(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatLKR(
                            Number(item.quantityOrdered) * Number(item.unitPrice)
                          )}
                        </TableCell>
                        {(order.status === "CONFIRMED" || order.status === "FULFILLED") && canEdit && (
                          <TableCell className="text-center">
                            {remaining > 0 ? (
                              <FulfillForm
                                orderId={order.id}
                                orderItemId={item.id}
                                productName={item.product.name}
                                chipSize={item.chipSize}
                                remaining={remaining}
                                unit={item.product.unit}
                              />
                            ) : (
                              <span className="text-xs text-green-600 font-medium">Done</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={4} className="text-right font-bold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatLKR(order.totalValue)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Fulfillment Traceability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Fulfillment (Traceability)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.items.every((i) => i.fulfillments.length === 0) ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No fulfillments yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch #</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead>Fulfilled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.flatMap((item) =>
                      item.fulfillments.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>{item.product.name}</TableCell>
                          <TableCell>
                            <Link
                              href={`/production/${f.productionBatch.id}`}
                              className="font-mono text-emerald-700 hover:underline"
                            >
                              {f.productionBatch.batchNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            {Number(f.quantityFulfilled).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(f.fulfilledAt).toLocaleDateString("en-LK")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order Total</span>
                <span className="font-medium">{formatLKR(order.totalValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="font-medium text-green-600">
                  {formatLKR(order.totalPaid)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium">Outstanding</span>
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
            </CardContent>
          </Card>

          {order.totalProductionCost > 0 && (() => {
            const grossProfit = order.totalValue - order.totalProductionCost;
            const marginPercent =
              order.totalValue > 0
                ? (grossProfit / order.totalValue) * 100
                : 0;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Production Cost
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Production Cost</span>
                    <span className="font-medium text-red-600">
                      {formatLKR(order.totalProductionCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Order Revenue</span>
                    <span className="font-medium">
                      {formatLKR(order.totalValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-medium">Gross Profit</span>
                    <span
                      className={`font-bold ${
                        grossProfit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatLKR(grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Margin</span>
                    <span
                      className={`font-medium ${
                        marginPercent >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {marginPercent.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Payments</CardTitle>
              {canEdit && (
                <RecordOrderPayment
                  clientId={order.client.id}
                  clientName={order.client.name}
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  invoiceNumber={order.invoiceNumber}
                  outstandingBalance={order.outstandingBalance}
                />
              )}
            </CardHeader>
            <CardContent>
              {order.payments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  No payments recorded
                </p>
              ) : (
                <div className="space-y-2">
                  {order.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center text-sm border-b pb-2"
                    >
                      <div>
                        <Link
                          href={`/payments/client/${p.id}/receipt`}
                          className="font-mono text-xs text-emerald-700 hover:underline"
                        >
                          {p.receiptNumber}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {new Date(p.paymentDate).toLocaleDateString("en-LK")}
                          {" · "}
                          <span className="text-gray-400">
                            Against {order.invoiceNumber}
                          </span>
                        </p>
                      </div>
                      <span className="font-medium">{formatLKR(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  );
}
