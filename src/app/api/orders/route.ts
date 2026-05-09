import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderSchema } from "@/lib/validators";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { generateOrderNumber, generateOrderInvoiceNumber } from "@/lib/id-generators";
import { getOrdersWithDetails, getOrderStatusCounts } from "@/lib/queries/orders";
import { OrderStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit-log";

export async function GET(request: NextRequest) {
  const { error } = await requireAuth("orders", "view");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as OrderStatus | null;
  const clientId = searchParams.get("clientId") || undefined;
  const search = searchParams.get("search") || undefined;
  const countsOnly = searchParams.get("counts") === "true";

  if (countsOnly) {
    const counts = await getOrderStatusCounts();
    return jsonResponse(counts);
  }

  const orders = await getOrdersWithDetails({
    status: status || undefined,
    clientId,
    search,
  });

  return jsonResponse(orders);
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth("orders", "create");
  if (error || !user) return error!;

  const body = await request.json();
  const parsed = orderSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message);
  }

  const { clientId, orderDate, expectedDelivery, items, notes } = parsed.data;

  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || !client.isActive) {
    return errorResponse("Client not found or inactive", 404);
  }

  // Validate all products exist and are active
  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, isActive: true, name: true },
  });
  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missing = productIds.find((id) => !foundIds.has(id));
    return errorResponse(`Product ${missing} not found`, 404);
  }
  const inactiveProduct = products.find((p) => !p.isActive);
  if (inactiveProduct) {
    return errorResponse(
      `Product "${inactiveProduct.name}" is inactive and cannot be ordered`
    );
  }

  const orderNumber = await generateOrderNumber();
  const invoiceNumber = generateOrderInvoiceNumber(orderNumber);

  const order = await prisma.order.create({
    data: {
      orderNumber,
      invoiceNumber,
      clientId,
      orderDate: new Date(orderDate),
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      notes: notes || null,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          chipSize: item.chipSize,
          quantityOrdered: item.quantityOrdered,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: { name: true, unit: true } },
        },
      },
    },
  });

  logAuditEvent({
    user,
    action: "CREATE",
    entityType: "Order",
    entityId: order.id,
    details: { orderNumber, clientId, itemCount: items.length },
  });

  return jsonResponse(order, 201);
}
