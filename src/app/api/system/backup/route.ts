import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, jsonResponse } from "@/lib/api-helpers";

export async function POST() {
  const { user, error } = await requireAuth("users", "edit");
  if (error || !user) return error!;

  // Only OWNER can trigger backups
  if (user.role !== "OWNER") {
    return errorResponse("Only the owner can trigger backups", 403);
  }

  // Update last_backup_at timestamp (manual trigger marker)
  try {
    await prisma.systemStatus.upsert({
      where: { key: "last_backup_at" },
      update: { value: new Date().toISOString() },
      create: { key: "last_backup_at", value: new Date().toISOString() },
    });
  } catch {
    return errorResponse("Failed to update backup status", 500);
  }

  return jsonResponse({
    success: true,
    message: "Backup status updated. Automated backups run daily at 2:00 AM.",
    timestamp: new Date().toISOString(),
  });
}

export async function GET() {
  const { user, error } = await requireAuth("users", "view");
  if (error || !user) return error!;

  if (user.role !== "OWNER") {
    return errorResponse("Only the owner can view backup status", 403);
  }

  let lastBackupAt: string | null = null;
  try {
    const row = await prisma.systemStatus.findUnique({
      where: { key: "last_backup_at" },
    });
    lastBackupAt = row?.value ?? null;
  } catch {
    lastBackupAt = null;
  }

  return jsonResponse({
    lastBackupAt,
    schedule: "Daily at 2:00 AM",
    retentionDays: process.env.BACKUP_RETENTION_DAYS || "7",
    retentionWeeks: process.env.BACKUP_RETENTION_WEEKS || "4",
  });
}
