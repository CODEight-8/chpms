import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GRADE_STYLES: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 border-emerald-200",
  B: "bg-blue-100 text-blue-800 border-blue-200",
  C: "bg-orange-100 text-orange-800 border-orange-200",
  REJECT: "bg-red-100 text-red-800 border-red-200",
};

const GRADE_LABELS: Record<string, string> = {
  A: "Grade A — Premium",
  B: "Grade B — Good",
  C: "Grade C — Fair",
  REJECT: "Rejected",
};

export function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-gray-400 text-sm">Pending</span>;

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", GRADE_STYLES[grade] ?? "bg-gray-100")}
    >
      {GRADE_LABELS[grade] ?? grade}
    </Badge>
  );
}
