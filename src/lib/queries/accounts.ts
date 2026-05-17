import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface PaymentFilters {
  search?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getSupplierPayments(filters?: PaymentFilters) {
  const where: Prisma.SupplierPaymentWhereInput = {};

  if (filters?.method) {
    where.paymentMethod = filters.method as Prisma.EnumPaymentMethodFilter;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.paymentDate = {};
    if (filters.dateFrom) where.paymentDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.paymentDate.lte = new Date(filters.dateTo);
  }
  if (filters?.search) {
    where.OR = [
      { supplier: { name: { contains: filters.search, mode: "insensitive" } } },
      { reference: { contains: filters.search, mode: "insensitive" } },
      { receiptNumber: { contains: filters.search, mode: "insensitive" } },
      { supplierLot: { invoiceNumber: { contains: filters.search, mode: "insensitive" } } },
      {
        allocations: {
          some: {
            supplierLot: {
              invoiceNumber: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  return prisma.supplierPayment.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true } },
      supplierLot: {
        select: { lotNumber: true, invoiceNumber: true },
      },
      allocations: {
        include: {
          supplierLot: {
            select: { id: true, lotNumber: true, invoiceNumber: true },
          },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  });
}

export async function getClientPayments(filters?: PaymentFilters) {
  const where: Prisma.ClientPaymentWhereInput = {};

  if (filters?.method) {
    where.paymentMethod = filters.method as Prisma.EnumPaymentMethodFilter;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.paymentDate = {};
    if (filters.dateFrom) where.paymentDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.paymentDate.lte = new Date(filters.dateTo);
  }
  if (filters?.search) {
    where.OR = [
      { client: { name: { contains: filters.search, mode: "insensitive" } } },
      { reference: { contains: filters.search, mode: "insensitive" } },
      { receiptNumber: { contains: filters.search, mode: "insensitive" } },
      { order: { orderNumber: { contains: filters.search, mode: "insensitive" } } },
      { order: { invoiceNumber: { contains: filters.search, mode: "insensitive" } } },
      {
        allocations: {
          some: {
            order: {
              OR: [
                {
                  orderNumber: {
                    contains: filters.search,
                    mode: "insensitive",
                  },
                },
                {
                  invoiceNumber: {
                    contains: filters.search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      },
    ];
  }

  return prisma.clientPayment.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      order: { select: { orderNumber: true, invoiceNumber: true } },
      allocations: {
        include: {
          order: {
            select: { id: true, orderNumber: true, invoiceNumber: true },
          },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  });
}

export async function getMiscTransactions(filters?: PaymentFilters & {
  direction?: "IN" | "OUT";
}) {
  const where: Prisma.MiscTransactionWhereInput = {};

  if (filters?.direction) where.direction = filters.direction;
  if (filters?.method) {
    where.paymentMethod = filters.method as Prisma.EnumPaymentMethodFilter;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.transactionDate = {};
    if (filters.dateFrom) where.transactionDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.transactionDate.lte = new Date(filters.dateTo);
  }
  if (filters?.search) {
    where.OR = [
      { category: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { reference: { contains: filters.search, mode: "insensitive" } },
      { receiptNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.miscTransaction.findMany({
    where,
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAccountsSummary() {
  const [
    totalPayable,
    totalPaidSuppliers,
    orderItems,
    totalReceivedClients,
    miscByDirection,
  ] = await Promise.all([
    prisma.supplierLot.aggregate({ _sum: { totalCost: true } }),
    prisma.supplierPayment.aggregate({ _sum: { amount: true } }),
    prisma.orderItem.findMany({
      where: { order: { status: { not: "CANCELLED" } } },
      select: { quantityOrdered: true, unitPrice: true },
    }),
    prisma.clientPayment.aggregate({ _sum: { amount: true } }),
    prisma.miscTransaction.groupBy({
      by: ["direction"],
      _sum: { amount: true },
    }),
  ]);

  const totalReceivable = orderItems.reduce(
    (sum, i) => sum + Number(i.quantityOrdered) * Number(i.unitPrice),
    0
  );

  const payable = Number(totalPayable._sum.totalCost || 0);
  const paidOut = Number(totalPaidSuppliers._sum.amount || 0);
  const received = Number(totalReceivedClients._sum.amount || 0);

  const miscIn = Number(
    miscByDirection.find((m) => m.direction === "IN")?._sum.amount ?? 0
  );
  const miscOut = Number(
    miscByDirection.find((m) => m.direction === "OUT")?._sum.amount ?? 0
  );

  const totalIn = received + miscIn;
  const totalOut = paidOut + miscOut;

  return {
    totalPayable: payable,
    totalPaidToSuppliers: paidOut,
    outstandingPayable: payable - paidOut,
    totalReceivable,
    totalReceivedFromClients: received,
    outstandingReceivable: totalReceivable - received,
    totalMiscIn: miscIn,
    totalMiscOut: miscOut,
    totalIn,
    totalOut,
    // Net cash flow now folds in misc transactions: every inflow vs every
    // outflow regardless of source. Outstanding receivable/payable are NOT
    // included here — they're not yet cash.
    netBalance: totalIn - totalOut,
  };
}

export async function getOutstandingSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    include: {
      lots: { select: { totalCost: true } },
      payments: { select: { amount: true } },
    },
  });

  return suppliers
    .map((s) => {
      const totalOwed = s.lots.reduce((sum, l) => sum + Number(l.totalCost), 0);
      const totalPaid = s.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        id: s.id,
        name: s.name,
        totalOwed,
        totalPaid,
        outstanding: totalOwed - totalPaid,
      };
    })
    .filter((s) => s.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export async function getOutstandingClients() {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    include: {
      orders: {
        where: { status: { not: "CANCELLED" } },
        include: {
          items: { select: { quantityOrdered: true, unitPrice: true } },
        },
      },
      payments: { select: { amount: true } },
    },
  });

  return clients
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
      const totalReceived = c.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      return {
        id: c.id,
        name: c.name,
        totalRevenue,
        totalReceived,
        outstanding: totalRevenue - totalReceived,
      };
    })
    .filter((c) => c.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

export async function getSupplierPaymentDetail(id: string) {
  const payment = await prisma.supplierPayment.findUnique({
    where: { id },
    include: {
      supplier: true,
      // Legacy single-FK lot kept for the single-allocation receipt layout.
      supplierLot: {
        select: {
          id: true,
          lotNumber: true,
          invoiceNumber: true,
          totalCost: true,
          huskCount: true,
          perHuskRate: true,
        },
      },
      // Source of truth for "this payment was applied to these lots, in these
      // amounts". Multi-lot payments render one row per allocation; single-lot
      // payments still render as before (allocations has one row matching the
      // legacy supplierLot).
      allocations: {
        include: {
          supplierLot: {
            select: {
              id: true,
              lotNumber: true,
              invoiceNumber: true,
              totalCost: true,
            },
          },
        },
      },
    },
  });

  if (!payment) return null;

  // Per-lot balance summary across every allocation on this payment. For each
  // lot touched here we surface: lot total, total paid to-date (across all
  // payments via allocations), this allocation's amount, and remaining.
  const lotIds = payment.allocations.map((a) => a.supplierLotId);
  const lotTotals = lotIds.length
    ? await prisma.supplierPaymentAllocation.groupBy({
        by: ["supplierLotId"],
        where: { supplierLotId: { in: lotIds } },
        _sum: { amount: true },
      })
    : [];
  const paidByLot = new Map(
    lotTotals.map((t) => [t.supplierLotId, Number(t._sum.amount ?? 0)])
  );

  const allocationSummaries = payment.allocations.map((a) => {
    const lotTotal = Number(a.supplierLot.totalCost);
    const lotTotalPaid = paidByLot.get(a.supplierLotId) ?? 0;
    return {
      id: a.id,
      lot: a.supplierLot,
      thisAllocation: Number(a.amount),
      lotTotal,
      lotTotalPaid,
      lotRemaining: lotTotal - lotTotalPaid,
    };
  });

  // For the single-allocation layout: keep the legacy fields exactly as they
  // were so the existing receipt template renders unchanged.
  const single = allocationSummaries.length === 1 ? allocationSummaries[0] : null;

  return {
    ...payment,
    allocationSummaries,
    // Legacy single-allocation fields (used when allocationSummaries.length === 1).
    lotTotalPaid: single?.lotTotalPaid ?? 0,
    previouslyPaid: single ? single.lotTotalPaid - single.thisAllocation : 0,
    remainingBalance: single ? single.lotRemaining : null,
  };
}

export async function getClientPaymentDetail(id: string) {
  const payment = await prisma.clientPayment.findUnique({
    where: { id },
    include: {
      client: true,
      // Legacy single-FK order kept for the single-allocation receipt layout.
      order: {
        include: {
          items: {
            select: {
              quantityOrdered: true,
              unitPrice: true,
              product: { select: { name: true, unit: true } },
            },
          },
        },
      },
      // Source of truth for multi-order receipts.
      allocations: {
        include: {
          order: {
            include: {
              items: {
                select: { quantityOrdered: true, unitPrice: true },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) return null;

  // Per-order balance summary across every allocation on this payment.
  const orderIds = payment.allocations.map((a) => a.orderId);
  const orderTotalsPaid = orderIds.length
    ? await prisma.clientPaymentAllocation.groupBy({
        by: ["orderId"],
        where: { orderId: { in: orderIds } },
        _sum: { amount: true },
      })
    : [];
  const paidByOrder = new Map(
    orderTotalsPaid.map((t) => [t.orderId, Number(t._sum.amount ?? 0)])
  );

  const allocationSummaries = payment.allocations.map((a) => {
    const orderTotal = a.order.items.reduce(
      (sum, item) =>
        sum + Number(item.quantityOrdered) * Number(item.unitPrice),
      0
    );
    const orderTotalPaid = paidByOrder.get(a.orderId) ?? 0;
    return {
      id: a.id,
      order: {
        id: a.order.id,
        orderNumber: a.order.orderNumber,
        invoiceNumber: a.order.invoiceNumber,
      },
      thisAllocation: Number(a.amount),
      orderTotal,
      orderTotalPaid,
      orderRemaining: orderTotal - orderTotalPaid,
    };
  });

  const single = allocationSummaries.length === 1 ? allocationSummaries[0] : null;

  // Legacy orderTotal calc kept for non-allocation single-FK fallbacks. With
  // the Phase 1 backfill, every payment has at least one allocation, so this
  // path is hit only by tests or imports that bypass allocations.
  const legacyOrderTotal = payment.order
    ? payment.order.items.reduce(
        (sum, i) => sum + Number(i.quantityOrdered) * Number(i.unitPrice),
        0
      )
    : null;

  return {
    ...payment,
    allocationSummaries,
    orderTotal: single?.orderTotal ?? legacyOrderTotal,
    orderTotalPaid: single?.orderTotalPaid ?? 0,
    previouslyPaid: single
      ? single.orderTotalPaid - single.thisAllocation
      : 0,
    remainingBalance: single ? single.orderRemaining : null,
  };
}
