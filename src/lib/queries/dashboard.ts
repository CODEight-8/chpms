import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const [
    lotStatusCounts,
    batchStatusCounts,
    orderStatusCounts,
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

  return {
    kpis: {
      lotsInAudit: lotCounts["AUDIT"] || 0,
      lotsGoodToGo: lotCounts["GOOD_TO_GO"] || 0,
      batchesInProgress: batchCounts["IN_PROGRESS"] || 0,
      batchesCompleted: batchCounts["COMPLETED"] || 0,
      pendingOrders: orderCounts["PENDING"] || 0,
      confirmedOrders: orderCounts["CONFIRMED"] || 0,
    },
    recentLots,
    recentBatches,
  };
}
