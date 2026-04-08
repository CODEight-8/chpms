"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { validateFormWithToast } from "@/lib/form-validation";
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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
}

export function LotForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [supplierId, setSupplierId] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [dateReceived, setDateReceived] = useState(today);
  const [huskCount, setHuskCount] = useState<number>(0);
  const [perHuskRate, setPerHuskRate] = useState<number>(0);
  const [qualityGrade, setQualityGrade] = useState<string>("");

  const totalCost = useMemo(
    () => huskCount * perHuskRate,
    [huskCount, perHuskRate]
  );

  useEffect(() => {
    fetch("/api/suppliers?active=true")
      .then((r) => r.json())
      .then(setSuppliers)
      .catch(() => toast.error("Failed to load suppliers"))
      .finally(() => setLoadingSuppliers(false));
  }, []);

  const isSubmitDisabled =
    loading ||
    loadingSuppliers ||
    !supplierId ||
    !harvestDate ||
    !dateReceived ||
    huskCount <= 0 ||
    perHuskRate <= 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateFormWithToast(e.currentTarget)) {
      return;
    }

    if (!supplierId) {
      toast.error("Supplier is required.");
      return;
    }

    setLoading(true);

    const data = {
      supplierId,
      harvestDate,
      dateReceived,
      huskCount,
      perHuskRate,
      qualityGrade: qualityGrade || undefined,
      notes: (new FormData(e.currentTarget).get("notes") as string) || undefined,
    };

    try {
      const res = await fetch("/api/supplier-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create lot");
      }

      const lot = await res.json();
      toast.success(`Lot ${lot.lotNumber} created with invoice ${lot.invoiceNumber}`);
      router.push(`/supplier-lots/${lot.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-5 max-w-lg">
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId} required disabled={loadingSuppliers}>
              <SelectTrigger aria-label="Select supplier">
                <SelectValue placeholder={loadingSuppliers ? "Loading suppliers..." : "Select a supplier"} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="harvestDate">Harvest Date *</Label>
              <Input
                id="harvestDate"
                name="harvestDate"
                type="date"
                max={today}
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateReceived">Date Received *</Label>
              <Input
                id="dateReceived"
                name="dateReceived"
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                max={today}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="huskCount">Husk Count *</Label>
              <Input
                id="huskCount"
                type="number"
                min={1}
                value={huskCount || ""}
                onChange={(e) => setHuskCount(parseInt(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perHuskRate">Per-Husk Rate (LKR) *</Label>
              <Input
                id="perHuskRate"
                type="number"
                min={0.01}
                step={0.01}
                value={perHuskRate || ""}
                onChange={(e) =>
                  setPerHuskRate(parseFloat(e.target.value) || 0)
                }
                required
              />
            </div>
          </div>

          {totalCost > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm text-emerald-700 font-medium">
                Total Cost:{" "}
                <span className="text-lg font-bold">
                  LKR {totalCost.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                </span>
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Invoice will be auto-generated upon creation
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quality Grade (optional — can be set during audit)</Label>
            <div className="flex gap-2">
              {[
                { value: "A", label: "A — Premium" },
                { value: "B", label: "B — Good" },
                { value: "C", label: "C — Fair" },
                { value: "REJECT", label: "Reject" },
              ].map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() =>
                    setQualityGrade(qualityGrade === g.value ? "" : g.value)
                  }
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    qualityGrade === g.value
                      ? g.value === "REJECT"
                        ? "bg-red-100 border-red-300 text-red-800"
                        : "bg-emerald-100 border-emerald-300 text-emerald-800"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} maxLength={2000} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={isSubmitDisabled}
            >
              {loading ? "Creating..." : "Create Supplier Lot"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
