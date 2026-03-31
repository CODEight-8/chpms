import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getClientsWithStats } from "@/lib/queries/clients";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("clients", "view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const activeParam = searchParams.get("active");
  const active =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const clients = await getClientsWithStats({ search, active });
  return jsonResponse(clients);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("clients", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = clientSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const client = await prisma.client.create({
    data: parsed.data,
  });

  logAuditEvent({
    user,
    action: "CREATE",
    entityType: "Client",
    entityId: client.id,
    details: { name: client.name },
  });

  return jsonResponse(client, 201);
}
