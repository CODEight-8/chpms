import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { canTransitionOrder } from "@/lib/status-machines";
import { OrderStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit-log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("orders", "edit");
  if (error || !user) return error!;

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return errorResponse("Order not found", 404);

  const body = await request.json();
  const newStatus = body.status as OrderStatus;

  if (!newStatus || !Object.values(OrderStatus).includes(newStatus)) {
    return errorResponse("Invalid status");
  }

  if (!canTransitionOrder(order.status, newStatus)) {
    return errorResponse(
      `Cannot transition from ${order.status} to ${newStatus}`
    );
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status: newStatus },
    include: {
      client: { select: { id: true, name: true } },
    },
  });

  logAuditEvent({
    user,
    action: "STATUS_CHANGE",
    entityType: "Order",
    entityId: params.id,
    details: { orderNumber: order.orderNumber, from: order.status, to: newStatus },
  });

  return jsonResponse(updated);
}
