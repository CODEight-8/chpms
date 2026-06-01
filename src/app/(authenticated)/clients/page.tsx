import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessModule, hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { formatSriLankaPhoneNumber } from "@/lib/utils";
import { getClientsWithStats } from "@/lib/queries/clients";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { parsePagination } from "@/lib/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { StatusFilter } from "@/components/shared/status-filter";
import { EmptyState } from "@/components/shared/empty-state";
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
import { Plus, Users } from "lucide-react";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  if (!canAccessModule(role, "clients")) {
    redirect("/dashboard");
  }
  const canCreate = hasPermission(role, "clients", "create");
  const search = pickString(searchParams.search);
  const activeRaw = pickString(searchParams.active);
  const activeFilter =
    activeRaw === "all" ? undefined : activeRaw === "false" ? false : true;
  const pg = parsePagination(searchParams);

  const { rows: clients, total } = await getClientsWithStats(
    { active: activeFilter, search },
    { skip: pg.skip, take: pg.take }
  );

  return (
    <div className="pt-6">
      <PageHeader
        title="Clients"
        description="Manage client accounts and orders"
        action={
          canCreate ? (
            <Link href="/clients/new">
              <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchInput placeholder="Search clients by name, company, or phone..." />
        <StatusFilter />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description={
            search
              ? "Try a different search term"
              : activeRaw === "false"
                ? "No inactive clients found"
                : activeRaw === undefined || activeRaw === "true"
                  ? "No active clients found"
                  : "Add your first client to start managing orders"
          }
          action={
            canCreate && !search ? (
              <Link href="/clients/new">
                <Button className="bg-emerald-700 hover:bg-emerald-800">
                  Add Client
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
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {client.companyName || "-"}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatSriLankaPhoneNumber(client.phone) || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {client.totalOrders}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {client.totalRevenue > 0
                      ? formatLKR(client.totalRevenue)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {client.outstandingBalance > 0 ? (
                      <span className="text-orange-600">
                        {formatLKR(client.outstandingBalance)}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        client.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }
                    >
                      {client.isActive ? "Active" : "Inactive"}
                    </Badge>
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
