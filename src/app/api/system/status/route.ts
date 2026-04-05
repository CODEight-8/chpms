import { prisma } from "@/lib/prisma";
import { requireAuth, jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const mode = process.env.SYSTEM_MODE || "live";
  const snapshotTimestamp = process.env.SNAPSHOT_TIMESTAMP || null;

  let lastBackupAt: string | null = null;
  try {
    const row = await prisma.systemStatus.findUnique({
      where: { key: "last_backup_at" },
    });
    lastBackupAt = row?.value ?? null;
  } catch {
    // table may not exist yet
  }

  let dbConnected = false;
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  return jsonResponse({
    mode,
    snapshotTimestamp,
    lastBackupAt,
    dbConnected,
  });
}
