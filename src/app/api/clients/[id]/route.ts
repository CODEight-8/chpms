import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getClientWithStats } from "@/lib/queries/clients";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("clients", "view");
  if (error) return error;

  const client = await getClientWithStats(params.id);
  if (!client) return errorResponse("Client not found", 404);

  return jsonResponse(client);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("clients", "edit");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = clientSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const existing = await prisma.client.findUnique({ where: { id: params.id } });
  if (!existing) return errorResponse("Client not found", 404);

  if (parsed.data.name.trim() !== existing.name.trim()) {
    return errorResponse("Client name cannot be changed after creation.", 400);
  }

  const client = await prisma.client.update({
    where: { id: params.id },
    data: parsed.data,
  });

  logAuditEvent({
    user,
    action: "UPDATE",
    entityType: "Client",
    entityId: params.id,
    details: { before: existing, after: client },
  });

  return jsonResponse(client);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("clients", "delete");
  if (error || !user) return error!;

  const existing = await prisma.client.findUnique({ where: { id: params.id } });
  if (!existing) return errorResponse("Client not found", 404);

  if (!existing.isActive) {
    return errorResponse("Client is already inactive");
  }

  const client = await prisma.client.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  logAuditEvent({
    user,
    action: "DELETE",
    entityType: "Client",
    entityId: params.id,
    details: { name: client.name },
  });

  return jsonResponse(client);
}
