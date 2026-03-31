import { PageHeader } from "@/components/shared/page-header";
import { BatchForm } from "@/components/production/batch-form";

export default function NewProductionBatchPage() {
  return (
    <div>
      <PageHeader
        title="New Production Batch"
        description="Select husk lots to produce coconut husk chips"
      />
      <BatchForm />
    </div>
  );
}
