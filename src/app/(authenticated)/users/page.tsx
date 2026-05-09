import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { getUsers } from "@/lib/queries/users";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canCreate = hasPermission(role, "users", "create");

  const users = await getUsers({ search: searchParams.search });

  const roleBadgeStyles: Record<string, string> = {
    OWNER: "bg-purple-50 text-purple-700 border-purple-200",
    MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
    PRODUCTION: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="pt-6">
      <PageHeader
        title="User Management"
        description="Manage system users and access control"
        action={
          canCreate ? (
            <Link href="/users/new">
              <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4">
        <SearchInput
          placeholder="Search by name or email..."
          paramName="search"
        />
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description={
            searchParams.search
              ? "Try a different search term"
              : "Add staff accounts to manage access"
          }
          action={
            canCreate && !searchParams.search ? (
              <Link href="/users/new">
                <Button className="bg-emerald-700 hover:bg-emerald-800">
                  Add User
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
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link
                      href={`/users/${u.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {u.name}
                    </Link>
                    {u.id === session!.user.id && (
                      <span className="ml-2 text-xs text-gray-400">(you)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={roleBadgeStyles[u.role] || ""}
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    {new Date(u.createdAt).toLocaleDateString("en-LK")}
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
