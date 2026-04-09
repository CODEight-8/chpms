import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getLotDetail } from "@/lib/queries/supplier-lots";
import { supplierLotUpdateSchema } from "@/lib/validators";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("supplier-lots", "view");
  if (error) return error;

  const lot = await getLotDetail(params.id);
  if (!lot) return errorResponse("Lot not found", 404);

  return jsonResponse(lot);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("supplier-lots", "edit");
  if (error || !user) return error!;

  const lot = await prisma.supplierLot.findUnique({
    where: { id: params.id },
  });
  if (!lot) return errorResponse("Lot not found", 404);

  const body = await request.json();
  const parsed = supplierLotUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const updateData: Record<string, string> = {};

  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  if (parsed.data.qualityGrade !== undefined && lot.status === "AUDIT") {
    updateData.qualityGrade = parsed.data.qualityGrade;
  }

  const updated = await prisma.supplierLot.update({
    where: { id: params.id },
    data: updateData,
    include: {
      supplier: { select: { id: true, name: true } },
    },
  });

  await logAuditEvent({
    user,
    action: "UPDATE",
    entityType: "SupplierLot",
    entityId: params.id,
    details: { before: { qualityGrade: lot.qualityGrade, notes: lot.notes }, after: updateData },
  });

  return jsonResponse(updated);
}
