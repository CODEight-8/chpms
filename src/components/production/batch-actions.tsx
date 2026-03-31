"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, Truck } from "lucide-react";
import { toast } from "sonner";

interface BatchActionsProps {
  batchId: string;
  currentStatus: string;
  productUnit: string;
  canEdit: boolean;
}

export function BatchActions({
  batchId,
  currentStatus,
  productUnit,
  canEdit,
}: BatchActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [outputQuantity, setOutputQuantity] = useState<number>(0);
  const [outputUnit, setOutputUnit] = useState(productUnit);

  async function handleComplete() {
    if (outputQuantity <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/production-batches/${batchId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputQuantity, outputUnit }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Batch marked as completed");
      setCompleteOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to complete batch"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDispatch() {
    setLoading(true);
    try {
      const res = await fetch(`/api/production-batches/${batchId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISPATCHED" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Batch marked as dispatched");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to dispatch batch"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!canEdit) return null;

  if (currentStatus === "IN_PROGRESS") {
    return (
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogTrigger asChild>
          <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2">
            <CheckCircle className="h-4 w-4" />
            Mark Complete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Production Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Output Quantity *</Label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={outputQuantity || ""}
                onChange={(e) =>
                  setOutputQuantity(parseFloat(e.target.value) || 0)
                }
                placeholder="e.g. 450"
              />
            </div>
            <div className="space-y-2">
              <Label>Output Unit *</Label>
              <Input
                value={outputUnit}
                onChange={(e) => setOutputUnit(e.target.value)}
                placeholder="e.g. kg"
              />
            </div>
            <Button
              onClick={handleComplete}
              className="w-full bg-emerald-700 hover:bg-emerald-800"
              disabled={loading || outputQuantity <= 0 || !outputUnit}
            >
              {loading ? "Completing..." : "Confirm Complete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (currentStatus === "COMPLETED") {
    return (
      <Button
        onClick={handleDispatch}
        disabled={loading}
        variant="outline"
        className="gap-2"
      >
        <Truck className="h-4 w-4" />
        {loading ? "Dispatching..." : "Mark Dispatched"}
      </Button>
    );
  }

  return null;
}
