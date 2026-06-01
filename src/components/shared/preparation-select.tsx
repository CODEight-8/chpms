"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Preparation } from "@/components/shared/preparation";

// Re-export the type alias as a convenience so existing imports of
// `type Preparation` from this file keep working. The runtime constants
// (PREPARATION_LABEL / PREPARATION_BADGE) MUST be imported from
// "@/components/shared/preparation" — exporting them from a "use client"
// module breaks server-component imports (RSC client manifest error).
export type { Preparation };

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
