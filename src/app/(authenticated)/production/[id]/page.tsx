import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { calculateBatchAging } from "@/lib/aging";
import { getBatchDetail } from "@/lib/queries/production-batches";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { GradeBadge } from "@/components/shared/grade-badge";
import { AgingIndicator } from "@/components/supplier-lots/aging-indicator";
import { BatchActions } from "@/components/production/batch-actions";
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
import { FileText } from "lucide-react";

export default async function ProductionBatchDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canEdit = hasPermission(role, "production", "edit");

  const batch = await getBatchDetail(params.id);
  if (!batch) notFound();

  return (
    <div>
      <PageHeader
        title={`Batch ${batch.batchNumber}`}
        description={`Product: ${batch.product.name}`}
        action={
          <div className="flex gap-2">
            {batch.status !== "IN_PROGRESS" && (
              <Link href={`/production/${batch.id}/report`}>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Production Report
                </Button>
              </Link>
            )}
            <BatchActions
              batchId={batch.id}
              currentStatus={batch.status}
              productUnit={batch.product.unit}
              canEdit={canEdit}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Batch Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Batch Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Batch Number" value={batch.batchNumber} />
                <InfoField
                  label="Status"
                  value={<StatusBadge status={batch.status} />}
                />
                <InfoField label="Product" value={batch.product.name} />
                <InfoField
                  label="Started"
                  value={new Date(batch.startedAt).toLocaleDateString("en-LK")}
                />
                <InfoField
                  label="Total Input Husks"
                  value={`${batch.totalInputHusks.toLocaleString()} husks from ${batch.batchLots.length} lot(s)`}
                />
                <InfoField
                  label="Total Raw Material Cost"
                  value={
                    <span className="font-bold">
                      {formatLKR(batch.totalRawCost)}
                    </span>
                  }
                />
                {batch.outputQuantity && (
                  <>
                    <InfoField
                      label="Output Quantity"
                      value={`${Number(batch.outputQuantity).toLocaleString()} ${batch.outputUnit || ""}`}
                    />
                    <InfoField
                      label="Completed"
                      value={
                        batch.completedAt
                          ? new Date(batch.completedAt).toLocaleDateString("en-LK")
                          : "—"
                      }
                    />
                  </>
                )}
              </div>

              {batch.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{batch.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Lots Used */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Supplier Lots Used (Traceability)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead className="text-center">Husks Used</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.batchLots.map((bl) => (
                    <TableRow key={bl.id}>
                      <TableCell>
                        <Link
                          href={`/supplier-lots/${bl.supplierLot.id}`}
                          className="font-mono text-emerald-700 hover:underline text-sm"
                        >
                          {bl.supplierLot.lotNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/suppliers/${bl.supplierLot.supplier.id}`}
                          className="text-gray-700 hover:underline"
                        >
                          {bl.supplierLot.supplier.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <GradeBadge grade={bl.supplierLot.qualityGrade} />
                      </TableCell>
                      <TableCell>
                        <AgingIndicator
                          days={calculateBatchAging(bl.supplierLot.harvestDate)}
                          compact
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {bl.quantityUsed.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatLKR(
                          bl.quantityUsed * Number(bl.supplierLot.perHuskRate)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Output Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Output</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {batch.outputQuantity ? (
                <>
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {Number(batch.outputQuantity).toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-500">{batch.outputUnit}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500 py-4">
                  Not yet completed — output pending
                </p>
              )}
            </CardContent>
          </Card>

          {/* Order Fulfillments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Orders Fulfilled</CardTitle>
            </CardHeader>
            <CardContent>
              {batch.fulfillments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  Not yet assigned to any orders
                </p>
              ) : (
                <div className="space-y-2">
                  {batch.fulfillments.map((f) => (
                    <div
                      key={f.id}
                      className="flex justify-between items-center text-sm border-b pb-2"
                    >
                      <div>
                        <span className="font-mono font-medium">
                          {f.orderItem.order.orderNumber}
                        </span>
                        <p className="text-xs text-gray-500">
                          {f.orderItem.order.client.name}
                        </p>
                      </div>
                      <span className="font-medium">
                        {Number(f.quantityFulfilled).toLocaleString()}{" "}
                        {batch.outputUnit}
                      </span>
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
