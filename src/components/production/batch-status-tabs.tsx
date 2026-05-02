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
    <div className="grid gap-1 grid-cols-2 p-2 md:grid-cols-3 xl:flex xl:flex-wrap">
      {STATUS_TABS.map((tab) => {
        const count = tab.value ? counts[tab.value] || 0 : totalCount;
        const isActive = currentStatus === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleTabClick(tab.value)}
            className={cn(
              "flex min-h-9 items-center justify-between gap-1 rounded-lg border px-2 py-0.5 text-left text-sm font-medium transition-colors",
              isActive
                ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                : "border-emerald-100 bg-white text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800"
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
