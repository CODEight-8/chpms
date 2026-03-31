import { NextRequest } from "next/server";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getBatchDetail } from "@/lib/queries/production-batches";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAuth("production", "view");
  if (error) return error;

  const batch = await getBatchDetail(params.id);
  if (!batch) return errorResponse("Batch not found", 404);

  return jsonResponse(batch);
}
