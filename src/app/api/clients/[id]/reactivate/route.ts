import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-log";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("clients", "edit");
  if (error || !user) return error!;

  const existing = await prisma.client.findUnique({ where: { id: params.id } });
  if (!existing) return errorResponse("Client not found", 404);

  if (existing.isActive) {
    return errorResponse("Client is already active");
  }

  await prisma.client.update({
    where: { id: params.id },
    data: { isActive: true },
  });

  logAuditEvent({
    user,
    action: "UPDATE",
    entityType: "Client",
    entityId: params.id,
    details: { name: existing.name, action: "reactivated" },
  });

  return jsonResponse({ success: true });
}
