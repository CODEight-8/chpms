import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getClientWithStats } from "@/lib/queries/clients";

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
  const { error } = await requireAuth("clients", "edit");
  if (error) return error;

  const body = await request.json();
  const parsed = clientSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const client = await prisma.client.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return jsonResponse(client);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("clients", "delete");
  if (error) return error;

  const client = await prisma.client.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return jsonResponse(client);
}
