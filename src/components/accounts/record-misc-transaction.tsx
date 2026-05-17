"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldErrors } from "@/lib/use-field-errors";
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
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

type Direction = "IN" | "OUT";

interface RecordMiscTransactionProps {
  direction: Direction;
}

export function RecordMiscTransaction({ direction }: RecordMiscTransactionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { validate } = useFieldErrors();
  const [method, setMethod] = useState("CASH");

  const isIn = direction === "IN";
  const label = isIn ? "Misc In" : "Misc Out";
  const dialogTitle = isIn
    ? "Record Miscellaneous Inflow"
    : "Record Miscellaneous Outflow";
  const descriptionHint = isIn
    ? "e.g., Owner capital, asset injection, refund received"
    : "e.g., Electricity bill, food, daily expense, fuel";
  const categoryHint = isIn ? "Owner Capital" : "Electricity";
  const triggerClass = isIn
    ? "bg-emerald-700 hover:bg-emerald-800"
    : "bg-rose-700 hover:bg-rose-800";
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate(e.currentTarget)) return;

    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data = {
      direction,
      category: (form.get("category") as string).trim(),
      amount: parseFloat(form.get("amount") as string),
      paymentMethod: method,
      transactionDate: form.get("transactionDate") as string,
      description: (form.get("description") as string).trim(),
      reference: (form.get("reference") as string).trim() || undefined,
      notes: (form.get("notes") as string).trim() || undefined,
    };

    try {
      const res = await fetch("/api/misc-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record");
      }

      toast.success(`${label} recorded`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={`${triggerClass} gap-1.5`}>
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Record</span> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                name="category"
                placeholder={categoryHint}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (LKR) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={0.01}
                step={0.01}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder={descriptionHint}
              maxLength={500}
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionDate">Date *</Label>
              <Input
                id="transactionDate"
                name="transactionDate"
                type="date"
                defaultValue={today}
                required
              />
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" name="reference" maxLength={200} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
          </div>

          <Button
            type="submit"
            className={`w-full ${triggerClass}`}
            disabled={loading}
          >
            {loading ? "Recording..." : `Record ${label}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
