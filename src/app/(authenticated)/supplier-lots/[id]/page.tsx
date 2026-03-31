import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { getLotDetail } from "@/lib/queries/supplier-lots";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { GradeBadge } from "@/components/shared/grade-badge";
import { AgingIndicator } from "@/components/supplier-lots/aging-indicator";
import { LotActions } from "@/components/supplier-lots/lot-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Receipt } from "lucide-react";

export default async function SupplierLotDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canEdit = hasPermission(role, "supplier-lots", "edit");

  const lot = await getLotDetail(params.id);
  if (!lot) notFound();

  return (
    <div>
      <PageHeader
        title={`Lot ${lot.lotNumber}`}
        description={`Invoice: ${lot.invoiceNumber}`}
        backHref="/supplier-lots"
        action={
          <div className="flex gap-2">
            <Link href={`/supplier-lots/${lot.id}/invoice`}>
              <Button variant="outline" className="gap-2">
                <Receipt className="h-4 w-4" />
                Print Invoice
              </Button>
            </Link>
            <Link href={`/supplier-lots/${lot.id}/report`}>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Audit Report
              </Button>
            </Link>
          </div>
        }
      />

      {/* Status Actions */}
      <div className="mb-6">
        <LotActions
          lotId={lot.id}
          currentStatus={lot.status}
          currentGrade={lot.qualityGrade}
          canEdit={canEdit}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lot Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Lot Number" value={lot.lotNumber} />
                <InfoField label="Invoice Number" value={lot.invoiceNumber} />
                <InfoField
                  label="Supplier"
                  value={
                    <Link
                      href={`/suppliers/${lot.supplier.id}`}
                      className="text-emerald-700 hover:underline"
                    >
                      {lot.supplier.name}
                    </Link>
                  }
                />
                <InfoField
                  label="Status"
                  value={<StatusBadge status={lot.status} />}
                />
                <InfoField
                  label="Harvest Date"
                  value={new Date(lot.harvestDate).toLocaleDateString("en-LK")}
                />
                <InfoField
                  label="Date Received"
                  value={new Date(lot.dateReceived).toLocaleDateString("en-LK")}
                />
                <InfoField
                  label="Husk Count"
                  value={`${lot.huskCount.toLocaleString()} (${lot.availableHusks.toLocaleString()} available)`}
                />
                <InfoField
                  label="Per-Husk Rate"
                  value={formatLKR(lot.perHuskRate)}
                />
                <InfoField
                  label="Total Cost"
                  value={
                    <span className="text-lg font-bold">
                      {formatLKR(lot.totalCost)}
                    </span>
                  }
                />
                <InfoField
                  label="Quality Grade"
                  value={<GradeBadge grade={lot.qualityGrade} />}
                />
              </div>

              {lot.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700">{lot.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Production Batches using this lot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Production Batches</CardTitle>
            </CardHeader>
            <CardContent>
              {lot.productionBatchLots.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Not yet allocated to any production batch
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch #</TableHead>
                      <TableHead className="text-center">
                        Husks Used
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lot.productionBatchLots.map((pbl) => (
                      <TableRow key={pbl.id}>
                        <TableCell className="font-medium">
                          {pbl.productionBatch.batchNumber}
                        </TableCell>
                        <TableCell className="text-center">
                          {pbl.quantityUsed.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={pbl.productionBatch.status} />
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(
                            pbl.productionBatch.startedAt
                          ).toLocaleDateString("en-LK")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Aging Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Batch Aging</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {lot.batchAging}
              </div>
              <p className="text-sm text-gray-500 mb-3">days since harvest</p>
              <AgingIndicator days={lot.batchAging} />
            </CardContent>
          </Card>

          {/* Payments Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {lot.payments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  No payments recorded
                </p>
              ) : (
                <div className="space-y-2">
                  {lot.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-sm border-b pb-2"
                    >
                      <span className="text-gray-600">
                        {new Date(p.paymentDate).toLocaleDateString("en-LK")}
                      </span>
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
