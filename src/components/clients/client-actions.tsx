"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserX } from "lucide-react";
import { toast } from "sonner";

interface ClientActionsProps {
  clientId: string;
  clientName: string;
  isActive: boolean;
  canEdit: boolean;
}

export function ClientActions({
  clientId,
  clientName,
  isActive,
  canEdit,
}: ClientActionsProps) {
  const router = useRouter();

  if (!canEdit || !isActive) return null;

  async function handleDeactivate() {
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to deactivate");
    }
    toast.success(`${clientName} has been deactivated`);
    router.push("/clients");
    router.refresh();
  }

  return (
    <ConfirmDialog
      title={`Deactivate ${clientName}?`}
      description="This client will be hidden from active lists and can no longer receive new orders. Existing orders and payment history will be preserved."
      confirmLabel="Deactivate"
      variant="destructive"
      onConfirm={handleDeactivate}
    >
      <Button
        variant="outline"
        className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
      >
        <UserX className="h-4 w-4" />
        Deactivate Client
      </Button>
    </ConfirmDialog>
  );
}
