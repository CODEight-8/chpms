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

  // Validate order belongs to the specified client
  let orderTotalRevenue = 0;
  if (parsed.data.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      select: { id: true, clientId: true, items: { select: { quantityOrdered: true, unitPrice: true } } },
    });
    if (!order) {
      return errorResponse("Order not found", 404);
    }
    if (order.clientId !== parsed.data.clientId) {
      return errorResponse("Order does not belong to the specified client");
    }
    // Calculate order total
    orderTotalRevenue = order.items.reduce(
      (sum, item) => sum + Number(item.quantityOrdered) * Number(item.unitPrice),
      0
    );
    
    // Check if payment exceeds order total by more than 10% (allow for rounding)
    if (parsed.data.amount > orderTotalRevenue * 1.1) {
      return errorResponse(
        `Payment amount (${parsed.data.amount}) exceeds order total (${orderTotalRevenue}) by more than 10%. ` +
        "Please verify the amount is correct. Contact admin to force override if necessary."
      );
    }
  } else {
    // For general client payments (not tied to specific order), check against all unpaid orders
    const clientOrders = await prisma.order.findMany({
      where: { clientId: parsed.data.clientId, status: { not: "CANCELLED" } },
      include: { items: { select: { quantityOrdered: true, unitPrice: true } } },
    });

    const totalClientRevenue = clientOrders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (orderSum, item) => orderSum + Number(item.quantityOrdered) * Number(item.unitPrice),
          0
        ),
      0
    );

    const totalClientPaid = await prisma.clientPayment.aggregate({
      where: { clientId: parsed.data.clientId },
      _sum: { amount: true },
    });

    const alreadyPaid = Number(totalClientPaid._sum.amount || 0);

    // Flag payment as suspicious if it causes overpayment >5%
    if (alreadyPaid + parsed.data.amount > totalClientRevenue * 1.05) {
      console.warn(
        `[WARNING] Potential overpayment detected: Client ${parsed.data.clientId}, ` +
        `existing payments: ${alreadyPaid}, new payment: ${parsed.data.amount}, total revenue: ${totalClientRevenue}`
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
