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

  const payments = await getClientPayments();
  return jsonResponse(payments);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("accounts", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = clientPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  // Validate client exists and is active
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

  // Strict no-overpayment policy: sum prior payments and reject if this payment
  // would push the running total over the cap (per-order if linked, otherwise
  // against the client's total receivable across all non-cancelled orders).
  if (parsed.data.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      select: {
        id: true,
        clientId: true,
        items: { select: { quantityOrdered: true, unitPrice: true } },
      },
    });
    if (!order) {
      return errorResponse("Order not found", 404);
    }
    if (order.clientId !== parsed.data.clientId) {
      return errorResponse("Order does not belong to the specified client");
    }

    const orderTotal = order.items.reduce(
      (sum, item) => sum + Number(item.quantityOrdered) * Number(item.unitPrice),
      0
    );
    const priorPaid = await prisma.clientPayment.aggregate({
      where: { orderId: parsed.data.orderId },
      _sum: { amount: true },
    });
    const alreadyPaid = Number(priorPaid._sum.amount ?? 0);
    const remaining = orderTotal - alreadyPaid;

    if (parsed.data.amount > remaining) {
      return errorResponse(
        `Overpayment blocked. Order total is ${orderTotal.toLocaleString("en-LK")} LKR, ` +
          `already paid ${alreadyPaid.toLocaleString("en-LK")} LKR, ` +
          `outstanding ${remaining.toLocaleString("en-LK")} LKR. ` +
          `This payment of ${parsed.data.amount.toLocaleString("en-LK")} LKR would exceed the order total.`
      );
    }
  } else {
    // General client payment: cap at total receivable across all non-cancelled orders.
    const clientOrders = await prisma.order.findMany({
      where: { clientId: parsed.data.clientId, status: { not: "CANCELLED" } },
      select: { items: { select: { quantityOrdered: true, unitPrice: true } } },
    });
    const totalReceivable = clientOrders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (orderSum, item) =>
            orderSum + Number(item.quantityOrdered) * Number(item.unitPrice),
          0
        ),
      0
    );
    const priorPaid = await prisma.clientPayment.aggregate({
      where: { clientId: parsed.data.clientId },
      _sum: { amount: true },
    });
    const alreadyPaid = Number(priorPaid._sum.amount ?? 0);
    const remaining = totalReceivable - alreadyPaid;

    if (parsed.data.amount > remaining) {
      return errorResponse(
        `Overpayment blocked. Total receivable is ${totalReceivable.toLocaleString("en-LK")} LKR, ` +
          `already received ${alreadyPaid.toLocaleString("en-LK")} LKR, ` +
          `outstanding ${remaining.toLocaleString("en-LK")} LKR. ` +
          `This payment of ${parsed.data.amount.toLocaleString("en-LK")} LKR would exceed the receivable. ` +
          `Link the payment to a specific order if applicable.`
      );
    }
  }

  const receiptNumber = await generateClientReceiptNumber();

  const payment = await prisma.clientPayment.create({
    data: {
      receiptNumber,
      clientId: parsed.data.clientId,
      orderId: parsed.data.orderId || null,
      amount: parsed.data.amount,
      paymentDate: new Date(parsed.data.paymentDate),
      paymentMethod: parsed.data.paymentMethod,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
    },
    include: {
      client: { select: { name: true } },
    },
  });

  logAuditEvent({
    user,
    action: "PAYMENT",
    entityType: "ClientPayment",
    entityId: payment.id,
    details: { clientId: parsed.data.clientId, amount: parsed.data.amount, method: parsed.data.paymentMethod },
  });

  return jsonResponse(payment, 201);
}
