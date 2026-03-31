import { prisma } from "@/lib/prisma";
import { BatchStatus, Prisma } from "@prisma/client";

interface BatchFilters {
  status?: BatchStatus;
  search?: string;
}

export async function getBatchesWithDetails(filters?: BatchFilters) {
  const where: Prisma.ProductionBatchWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
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

  const batches = await prisma.productionBatch.findMany({
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
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return batches.map((batch) => ({
    ...batch,
    totalInputHusks: batch.batchLots.reduce(
      (sum, bl) => sum + bl.quantityUsed,
      0
    ),
    lotCount: batch.batchLots.length,
    fulfillmentCount: batch.fulfillments.length,
  }));
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
    DISPATCHED: 0,
  };

  for (const c of counts) {
    result[c.status] = c._count.id;
  }

  return result;
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
