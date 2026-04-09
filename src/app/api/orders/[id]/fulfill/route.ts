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

  // Validate each fulfillment
  for (const f of parsed.data.fulfillments) {
    const item = order.items.find((i) => i.id === f.orderItemId);
    if (!item) {
      return errorResponse(`Order item ${f.orderItemId} not found`);
    }

    const batch = await prisma.productionBatch.findUnique({
      where: { id: f.productionBatchId },
    });
    if (!batch || batch.status !== "COMPLETED") {
      return errorResponse("Production batch must be completed for fulfillment");
    }

    // Validate product match
    if (batch.productId !== item.productId) {
      return errorResponse(
        `Product mismatch: batch ${batch.batchNumber} does not match the ordered product`
      );
    }

    // Validate chip size match
    if (item.chipSize && batch.chipSize && item.chipSize !== batch.chipSize) {
      return errorResponse(
        `Chip size mismatch: order requires ${item.chipSize} but batch ${batch.batchNumber} is ${batch.chipSize}`
      );
    }

    const remaining =
      Number(item.quantityOrdered) - Number(item.quantityFulfilled);
    if (f.quantityFulfilled > remaining) {
      return errorResponse(
        `Cannot fulfill ${f.quantityFulfilled} — only ${remaining} remaining for this item`
      );
    }
  }

  // Create fulfillments in transaction
  await prisma.$transaction(async (tx) => {
    for (const f of parsed.data.fulfillments) {
      await tx.orderFulfillment.create({
        data: {
          orderItemId: f.orderItemId,
          productionBatchId: f.productionBatchId,
          quantityFulfilled: f.quantityFulfilled,
        },
      });

      // Update fulfilled quantity on order item
      await tx.orderItem.update({
        where: { id: f.orderItemId },
        data: {
          quantityFulfilled: {
            increment: f.quantityFulfilled,
          },
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

  await logAuditEvent({
    user,
    action: "FULFILL",
    entityType: "Order",
    entityId: params.id,
    details: { orderNumber: order.orderNumber, fulfillments: parsed.data.fulfillments },
  });

  return jsonResponse({ success: true });
}
