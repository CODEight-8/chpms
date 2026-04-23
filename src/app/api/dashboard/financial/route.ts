import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  // Financial dashboard is restricted to OWNER only, beyond the generic
  // "dashboard:view" permission, because it exposes sensitive financial data.
  const { user, error } = await requireAuth();
  if (error || !user) return error!;

  if (user.role !== "OWNER") {
    return errorResponse("Forbidden", 403);
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Build date filters
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (fromParam) dateFilter.gte = new Date(fromParam);
  if (toParam) {
    const toDate = new Date(toParam);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.lte = toDate;
  }

  const hasDateFilter = Object.keys(dateFilter).length > 0;
  const lotDateWhere = hasDateFilter ? { dateReceived: dateFilter } : {};
  const supplierPayWhere = hasDateFilter ? { paymentDate: dateFilter } : {};
  const clientPayWhere = hasDateFilter ? { paymentDate: dateFilter } : {};
  const orderDateWhere = hasDateFilter ? { orderDate: dateFilter } : {};

  const [lotCostAgg, supplierPaidAgg, clientPaidAgg, orderItems] =
    await Promise.all([
      prisma.supplierLot.aggregate({
        _sum: { totalCost: true },
        where: lotDateWhere,
      }),
      prisma.supplierPayment.aggregate({
        _sum: { amount: true },
        where: supplierPayWhere,
      }),
      prisma.clientPayment.aggregate({
        _sum: { amount: true },
        where: clientPayWhere,
      }),
      prisma.orderItem.findMany({
        where: {
          order: { status: { not: "CANCELLED" }, ...orderDateWhere },
        },
        select: { quantityOrdered: true, unitPrice: true },
      }),
    ]);

  const totalProcurement = Number(lotCostAgg._sum.totalCost || 0);
  const totalPaidSuppliers = Number(supplierPaidAgg._sum.amount || 0);
  const totalReceived = Number(clientPaidAgg._sum.amount || 0);
  const totalRevenue = orderItems.reduce(
    (sum, i) => sum + Number(i.quantityOrdered) * Number(i.unitPrice),
    0
  );

  return jsonResponse({
    totalProcurement,
    totalPaidSuppliers,
    outstandingPayable: totalProcurement - totalPaidSuppliers,
    totalRevenue,
    totalReceived,
    outstandingReceivable: totalRevenue - totalReceived,
    grossProfit: totalReceived - totalPaidSuppliers,
  });
}
