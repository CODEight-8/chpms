"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

interface ClientActionsProps {
  clientId: string;
  clientName: string;
  isActive: boolean;
  canDeactivate: boolean;
  canReactivate: boolean;
}

export function ClientActions({
  clientId,
  clientName,
  isActive,
  canDeactivate,
  canReactivate,
}: ClientActionsProps) {
  const router = useRouter();

  if ((isActive && !canDeactivate) || (!isActive && !canReactivate)) {
    return null;
  }

  async function handleToggleActive() {
    if (isActive) {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to deactivate");
      }
      toast.success(`${clientName} has been deactivated`);
      router.push("/clients");
      router.refresh();
      return;
    }

    const res = await fetch(`/api/clients/${clientId}/reactivate`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to reactivate");
    }
    toast.success(`${clientName} has been reactivated`);
    router.refresh();
  }

  return (
    <ConfirmDialog
      title={isActive ? `Deactivate ${clientName}?` : `Reactivate ${clientName}?`}
      description={
        isActive
          ? "This client will be hidden from active lists and can no longer receive new orders. Existing orders and payment history will be preserved."
          : "This client will appear again in active lists and can receive new orders."
      }
      confirmLabel={isActive ? "Deactivate" : "Reactivate"}
      variant={isActive ? "destructive" : "default"}
      onConfirm={handleToggleActive}
    >
      <Button
        variant="outline"
        className={
          isActive
            ? "text-red-600 border-red-200 hover:bg-red-50 gap-2"
            : "text-green-600 border-green-200 hover:bg-green-50 gap-2"
        }
      >
        {isActive ? (
          <>
            <UserX className="h-4 w-4" />
            Deactivate Client
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4" />
            Reactivate Client
          </>
        )}
      </Button>
    </ConfirmDialog>
  );
}
