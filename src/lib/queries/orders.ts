import { prisma } from "@/lib/prisma";
import { OrderStatus, Prisma } from "@prisma/client";

interface OrderFilters {
  status?: OrderStatus;
  clientId?: string;
  search?: string;
}

interface PageOpts {
  skip?: number;
  take?: number;
}

export async function getOrdersWithDetails(
  filters?: OrderFilters,
  page?: PageOpts
) {
  const where: Prisma.OrderWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters?.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      {
        client: {
          name: { contains: filters.search, mode: "insensitive" },
        },
      },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        items: {
          include: {
            product: { select: { name: true, unit: true } },
          },
        },
        paymentAllocations: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: page?.skip,
      take: page?.take,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    rows: orders.map((order) => {
      const totalValue = order.items.reduce(
        (sum, i) => sum + Number(i.quantityOrdered) * Number(i.unitPrice),
        0
      );
      const totalPaid = order.paymentAllocations.reduce(
        (sum, a) => sum + Number(a.amount),
        0
      );
      const paymentStatus = derivePaymentStatus(totalValue, totalPaid);
      return {
        ...order,
        totalValue,
        totalPaid,
        paymentStatus,
        itemCount: order.items.length,
      };
    }),
    total,
  };
}

export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";

function derivePaymentStatus(
  totalValue: number,
  totalPaid: number
): PaymentStatus {
  // 1-cent tolerance to absorb LKR floating-point rounding when allocations
  // sum to ~totalValue but not exactly.
  if (totalPaid + 0.01 >= totalValue && totalValue > 0) return "PAID";
  if (totalPaid > 0) return "PARTIAL";
  return "UNPAID";
}

export async function getOrderDetail(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      items: {
        include: {
          product: { select: { id: true, name: true, unit: true } },
          fulfillments: {
            include: {
              productionBatch: {
                select: {
                  id: true,
                  batchNumber: true,
                  status: true,
                  totalRawCost: true,
                  additionalCost: true,
                  outputQuantity: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      // Allocations are the source of truth for "money received against this
      // order". Each links back to its parent ClientPayment for the
      // payment-history table on the order detail page.
      paymentAllocations: {
        include: {
          clientPayment: {
            select: {
              id: true,
              receiptNumber: true,
              paymentDate: true,
              paymentMethod: true,
              reference: true,
              amount: true,
            },
          },
        },
        orderBy: { clientPayment: { paymentDate: "desc" } },
      },
    },
  });

  if (!order) return null;

  const totalValue = order.items.reduce(
    (sum, i) => sum + Number(i.quantityOrdered) * Number(i.unitPrice),
    0
  );
  const totalPaid = order.paymentAllocations.reduce(
    (sum, a) => sum + Number(a.amount),
    0
  );

  const totalProductionCost = order.items.reduce(
    (sum, item) =>
      sum +
      item.fulfillments.reduce((fSum, f) => {
        const output = Number(f.productionBatch.outputQuantity);
        if (!output || output <= 0) return fSum;
        // True production cost = raw husks + operating extras captured at
        // completion (labor, electricity, fuel, packaging).
        const batchTotal =
          Number(f.productionBatch.totalRawCost) +
          Number(f.productionBatch.additionalCost ?? 0);
        return (
          fSum +
          (Number(f.quantityFulfilled) / output) * batchTotal
        );
      }, 0),
    0
  );

  return {
    ...order,
    totalValue,
    totalPaid,
    outstandingBalance: totalValue - totalPaid,
    totalProductionCost,
  };
}

export async function getOrderStatusCounts() {
  const counts = await prisma.order.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const result: Record<string, number> = {
    CONFIRMED: 0,
    FULFILLED: 0,
    DISPATCHED: 0,
    CANCELLED: 0,
  };

  for (const c of counts) {
    result[c.status] = c._count.id;
  }

  return result;
}
