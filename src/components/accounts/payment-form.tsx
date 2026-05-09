"use client";

import { useState, useEffect } from "react";
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

interface PaymentFormProps {
  type: "supplier" | "client";
}

interface Entity {
  id: string;
  name: string;
  totalOwed?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  totalRevenue?: number;
  totalReceived?: number;
}

export function PaymentForm({ type }: PaymentFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { validate } = useFieldErrors();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [method, setMethod] = useState("CASH");

  useEffect(() => {
    if (!open) return;
    const endpoint =
      type === "supplier" ? "/api/suppliers?active=true" : "/api/clients?active=true";
    fetch(endpoint)
      .then((r) => r.json())
      .then(setEntities)
      .catch(() => toast.error("Failed to load"));
  }, [open, type]);

  const label = type === "supplier" ? "Supplier" : "Client";
  const selectedEntity = entities.find((e) => e.id === entityId);
  const outstanding =
    type === "supplier"
      ? (selectedEntity?.outstandingBalance ?? 0)
      : ((selectedEntity?.totalRevenue ?? 0) - (selectedEntity?.totalReceived ?? 0));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validate(e.currentTarget)) {
      return;
    }

    if (!entityId) {
      toast.error(`${label} is required.`);
      return;
    }

    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      amount: parseFloat(form.get("amount") as string),
      paymentDate: form.get("paymentDate") as string,
      paymentMethod: method,
      reference: (form.get("reference") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    };

    if (type === "supplier") {
      data.supplierId = entityId;
    } else {
      data.clientId = entityId;
    }

    try {
      const res = await fetch(`/api/payments/${type}`, {
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
      setEntityId("");
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
        <Button className="bg-emerald-700 hover:bg-emerald-800 gap-2" size="sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Record</span> {type === "supplier" ? "Payment Out" : "Payment In"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Record {type === "supplier" ? "Supplier Payment" : "Client Payment"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>{label} *</Label>
            <Select value={entityId} onValueChange={setEntityId} required disabled={entities.length === 0 && !entityId}>
              <SelectTrigger>
                <SelectValue placeholder={entities.length === 0 ? "Loading..." : `Select ${label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-linked balance display */}
          {entityId && selectedEntity && (
            <div
              className={`rounded-lg p-3 text-sm ${
                outstanding > 0
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <div className="flex justify-between">
                <span className="text-gray-600">Outstanding Balance</span>
                <span
                  className={`font-bold ${
                    outstanding > 0 ? "text-orange-700" : "text-green-700"
                  }`}
                >
                  LKR{" "}
                  {outstanding.toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="reference">Reference / Invoice #</Label>
              <Input id="reference" name="reference" maxLength={200} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800"
            disabled={loading || !entityId}
          >
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
