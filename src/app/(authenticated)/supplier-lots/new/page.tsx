import { PageHeader } from "@/components/shared/page-header";
import { LotForm } from "@/components/supplier-lots/lot-form";

export default function NewSupplierLotPage() {
  return (
    <div>
      <PageHeader
        title="New Lot Intake"
        description="Record incoming coconut husk delivery from supplier"
        backHref="/supplier-lots"
      />
      <LotForm />
    </div>
  );
}
