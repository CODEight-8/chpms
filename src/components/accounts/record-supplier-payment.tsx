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
  const [selectedLotId, setSelectedLotId] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validate(e.currentTarget)) {
      return;
    }

    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      supplierId,
      supplierLotId: selectedLotId && selectedLotId !== "none" ? selectedLotId : undefined,
      amount: parseFloat(form.get("amount") as string),
      paymentDate: form.get("paymentDate") as string,
      paymentMethod: method,
      reference: (form.get("reference") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
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
      setSelectedLotId("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const selectedLot = selectedLotId && selectedLotId !== "none" ? lots?.find((l) => l.id === selectedLotId) : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment to {supplierName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {lots && lots.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Lot (Invoice)</Label>
              <Select value={selectedLotId} onValueChange={setSelectedLotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lot (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific lot</SelectItem>
                  {lots.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id}>
                      {lot.invoiceNumber} — Outstanding:{" "}
                      {lot.outstanding.toLocaleString("en-LK", {
                        style: "currency",
                        currency: "LKR",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLot && (
                <p className="text-xs text-orange-600">
                  Outstanding: LKR {selectedLot.outstanding.toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (LKR) *</Label>
              <Input id="amount" name="amount" type="number" min={0.01} step={0.01} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Date *</Label>
              <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Method *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                key={selectedLot?.invoiceNumber || "no-lot"}
                id="reference"
                name="reference"
                defaultValue={selectedLot?.invoiceNumber || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>

          <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={loading}>
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
