"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { XCircle, Truck, ClipboardCheck } from "lucide-react";
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
      {currentStatus === "PENDING" && (
        <>
          <ConfirmDialog
            trigger={
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Confirm Order
              </Button>
            }
            title="Confirm this order?"
            description="This will move the order to Confirmed status. The order can then be fulfilled with production batches."
            confirmLabel="Confirm Order"
            onConfirm={() => transitionStatus("CONFIRMED")}
          />
          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            }
            title="Cancel this order?"
            description="This action cannot be undone. The order will be permanently marked as cancelled."
            confirmLabel="Cancel Order"
            variant="destructive"
            onConfirm={() => transitionStatus("CANCELLED")}
          />
        </>
      )}

      {currentStatus === "CONFIRMED" && (
        <ConfirmDialog
          trigger={
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
            >
              <XCircle className="h-4 w-4" />
              Cancel Order
            </Button>
          }
          title="Cancel this confirmed order?"
          description="This action cannot be undone. Any existing fulfillments will remain recorded but the order will be marked as cancelled."
          confirmLabel="Cancel Order"
          variant="destructive"
          onConfirm={() => transitionStatus("CANCELLED")}
        />
      )}

      {currentStatus === "FULFILLED" && (
        <>
          <ConfirmDialog
            trigger={
              <Button variant="outline" className="gap-2">
                <Truck className="h-4 w-4" />
                Mark Dispatched
              </Button>
            }
            title="Mark as dispatched?"
            description="This confirms the order has been shipped to the client. This action cannot be undone."
            confirmLabel="Mark Dispatched"
            onConfirm={() => transitionStatus("DISPATCHED")}
          />
          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel Order
              </Button>
            }
            title="Cancel this fulfilled order?"
            description="This action cannot be undone. The order will be marked as cancelled even though it has been fulfilled."
            confirmLabel="Cancel Order"
            variant="destructive"
            onConfirm={() => transitionStatus("CANCELLED")}
          />
        </>
      )}
    </div>
  );
}
