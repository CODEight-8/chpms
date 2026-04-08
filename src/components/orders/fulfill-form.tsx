"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PackageCheck, AlertTriangle } from "lucide-react";

interface FulfillFormProps {
  orderId: string;
  orderItemId: string;
  productName: string;
  chipSize?: string | null;
  remaining: number;
  unit: string;
}

interface CompletedBatch {
  id: string;
  batchNumber: string;
  chipSize: string | null;
  outputQuantity: string;
  outputUnit: string;
}

export function FulfillForm({
  orderId,
  orderItemId,
  productName,
  chipSize,
  remaining,
  unit,
}: FulfillFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<CompletedBatch[]>([]);
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState<number>(remaining);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams({ status: "COMPLETED" });
    if (chipSize) params.set("chipSize", chipSize);

    fetch(`/api/production-batches?${params}`)
      .then((r) => r.json())
      .then((data) => setBatches(data))
      .catch(() => toast.error("Failed to load batches"));
  }, [open, chipSize]);

  const totalAvailable = useMemo(
    () => batches.reduce((sum, b) => sum + Number(b.outputQuantity), 0),
    [batches]
  );

  const isShortage = totalAvailable < remaining;

  async function handleSubmit() {
    if (!batchId || quantity <= 0) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillments: [
            {
              orderItemId,
              productionBatchId: batchId,
              quantityFulfilled: quantity,
            },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fulfill");
      }

      toast.success("Order item fulfilled");
      setOpen(false);
      setBatchId("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="min-w-[104px] gap-1.5 bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
        >
          <PackageCheck className="h-3.5 w-3.5" />
          Fulfill
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fulfill Order Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium">{productName}</p>
            <p className="text-xs text-gray-500">
              {remaining.toLocaleString()} {unit} remaining to fulfill
              {chipSize && (
                <span className="ml-1 font-medium text-gray-700">
                  ({chipSize} chips)
                </span>
              )}
            </p>
          </div>

          {isShortage && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Insufficient stock</p>
                <p className="text-xs mt-0.5">
                  Only {totalAvailable.toLocaleString()} {unit} available from{" "}
                  {chipSize ? `${chipSize} ` : ""}batches ({remaining.toLocaleString()}{" "}
                  {unit} needed). You may need to create more production batches.
                </p>
              </div>
            </div>
          )}

          {batches.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              No completed {chipSize ? `${chipSize} ` : ""}batches available
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Production Batch *</Label>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a completed batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.batchNumber}
                        {b.chipSize ? ` — ${b.chipSize}` : ""} —{" "}
                        {Number(b.outputQuantity).toLocaleString()} {b.outputUnit}{" "}
                        available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity ({unit}) *</Label>
                <Input
                  type="number"
                  min={0.01}
                  max={remaining}
                  step={0.01}
                  value={quantity || ""}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                />
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-emerald-700 hover:bg-emerald-800"
                disabled={loading || !batchId || quantity <= 0}
              >
                {loading ? "Fulfilling..." : "Confirm Fulfillment"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
