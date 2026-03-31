import { PageHeader } from "@/components/shared/page-header";
import { OrderForm } from "@/components/orders/order-form";

export default function NewOrderPage() {
  return (
    <div>
      <PageHeader
        title="New Order"
        description="Create a new client order with line items"
      />
      <OrderForm />
    </div>
  );
}
