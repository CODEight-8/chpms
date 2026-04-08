import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSuppliersWithStats } from "@/lib/queries/suppliers";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { StatusFilter } from "@/components/shared/status-filter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Truck } from "lucide-react";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: { search?: string; active?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canCreate = hasPermission(role, "suppliers", "create");
  const activeFilter =
    searchParams.active === "false"
      ? false
      : searchParams.active === "true" || !searchParams.active
        ? true
        : undefined;

  const suppliers = await getSuppliersWithStats({
    active: activeFilter,
    search: searchParams.search,
  });

  return (
    <div className="pt-6">
      <PageHeader
        title="Suppliers"
        description="Manage supplier accounts, including inactive suppliers with preserved history"
        action={
          canCreate ? (
            <Link href="/suppliers/new">
              <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                <Plus className="h-4 w-4" />
                Add Supplier
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput
          placeholder="Search by name, phone, or location..."
          paramName="search"
        />
        <StatusFilter />
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={searchParams.search ? "No suppliers found" : "No suppliers yet"}
          description={
            searchParams.search
              ? `No suppliers matching "${searchParams.search}"`
              : searchParams.active === "false"
                ? "No inactive suppliers found"
                : searchParams.active === undefined || searchParams.active === "true"
                  ? "No active suppliers found"
              : "Add your first supplier to start receiving materials"
          }
          action={
            canCreate && !searchParams.search ? (
              <Link href="/suppliers/new">
                <Button className="bg-emerald-700 hover:bg-emerald-800">
                  Add Supplier
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
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Total Lots</TableHead>
                <TableHead className="text-center">Rejection Rate</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {supplier.phone || "—"}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {supplier.location || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {supplier.totalLots}
                  </TableCell>
                  <TableCell className="text-center">
                    {supplier.rejectionRate > 0 ? (
                      <span className="text-red-600">
                        {supplier.rejectionRate.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-green-600">0%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {supplier.outstandingBalance > 0 ? (
                      <span className="text-orange-600">
                        {formatLKR(supplier.outstandingBalance)}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        supplier.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }
                    >
                      {supplier.isActive ? "Active" : "Inactive"}
                    </Badge>
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
