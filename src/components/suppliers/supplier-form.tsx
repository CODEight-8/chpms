"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type SupplierBankDetailsFields } from "@/lib/bank-details";
import { PHONE_ALLOWED_REGEX } from "@/lib/validators";
import { useFieldErrors } from "@/lib/use-field-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
    bankName?: string | null;
    branchName?: string | null;
    accountNumber?: string | null;
    remarks?: string | null;
  };
}

function formatAccountNumber(value: string) {
  return value.replace(/\D/g, "").match(/.{1,4}/g)?.join(" ") || "";
}

function stripDigits(value: string) {
  return value.replace(/\d/g, "");
}

async function getErrorMessage(
  response: Response,
  fallback: string
) {
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

export function SupplierForm({ defaultValues }: SupplierFormProps) {
  const router = useRouter();
  const isEdit = !!defaultValues?.id;
  const [loading, setLoading] = useState(false);
  const { errors, validate, clearError } = useFieldErrors();
  const initialRequiredFields = {
    name: defaultValues?.name || "",
    phone: defaultValues?.phone || "",
    location: defaultValues?.location || "",
    contactPerson: defaultValues?.contactPerson || "",
  };
  const initialBankFields: SupplierBankDetailsFields = {
    bankName: defaultValues?.bankName || "",
    branchName: defaultValues?.branchName || "",
    accountNumber: defaultValues?.accountNumber || "",
  };
  const [remarks, setRemarks] = useState(defaultValues?.remarks || "");
  const [requiredFields, setRequiredFields] = useState({
    ...initialRequiredFields,
  });
  const [bankFields, setBankFields] =
    useState<SupplierBankDetailsFields>(initialBankFields);
  const hasAnyBankField =
    !!bankFields.bankName.trim() ||
    !!bankFields.branchName.trim() ||
    !!bankFields.accountNumber.trim();
  const hasChanges =
    requiredFields.phone.trim() !== initialRequiredFields.phone.trim() ||
    requiredFields.location.trim() !== initialRequiredFields.location.trim() ||
    requiredFields.contactPerson.trim() !==
      initialRequiredFields.contactPerson.trim() ||
    bankFields.bankName.trim() !== initialBankFields.bankName.trim() ||
    bankFields.branchName.trim() !== initialBankFields.branchName.trim() ||
    bankFields.accountNumber.trim() !== initialBankFields.accountNumber.trim() ||
    remarks.trim() !== (defaultValues?.remarks || "").trim();

  const isSubmitDisabled =
    loading ||
    !requiredFields.name.trim() ||
    !requiredFields.phone.trim() ||
    !requiredFields.location.trim() ||
    !requiredFields.contactPerson.trim() ||
    (isEdit && !hasChanges);

  const phonePattern = PHONE_ALLOWED_REGEX.source;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validate(e.currentTarget)) {
      return;
    }

    setLoading(true);

    const bankName = bankFields.bankName.trim();
    const branchName = bankFields.branchName.trim();
    const accountNumber = bankFields.accountNumber.trim();

    const data = {
      name: requiredFields.name.trim(),
      phone: requiredFields.phone.trim() || undefined,
      location: requiredFields.location.trim() || undefined,
      contactPerson: requiredFields.contactPerson.trim() || undefined,
      bankName: bankName || undefined,
      branchName: branchName || undefined,
      accountNumber: accountNumber || undefined,
      remarks: remarks.trim() || "",
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
        throw new Error(
          await getErrorMessage(res, "Failed to save supplier")
        );
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
        <form onSubmit={handleSubmit} noValidate className="space-y-6 max-w-2xl mx-auto">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Supplier Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={requiredFields.name}
                  onChange={(e) => {
                    clearError("name");
                    setRequiredFields((current) => ({
                      ...current,
                      name: stripDigits(e.target.value),
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
                    ? "Supplier name is locked after creation and cannot be changed."
                    : "Choose carefully. Supplier name must be unique and cannot be changed after creation."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+94771234567 or 0771234567"
                    value={requiredFields.phone}
                    onChange={(e) => {
                      clearError("phone");
                      setRequiredFields((current) => ({
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
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    value={requiredFields.contactPerson}
                    onChange={(e) => {
                      clearError("contactPerson");
                      setRequiredFields((current) => ({
                        ...current,
                        contactPerson: stripDigits(e.target.value),
                      }));
                    }}
                    className={cn(errors.contactPerson && "border-red-500")}
                    maxLength={200}
                    required
                  />
                  {errors.contactPerson && <p className="text-xs text-red-600">{errors.contactPerson}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  name="location"
                  value={requiredFields.location}
                  onChange={(e) => {
                    clearError("location");
                    setRequiredFields((current) => ({
                      ...current,
                      location: e.target.value,
                    }));
                  }}
                  className={cn(errors.location && "border-red-500")}
                  maxLength={500}
                  required
                />
                {errors.location && <p className="text-xs text-red-600">{errors.location}</p>}
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 lg:self-start">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-emerald-900">
                  Bank Details
                </h3>
                <p className="text-sm text-gray-600">
                  Add the supplier&apos;s bank account information.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    value={bankFields.bankName}
                    onChange={(e) =>
                      setBankFields((current) => ({
                        ...current,
                        bankName: e.target.value,
                      }))
                    }
                    pattern="[A-Za-z ]+"
                    title="Bank name must contain letters only"
                    maxLength={200}
                    required={hasAnyBankField}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    name="branchName"
                    value={bankFields.branchName}
                    onChange={(e) =>
                      setBankFields((current) => ({
                        ...current,
                        branchName: e.target.value,
                      }))
                    }
                    pattern="[A-Za-z ]+"
                    title="Branch name must contain letters only"
                    maxLength={200}
                    required={hasAnyBankField}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    name="accountNumber"
                    value={formatAccountNumber(bankFields.accountNumber)}
                    onChange={(e) =>
                      setBankFields((current) => ({
                        ...current,
                        accountNumber: e.target.value.replace(/\D/g, "").slice(0, 50),
                      }))
                    }
                    inputMode="numeric"
                    pattern="[0-9 ]+"
                    title="Account number is grouped automatically in 4 digits"
                    maxLength={62}
                    required={hasAnyBankField}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              name="remarks"
              placeholder="Any notes about this supplier..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={isSubmitDisabled}
            >
              {loading
                ? (isEdit ? "Saving..." : "Creating...")
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
