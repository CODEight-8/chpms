"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DISPATCHED", label: "Dispatched" },
];

interface BatchStatusTabsProps {
  counts: Record<string, number>;
}

export function BatchStatusTabs({ counts }: BatchStatusTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") || "";

  function handleTabClick(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    router.push(`/production?${params.toString()}`);
  }

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 rounded-lg bg-muted p-1">
      {STATUS_TABS.map((tab) => {
        const count = tab.value ? counts[tab.value] || 0 : totalCount;
        const isActive = currentStatus === tab.value;

        return (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs sm:text-sm sm:px-3 font-medium transition-colors text-center",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-1.5 text-xs",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
