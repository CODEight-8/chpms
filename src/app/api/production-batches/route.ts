import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { productionBatchSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { generateBatchNumber } from "@/lib/id-generators";
import { getBatchesWithDetails, getBatchStatusCounts } from "@/lib/queries/production-batches";
import { BatchStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("production", "view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as BatchStatus | null;
  const search = searchParams.get("search") || undefined;
  const chipSize = searchParams.get("chipSize") || undefined;
  const countsOnly = searchParams.get("counts") === "true";

  if (countsOnly) {
    const counts = await getBatchStatusCounts();
    return jsonResponse(counts);
  }

  const batches = await getBatchesWithDetails({
    status: status || undefined,
    search,
    chipSize,
  });

  return jsonResponse(batches);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("production", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = productionBatchSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const { productId, chipSize, lots, notes, remarks } = parsed.data;

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product || !product.isActive) {
    return errorResponse("Product not found or inactive", 404);
  }

  // Verify all lots exist and have enough available husks
  for (const lotEntry of lots) {
    const lot = await prisma.supplierLot.findUnique({
      where: { id: lotEntry.lotId },
    });
    if (!lot) {
      return errorResponse(`Lot ${lotEntry.lotId} not found`, 404);
    }
    if (lot.status !== "GOOD_TO_GO" && lot.status !== "ALLOCATED") {
      return errorResponse(
        `Lot ${lot.lotNumber} is not available (status: ${lot.status})`
      );
    }
    if (lot.availableHusks < lotEntry.quantityUsed) {
      return errorResponse(
        `Lot ${lot.lotNumber} only has ${lot.availableHusks} husks available, requested ${lotEntry.quantityUsed}`
      );
    }
  }

  // Generate batch number
  const batchNumber = await generateBatchNumber();

  // Calculate total raw cost
  const lotDetails = await Promise.all(
    lots.map(async (l) => {
      const lot = await prisma.supplierLot.findUnique({
        where: { id: l.lotId },
      });
      return {
        ...l,
        perHuskRate: Number(lot!.perHuskRate),
      };
    })
  );

  const totalRawCost = lotDetails.reduce(
    (sum, l) => sum + l.quantityUsed * l.perHuskRate,
    0
  );

  // Create batch in transaction
  const batch = await prisma.$transaction(async (tx) => {
    // Create the production batch
    const newBatch = await tx.productionBatch.create({
      data: {
        batchNumber,
        productId,
        chipSize,
        totalRawCost,
        notes: notes || null,
        remarks: remarks || null,
        batchLots: {
          create: lots.map((l) => ({
            supplierLotId: l.lotId,
            quantityUsed: l.quantityUsed,
          })),
        },
      },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        batchLots: {
          include: {
            supplierLot: {
              select: {
                id: true,
                lotNumber: true,
                supplier: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Update each supplier lot: deduct husks and update status
    for (const lotEntry of lots) {
      const lot = await tx.supplierLot.findUnique({
        where: { id: lotEntry.lotId },
      });
      const newAvailable = lot!.availableHusks - lotEntry.quantityUsed;
      await tx.supplierLot.update({
        where: { id: lotEntry.lotId },
        data: {
          availableHusks: newAvailable,
          status: newAvailable === 0 ? "CONSUMED" : "ALLOCATED",
        },
      });
    }

    return newBatch;
  });

  logAuditEvent({
    user,
    action: "CREATE",
    entityType: "ProductionBatch",
    entityId: batch.id,
    details: { batchNumber, productId, lots, totalRawCost },
  });

  return jsonResponse(batch, 201);
}
