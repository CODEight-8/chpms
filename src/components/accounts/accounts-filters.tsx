"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export function AccountsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    router.replace(pathname);
  }

  const hasFilters =
    searchParams.has("search") ||
    searchParams.has("method") ||
    searchParams.has("dateFrom") ||
    searchParams.has("dateTo");

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg border mb-4">
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Search</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Name, reference, invoice..."
            defaultValue={searchParams.get("search") || ""}
            onChange={(e) => updateParam("search", e.target.value)}
            className="pl-8 h-9 w-full sm:w-48"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Method</Label>
        <Select
          value={searchParams.get("method") || "all"}
          onValueChange={(v) => updateParam("method", v)}
        >
          <SelectTrigger className="h-9 w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="BANK">Bank Transfer</SelectItem>
            <SelectItem value="CHEQUE">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-500">From</Label>
        <Input
          type="date"
          defaultValue={searchParams.get("dateFrom") || ""}
          onChange={(e) => updateParam("dateFrom", e.target.value)}
          className="h-9 w-full sm:w-36"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-500">To</Label>
        <Input
          type="date"
          defaultValue={searchParams.get("dateTo") || ""}
          onChange={(e) => updateParam("dateTo", e.target.value)}
          className="h-9 w-full sm:w-36"
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1 text-gray-500 h-9"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
