import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface SupplierFilters {
  search?: string;
  active?: boolean;
}

export async function getSuppliersWithStats(filters?: SupplierFilters) {
  const where: Prisma.SupplierWhereInput = {};

  if (filters?.active !== undefined) {
    where.isActive = filters.active;
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
      { location: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      lots: {
        select: {
          id: true,
          qualityGrade: true,
          totalCost: true,
          huskCount: true,
          status: true,
        },
      },
      payments: {
        select: {
          amount: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return suppliers.map((supplier) => {
    const totalLots = supplier.lots.length;
    const rejectedLots = supplier.lots.filter(
      (l) => l.qualityGrade === "REJECT"
    ).length;
    const totalOwed = supplier.lots.reduce(
      (sum, l) => sum + Number(l.totalCost),
      0
    );
    const totalPaid = supplier.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    const totalHusks = supplier.lots.reduce(
      (sum, l) => sum + l.huskCount,
      0
    );

    return {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      location: supplier.location,
      contactPerson: supplier.contactPerson,
      bankDetails: supplier.bankDetails,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      totalLots,
      totalHusks,
      rejectionRate: totalLots > 0 ? (rejectedLots / totalLots) * 100 : 0,
      totalOwed,
      totalPaid,
      outstandingBalance: totalOwed - totalPaid,
    };
  });
}

export async function getSupplierWithStats(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      lots: {
        include: {
          supplier: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!supplier) return null;

  const totalLots = supplier.lots.length;
  const rejectedLots = supplier.lots.filter(
    (l) => l.qualityGrade === "REJECT"
  ).length;
  const totalOwed = supplier.lots.reduce(
    (sum, l) => sum + Number(l.totalCost),
    0
  );
  const totalPaid = supplier.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const totalHusks = supplier.lots.reduce(
    (sum, l) => sum + l.huskCount,
    0
  );

  return {
    ...supplier,
    totalLots,
    totalHusks,
    rejectionRate: totalLots > 0 ? (rejectedLots / totalLots) * 100 : 0,
    totalOwed,
    totalPaid,
    outstandingBalance: totalOwed - totalPaid,
  };
}
