"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  pageParam?: string;
  className?: string;
}

export function Pagination({
  total,
  page,
  perPage,
  pageParam = "page",
  className = "",
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);

  if (totalPages <= 1) {
    return (
      <div className={`flex items-center justify-end text-xs text-gray-500 px-2 py-2 ${className}`}>
        {total > 0 ? `Showing all ${total.toLocaleString()}` : ""}
      </div>
    );
  }

  function goto(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) {
      params.delete(pageParam);
    } else {
      params.set(pageParam, String(target));
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div
      className={`flex items-center justify-between gap-2 text-xs text-gray-600 px-2 py-2 ${className} ${isPending ? "opacity-70" : ""}`}
    >
      <span>
        {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2"
          disabled={page <= 1 || isPending}
          onClick={() => goto(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="px-2 tabular-nums">
          Page {page} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2"
          disabled={page >= totalPages || isPending}
          onClick={() => goto(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
