import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("users", "edit");
  if (error || !user) return error!;

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return errorResponse("User not found", 404);

  if (existing.isActive) {
    return errorResponse("User is already active");
  }

  // Only one OWNER allowed
  if (existing.role === "OWNER") {
    const ownerCount = await prisma.user.count({
      where: { role: "OWNER", isActive: true },
    });
    if (ownerCount > 0) {
      return errorResponse("Cannot reactivate: only one active owner is allowed");
    }
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { isActive: true },
  });

  logAuditEvent({
    user,
    action: "UPDATE",
    entityType: "User",
    entityId: params.id,
    details: { name: existing.name, action: "reactivated" },
  });

  return jsonResponse({ success: true });
}
