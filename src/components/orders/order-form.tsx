"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  companyName: string | null;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  defaultPrice: string | null;
}

export function OrderForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [clientId, setClientId] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients?active=true").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([c, prods]) => {
        setClients(c);
        // Auto-select the single product (Coconut Husk Chips)
        if (prods.length > 0) {
          setProduct(prods[0]);
          if (prods[0].defaultPrice) {
            setUnitPrice(Number(prods[0].defaultPrice));
          }
        }
      })
      .catch(() => toast.error("Failed to load data"));
  }, []);

  const totalValue = useMemo(
    () => quantity * unitPrice,
    [quantity, unitPrice]
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clientId || !product || quantity <= 0) return;

    setLoading(true);
    const form = new FormData(e.currentTarget);

    const data = {
      clientId,
      orderDate: form.get("orderDate") as string,
      expectedDelivery: (form.get("expectedDelivery") as string) || undefined,
      items: [
        {
          productId: product.id,
          quantityOrdered: quantity,
          unitPrice,
        },
      ],
      notes: (form.get("notes") as string) || undefined,
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create order");
      }

      const order = await res.json();
      toast.success(`Order ${order.orderNumber} created`);
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Client & Dates */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.companyName ? ` (${c.companyName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderDate">Order Date *</Label>
              <Input
                id="orderDate"
                name="orderDate"
                type="date"
                defaultValue={today}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected Delivery</Label>
              <Input
                id="expectedDelivery"
                name="expectedDelivery"
                type="date"
                min={today}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Item — Single Product */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">🥥</span>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">
                {product?.name || "Loading..."}
              </p>
              <p className="text-xs text-emerald-600">
                Measured in {product?.unit || "kg"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity ({product?.unit || "kg"}) *</Label>
              <Input
                id="quantity"
                type="number"
                min={0.01}
                step={0.01}
                value={quantity || ""}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price (LKR) *</Label>
              <Input
                id="unitPrice"
                type="number"
                min={0.01}
                step={0.01}
                value={unitPrice || ""}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          {totalValue > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-right">
              <p className="text-xs text-emerald-600">Order Total</p>
              <p className="text-xl font-bold text-emerald-800">
                LKR{" "}
                {totalValue.toLocaleString("en-LK", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="submit"
          className="bg-emerald-700 hover:bg-emerald-800"
          disabled={loading || !clientId || quantity <= 0}
        >
          {loading ? "Creating..." : "Create Order"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
