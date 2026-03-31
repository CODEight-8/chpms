import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getSupplierWithStats } from "@/lib/queries/suppliers";
import { logAuditEvent } from "@/lib/audit-log";

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
  const { user, error } = await requireAuth("suppliers", "edit");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!existing) return errorResponse("Supplier not found", 404);

  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: parsed.data,
  });

  logAuditEvent({
    user,
    action: "UPDATE",
    entityType: "Supplier",
    entityId: params.id,
    details: { before: existing, after: supplier },
  });

  return jsonResponse(supplier);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("suppliers", "delete");
  if (error || !user) return error!;

  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  logAuditEvent({
    user,
    action: "DELETE",
    entityType: "Supplier",
    entityId: params.id,
    details: { name: supplier.name },
  });

  return jsonResponse(supplier);
}
