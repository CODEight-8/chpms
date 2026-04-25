"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatLKR } from "@/lib/currency";
import { PackageCheck, AlertTriangle, Plus, Trash2 } from "lucide-react";

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
  totalRawCost: string;
}

interface BatchAllocation {
  batchId: string;
  quantity: number;
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
  const [allocations, setAllocations] = useState<BatchAllocation[]>([]);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams({ status: "COMPLETED" });
    if (chipSize) params.set("chipSize", chipSize);

    fetch(`/api/production-batches?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setBatches(data);
        setAllocations([]);
      })
      .catch(() => toast.error("Failed to load batches"));
  }, [open, chipSize]);

  const totalAvailable = useMemo(
    () => batches.reduce((sum, b) => sum + Number(b.outputQuantity), 0),
    [batches]
  );

  const totalAllocated = useMemo(
    () => allocations.reduce((sum, a) => sum + a.quantity, 0),
    [allocations]
  );

  const totalAllocatedCost = useMemo(
    () =>
      allocations.reduce((sum, a) => {
        const batch = batches.find((b) => b.id === a.batchId);
        if (!batch) return sum;
        const output = Number(batch.outputQuantity) || 1;
        return sum + (a.quantity / output) * Number(batch.totalRawCost);
      }, 0),
    [allocations, batches]
  );

  const isShortage = totalAvailable < remaining;
  const allocatedBatchIds = new Set(allocations.map((a) => a.batchId));
  const availableBatches = batches.filter((b) => !allocatedBatchIds.has(b.id));

  function addBatch(batchId: string) {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;

    const batchAvailable = Number(batch.outputQuantity);
    const stillNeeded = remaining - totalAllocated;
    const qty = Math.min(batchAvailable, Math.max(stillNeeded, 0));

    setAllocations((prev) => [...prev, { batchId, quantity: qty }]);
  }

  function removeBatch(batchId: string) {
    setAllocations((prev) => prev.filter((a) => a.batchId !== batchId));
  }

  function updateQuantity(batchId: string, quantity: number) {
    setAllocations((prev) =>
      prev.map((a) => (a.batchId === batchId ? { ...a, quantity } : a))
    );
  }

  function getBatch(batchId: string) {
    return batches.find((b) => b.id === batchId);
  }

  async function handleSubmit() {
    if (allocations.length === 0 || totalAllocated <= 0) return;

    const invalidAlloc = allocations.find((a) => {
      const batch = getBatch(a.batchId);
      return !batch || a.quantity <= 0 || a.quantity > Number(batch.outputQuantity);
    });
    if (invalidAlloc) {
      toast.error("Invalid quantity for one or more batches");
      return;
    }

    if (totalAllocated > remaining) {
      toast.error(`Total allocated (${totalAllocated} ${unit}) exceeds remaining (${remaining} ${unit})`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillments: allocations.map((a) => ({
            orderItemId,
            productionBatchId: a.batchId,
            quantityFulfilled: a.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fulfill");
      }

      toast.success("Order item fulfilled");
      setOpen(false);
      setAllocations([]);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fulfill Order Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Order item summary */}
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

          {/* Shortage warning */}
          {isShortage && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Insufficient stock</p>
                <p className="text-xs mt-0.5">
                  Only {totalAvailable.toLocaleString()} {unit} available from{" "}
                  {chipSize ? `${chipSize} ` : ""}batches ({remaining.toLocaleString()}{" "}
                  {unit} needed).
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
              {/* Allocated batches */}
              {allocations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Selected Batches
                  </p>
                  {allocations.map((alloc) => {
                    const batch = getBatch(alloc.batchId);
                    if (!batch) return null;
                    const output = Number(batch.outputQuantity) || 1;
                    const allocCost =
                      (alloc.quantity / output) * Number(batch.totalRawCost);
                    return (
                      <div
                        key={alloc.batchId}
                        className="flex items-center gap-2 p-2 bg-white border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono font-medium truncate">
                            {batch.batchNumber}
                            {batch.chipSize && (
                              <span className="text-xs text-blue-600 ml-1">
                                [{batch.chipSize}]
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Number(batch.outputQuantity).toLocaleString()}{" "}
                            {batch.outputUnit} available
                            <span className="ml-2 text-orange-600 font-medium">
                              Cost: {formatLKR(allocCost)}
                            </span>
                          </p>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            min={0.01}
                            max={Number(batch.outputQuantity)}
                            step={0.01}
                            value={alloc.quantity || ""}
                            onChange={(e) =>
                              updateQuantity(
                                alloc.batchId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-6">
                          {unit}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeBatch(alloc.batchId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}

                  {/* Total allocated bar */}
                  <div className="p-2 bg-gray-50 rounded-lg border space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">
                        Total Allocated
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          totalAllocated > remaining
                            ? "text-red-600"
                            : totalAllocated === remaining
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {totalAllocated.toLocaleString()} / {remaining.toLocaleString()}{" "}
                        {unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Production Cost
                      </span>
                      <span className="text-xs font-medium text-orange-600">
                        {formatLKR(totalAllocatedCost)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Add batch selector */}
              {availableBatches.length > 0 && totalAllocated < remaining && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {allocations.length === 0
                      ? "Select Batches"
                      : "Add Another Batch"}
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-lg">
                    {availableBatches.map((b) => {
                      const costPerUnit =
                        Number(b.outputQuantity) > 0
                          ? Number(b.totalRawCost) / Number(b.outputQuantity)
                          : 0;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => addBatch(b.id)}
                          className="w-full flex items-center justify-between p-2 hover:bg-emerald-50 text-left transition-colors"
                        >
                          <div>
                            <span className="text-sm font-mono font-medium">
                              {b.batchNumber}
                            </span>
                            {b.chipSize && (
                              <span className="text-xs text-blue-600 ml-1">
                                [{b.chipSize}]
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">
                              {formatLKR(costPerUnit)}/{b.outputUnit}
                            </span>
                            <span className="text-xs text-gray-500">
                              {Number(b.outputQuantity).toLocaleString()}{" "}
                              {b.outputUnit}
                            </span>
                            <Plus className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                className={`w-full ${totalAllocated < remaining ? "bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200" : "bg-emerald-700 text-white hover:bg-emerald-800"}`}
                disabled={
                  loading ||
                  allocations.length === 0 ||
                  totalAllocated <= 0 ||
                  totalAllocated > remaining
                }
              >
                {loading
                  ? "Fulfilling..."
                  : totalAllocated < remaining
                  ? `Confirm Partial Fulfillment (${totalAllocated.toLocaleString()} ${unit})`
                  : `Confirm Fulfillment (${totalAllocated.toLocaleString()} ${unit})`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
