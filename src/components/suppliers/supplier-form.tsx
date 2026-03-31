"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface SupplierFormProps {
  defaultValues?: {
    id?: string;
    name: string;
    phone: string | null;
    location: string | null;
    contactPerson: string | null;
    bankDetails: string | null;
  };
}

export function SupplierForm({ defaultValues }: SupplierFormProps) {
  const router = useRouter();
  const isEdit = !!defaultValues?.id;
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      phone: (form.get("phone") as string) || undefined,
      location: (form.get("location") as string) || undefined,
      contactPerson: (form.get("contactPerson") as string) || undefined,
      bankDetails: (form.get("bankDetails") as string) || undefined,
    };

    try {
      const url = isEdit
        ? `/api/suppliers/${defaultValues!.id}`
        : "/api/suppliers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save supplier");
      }

      toast.success(isEdit ? "Supplier updated" : "Supplier created");
      router.push("/suppliers");
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
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="name">Supplier Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={defaultValues?.name || ""}
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={defaultValues?.phone || ""}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                defaultValue={defaultValues?.location || ""}
                maxLength={500}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input
              id="contactPerson"
              name="contactPerson"
              defaultValue={defaultValues?.contactPerson || ""}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankDetails">Bank Details</Label>
            <Textarea
              id="bankDetails"
              name="bankDetails"
              defaultValue={defaultValues?.bankDetails || ""}
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : isEdit
                  ? "Update Supplier"
                  : "Create Supplier"}
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
