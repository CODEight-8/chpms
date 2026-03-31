import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default function NewSupplierPage() {
  return (
    <div>
      <PageHeader
        title="Add Supplier"
        description="Register a new coconut husk supplier"
        backHref="/suppliers"
      />
      <SupplierForm />
    </div>
  );
}
