import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/components/users/user-form";

export default async function NewUserPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  if (!hasPermission(role, "users", "create")) {
    redirect("/dashboard");
  }

  return (
    <div className="pt-6">
      <PageHeader
        title="Add User"
        description="Create a new system user"
        backHref="/users"
      />
      <UserForm />
    </div>
  );
}
