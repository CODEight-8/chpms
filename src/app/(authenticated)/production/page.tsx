import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole, BatchStatus } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import {
  getBatchOutputSummary,
  getBatchesWithDetails,
  getBatchStatusCounts,
} from "@/lib/queries/production-batches";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { Pagination } from "@/components/shared/pagination";
import { parsePagination } from "@/lib/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import {
  PREPARATION_BADGE,
  PREPARATION_LABEL,
} from "@/components/shared/preparation";
import { StatusBadge } from "@/components/shared/status-badge";
import { BatchStatusTabs } from "@/components/production/batch-status-tabs";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Factory, CheckCircle, Package, PackageCheck } from "lucide-react";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canCreate = hasPermission(role, "production", "create");

  const statusParam = pickString(searchParams.status);
  const statusFilter =
    statusParam &&
    Object.values(BatchStatus).includes(statusParam as BatchStatus)
      ? (statusParam as BatchStatus)
      : undefined;
  const search = pickString(searchParams.search);
  const pg = parsePagination(searchParams);
  const [batchesResult, counts, outputSummary] = await Promise.all([
    getBatchesWithDetails(
      { status: statusFilter, search },
      { skip: pg.skip, take: pg.take }
    ),
    getBatchStatusCounts(),
    getBatchOutputSummary(),
  ]);
  const { rows: batches, total } = batchesResult;

  // Always render at least one Total/Available pair so the layout stays
  // consistent even when there are no completed batches yet. Suppress L cards
  // unless there is liter output to avoid empty noise on kg-only setups.
  const unitsWithData = Object.entries(outputSummary.byUnit).filter(
    ([, t]) => t.totalOutput > 0 || t.availableOutput > 0
  );
  const summaryUnits =
    unitsWithData.length > 0
      ? unitsWithData
      : [["kg", { totalOutput: 0, availableOutput: 0 }] as const];

  return (
    <div className="pt-6">
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 mb-6">
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
        {summaryUnits.map(([unit, totals]) => (
          <SummaryCard
            key={`total-${unit}`}
            title={
              summaryUnits.length > 1
                ? `Total Output (${unit})`
                : "Total Output"
            }
            value={`${totals.totalOutput.toLocaleString()} ${unit}`}
            tooltip={`Total ${unit} output produced by completed batches.`}
            icon={Package}
          />
        ))}
        {summaryUnits.map(([unit, totals]) => (
          <SummaryCard
            key={`avail-${unit}`}
            title={
              summaryUnits.length > 1
                ? `Available Output (${unit})`
                : "Available Output"
            }
            value={`${totals.availableOutput.toLocaleString()} ${unit}`}
            tooltip={`Completed ${unit} output still available for orders.`}
            icon={PackageCheck}
          />
        ))}
      </div>

      {/* Search + Status Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput
          placeholder="Search by batch # or product..."
          paramName="search"
        />
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
          <Pagination
            total={total}
            page={pg.page}
            perPage={pg.perPage}
            pageParam={pg.pageParam}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch #</TableHead>
                <TableHead>Chip Size</TableHead>
                <TableHead>Prep</TableHead>
                <TableHead className="text-center">Input Husks</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead>Quality</TableHead>
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
                  <TableCell className="text-gray-600">
                    {batch.chipSize || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={PREPARATION_BADGE[batch.preparation]}
                    >
                      {PREPARATION_LABEL[batch.preparation]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {batch.totalInputHusks.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {batch.outputQuantity
                      ? `${Number(batch.outputQuantity).toLocaleString()} ${batch.outputUnit || ""}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {batch.qualityGrade ? (
                      <Badge
                        variant="outline"
                        className={
                          batch.qualityGrade === "GOOD"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : batch.qualityGrade === "AVERAGE"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-red-100 text-red-800 border-red-200"
                        }
                      >
                        {batch.qualityGrade}
                      </Badge>
                    ) : (
                      "-"
                    )}
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
          <Pagination
            total={total}
            page={pg.page}
            perPage={pg.perPage}
            pageParam={pg.pageParam}
          />
        </div>
      )}
    </div>
  );
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
