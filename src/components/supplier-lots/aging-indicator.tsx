import { getAgingLabel } from "@/lib/aging";
import { cn } from "@/lib/utils";

interface AgingIndicatorProps {
  days: number;
  compact?: boolean;
}

export function AgingIndicator({ days, compact = false }: AgingIndicatorProps) {
  const { label, textClass, bgClass } = getAgingLabel(days);

  if (compact) {
    return (
      <span className={cn("text-sm font-medium", textClass)}>
        {days}d
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        bgClass,
        textClass
      )}
    >
      {days} days
      <span className="opacity-70">({label})</span>
    </span>
  );
}
