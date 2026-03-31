import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/components/users/user-form";

export default function NewUserPage() {
  return (
    <div>
      <PageHeader
        title="Add User"
        description="Create a new system user"
        backHref="/users"
      />
      <UserForm />
    </div>
  );
}
