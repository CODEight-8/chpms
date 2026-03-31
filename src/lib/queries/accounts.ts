import { prisma } from "@/lib/prisma";

export async function getSupplierPayments() {
  return prisma.supplierPayment.findMany({
    include: {
      supplier: { select: { id: true, name: true } },
      supplierLot: {
        select: { lotNumber: true, invoiceNumber: true },
      },
    },
    orderBy: { paymentDate: "desc" },
  });
}

export async function getClientPayments() {
  return prisma.clientPayment.findMany({
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
