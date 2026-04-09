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
      { supplierLot: { invoiceNumber: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  return prisma.supplierPayment.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true } },
      supplierLot: {
        select: { lotNumber: true, invoiceNumber: true },
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
      { order: { orderNumber: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  return prisma.clientPayment.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      order: { select: { orderNumber: true } },
    },
    orderBy: { paymentDate: "desc" },
  });
}

export async function getAccountsSummary() {
  // Total payable (sum of all lot costs)
  const totalPayable = await prisma.supplierLot.aggregate({
    where: { status: { not: "REJECTED" } },
    _sum: { totalCost: true },
  });

  // Total paid to suppliers
  const totalPaidSuppliers = await prisma.supplierPayment.aggregate({
    _sum: { amount: true },
  });

  // Total receivable (sum of order values)
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: { status: { not: "CANCELLED" } },
    },
    select: { quantityOrdered: true, unitPrice: true },
  });
  const totalReceivable = orderItems.reduce(
    (sum, i) => sum + Number(i.quantityOrdered) * Number(i.unitPrice),
    0
  );

  // Total received from clients
  const totalReceivedClients = await prisma.clientPayment.aggregate({
    _sum: { amount: true },
  });

  const payable = Number(totalPayable._sum.totalCost || 0);
  const paidOut = Number(totalPaidSuppliers._sum.amount || 0);
  const receivable = totalReceivable;
  const received = Number(totalReceivedClients._sum.amount || 0);

  return {
    totalPayable: payable,
    totalPaidToSuppliers: paidOut,
    outstandingPayable: payable - paidOut,
    totalReceivable: receivable,
    totalReceivedFromClients: received,
    outstandingReceivable: receivable - received,
    netBalance: received - paidOut,
  };
}

export async function getOutstandingSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    include: {
      lots: { where: { status: { not: "REJECTED" } }, select: { totalCost: true } },
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
