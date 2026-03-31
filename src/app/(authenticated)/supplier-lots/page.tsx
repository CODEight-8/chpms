import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole, LotStatus } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { getLotsWithAging, getLotStatusCounts } from "@/lib/queries/supplier-lots";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { GradeBadge } from "@/components/shared/grade-badge";
import { AgingIndicator } from "@/components/supplier-lots/aging-indicator";
import { LotStatusTabs } from "@/components/supplier-lots/lot-status-tabs";
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
import { Plus, Package, ClipboardCheck, CheckCircle, XCircle } from "lucide-react";

export default async function SupplierLotsPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canCreate = hasPermission(role, "supplier-lots", "create");

  const statusFilter = searchParams.status as LotStatus | undefined;
  const [lots, counts] = await Promise.all([
    getLotsWithAging({ status: statusFilter, search: searchParams.search }),
    getLotStatusCounts(),
  ]);

  return (
    <div>
      <PageHeader
        title="Supplier Lots"
        description="Material intake, quality audit, and batch aging"
        action={
          canCreate ? (
            <Link href="/supplier-lots/new">
              <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                <Plus className="h-4 w-4" />
                New Lot Intake
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="In Audit"
          value={counts.AUDIT}
          icon={ClipboardCheck}
        />
        <SummaryCard
          title="Good to Go"
          value={counts.GOOD_TO_GO}
          icon={CheckCircle}
        />
        <SummaryCard
          title="Allocated"
          value={counts.ALLOCATED}
          icon={Package}
        />
        <SummaryCard
          title="Rejected"
          value={counts.REJECTED}
          icon={XCircle}
        />
      </div>

      {/* Search + Status Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput
          placeholder="Search by lot #, invoice #, or supplier..."
          paramName="search"
        />
        <LotStatusTabs counts={counts} />
      </div>

      {/* Lots Table */}
      {lots.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No lots found"
          description={
            statusFilter
              ? `No lots with status "${statusFilter.replace("_", " ")}"`
              : "Create your first lot intake to get started"
          }
          action={
            canCreate && !statusFilter ? (
              <Link href="/supplier-lots/new">
                <Button className="bg-emerald-700 hover:bg-emerald-800">
                  New Lot Intake
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
                <TableHead>Lot #</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-center">Husks</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell>
                    <Link
                      href={`/supplier-lots/${lot.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {lot.lotNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs font-mono">
                    {lot.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/suppliers/${lot.supplier.id}`}
                      className="text-gray-700 hover:underline"
                    >
                      {lot.supplier.name}
                    </Link>
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
                    <AgingIndicator days={lot.batchAging} compact />
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
        </div>
      )}
    </div>
  );
}
