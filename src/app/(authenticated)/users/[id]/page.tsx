import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { getUserById } from "@/lib/queries/users";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/components/users/user-form";
import { UserActions } from "@/components/users/user-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  const canEdit = hasPermission(role, "users", "edit");
  const canDelete = hasPermission(role, "users", "delete");

  const user = await getUserById(params.id);
  if (!user) notFound();

  const isSelf = user.id === session!.user.id;

  const roleBadgeStyles: Record<string, string> = {
    OWNER: "bg-purple-50 text-purple-700 border-purple-200",
    MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
    PRODUCTION: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div className="pt-6">
      <PageHeader
        title={user.name}
        description={`${user.role} account`}
        backHref="/users"
        action={
          canDelete ? (
            <UserActions
              userId={user.id}
              userName={user.name}
              isActive={user.isActive}
              isSelf={isSelf}
            />
          ) : undefined
        }
      />

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {canEdit && <TabsTrigger value="edit">Edit User</TabsTrigger>}
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1">
                    <Badge
                      variant="outline"
                      className={roleBadgeStyles[user.role] || ""}
                    >
                      {user.role}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <Badge
                      variant="outline"
                      className={
                        user.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString("en-LK", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Last Updated
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(user.updatedAt).toLocaleDateString("en-LK", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {canEdit && (
          <TabsContent value="edit">
            <UserForm
              defaultValues={{
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
