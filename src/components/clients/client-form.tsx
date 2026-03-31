"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface ClientFormProps {
  defaultValues?: {
    id?: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    paymentTerms: string | null;
  };
}

export function ClientForm({ defaultValues }: ClientFormProps) {
  const router = useRouter();
  const isEdit = !!defaultValues?.id;
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      companyName: (form.get("companyName") as string) || undefined,
      phone: (form.get("phone") as string) || undefined,
      email: (form.get("email") as string) || undefined,
      address: (form.get("address") as string) || undefined,
      paymentTerms: (form.get("paymentTerms") as string) || undefined,
    };

    try {
      const url = isEdit ? `/api/clients/${defaultValues!.id}` : "/api/clients";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save client");
      }

      toast.success(isEdit ? "Client updated" : "Client created");
      router.push("/clients");
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={defaultValues?.name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                name="companyName"
                defaultValue={defaultValues?.companyName || ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={defaultValues?.phone || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={defaultValues?.email || ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              defaultValue={defaultValues?.address || ""}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              name="paymentTerms"
              defaultValue={defaultValues?.paymentTerms || ""}
              placeholder="e.g. Net 30, COD"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={loading}
            >
              {loading ? "Saving..." : isEdit ? "Update Client" : "Create Client"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
