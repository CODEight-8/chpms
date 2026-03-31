import { prisma } from "@/lib/prisma";
import { LotStatus, Prisma } from "@prisma/client";
import { calculateBatchAging } from "@/lib/aging";

interface LotFilters {
  status?: LotStatus;
  supplierId?: string;
  search?: string;
}

export async function getLotsWithAging(filters?: LotFilters) {
  const where: Prisma.SupplierLotWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.supplierId) {
    where.supplierId = filters.supplierId;
  }

  if (filters?.search) {
    where.OR = [
      { lotNumber: { contains: filters.search, mode: "insensitive" } },
      { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
      {
        supplier: {
          name: { contains: filters.search, mode: "insensitive" },
        },
      },
    ];
  }

  const lots = await prisma.supplierLot.findMany({
    where,
    include: {
      supplier: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return lots.map((lot) => ({
    ...lot,
    batchAging: calculateBatchAging(lot.harvestDate),
  }));
}

export async function getLotDetail(id: string) {
  const lot = await prisma.supplierLot.findUnique({
    where: { id },
    include: {
      supplier: true,
      productionBatchLots: {
        include: {
          productionBatch: {
            select: {
              id: true,
              batchNumber: true,
              status: true,
              startedAt: true,
            },
          },
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!lot) return null;

  return {
    ...lot,
    batchAging: calculateBatchAging(lot.harvestDate),
  };
}

export async function getLotStatusCounts() {
  const counts = await prisma.supplierLot.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const result: Record<string, number> = {
    AUDIT: 0,
    GOOD_TO_GO: 0,
    ALLOCATED: 0,
    CONSUMED: 0,
    REJECTED: 0,
  };

  for (const c of counts) {
    result[c.status] = c._count.id;
  }

  return result;
}
