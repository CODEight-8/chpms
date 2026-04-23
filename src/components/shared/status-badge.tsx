import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  // Lot statuses
  AUDIT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  GOOD_TO_GO: "bg-green-100 text-green-800 border-green-200",
  ALLOCATED: "bg-blue-100 text-blue-800 border-blue-200",
  CONSUMED: "bg-gray-100 text-gray-800 border-gray-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  // Batch statuses
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  DISPATCHED: "bg-gray-100 text-gray-800 border-gray-200",
  // Order statuses
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  PARTIALLY_FULFILLED: "bg-orange-100 text-orange-800 border-orange-200",
  FULFILLED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  AUDIT: "Audit",
  GOOD_TO_GO: "Good to Go",
  ALLOCATED: "Allocated",
  CONSUMED: "Consumed",
  REJECTED: "Rejected",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  DISPATCHED: "Dispatched",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PARTIALLY_FULFILLED: "Partially Fulfilled",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700 border-gray-200")}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
