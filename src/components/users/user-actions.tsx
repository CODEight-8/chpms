"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface UserActionsProps {
  userId: string;
  userName: string;
  isActive: boolean;
  isSelf: boolean;
}

export function UserActions({
  userId,
  userName,
  isActive,
  isSelf,
}: UserActionsProps) {
  const router = useRouter();

  if (isSelf) return null;

  async function handleToggleActive() {
    if (isActive) {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to deactivate");
      }
      toast.success(`${userName} has been deactivated`);
    } else {
      const res = await fetch(`/api/users/${userId}/reactivate`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reactivate");
      }
      toast.success(`${userName} has been reactivated`);
    }
    router.refresh();
  }

  return (
    <ConfirmDialog
      title={isActive ? `Deactivate ${userName}?` : `Reactivate ${userName}?`}
      description={
        isActive
          ? "This user will no longer be able to log in. You can reactivate them later."
          : "This user will be able to log in again with their existing credentials."
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
            Deactivate
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4" />
            Reactivate
          </>
        )}
      </Button>
    </ConfirmDialog>
  );
}
