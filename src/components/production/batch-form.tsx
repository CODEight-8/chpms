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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeBadge } from "@/components/shared/grade-badge";
import { toast } from "sonner";
import { Minus, Plus, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface AvailableLot {
  id: string;
  lotNumber: string;
  invoiceNumber: string;
  huskCount: number;
  availableHusks: number;
  qualityGrade: string | null;
  perHuskRate: string;
  supplier: { id: string; name: string };
}

interface SelectedLot {
  lotId: string;
  lotNumber: string;
  supplierName: string;
  available: number;
  perHuskRate: number;
  grade: string | null;
  quantityUsed: number;
}

export function BatchForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [chipSize, setChipSize] = useState("");
  const [availableLots, setAvailableLots] = useState<AvailableLot[]>([]);
  const [selectedLots, setSelectedLots] = useState<SelectedLot[]>([]);
  const [lotToAdd, setLotToAdd] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/supplier-lots?status=GOOD_TO_GO").then((r) => r.json()),
    ])
      .then(([prods, lots]) => {
        // Auto-select the single product (Coconut Husk Chips)
        if (prods.length > 0) setProduct(prods[0]);
        // Also fetch ALLOCATED lots with available husks
        fetch("/api/supplier-lots?status=ALLOCATED")
          .then((r) => r.json())
          .then((allocatedLots: AvailableLot[]) => {
            const allLots = [
              ...lots,
              ...allocatedLots.filter((l: AvailableLot) => l.availableHusks > 0),
            ];
            setAvailableLots(allLots);
          });
      })
      .catch(() => toast.error("Failed to load data"));
  }, []);

  const unselectedLots = useMemo(
    () =>
      availableLots.filter(
        (l) => !selectedLots.some((s) => s.lotId === l.id)
      ),
    [availableLots, selectedLots]
  );

  const totalInputHusks = useMemo(
    () => selectedLots.reduce((sum, l) => sum + l.quantityUsed, 0),
    [selectedLots]
  );

  const totalRawCost = useMemo(
    () =>
      selectedLots.reduce(
        (sum, l) => sum + l.quantityUsed * l.perHuskRate,
        0
      ),
    [selectedLots]
  );

  function addLot(lotId: string) {
    const lot = availableLots.find((l) => l.id === lotId);
    if (!lot) {
      setLotToAdd("");
      return;
    }

    setSelectedLots((prev) => [
      ...prev,
      {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        supplierName: lot.supplier.name,
        available: lot.availableHusks,
        perHuskRate: Number(lot.perHuskRate),
        grade: lot.qualityGrade,
        quantityUsed: lot.availableHusks,
      },
    ]);
    setLotToAdd("");
  }

  function removeLot(lotId: string) {
    setSelectedLots((prev) => prev.filter((l) => l.lotId !== lotId));
  }

  function updateQuantity(lotId: string, qty: number) {
    setSelectedLots((prev) =>
      prev.map((l) =>
        l.lotId === lotId
          ? { ...l, quantityUsed: Math.min(Math.max(1, qty), l.available) }
          : l
      )
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateFormWithToast(e.currentTarget)) {
      return;
    }

    if (!product) {
      toast.error("Product is still loading.");
      return;
    }
    if (!chipSize) {
      toast.error("Target chip size is required.");
      return;
    }
    if (selectedLots.length === 0) {
      toast.error("Select at least one supplier lot.");
      return;
    }

    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data = {
      productId: product.id,
      chipSize,
      lots: selectedLots.map((l) => ({
        lotId: l.lotId,
        quantityUsed: l.quantityUsed,
      })),
      notes: (form.get("notes") as string) || undefined,
      remarks: (form.get("remarks") as string) || undefined,
    };

    try {
      const res = await fetch("/api/production-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create batch");
      }

      const batch = await res.json();
      toast.success(`Batch ${batch.batchNumber} created`);
      router.push(`/production/${batch.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Product Info & Chip Size */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">🥥</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {product?.name || "Loading..."}
              </p>
              <p className="text-xs text-gray-500">
                Output measured in {product?.unit || "kg"} — Husks → Chips
              </p>
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="chipSize">Target Chip Size *</Label>
            <Select value={chipSize} onValueChange={setChipSize}>
              <SelectTrigger id="chipSize">
                <SelectValue placeholder="Select chip size..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5mm">5 mm</SelectItem>
                <SelectItem value="10mm">10 mm</SelectItem>
                <SelectItem value="15mm">15 mm</SelectItem>
                <SelectItem value="20mm">20 mm</SelectItem>
                <SelectItem value="25mm">25 mm</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Chip size as required by the order
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lot Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Supplier Lots — Select Raw Husks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {unselectedLots.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={lotToAdd} onValueChange={(value) => {
                setLotToAdd(value);
                addLot(value);
              }}>
                <SelectTrigger className="flex-1" aria-label="Select a supplier lot to add">
                  <SelectValue placeholder="Add a supplier lot..." />
                </SelectTrigger>
                <SelectContent>
                  {unselectedLots.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id}>
                      {lot.lotNumber} — {lot.supplier.name} ({lot.availableHusks}{" "}
                      husks available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedLots.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No lots selected. Add supplier lots to use as raw material for chip production.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedLots.map((lot) => (
                <div
                  key={lot.lotId}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-sm">
                        {lot.lotNumber}
                      </span>
                      <GradeBadge grade={lot.grade} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lot.supplierName} — {lot.available} available
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateQuantity(lot.lotId, lot.quantityUsed - 10)
                      }
                      aria-label="Decrease quantity by 10"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={lot.available}
                      value={lot.quantityUsed}
                      onChange={(e) =>
                        updateQuantity(lot.lotId, parseInt(e.target.value) || 1)
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-24 text-center h-8"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateQuantity(lot.lotId, lot.quantityUsed + 10)
                      }
                      aria-label="Increase quantity by 10"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-gray-500 w-12">husks</span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => removeLot(lot.lotId)}
                    aria-label={`Remove lot ${lot.lotNumber}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {selectedLots.length > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-emerald-700">
                  <strong>{selectedLots.length}</strong> lot(s) selected —{" "}
                  <strong>{totalInputHusks.toLocaleString()}</strong> total husks
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-600">Total Raw Cost</p>
                <p className="text-lg font-bold text-emerald-800">
                  LKR{" "}
                  {totalRawCost.toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes & Remarks */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2 max-w-lg">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
          </div>
          <div className="space-y-2 max-w-lg">
            <Label htmlFor="remarks">Special Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              rows={2}
              maxLength={2000}
              placeholder="e.g. Client wants extra dry chips, rush order, special handling..."
            />
            <p className="text-xs text-gray-500">
              Special production instructions or client-specific requirements
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          type="submit"
          className="bg-emerald-700 hover:bg-emerald-800"
          disabled={loading || !product || !chipSize || selectedLots.length === 0}
        >
          {loading ? "Creating..." : "Create Production Batch"}
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
  );
}
