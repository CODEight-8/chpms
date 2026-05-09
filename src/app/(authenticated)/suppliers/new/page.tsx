import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function NewSupplierPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  if (!hasPermission(role, "suppliers", "create")) {
    redirect("/dashboard");
  }

  return (
    <div className="pt-6">
      <PageHeader
        title="Add Supplier"
        description="Register a new coconut husk supplier"
        backHref="/suppliers"
      />
      <SupplierForm />
    </div>
  );
}
