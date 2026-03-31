import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/clients/client-form";

export default function NewClientPage() {
  return (
    <div>
      <PageHeader
        title="Add Client"
        description="Register a new client"
      />
      <ClientForm />
    </div>
  );
}
