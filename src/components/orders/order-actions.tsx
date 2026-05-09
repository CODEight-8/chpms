"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { XCircle, Truck } from "lucide-react";
import { toast } from "sonner";

interface OrderActionsProps {
  orderId: string;
  currentStatus: string;
  canEdit: boolean;
}

export function OrderActions({
  orderId,
  currentStatus,
  canEdit,
}: OrderActionsProps) {
  const router = useRouter();

  async function transitionStatus(status: string) {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    toast.success("Order status updated");
    router.refresh();
  }

  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === "CONFIRMED" && (
        <ConfirmDialog
          title="Cancel this confirmed order?"
          description="This action cannot be undone. Any existing fulfillments will remain recorded but the order will be marked as cancelled."
          confirmLabel="Cancel Order"
          variant="destructive"
          onConfirm={() => transitionStatus("CANCELLED")}
        >
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
          >
            <XCircle className="h-4 w-4" />
            Cancel Order
          </Button>
        </ConfirmDialog>
      )}

      {currentStatus === "FULFILLED" && (
        <>
          <ConfirmDialog
            title="Mark as dispatched?"
            description="This confirms the order has been shipped to the client. This action cannot be undone."
            confirmLabel="Mark Dispatched"
            onConfirm={() => transitionStatus("DISPATCHED")}
          >
            <Button variant="outline" className="gap-2">
              <Truck className="h-4 w-4" />
              Mark Dispatched
            </Button>
          </ConfirmDialog>
          <ConfirmDialog
            title="Cancel this fulfilled order?"
            description="This action cannot be undone. The order will be marked as cancelled even though it has been fulfilled."
            confirmLabel="Cancel Order"
            variant="destructive"
            onConfirm={() => transitionStatus("CANCELLED")}
          >
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
            >
              <XCircle className="h-4 w-4" />
              Cancel Order
            </Button>
          </ConfirmDialog>
        </>
      )}
    </div>
  );
}
