import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { completeBatchSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { generateMiscReceiptNumber } from "@/lib/id-generators";
import { logAuditEvent } from "@/lib/audit-log";
import { BatchQualityGrade } from "@prisma/client";

function calculateQualityGrade(score: number): BatchQualityGrade {
  if (score >= 75) return "GOOD";
  if (score >= 50) return "AVERAGE";
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
    include: {
      batchLots: {
        select: {
          quantityUsed: true,
        },
      },
    },
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

  const totalInputHusks = batch.batchLots.reduce(
    (sum, lot) => sum + lot.quantityUsed,
    0
  );

  if (parsed.data.outputQuantity > totalInputHusks) {
    return errorResponse(
      `Output quantity (${parsed.data.outputQuantity.toLocaleString()} ${parsed.data.outputUnit}) cannot exceed total input husks (${totalInputHusks.toLocaleString()}).`
    );
  }

  const qualityGrade = calculateQualityGrade(parsed.data.qualityScore);
  const additionalCost = parsed.data.additionalCost ?? 0;
  const completedAt = new Date();

  // Pre-generate the misc receipt number outside the transaction (it reads
  // miscTransaction.count internally — fine to do before; under low write
  // concurrency on misc this is safe enough).
  const miscReceiptNumber =
    additionalCost > 0 ? await generateMiscReceiptNumber("OUT") : null;

  // Atomic: batch update + linked misc transaction succeed together or roll
  // back together. If additionalCost is 0/undefined, no misc record is made.
  const { updated, misc } = await prisma.$transaction(async (tx) => {
    const updated = await tx.productionBatch.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        completedAt,
        outputQuantity: parsed.data.outputQuantity,
        availableOutput: parsed.data.outputQuantity,
        outputUnit: parsed.data.outputUnit,
        qualityScore: parsed.data.qualityScore,
        qualityGrade,
        additionalCost: additionalCost > 0 ? additionalCost : null,
      },
      include: {
        product: { select: { id: true, name: true, unit: true } },
      },
    });

    let misc = null;
    if (additionalCost > 0 && miscReceiptNumber) {
      misc = await tx.miscTransaction.create({
        data: {
          receiptNumber: miscReceiptNumber,
          direction: "OUT",
          category: "Production Batch Cost",
          amount: additionalCost,
          paymentMethod: "CASH",
          transactionDate: completedAt,
          description: `Batch ${batch.batchNumber} - Additional cost`,
          reference: batch.batchNumber,
          productionBatchId: params.id,
          createdByUserId: user.id,
        },
      });
    }

    return { updated, misc };
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
      additionalCost,
      miscReceiptNumber: misc?.receiptNumber ?? null,
    },
  });

  return jsonResponse(updated);
}
