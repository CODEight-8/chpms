import { prisma } from "@/lib/prisma";

/**
 * Monthly throughput: husks received vs output produced
 * Returns last 6 months of data
 */
export async function getMonthlyThroughput() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [lots, batches] = await Promise.all([
    prisma.supplierLot.findMany({
      where: { dateReceived: { gte: sixMonthsAgo } },
      select: { dateReceived: true, huskCount: true },
    }),
    prisma.productionBatch.findMany({
      where: {
        completedAt: { not: null, gte: sixMonthsAgo },
        status: { in: ["COMPLETED", "DISPATCHED"] },
      },
      select: { completedAt: true, outputQuantity: true },
    }),
  ]);

  // Aggregate by month
  const months: Record<string, { husksReceived: number; outputProduced: number }> = {};

  // Initialize 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = { husksReceived: 0, outputProduced: 0 };
  }

  for (const lot of lots) {
    const d = new Date(lot.dateReceived);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) months[key].husksReceived += lot.huskCount;
  }

  for (const batch of batches) {
    if (!batch.completedAt) continue;
    const d = new Date(batch.completedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (months[key]) months[key].outputProduced += Number(batch.outputQuantity || 0);
  }

  return Object.entries(months).map(([month, data]) => ({
    month,
    label: new Date(month + "-01").toLocaleDateString("en-LK", {
      month: "short",
      year: "2-digit",
    }),
    ...data,
  }));
}

/**
 * Profitability per completed/dispatched batch
 */
export async function getBatchProfitability() {
  const batches = await prisma.productionBatch.findMany({
    where: { status: { in: ["COMPLETED", "DISPATCHED"] } },
    include: {
      product: { select: { name: true } },
      fulfillments: {
        include: {
          orderItem: { select: { unitPrice: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return batches.map((batch) => {
    const rawMaterialCost = Number(batch.totalRawCost);

    const revenue = batch.fulfillments.reduce(
      (sum: number, f: { quantityFulfilled: unknown; orderItem: { unitPrice: unknown } }) =>
        sum + Number(f.quantityFulfilled) * Number(f.orderItem.unitPrice),
      0
    );

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      product: batch.product.name,
      outputQuantity: Number(batch.outputQuantity || 0),
      outputUnit: batch.outputUnit || "kg",
      rawMaterialCost,
      revenue,
      profit: revenue - rawMaterialCost,
      margin: revenue > 0 ? ((revenue - rawMaterialCost) / revenue) * 100 : 0,
    };
  });
}

/**
 * Enhanced supplier rankings with price competitiveness and quality breakdown
 */
export async function getSupplierAnalytics() {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    include: {
      lots: {
        select: {
          huskCount: true,
          qualityGrade: true,
          totalCost: true,
          perHuskRate: true,
          status: true,
        },
      },
      payments: { select: { amount: true } },
    },
  });

  return suppliers
    .map((s) => {
      const totalLots = s.lots.length;
      if (totalLots === 0) return null;

      const totalHusks = s.lots.reduce((sum, l) => sum + l.huskCount, 0);
      const rejections = s.lots.filter((l) => l.qualityGrade === "REJECT").length;
      const gradeA = s.lots.filter((l) => l.qualityGrade === "A").length;
      const gradeB = s.lots.filter((l) => l.qualityGrade === "B").length;
      const gradeC = s.lots.filter((l) => l.qualityGrade === "C").length;
      const totalSpend = s.lots.reduce((sum, l) => sum + Number(l.totalCost), 0);
      const avgRate =
        s.lots.reduce((sum, l) => sum + Number(l.perHuskRate), 0) / totalLots;
      const totalPaid = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const rawRejectionRate = (rejections / totalLots) * 100;
      const rejectionRate = Math.min(Math.max(rawRejectionRate, 0), 100);

      return {
        id: s.id,
        name: s.name,
        totalLots,
        totalHusks,
        rejectionRate,
        gradeA,
        gradeB,
        gradeC,
        rejected: rejections,
        avgRate,
        totalSpend,
        totalPaid,
        outstanding: totalSpend - totalPaid,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.totalHusks - a!.totalHusks) as NonNullable<ReturnType<typeof Object.create>>[];
}

/**
 * Audit function to find problematic payments (overpayments, data anomalies)
 * Returns clients with overpayments >5% for manual review
 */
export async function getAbnormalPaymentAlerts() {
  const clientAnalytics = await getClientAnalytics();

  return clientAnalytics
    .filter((c) => c.isOverpaid)
    .map((c) => ({
      clientId: c.id,
      clientName: c.name,
      totalRevenue: c.totalRevenue,
      totalPaid: c.totalPaid,
      overpaymentAmount: c.totalPaid - c.totalRevenue,
      // Null when there is no revenue to compare against (any payment to a
      // client with zero revenue is by definition fully overpaid; expressing
      // it as a percentage is meaningless).
      percentageOverpaid:
        c.totalRevenue > 0
          ? ((c.totalPaid - c.totalRevenue) / c.totalRevenue) * 100
          : null,
      severity:
        c.totalRevenue === 0
          ? "CRITICAL"
          : c.totalPaid > c.totalRevenue * 1.5
            ? "CRITICAL"
            : c.totalPaid > c.totalRevenue * 1.2
              ? "HIGH"
              : "MEDIUM",
    }))
    .sort(
      (a, b) =>
        (b.percentageOverpaid ?? Number.POSITIVE_INFINITY) -
        (a.percentageOverpaid ?? Number.POSITIVE_INFINITY)
    );
}

/**
 * Enhanced client rankings with payment reliability and frequency
 */
export async function getClientAnalytics() {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    include: {
      orders: {
        where: { status: { not: "CANCELLED" } },
        include: {
          items: { select: { quantityOrdered: true, unitPrice: true } },
        },
      },
      payments: {
        select: { amount: true, paymentDate: true },
      },
    },
  });

  return clients
    .map((c) => {
      const totalOrders = c.orders.length;
      if (totalOrders === 0) return null;

      const totalRevenue = c.orders.reduce(
        (sum, o) =>
          sum +
          o.items.reduce(
            (s, i) => s + Number(i.quantityOrdered) * Number(i.unitPrice),
            0
          ),
        0
      );
      const totalPaid = c.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const outstanding = totalRevenue - totalPaid;
      const isOverpaid = totalPaid > totalRevenue * 1.05; // Flag if overpaid by >5%
      const paymentReliability = totalRevenue > 0
        ? Math.min((totalPaid / totalRevenue) * 100, 100) // Cap at 100%
        : 0;

      // Calculate order frequency (orders per month since first order)
      const orderDates = c.orders.map((o) => new Date(o.orderDate).getTime());
      const firstOrder = Math.min(...orderDates);
      const monthsActive = Math.max(
        1,
        (Date.now() - firstOrder) / (30 * 24 * 60 * 60 * 1000)
      );
      const orderFrequency = totalOrders / monthsActive;

      return {
        id: c.id,
        name: c.name,
        totalOrders,
        totalRevenue,
        totalPaid,
        outstanding,
        paymentReliability,
        orderFrequency,
        isOverpaid, // Flag for investigation
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.totalRevenue - a!.totalRevenue) as NonNullable<ReturnType<typeof Object.create>>[];
}
