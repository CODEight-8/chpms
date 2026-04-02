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
import { Plus, Trash2 } from "lucide-react";

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

interface LineItem {
  productId: string;
  chipSize: string;
  quantity: number;
  unitPrice: number;
}

const CHIP_SIZES = ["5mm", "10mm", "15mm", "20mm", "25mm"];

export function OrderForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients?active=true").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([c, prods]) => {
        setClients(c);
        setProducts(prods);
        // Auto-add first product as initial line item
        if (prods.length > 0) {
          setItems([
            {
              productId: prods[0].id,
              chipSize: "5mm",
              quantity: 0,
              unitPrice: Number(prods[0].defaultPrice) || 0,
            },
          ]);
        }
      })
      .catch(() => toast.error("Failed to load data"));
  }, []);

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      if (field === "productId") {
        const product = products.find((p) => p.id === value);
        updated[index] = {
          ...updated[index],
          productId: value as string,
          unitPrice: product?.defaultPrice ? Number(product.defaultPrice) : updated[index].unitPrice,
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }

  function addItem() {
    const usedProductIds = items.map((i) => i.productId);
    const nextProduct = products.find((p) => !usedProductIds.includes(p.id)) || products[0];
    if (!nextProduct) return;
    setItems((prev) => [
      ...prev,
      {
        productId: nextProduct.id,
        chipSize: "5mm",
        quantity: 0,
        unitPrice: Number(nextProduct.defaultPrice) || 0,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function getProduct(productId: string) {
    return products.find((p) => p.id === productId);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (!clientId || validItems.length === 0) return;

    setLoading(true);
    const form = new FormData(e.currentTarget);

    const data = {
      clientId,
      orderDate: form.get("orderDate") as string,
      expectedDelivery: (form.get("expectedDelivery") as string) || undefined,
      items: validItems.map((i) => ({
        productId: i.productId,
        chipSize: i.chipSize,
        quantityOrdered: i.quantity,
        unitPrice: i.unitPrice,
      })),
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
  const hasValidItems = items.some((i) => i.quantity > 0);

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

      {/* Order Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Order Items</CardTitle>
            {products.length > 1 && items.length < products.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => {
            const product = getProduct(item.productId);
            return (
              <div
                key={index}
                className="p-4 border rounded-lg space-y-3 relative"
              >
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="absolute top-2 right-2 h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                {products.length > 1 ? (
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(v) => updateItem(index, "productId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
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
                )}

                <div className="space-y-2">
                  <Label>Chip Size *</Label>
                  <Select
                    value={item.chipSize}
                    onValueChange={(v) => updateItem(index, "chipSize", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chip size" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHIP_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Quantity ({product?.unit || "kg"}) *
                    </Label>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={item.quantity || ""}
                      onChange={(e) =>
                        updateItem(index, "quantity", parseFloat(e.target.value) || 0)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price (LKR) *</Label>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                      required
                    />
                  </div>
                </div>

                {item.quantity > 0 && item.unitPrice > 0 && (
                  <div className="text-right text-sm text-gray-600">
                    Subtotal: LKR{" "}
                    {(item.quantity * item.unitPrice).toLocaleString("en-LK", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                )}
              </div>
            );
          })}

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
            <Textarea id="notes" name="notes" rows={3} maxLength={2000} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="submit"
          className="bg-emerald-700 hover:bg-emerald-800"
          disabled={loading || !clientId || !hasValidItems}
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
