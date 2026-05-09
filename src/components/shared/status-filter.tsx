"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface StatusFilterProps {
  paramName?: string;
}

const STATUS_OPTIONS = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
  { label: "All", value: "all" },
] as const;

export function StatusFilter({
  paramName = "active",
}: StatusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeValue = searchParams.get(paramName) || "true";

  function handleFilterChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, value);

    router.push(params.toString() ? `?${params.toString()}` : "?");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((option) => {
        const isActive = activeValue === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant={isActive ? "default" : "outline"}
            className={
              isActive ? "bg-emerald-700 hover:bg-emerald-800" : undefined
            }
            onClick={() => handleFilterChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
