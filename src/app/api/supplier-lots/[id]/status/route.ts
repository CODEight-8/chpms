import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { canTransitionLot } from "@/lib/status-machines";
import { LotStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit-log";

export async function PATCH(
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
  const newStatus = body.status as LotStatus;

  if (!newStatus || !Object.values(LotStatus).includes(newStatus)) {
    return errorResponse("Invalid status");
  }

  if (!canTransitionLot(lot.status, newStatus)) {
    return errorResponse(
      `Cannot transition from ${lot.status} to ${newStatus}`
    );
  }

  // If marking as GOOD_TO_GO, quality grade must be set and not REJECT
  if (newStatus === "GOOD_TO_GO") {
    if (!lot.qualityGrade || lot.qualityGrade === "REJECT") {
      return errorResponse(
        "Quality grade must be A, B, or C to mark as Good to Go"
      );
    }
  }

  const updated = await prisma.supplierLot.update({
    where: { id: params.id },
    data: { status: newStatus },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  });

  await logAuditEvent({
    user,
    action: "STATUS_CHANGE",
    entityType: "SupplierLot",
    entityId: params.id,
    details: { lotNumber: lot.lotNumber, from: lot.status, to: newStatus },
  });

  return jsonResponse(updated);
}
