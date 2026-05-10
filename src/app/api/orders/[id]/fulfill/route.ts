import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fulfillmentSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("orders", "edit");
  if (error || !user) return error!;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!order) return errorResponse("Order not found", 404);

  if (order.status !== "CONFIRMED" && order.status !== "FULFILLED") {
    return errorResponse("Order must be confirmed before fulfillment");
  }

  const body = await request.json();
  const parsed = fulfillmentSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  // All validation, batch decrement, and fulfillment writes happen atomically
  // to prevent race conditions where two concurrent fulfills overspend a batch
  // or over-fulfill an order item. The check-then-decrement pattern is unsafe
  // under READ COMMITTED isolation, so we use conditional updateMany() — Postgres
  // re-evaluates the WHERE clause against the current row when it acquires the
  // row lock, so only one of two concurrent updates can match.
  try {
    await prisma.$transaction(async (tx) => {
      for (const f of parsed.data.fulfillments) {
        const item = order.items.find((i) => i.id === f.orderItemId);
        if (!item) {
          throw new Error(`Order item ${f.orderItemId} not found`);
        }

        // Static fields (status/chipSize/batchNumber) for validation + error text.
        const batch = await tx.productionBatch.findUnique({
          where: { id: f.productionBatchId },
          select: {
            batchNumber: true,
            status: true,
            chipSize: true,
            outputUnit: true,
          },
        });
        if (!batch || batch.status !== "COMPLETED") {
          throw new Error("Production batch must be completed for fulfillment");
        }

        if (item.chipSize && batch.chipSize && item.chipSize !== batch.chipSize) {
          throw new Error(
            `Chip size mismatch: order requires ${item.chipSize} but batch ${batch.batchNumber} is ${batch.chipSize}`
          );
        }

        // Race-safe decrement: only matches the row if availableOutput is still
        // sufficient at the moment Postgres acquires the row lock.
        const batchUpdate = await tx.productionBatch.updateMany({
          where: {
            id: f.productionBatchId,
            availableOutput: { gte: f.quantityFulfilled },
          },
          data: {
            availableOutput: { decrement: f.quantityFulfilled },
          },
        });
        if (batchUpdate.count === 0) {
          const current = await tx.productionBatch.findUnique({
            where: { id: f.productionBatchId },
            select: { availableOutput: true, outputUnit: true },
          });
          const left = Number(current?.availableOutput ?? 0);
          throw new Error(
            `Batch ${batch.batchNumber} only has ${left.toLocaleString()} ${batch.outputUnit ?? "kg"} available, requested ${f.quantityFulfilled.toLocaleString()}`
          );
        }

        // Race-safe increment on order item: only matches if current
        // quantityFulfilled + new amount would not exceed quantityOrdered.
        const ordered = Number(item.quantityOrdered);
        const itemUpdate = await tx.orderItem.updateMany({
          where: {
            id: f.orderItemId,
            quantityFulfilled: { lte: ordered - f.quantityFulfilled },
          },
          data: {
            quantityFulfilled: { increment: f.quantityFulfilled },
          },
        });
        if (itemUpdate.count === 0) {
          // The transaction will rollback the batch decrement on throw.
          throw new Error(
            `Cannot fulfill ${f.quantityFulfilled} — would exceed remaining quantity for this item`
          );
        }

        await tx.orderFulfillment.create({
          data: {
            orderItemId: f.orderItemId,
            productionBatchId: f.productionBatchId,
            quantityFulfilled: f.quantityFulfilled,
          },
        });
      }

      // Check if all items are fully fulfilled
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: params.id },
      });

      const allFulfilled = updatedItems.every(
        (item) =>
          Number(item.quantityFulfilled) >= Number(item.quantityOrdered)
      );

      if (allFulfilled) {
        await tx.order.update({
          where: { id: params.id },
          data: { status: "FULFILLED" },
        });
      }
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Fulfillment failed");
  }

  logAuditEvent({
    user,
    action: "FULFILL",
    entityType: "Order",
    entityId: params.id,
    details: { orderNumber: order.orderNumber, fulfillments: parsed.data.fulfillments },
  });

  return jsonResponse({ success: true });
}
