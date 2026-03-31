import { NextRequest } from "next/server";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getOrderDetail } from "@/lib/queries/orders";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("orders", "view");
  if (error) return error;

  const order = await getOrderDetail(params.id);
  if (!order) return errorResponse("Order not found", 404);

  return jsonResponse(order);
}
