import { PageHeader } from "@/components/shared/page-header";
import { OrderForm } from "@/components/orders/order-form";

export default function NewOrderPage() {
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
