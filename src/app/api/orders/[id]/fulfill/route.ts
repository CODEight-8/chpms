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

  const batchIds = Array.from(
    new Set(parsed.data.fulfillments.map((f) => f.productionBatchId))
  );

  const batches = await prisma.productionBatch.findMany({
    where: { id: { in: batchIds } },
  });

  const batchUsage = await prisma.orderFulfillment.groupBy({
    by: ["productionBatchId"],
    where: { productionBatchId: { in: batchIds } },
    _sum: { quantityFulfilled: true },
  });

  const usedQuantityByBatch = new Map(
    batchUsage.map((usage) => [
      usage.productionBatchId,
      Number(usage._sum.quantityFulfilled ?? 0),
    ])
  );

  const requestedQuantityByBatch = new Map<string, number>();
  // FIX 1: Track order items globally within the request exactly like batches
  const requestedQuantityByOrderItem = new Map<string, number>();

  // Validate each fulfillment
  for (const f of parsed.data.fulfillments) {
    const item = order.items.find((i) => i.id === f.orderItemId);
    if (!item) {
      return errorResponse(`Order item ${f.orderItemId} not found`);
    }

    const batch = batches.find((b) => b.id === f.productionBatchId);
    if (!batch || batch.status !== "COMPLETED") {
      return errorResponse("Production batch must be completed for fulfillment");
    }

    if (!batch.outputQuantity) {
      return errorResponse(
        `Production batch ${batch.batchNumber} must have output quantity before fulfillment`
      );
    }

    if (item.productId !== batch.productId) {
      return errorResponse(
        `Production batch ${batch.batchNumber} is for a different product than order item ${item.id}`
      );
    }

    if (item.chipSize && batch.chipSize && item.chipSize !== batch.chipSize) {
      return errorResponse(
        `Chip size mismatch: order requires ${item.chipSize} but batch ${batch.batchNumber} is ${batch.chipSize}`
      );
    }

    const remainingItemQuantity =
      Number(item.quantityOrdered) - Number(item.quantityFulfilled);
      
    // FIX 1 cont'd: Safely accumulate the item quantity within this payload
    const existingItemRequested = requestedQuantityByOrderItem.get(item.id) ?? 0;
    const newItemRequestedTotal = existingItemRequested + f.quantityFulfilled;
    requestedQuantityByOrderItem.set(item.id, newItemRequestedTotal);

    if (newItemRequestedTotal > remainingItemQuantity) {
      return errorResponse(
        `Cannot fulfill ${f.quantityFulfilled} — only ${
          remainingItemQuantity - existingItemRequested
        } remaining for this item`
      );
    }

    const existingUsed = usedQuantityByBatch.get(batch.id) ?? 0;
    const requestedSoFar = requestedQuantityByBatch.get(batch.id) ?? 0;
    const newRequestedTotal = requestedSoFar + f.quantityFulfilled;
    requestedQuantityByBatch.set(batch.id, newRequestedTotal);

    const batchRemaining =
      Number(batch.outputQuantity) - existingUsed - newRequestedTotal;

    if (batchRemaining < 0) {
      return errorResponse(
        `Production batch ${batch.batchNumber} does not have enough output remaining. Requested ${newRequestedTotal} but only ${
          Number(batch.outputQuantity) - existingUsed
        } is available.`
      );
    }
  }

  // Create fulfillments in transaction
  try {
    await prisma.$transaction(async (tx) => {
      // FIX 2: Protect against Race Conditions via Row-level Database Locking
      // Re-saving the batches triggers PostgreSQL to lock these rows FOR UPDATE. 
      // If concurrent requests execute simultaneously, the second request will wait here cleanly.
      for (const batchId of batchIds) {
        await tx.productionBatch.update({
          where: { id: batchId },
          data: { updatedAt: new Date() } 
        });
      }

      // Now that we have the lock, recalculate the batch usages inside the transaction
      const safeBatchUsage = await tx.orderFulfillment.groupBy({
        by: ["productionBatchId"],
        where: { productionBatchId: { in: batchIds } },
        _sum: { quantityFulfilled: true },
      });
      const safeUsedByBatch = new Map(
        safeBatchUsage.map((u) => [u.productionBatchId, Number(u._sum.quantityFulfilled ?? 0)])
      );
      const safeRequestedByBatch = new Map<string, number>();

      for (const f of parsed.data.fulfillments) {
        // Enforce the batch limit perfectly internally
        const batch = batches.find((b) => b.id === f.productionBatchId)!;
        const currentUsed = safeUsedByBatch.get(batch.id) ?? 0;
        const soFar = safeRequestedByBatch.get(batch.id) ?? 0;
        const totalReq = soFar + f.quantityFulfilled;
        safeRequestedByBatch.set(batch.id, totalReq);

        if (Number(batch.outputQuantity) - currentUsed - totalReq < 0) {
          throw new Error(`Production batch ${batch.batchNumber} ran out of available capacity during processing.`);
        }
        
        await tx.orderFulfillment.create({
          data: {
            orderItemId: f.orderItemId,
            productionBatchId: f.productionBatchId,
            quantityFulfilled: f.quantityFulfilled,
          },
        });

        // Update fulfilled quantity on order item
        const updatedItem = await tx.orderItem.update({
          where: { id: f.orderItemId },
          data: {
            quantityFulfilled: {
              increment: f.quantityFulfilled,
            },
          },
        });

        // The update returns the committed DB value. If we over-shot, auto rollback the whole transaction.
        if (Number(updatedItem.quantityFulfilled) > Number(updatedItem.quantityOrdered)) {
          throw new Error(`Order item limit exceeded for product. Request aborted.`);
        }
      }

      // Check if all items are fully fulfilled based on locked database data
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: params.id },
      });

      const allFulfilled = updatedItems.every(
        (item) => Number(item.quantityFulfilled) >= Number(item.quantityOrdered)
      );

      if (allFulfilled) {
        await tx.order.update({
          where: { id: params.id },
          data: { status: "FULFILLED" },
        });
      }
    }); // end transaction
  } catch (err: any) {
    return errorResponse(err.message || "Failed to process fulfillment");
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
