import { prisma } from "./prisma";

function todayPrefix(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function generateLotNumber(): Promise<string> {
  const prefix = `SL-${todayPrefix()}`;
  const count = await prisma.supplierLot.count({
    where: { lotNumber: { startsWith: prefix } },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
}

export function generateInvoiceNumber(lotNumber: string): string {
  return `INV-${lotNumber}`;
}

export async function generateBatchNumber(): Promise<string> {
  const prefix = `PB-${todayPrefix()}`;
  const count = await prisma.productionBatch.count({
    where: { batchNumber: { startsWith: prefix } },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
}

export async function generateOrderNumber(): Promise<string> {
  const prefix = `ORD-${todayPrefix()}`;
  const count = await prisma.order.count({
    where: { orderNumber: { startsWith: prefix } },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
}

export function generateOrderInvoiceNumber(orderNumber: string): string {
  return `INV-${orderNumber}`;
}

export async function generateSupplierReceiptNumber(): Promise<string> {
  const prefix = `REC-S-${todayPrefix()}`;
  const count = await prisma.supplierPayment.count({
    where: { receiptNumber: { startsWith: prefix } },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
}

export async function generateClientReceiptNumber(): Promise<string> {
  const prefix = `REC-C-${todayPrefix()}`;
  const count = await prisma.clientPayment.count({
    where: { receiptNumber: { startsWith: prefix } },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
}
