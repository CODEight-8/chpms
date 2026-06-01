"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Suffix = "s" | "c";

interface ChipSizeInputProps {
  // Stored as a single string like "5c" / "3s". Empty string when blank.
  value: string;
  onChange: (next: string) => void;
  id?: string;
  disabled?: boolean;
}

function parse(value: string): { num: string; suffix: Suffix } {
  const m = /^(\d+)([sc])$/.exec(value);
  if (m) return { num: m[1], suffix: m[2] as Suffix };
  return { num: "", suffix: "c" };
}

export function ChipSizeInput({
  value,
  onChange,
  id,
  disabled,
}: ChipSizeInputProps) {
  const initial = parse(value);
  const [num, setNum] = useState(initial.num);
  const [suffix, setSuffix] = useState<Suffix>(initial.suffix);

  // Sync from parent when value changes externally (e.g. form reset).
  useEffect(() => {
    const next = parse(value);
    setNum(next.num);
    setSuffix(next.suffix);
  }, [value]);

  function emit(nextNum: string, nextSuffix: Suffix) {
    onChange(nextNum ? `${nextNum}${nextSuffix}` : "");
  }

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type="number"
        min={1}
        step={1}
        placeholder="e.g. 5"
        value={num}
        disabled={disabled}
        onChange={(e) => {
          // Allow only digits; coerce to non-negative integer string.
          const cleaned = e.target.value.replace(/[^\d]/g, "");
          setNum(cleaned);
          emit(cleaned, suffix);
        }}
        onWheel={(e) => e.currentTarget.blur()}
        className="flex-1"
      />
      <Select
        value={suffix}
        onValueChange={(v) => {
          const s = v as Suffix;
          setSuffix(s);
          emit(num, s);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="c">c</SelectItem>
          <SelectItem value="s">s</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
