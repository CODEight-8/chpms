import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneWeekFromNow = new Date(today);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  const [
    lotStatusCounts,
    batchStatusCounts,
    overdueOrders,
    closeToOverdueOrders,
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

    // Overdue orders: expected delivery passed, still not dispatched/cancelled
    prisma.order.findMany({
      where: {
        expectedDelivery: { lt: today },
        status: { in: ["CONFIRMED", "FULFILLED"] },
      },
      include: {
        client: { select: { id: true, name: true } },
        items: {
          select: {
            quantityOrdered: true,
            quantityFulfilled: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { expectedDelivery: "asc" },
    }),

    // Close-to-overdue: expected delivery within next 7 days
    prisma.order.findMany({
      where: {
        expectedDelivery: { gte: today, lte: oneWeekFromNow },
        status: { in: ["CONFIRMED", "FULFILLED"] },
      },
      include: {
        client: { select: { id: true, name: true } },
        items: {
          select: {
            quantityOrdered: true,
            quantityFulfilled: true,
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { expectedDelivery: "asc" },
    }),

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

  return {
    kpis: {
      lotsInAudit: lotCounts["AUDIT"] || 0,
      lotsGoodToGo: lotCounts["GOOD_TO_GO"] || 0,
      batchesInProgress: batchCounts["IN_PROGRESS"] || 0,
      batchesCompleted: batchCounts["COMPLETED"] || 0,
      overdueOrders: overdueOrders.length,
      closeToOverdueOrders: closeToOverdueOrders.length,
    },
    overdueOrders,
    closeToOverdueOrders,
    recentLots,
    recentBatches,
  };
}
