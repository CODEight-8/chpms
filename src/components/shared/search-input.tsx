"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
}

export function SearchInput({
  placeholder = "Search...",
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") || "");
  const deferred = useDeferredValue(value);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (deferred) {
      params.set("search", deferred);
    } else {
      params.delete("search");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [deferred, pathname, router, searchParams]);

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
