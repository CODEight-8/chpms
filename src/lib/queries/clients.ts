import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface ClientFilters {
  search?: string;
  active?: boolean;
}

export async function getClientsWithStats(filters?: ClientFilters) {
  const where: Prisma.ClientWhereInput = {};

  if (filters?.active !== undefined) {
    where.isActive = filters.active;
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { companyName: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      orders: {
        select: {
          id: true,
          status: true,
          items: {
            select: {
              quantityOrdered: true,
              unitPrice: true,
            },
          },
        },
      },
      payments: {
        select: { amount: true },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return clients.map((client) => {
    const totalOrders = client.orders.length;
    const totalRevenue = client.orders.reduce(
      (sum, o) =>
        sum +
        o.items.reduce(
          (s, i) => s + Number(i.quantityOrdered) * Number(i.unitPrice),
          0
        ),
      0
    );
    const totalReceived = client.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    return {
      id: client.id,
      name: client.name,
      companyName: client.companyName,
      phone: client.phone,
      email: client.email,
      address: client.address,
      paymentMethod: client.paymentMethod,
      paymentTerms: client.paymentTerms,
      isActive: client.isActive,
      createdAt: client.createdAt,
      totalOrders,
      totalRevenue,
      totalReceived,
      outstandingBalance: totalRevenue - totalReceived,
    };
  });
}

export async function getClientWithStats(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          items: {
            include: {
              product: { select: { name: true, unit: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!client) return null;

  const totalRevenue = client.orders.reduce(
    (sum, o) =>
      sum +
      o.items.reduce(
        (s, i) => s + Number(i.quantityOrdered) * Number(i.unitPrice),
        0
      ),
    0
  );
  const totalReceived = client.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  return {
    ...client,
    totalOrders: client.orders.length,
    totalRevenue,
    totalReceived,
    outstandingBalance: totalRevenue - totalReceived,
  };
}
