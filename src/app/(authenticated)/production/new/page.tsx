import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/components/production/batch-form";

export default function NewProductionBatchPage() {
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
