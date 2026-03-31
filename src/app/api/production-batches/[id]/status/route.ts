import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { canTransitionBatch } from "@/lib/status-machines";
import { BatchStatus } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("production", "edit");
  if (error) return error;

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

  const updated = await prisma.productionBatch.update({
    where: { id: params.id },
    data: { status: newStatus },
    include: {
      product: { select: { id: true, name: true, unit: true } },
    },
  });

  return jsonResponse(updated);
}
