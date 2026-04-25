import { prisma } from "@/lib/prisma";
import { OrderStatus, Prisma } from "@prisma/client";

interface OrderFilters {
  status?: OrderStatus;
  clientId?: string;
  search?: string;
}

export async function getOrdersWithDetails(filters?: OrderFilters) {
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

  const orders = await prisma.order.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      items: {
        include: {
          product: { select: { name: true, unit: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => ({
    ...order,
    totalValue: order.items.reduce(
      (sum, i) => sum + Number(i.quantityOrdered) * Number(i.unitPrice),
      0
    ),
    itemCount: order.items.length,
  }));
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
                  outputQuantity: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!order) return null;

  const totalValue = order.items.reduce(
    (sum, i) => sum + Number(i.quantityOrdered) * Number(i.unitPrice),
    0
  );
  const totalPaid = order.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const totalProductionCost = order.items.reduce(
    (sum, item) =>
      sum +
      item.fulfillments.reduce((fSum, f) => {
        const output = Number(f.productionBatch.outputQuantity) || 1;
        return (
          fSum +
          (Number(f.quantityFulfilled) / output) *
            Number(f.productionBatch.totalRawCost)
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
