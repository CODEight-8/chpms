import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole, BatchStatus } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import {
  getBatchesWithDetails,
  getBatchStatusCounts,
} from "@/lib/queries/production-batches";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { BatchStatusTabs } from "@/components/production/batch-status-tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Factory, CheckCircle, Truck } from "lucide-react";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canCreate = hasPermission(role, "production", "create");

  const statusFilter = searchParams.status as BatchStatus | undefined;
  const [batches, counts] = await Promise.all([
    getBatchesWithDetails({ status: statusFilter, search: searchParams.search }),
    getBatchStatusCounts(),
  ]);

  return (
    <div>
      <PageHeader
        title="Production Batches"
        description="Coconut husk chip production — batch processing and output tracking"
        action={
          canCreate ? (
            <Link href="/production/new">
              <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                <Plus className="h-4 w-4" />
                New Batch
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <SummaryCard
          title="In Progress"
          value={counts.IN_PROGRESS}
          icon={Factory}
        />
        <SummaryCard
          title="Completed"
          value={counts.COMPLETED}
          icon={CheckCircle}
        />
        <SummaryCard
          title="Dispatched"
          value={counts.DISPATCHED}
          icon={Truck}
        />
      </div>

      {/* Status Tabs */}
      <div className="mb-4">
        <BatchStatusTabs counts={counts} />
      </div>

      {/* Batches Table */}
      {batches.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No production batches"
          description={
            statusFilter
              ? `No batches with status "${statusFilter.replace("_", " ")}"`
              : "Create your first production batch to start processing"
          }
          action={
            canCreate && !statusFilter ? (
              <Link href="/production/new">
                <Button className="bg-emerald-700 hover:bg-emerald-800">
                  New Batch
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Input Husks</TableHead>
                <TableHead className="text-center">Lots Used</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Raw Cost</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <Link
                      href={`/production/${batch.id}`}
                      className="font-medium text-emerald-700 hover:underline font-mono"
                    >
                      {batch.batchNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{batch.product.name}</TableCell>
                  <TableCell className="text-center">
                    {batch.totalInputHusks.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">{batch.lotCount}</TableCell>
                  <TableCell className="text-right">
                    {batch.outputQuantity
                      ? `${Number(batch.outputQuantity).toLocaleString()} ${batch.outputUnit || ""}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatLKR(batch.totalRawCost)}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {new Date(batch.startedAt).toLocaleDateString("en-LK")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={batch.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
