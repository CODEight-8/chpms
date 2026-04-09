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

  // Validate supplier exists and is active
  const supplier = await prisma.supplier.findUnique({
    where: { id: parsed.data.supplierId },
  });
  if (!supplier || !supplier.isActive) {
    return errorResponse("Supplier not found or inactive", 404);
  }

  // Validate lot belongs to supplier if provided
  if (parsed.data.supplierLotId) {
    const lot = await prisma.supplierLot.findUnique({
      where: { id: parsed.data.supplierLotId },
    });
    if (!lot || lot.supplierId !== parsed.data.supplierId) {
      return errorResponse("Supplier lot not found or does not belong to this supplier", 404);
    }
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

  await logAuditEvent({
    user,
    action: "PAYMENT",
    entityType: "SupplierPayment",
    entityId: payment.id,
    details: { supplierId: parsed.data.supplierId, amount: parsed.data.amount, method: parsed.data.paymentMethod },
  });

  return jsonResponse(payment, 201);
}
