import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("suppliers", "edit");
  if (error || !user) return error!;

  const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!existing) return errorResponse("Supplier not found", 404);

  if (existing.isActive) {
    return errorResponse("Supplier is already active");
  }

  await prisma.supplier.update({
    where: { id: params.id },
    data: { isActive: true },
  });

  logAuditEvent({
    user,
    action: "UPDATE",
    entityType: "Supplier",
    entityId: params.id,
    details: { name: existing.name, action: "reactivated" },
  });

  return jsonResponse({ success: true });
}
