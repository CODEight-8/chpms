import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { LotForm } from "@/components/supplier-lots/lot-form";

export default async function NewSupplierLotPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  if (!hasPermission(role, "supplier-lots", "create")) {
    redirect("/dashboard");
  }

  return (
    <div className="pt-6">
      <PageHeader
        title="New Lot Intake"
        description="Record incoming coconut husk delivery from supplier"
        backHref="/supplier-lots"
      />
      <LotForm />
    </div>
  );
}
