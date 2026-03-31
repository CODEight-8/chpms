import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { completeBatchSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";

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

  if (batch.status !== "IN_PROGRESS") {
    return errorResponse("Only in-progress batches can be completed");
  }

  const body = await request.json();
  const parsed = completeBatchSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const updated = await prisma.productionBatch.update({
    where: { id: params.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      outputQuantity: parsed.data.outputQuantity,
      outputUnit: parsed.data.outputUnit,
    },
    include: {
      product: { select: { id: true, name: true, unit: true } },
    },
  });

  return jsonResponse(updated);
}
