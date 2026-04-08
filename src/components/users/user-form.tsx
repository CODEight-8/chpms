"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateFormWithToast } from "@/lib/form-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface UserFormProps {
  defaultValues?: {
    id?: string;
    name: string;
    email: string;
    role: string;
  };
}

export function UserForm({ defaultValues }: UserFormProps) {
  const router = useRouter();
  const isEdit = !!defaultValues?.id;
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(defaultValues?.role || "MANAGER");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateFormWithToast(e.currentTarget)) {
      return;
    }

    setLoading(true);

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      email: form.get("email") as string,
      password: form.get("password") as string,
      role,
    };

    // For edit, only send password if provided
    if (isEdit && !data.password) {
      delete (data as Record<string, unknown>).password;
    }

    try {
      const url = isEdit ? `/api/users/${defaultValues!.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save user");
      }

      toast.success(isEdit ? "User updated" : "User created");
      router.push("/users");
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
        <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={defaultValues?.name || ""}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultValues?.email || ""}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEdit ? "New Password (leave blank to keep current)" : "Password *"}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={6}
              maxLength={128}
              required={!isEdit}
              placeholder={isEdit ? "Leave blank to keep current password" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
                {/* PRODUCTION role hidden for now — Manager handles production duties */}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {role === "OWNER" && "Full access to all modules including user management"}
              {role === "MANAGER" && "Access to all modules including production — everything except user management"}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800"
              disabled={loading}
            >
              {loading ? "Saving..." : isEdit ? "Update User" : "Create User"}
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
