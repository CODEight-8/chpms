"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CLIENT_PAYMENT_TERMS,
  isClientPaymentTerm,
} from "@/lib/client-payment-terms";
import { PHONE_ALLOWED_REGEX } from "@/lib/validators";
import { useFieldErrors } from "@/lib/use-field-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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

function stripNonLetters(value: string) {
  return value.replace(/[^A-Za-z ]/g, "");
}

async function getErrorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        return payload.error;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function ClientForm({ defaultValues }: ClientFormProps) {
  const router = useRouter();
  const isEdit = !!defaultValues?.id;
  const [loading, setLoading] = useState(false);
  const { errors, validate, clearError } = useFieldErrors();
  const initialPaymentTerms = isClientPaymentTerm(defaultValues?.paymentTerms)
    ? defaultValues.paymentTerms
    : "";
  const initialFields = {
    name: defaultValues?.name || "",
    companyName: defaultValues?.companyName || "",
    phone: defaultValues?.phone || "",
    email: defaultValues?.email || "",
    address: defaultValues?.address || "",
    paymentTerms: initialPaymentTerms,
  };
  const [fields, setFields] = useState(initialFields);
  const phonePattern = PHONE_ALLOWED_REGEX.source;
  const hasChanges =
    fields.companyName.trim() !== initialFields.companyName.trim() ||
    fields.phone.trim() !== initialFields.phone.trim() ||
    fields.email.trim() !== initialFields.email.trim() ||
    fields.address.trim() !== initialFields.address.trim() ||
    fields.paymentTerms.trim() !== initialFields.paymentTerms.trim();
  const isSubmitDisabled =
    loading ||
    !fields.name.trim() ||
    !fields.companyName.trim() ||
    !fields.phone.trim() ||
    !fields.email.trim() ||
    !fields.paymentTerms.trim() ||
    (isEdit && !hasChanges);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validate(e.currentTarget)) {
      return;
    }

    setLoading(true);

    const data = {
      name: fields.name.trim(),
      companyName: fields.companyName.trim() || undefined,
      phone: fields.phone.trim() || undefined,
      email: fields.email.trim() || undefined,
      address: fields.address.trim() || undefined,
      paymentTerms: fields.paymentTerms.trim() || undefined,
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
        throw new Error(await getErrorMessage(res, "Failed to save client"));
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
        <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-2xl mx-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                name="name"
                value={fields.name}
                onChange={(e) => {
                  clearError("name");
                  setFields((current) => ({
                    ...current,
                    name: stripNonLetters(e.target.value),
                  }));
                }}
                className={cn(errors.name && "border-red-500")}
                maxLength={200}
                disabled={isEdit}
                required
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              <p className="text-xs text-gray-500">
                {isEdit
                  ? "Client name is locked after creation and cannot be changed."
                  : "Choose carefully. Client name must be unique, contain letters only, and cannot be changed after creation."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                name="companyName"
                value={fields.companyName}
                onChange={(e) => {
                  clearError("companyName");
                  setFields((current) => ({
                    ...current,
                    companyName: e.target.value,
                  }));
                }}
                className={cn(errors.companyName && "border-red-500")}
                maxLength={200}
                required
              />
              {errors.companyName && <p className="text-xs text-red-600">{errors.companyName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+94771234567 or 0771234567"
                value={fields.phone}
                onChange={(e) => {
                  clearError("phone");
                  setFields((current) => ({
                    ...current,
                    phone: e.target.value,
                  }));
                }}
                className={cn(errors.phone && "border-red-500")}
                maxLength={50}
                pattern={phonePattern}
                title="Phone number can contain only digits, spaces, +, parentheses, and hyphens."
                required
              />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="client@example.com"
                value={fields.email}
                onChange={(e) => {
                  clearError("email");
                  setFields((current) => ({
                    ...current,
                    email: e.target.value,
                  }));
                }}
                className={cn(errors.email && "border-red-500")}
                maxLength={200}
                required
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              value={fields.address}
              onChange={(e) =>
                setFields((current) => ({
                  ...current,
                  address: e.target.value,
                }))
              }
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms *</Label>
            <select
              id="paymentTerms"
              name="paymentTerms"
              value={fields.paymentTerms}
              onChange={(e) => {
                clearError("paymentTerms");
                setFields((current) => ({
                  ...current,
                  paymentTerms: e.target.value,
                }));
              }}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                errors.paymentTerms && "border-red-500"
              )}
              required
            >
              <option value="">Select</option>
              {CLIENT_PAYMENT_TERMS.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={isSubmitDisabled}
            >
              {loading ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Update Client" : "Create Client"}
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
