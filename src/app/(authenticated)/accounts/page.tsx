import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import {
  getSupplierPayments,
  getClientPayments,
  getAccountsSummary,
} from "@/lib/queries/accounts";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { PaymentForm } from "@/components/accounts/payment-form";
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
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp } from "lucide-react";

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canCreate = hasPermission(role, "accounts", "create");

  const [supplierPayments, clientPayments, summary] = await Promise.all([
    getSupplierPayments(),
    getClientPayments(),
    getAccountsSummary(),
  ]);

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Payment tracking — Money Out (suppliers) & Money In (clients)"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Payable"
          value={formatLKR(summary.totalPayable)}
          subtitle={`${formatLKR(summary.outstandingPayable)} outstanding`}
          icon={ArrowUpRight}
        />
        <SummaryCard
          title="Total Receivable"
          value={formatLKR(summary.totalReceivable)}
          subtitle={`${formatLKR(summary.outstandingReceivable)} outstanding`}
          icon={ArrowDownLeft}
        />
        <SummaryCard
          title="Paid to Suppliers"
          value={formatLKR(summary.totalPaidToSuppliers)}
          icon={Wallet}
        />
        <SummaryCard
          title="Net Cash Flow"
          value={formatLKR(summary.netBalance)}
          icon={TrendingUp}
        />
      </div>

      {/* Payment Tabs */}
      <Tabs defaultValue="out" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="out">
              Money Out (Suppliers)
            </TabsTrigger>
            <TabsTrigger value="in">
              Money In (Clients)
            </TabsTrigger>
          </TabsList>
          {canCreate && (
            <div className="flex gap-2">
              <PaymentForm type="supplier" />
              <PaymentForm type="client" />
            </div>
          )}
        </div>

        {/* Money Out */}
        <TabsContent value="out">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Supplier Payments (Money Out)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supplierPayments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No supplier payments recorded
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Lot / Invoice</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {new Date(p.paymentDate).toLocaleDateString("en-LK")}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/suppliers/${p.supplier.id}`}
                            className="text-emerald-700 hover:underline"
                          >
                            {p.supplier.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-gray-500">
                          {p.supplierLot
                            ? `${p.supplierLot.lotNumber} / ${p.supplierLot.invoiceNumber}`
                            : "—"}
                        </TableCell>
                        <TableCell>{p.paymentMethod}</TableCell>
                        <TableCell className="text-gray-600">
                          {p.reference || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatLKR(p.amount)}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm max-w-32 truncate">
                          {p.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Money In */}
        <TabsContent value="in">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Client Payments (Money In)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientPayments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No client payments recorded
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {new Date(p.paymentDate).toLocaleDateString("en-LK")}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/clients/${p.client.id}`}
                            className="text-emerald-700 hover:underline"
                          >
                            {p.client.name}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {p.order?.orderNumber || "—"}
                        </TableCell>
                        <TableCell>{p.paymentMethod}</TableCell>
                        <TableCell className="text-gray-600">
                          {p.reference || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatLKR(p.amount)}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm max-w-32 truncate">
                          {p.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
