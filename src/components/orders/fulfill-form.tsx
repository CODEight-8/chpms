"use client";

import { useState, useEffect } from "react";
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
import { PackageCheck } from "lucide-react";

interface FulfillFormProps {
  orderId: string;
  orderItemId: string;
  productName: string;
  remaining: number;
  unit: string;
}

interface CompletedBatch {
  id: string;
  batchNumber: string;
  outputQuantity: string;
  outputUnit: string;
}

export function FulfillForm({
  orderId,
  orderItemId,
  productName,
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
    fetch("/api/production-batches?status=COMPLETED")
      .then((r) => r.json())
      .then((data) => setBatches(data))
      .catch(() => toast.error("Failed to load batches"));
  }, [open]);

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
          variant="outline"
          className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
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
            </p>
          </div>

          <div className="space-y-2">
            <Label>Production Batch *</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a completed batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batchNumber} — {Number(b.outputQuantity).toLocaleString()}{" "}
                    {b.outputUnit} available
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
