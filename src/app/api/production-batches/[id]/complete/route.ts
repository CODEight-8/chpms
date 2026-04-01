import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { completeBatchSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-log";
import { BatchQualityGrade } from "@prisma/client";

function calculateQualityGrade(score: number): BatchQualityGrade {
  if (score >= 75) return "GOOD";
  if (score >= 10) return "AVERAGE";
  return "REJECT";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("production", "edit");
  if (error || !user) return error!;

  const batch = await prisma.productionBatch.findUnique({
    where: { id: params.id },
  });
  if (!batch) return errorResponse("Batch not found", 404);

  if (batch.status !== "IN_PROGRESS") {
    return errorResponse("Only in-progress batches can be completed");
  }

  const body = await request.json();
  const parsed = completeBatchSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const qualityGrade = calculateQualityGrade(parsed.data.qualityScore);

  const updated = await prisma.productionBatch.update({
    where: { id: params.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      outputQuantity: parsed.data.outputQuantity,
      outputUnit: parsed.data.outputUnit,
      qualityScore: parsed.data.qualityScore,
      qualityGrade,
    },
    include: {
      product: { select: { id: true, name: true, unit: true } },
    },
  });

  logAuditEvent({
    user,
    action: "COMPLETE",
    entityType: "ProductionBatch",
    entityId: params.id,
    details: {
      batchNumber: batch.batchNumber,
      outputQuantity: parsed.data.outputQuantity,
      outputUnit: parsed.data.outputUnit,
      qualityScore: parsed.data.qualityScore,
      qualityGrade,
    },
  });

  return jsonResponse(updated);
}
