import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  return NextResponse.json({
    totalProcurement,
    totalPaidSuppliers,
    outstandingPayable: totalProcurement - totalPaidSuppliers,
    totalRevenue,
    totalReceived,
    outstandingReceivable: totalRevenue - totalReceived,
    grossProfit: totalReceived - totalPaidSuppliers,
  });
}
