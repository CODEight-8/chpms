import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
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
import { ShoppingCart, Wallet, TrendingDown } from "lucide-react";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canEdit = hasPermission(role, "clients", "edit");

  const client = await getClientWithStats(params.id);
  if (!client) notFound();

  return (
    <div>
      <PageHeader
        title={client.name}
        description={client.companyName || "Client"}
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment History</CardTitle>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {new Date(p.paymentDate).toLocaleDateString("en-LK")}
                        </TableCell>
                        <TableCell>{p.paymentMethod}</TableCell>
                        <TableCell className="text-gray-600">
                          {p.reference || "—"}
                        </TableCell>
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
                paymentTerms: client.paymentTerms,
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
