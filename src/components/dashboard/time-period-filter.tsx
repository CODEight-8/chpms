"use client";

import { useState, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
  label: string;
}

function getPresetRange(preset: string): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.toISOString().split("T")[0];

  switch (preset) {
    case "this_month": {
      const from = new Date(year, month, 1).toISOString().split("T")[0];
      return { from, to: today, label: "This Month" };
    }
    case "last_month": {
      const from = new Date(year, month - 1, 1).toISOString().split("T")[0];
      const to = new Date(year, month, 0).toISOString().split("T")[0];
      return { from, to, label: "Last Month" };
    }
    case "this_quarter": {
      const qStart = Math.floor(month / 3) * 3;
      const from = new Date(year, qStart, 1).toISOString().split("T")[0];
      return { from, to: today, label: "This Quarter" };
    }
    case "last_quarter": {
      const qStart = Math.floor(month / 3) * 3;
      const from = new Date(year, qStart - 3, 1).toISOString().split("T")[0];
      const to = new Date(year, qStart, 0).toISOString().split("T")[0];
      return { from, to, label: "Last Quarter" };
    }
    case "this_year": {
      const from = new Date(year, 0, 1).toISOString().split("T")[0];
      return { from, to: today, label: "This Year" };
    }
    case "last_year": {
      const from = new Date(year - 1, 0, 1).toISOString().split("T")[0];
      const to = new Date(year - 1, 11, 31).toISOString().split("T")[0];
      return { from, to, label: "Last Year" };
    }
    case "all_time":
      return { from: "", to: "", label: "All Time" };
    default:
      return { from: "", to: "", label: "All Time" };
  }
}

interface TimePeriodFilterProps {
  onChange: (range: DateRange) => void;
  defaultPreset?: string;
}

export function TimePeriodFilter({
  onChange,
  defaultPreset = "this_month",
}: TimePeriodFilterProps) {
  const [preset, setPreset] = useState(defaultPreset);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const handlePresetChange = useCallback(
    (value: string) => {
      setPreset(value);
      if (value !== "custom") {
        const range = getPresetRange(value);
        onChange(range);
      }
    },
    [onChange]
  );

  const handleCustomApply = useCallback(() => {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo, label: `${customFrom} to ${customTo}` });
    }
  }, [customFrom, customTo, onChange]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full sm:w-[160px] h-9">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="this_quarter">This Quarter</SelectItem>
          <SelectItem value="last_quarter">Last Quarter</SelectItem>
          <SelectItem value="this_year">This Year</SelectItem>
          <SelectItem value="last_year">Last Year</SelectItem>
          <SelectItem value="all_time">All Time</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-9 w-full sm:w-[145px]"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-9 w-full sm:w-[145px]"
          />
          <button
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
            className="px-3 h-9 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
