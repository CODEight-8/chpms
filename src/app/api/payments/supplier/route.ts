import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierPaymentSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getSupplierPayments } from "@/lib/queries/accounts";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET() {
  const { error } = await requireAuth("accounts", "view");
  if (error) return error;

  const payments = await getSupplierPayments();
  return jsonResponse(payments);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("accounts", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = supplierPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: parsed.data.supplierId },
    select: { id: true, isActive: true },
  });

  if (!supplier) {
    return errorResponse("Supplier not found", 404);
  }

  if (!supplier.isActive) {
    return errorResponse(
      "Cannot record a payment for an inactive supplier. Reactivate the supplier first."
    );
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

  logAuditEvent({
    user,
    action: "PAYMENT",
    entityType: "SupplierPayment",
    entityId: payment.id,
    details: { supplierId: parsed.data.supplierId, amount: parsed.data.amount, method: parsed.data.paymentMethod },
  });

  return jsonResponse(payment, 201);
}
