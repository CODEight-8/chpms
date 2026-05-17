import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { miscTransactionSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { generateMiscReceiptNumber } from "@/lib/id-generators";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("accounts", "view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const directionParam = searchParams.get("direction");
  const search = searchParams.get("search") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const method = searchParams.get("method") || undefined;

  const where: Prisma.MiscTransactionWhereInput = {};
  if (directionParam === "IN" || directionParam === "OUT") {
    where.direction = directionParam;
  } else if (directionParam) {
    return errorResponse("Direction must be IN or OUT");
  }

  if (method && ["CASH", "BANK", "CHEQUE"].includes(method)) {
    where.paymentMethod = method as "CASH" | "BANK" | "CHEQUE";
  }

  if (dateFrom || dateTo) {
    where.transactionDate = {};
    if (dateFrom) where.transactionDate.gte = new Date(dateFrom);
    if (dateTo) where.transactionDate.lte = new Date(dateTo);
  }

  if (search) {
    where.OR = [
      { category: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { reference: { contains: search, mode: "insensitive" } },
      { receiptNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const transactions = await prisma.miscTransaction.findMany({
    where,
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });

  return jsonResponse(transactions);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("accounts", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = miscTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const receiptNumber = await generateMiscReceiptNumber(parsed.data.direction);

  const transaction = await prisma.miscTransaction.create({
    data: {
      receiptNumber,
      direction: parsed.data.direction,
      category: parsed.data.category.trim(),
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      transactionDate: new Date(parsed.data.transactionDate),
      description: parsed.data.description.trim(),
      reference: parsed.data.reference?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      createdByUserId: user.id,
    },
  });

  logAuditEvent({
    user,
    action: "PAYMENT",
    entityType: "MiscTransaction",
    entityId: transaction.id,
    details: {
      receiptNumber,
      direction: transaction.direction,
      category: transaction.category,
      amount: parsed.data.amount,
    },
  });

  return jsonResponse(transaction, 201);
}
