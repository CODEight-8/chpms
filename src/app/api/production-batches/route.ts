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

  // Verify product exists (safe outside transaction — products are not mutated)
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product || !product.isActive) {
    return errorResponse("Product not found or inactive", 404);
  }

  const batchNumber = await generateBatchNumber();

  // All lot validation, cost calculation, and updates happen inside the transaction
  // to prevent race conditions (concurrent requests double-allocating husks)
  try {
    const batch = await prisma.$transaction(async (tx) => {
      // Validate lots and compute cost atomically
      let totalRawCost = 0;
      for (const lotEntry of lots) {
        const lot = await tx.supplierLot.findUnique({
          where: { id: lotEntry.lotId },
        });
        if (!lot) {
          throw new Error(`Lot ${lotEntry.lotId} not found`);
        }
        if (lot.status !== "GOOD_TO_GO" && lot.status !== "ALLOCATED") {
          throw new Error(
            `Lot ${lot.lotNumber} is not available (status: ${lot.status})`
          );
        }
        if (lot.availableHusks < lotEntry.quantityUsed) {
          throw new Error(
            `Lot ${lot.lotNumber} only has ${lot.availableHusks} husks available, requested ${lotEntry.quantityUsed}`
          );
        }
        totalRawCost += lotEntry.quantityUsed * Number(lot.perHuskRate);
      }

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
      details: { batchNumber, productId, lots, totalRawCost: Number(batch.totalRawCost) },
    });

    return jsonResponse(batch, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create batch";
    return errorResponse(message);
  }
}
