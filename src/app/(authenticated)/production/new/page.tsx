import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/components/production/batch-form";

export default async function NewProductionBatchPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  if (!hasPermission(role, "production", "create")) {
    redirect("/dashboard");
  }

  return (
    <div className="pt-6">
      <PageHeader
        title="New Production Batch"
        description="Select husk lots to produce coconut husk chips"
        backHref="/production"
      />
      <BatchForm />
    </div>
  );
}
