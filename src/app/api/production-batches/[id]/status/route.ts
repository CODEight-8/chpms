import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { canTransitionBatch } from "@/lib/status-machines";
import { BatchStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit-log";

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

  const body = await request.json();
  const newStatus = body.status as BatchStatus;

  if (!newStatus || !Object.values(BatchStatus).includes(newStatus)) {
    return errorResponse("Invalid status");
  }

  if (!canTransitionBatch(batch.status, newStatus)) {
    return errorResponse(
      `Cannot transition from ${batch.status} to ${newStatus}`
    );
  }

  // Users cannot arbitrarily mark a batch as COMPLETED via the generic status endpoint 
  // without registering the actual production output.
  if (newStatus === "COMPLETED" && !batch.outputQuantity) {
    return errorResponse(
      "Cannot mark batch as COMPLETED without output metrics. Please use the specific /complete endpoint to register output quantities and quality."
    );
  }

  const updated = await prisma.productionBatch.update({
    where: { id: params.id },
    data: { status: newStatus },
    include: {
      product: { select: { id: true, name: true, unit: true } },
    },
  });

  logAuditEvent({
    user,
    action: "STATUS_CHANGE",
    entityType: "ProductionBatch",
    entityId: params.id,
    details: { batchNumber: batch.batchNumber, from: batch.status, to: newStatus },
  });

  return jsonResponse(updated);
}
