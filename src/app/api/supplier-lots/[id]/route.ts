import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getLotDetail } from "@/lib/queries/supplier-lots";

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
  const { error } = await requireAuth("supplier-lots", "edit");
  if (error) return error;

  const lot = await prisma.supplierLot.findUnique({
    where: { id: params.id },
  });
  if (!lot) return errorResponse("Lot not found", 404);

  const body = await request.json();

  // Only allow editing certain fields, and only in AUDIT status for grade
  const updateData: Record<string, unknown> = {};

  if (body.notes !== undefined) updateData.notes = body.notes;

  if (body.qualityGrade !== undefined && lot.status === "AUDIT") {
    if (!["A", "B", "C", "REJECT"].includes(body.qualityGrade)) {
      return errorResponse("Invalid quality grade");
    }
    updateData.qualityGrade = body.qualityGrade;
  }

  const updated = await prisma.supplierLot.update({
    where: { id: params.id },
    data: updateData,
    include: {
      supplier: { select: { id: true, name: true } },
    },
  });

  return jsonResponse(updated);
}
