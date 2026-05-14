import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getAbnormalPaymentAlerts } from "@/lib/queries/analytics";

/**
 * GET /api/system/payment-audit
 * Retrieve list of clients with abnormal payments (overpayments, suspicious amounts)
 * OWNER only - for system diagnostics and audit purposes
 */
export async function GET() {
  const { user, error } = await requireAuth("users", "view");
  if (error || !user) return error!;

  // Only OWNER can access payment audit data
  if (user.role !== "OWNER") {
    return errorResponse("Only system owners can access payment audit data", 403);
  }

  try {
    const alerts = await getAbnormalPaymentAlerts();

    return jsonResponse({
      totalAlertsCount: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === "CRITICAL").length,
      highCount: alerts.filter((a) => a.severity === "HIGH").length,
      mediumCount: alerts.filter((a) => a.severity === "MEDIUM").length,
      alerts,
      lastChecked: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Payment audit error:", err);
    return errorResponse("Failed to retrieve payment audit data");
  }
}
