import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const [
    lotStatusCounts,
    batchStatusCounts,
    orderStatusCounts,
    supplierStats,
    clientStats,
    financialSummary,
    recentLots,
    recentBatches,
  ] = await Promise.all([
    // Lot status counts
    prisma.supplierLot.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Batch status counts
    prisma.productionBatch.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Order status counts
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // Top suppliers by volume
    prisma.supplier.findMany({
      where: { isActive: true },
      include: {
        lots: {
          select: {
            huskCount: true,
            qualityGrade: true,
            totalCost: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: 10,
    }),

    // Top clients by order value
    prisma.client.findMany({
      where: { isActive: true },
      include: {
        orders: {
          where: { status: { not: "CANCELLED" } },
          include: {
            items: {
              select: { quantityOrdered: true, unitPrice: true },
            },
          },
        },
        payments: {
          select: { amount: true },
        },
      },
      orderBy: { name: "asc" },
      take: 10,
    }),

    // Financial totals
    Promise.all([
      prisma.supplierLot.aggregate({ _sum: { totalCost: true } }),
      prisma.supplierPayment.aggregate({ _sum: { amount: true } }),
      prisma.clientPayment.aggregate({ _sum: { amount: true } }),
    ]),

    // Recent lots
    prisma.supplierLot.findMany({
      include: {
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Recent batches
    prisma.productionBatch.findMany({
      include: {
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Process lot counts
  const lotCounts: Record<string, number> = {};
  for (const c of lotStatusCounts) lotCounts[c.status] = c._count.id;

  // Process batch counts
  const batchCounts: Record<string, number> = {};
  for (const c of batchStatusCounts) batchCounts[c.status] = c._count.id;

  // Process order counts
  const orderCounts: Record<string, number> = {};
  for (const c of orderStatusCounts) orderCounts[c.status] = c._count.id;

  // Process supplier rankings
  const supplierRankings = supplierStats
    .map((s) => {
      const totalLots = s.lots.length;
      const totalHusks = s.lots.reduce((sum, l) => sum + l.huskCount, 0);
      const rejections = s.lots.filter(
        (l) => l.qualityGrade === "REJECT"
      ).length;

      return {
        id: s.id,
        name: s.name,
        totalLots,
        totalHusks,
        rejectionRate: totalLots > 0 ? (rejections / totalLots) * 100 : 0,
        totalSpend: s.lots.reduce((sum, l) => sum + Number(l.totalCost), 0),
      };
    })
    .sort((a, b) => b.totalHusks - a.totalHusks);

  // Process client rankings
  const clientRankings = clientStats
    .map((c) => {
      const totalRevenue = c.orders.reduce(
        (sum, o) =>
          sum +
          o.items.reduce(
            (s, i) => s + Number(i.quantityOrdered) * Number(i.unitPrice),
            0
          ),
        0
      );
      const totalPaid = c.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      return {
        id: c.id,
        name: c.name,
        totalOrders: c.orders.length,
        totalRevenue,
        totalPaid,
        outstanding: totalRevenue - totalPaid,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Financial
  const [lotCostAgg, supplierPaidAgg, clientPaidAgg] = financialSummary;
  const totalProcurement = Number(lotCostAgg._sum.totalCost || 0);
  const totalPaidSuppliers = Number(supplierPaidAgg._sum.amount || 0);
  const totalReceived = Number(clientPaidAgg._sum.amount || 0);

  // Calculate total order value for receivable
  const orderItemsAll = await prisma.orderItem.findMany({
    where: { order: { status: { not: "CANCELLED" } } },
    select: { quantityOrdered: true, unitPrice: true },
  });
  const totalReceivable = orderItemsAll.reduce(
    (sum, i) => sum + Number(i.quantityOrdered) * Number(i.unitPrice),
    0
  );

  return {
    kpis: {
      lotsInAudit: lotCounts["AUDIT"] || 0,
      lotsGoodToGo: lotCounts["GOOD_TO_GO"] || 0,
      batchesInProgress: batchCounts["IN_PROGRESS"] || 0,
      batchesCompleted: batchCounts["COMPLETED"] || 0,
      pendingOrders: orderCounts["PENDING"] || 0,
      confirmedOrders: orderCounts["CONFIRMED"] || 0,
    },
    financial: {
      totalProcurement,
      totalPaidSuppliers,
      outstandingPayable: totalProcurement - totalPaidSuppliers,
      totalRevenue: totalReceivable,
      totalReceived,
      outstandingReceivable: totalReceivable - totalReceived,
      grossProfit: totalReceived - totalPaidSuppliers,
    },
    supplierRankings,
    clientRankings,
    recentLots,
    recentBatches,
  };
}
