import { prisma } from "@/lib/prisma";
import { requireAuth, jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return jsonResponse(products);
}
