import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getSuppliersWithStats } from "@/lib/queries/suppliers";
import { logAuditEvent } from "@/lib/audit-log";

function getSupplierWriteErrorMessage(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022"
  ) {
    return "Database schema is outdated. Run the latest Prisma migration and try again.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to save supplier";
}

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

  try {
    const body = await request.json();
    const parsed = supplierSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message);
    }

    const {
      bankName,
      branchName,
      accountNumber,
      ...supplierData
    } = parsed.data;

    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        name: {
          equals: supplierData.name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingSupplier) {
      return errorResponse(
        "A supplier with this name already exists. Use a different supplier name.",
        409
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        ...supplierData,
        bankName,
        branchName,
        accountNumber,
      },
    });

    logAuditEvent({
      user,
      action: "CREATE",
      entityType: "Supplier",
      entityId: supplier.id,
      details: { name: supplier.name },
    });

    return jsonResponse(supplier, 201);
  } catch (err) {
    console.error("Failed to create supplier", err);
    return errorResponse(getSupplierWriteErrorMessage(err), 500);
  }
}
