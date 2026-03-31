"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  const [loading, setLoading] = useState(false);

  async function transitionStatus(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Order status updated`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === "PENDING" && (
        <>
          <Button
            onClick={() => transitionStatus("CONFIRMED")}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            Confirm Order
          </Button>
          <Button
            onClick={() => transitionStatus("CANCELLED")}
            disabled={loading}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </Button>
        </>
      )}

      {currentStatus === "CONFIRMED" && (
        <Button
          onClick={() => transitionStatus("CANCELLED")}
          disabled={loading}
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
        >
          <XCircle className="h-4 w-4" />
          Cancel Order
        </Button>
      )}

      {currentStatus === "FULFILLED" && (
        <Button
          onClick={() => transitionStatus("DISPATCHED")}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <Truck className="h-4 w-4" />
          Mark Dispatched
        </Button>
      )}
    </div>
  );
}
