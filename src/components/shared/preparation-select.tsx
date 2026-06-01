"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Preparation = "RAW" | "DRY" | "WASHED";

export const PREPARATION_LABEL: Record<Preparation, string> = {
  RAW: "Raw",
  DRY: "Dry",
  WASHED: "Washed",
};

export const PREPARATION_BADGE: Record<Preparation, string> = {
  RAW: "bg-stone-100 text-stone-700 border-stone-200",
  DRY: "bg-amber-50 text-amber-800 border-amber-200",
  WASHED: "bg-sky-50 text-sky-700 border-sky-200",
};

interface PreparationSelectProps {
  value: Preparation;
  onChange: (next: Preparation) => void;
  id?: string;
  disabled?: boolean;
}

export function PreparationSelect({
  value,
  onChange,
  id,
  disabled,
}: PreparationSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as Preparation)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="RAW">Raw</SelectItem>
        <SelectItem value="DRY">Dry</SelectItem>
        <SelectItem value="WASHED">Washed</SelectItem>
      </SelectContent>
    </Select>
  );
}
