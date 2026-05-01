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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CheckCircle, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface LotActionsProps {
  lotId: string;
  currentStatus: string;
  currentGrade: string | null;
  canEdit: boolean;
  canDelete: boolean;
  deleteBlockReason?: string | null;
}

export function LotActions({
  lotId,
  currentStatus,
  currentGrade,
  canEdit,
  canDelete,
  deleteBlockReason,
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
      const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      toast.success(`Status updated to ${label}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/supplier-lots/${lotId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Supplier lot deleted");
      router.push("/supplier-lots");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete lot");
    } finally {
      setLoading(false);
    }
  }

  if (!canEdit && !canDelete) return null;

  const deleteAction = canDelete ? (
    deleteBlockReason ? (
      <p className="text-sm text-gray-500">{deleteBlockReason}</p>
    ) : (
      <ConfirmDialog
        title="Delete this lot?"
        description="This will permanently remove the supplier lot record. Use this only for an erroneous lot intake that has not been used in production or linked to payments."
        confirmLabel="Delete Lot"
        variant="destructive"
        onConfirm={handleDelete}
        disabled={loading}
      >
        <Button
          type="button"
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
          disabled={loading}
        >
          <Trash2 className="h-4 w-4" />
          Delete Lot
        </Button>
      </ConfirmDialog>
    )
  ) : null;

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
            <SelectTrigger className="w-40" aria-label="Select quality grade">
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

        <ConfirmDialog
          title="Approve this lot?"
          description="Approving the lot confirms the quality grade and moves it to the next step. Only Owner or Manager can approve."
          confirmLabel="Approve Lot"
          onConfirm={() => transitionStatus("APPROVED")}
          disabled={loading || !currentGrade || currentGrade === "REJECT"}
        >
          <Button
            className="bg-blue-700 hover:bg-blue-800 gap-2"
            disabled={loading || !currentGrade || currentGrade === "REJECT"}
            aria-label="Approve this lot"
          >
            <ShieldCheck className="h-4 w-4" />
            Approve
          </Button>
        </ConfirmDialog>

        <ConfirmDialog
          title="Reject this lot?"
          description="This action cannot be undone. The lot will be permanently marked as rejected and cannot be used in production."
          confirmLabel="Reject Lot"
          variant="destructive"
          onConfirm={() => transitionStatus("REJECTED")}
          disabled={loading}
        >
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
            disabled={loading}
            aria-label="Reject this lot"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </ConfirmDialog>

        {deleteAction}
      </div>
    );
  }

  if (currentStatus === "APPROVED") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ConfirmDialog
          title="Mark as Good to Go?"
          description="This lot will become available for production batches. Confirm the lot has finished aging and is ready for use."
          confirmLabel="Mark Good to Go"
          onConfirm={() => transitionStatus("GOOD_TO_GO")}
          disabled={loading}
        >
          <Button
            className="bg-emerald-700 hover:bg-emerald-800 gap-2"
            disabled={loading}
            aria-label="Mark lot as good to go for production"
          >
            <CheckCircle className="h-4 w-4" />
            Mark Good to Go
          </Button>
        </ConfirmDialog>

        <ConfirmDialog
          title="Reject this lot?"
          description="This action cannot be undone. The lot will be permanently marked as rejected and cannot be used in production."
          confirmLabel="Reject Lot"
          variant="destructive"
          onConfirm={() => transitionStatus("REJECTED")}
          disabled={loading}
        >
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
            disabled={loading}
            aria-label="Reject this lot"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </ConfirmDialog>

        {deleteAction}
      </div>
    );
  }

  return deleteAction;
}
