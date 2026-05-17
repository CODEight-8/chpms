"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface BatchActionsProps {
  batchId: string;
  currentStatus: string;
  totalInputHusks: number;
  canEdit: boolean;
}

export function BatchActions({
  batchId,
  currentStatus,
  totalInputHusks,
  canEdit,
}: BatchActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [outputQuantity, setOutputQuantity] = useState("");
  const [qualityScore, setQualityScore] = useState("");
  const [additionalCost, setAdditionalCost] = useState("");
  const parsedOutputQuantity = Number.parseFloat(outputQuantity);
  const parsedQualityScore = Number.parseFloat(qualityScore);
  const parsedAdditionalCost = Number.parseFloat(additionalCost);
  const hasValidOutputQuantity =
    Number.isFinite(parsedOutputQuantity) &&
    parsedOutputQuantity > 0 &&
    parsedOutputQuantity <= totalInputHusks;
  const hasValidQualityScore =
    Number.isFinite(parsedQualityScore) &&
    parsedQualityScore >= 0 &&
    parsedQualityScore <= 100;
  // Optional field. Empty / blank is treated as 0 and skipped on the server.
  // Only blocks submit when the user typed a non-empty value that is invalid.
  const additionalCostEmpty = additionalCost.trim() === "";
  const hasValidAdditionalCost =
    additionalCostEmpty ||
    (Number.isFinite(parsedAdditionalCost) && parsedAdditionalCost >= 0);

  async function handleComplete() {
    if (!hasValidOutputQuantity || !hasValidQualityScore || !hasValidAdditionalCost)
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/production-batches/${batchId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outputQuantity: parsedOutputQuantity,
          qualityScore: parsedQualityScore,
          ...(additionalCostEmpty
            ? {}
            : { additionalCost: parsedAdditionalCost }),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Batch marked as completed");
      setCompleteOpen(false);
      setOutputQuantity("");
      setQualityScore("");
      setAdditionalCost("");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to complete batch"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!canEdit) return null;

  if (currentStatus === "IN_PROGRESS") {
    return (
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogTrigger asChild>
          <Button
            className="bg-emerald-700 hover:bg-emerald-800 gap-2"
            aria-label="Mark batch as complete"
          >
            <CheckCircle className="h-4 w-4" />
            Mark Complete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Production Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Output Quantity (Kg) *</Label>
              <Input
                type="number"
                min={0.01}
                max={totalInputHusks}
                step={0.01}
                value={outputQuantity}
                onChange={(e) => setOutputQuantity(e.target.value)}
                placeholder="e.g. 450"
              />
              <p className="text-xs text-gray-500">
                Maximum allowed: {totalInputHusks.toLocaleString()} kg
              </p>
            </div>
            <div className="space-y-2">
              <Label>Quality Score (% correct size) *</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={qualityScore}
                onChange={(e) => setQualityScore(e.target.value)}
                placeholder="e.g. 85"
              />
              <p className="text-xs text-gray-500">
                {!qualityScore
                  ? "Enter a value from 0 to 100"
                  : parsedQualityScore > 100
                    ? "Quality score cannot be more than 100"
                    : hasValidQualityScore && parsedQualityScore >= 75
                  ? "Grade: GOOD"
                  : hasValidQualityScore && parsedQualityScore >= 10
                    ? "Grade: AVERAGE"
                    : hasValidQualityScore
                      ? "Grade: REJECT"
                      : "Percentage of chips matching the target size"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Additional Cost (LKR)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={additionalCost}
                onChange={(e) => setAdditionalCost(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">
                Optional — labor, electricity, fuel, packaging, etc. spent on
                this batch. Will be recorded as a Miscellaneous Out
                transaction.
              </p>
            </div>
            <Button
              onClick={handleComplete}
              className="w-full bg-emerald-700 hover:bg-emerald-800"
              disabled={
                loading ||
                !hasValidOutputQuantity ||
                !hasValidQualityScore ||
                !hasValidAdditionalCost
              }
            >
              {loading ? "Completing..." : "Confirm Complete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
