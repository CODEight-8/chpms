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
  const statusParam = searchParams.get("status");
  const status =
    statusParam && Object.values(BatchStatus).includes(statusParam as BatchStatus)
      ? (statusParam as BatchStatus)
      : null;
  const search = searchParams.get("search") || undefined;
  const chipSize = searchParams.get("chipSize") || undefined;
  const countsOnly = searchParams.get("counts") === "true";

  if (statusParam && !status) {
    return errorResponse("Invalid status");
  }

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

  // All lot validation, cost calculation, and updates happen inside the
  // transaction. The husk decrement uses conditional updateMany() — Postgres
  // re-evaluates the WHERE clause when acquiring the row lock, so two concurrent
  // batch creations cannot both pass the availableHusks check on the same lot.
  try {
    const batch = await prisma.$transaction(async (tx) => {
      // First pass: read each lot to capture perHuskRate (immutable, needed for
      // cost) and lotNumber (for clear error messages). Fast-fail validation here
      // gives a clean error before any writes; the conditional update below is
      // the actual race-safe enforcement.
      let totalRawCost = 0;
      const lotMeta = new Map<string, { lotNumber: string }>();
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
        lotMeta.set(lot.id, { lotNumber: lot.lotNumber });
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

      // Second pass: race-safe per-lot atomic decrement, then status update.
      for (const lotEntry of lots) {
        const meta = lotMeta.get(lotEntry.lotId)!;

        // Conditional decrement: only succeeds if the lot is still in a usable
        // status AND has enough husks at the moment Postgres acquires the row lock.
        const decrementResult = await tx.supplierLot.updateMany({
          where: {
            id: lotEntry.lotId,
            status: { in: ["GOOD_TO_GO", "ALLOCATED"] },
            availableHusks: { gte: lotEntry.quantityUsed },
          },
          data: { availableHusks: { decrement: lotEntry.quantityUsed } },
        });
        if (decrementResult.count === 0) {
          // Re-read to give a precise error (concurrent allocation, status flip, etc.).
          const current = await tx.supplierLot.findUnique({
            where: { id: lotEntry.lotId },
            select: { availableHusks: true, status: true },
          });
          if (
            !current ||
            (current.status !== "GOOD_TO_GO" && current.status !== "ALLOCATED")
          ) {
            throw new Error(
              `Lot ${meta.lotNumber} is no longer available (status: ${current?.status ?? "?"})`
            );
          }
          throw new Error(
            `Lot ${meta.lotNumber} only has ${current.availableHusks} husks available, requested ${lotEntry.quantityUsed}`
          );
        }

        // Update status based on the post-decrement availableHusks. We still hold
        // the row lock from the conditional update above, so this read sees our
        // own write and concurrent transactions are queued behind us.
        const after = await tx.supplierLot.findUnique({
          where: { id: lotEntry.lotId },
          select: { availableHusks: true },
        });
        await tx.supplierLot.update({
          where: { id: lotEntry.lotId },
          data: {
            status: after!.availableHusks === 0 ? "CONSUMED" : "ALLOCATED",
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
