import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientPaymentSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getClientPayments } from "@/lib/queries/accounts";
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

  const payment = await prisma.clientPayment.create({
    data: {
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
