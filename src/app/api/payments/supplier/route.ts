import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierPaymentSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getSupplierPayments } from "@/lib/queries/accounts";
import { generateSupplierReceiptNumber } from "@/lib/id-generators";
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

  // Strict no-overpayment policy: sum prior payments and reject if this payment
  // would push the running total over the cap (per-lot if linked, otherwise
  // against the supplier's total payable across all lots).
  if (parsed.data.supplierLotId) {
    const lot = await prisma.supplierLot.findUnique({
      where: { id: parsed.data.supplierLotId },
      select: { id: true, supplierId: true, totalCost: true },
    });
    if (!lot) {
      return errorResponse("Lot not found", 404);
    }
    if (lot.supplierId !== parsed.data.supplierId) {
      return errorResponse("Lot does not belong to the specified supplier");
    }

    const lotTotal = Number(lot.totalCost);
    const priorPaid = await prisma.supplierPayment.aggregate({
      where: { supplierLotId: parsed.data.supplierLotId },
      _sum: { amount: true },
    });
    const alreadyPaid = Number(priorPaid._sum.amount ?? 0);
    const remaining = lotTotal - alreadyPaid;

    if (parsed.data.amount > remaining) {
      return errorResponse(
        `Overpayment blocked. Lot total is ${lotTotal.toLocaleString("en-LK")} LKR, ` +
          `already paid ${alreadyPaid.toLocaleString("en-LK")} LKR, ` +
          `outstanding ${remaining.toLocaleString("en-LK")} LKR. ` +
          `This payment of ${parsed.data.amount.toLocaleString("en-LK")} LKR would exceed the lot cost.`
      );
    }
  } else {
    // General supplier payment: cap at total payable across all lots.
    const lots = await prisma.supplierLot.findMany({
      where: { supplierId: parsed.data.supplierId },
      select: { totalCost: true },
    });
    const totalPayable = lots.reduce(
      (sum, l) => sum + Number(l.totalCost),
      0
    );
    const priorPaid = await prisma.supplierPayment.aggregate({
      where: { supplierId: parsed.data.supplierId },
      _sum: { amount: true },
    });
    const alreadyPaid = Number(priorPaid._sum.amount ?? 0);
    const remaining = totalPayable - alreadyPaid;

    if (parsed.data.amount > remaining) {
      return errorResponse(
        `Overpayment blocked. Total payable is ${totalPayable.toLocaleString("en-LK")} LKR, ` +
          `already paid ${alreadyPaid.toLocaleString("en-LK")} LKR, ` +
          `outstanding ${remaining.toLocaleString("en-LK")} LKR. ` +
          `This payment of ${parsed.data.amount.toLocaleString("en-LK")} LKR would exceed the payable. ` +
          `Link the payment to a specific lot if applicable.`
      );
    }
  }

  const receiptNumber = await generateSupplierReceiptNumber();

  const payment = await prisma.supplierPayment.create({
    data: {
      receiptNumber,
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
