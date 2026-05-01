import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupplierWithStats } from "@/lib/queries/suppliers";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { calculateBatchAging } from "@/lib/aging";
import { formatLKR } from "@/lib/currency";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { GradeBadge } from "@/components/shared/grade-badge";
import { AgingIndicator } from "@/components/supplier-lots/aging-indicator";
import { SupplierActions } from "@/components/suppliers/supplier-actions";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { RecordSupplierPayment } from "@/components/accounts/record-supplier-payment";
import { Badge } from "@/components/ui/badge";
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
import { Wallet, TrendingDown, Hash } from "lucide-react";

export default async function SupplierDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canEdit = hasPermission(role, "suppliers", "edit");
  const canDelete = hasPermission(role, "suppliers", "delete");
  const canManageSupplierActiveState = role === "OWNER";

  const supplier = await getSupplierWithStats(params.id);
  if (!supplier) notFound();

  return (
    <div className="pt-6">
      <PageHeader
        title={supplier.name}
        description={supplier.location || "Supplier"}
        backHref="/suppliers"
        action={
          <SupplierActions
            supplierId={supplier.id}
            supplierName={supplier.name}
            isActive={supplier.isActive}
            canDeactivate={canManageSupplierActiveState && canDelete}
            canReactivate={canManageSupplierActiveState && canEdit}
          />
        }
      />

      {!supplier.isActive && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-amber-300 bg-white text-amber-700"
            >
              Inactive
            </Badge>
            <p className="text-sm text-amber-900">
              This supplier is inactive. Existing lots and payments are preserved,
              but new lots and supplier payments are blocked until reactivation.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Lots"
          value={supplier.totalLots}
          subtitle={`${supplier.totalHusks.toLocaleString()} husks total`}
          icon={Hash}
        />
        <SummaryCard
          title="Total Owed"
          value={formatLKR(supplier.totalOwed)}
          icon={Wallet}
        />
        <SummaryCard
          title="Total Paid"
          value={formatLKR(supplier.totalPaid)}
          icon={Wallet}
        />
        <SummaryCard
          title="Outstanding"
          value={formatLKR(supplier.outstandingBalance)}
          subtitle={
            supplier.rejectionRate > 0
              ? `${supplier.rejectionRate.toFixed(0)}% rejection rate`
              : "0% rejection rate"
          }
          icon={TrendingDown}
        />
      </div>

      {supplier.remarks && (
        <div className="mb-6 rounded-lg border bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Remarks</p>
          <p className="text-sm text-gray-700">{supplier.remarks}</p>
        </div>
      )}

      <Tabs defaultValue="lots" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lots">Lot History</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          {canEdit && <TabsTrigger value="details">Edit Details</TabsTrigger>}
        </TabsList>

        {/* Lot History */}
        <TabsContent value="lots">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Supplier Lots</CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.lots.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No lots from this supplier yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot #</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead className="text-center">Husks</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Aging</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.lots.map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell>
                          <Link
                            href={`/supplier-lots/${lot.id}`}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            {lot.lotNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-gray-600 text-xs">
                          {lot.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(lot.dateReceived).toLocaleDateString("en-LK")}
                        </TableCell>
                        <TableCell className="text-center">
                          {lot.huskCount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <GradeBadge grade={lot.qualityGrade} />
                        </TableCell>
                        <TableCell>
                          <AgingIndicator
                            days={calculateBatchAging(lot.harvestDate)}
                            compact
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatLKR(lot.totalCost)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={lot.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          {/* Lot Payment Status Breakdown */}
          {supplier.lots.length > 0 && (() => {
            const lotPaymentData = supplier.lots.map((lot) => {
              const paid = supplier.payments
                .filter((p) => p.supplierLotId === lot.id)
                .reduce((sum, p) => sum + Number(p.amount), 0);
              const total = Number(lot.totalCost);
              const outstanding = total - paid;
              return { ...lot, paid, total, outstanding };
            });
            const unpaidLots = lotPaymentData.filter((l) => l.outstanding > 0);
            const paidLots = lotPaymentData.filter((l) => l.outstanding <= 0);

            return (
              <div className="space-y-6 mb-6">
                {/* Outstanding Lots */}
                {unpaidLots.length > 0 && (
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-orange-700">
                        Outstanding Lots ({unpaidLots.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {unpaidLots.map((lot) => {
                          const paidPercent = lot.total > 0 ? (lot.paid / lot.total) * 100 : 0;
                          return (
                            <div key={lot.id} className="rounded-lg border p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <Link
                                    href={`/supplier-lots/${lot.id}`}
                                    className="font-mono text-sm font-medium text-emerald-700 hover:underline"
                                  >
                                    {lot.lotNumber}
                                  </Link>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {lot.invoiceNumber}
                                  </span>
                                </div>
                                <StatusBadge status={lot.status} />
                              </div>
                              {/* Progress bar */}
                              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(paidPercent, 100)}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500">
                                  Paid: <span className="font-medium text-green-600">{formatLKR(lot.paid)}</span>
                                  {" / "}
                                  {formatLKR(lot.total)}
                                </span>
                                <span className="font-medium text-orange-600">
                                  Due: {formatLKR(lot.outstanding)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fully Paid Lots */}
                {paidLots.length > 0 && (
                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-700">
                        Fully Paid Lots ({paidLots.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {paidLots.map((lot) => (
                          <div
                            key={lot.id}
                            className="flex items-center justify-between text-sm rounded-lg border border-green-100 bg-green-50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/supplier-lots/${lot.id}`}
                                className="font-mono text-emerald-700 hover:underline"
                              >
                                {lot.lotNumber}
                              </Link>
                              <span className="text-xs text-gray-500">
                                {lot.invoiceNumber}
                              </span>
                            </div>
                            <span className="font-medium text-green-600">
                              {formatLKR(lot.total)} — Paid
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

          {/* Payment History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Payment History</CardTitle>
              {canEdit && supplier.isActive && (
                <RecordSupplierPayment
                  supplierId={supplier.id}
                  supplierName={supplier.name}
                  lots={supplier.lots
                    .map((lot) => {
                      const paid = supplier.payments
                        .filter((p) => p.supplierLotId === lot.id)
                        .reduce((sum, p) => sum + Number(p.amount), 0);
                      return {
                        id: lot.id,
                        lotNumber: lot.lotNumber,
                        invoiceNumber: lot.invoiceNumber,
                        outstanding: Number(lot.totalCost) - paid,
                      };
                    })
                    .filter((l) => l.outstanding > 0)}
                />
              )}
            </CardHeader>
            <CardContent>
              {supplier.payments.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No payments recorded yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Lot / Invoice</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Link
                            href={`/payments/supplier/${payment.id}/receipt`}
                            className="font-mono text-xs text-emerald-700 hover:underline"
                          >
                            {payment.receiptNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {new Date(payment.paymentDate).toLocaleDateString(
                            "en-LK"
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {payment.supplierLotId
                            ? (() => {
                                const lot = supplier.lots.find((l) => l.id === payment.supplierLotId);
                                return lot
                                  ? `${lot.lotNumber} / ${lot.invoiceNumber}`
                                  : "—";
                              })()
                            : "General"}
                        </TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatLKR(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit Details */}
        {canEdit && (
          <TabsContent value="details">
            <SupplierForm
              defaultValues={{
                id: supplier.id,
                name: supplier.name,
                phone: supplier.phone,
                location: supplier.location,
                contactPerson: supplier.contactPerson,
                bankName: supplier.bankName,
                branchName: supplier.branchName,
                accountNumber: supplier.accountNumber,
                remarks: supplier.remarks,
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
