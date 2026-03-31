import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierLotSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { generateLotNumber, generateInvoiceNumber } from "@/lib/id-generators";
import { getLotsWithAging, getLotStatusCounts } from "@/lib/queries/supplier-lots";
import { LotStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("supplier-lots", "view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as LotStatus | null;
  const supplierId = searchParams.get("supplierId") || undefined;
  const search = searchParams.get("search") || undefined;
  const countsOnly = searchParams.get("counts") === "true";

  if (countsOnly) {
    const counts = await getLotStatusCounts();
    return jsonResponse(counts);
  }

  const lots = await getLotsWithAging({
    status: status || undefined,
    supplierId,
    search,
  });

  return jsonResponse(lots);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("supplier-lots", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = supplierLotSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const { supplierId, harvestDate, dateReceived, huskCount, perHuskRate, qualityGrade, notes } =
    parsed.data;

  // Verify supplier exists and is active
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });
  if (!supplier || !supplier.isActive) {
    return errorResponse("Supplier not found or inactive", 404);
  }

  // Generate lot number and invoice number
  const lotNumber = await generateLotNumber();
  const invoiceNumber = generateInvoiceNumber(lotNumber);

  const totalCost = huskCount * perHuskRate;

  const lot = await prisma.supplierLot.create({
    data: {
      lotNumber,
      invoiceNumber,
      supplierId,
      harvestDate: new Date(harvestDate),
      dateReceived: new Date(dateReceived),
      huskCount,
      availableHusks: huskCount,
      perHuskRate,
      totalCost,
      qualityGrade: qualityGrade || null,
      notes: notes || null,
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  });

  logAuditEvent({
    user,
    action: "CREATE",
    entityType: "SupplierLot",
    entityId: lot.id,
    details: { lotNumber: lot.lotNumber, supplierId, huskCount },
  });

  return jsonResponse(lot, 201);
}
