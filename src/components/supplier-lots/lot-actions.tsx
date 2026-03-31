"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface LotActionsProps {
  lotId: string;
  currentStatus: string;
  currentGrade: string | null;
  canEdit: boolean;
}

export function LotActions({
  lotId,
  currentStatus,
  currentGrade,
  canEdit,
}: LotActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateGrade(grade: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/supplier-lots/${lotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualityGrade: grade }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Grade set to ${grade}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update grade");
    } finally {
      setLoading(false);
    }
  }

  async function transitionStatus(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/supplier-lots/${lotId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Status updated to ${status.replace("_", " ")}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  if (!canEdit) return null;

  if (currentStatus === "AUDIT") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Grade:</span>
          <Select
            value={currentGrade || ""}
            onValueChange={updateGrade}
            disabled={loading}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Set grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A — Premium</SelectItem>
              <SelectItem value="B">B — Good</SelectItem>
              <SelectItem value="C">C — Fair</SelectItem>
              <SelectItem value="REJECT">Reject</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => transitionStatus("GOOD_TO_GO")}
          disabled={loading || !currentGrade || currentGrade === "REJECT"}
          className="bg-emerald-700 hover:bg-emerald-800 gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Mark Good to Go
        </Button>

        <Button
          onClick={() => transitionStatus("REJECTED")}
          disabled={loading}
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
        >
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </div>
    );
  }

  return null;
}
