"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldErrors } from "@/lib/use-field-errors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus } from "lucide-react";

interface LotOption {
  id: string;
  lotNumber: string;
  invoiceNumber: string;
  outstanding: number;
}

interface RecordSupplierPaymentProps {
  supplierId: string;
  supplierName: string;
  lots?: LotOption[];
}

type RowState = { selected: boolean; amount: number };

function formatLKR(n: number): string {
  return n.toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function RecordSupplierPayment({
  supplierId,
  supplierName,
  lots,
}: RecordSupplierPaymentProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { validate } = useFieldErrors();
  const [method, setMethod] = useState("CASH");
  const [totalAmount, setTotalAmount] = useState(0);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const hasLotOptions = Boolean(lots && lots.length > 0);

  const selectedRows = useMemo(
    () =>
      Object.entries(rows)
        .filter(([, r]) => r.selected)
        .map(([id, r]) => ({ id, amount: r.amount })),
    [rows]
  );
  const allocSum = selectedRows.reduce((s, r) => s + r.amount, 0);
  const delta = totalAmount - allocSum;
  const isAllocated =
    totalAmount > 0 &&
    selectedRows.length > 0 &&
    Math.abs(delta) < 0.01 &&
    selectedRows.every((r) => r.amount > 0);

  function toggleLot(lot: LotOption) {
    setRows((prev) => {
      const current = prev[lot.id];
      if (current?.selected) {
        return { ...prev, [lot.id]: { selected: false, amount: 0 } };
      }
      // Auto-fill amount: min(outstanding, remaining unallocated budget)
      const otherAllocated = Object.entries(prev)
        .filter(([id, r]) => r.selected && id !== lot.id)
        .reduce((s, [, r]) => s + r.amount, 0);
      const remainingBudget = Math.max(0, totalAmount - otherAllocated);
      const auto = Math.min(lot.outstanding, remainingBudget);
      return { ...prev, [lot.id]: { selected: true, amount: auto } };
    });
  }

  function updateAmount(lotId: string, amount: number) {
    setRows((prev) => ({
      ...prev,
      [lotId]: { selected: true, amount: Math.max(0, amount) },
    }));
  }

  function resetForm() {
    setTotalAmount(0);
    setRows({});
    setMethod("CASH");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate(e.currentTarget)) return;

    if (!isAllocated) {
      toast.error(
        "Allocations must total exactly the payment amount, with at least one lot selected."
      );
      return;
    }

    setLoading(true);

    const form = new FormData(e.currentTarget);
    const allocations = selectedRows.map((r) => ({
      supplierLotId: r.id,
      amount: r.amount,
    }));

    const data = {
      supplierId,
      amount: totalAmount,
      paymentDate: form.get("paymentDate") as string,
      paymentMethod: method,
      reference: (form.get("reference") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
      allocations,
    };

    try {
      const res = await fetch("/api/payments/supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record payment");
      }

      toast.success("Payment recorded");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  // Default reference: the single allocated lot's invoice number when exactly
  // one lot is selected (consistent with prior single-lot UX).
  const singleSelectedLot =
    selectedRows.length === 1
      ? lots?.find((l) => l.id === selectedRows[0].id)
      : undefined;

  const deltaTone =
    Math.abs(delta) < 0.01
      ? "text-emerald-700"
      : delta > 0
        ? "text-amber-700"
        : "text-red-700";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record Payment to {supplierName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (LKR) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={0.01}
                step={0.01}
                value={totalAmount || ""}
                onChange={(e) =>
                  setTotalAmount(parseFloat(e.target.value) || 0)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Date *</Label>
              <Input
                id="paymentDate"
                name="paymentDate"
                type="date"
                defaultValue={today}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Method *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference #</Label>
              <Input
                key={singleSelectedLot?.invoiceNumber || "multi"}
                id="reference"
                name="reference"
                defaultValue={singleSelectedLot?.invoiceNumber || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Allocate to Lot(s) *</Label>
              {hasLotOptions && totalAmount > 0 && (
                <span className={cn("text-xs font-medium", deltaTone)}>
                  Allocated LKR {formatLKR(allocSum)} / {formatLKR(totalAmount)}
                  {Math.abs(delta) >= 0.01 && (
                    <>
                      {" — "}
                      {delta > 0
                        ? `LKR ${formatLKR(delta)} unallocated`
                        : `over by LKR ${formatLKR(-delta)}`}
                    </>
                  )}
                </span>
              )}
            </div>
            {!hasLotOptions ? (
              <div className="rounded-md border border-dashed p-3 text-xs text-gray-500">
                No outstanding lots available for payment.
              </div>
            ) : (
              <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                {lots!.map((lot) => {
                  const row = rows[lot.id];
                  const selected = row?.selected ?? false;
                  const exceedsLot = selected && row.amount > lot.outstanding;
                  return (
                    <div
                      key={lot.id}
                      className={cn(
                        "flex items-center gap-3 p-2",
                        selected && "bg-emerald-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-emerald-700"
                        checked={selected}
                        onChange={() => toggleLot(lot)}
                        aria-label={`Allocate to ${lot.invoiceNumber}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm">
                          {lot.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          Outstanding LKR {formatLKR(lot.outstanding)}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex flex-col items-end">
                          <Input
                            type="number"
                            min={0}
                            max={lot.outstanding}
                            step={0.01}
                            className={cn(
                              "h-8 w-32 text-right text-sm",
                              exceedsLot && "border-red-500"
                            )}
                            value={row.amount || ""}
                            onChange={(e) =>
                              updateAmount(
                                lot.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            aria-label={`Amount for ${lot.invoiceNumber}`}
                          />
                          {exceedsLot && (
                            <span className="mt-0.5 text-[10px] text-red-600">
                              exceeds outstanding
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800"
            disabled={loading || !hasLotOptions || !isAllocated}
          >
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
