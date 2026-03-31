import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getSupplierWithStats } from "@/lib/queries/suppliers";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("suppliers", "view");
  if (error) return error;

  const supplier = await getSupplierWithStats(params.id);
  if (!supplier) return errorResponse("Supplier not found", 404);

  return jsonResponse(supplier);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("suppliers", "edit");
  if (error) return error;

  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return jsonResponse(supplier);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("suppliers", "delete");
  if (error) return error;

  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return jsonResponse(supplier);
}
