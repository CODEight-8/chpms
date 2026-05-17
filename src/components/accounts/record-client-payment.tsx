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

interface OrderOption {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  outstanding: number;
}

interface RecordClientPaymentProps {
  clientId: string;
  clientName: string;
  orders?: OrderOption[];
}

type RowState = { selected: boolean; amount: number };

function formatLKR(n: number): string {
  return n.toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function RecordClientPayment({
  clientId,
  clientName,
  orders,
}: RecordClientPaymentProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { validate } = useFieldErrors();
  const [method, setMethod] = useState("CASH");
  const [totalAmount, setTotalAmount] = useState(0);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const hasOrderOptions = Boolean(orders && orders.length > 0);

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

  function toggleOrder(order: OrderOption) {
    setRows((prev) => {
      const current = prev[order.id];
      if (current?.selected) {
        return { ...prev, [order.id]: { selected: false, amount: 0 } };
      }
      const otherAllocated = Object.entries(prev)
        .filter(([id, r]) => r.selected && id !== order.id)
        .reduce((s, [, r]) => s + r.amount, 0);
      const remainingBudget = Math.max(0, totalAmount - otherAllocated);
      const auto = Math.min(order.outstanding, remainingBudget);
      return { ...prev, [order.id]: { selected: true, amount: auto } };
    });
  }

  function updateAmount(orderId: string, amount: number) {
    setRows((prev) => ({
      ...prev,
      [orderId]: { selected: true, amount: Math.max(0, amount) },
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
        "Allocations must total exactly the payment amount, with at least one order selected."
      );
      return;
    }

    setLoading(true);

    const form = new FormData(e.currentTarget);
    const allocations = selectedRows.map((r) => ({
      orderId: r.id,
      amount: r.amount,
    }));

    const data = {
      clientId,
      amount: totalAmount,
      paymentDate: form.get("paymentDate") as string,
      paymentMethod: method,
      reference: (form.get("reference") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
      allocations,
    };

    try {
      const res = await fetch("/api/payments/client", {
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

  const singleSelectedOrder =
    selectedRows.length === 1
      ? orders?.find((o) => o.id === selectedRows[0].id)
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
          <span className="hidden sm:inline">Record</span> Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record Payment from {clientName}</DialogTitle>
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
                key={singleSelectedOrder?.invoiceNumber || "multi"}
                id="reference"
                name="reference"
                defaultValue={singleSelectedOrder?.invoiceNumber || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Allocate to Order(s) *</Label>
              {hasOrderOptions && totalAmount > 0 && (
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
            {!hasOrderOptions ? (
              <div className="rounded-md border border-dashed p-3 text-xs text-gray-500">
                No outstanding orders available for payment.
              </div>
            ) : (
              <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
                {orders!.map((order) => {
                  const row = rows[order.id];
                  const selected = row?.selected ?? false;
                  const exceedsOrder =
                    selected && row.amount > order.outstanding;
                  return (
                    <div
                      key={order.id}
                      className={cn(
                        "flex items-center gap-3 p-2",
                        selected && "bg-emerald-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-emerald-700"
                        checked={selected}
                        onChange={() => toggleOrder(order)}
                        aria-label={`Allocate to ${order.invoiceNumber}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-sm">
                          {order.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          Outstanding LKR {formatLKR(order.outstanding)}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex flex-col items-end">
                          <Input
                            type="number"
                            min={0}
                            max={order.outstanding}
                            step={0.01}
                            className={cn(
                              "h-8 w-32 text-right text-sm",
                              exceedsOrder && "border-red-500"
                            )}
                            value={row.amount || ""}
                            onChange={(e) =>
                              updateAmount(
                                order.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            aria-label={`Amount for ${order.invoiceNumber}`}
                          />
                          {exceedsOrder && (
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
            disabled={loading || !hasOrderOptions || !isAllocated}
          >
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
