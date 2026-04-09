import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessModule } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/clients/client-form";

export default async function NewClientPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  if (!canAccessModule(role, "clients")) {
    redirect("/dashboard");
  }

  return (
    <div className="pt-6">
      <PageHeader
        title="Add Client"
        description="Register a new client"
        backHref="/clients"
      />
      <ClientForm />
    </div>
  );
}
