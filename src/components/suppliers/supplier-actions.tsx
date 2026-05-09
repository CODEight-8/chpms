"use client";

import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

interface SupplierActionsProps {
  supplierId: string;
  supplierName: string;
  isActive: boolean;
  canDeactivate: boolean;
  canReactivate: boolean;
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (data?.error) {
      return data.error as string;
    }
  } catch {}

  return fallback;
}

export function SupplierActions({
  supplierId,
  supplierName,
  isActive,
  canDeactivate,
  canReactivate,
}: SupplierActionsProps) {
  const router = useRouter();

  if ((isActive && !canDeactivate) || (!isActive && !canReactivate)) {
    return null;
  }

  async function handleToggleActive() {
    if (isActive) {
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(
          await getErrorMessage(res, "Failed to deactivate supplier")
        );
      }

      toast.success(
        `${supplierName} has been deactivated. Existing lots and payments are preserved.`
      );
      router.push("/suppliers");
      router.refresh();
      return;
    }

    const res = await fetch(`/api/suppliers/${supplierId}/reactivate`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(
        await getErrorMessage(res, "Failed to reactivate supplier")
      );
    }

    toast.success(`${supplierName} has been reactivated`);
    router.refresh();
  }

  return (
    <ConfirmDialog
      title={isActive ? `Deactivate ${supplierName}?` : `Reactivate ${supplierName}?`}
      description={
        isActive
          ? "This supplier will be hidden from new transaction flows. Existing lots, invoices, and payments will be kept."
          : "This supplier will be available again for new lots and supplier payments."
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
            Deactivate Supplier
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4" />
            Reactivate Supplier
          </>
        )}
      </Button>
    </ConfirmDialog>
  );
}
