import { prisma } from "@/lib/prisma";
import { BatchStatus, Prisma } from "@prisma/client";

interface BatchFilters {
  status?: BatchStatus;
  search?: string;
  chipSize?: string;
}

interface PageOpts {
  skip?: number;
  take?: number;
}

export async function getBatchesWithDetails(
  filters?: BatchFilters,
  page?: PageOpts
) {
  const where: Prisma.ProductionBatchWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.chipSize) {
    where.chipSize = filters.chipSize;
  }

  if (filters?.search) {
    where.OR = [
      { batchNumber: { contains: filters.search, mode: "insensitive" } },
      {
        product: {
          name: { contains: filters.search, mode: "insensitive" },
        },
      },
    ];
  }

  const [batches, total] = await Promise.all([
    prisma.productionBatch.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, unit: true } },
        batchLots: {
          include: {
            supplierLot: {
              select: {
                id: true,
                lotNumber: true,
                invoiceNumber: true,
                huskCount: true,
                qualityGrade: true,
                perHuskRate: true,
                supplier: { select: { id: true, name: true } },
              },
            },
          },
        },
        fulfillments: {
          select: { quantityFulfilled: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: page?.skip,
      take: page?.take,
    }),
    prisma.productionBatch.count({ where }),
  ]);

  return {
    rows: batches.map((batch) => {
      const fulfilledQuantity = batch.fulfillments.reduce(
        (sum, f) => sum + Number(f.quantityFulfilled),
        0
      );
      const output = Number(batch.outputQuantity || 0);
      const availableQuantity = Math.max(output - fulfilledQuantity, 0);

      return {
        ...batch,
        totalInputHusks: batch.batchLots.reduce(
          (sum, bl) => sum + bl.quantityUsed,
          0
        ),
        lotCount: batch.batchLots.length,
        fulfillmentCount: batch.fulfillments.length,
        fulfilledQuantity,
        availableQuantity,
      };
    }),
    total,
  };
}

export async function getBatchDetail(id: string) {
  const batch = await prisma.productionBatch.findUnique({
    where: { id },
    include: {
      product: true,
      batchLots: {
        include: {
          supplierLot: {
            include: {
              supplier: { select: { id: true, name: true } },
            },
          },
        },
      },
      fulfillments: {
        include: {
          orderItem: {
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  status: true,
                  client: { select: { id: true, name: true } },
                },
              },
              product: { select: { name: true } },
            },
          },
        },
      },
      // Misc transactions auto-created from this batch (currently just the
      // additional-cost OUT entry, if any). Surfaced on the detail page.
      miscTransactions: {
        select: {
          id: true,
          receiptNumber: true,
          direction: true,
          amount: true,
          transactionDate: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!batch) return null;

  return {
    ...batch,
    totalInputHusks: batch.batchLots.reduce(
      (sum, bl) => sum + bl.quantityUsed,
      0
    ),
  };
}

export async function getBatchStatusCounts() {
  const counts = await prisma.productionBatch.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const result: Record<string, number> = {
    IN_PROGRESS: 0,
    COMPLETED: 0,
  };

  for (const c of counts) {
    result[c.status] = c._count.id;
  }

  return result;
}

export async function getBatchOutputSummary() {
  const totals = await prisma.productionBatch.aggregate({
    where: { status: "COMPLETED" },
    _sum: {
      outputQuantity: true,
      availableOutput: true,
    },
  });

  return {
    totalOutput: Number(totals._sum.outputQuantity ?? 0),
    availableOutput: Number(totals._sum.availableOutput ?? 0),
    outputUnit: "kg",
  };
}

export async function getAvailableLots() {
  return prisma.supplierLot.findMany({
    where: {
      status: { in: ["GOOD_TO_GO", "ALLOCATED"] },
      availableHusks: { gt: 0 },
    },
    include: {
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}
