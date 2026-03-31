import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { formatLKR } from "@/lib/currency";
import { getClientsWithStats } from "@/lib/queries/clients";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
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
  searchParams: { search?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canCreate = hasPermission(role, "clients", "create");

  const clients = await getClientsWithStats({
    active: true,
    search: searchParams.search,
  });

  return (
    <div>
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

      <div className="mb-4">
        <SearchInput placeholder="Search clients by name, company, or phone..." />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description={
            searchParams.search
              ? "Try a different search term"
              : "Add your first client to start managing orders"
          }
          action={
            canCreate && !searchParams.search ? (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
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
                    {client.companyName || "\u2014"}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {client.phone || "\u2014"}
                  </TableCell>
                  <TableCell className="text-center">
                    {client.totalOrders}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {client.totalRevenue > 0
                      ? formatLKR(client.totalRevenue)
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {client.outstandingBalance > 0 ? (
                      <span className="text-orange-600">
                        {formatLKR(client.outstandingBalance)}
                      </span>
                    ) : (
                      <span className="text-gray-500">\u2014</span>
                    )}
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
