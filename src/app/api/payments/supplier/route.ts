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

  // Normalize input: prefer explicit allocations; fall back to the legacy
  // single-FK supplierLotId by wrapping it as a one-row allocation. New writes
  // must reference at least one lot — general (unallocated) payments are not
  // allowed (use a misc-out transaction for unattributed outflows).
  const allocations =
    parsed.data.allocations && parsed.data.allocations.length > 0
      ? parsed.data.allocations
      : parsed.data.supplierLotId
        ? [
            {
              supplierLotId: parsed.data.supplierLotId,
              amount: parsed.data.amount,
            },
          ]
        : null;

  if (!allocations || allocations.length === 0) {
    return errorResponse(
      "At least one lot allocation is required. To record a general outflow without a linked lot, use a miscellaneous out transaction instead."
    );
  }

  // Detect duplicate lots within the same payload — would otherwise violate the
  // unique constraint on (supplier_payment_id, supplier_lot_id) and is almost
  // certainly a UI bug.
  const lotIds = allocations.map((a) => a.supplierLotId);
  if (new Set(lotIds).size !== lotIds.length) {
    return errorResponse("Same lot allocated twice in one payment");
  }

  // Sum-of-allocations must equal the payment amount. A small tolerance for
  // floating-point error is allowed (one cent on LKR-scale numbers is generous).
  const allocSum = allocations.reduce((sum, a) => sum + a.amount, 0);
  if (Math.abs(allocSum - parsed.data.amount) > 0.01) {
    return errorResponse(
      `Allocation total (${allocSum.toLocaleString("en-LK")} LKR) must equal the payment amount (${parsed.data.amount.toLocaleString("en-LK")} LKR).`
    );
  }

  // Validate every lot belongs to the supplier and that the new allocation
  // would not push the lot's running paid-amount above its total cost.
  const lots = await prisma.supplierLot.findMany({
    where: { id: { in: lotIds } },
    select: {
      id: true,
      lotNumber: true,
      supplierId: true,
      totalCost: true,
    },
  });
  const lotById = new Map(lots.map((l) => [l.id, l]));

  // Pre-compute prior paid amount per lot in a single query.
  const priorByLot = await prisma.supplierPaymentAllocation.groupBy({
    by: ["supplierLotId"],
    where: { supplierLotId: { in: lotIds } },
    _sum: { amount: true },
  });
  const paidByLot = new Map(
    priorByLot.map((p) => [p.supplierLotId, Number(p._sum.amount ?? 0)])
  );

  for (const a of allocations) {
    const lot = lotById.get(a.supplierLotId);
    if (!lot) {
      return errorResponse(`Lot ${a.supplierLotId} not found`, 404);
    }
    if (lot.supplierId !== parsed.data.supplierId) {
      return errorResponse(
        `Lot ${lot.lotNumber} does not belong to the specified supplier`
      );
    }
    const lotTotal = Number(lot.totalCost);
    const alreadyPaid = paidByLot.get(lot.id) ?? 0;
    const remaining = lotTotal - alreadyPaid;
    if (a.amount > remaining) {
      return errorResponse(
        `Overpayment blocked for lot ${lot.lotNumber}. ` +
          `Total ${lotTotal.toLocaleString("en-LK")} LKR, ` +
          `already paid ${alreadyPaid.toLocaleString("en-LK")} LKR, ` +
          `outstanding ${remaining.toLocaleString("en-LK")} LKR — ` +
          `requested ${a.amount.toLocaleString("en-LK")} LKR would exceed the lot cost.`
      );
    }
  }

  const receiptNumber = await generateSupplierReceiptNumber();

  // For backwards compatibility with existing pages that read the legacy single
  // FK, populate `supplierLotId` only when the payment maps to exactly one lot.
  // Multi-lot payments leave it null and existing surfaces will fall back to
  // displaying allocation rows once the UI migrates in Phase 4.
  const legacyLotId = allocations.length === 1 ? allocations[0].supplierLotId : null;

  const payment = await prisma.$transaction(async (tx) => {
    return tx.supplierPayment.create({
      data: {
        receiptNumber,
        supplierId: parsed.data.supplierId,
        supplierLotId: legacyLotId,
        amount: parsed.data.amount,
        paymentDate: new Date(parsed.data.paymentDate),
        paymentMethod: parsed.data.paymentMethod,
        reference: parsed.data.reference || null,
        notes: parsed.data.notes || null,
        allocations: {
          create: allocations.map((a) => ({
            supplierLotId: a.supplierLotId,
            amount: a.amount,
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        allocations: true,
      },
    });
  });

  logAuditEvent({
    user,
    action: "PAYMENT",
    entityType: "SupplierPayment",
    entityId: payment.id,
    details: {
      supplierId: parsed.data.supplierId,
      amount: parsed.data.amount,
      method: parsed.data.paymentMethod,
      allocations: allocations.map((a) => ({
        lotId: a.supplierLotId,
        amount: a.amount,
      })),
    },
  });

  return jsonResponse(payment, 201);
}
