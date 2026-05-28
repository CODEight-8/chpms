import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientPaymentSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getClientPayments } from "@/lib/queries/accounts";
import { generateClientReceiptNumber } from "@/lib/id-generators";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET() {
  const { error } = await requireAuth("accounts", "view");
  if (error) return error;

  const { rows } = await getClientPayments();
  return jsonResponse(rows);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("accounts", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = clientPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true, isActive: true },
  });

  if (!client) {
    return errorResponse("Client not found", 404);
  }

  if (!client.isActive) {
    return errorResponse(
      "Cannot record a payment for an inactive client. Reactivate the client first."
    );
  }

  // Normalize input: prefer explicit allocations; fall back to the legacy
  // single-FK orderId by wrapping it as a one-row allocation. New writes must
  // reference at least one order — general (unallocated) payments are not
  // allowed (use a misc-in transaction for unattributed inflows like deposits).
  const allocations =
    parsed.data.allocations && parsed.data.allocations.length > 0
      ? parsed.data.allocations
      : parsed.data.orderId
        ? [{ orderId: parsed.data.orderId, amount: parsed.data.amount }]
        : null;

  if (!allocations || allocations.length === 0) {
    return errorResponse(
      "At least one order allocation is required. To record a general inflow without a linked order, use a miscellaneous in transaction instead."
    );
  }

  // Detect duplicate orders within the same payload — would otherwise violate
  // the unique constraint on (client_payment_id, order_id).
  const orderIds = allocations.map((a) => a.orderId);
  if (new Set(orderIds).size !== orderIds.length) {
    return errorResponse("Same order allocated twice in one payment");
  }

  const allocSum = allocations.reduce((sum, a) => sum + a.amount, 0);
  if (Math.abs(allocSum - parsed.data.amount) > 0.01) {
    return errorResponse(
      `Allocation total (${allocSum.toLocaleString("en-LK")} LKR) must equal the payment amount (${parsed.data.amount.toLocaleString("en-LK")} LKR).`
    );
  }

  // Validate every order belongs to the client and per-order overpayment cap.
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: {
      id: true,
      orderNumber: true,
      clientId: true,
      status: true,
      items: { select: { quantityOrdered: true, unitPrice: true } },
    },
  });
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const priorByOrder = await prisma.clientPaymentAllocation.groupBy({
    by: ["orderId"],
    where: { orderId: { in: orderIds } },
    _sum: { amount: true },
  });
  const paidByOrder = new Map(
    priorByOrder.map((p) => [p.orderId, Number(p._sum.amount ?? 0)])
  );

  for (const a of allocations) {
    const order = orderById.get(a.orderId);
    if (!order) {
      return errorResponse(`Order ${a.orderId} not found`, 404);
    }
    if (order.clientId !== parsed.data.clientId) {
      return errorResponse(
        `Order ${order.orderNumber} does not belong to the specified client`
      );
    }
    if (order.status === "CANCELLED") {
      return errorResponse(
        `Order ${order.orderNumber} is cancelled and cannot accept payment`
      );
    }
    const orderTotal = order.items.reduce(
      (sum, item) => sum + Number(item.quantityOrdered) * Number(item.unitPrice),
      0
    );
    const alreadyPaid = paidByOrder.get(order.id) ?? 0;
    const remaining = orderTotal - alreadyPaid;
    if (a.amount > remaining) {
      return errorResponse(
        `Overpayment blocked for order ${order.orderNumber}. ` +
          `Total ${orderTotal.toLocaleString("en-LK")} LKR, ` +
          `already paid ${alreadyPaid.toLocaleString("en-LK")} LKR, ` +
          `outstanding ${remaining.toLocaleString("en-LK")} LKR — ` +
          `requested ${a.amount.toLocaleString("en-LK")} LKR would exceed the order total.`
      );
    }
  }

  const receiptNumber = await generateClientReceiptNumber();

  // For backwards compatibility, populate the legacy single FK only when the
  // payment maps to exactly one order.
  const legacyOrderId = allocations.length === 1 ? allocations[0].orderId : null;

  const payment = await prisma.$transaction(async (tx) => {
    return tx.clientPayment.create({
      data: {
        receiptNumber,
        clientId: parsed.data.clientId,
        orderId: legacyOrderId,
        amount: parsed.data.amount,
        paymentDate: new Date(parsed.data.paymentDate),
        paymentMethod: parsed.data.paymentMethod,
        reference: parsed.data.reference || null,
        notes: parsed.data.notes || null,
        allocations: {
          create: allocations.map((a) => ({
            orderId: a.orderId,
            amount: a.amount,
          })),
        },
      },
      include: {
        client: { select: { name: true } },
        allocations: true,
      },
    });
  });

  logAuditEvent({
    user,
    action: "PAYMENT",
    entityType: "ClientPayment",
    entityId: payment.id,
    details: {
      clientId: parsed.data.clientId,
      amount: parsed.data.amount,
      method: parsed.data.paymentMethod,
      allocations: allocations.map((a) => ({
        orderId: a.orderId,
        amount: a.amount,
      })),
    },
  });

  return jsonResponse(payment, 201);
}
