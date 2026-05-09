import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { OrderForm } from "@/components/orders/order-form";

export default async function NewOrderPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role as UserRole;
  if (!hasPermission(role, "orders", "create")) {
    redirect("/dashboard");
  }

  return (
    <div className="pt-6">
      <PageHeader
        title="New Order"
        description="Create a new client order with line items"
        backHref="/orders"
      />
      <OrderForm />
    </div>
  );
}
