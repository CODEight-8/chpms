import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  className?: string;
}

export function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
}: SummaryCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 break-words whitespace-normal">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 self-start rounded-lg bg-emerald-50 p-2.5">
            <Icon className="h-5 w-5 text-emerald-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
