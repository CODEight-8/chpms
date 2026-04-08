import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getSupplierWithStats } from "@/lib/queries/suppliers";
import { logAuditEvent } from "@/lib/audit-log";
import { hasStructuredSupplierBankDetails } from "@/lib/bank-details";

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

  try {
    const body = await request.json();
    const parsed = supplierSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message);
    }

    const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse("Supplier not found", 404);

    const {
      bankName,
      branchName,
      accountNumber,
      ...supplierData
    } = parsed.data;

    if (supplierData.name.trim() !== existing.name.trim()) {
      return errorResponse("Supplier name cannot be changed after creation.", 400);
    }

    const hasSubmittedBankDetails = hasStructuredSupplierBankDetails({
      bankName,
      branchName,
      accountNumber,
    });
    const hasExistingStructuredBankDetails = hasStructuredSupplierBankDetails({
      bankName: existing.bankName || "",
      branchName: existing.branchName || "",
      accountNumber: existing.accountNumber || "",
    });

    const bankData = hasSubmittedBankDetails
      ? {
          bankName,
          branchName,
          accountNumber,
        }
      : hasExistingStructuredBankDetails
        ? {
            bankName: null,
            branchName: null,
            accountNumber: null,
          }
        : {};

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        ...supplierData,
        ...bankData,
      },
    });

    logAuditEvent({
      user,
      action: "UPDATE",
      entityType: "Supplier",
      entityId: params.id,
      details: { before: existing, after: supplier },
    });

    return jsonResponse(supplier);
  } catch (err) {
    console.error("Failed to update supplier", err);
    return errorResponse(getSupplierWriteErrorMessage(err), 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth("suppliers", "delete");
  if (error || !user) return error!;

  const existing = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!existing) return errorResponse("Supplier not found", 404);

  if (!existing.isActive) {
    return errorResponse("Supplier is already inactive");
  }

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
