import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getSuppliersWithStats } from "@/lib/queries/suppliers";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("suppliers", "view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const activeParam = searchParams.get("active");
  const active =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  const suppliers = await getSuppliersWithStats({ search, active });
  return jsonResponse(suppliers);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("suppliers", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const supplier = await prisma.supplier.create({
    data: parsed.data,
  });

  logAuditEvent({
    user,
    action: "CREATE",
    entityType: "Supplier",
    entityId: supplier.id,
    details: { name: supplier.name },
  });

  return jsonResponse(supplier, 201);
}
