import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessModule, hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { getClientWithStats } from "@/lib/queries/clients";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ClientForm } from "@/components/clients/client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientActions } from "@/components/clients/client-actions";
import { RecordClientPayment } from "@/components/accounts/record-client-payment";
import { ShoppingCart, Wallet, TrendingDown } from "lucide-react";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  if (!canAccessModule(role, "clients")) {
    redirect("/dashboard");
  }
  const canEdit = hasPermission(role, "clients", "edit");
  const canDelete = hasPermission(role, "clients", "delete");

  const client = await getClientWithStats(params.id);
  if (!client) notFound();

  return (
    <div className="pt-6">
      <PageHeader
        title={client.name}
        description={client.companyName || "Client"}
        backHref="/clients"
        action={
          <ClientActions
            clientId={client.id}
            clientName={client.name}
            isActive={client.isActive}
            canDeactivate={canDelete}
            canReactivate={canEdit}
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Orders"
          value={client.totalOrders}
          icon={ShoppingCart}
        />
        <SummaryCard
          title="Total Revenue"
          value={formatLKR(client.totalRevenue)}
          icon={Wallet}
        />
        <SummaryCard
          title="Received"
          value={formatLKR(client.totalReceived)}
          icon={Wallet}
        />
        <SummaryCard
          title="Outstanding"
          value={formatLKR(client.outstandingBalance)}
          icon={TrendingDown}
        />
      </div>

      {client.remarks && (
        <div className="mb-6 rounded-lg border bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Remarks</p>
          <p className="text-sm text-gray-700">{client.remarks}</p>
        </div>
      )}

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          {canEdit && <TabsTrigger value="details">Edit Details</TabsTrigger>}
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {client.orders.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No orders yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.orders.map((order) => {
                      const total = order.items.reduce(
                        (s, i) =>
                          s + Number(i.quantityOrdered) * Number(i.unitPrice),
                        0
                      );
                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Link
                              href={`/orders/${order.id}`}
                              className="font-mono text-emerald-700 hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(order.orderDate).toLocaleDateString("en-LK")}
                          </TableCell>
                          <TableCell className="text-center">
                            {order.items.length}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatLKR(total)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={order.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          {/* Order Payment Status Breakdown */}
          {client.orders.filter((o) => o.status !== "CANCELLED").length > 0 && (() => {
            const orderPaymentData = client.orders
              .filter((o) => o.status !== "CANCELLED")
              .map((order) => {
                const total = order.items.reduce(
                  (s, i) => s + Number(i.quantityOrdered) * Number(i.unitPrice),
                  0
                );
                const paid = client.payments
                  .filter((p) => p.orderId === order.id)
                  .reduce((s, p) => s + Number(p.amount), 0);
                const outstanding = total - paid;
                return { ...order, total, paid, outstanding };
              });
            const unpaidOrders = orderPaymentData.filter((o) => o.outstanding > 0);
            const paidOrders = orderPaymentData.filter((o) => o.outstanding <= 0);

            return (
              <div className="space-y-6 mb-6">
                {unpaidOrders.length > 0 && (
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-orange-700">
                        Outstanding Orders ({unpaidOrders.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {unpaidOrders.map((order) => {
                          const paidPercent = order.total > 0 ? (order.paid / order.total) * 100 : 0;
                          return (
                            <div key={order.id} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <Link
                                    href={`/orders/${order.id}`}
                                    className="font-mono text-sm font-medium text-emerald-700 hover:underline"
                                  >
                                    {order.orderNumber}
                                  </Link>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {order.invoiceNumber}
                                  </span>
                                </div>
                                <StatusBadge status={order.status} />
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(paidPercent, 100)}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">
                                  Received: <span className="font-medium text-green-600">{formatLKR(order.paid)}</span>
                                  {" / "}
                                  {formatLKR(order.total)}
                                </span>
                                <span className="font-medium text-orange-600">
                                  Due: {formatLKR(order.outstanding)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {paidOrders.length > 0 && (
                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-700">
                        Fully Paid Orders ({paidOrders.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {paidOrders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between text-sm rounded-lg border border-green-100 bg-green-50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/orders/${order.id}`}
                                className="font-mono text-emerald-700 hover:underline"
                              >
                                {order.orderNumber}
                              </Link>
                              <span className="text-xs text-gray-500">
                                {order.invoiceNumber}
                              </span>
                            </div>
                            <span className="font-medium text-green-600">
                              {formatLKR(order.total)} — Paid
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Payment History</CardTitle>
              {canEdit && (
                <RecordClientPayment
                  clientId={client.id}
                  clientName={client.name}
                  orders={client.orders
                    .filter((o) => o.status !== "CANCELLED")
                    .map((o) => {
                      const total = o.items.reduce(
                        (s, i) =>
                          s + Number(i.quantityOrdered) * Number(i.unitPrice),
                        0
                      );
                      const paid = client.payments
                        .filter((p) => p.orderId === o.id)
                        .reduce((s, p) => s + Number(p.amount), 0);
                      return {
                        id: o.id,
                        orderNumber: o.orderNumber,
                        invoiceNumber: o.invoiceNumber,
                        outstanding: total - paid,
                      };
                    })
                    .filter((o) => o.outstanding > 0)}
                />
              )}
            </CardHeader>
            <CardContent>
              {client.payments.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No payments recorded
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Order / Invoice</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link
                            href={`/payments/client/${p.id}/receipt`}
                            className="font-mono text-xs text-emerald-700 hover:underline"
                          >
                            {p.receiptNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {new Date(p.paymentDate).toLocaleDateString("en-LK")}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {p.orderId
                            ? (() => {
                                const order = client.orders.find((o) => o.id === p.orderId);
                                return order
                                  ? `${order.orderNumber} / ${order.invoiceNumber}`
                                  : "—";
                              })()
                            : "—"}
                        </TableCell>
                        <TableCell>{p.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatLKR(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canEdit && (
          <TabsContent value="details">
            <ClientForm
              defaultValues={{
                id: client.id,
                name: client.name,
                companyName: client.companyName,
                phone: client.phone,
                email: client.email,
                address: client.address,
                paymentMethod: client.paymentMethod,
                paymentTerms: client.paymentTerms,
                remarks: client.remarks,
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
