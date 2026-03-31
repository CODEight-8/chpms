import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierPaymentSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getSupplierPayments } from "@/lib/queries/accounts";

export async function GET() {
  const { error } = await requireAuth("accounts", "view");
  if (error) return error;

  const payments = await getSupplierPayments();
  return jsonResponse(payments);
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth("accounts", "create");
  if (error) return error;

  const body = await request.json();
  const parsed = supplierPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const payment = await prisma.supplierPayment.create({
    data: {
      supplierId: parsed.data.supplierId,
      supplierLotId: parsed.data.supplierLotId || null,
      amount: parsed.data.amount,
      paymentDate: new Date(parsed.data.paymentDate),
      paymentMethod: parsed.data.paymentMethod,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
    },
    include: {
      supplier: { select: { name: true } },
    },
  });

  return jsonResponse(payment, 201);
}
